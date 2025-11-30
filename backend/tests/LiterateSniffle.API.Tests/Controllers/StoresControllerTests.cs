using System.Net;
using System.Text.Json;
using FluentAssertions;
using LiterateSniffle.Infrastructure.Data;
using LiterateSniffle.Infrastructure.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LiterateSniffle.API.Tests.Controllers;

public class StoresControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;

    public StoresControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestDatabase_Stores")
                        .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
                });

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.EnsureCreated();
                
                // Seed test data with income and expense transactions
                SeedTestData(db);
            });
        });

        _client = _factory.CreateClient();
    }

    private static void SeedTestData(ApplicationDbContext context)
    {
        var fileUpload = new FileUpload
        {
            Id = Guid.NewGuid(),
            Filename = "test.txt",
            OriginalName = "test.txt",
            Size = 100,
            Format = "CNAB-80",
            UploadedAt = DateTime.UtcNow
        };

        var store = new Store
        {
            Id = Guid.NewGuid(),
            OwnerName = "Test Owner",
            Name = "Test Store"
        };

        // Income transaction
        var incomeTransaction = new Transaction
        {
            Id = Guid.NewGuid(),
            TypeId = Guid.Parse("11111111-1111-1111-1111-111111111111"), // Debit = Income
            Type = "Debit",
            Datetime = DateTime.UtcNow,
            Value = 100.00m,
            Cpf = "12345678901",
            Card = "123456789012",
            StoreId = store.Id,
            FileUploadId = fileUpload.Id
        };

        // Expense transaction
        var expenseTransaction = new Transaction
        {
            Id = Guid.NewGuid(),
            TypeId = Guid.Parse("22222222-2222-2222-2222-222222222222"), // Boleto = Expense
            Type = "Boleto",
            Datetime = DateTime.UtcNow,
            Value = 30.00m,
            Cpf = "12345678901",
            Card = "123456789012",
            StoreId = store.Id,
            FileUploadId = fileUpload.Id
        };

        context.FileUploads.Add(fileUpload);
        context.Stores.Add(store);
        context.Transactions.AddRange(incomeTransaction, expenseTransaction);
        context.SaveChanges();
    }

    [Fact]
    public async Task GetSummary_ReturnsStoreSummaries()
    {
        // Act
        var response = await _client.GetAsync("/api/stores/summary");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty();
        
        var summaries = JsonSerializer.Deserialize<List<JsonElement>>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        summaries.Should().NotBeNull();
        summaries.Should().NotBeEmpty();

        // Verify first summary has required properties
        var firstSummary = summaries![0];
        firstSummary.TryGetProperty("storeId", out _).Should().BeTrue();
        firstSummary.TryGetProperty("ownerName", out _).Should().BeTrue();
        firstSummary.TryGetProperty("storeName", out _).Should().BeTrue();
        firstSummary.TryGetProperty("transactionCount", out _).Should().BeTrue();
        firstSummary.TryGetProperty("totalIncome", out _).Should().BeTrue();
        firstSummary.TryGetProperty("totalExpense", out _).Should().BeTrue();
        firstSummary.TryGetProperty("balance", out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetSummary_CalculatesBalanceCorrectly()
    {
        // Act
        var response = await _client.GetAsync("/api/stores/summary");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var content = await response.Content.ReadAsStringAsync();
        var summaries = JsonSerializer.Deserialize<List<JsonElement>>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        summaries.Should().NotBeNull();
        summaries.Should().NotBeEmpty();

        var firstSummary = summaries![0];
        
        // Get values
        var totalIncome = firstSummary.GetProperty("totalIncome").GetDecimal();
        var totalExpense = firstSummary.GetProperty("totalExpense").GetDecimal();
        var balance = firstSummary.GetProperty("balance").GetDecimal();
        
        // Balance should equal income - expense
        balance.Should().Be(totalIncome - totalExpense);
        
        // Based on seeded data: 100 income - 30 expense = 70 balance
        totalIncome.Should().Be(100.00m);
        totalExpense.Should().Be(30.00m);
        balance.Should().Be(70.00m);
    }
}

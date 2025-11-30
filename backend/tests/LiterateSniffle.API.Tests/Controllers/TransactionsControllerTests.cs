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

public class TransactionsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;

    public TransactionsControllerTests(WebApplicationFactory<Program> factory)
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
                    options.UseInMemoryDatabase("TestDatabase_Transactions")
                        .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
                });

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.EnsureCreated();
                
                // Seed test data
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

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            TypeId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Type = "Debit",
            Datetime = DateTime.UtcNow,
            Value = 100.00m,
            Cpf = "12345678901",
            Card = "123456789012",
            StoreId = store.Id,
            FileUploadId = fileUpload.Id
        };

        context.FileUploads.Add(fileUpload);
        context.Stores.Add(store);
        context.Transactions.Add(transaction);
        context.SaveChanges();
    }

    [Fact]
    public async Task GetAll_ReturnsTransactions()
    {
        // Act
        var response = await _client.GetAsync("/api/transactions");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty();
        
        var transactions = JsonSerializer.Deserialize<List<JsonElement>>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        transactions.Should().NotBeNull();
        transactions.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetByStore_ValidStoreId_ReturnsTransactions()
    {
        // Arrange - Get a store from the database
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var store = await db.Stores.FirstOrDefaultAsync();
        store.Should().NotBeNull();

        // Act
        var response = await _client.GetAsync($"/api/transactions/store/{store!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var content = await response.Content.ReadAsStringAsync();
        content.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetByStore_InvalidStoreId_ReturnsOk()
    {
        // Arrange
        var invalidStoreId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/transactions/store/{invalidStoreId}");

        // Assert - Should return OK with empty array
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

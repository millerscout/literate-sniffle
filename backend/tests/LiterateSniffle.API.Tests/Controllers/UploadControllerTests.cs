using System.Net;
using System.Net.Http.Headers;
using System.Text;
using FluentAssertions;
using LiterateSniffle.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LiterateSniffle.API.Tests.Controllers;

public class UploadControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;

    public UploadControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove existing DbContext
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Add in-memory database for testing
                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestDatabase")
                        .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
                });

                // Build service provider and create database
                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.EnsureCreated();
            });
        });

        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task Upload_ValidCNABFile_ReturnsSuccess()
    {
        // Arrange
        var cnabContent = "3201903010000014200096206760174753****3153153453JOÃO MACEDO   BAR DO JOÃO       \n" +
                         "5201903010000013200556418150633123****7687145607MARIA JOSEFINALOJA DO Ó - MATRIZ\n" +
                         "3201903010000012200845152540736777****1313172712MARCOS PEREIRAMERCADO DA AVENIDA";

        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes(cnabContent));
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/plain");
        content.Add(fileContent, "file", "test.cnab");

        // Act
        var response = await _client.PostAsync("/api/upload", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        responseContent.Should().Contain("uploaded");
        responseContent.Should().Contain("validated");
        responseContent.Should().Contain("transactionsCount");
    }

    [Fact]
    public async Task Upload_InvalidCNABFile_ReturnsBadRequest()
    {
        // Arrange
        var invalidContent = "This is not a CNAB file";
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes(invalidContent));
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/plain");
        content.Add(fileContent, "file", "invalid.txt");

        // Act
        var response = await _client.PostAsync("/api/upload", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        responseContent.Should().Contain("error");
    }

    [Fact]
    public async Task Upload_NoFile_ReturnsBadRequest()
    {
        // Arrange
        var content = new MultipartFormDataContent();

        // Act
        var response = await _client.PostAsync("/api/upload", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        // ASP.NET Core returns validation errors when form parsing fails
        responseContent.Should().Contain("validation errors");
    }

    [Fact]
    public async Task Upload_InvalidLineLength_ReturnsBadRequest()
    {
        // Arrange
        var invalidContent = "SHORT LINE\nANOTHER SHORT LINE";
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes(invalidContent));
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/plain");
        content.Add(fileContent, "file", "invalid.cnab");

        // Act
        var response = await _client.PostAsync("/api/upload", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        // Check for actual error message about inconsistent record lengths
        responseContent.Should().Contain("record lengths");
    }

    [Fact]
    public async Task UploadChunk_ValidChunk_ReturnsSuccess()
    {
        // Arrange
        var uploadId = Guid.NewGuid().ToString();
        var content = new MultipartFormDataContent();
        var chunkContent = new ByteArrayContent(Encoding.UTF8.GetBytes("test chunk data"));
        chunkContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/octet-stream");
        content.Add(chunkContent, "chunk", "chunk");
        content.Add(new StringContent(uploadId), "uploadId");
        content.Add(new StringContent("0"), "chunkIndex");

        // Act
        var response = await _client.PostAsync("/api/upload/chunk", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        responseContent.Should().Contain("Chunk uploaded successfully");
    }

    [Fact]
    public async Task UploadChunk_NoChunk_ReturnsBadRequest()
    {
        // Arrange
        var uploadId = Guid.NewGuid().ToString();
        var content = new MultipartFormDataContent();
        content.Add(new StringContent(uploadId), "uploadId");
        content.Add(new StringContent("0"), "chunkIndex");

        // Act
        var response = await _client.PostAsync("/api/upload/chunk", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        // ASP.NET Core model validation returns "chunk field is required"
        responseContent.Should().Contain("chunk");
    }
}

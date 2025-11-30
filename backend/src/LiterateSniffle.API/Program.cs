using Serilog;
using Microsoft.EntityFrameworkCore;
using LiterateSniffle.Infrastructure.Data;
using LiterateSniffle.Core.Services;
using LiterateSniffle.API.Middleware;

// Load .env file
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Literate Sniffle API",
        Version = "v1",
        Description = "CNAB file upload and transaction management API"
    });
    
    // Include XML comments
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// Register application services
builder.Services.AddScoped<CNABParserService>();
builder.Services.AddScoped<FileUploadService>();
builder.Services.AddScoped<TransactionService>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddMySql(connectionString ?? "Server=localhost;Database=literate_sniffle;User=root;Password=root;");

var app = builder.Build();

// Apply migrations automatically (skip for in-memory database in tests)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        // Ensure database is created with schema
        db.Database.EnsureCreated();
        Log.Information("Database created successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while migrating the database");
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Use custom exception middleware
app.UseMiddleware<ExceptionMiddleware>();

app.UseCors();

app.UseAuthorization();

app.MapControllers();

// Health check endpoint with custom response
app.MapGet("/health", () => Results.Ok(new
{
    status = "OK",
    timestamp = DateTime.UtcNow.ToString("o")
}));

// Root endpoint
app.MapGet("/", () => Results.Ok(new
{
    message = "Literate Sniffle API",
    version = "1.0.0",
    documentation = "/swagger"
}));

// 404 handler for undefined routes
app.MapFallback(() => Results.NotFound(new { error = "Route not found" }));

Log.Information("Starting Literate Sniffle API on port {Port}", 
    builder.Configuration["PORT"] ?? "3000");

app.Run();

// Make the Program class accessible for testing
public partial class Program { }

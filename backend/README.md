# Literate Sniffle - .NET Backend

## Prerequisites

- .NET 8 SDK
- MySQL 8.0+
- Docker & Docker Compose (for containerized setup)

## Quick Start with Docker

```bash
docker-compose -f docker-compose-dotnet.yml up
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger Documentation: http://localhost:3000/swagger

## Local Development Setup

### 1. Restore Dependencies

```bash
cd backend
dotnet restore
```

### 2. Configure Database

Update the connection string in `src/LiterateSniffle.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=literate_sniffle;User=sniffle_user;Password=sniffle_password;"
  }
}
```

### 3. Create Database Migration

```bash
cd src/LiterateSniffle.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ../LiterateSniffle.API --context ApplicationDbContext
```

### 4. Apply Migrations

```bash
dotnet ef database update --startup-project ../LiterateSniffle.API --context ApplicationDbContext
```

### 5. Run the Application

```bash
cd ../LiterateSniffle.API
dotnet run
```

The API will be available at http://localhost:3000

## Development Commands

```bash
# Build solution
dotnet build

# Run API
cd src/LiterateSniffle.API
dotnet run

# Watch mode (hot-reload)
dotnet watch run

# Run all tests
dotnet test

# Run tests with coverage
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover

# Create migration
dotnet ef migrations add <MigrationName> --project src/LiterateSniffle.Infrastructure --startup-project src/LiterateSniffle.API

# Update database
dotnet ef database update --project src/LiterateSniffle.Infrastructure --startup-project src/LiterateSniffle.API

# Rollback migration
dotnet ef database update <PreviousMigrationName> --project src/LiterateSniffle.Infrastructure --startup-project src/LiterateSniffle.API
```

## Project Structure

```
backend/
├── LiterateSniffle.sln                    # Solution file
├── src/
│   ├── LiterateSniffle.API/               # Web API Layer
│   │   ├── Controllers/                   # API Controllers
│   │   ├── Middleware/                    # Custom middleware
│   │   ├── Program.cs                     # Application entry point
│   │   └── appsettings.json              # Configuration
│   ├── LiterateSniffle.Core/              # Business Logic Layer
│   │   ├── Services/                      # Business services
│   │   ├── Exceptions/                    # Custom exceptions
│   │   └── Models/                        # DTOs and models
│   └── LiterateSniffle.Infrastructure/    # Data Access Layer
│       ├── Data/                          # EF Core DbContext
│       ├── Entities/                      # Database entities
│       └── Repositories/                  # Repository pattern
└── tests/
    ├── LiterateSniffle.API.Tests/         # Integration tests
    └── LiterateSniffle.Core.Tests/        # Unit tests
```

## API Endpoints

### File Upload
- `POST /api/upload` - Upload and process CNAB file
- `POST /api/upload/chunk` - Upload file chunk
- `POST /api/upload/complete` - Complete chunked upload

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/store/{storeId}` - Get transactions by store

### Stores
- `GET /api/stores/summary` - Get store summaries with balances

### Health
- `GET /health` - Health check endpoint

## Testing

```bash
# Run all tests
dotnet test

# Run with detailed output
dotnet test --logger "console;verbosity=detailed"

# Run specific test project
dotnet test tests/LiterateSniffle.Core.Tests

# Generate coverage report
dotnet test /p:CollectCoverage=true /p:CoverletOutput=./coverage/ /p:CoverletOutputFormat=opencover
```

## Technology Stack

- **Framework**: .NET 8
- **Web Framework**: ASP.NET Core
- **ORM**: Entity Framework Core 8
- **Database**: MySQL 8.0
- **Logging**: Serilog
- **API Documentation**: Swashbuckle (Swagger)
- **Testing**: xUnit, FluentAssertions

## Clean Architecture

The application follows Clean Architecture principles:

1. **API Layer** (LiterateSniffle.API): Controllers, middleware, configuration
2. **Core Layer** (LiterateSniffle.Core): Business logic, services, domain models
3. **Infrastructure Layer** (LiterateSniffle.Infrastructure): Data access, EF Core, external services

Dependencies flow inward: API → Core ← Infrastructure

## License

MIT

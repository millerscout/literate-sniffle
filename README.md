# Literate Sniffle

A full-stack application for processing and visualizing custom CNAB (Brazilian banking transaction) files, featuring a Vue.js frontend with TypeScript and a .NET 8 backend.

## Tech Stack

- **Frontend**: Vue.js 3 + TypeScript + Vite
- **Backend**: .NET 8 + ASP.NET Core + Entity Framework Core + Clean Architecture
- **Database**: MySQL 8.0
- **Testing**: xUnit + FluentAssertions (backend), Vitest (frontend)
- **Containerization**: Docker & Docker Compose
- **API Documentation**: Swagger/OpenAPI

**Recommended Setup**: Use Docker Compose for the simplest installation and testing experience.

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker compose up
```

Access the application at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/swagger

The setup starts:
- **MySQL Database** on port 3306
- **Backend API (.NET)** on port 3000
- **Frontend (Vue.js)** on port 5173

The database schema will be automatically created on first startup.

To test the application, upload the sample CNAB file: `CNAB.txt`

### Manual Setup (Local Development)

#### Prerequisites
- **.NET 8 SDK**
- **Node.js 18+** (for frontend)
- **MySQL 8.0+**

#### Backend Setup

```bash
cd backend

# Restore dependencies
dotnet restore

# Start MySQL (if using Docker)
docker compose up -d mysql

# Start backend (uses .env file for configuration)
dotnet run --project src/LiterateSniffle.API
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```


## Development Commands

**.NET Backend:**
```bash
# Backend
cd backend
dotnet build         # Build solution
dotnet run --project src/LiterateSniffle.API  # Run API
dotnet test          # Run all tests
dotnet test /p:CollectCoverage=true  # Run tests with coverage

# Frontend
cd frontend
npm run dev          # Start development server
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
```

## Environment Configuration

The backend uses a `.env` file in the project root for configuration:

```env
# Backend Configuration (.NET)
ASPNETCORE_URLS=http://localhost:3000
ASPNETCORE_ENVIRONMENT=Development
ConnectionStrings__DefaultConnection=Server=localhost;Port=3306;Database=literate_sniffle;User=sniffle_user;Password=sniffle_password;

# Frontend Configuration
VITE_API_URL=http://localhost:3000
```

## Docker Compose Services

### MySQL Service
- **Image**: mysql:8.0
- **Port**: 3306
- **Credentials**: 
  - User: `sniffle_user`
  - Password: `sniffle_password`
  - Database: `literate_sniffle`
- **Volume**: `mysql_data` (persistent storage)
- **Health Check**: Enabled

### Backend Service (.NET 8)
- **Port**: 3000
- **Database**: Connected to MySQL
- **Depends on**: MySQL service with health check
- **Architecture**: Clean Architecture (API → Core → Infrastructure)

### Frontend Service (Vue.js)
- **Port**: 5173 (maps to nginx port 80 in container)
- **Production Build**: nginx:alpine serving static files
- **API Proxy**: Forwards `/api/*` to backend

## Project Structure

```
literate-sniffle/
├── backend/                               # .NET 8 Backend
│   ├── src/
│   │   ├── LiterateSniffle.API/           # Web API Layer
│   │   │   ├── Controllers/               # API Controllers
│   │   │   ├── Middleware/                # Custom middleware
│   │   │   ├── Program.cs                 # Entry point
│   │   │   └── appsettings.json           # Configuration
│   │   ├── LiterateSniffle.Core/          # Business Logic
│   │   │   ├── Services/                  # Business services
│   │   │   ├── Exceptions/                # Custom exceptions
│   │   │   └── Models/                    # DTOs
│   │   └── LiterateSniffle.Infrastructure/ # Data Access
│   │       ├── Data/                      # DbContext & configurations
│   │       ├── Entities/                  # EF Core entities
│   │       └── Repositories/              # Repository pattern (if used)
│   ├── tests/
│   │   ├── LiterateSniffle.API.Tests/     # Integration tests
│   │   └── LiterateSniffle.Core.Tests/    # Unit tests
│   ├── uploads/                           # File upload storage
│   ├── Dockerfile                         # Multi-stage build
│   ├── LiterateSniffle.sln                # Solution file
│   └── README.md                          # Backend documentation
├── frontend/
│   ├── src/
│   │   ├── App.vue                        # Main component
│   │   ├── main.ts                        # Entry point
│   │   ├── router.ts                      # Vue Router
│   │   └── views/                         # Page components
│   ├── Dockerfile                         # Multi-stage build
│   ├── nginx.conf                         # Production nginx config
│   ├── package.json                       # Dependencies
│   └── tsconfig.json                      # TypeScript config
├── docs/
│   └── adr/                               # Architecture Decision Records
│       ├── 001-nodejs-fullstack.md        # Original stack (deprecated backend)
│       ├── 002-ai-assisted-development.md
│       ├── 003-database-choice.md
│       ├── 004-transaction-description-storage.md
│       └── 005-dotnet-migration-clean-architecture.md
├── docker-compose.yml                     # Docker Compose configuration
├── .env                                   # Environment variables
├── .env.example                           # Environment template
└── README.md                              # This file
```

## Documentation

See the [docs/adr/](docs/adr/) directory for Architectural Decision Records explaining key design choices.

## Database Schema

### Tables

- **FileUpload**: Tracks uploaded CNAB files
- **TransactionType**: Lookup table for CNAB transaction types (1-9)
- **Store**: Merchant/store information
- **Transaction**: Individual transactions with relationships

### Relationships

```
FileUpload ←─── Transaction ───→ Store
            └─→ TransactionType
```

All foreign keys have cascading deletes for referential integrity.

## API Endpoints

All endpoints are documented at: `http://localhost:3000/swagger`

### File Upload
- `POST /api/upload/chunk` - Upload file chunk (chunked upload)
- `POST /api/upload/complete` - Complete chunked upload and process CNAB file

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/store/{storeId}` - Get transactions for a specific store

### Stores
- `GET /api/stores/summary` - Get all stores with transaction summaries and balances

### System
- `GET /health` - Health check endpoint

## Running Tests

```bash
# Backend (.NET) - Run all tests
cd backend
dotnet test

# Backend - Run with coverage report
dotnet test /p:CollectCoverage=true

# Frontend - Run all tests
cd frontend
npm test

# Frontend - Run with UI
npm run test:ui

# Frontend - Coverage report
npm run test:coverage
```

## Architecture

The backend follows Clean Architecture principles with clear separation of concerns:

- **API Layer** (`LiterateSniffle.API`): Controllers, middleware, configuration
- **Core Layer** (`LiterateSniffle.Core`): Business logic, services, domain models
- **Infrastructure Layer** (`LiterateSniffle.Infrastructure`): Data access, EF Core, repositories

See [docs/adr/005-dotnet-migration-clean-architecture.md](docs/adr/005-dotnet-migration-clean-architecture.md) for detailed rationale.

## Design Considerations

This implementation has several known limitations and areas for improvement:

- **File Handling**: Current implementation processes files in memory. For very large CNAB files (>100MB), consider implementing:
  - Stream processing for lower memory footprint
  - Background job processing with queue systems
  - File chunking with progress tracking
  
- **CNAB Verification**: Atomic transaction verification for CNAB processing batches was not implemented.

- **Technology Migration**: The original Node.js backend was replaced with .NET 8 to address:
  - **Memory Management**: Better handling of large file processing
  - **Performance**: Compiled code with optimized runtime
  - **Scalability**: Cloud-native architecture ready for serverless deployment
  - **Type Safety**: Strong typing throughout the stack

See [docs/adr/](docs/adr/) for detailed architectural decisions, including:
- ADR 001: Original Node.js stack (backend portion deprecated)
- ADR 005: .NET migration with Clean Architecture (current implementation)

## License

MIT
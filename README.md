# Literate Sniffle

A full-stack TypeScript application for processing and visualizing custom CNAB (Brazilian banking transaction) files, featuring a Vue.js frontend and Express backend.

**Recommended Setup**: Use Docker Compose for the simplest installation and testing experience.

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up
```
Access the application at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs


This will start:
- **MySQL Database** on port 3306
- **Backend API** on port 3000
- **Frontend** on port 5173

The database schema will be automatically created and migrations applied.

To test the application, upload the sample CNAB file located at `backend/uploads/CNAB.txt` or download from [this GitHub link](https://github.com/ByCodersTec/desafio-ruby-on-rails/blob/master/CNAB.txt).

### Manual Setup (Local Development)

#### Prerequisites
- Node.js 18+
- MySQL 8.0+

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure database
# Copy .env.example to .env and update DATABASE_URL if needed
cp .env.example .env

# Create database and run migrations
npx prisma db push

# Start backend
npm run dev
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

```bash
# Backend
cd backend
npm run dev          # Start development server with hot-reload
npm test             # Run tests
npm run test:coverage # Generate coverage report
npm run build        # Build for production
npx prisma db push   # Apply database migrations

# Frontend
cd frontend
npm run dev          # Start development server
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
```

## Database Configuration

### Development

The application uses MySQL for all environments. Connection string is configured via `.env`:

```env
DATABASE_URL=mysql://sniffle_user:sniffle_password@localhost:3306/literate_sniffle
```

### Testing

Tests use a separate MySQL database configured as:

```env
TEST_DATABASE_URL=mysql://sniffle_user:sniffle_password@localhost:3306/literate_sniffle_test
```

### Production

Update the `DATABASE_URL` environment variable in your production deployment:

```
mysql://[user]:[password]@[host]:[port]/[database]
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

### Backend Service
- **Port**: 3000
- **Database**: Connected to MySQL
- **Hot-reload**: Enabled via volume mount
- **Depends on**: MySQL service with health check

### Frontend Service
- **Port**: 5173
- **Dev Server**: Vite with hot-reload
- **API URL**: Points to backend on port 3000

## Project Structure

```
literate-sniffle/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express server & API routes
│   │   ├── cnabParser.ts      # CNAB file parsing logic
│   │   └── db.ts              # Prisma client
│   ├── tests/
│   │   ├── cnabUpload.test.ts # API & storage tests
│   │   ├── userRoutes.test.ts # User endpoints tests
│   │   └── setup.ts           # Test environment setup
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Migration files
│   ├── Dockerfile             # Multi-stage build
│   ├── package.json           # Dependencies
│   ├── tsconfig.json          # TypeScript config
│   ├── jest.config.js         # Test config
│   ├── .env.example           # Environment template
│   └── .env                   # Local environment
├── frontend/
│   ├── src/
│   │   ├── App.vue            # Main component
│   │   ├── main.ts            # Entry point
│   │   └── components/        # Vue components
│   ├── Dockerfile             # Multi-stage build
│   ├── package.json           # Dependencies
│   └── tsconfig.json          # TypeScript config
├── docker-compose.yml         # Service orchestration
└── README.md                  # This file
```

## Tech Stack

- **Frontend**: Vue.js 3 + TypeScript + Vite
- **Backend**: Express + TypeScript
- **Database**: MySQL 8.0 with Prisma ORM
- **Testing**: Jest (backend), Vitest (frontend)
- **Containerization**: Docker & Docker Compose
- **API Documentation**: Swagger/OpenAPI

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

All endpoints are documented at: `http://localhost:3000/api-docs`

### File Upload
- `POST /api/upload` - Upload and process CNAB file
- `POST /api/upload/chunk` - Upload file chunk (chunked upload part 1)
- `POST /api/upload/complete` - Complete chunked upload (part 2)

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/store/:storeId` - Get transactions for a store

### Stores
- `GET /api/stores/summary` - Get all stores with transaction summaries and balances

### System
- `GET /health` - Health check endpoint

## Running Tests

```bash
# Backend - Run all tests
cd backend && npm test

# Backend - Run with coverage report
cd backend && npm run test:coverage

# Backend - Run in watch mode
cd backend && npm run test:watch

# Frontend - Run all tests
cd frontend && npm test

# Frontend - Run with UI
cd frontend && npm run test:ui

# Frontend - Coverage report
cd frontend && npm run test:coverage
```

## Disclaimer

This implementation has several known limitations and areas for improvement:

- **File Handling**: Using API endpoints to handle large CNAB files is not ideal. Huge files may cause performance issues or timeouts.
- **CNAB Verification**: Verification for atomic changes in CNAB processing was not implemented.
- **Technology Choice**: Node.js was chosen for fast prototyping but is not optimal for memory management in large-scale processing. Consider using a language with better memory efficiency.
- **Processing Strategy**: Current processing handles files in memory, which is problematic for huge files. Implement chunked and atomic processing using cronjobs or file watchers for better scalability.

These are design considerations and not implemented fixes.

## License

MIT
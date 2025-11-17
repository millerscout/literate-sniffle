// Test setup for file upload functionality
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../src/generated/prisma/client';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { createDB } from 'mysql-memory-server';
import { setTestPrisma } from '../src/db';

// Ensure Jest globals are available
declare const beforeAll: any;
declare const afterAll: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const jest: any;

// Load .env to get TEST_DATABASE_URL
dotenv.config();

// MySQL Memory Server instance
let mysqlServer: any;
let prisma: PrismaClient;

// Ensure uploads directory exists for tests
const uploadsDir = path.join(__dirname, '../uploads');
const tempDir = path.join(uploadsDir, 'temp');

beforeAll(async () => {
  // Increase timeout for MySQL server startup
  jest.setTimeout(60000); // 60 seconds

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // Start MySQL Memory Server
  console.log('Starting MySQL Memory Server...');
  mysqlServer = await createDB({
    version: '8.4.x',
    dbName: 'test_db'
  });

  // Override DATABASE_URL for testing
  process.env.DATABASE_URL = `mysql://root:@127.0.0.1:${mysqlServer.port}/test_db`;

  console.log(`MySQL Memory Server started on port ${mysqlServer.port}`);
  console.log(`DATABASE_URL set to: ${process.env.DATABASE_URL}`);

  // Create Prisma client AFTER setting DATABASE_URL
  prisma = new PrismaClient();

  // Set the test prisma instance for the application code
  setTestPrisma(prisma);

  // Connect to the MySQL in-memory database for testing
  await prisma.$connect();

  // Run database migrations for test database
  try {
    console.log('Running database migrations for tests...');
    execSync(`npx cross-env DATABASE_URL="${process.env.DATABASE_URL}" prisma db push --skip-generate`, { stdio: 'inherit' });
    console.log('Database migrations completed.');
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    throw error;
  }
}, 60000);

beforeEach(async () => {
  // Clean database before each test to ensure isolation
  // Delete in reverse dependency order: transactions first, then parents
  await prisma.transaction.deleteMany({});
  await prisma.fileUpload.deleteMany({});
  await prisma.store.deleteMany({});
  // Note: TransactionType is a lookup table - we keep it but could delete if needed
});

afterAll(async () => {
  await prisma.$disconnect();

  // Stop MySQL Memory Server
  if (mysqlServer) {
    console.log('Stopping MySQL Memory Server...');
    await mysqlServer.stop();
  }
});

// Clean up uploaded files after each test
afterEach(() => {
  // Clean temp directory
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      try {
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // Ignore errors if file doesn't exist or can't be deleted
        console.warn(`Could not delete temp file ${filePath}:`, error);
      }
    });
  }

  // Clean uploads directory (except temp)
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      try {
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // Ignore errors if file doesn't exist or can't be deleted
        console.warn(`Could not delete upload file ${filePath}:`, error);
      }
    });
  }
});
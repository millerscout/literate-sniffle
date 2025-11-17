import { PrismaClient } from './generated/prisma/client';

/**
 * Database connection abstraction
 * Uses environment variables to configure provider and URL:
 * - Production: MySQL
 * - Tests: MySQL in-memory (configured in test setup)
 */
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'test') {
  // For tests, we'll set the prisma instance from the test setup
  // This will be set after the MySQL memory server is started
  prisma = {} as PrismaClient; // Placeholder, will be replaced
} else {
  prisma = new PrismaClient();
}

// Export function to set test prisma instance
export function setTestPrisma(testPrismaInstance: PrismaClient) {
  if (process.env.NODE_ENV === 'test') {
    prisma = testPrismaInstance;
  }
}

export { prisma };
export default prisma;

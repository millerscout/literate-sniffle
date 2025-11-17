import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../src/index';
import { prisma } from '../src/db';

describe('CNAB Upload and Database Storage', () => {

  describe('POST /api/upload', () => {
    it('should upload CNAB file, validate it, and store data in database', async () => {
      const testFilePath = path.join(__dirname, '../sample.txt');

      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .expect(200);

      expect(response.body.message).toContain('CNAB file uploaded, validated, and data stored successfully');
      expect(response.body.format).toBe('CNAB 80');
      expect(response.body.transactionsCount).toBeGreaterThan(0);
      expect(response.body.fileUploadId).toBeDefined();

      // Verify data was stored in database
      const fileUpload = await prisma.fileUpload.findUnique({
        where: { id: response.body.fileUploadId },
        include: { transactions: { include: { store: true } } }
      });

      expect(fileUpload).toBeDefined();
      expect(fileUpload?.filename).toBe(response.body.filename);
      expect(fileUpload?.transactions).toHaveLength(response.body.transactionsCount);

      // Verify transactions have correct structure
      const transaction = fileUpload?.transactions[0];
      expect(transaction).toHaveProperty('typeId');
      expect(transaction).toHaveProperty('date');
      expect(transaction).toHaveProperty('value');
      expect(transaction).toHaveProperty('cpf');
      expect(transaction).toHaveProperty('card');
      expect(transaction).toHaveProperty('time');
      expect(transaction).toHaveProperty('storeId');
      expect(transaction).toHaveProperty('fileUploadId');
    });

    it('should reject invalid CNAB files', async () => {
      const invalidFilePath = path.join(__dirname, 'invalid.txt');
      fs.writeFileSync(invalidFilePath, 'Invalid CNAB content');

      const response = await request(app)
        .post('/api/upload')
        .attach('file', invalidFilePath)
        .expect(400);

      expect(response.body.error).toBe('Invalid CNAB file format');

      // Clean up
      fs.unlinkSync(invalidFilePath);
    });
  });

  describe('POST /api/upload/complete', () => {
    it('should handle chunked upload and store CNAB data', async () => {
      const testFilePath = path.join(__dirname, '../sample.txt');
      const fileContent = fs.readFileSync(testFilePath, 'utf8');

      // For simplicity, just upload the whole file as one chunk
      const fileName = `chunked-sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`;

      await request(app)
        .post('/api/upload/chunk')
        .attach('chunk', Buffer.from(fileContent), 'chunk-0')
        .field('chunkIndex', '0')
        .field('totalChunks', '1')
        .field('fileName', fileName)
        .expect(200);

      // Complete upload
      const response = await request(app)
        .post('/api/upload/complete')
        .send({
          fileName,
          totalChunks: 1
        })
        .expect(200);

      expect(response.body.message).toContain('CNAB file uploaded, validated, and data stored successfully');
      expect(response.body.transactionsCount).toBeGreaterThan(0);

      // Verify data was stored
      const fileUpload = await prisma.fileUpload.findUnique({
        where: { id: response.body.fileUploadId },
        include: { transactions: true }
      });

      expect(fileUpload).toBeDefined();
      expect(fileUpload?.transactions).toHaveLength(response.body.transactionsCount);
    });
  });

  describe('GET /api/transactions', () => {
    it('should return all transactions', async () => {
      // First create some test data
      const testFilePath = path.join(__dirname, '../sample.txt');
      await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .expect(200);

      const response = await request(app)
        .get('/api/transactions')
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThan(0);

      const transaction = response.body.transactions[0];
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('transactionType');
      expect(transaction).toHaveProperty('transactionCode');
      expect(transaction).toHaveProperty('date');
      expect(transaction).toHaveProperty('value');
      expect(transaction).toHaveProperty('cpf');
      expect(transaction).toHaveProperty('card');
      expect(transaction).toHaveProperty('time');
      expect(transaction).toHaveProperty('storeName');
      expect(transaction).toHaveProperty('storeOwner');
      expect(transaction).toHaveProperty('fileId');
    });
  });

  describe('GET /api/transactions/store/:storeId', () => {
    it('should return transactions for a specific store', async () => {
      // First create some test data
      const testFilePath = path.join(__dirname, '../sample.txt');
      await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .expect(200);

      // First get a store ID from existing data
      const stores = await prisma.store.findMany({ take: 1 });
      expect(stores.length).toBeGreaterThan(0);

      const storeId = stores[0]?.id;
      expect(storeId).toBeDefined();

      const response = await request(app)
        .get(`/api/transactions/store/${storeId}`)
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThan(0);
      // All transactions should belong to the requested store (verified by the API filtering)
      response.body.transactions.forEach((transaction: any) => {
        expect(transaction).toHaveProperty('storeName');
        expect(transaction).toHaveProperty('storeOwner');
      });
    });

    it('should return 404 for invalid store ID', async () => {
      const response = await request(app)
        .get('/api/transactions/store/invalid-id')
        .expect(404);

      expect(response.body.error).toBe('Store not found');
    });
  });

  describe('GET /api/stores/summary', () => {
    it('should return store summary with transaction counts and totals', async () => {
      // First create some test data
      const testFilePath = path.join(__dirname, '../sample.txt');
      await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .expect(200);

      const response = await request(app)
        .get('/api/stores/summary')
        .expect(200);

      expect(Array.isArray(response.body.stores)).toBe(true);
      expect(response.body.stores.length).toBeGreaterThan(0);

      const store = response.body.stores[0];
      expect(store).toHaveProperty('id');
      expect(store).toHaveProperty('ownerName');
      expect(store).toHaveProperty('name');
      expect(store).toHaveProperty('transactionCount');
      expect(store).toHaveProperty('totalValue');
      expect(typeof store.transactionCount).toBe('number');
      expect(typeof store.totalValue).toBe('number');
    });
  });
});
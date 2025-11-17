import request from 'supertest';
import app from '../src/index';
import fs from 'fs';
import path from 'path';

describe('File Upload Routes', () => {
  describe('POST /api/upload', () => {
    it('should upload a valid CNAB file successfully', async () => {
      // Use sample.txt content for testing
      const fs = require('fs');
      const cnabContent = fs.readFileSync('./sample.txt', 'utf8');

      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from(cnabContent), 'test.cnab');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('CNAB file uploaded, validated, and data stored successfully');
      expect(response.body).toHaveProperty('format', 'CNAB 80');
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('size');
    });

    it('should reject invalid CNAB file', async () => {
      const invalidContent = 'This is not a CNAB file';

      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from(invalidContent), 'invalid.txt');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid CNAB file format');
      expect(response.body).toHaveProperty('details');
    });

    it('should reject CNAB file with invalid record length', async () => {
      const invalidContent = '01202511160000001000SHORT\n123456789SHORT\n9TRAILERSHORT';

      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from(invalidContent), 'invalid.cnab');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid CNAB file format');
      expect(response.body.details).toContain('Inconsistent record lengths');
    });

    it('should reject CNAB file with invalid detail record', async () => {
      const invalidContent = `3201903010000014200096206760174753****3153153453JOÃO MACEDO   BAR DO JOÃO
6201903010000013200556418150633123****7687145607MARIA JOSEFINALOJA DO Ó - MATRIZ
3201903010000019200845152540736777****1313172712MARCOS PEREIRAMERCADO DA AVENIDA`;

      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from(invalidContent), 'invalid.cnab');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid CNAB file format');
      expect(response.body.details).toContain('Inconsistent record lengths');
    });
  });

  describe('POST /api/upload/chunk', () => {
    it('should accept valid chunk upload', async () => {
      const response = await request(app)
        .post('/api/upload/chunk')
        .attach('chunk', Buffer.from('test chunk data'), 'chunk')
        .field('chunkIndex', '0')
        .field('totalChunks', '1')
        .field('fileName', 'test.txt');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Chunk 0 uploaded successfully');
    });

    it('should reject chunk upload without file', async () => {
      const response = await request(app)
        .post('/api/upload/chunk')
        .field('chunkIndex', '0')
        .field('totalChunks', '1')
        .field('fileName', 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No chunk uploaded');
    });
  });

  describe('POST /api/upload/complete', () => {
    it('should complete valid CNAB file upload', async () => {
      // Use sample.txt content for testing
      const fs = require('fs');
      const cnabContent = fs.readFileSync('./sample.txt', 'utf8');
      const uniqueFileName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.cnab`;

      // First upload chunks
      await request(app)
        .post('/api/upload/chunk')
        .attach('chunk', Buffer.from(cnabContent), 'chunk')
        .field('chunkIndex', '0')
        .field('totalChunks', '1')
        .field('fileName', uniqueFileName);

      // Then complete the upload
      const response = await request(app)
        .post('/api/upload/complete')
        .send({
          fileName: uniqueFileName,
          totalChunks: 1
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('CNAB file uploaded, validated, and data stored successfully');
      expect(response.body).toHaveProperty('format', 'CNAB 80');
    });

    it('should reject completion of invalid CNAB file', async () => {
      const uniqueFileName = `invalid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.cnab`;
      
      // First upload chunks with invalid content
      await request(app)
        .post('/api/upload/chunk')
        .attach('chunk', Buffer.from('Invalid CNAB content'), 'chunk')
        .field('chunkIndex', '0')
        .field('totalChunks', '1')
        .field('fileName', uniqueFileName);

      // Then try to complete the upload
      const response = await request(app)
        .post('/api/upload/complete')
        .send({
          fileName: uniqueFileName,
          totalChunks: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid CNAB file format');
    });

    it('should return 400 when upload not found', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .send({
          fileName: 'nonexistent.cnab',
          totalChunks: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Upload not found');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
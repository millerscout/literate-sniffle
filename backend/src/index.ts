import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { parseCNABContent, storeCNABData, getAllTransactions, getTransactionsByStore, getStoreSummary } from './cnabParser';
import { prisma } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Literate Sniffle API',
      version: '1.0.0',
      description: 'CNAB file upload and transaction management API',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/index.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// CNAB validation function
function validateCNABFile(filePath: string): { isValid: boolean; format?: string; error?: string } {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Split lines and remove line ending characters (LF, CRLF)
    const lines = content.split('\n')
      .map(line => line.replace(/[\r\n]+$/, ''))
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return { isValid: false, error: 'File is empty' };
    }
    
    // Check if all lines have the same length (CNAB should be 80 characters for this format)
    const lineLengths = lines.map(line => line.length);
    const uniqueLengths = [...new Set(lineLengths)];
    
    if (uniqueLengths.length !== 1) {
      return { isValid: false, error: `Inconsistent record lengths - not a valid CNAB file. Found lengths: ${uniqueLengths.join(', ')}` };
    }
    
    const recordLength = uniqueLengths[0];
    if (recordLength !== 80) {
      return { isValid: false, error: `Invalid record length: ${recordLength}. Expected 80 characters for this CNAB format.` };
    }
    
    // Check for header record (should start with '0' or other valid type codes)
    // In this format, we accept various type codes: 0, 1, 2, 3, 4, 5, 8, 9
    const validTypeCodes = ['0', '1', '2', '3', '4', '5', '8', '9'];
    const firstRecord = lines[0];
    if (!firstRecord || !firstRecord[0] || !validTypeCodes.includes(firstRecord[0])) {
      return { isValid: false, error: 'Missing or invalid header record' };
    }
    
    // Check for trailer record (should start with '9') - make this optional for flexibility
    const trailerRecord = lines[lines.length - 1];
    // Only check trailer if it exists and has content
    if (trailerRecord && trailerRecord[0] && trailerRecord[0] !== '9') {
      // Allow files that don't have a strict trailer record for compatibility
      console.log('Note: File does not end with trailer record (type 9), but proceeding with validation');
    }
    
    // Validate all records have valid type codes
    for (let i = 0; i < lines.length; i++) {
      const record = lines[i];
      if (!record || !record[0] || !validTypeCodes.includes(record[0])) {
        return { isValid: false, error: `Invalid record type at line ${i + 1} (should start with valid type code)` };
      }
    }
    
    return { isValid: true, format: 'CNAB 80' };
    
  } catch (error) {
    return { isValid: false, error: `File read error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Validate individual CNAB detail record
function validateCNABDetailRecord(record: string, lineNumber: number): { isValid: boolean; error?: string } {
  if (record.length !== 80) {
    return { isValid: false, error: `Line ${lineNumber}: Invalid record length ${record.length}, expected 80` };
  }
  
  // Type (position 1-1) - should be '1'
  const type = record.substring(0, 1);
  if (type !== '1') {
    return { isValid: false, error: `Line ${lineNumber}: Invalid type '${type}', expected '1'` };
  }
  
  // Date (position 2-9) - 8 digits
  const date = record.substring(1, 9);
  if (!/^\d{8}$/.test(date)) {
    return { isValid: false, error: `Line ${lineNumber}: Invalid date format '${date}', expected 8 digits` };
  }
  
  // Validate date format (DDMMYYYY)
  const day = parseInt(date.substring(0, 2));
  const month = parseInt(date.substring(2, 4));
  const year = parseInt(date.substring(4, 8));
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    return { isValid: false, error: `Line ${lineNumber}: Invalid date '${date}'` };
  }
  
  // Value (position 10-19) - 10 digits
  const value = record.substring(9, 19);
  if (!/^\d{10}$/.test(value)) {
    return { isValid: false, error: `Line ${lineNumber}: Invalid value format '${value}', expected 10 digits` };
  }
  
  // CPF (position 20-30) - 11 digits
  const cpf = record.substring(19, 30);
  if (!/^\d{11}$/.test(cpf)) {
    return { isValid: false, error: `Line ${lineNumber}: Invalid CPF format '${cpf}', expected 11 digits` };
  }
  
  // Card (position 31-42) - 12 digits
  const card = record.substring(30, 42);
  if (!/^\d{12}$/.test(card)) {
    return { isValid: false, error: `Line ${lineNumber}: Invalid card format '${card}', expected 12 digits` };
  }
  
  // Time (position 43-48) - 6 digits (HHMMSS)
  const time = record.substring(42, 48);
  if (!/^\d{6}$/.test(time)) {
    return { isValid: false, error: `Line ${lineNumber}: Invalid time format '${time}', expected 6 digits` };
  }
  
  // Validate time format
  const hours = parseInt(time.substring(0, 2));
  const minutes = parseInt(time.substring(2, 4));
  const seconds = parseInt(time.substring(4, 6));
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return { isValid: false, error: `Line ${lineNumber}: Invalid time '${time}'` };
  }
  
  // Store Owner (position 49-62) - 14 characters, should not be empty
  const storeOwner = record.substring(48, 62).trim();
  if (storeOwner.length === 0) {
    return { isValid: false, error: `Line ${lineNumber}: Store owner name cannot be empty` };
  }
  
  // Store Name (position 63-81) - 19 characters, should not be empty
  const storeName = record.substring(62, 81).trim();
  if (storeName.length === 0) {
    return { isValid: false, error: `Line ${lineNumber}: Store name cannot be empty` };
  }
  
  return { isValid: true };
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create temp directory for chunks
const tempDir = path.join(uploadsDir, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for chunk uploads
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Use a temporary filename, we'll rename after processing
    const tempName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    cb(null, tempName);
  }
});

const uploadChunk = multer({ storage: chunkStorage });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use('/api/users', userRoutes);

// Chunk upload route
/**
 * @swagger
 * /api/upload/chunk:
 *   post:
 *     summary: Upload a file chunk
 *     description: Uploads a single chunk of a larger file as part of a chunked upload process.
 *     tags:
 *       - File Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               chunk:
 *                 type: string
 *                 format: binary
 *                 description: File chunk data
 *               chunkIndex:
 *                 type: integer
 *                 description: Index of this chunk (0-based)
 *               totalChunks:
 *                 type: integer
 *                 description: Total number of chunks for the complete file
 *               fileName:
 *                 type: string
 *                 description: Original filename
 *     responses:
 *       200:
 *         description: Chunk uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chunk 0 uploaded successfully"
 *                 chunkIndex:
 *                   type: integer
 *                 totalChunks:
 *                   type: integer
 *       400:
 *         description: Missing chunk data
 *       500:
 *         description: Server error during chunk upload
 */
// @ts-ignore - Type conflicts between multer and express types
app.post('/api/upload/chunk', uploadChunk.single('chunk'), (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No chunk uploaded' });
    }

    const { chunkIndex, totalChunks, fileName } = req.body;

    // Rename the temporary file to the correct name
    const tempPath = req.file.path;
    const finalPath = path.join(tempDir, `${fileName}.chunk.${chunkIndex}`);
    
    fs.renameSync(tempPath, finalPath);

    // Store chunk metadata
    const chunkInfo = {
      fileName,
      chunkIndex: parseInt(chunkIndex),
      totalChunks: parseInt(totalChunks),
      uploadedAt: new Date().toISOString()
    };

    // Save chunk info to a temporary file
    const infoFile = path.join(tempDir, `${fileName}.info.json`);
    let chunksInfo: any[] = [];
    
    if (fs.existsSync(infoFile)) {
      chunksInfo = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
    }
    
    chunksInfo[parseInt(chunkIndex)] = chunkInfo;
    fs.writeFileSync(infoFile, JSON.stringify(chunksInfo));

    res.json({ 
      message: `Chunk ${chunkIndex} uploaded successfully`,
      chunkIndex,
      totalChunks
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

// Complete upload route
/**
 * @swagger
 * /api/upload/complete:
 *   post:
 *     summary: Complete chunked file upload
 *     description: Combines all uploaded chunks into a complete file, validates it as CNAB format, and processes the transaction data.
 *     tags:
 *       - File Upload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Original filename
 *               totalChunks:
 *                 type: integer
 *                 description: Total number of chunks that should have been uploaded
 *     responses:
 *       200:
 *         description: File successfully assembled, validated, and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "CNAB file uploaded, validated, and data stored successfully"
 *                 filename:
 *                   type: string
 *                 size:
 *                   type: integer
 *                   description: Final file size in bytes
 *                 format:
 *                   type: string
 *                   example: "CNAB 80"
 *                 transactionsCount:
 *                   type: integer
 *                 fileUploadId:
 *                   type: string
 *       400:
 *         description: Missing chunks, invalid file format, or validation error
 *       500:
 *         description: Server error during file assembly or processing
 */
app.post('/api/upload/complete', async (req: any, res: any) => {
  try {
    const { fileName, totalChunks } = req.body;
    const infoFile = path.join(tempDir, `${fileName}.info.json`);
    
    if (!fs.existsSync(infoFile)) {
      return res.status(400).json({ error: 'Upload not found' });
    }

    const chunksInfo = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
    
    // Check if all chunks are uploaded
    for (let i = 0; i < totalChunks; i++) {
      if (!chunksInfo[i]) {
        return res.status(400).json({ error: `Missing chunk ${i}` });
      }
    }

    // Combine chunks into final file
    const finalFilePath = path.join(uploadsDir, fileName);
    const writeStream = fs.createWriteStream(finalFilePath);

    // Write chunks sequentially
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `${fileName}.chunk.${i}`);
      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);
      
      // Clean up chunk file
      fs.unlinkSync(chunkPath);
    }

    // Wait for the write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.end(() => resolve(true));
      writeStream.on('error', reject);
    });

    // Clean up info file
    fs.unlinkSync(infoFile);

    // Validate CNAB file format
    const validation = validateCNABFile(finalFilePath);
    if (!validation.isValid) {
      // Delete the invalid file
      fs.unlinkSync(finalFilePath);
      return res.status(400).json({ 
        error: 'Invalid CNAB file format',
        details: validation.error 
      });
    }

    // Parse CNAB content and store in database
    try {
      const fileContent = fs.readFileSync(finalFilePath, 'utf8');
      const cnabData = parseCNABContent(fileContent);
      
      // Get file stats
      const stats = fs.statSync(finalFilePath);
      
      // Store file upload metadata and CNAB data
      const fileUploadId = await storeCNABData(fileName, fileName, stats.size, validation.format!, cnabData);
      
      res.json({
        message: 'CNAB file uploaded, validated, and data stored successfully',
        filename: fileName,
        size: stats.size,
        format: validation.format,
        transactionsCount: cnabData.transactions.length,
        fileUploadId
      });
    } catch (parseError) {
      console.error('CNAB parsing error:', parseError);
      // Delete the file if parsing fails
      try {
        if (fs.existsSync(finalFilePath)) {
          fs.unlinkSync(finalFilePath);
        }
      } catch (error) {
        console.warn('Could not delete file after parsing error:', error);
      }
      return res.status(400).json({ 
        error: 'Failed to parse CNAB data',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      });
    }
  } catch (error) {
    console.error('Complete upload error:', error);
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

// File upload route
/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload and process a CNAB file
 *     description: Uploads a CNAB file, validates its format, parses the content, and stores the transaction data in the database.
 *     tags:
 *       - File Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CNAB file to upload (must be 80-character fixed-width format)
 *     responses:
 *       200:
 *         description: CNAB file successfully uploaded, validated, and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "CNAB file uploaded, validated, and data stored successfully"
 *                 filename:
 *                   type: string
 *                   description: Internal filename assigned to the uploaded file
 *                 originalName:
 *                   type: string
 *                   description: Original filename of the uploaded file
 *                 size:
 *                   type: integer
 *                   description: File size in bytes
 *                 mimetype:
 *                   type: string
 *                   description: MIME type of the uploaded file
 *                 format:
 *                   type: string
 *                   example: "CNAB 80"
 *                 transactionsCount:
 *                   type: integer
 *                   description: Number of transactions parsed from the file
 *                 fileUploadId:
 *                   type: string
 *                   description: Unique identifier for the file upload record
 *       400:
 *         description: Invalid file or CNAB format error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid CNAB file format"
 *                 details:
 *                   type: string
 *                   description: Detailed error message
 *       500:
 *         description: Server error during file processing
 */
// @ts-ignore - Type conflicts between multer and express types
app.post('/api/upload', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Validate CNAB file format
    const validation = validateCNABFile(req.file.path);
    if (!validation.isValid) {
      // Delete the invalid file
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (error) {
        console.warn('Could not delete invalid file:', error);
      }
      return res.status(400).json({ 
        error: 'Invalid CNAB file format',
        details: validation.error 
      });
    }

    // Parse CNAB content and store in database
    try {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const cnabData = parseCNABContent(fileContent);
      
      console.log(`Parsed CNAB data: ${cnabData.transactions.length} transactions`);
      
      // Store file upload metadata and CNAB data
      const fileUploadId = await storeCNABData(
        req.file.filename, 
        req.file.originalname, 
        req.file.size, 
        validation.format!, 
        cnabData
      );
      
      console.log(`Created file upload with ID: ${fileUploadId}`);
      
      res.json({
        message: 'CNAB file uploaded, validated, and data stored successfully',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        format: validation.format,
        transactionsCount: cnabData.transactions.length,
        fileUploadId
      });
    } catch (parseError) {
      console.error('CNAB parsing error:', parseError);
      // Delete the file if parsing fails
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (error) {
        console.warn('Could not delete file after parsing error:', error);
      }
      return res.status(400).json({ 
        error: 'Failed to parse CNAB data',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// API endpoints for querying stored CNAB data
/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     description: Retrieves all CNAB transactions stored in the database.
 *     tags:
 *       - Transactions
 *     responses:
 *       200:
 *         description: List of all transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           code:
 *                             type: integer
 *                             description: CNAB type code
 *                           name:
 *                             type: string
 *                             description: Descriptive name (Debit, Credit, etc.)
 *                           natureza:
 *                             type: string
 *                             description: Nature (Income/Expense)
 *                           sinal:
 *                             type: string
 *                             description: Sign (+/-)
 *                       date:
 *                         type: string
 *                         format: date
 *                         description: Transaction date in YYYY-MM-DD format
 *                       formattedDate:
 *                         type: string
 *                         description: Transaction date in DD/MM/YYYY format (Brazilian locale)
 *                       time:
 *                         type: string
 *                         description: Transaction time in HHMMSS format
 *                       formattedTime:
 *                         type: string
 *                         description: Transaction time in HH:MM:SS format
 *                       storeId:
 *                         type: string
 *                       fileUploadId:
 *                         type: string
 *       500:
 *         description: Server error
 */
app.get('/api/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await getAllTransactions();
    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * @swagger
 * /api/transactions/store/{storeId}:
 *   get:
 *     summary: Get transactions for a specific store
 *     description: Retrieves all transactions for a given store ID.
 *     tags:
 *       - Transactions
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the store
 *     responses:
 *       200:
 *         description: List of transactions for the specified store
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       transactionType:
 *                         type: string
 *                         description: Human-readable transaction type name
 *                       transactionCode:
 *                         type: integer
 *                         description: CNAB transaction type code
 *                       nature:
 *                         type: string
 *                         description: Income or Expense
 *                       sign:
 *                         type: string
 *                         description: + or - sign
 *                       date:
 *                         type: string
 *                         format: date
 *                         description: Transaction date in YYYY-MM-DD format
 *                       formattedDate:
 *                         type: string
 *                         description: Transaction date in DD/MM/YYYY format
 *                       value:
 *                         type: number
 *                         description: Transaction amount as number
 *                       formattedValue:
 *                         type: string
 *                         description: Transaction amount formatted as currency
 *                       cpf:
 *                         type: string
 *                         description: Customer CPF
 *                       card:
 *                         type: string
 *                         description: Card number (masked)
 *                       time:
 *                         type: string
 *                         description: Transaction time in HHMMSS format
 *                       formattedTime:
 *                         type: string
 *                         description: Transaction time in HH:MM:SS format
 *                       storeName:
 *                         type: string
 *                         description: Store name
 *                       storeOwner:
 *                         type: string
 *                         description: Store owner name
 *                       storeId:
 *                         type: string
 *                       fileUploadId:
 *                         type: string
 *       400:
 *         description: Missing or invalid store ID
 *       404:
 *         description: Store not found
 *       500:
 *         description: Server error
 */
app.get('/api/transactions/store/:storeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;
    if (!storeId) {
      res.status(400).json({ error: 'Store ID is required' });
      return;
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const transactions = await getTransactionsByStore(storeId);
    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions by store:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * @swagger
 * /api/stores/summary:
 *   get:
 *     summary: Get store summary with transaction statistics
 *     description: Retrieves a summary of all stores with their transaction counts and total values.
 *     tags:
 *       - Stores
 *     responses:
 *       200:
 *         description: Summary of all stores with transaction statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       ownerName:
 *                         type: string
 *                       name:
 *                         type: string
 *                       transactionCount:
 *                         type: integer
 *                         description: Number of transactions for this store
 *                       totalValue:
 *                         type: number
 *                         description: Total value of all transactions for this store
 *       500:
 *         description: Server error
 */
app.get('/api/stores/summary', async (req: Request, res: Response) => {
  try {
    const summary = await getStoreSummary();
    res.json({ stores: summary });
  } catch (error) {
    console.error('Error fetching store summary:', error);
    res.status(500).json({ error: 'Failed to fetch store summary' });
  }
});

// Health check
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API server.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  });
}

export default app;
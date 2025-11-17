import { prisma } from './db';

/**
 * Maps CNAB transaction type codes to descriptive names and properties
 */
function getTransactionTypeInfo(typeCode: number): { name: string; description: string; nature: string; sign: string } {
  const typeMap: Record<number, { name: string; description: string; nature: string; sign: string }> = {
    1: { name: 'Debit', description: 'Debit transaction', nature: 'Income', sign: '+' },
    2: { name: 'Boleto', description: 'Boleto payment', nature: 'Expense', sign: '-' },
    3: { name: 'Financing', description: 'Financing payment', nature: 'Expense', sign: '-' },
    4: { name: 'Credit', description: 'Credit transaction', nature: 'Income', sign: '+' },
    5: { name: 'Loan Receipt', description: 'Loan receipt', nature: 'Income', sign: '+' },
    6: { name: 'Sales', description: 'Sales transaction', nature: 'Income', sign: '+' },
    7: { name: 'TED Receipt', description: 'TED receipt', nature: 'Income', sign: '+' },
    8: { name: 'DOC Receipt', description: 'DOC receipt', nature: 'Income', sign: '+' },
    9: { name: 'Rent', description: 'Rent payment', nature: 'Expense', sign: '-' }
  };

  return typeMap[typeCode] || { name: 'Unknown', description: 'Unknown transaction type', nature: 'Unknown', sign: '?' };
}

/**
 * Gets or creates a transaction type record
 */
async function getOrCreateTransactionType(typeCode: number): Promise<string> {
  const typeInfo = getTransactionTypeInfo(typeCode);

  let transactionType = await prisma.transactionType.findUnique({
    where: { code: typeCode }
  });

  if (!transactionType) {
    transactionType = await prisma.transactionType.create({
      data: {
        code: typeCode,
        name: typeInfo.name,
        nature: typeInfo.nature,
        sign: typeInfo.sign,
        description: typeInfo.description
      }
    });
  }

  return transactionType.id;
}

export interface ParsedTransaction {
  typeCode: number; // Keep original numeric code for processing
  typeId: string;   // Foreign key to TransactionType
  date: Date;
  value: number;
  cpf: string;
  card: string;
  time: string;
  storeOwner: string;
  storeName: string;
}

export interface ParsedCNABData {
  transactions: ParsedTransaction[];
}

/**
 * Parse CNAB file content and extract transaction data
 */
export function parseCNABContent(content: string): ParsedCNABData {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    if (line.length !== 80) {
      throw new Error(`Invalid record length: ${line.length}. Expected 80 characters.`);
    }

    const type = parseInt(line.substring(0, 1));
    if (![1, 2, 3, 4, 5, 8, 9].includes(type)) {
      throw new Error(`Invalid record type: ${type}`);
    }

    // Skip header (type 0) and trailer (type 9) records for transaction data
    if (type === 9) continue;

    // Parse transaction data
    const dateStr = line.substring(1, 9); // DDMMYYYY
    const valueStr = line.substring(9, 19); // 10 digits
    const cpf = line.substring(19, 30); // 11 digits
    const card = line.substring(30, 42); // 12 digits
    const time = line.substring(42, 48); // HHMMSS
    const storeOwner = line.substring(48, 62).trim();
    const storeName = line.substring(62, 80).trim();

    // Parse date
    const day = parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4)) - 1; // JavaScript months are 0-based
    const year = parseInt(dateStr.substring(4, 8));
    const date = new Date(year, month, day);

    // Parse value (last 2 digits are cents)
    const value = parseInt(valueStr) / 100;

    transactions.push({
      typeCode: type,
      typeId: '', // Will be set when storing
      date,
      value,
      cpf,
      card,
      time,
      storeOwner,
      storeName
    });
  }

  return { transactions };
}

/**
 * Store CNAB data in the database
 */
export async function storeCNABData(
  filename: string,
  originalName: string,
  size: number,
  format: string,
  cnabData: ParsedCNABData
): Promise<string> {
  console.log(`Storing CNAB data: ${cnabData.transactions.length} transactions`);
  
  // Pre-create all transaction types to avoid async operations inside transaction
  const uniqueTypeCodes = [...new Set(cnabData.transactions.map(t => t.typeCode))];
  const typeIdMap = new Map<number, string>();
  
  for (const typeCode of uniqueTypeCodes) {
    const typeId = await getOrCreateTransactionType(typeCode);
    typeIdMap.set(typeCode, typeId);
  }
  
  const transaction = await prisma.$transaction(async (tx: any): Promise<any> => {
    // Create file upload record
    const fileUpload = await tx.fileUpload.create({
      data: {
        filename,
        originalName,
        size,
        format
      }
    });

    console.log(`Created file upload with ID: ${fileUpload.id}`);

    // Create stores first (use findOrCreate to avoid duplicates)
    const storeMap = new Map<string, string>();

    for (const transaction of cnabData.transactions) {
      const storeKey = `${transaction.storeOwner}|${transaction.storeName}`;

      if (!storeMap.has(storeKey)) {
        let store = await tx.store.findUnique({
          where: {
            ownerName_name: {
              ownerName: transaction.storeOwner,
              name: transaction.storeName
            }
          }
        });

        if (!store) {
          store = await tx.store.create({
            data: {
              ownerName: transaction.storeOwner,
              name: transaction.storeName
            }
          });
        }

        storeMap.set(storeKey, store.id);
      }
    }

    console.log(`Created ${storeMap.size} stores`);

    // Create transactions
    for (const transactionData of cnabData.transactions) {
      const storeKey = `${transactionData.storeOwner}|${transactionData.storeName}`;
      const storeId = storeMap.get(storeKey)!;
      const typeId = typeIdMap.get(transactionData.typeCode)!;

      await tx.transaction.create({
        data: {
          typeId,
          date: transactionData.date,
          value: transactionData.value,
          cpf: transactionData.cpf,
          card: transactionData.card,
          time: transactionData.time,
          storeId,
          fileUploadId: fileUpload.id
        }
      });
    }

    console.log(`Created ${cnabData.transactions.length} transactions`);
    return fileUpload.id;
  });

  console.log(`Transaction completed, returning ID: ${transaction}`);
  return transaction;
}

/**
 * Get all transactions from the database
 */
export async function getAllTransactions() {
  const transactions = await prisma.transaction.findMany({
    include: {
      type: true, // Include transaction type information
      store: true,
      fileUpload: true
    },
    orderBy: {
      date: 'desc'
    }
  });

  // Format for human readability
  return transactions.map(transaction => ({
    id: transaction.id,
    // Human readable transaction type
    transactionType: transaction.type.name,
    transactionCode: transaction.type.code,
    nature: transaction.type.nature,
    sign: transaction.type.sign,
    // Human readable date
    date: transaction.date.toISOString().split('T')[0], // YYYY-MM-DD
    formattedDate: transaction.date.toLocaleDateString('pt-BR'), // DD/MM/YYYY
    // Human readable value
    value: Number(transaction.value),
    formattedValue: `R$ ${Number(transaction.value).toFixed(2)}`,
    // Other fields
    cpf: transaction.cpf,
    card: transaction.card,
    // Human readable time
    time: transaction.time, // HHMMSS
    formattedTime: `${transaction.time.substring(0, 2)}:${transaction.time.substring(2, 4)}:${transaction.time.substring(4, 6)}`, // HH:MM:SS
    // Store info
    storeName: transaction.store.name,
    storeOwner: transaction.store.ownerName,
    // File info
    fileId: transaction.fileUpload.id,
    uploadedAt: transaction.fileUpload.uploadedAt.toISOString().split('T')[0]
  }));
}

/**
 * Get transactions by store
 */
export async function getTransactionsByStore(storeId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { storeId },
    include: {
      type: true, // Include transaction type information
      store: true,
      fileUpload: true
    },
    orderBy: {
      date: 'desc'
    }
  });

  // Format for human readability
  return transactions.map(transaction => ({
    id: transaction.id,
    // Human readable transaction type
    transactionType: transaction.type.name,
    transactionCode: transaction.type.code,
    nature: transaction.type.nature,
    sign: transaction.type.sign,
    // Human readable date
    date: transaction.date.toISOString().split('T')[0], // YYYY-MM-DD
    formattedDate: transaction.date.toLocaleDateString('pt-BR'), // DD/MM/YYYY
    // Human readable value
    value: Number(transaction.value),
    formattedValue: `R$ ${Number(transaction.value).toFixed(2)}`,
    // Other fields
    cpf: transaction.cpf,
    card: transaction.card,
    // Human readable time
    time: transaction.time, // HHMMSS
    formattedTime: `${transaction.time.substring(0, 2)}:${transaction.time.substring(2, 4)}:${transaction.time.substring(4, 6)}`, // HH:MM:SS
    // Store info
    storeName: transaction.store.name,
    storeOwner: transaction.store.ownerName,
    // File info
    fileId: transaction.fileUpload.id,
    uploadedAt: transaction.fileUpload.uploadedAt.toISOString().split('T')[0]
  }));
}

/**
 * Get transaction summary by store
 */
export async function getStoreSummary() {
  const stores = await prisma.store.findMany({
    include: {
      transactions: {
        include: {
          type: true
        }
      },
      _count: {
        select: { transactions: true }
      }
    }
  });

  return stores.map((store: any) => ({
    id: store.id,
    ownerName: store.ownerName,
    name: store.name,
    transactionCount: store._count.transactions,
    totalValue: store.transactions.reduce((sum: number, t: any) => {
      const value = Number(t.value);
      const sign = t.type.sign;
      return sign === '+' ? sum + value : sum - value;
    }, 0)
  }));
}
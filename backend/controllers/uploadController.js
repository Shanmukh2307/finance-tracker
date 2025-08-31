import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import tesseractOcrService from '../services/tesseractOcrService.js';
import textractOcrService from '../services/textractOcrService.js';
import { getTempReceiptsStats } from '../utils/receiptCleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'receipts');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow both images and PDFs for receipt processing
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/bmp', 
    'image/tiff',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files (JPEG, PNG, GIF, BMP, TIFF) and PDF files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Configure multer for temporary receipt storage
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempPath = path.join(__dirname, '..', 'uploads', 'temp-receipts');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
    
    cb(null, tempPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `temp-receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const tempUpload = multer({
  storage: tempStorage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Configure multer for transaction history uploads (CSV, TXT files)
const historyFileFilter = (req, file, cb) => {
  // Allow CSV, TXT, and TSV files for transaction history import
  const allowedTypes = [
    'text/csv',
    'text/plain',
    'text/tab-separated-values',
    'application/csv',
    'application/vnd.ms-excel', // Excel CSV exports
    'text/x-csv'
  ];
  
  // Also check file extension as backup
  const extension = file.originalname.toLowerCase();
  const allowedExtensions = ['.csv', '.txt', '.tsv'];
  const hasValidExtension = allowedExtensions.some(ext => extension.endsWith(ext));
  
  if (allowedTypes.includes(file.mimetype) || hasValidExtension) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV, TXT, and TSV files are allowed for transaction history import.'), false);
  }
};

const historyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'transaction-history');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `history-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const historyUpload = multer({
  storage: historyStorage,
  fileFilter: historyFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// @desc    Extract receipt data without creating transaction
// @route   POST /api/upload/extract-receipt
// @access  Private
export const extractReceiptData = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  console.log('=== EXTRACT RECEIPT DATA ===');
  console.log('Processing receipt extraction:', req.file.originalname);

  const { ocrEngine = 'textract' } = req.body;
  
  console.log('🤖 OCR Engine:', ocrEngine);
  console.log('📁 Temp file path:', req.file.path);
  console.log('📄 File type:', req.file.mimetype);
  console.log('📊 File size:', req.file.size, 'bytes');

  const receiptFileInfo = {
    tempFileId: req.file.filename, // Temporary file identifier
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    tempPath: req.file.path,
    uploadedAt: new Date()
  };

  let extractedData = null;
  let processingError = null;
  let ocrService = null;

  try {
    console.log('🚀 Starting OCR processing...');
    
    // Choose OCR service based on parameter
    if (ocrEngine === 'tesseract') {
      console.log('📝 Using Tesseract OCR Service');
      ocrService = tesseractOcrService;
      extractedData = await ocrService.processReceipt(req.file.path, req.file.mimetype);
    } else {
      console.log('🏢 Using AWS Textract OCR Service');
      ocrService = textractOcrService;
      const imageBuffer = fs.readFileSync(req.file.path);
      extractedData = await ocrService.processReceiptWithTextract(imageBuffer, req.file.originalname);
    }
    
    console.log('✅ OCR processing completed successfully');
    console.log(`🤖 OCR Engine used: ${extractedData.ocrEngine}`);
    console.log(`🎯 Confidence: ${extractedData.ocrConfidence}%`);
    
  } catch (error) {
    console.error('=== OCR EXTRACTION ERROR ===');
    console.error('❌ Receipt processing error:', error.message);
    processingError = error.message;
    
    // Fallback to Tesseract if Textract fails
    if (ocrEngine === 'textract' && !extractedData) {
      try {
        console.log('🔄 Falling back to Tesseract OCR...');
        extractedData = await tesseractOcrService.processReceipt(req.file.path, req.file.mimetype);
        console.log('✅ Fallback OCR processing completed');
        processingError = null; // Clear error since fallback succeeded
      } catch (fallbackError) {
        console.error('❌ Fallback OCR also failed:', fallbackError.message);
        processingError = `Primary OCR failed: ${error.message}. Fallback also failed: ${fallbackError.message}`;
      }
    }
  }

  if (extractedData && !processingError) {
    res.status(200).json({
      success: true,
      message: 'Receipt data extracted successfully',
      data: {
        receiptFileInfo,
        extractedData: {
          storeName: extractedData.storeName || extractedData.vendor,
          date: extractedData.date,
          items: extractedData.items || [],
          total: extractedData.total,
          tax: extractedData.tax,
          subtotal: extractedData.subtotal,
          itemCount: extractedData.items?.length || 0,
          ocrConfidence: extractedData.confidence || extractedData.ocrConfidence,
          ocrEngine: extractedData.engine || extractedData.ocrEngine,
          needsReview: extractedData.needsReview,
          reviewReason: extractedData.reviewReason
        }
      }
    });
  } else {
    // If OCR failed, still return file info for manual entry
    res.status(200).json({
      success: false,
      message: 'Receipt uploaded but OCR processing failed',
      data: {
        receiptFileInfo,
        extractedData: null,
        processingError,
        fallbackToManual: true
      }
    });
  }
});

// @desc    Upload receipt and extract transaction data
// @route   POST /api/upload/receipt
// @access  Private
export const uploadReceipt = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  console.log('Processing receipt upload:', req.file.originalname);

  const { 
    categoryName,
    categoryId,
    autoProcess = 'true',
    ocrEngine = 'textract' // Default to AWS Textract for best accuracy
  } = req.body;

  console.log('=== REQUEST PARAMETERS ===');
  console.log('ocrEngine from request:', req.body.ocrEngine);
  console.log('ocrEngine resolved:', ocrEngine);
  console.log('autoProcess:', autoProcess);

  const receiptInfo = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  };

  let extractedData = null;
  let processingError = null;
  let ocrService = null; // Declare outside try block so it's available later

  // If auto-processing is enabled, attempt to extract data
  if (autoProcess === 'true') {
    try {
      console.log('=== UPLOAD CONTROLLER DEBUG ===');
      console.log('🚀 Starting OCR processing...');
      console.log(`📁 File path: ${req.file.path}`);
      console.log(`📄 File type: ${req.file.mimetype}`);
      console.log(`📊 File size: ${req.file.size} bytes`);
      console.log(`🤖 OCR Engine: ${ocrEngine}`);
      
      // Force AWS Textract for best accuracy (you can change this)
      const forceOcrEngine = 'textract';
      console.log(`🎯 FORCING OCR ENGINE TO: ${forceOcrEngine}`);
      
      // Choose OCR service based on parameter
      if (forceOcrEngine === 'tesseract' || ocrEngine === 'tesseract') {
        console.log('📝 Using Tesseract OCR Service');
        ocrService = tesseractOcrService;
      } else if (forceOcrEngine === 'textract' || ocrEngine === 'textract') {
        console.log('🏢 Using AWS Textract OCR Service');
        ocrService = textractOcrService;
      } else {
        console.log('🏢 Using AWS Textract OCR Service (default)');
        ocrService = textractOcrService;
      }
      
      // Process with the selected OCR service
      if (ocrService === textractOcrService) {
        // AWS Textract needs buffer data and filename
        const imageBuffer = fs.readFileSync(req.file.path);
        extractedData = await ocrService.processReceiptWithTextract(imageBuffer, req.file.originalname);
      } else {
        // Tesseract uses file path
        extractedData = await ocrService.processReceipt(req.file.path, req.file.mimetype);
      }
      
      console.log('✅ OCR processing completed successfully');
      console.log(`🤖 OCR Engine used: ${extractedData.ocrEngine}`);
      console.log(`🎯 Confidence: ${extractedData.ocrConfidence}%`);
    } catch (error) {
      console.error('=== UPLOAD CONTROLLER OCR ERROR ===');
      console.error('❌ Receipt processing error:', error.message);
      console.error('📋 Error details:', error);
      processingError = error.message;
      
      // If AWS Textract fails, try fallback to Tesseract
      if (ocrEngine === 'textract' && !extractedData) {
        try {
          console.log('🔄 Falling back to Tesseract OCR...');
          extractedData = await tesseractOcrService.processReceipt(req.file.path, req.file.mimetype);
          console.log('✅ Fallback OCR processing completed');
          processingError = null; // Clear error since fallback succeeded
        } catch (fallbackError) {
          console.error('❌ Fallback OCR also failed:', fallbackError.message);
          processingError = `Primary OCR failed: ${error.message}. Fallback also failed: ${fallbackError.message}`;
        }
      }
    }
  } else {
    console.log('⏭️ Auto-processing disabled, skipping OCR');
  }

  // If OCR was successful, create transaction automatically
  if (extractedData && !processingError) {
    try {
      // Find or create appropriate category
      let category = null;
      
      // First try to find by categoryName if provided
      if (categoryName && !categoryId) {
        category = await Category.findOne({
          name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
          $or: [{ userId: req.user.id }, { isDefault: true }],
          type: { $in: ['expense', 'both'] }
        });
      }
      // Fallback to categoryId if provided
      else if (categoryId) {
        category = await Category.findOne({
          _id: categoryId,
          $or: [{ userId: req.user.id }, { isDefault: true }]
        });
      }
      
    // If no specific category found, try to find a default expense category
    if (!category) {
      category = await Category.findOne({
        name: { $in: ['Groceries', 'Shopping', 'Other Expenses', 'Food & Dining'] },
        $or: [{ userId: req.user.id }, { isDefault: true }],
        type: { $in: ['expense', 'both'] }
      });
    }
      
      if (!category) {
        // Create a default category
        category = await Category.create({
          name: 'Other Expenses',
          type: 'expense',
          color: '#6366F1',
          icon: 'shopping-bag',
          userId: req.user.id
        });
      }

      // Generate transaction data using the selected OCR service
      let transactionData;
      
      // Ensure we have an OCR service (fallback if needed)
      if (!ocrService) {
        ocrService = textractOcrService; // Default fallback
      }
      
      if (ocrService === textractOcrService) {
        transactionData = textractOcrService.generateTransactionData(
          extractedData, 
          req.user.id, 
          category._id
        );
      } else {
        // Use Tesseract service
        transactionData = ocrService.generateTransactionData(
          extractedData, 
          req.user.id, 
          category._id
        );
      }

      // Add receipt file info
      transactionData.receipt.filename = receiptInfo.filename;
      transactionData.receipt.originalName = receiptInfo.originalName;
      transactionData.receipt.mimetype = receiptInfo.mimetype;
      transactionData.receipt.size = receiptInfo.size;
      transactionData.receipt.path = receiptInfo.path;

      const transaction = await Transaction.create(transactionData);
      await transaction.populate('categoryId', 'name color icon type');

      return res.status(201).json({
        success: true,
        message: 'Receipt processed and transaction created successfully',
        data: {
          transaction: {
            id: transaction._id,
            amount: transaction.amount,
            description: transaction.description,
            categoryId: transaction.categoryId,
            date: transaction.date,
            type: transaction.type,
            receipt: {
              storeName: transaction.receipt.storeName,
              total: transaction.receipt.total,
              itemCount: transaction.receipt.items?.length || 0,
              ocrConfidence: transaction.receipt.ocrConfidence,
              ocrEngine: transaction.receipt.ocrEngine,
              needsReview: transaction.receipt.needsReview
            }
          },
          extractedData: {
            storeName: extractedData.storeName || extractedData.vendor,
            date: extractedData.date,
            items: extractedData.items,
            total: extractedData.total,
            tax: extractedData.tax,
            itemCount: extractedData.items.length,
            ocrConfidence: extractedData.confidence || extractedData.ocrConfidence,
            ocrEngine: extractedData.engine || extractedData.ocrEngine,
            needsReview: extractedData.needsReview
          }
        }
      });
    } catch (error) {
      console.error('Transaction creation error:', error);
      // If transaction creation fails, still return extracted data for manual review
    }
  }

  // Return receipt info and extracted data for manual review
  res.status(200).json({
    success: true,
    message: extractedData ? 'Receipt processed successfully - please review' : 'Receipt uploaded successfully',
    data: {
      receipt: receiptInfo,
      extractedData,
      processingError,
      ocrEngine: extractedData?.ocrEngine || ocrEngine,
      needsManualReview: !extractedData || processingError || (extractedData && extractedData.needsReview)
    }
  });
});

// @desc    Process uploaded receipt with OCR
// @route   POST /api/upload/process-receipt/:filename
// @access  Private
export const processUploadedReceipt = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { ocrEngine = 'textract' } = req.body; // Default to AWS Textract
  const receiptPath = path.join(__dirname, '..', 'uploads', 'receipts', filename);

  if (!fs.existsSync(receiptPath)) {
    return res.status(404).json({
      success: false,
      message: 'Receipt file not found'
    });
  }

  try {
    console.log('Processing uploaded receipt:', filename);
    console.log('Using OCR engine:', ocrEngine);
    
    // Choose OCR service
    let ocrService;
    let extractedData;
    
    if (ocrEngine === 'tesseract') {
      ocrService = tesseractOcrService;
      extractedData = await ocrService.processReceipt(receiptPath);
    } else if (ocrEngine === 'textract') {
      ocrService = textractOcrService;
      const imageBuffer = fs.readFileSync(receiptPath);
      extractedData = await ocrService.processReceiptWithTextract(imageBuffer, filename);
    } else {
      // Default to AWS Textract
      ocrService = textractOcrService;
      const imageBuffer = fs.readFileSync(receiptPath);
      extractedData = await ocrService.processReceiptWithTextract(imageBuffer, filename);
    }
    
    // Fallback strategy
    if (!extractedData && ocrEngine === 'textract') {
      console.log('AWS Textract failed, falling back to Tesseract...');
      extractedData = await tesseractOcrService.processReceipt(receiptPath);
    }

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: { 
        extractedData: {
          storeName: extractedData.storeName || extractedData.vendor,
          date: extractedData.date,
          items: extractedData.items,
          total: extractedData.total,
          tax: extractedData.tax,
          itemCount: extractedData.items.length,
          ocrConfidence: extractedData.confidence || extractedData.ocrConfidence,
          ocrEngine: extractedData.engine || extractedData.ocrEngine,
          needsReview: extractedData.needsReview,
          reviewReason: extractedData.reviewReason
        }
      }
    });
  } catch (error) {
    console.error('Receipt processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing receipt',
      error: error.message
    });
  }
});

// @desc    Create transaction from extracted receipt data
// @route   POST /api/upload/create-transaction
// @access  Private
export const createTransactionFromReceipt = asyncHandler(async (req, res) => {
  const {
    extractedData,
    receiptInfo,
    overrides = {}
  } = req.body;

  if (!extractedData || !receiptInfo) {
    return res.status(400).json({
      success: false,
      message: 'Extracted data and receipt info are required'
    });
  }

  try {
    // Find or create appropriate category
    let category = null;
    
    // First try categoryName from overrides
    if (overrides.categoryName && !overrides.categoryId) {
      category = await Category.findOne({
        name: { $regex: new RegExp(`^${overrides.categoryName}$`, 'i') },
        $or: [{ userId: req.user.id }, { isDefault: true }],
        type: { $in: ['expense', 'both'] }
      });
    }
    // Fallback to categoryId from overrides
    else if (overrides.categoryId) {
      category = await Category.findOne({
        _id: overrides.categoryId,
        $or: [{ userId: req.user.id }, { isDefault: true }]
      });
    }
    
    if (!category) {
      // Try to find a default expense category
      category = await Category.findOne({
        name: { $in: ['Groceries', 'Shopping', 'Other Expenses'] },
        $or: [{ userId: req.user.id }, { isDefault: true }],
        type: { $in: ['expense', 'both'] }
      });
    }
    
    if (!category) {
      // Create a default category
      category = await Category.create({
        name: 'Other Expenses',
        type: 'expense',
        color: '#6366F1',
        icon: 'shopping-bag',
        userId: req.user.id
      });
    }

    // Generate transaction data and merge with overrides
    const extractedOcrEngine = extractedData.engine || extractedData.ocrEngine || 'textract';
    let ocrService;
    
    if (extractedOcrEngine === 'tesseract') {
      ocrService = tesseractOcrService;
    } else if (extractedOcrEngine === 'AWS Textract') {
      ocrService = textractOcrService;
    } else {
      ocrService = textractOcrService; // Default to AWS Textract
    }
    
    const transactionData = ocrService.generateTransactionData(
      extractedData, 
      req.user.id, 
      category._id
    );

    // Apply any overrides
    if (overrides.amount) transactionData.amount = parseFloat(overrides.amount);
    if (overrides.description) transactionData.description = overrides.description;
    if (overrides.date) transactionData.date = new Date(overrides.date);

    // Add receipt file info
    transactionData.receipt.filename = receiptInfo.filename;
    transactionData.receipt.originalName = receiptInfo.originalName;
    transactionData.receipt.mimetype = receiptInfo.mimetype;
    transactionData.receipt.size = receiptInfo.size;
    transactionData.receipt.path = receiptInfo.path;

    const transaction = await Transaction.create(transactionData);
    await transaction.populate('categoryId', 'name color icon type');

    res.status(201).json({
      success: true,
      message: 'Transaction created from receipt successfully',
      data: { 
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          description: transaction.description,
          categoryId: transaction.categoryId,
          date: transaction.date,
          type: transaction.type,
          receipt: {
            storeName: transaction.receipt.storeName,
            total: transaction.receipt.total,
            itemCount: transaction.receipt.items?.length || 0,
            ocrConfidence: transaction.receipt.ocrConfidence,
            needsReview: transaction.receipt.needsReview
          }
        }
      }
    });
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating transaction from receipt',
      error: error.message
    });
  }
});

// @desc    Get uploaded receipt file
// @route   GET /api/upload/receipt/:filename
// @access  Private
export const getReceiptFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const receiptPath = path.join(__dirname, '..', 'uploads', 'receipts', filename);

  if (!fs.existsSync(receiptPath)) {
    return res.status(404).json({
      success: false,
      message: 'Receipt file not found'
    });
  }

  // Verify the receipt belongs to a transaction owned by the user
  const transaction = await Transaction.findOne({
    userId: req.user.id,
    'receipt.filename': filename
  });

  if (!transaction) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this receipt'
    });
  }

  res.sendFile(receiptPath);
});

// @desc    Upload transaction history from PDF/CSV
// @route   POST /api/upload/transaction-history
// @access  Private
export const uploadTransactionHistory = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  try {
    console.log('Processing transaction history upload:', req.file.originalname);

    let extractedText;
    const filePath = req.file.path;
    const fileType = req.file.mimetype;

    // Extract text based on file type
    if (fileType === 'application/pdf') {
      // For now, PDF table extraction is not fully implemented
      // Users should upload CSV files for bulk import
      throw new Error('PDF table extraction not yet implemented. Please export your data as CSV format and upload that instead.');
    } else if (fileType === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      // For CSV files, read as text
      extractedText = await fsPromises.readFile(filePath, 'utf8');
    } else {
      // For other file types, try to read as text
      extractedText = await fsPromises.readFile(filePath, 'utf8');
    }

    // Parse tabular data
    const transactions = parseTabularData(extractedText, req.user.id);
    
    if (transactions.length === 0) {
      throw new Error('No valid transactions found in the uploaded file');
    }

    // Process each transaction and find/create categories
    const processedTransactions = [];
    const errors = [];

    for (const transactionData of transactions) {
      try {
        // Find or create category
        let category = await Category.findOne({
          name: { $regex: new RegExp(`^${transactionData.categoryName}$`, 'i') },
          $or: [{ userId: req.user.id }, { isDefault: true }]
        });

        if (!category) {
          category = await Category.create({
            name: transactionData.categoryName,
            type: transactionData.type,
            userId: req.user.id
          });
        }

        const finalTransactionData = {
          ...transactionData,
          categoryId: category._id
        };
        delete finalTransactionData.categoryName;

        processedTransactions.push(finalTransactionData);
      } catch (error) {
        errors.push({
          data: transactionData,
          error: error.message
        });
      }
    }

    // Bulk insert valid transactions
    let savedTransactions = [];
    if (processedTransactions.length > 0) {
      savedTransactions = await Transaction.insertMany(processedTransactions);
    }

    // Clean up uploaded file
    try {
      await fsPromises.unlink(filePath);
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }

    res.status(201).json({
      success: true,
      message: `${savedTransactions.length} transactions imported successfully`,
      data: {
        imported: savedTransactions.length,
        errors: errors.length,
        transactions: savedTransactions.map(t => ({
          id: t._id,
          amount: t.amount,
          description: t.description,
          categoryId: t.categoryId,
          date: t.date,
          type: t.type
        })),
        errors
      }
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && req.file.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file on error:', cleanupError);
      }
    }

    console.error('Transaction history upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process transaction history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to parse tabular data from extracted text
function parseTabularData(text, userId) {
  const lines = text.split('\n').filter(line => line.trim());
  const transactions = [];
  
  console.log(`Parsing ${lines.length} lines from transaction history`);
  
  // Skip header row(s) and process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      // Parse different possible formats
      let parts;
      
      // Try CSV format first
      if (line.includes(',')) {
        parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
      }
      // Try tab-separated
      else if (line.includes('\t')) {
        parts = line.split('\t').map(p => p.trim());
      }
      // Try multiple spaces
      else {
        parts = line.split(/\s{2,}/).map(p => p.trim());
      }
      
      if (parts.length >= 3) { // Minimum: Date, Description, Amount
        const dateStr = parts[0];
        const description = parts[1];
        const amountStr = parts[2].replace(/[$,]/g, '');
        const categoryName = parts[3] || 'Imported';
        
        // Parse date
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date: ${dateStr}`);
          continue;
        }
        
        // Parse amount
        const amount = Math.abs(parseFloat(amountStr));
        if (isNaN(amount) || amount === 0) {
          console.warn(`Invalid amount: ${amountStr}`);
          continue;
        }
        
        // Determine transaction type
        const type = amountStr.includes('-') || description.toLowerCase().includes('payment') 
          ? 'expense' 
          : 'income';
        
        const transaction = {
          userId,
          type,
          amount,
          description: description.trim(),
          categoryName: categoryName.trim(),
          date,
          isImported: true
        };
        
        transactions.push(transaction);
      }
    } catch (error) {
      console.error('Error parsing line:', line, error);
    }
  }
  
  console.log(`Successfully parsed ${transactions.length} transactions`);
  return transactions;
}

// @desc    Get receipt details for a transaction
// @route   GET /api/upload/receipt-details/:transactionId
// @access  Private
export const getReceiptDetails = asyncHandler(async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user.id
    }).populate('categoryId', 'name color icon type');
    
    if (!transaction || !transaction.receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        receipt: transaction.receipt,
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          description: transaction.description,
          categoryId: transaction.categoryId,
          date: transaction.date,
          type: transaction.type
        }
      }
    });
    
  } catch (error) {
    console.error('Get receipt details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get receipt details'
    });
  }
});

// @desc    Get available OCR engines and their status
// @route   GET /api/upload/ocr-engines
// @access  Private
export const getOcrEngines = asyncHandler(async (req, res) => {
  try {
    const engines = [
      {
        id: 'tesseract',
        name: 'Tesseract OCR',
        description: 'Free open-source OCR engine',
        status: 'available',
        accuracy: '60-70%',
        features: [
          'Free to use',
          'Works offline',
          'Good for simple receipts',
          'Basic accuracy'
        ],
        limitations: [
          'Lower accuracy than cloud services',
          'Struggles with complex layouts',
          'Date recognition may be inconsistent'
        ]
      },
      {
        id: 'textract',
        name: 'AWS Textract',
        description: 'Amazon\'s enterprise OCR service specialized for receipts',
        status: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME) ? 'available' : 'not_configured',
        accuracy: '95%+',
        features: [
          'Highest accuracy for receipts',
          'Receipt-specific AI models',
          'Structured expense analysis',
          'Automatic vendor/date/total extraction',
          'Line item detection',
          'Tax calculation recognition',
          'Enterprise-grade reliability'
        ],
        limitations: [
          'Requires AWS credentials and S3 bucket',
          'Usage-based pricing',
          'Requires internet connection',
          'Temporary S3 storage needed'
        ]
      }
    ];
    
    res.json({
      success: true,
      data: {
        engines,
        default: 'textract',
        fallback: 'tesseract',
        recommendation: 'AWS Textract provides the highest accuracy for receipt processing with specialized expense analysis features.'
      }
    });
    
  } catch (error) {
    console.error('Get OCR engines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OCR engines information'
    });
  }
});

// @desc    Get receipt processing system status
// @route   GET /api/upload/system-status
// @access  Private
export const getSystemStatus = asyncHandler(async (req, res) => {
  try {
    const tempStats = getTempReceiptsStats();
    
    // Check directory existence
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const receiptsDir = path.join(uploadsDir, 'receipts');
    const tempReceiptsDir = path.join(uploadsDir, 'temp-receipts');
    
    const directories = {
      uploads: fs.existsSync(uploadsDir),
      receipts: fs.existsSync(receiptsDir),
      tempReceipts: fs.existsSync(tempReceiptsDir)
    };
    
    // Check OCR services status
    const ocrStatus = {
      tesseract: 'available',
      textract: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME) ? 'available' : 'not_configured'
    };
    
    res.json({
      success: true,
      data: {
        directories,
        tempReceiptsStats: tempStats,
        ocrEngines: ocrStatus,
        features: {
          extractOnly: true,
          autoCreate: true,
          tempStorage: true,
          cleanup: true
        },
        endpoints: {
          extractOnly: '/api/upload/extract-receipt',
          autoCreate: '/api/upload/receipt',
          createTransaction: '/api/transactions'
        }
      }
    });
    
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system status'
    });
  }
});

import express from 'express';
import {
  upload,
  uploadReceipt,
  processUploadedReceipt,
  createTransactionFromReceipt,
  getReceiptFile,
  uploadTransactionHistory,
  getReceiptDetails,
  getOcrEngines
} from '../controllers/uploadController.js';
import { protect } from '../middleware/auth.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Receipt upload routes
router.post('/receipt', 
  upload.single('receipt'),
  [
    body('categoryId')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    body('categoryName')
      .optional()
      .isString()
      .withMessage('Category name must be a string'),
    body('autoProcess')
      .optional()
      .isBoolean()
      .withMessage('autoProcess must be a boolean'),
    body('ocrEngine')
      .optional()
      .isIn(['tesseract', 'textract'])
      .withMessage('OCR engine must be either tesseract or textract'),
    handleValidationErrors
  ],
  uploadReceipt
);

// Get available OCR engines
router.get('/ocr-engines', getOcrEngines);

// Process existing receipt
router.post('/process-receipt/:filename', [
  body('ocrEngine')
    .optional()
    .isIn(['tesseract', 'textract'])
    .withMessage('OCR engine must be either tesseract or textract'),
  handleValidationErrors
], processUploadedReceipt);

// Get receipt details
router.get('/receipt-details/:transactionId', getReceiptDetails);

// Create transaction from extracted data
router.post('/create-transaction', [
  body('extractedData')
    .notEmpty()
    .withMessage('Extracted data is required'),
  body('receiptInfo')
    .notEmpty()
    .withMessage('Receipt info is required'),
  body('overrides')
    .optional()
    .isObject()
    .withMessage('Overrides must be an object'),
  handleValidationErrors
], createTransactionFromReceipt);

// Get receipt file
router.get('/receipt/:filename', getReceiptFile);

// Transaction history upload
router.post('/transaction-history',
  upload.single('file'),
  uploadTransactionHistory
);

export default router;

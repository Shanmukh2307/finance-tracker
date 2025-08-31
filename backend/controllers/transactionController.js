import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../middleware/errorHandler.js';

// Helper function to ensure userId is ObjectId
const getUserObjectId = (userId) => {
  return typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = asyncHandler(async (req, res) => {
  const {
    type,
    amount,
    description,
    categoryId,
    categoryName,
    category: categoryField,
    date,
    paymentMethod,
    tags,
    notes,
    currency,
    recurring,
    // New receipt-related fields
    receiptFileInfo,
    receiptData
  } = req.body;

  let category;

  // Determine which category field to use
  const providedCategoryName = categoryName || categoryField;

  // If categoryName or category is provided, find category by name
  if (providedCategoryName && !categoryId) {
    category = await Category.findOne({
      name: { $regex: new RegExp(`^${providedCategoryName}$`, 'i') }, // Case-insensitive exact match
      $or: [{ userId: req.user.id }, { isDefault: true }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category '${providedCategoryName}' not found. Please create it first or use an existing category.`
      });
    }
  } 
  // If categoryId is provided, find category by ID
  else if (categoryId) {
    category = await Category.findOne({
      _id: categoryId,
      $or: [{ userId: req.user.id }, { isDefault: true }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
  } 
  // Neither categoryId nor categoryName provided
  else {
    return res.status(400).json({
      success: false,
      message: 'Either categoryId, categoryName, or category is required'
    });
  }

  // Check if category type matches transaction type
  if (category.type !== 'both' && category.type !== type) {
    return res.status(400).json({
      success: false,
      message: `Category '${category.name}' cannot be used for ${type} transactions`
    });
  }

  // Prepare transaction data
  const transactionData = {
    userId: req.user.id,
    type,
    amount,
    description,
    categoryId: category._id, // Use the found category's ID
    date: date || new Date(),
    paymentMethod,
    tags,
    notes,
    currency: currency || req.user.preferences?.currency || 'USD',
    recurring
  };

  // Handle receipt data if provided
  if (receiptFileInfo && receiptData) {
    console.log('=== PROCESSING RECEIPT DATA FOR TRANSACTION ===');
    console.log('📄 Receipt file:', receiptFileInfo.originalName);
    console.log('🏪 Store name:', receiptData.storeName);
    console.log('💰 Receipt total:', receiptData.total);
    
    try {
      // Move file from temp to permanent location
      const tempPath = receiptFileInfo.tempPath;
      const permanentDir = path.join(path.dirname(tempPath), '..', 'receipts');
      
      // Ensure permanent directory exists
      if (!fs.existsSync(permanentDir)) {
        fs.mkdirSync(permanentDir, { recursive: true });
      }
      
      // Generate permanent filename
      const permanentFilename = `receipt-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(receiptFileInfo.originalName)}`;
      const permanentPath = path.join(permanentDir, permanentFilename);
      
      // Move file from temp to permanent location
      fs.renameSync(tempPath, permanentPath);
      
      console.log('✅ Receipt file moved to permanent storage:', permanentFilename);
      
      // Add receipt data to transaction
      transactionData.receipt = {
        filename: permanentFilename,
        originalName: receiptFileInfo.originalName,
        mimetype: receiptFileInfo.mimetype,
        size: receiptFileInfo.size,
        path: permanentPath,
        storeName: receiptData.storeName,
        total: receiptData.total,
        tax: receiptData.tax,
        subtotal: receiptData.subtotal,
        items: receiptData.items || [],
        ocrConfidence: receiptData.ocrConfidence,
        ocrEngine: receiptData.ocrEngine,
        needsReview: receiptData.needsReview,
        reviewReason: receiptData.reviewReason,
        processedAt: new Date(),
        extractedAt: receiptFileInfo.uploadedAt
      };
      
    } catch (fileError) {
      console.error('❌ Error processing receipt file:', fileError.message);
      // Continue with transaction creation but without receipt data
      console.log('⚠️ Proceeding with transaction creation without receipt attachment');
    }
  }

  const transaction = await Transaction.create(transactionData);

  // Populate category for response
  await transaction.populate('categoryId', 'name color icon type');

  res.status(201).json({
    success: true,
    message: 'Transaction created successfully',
    data: { 
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        description: transaction.description,
        categoryId: transaction.categoryId,
        date: transaction.date,
        type: transaction.type,
        receipt: transaction.receipt ? {
          storeName: transaction.receipt.storeName,
          total: transaction.receipt.total,
          itemCount: transaction.receipt.items?.length || 0,
          ocrConfidence: transaction.receipt.ocrConfidence,
          ocrEngine: transaction.receipt.ocrEngine,
          needsReview: transaction.receipt.needsReview
        } : null
      }
    }
  });
});

// @desc    Get all transactions for user
// @route   GET /api/transactions
// @access  Private
export const getTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    categoryId,
    startDate,
    endDate,
    paymentMethod,
    sortBy = 'date',
    sortOrder = 'desc',
    search
  } = req.query;

  // Build query
  const query = { userId: getUserObjectId(req.user.id), isDeleted: false };

  if (type) query.type = type;
  if (categoryId) query.categoryId = categoryId;
  if (paymentMethod) query.paymentMethod = paymentMethod;

  // Date range filter
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Search in description
  if (search) {
    query.description = { $regex: search, $options: 'i' };
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .populate('categoryId', 'name color icon type')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum),
    Transaction.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        current: pageNum,
        pages: totalPages,
        total,
        limit: limitNum
      }
    }
  });
});

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
export const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isDeleted: false
  }).populate('categoryId', 'name color icon type description');

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  res.json({
    success: true,
    data: { transaction }
  });
});

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = asyncHandler(async (req, res) => {
  const {
    type,
    amount,
    description,
    categoryId,
    categoryName,
    category: categoryField,
    date,
    paymentMethod,
    tags,
    notes,
    currency,
    status
  } = req.body;

  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isDeleted: false
  });

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  // Handle category update by ID or name
  let newCategoryId = null;
  
  // Determine which category field to use
  const providedCategoryName = categoryName || categoryField;
  
  if (providedCategoryName && !categoryId) {
    // Find category by name
    const category = await Category.findOne({
      name: { $regex: new RegExp(`^${providedCategoryName}$`, 'i') },
      $or: [{ userId: req.user.id }, { isDefault: true }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category '${providedCategoryName}' not found`
      });
    }

    // Check if category type matches transaction type
    const transactionType = type || transaction.type;
    if (category.type !== 'both' && category.type !== transactionType) {
      return res.status(400).json({
        success: false,
        message: `Category '${category.name}' cannot be used for ${transactionType} transactions`
      });
    }

    newCategoryId = category._id;
  } else if (categoryId && categoryId !== transaction.categoryId.toString()) {
    // Find category by ID
    const category = await Category.findOne({
      _id: categoryId,
      $or: [{ userId: req.user.id }, { isDefault: true }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category type matches transaction type
    const transactionType = type || transaction.type;
    if (category.type !== 'both' && category.type !== transactionType) {
      return res.status(400).json({
        success: false,
        message: `Category '${category.name}' cannot be used for ${transactionType} transactions`
      });
    }

    newCategoryId = categoryId;
  }

  // Update fields
  if (type) transaction.type = type;
  if (amount) transaction.amount = amount;
  if (description) transaction.description = description;
  if (newCategoryId) transaction.categoryId = newCategoryId;
  if (date) transaction.date = date;
  if (paymentMethod) transaction.paymentMethod = paymentMethod;
  if (tags) transaction.tags = tags;
  if (notes !== undefined) transaction.notes = notes;
  if (currency) transaction.currency = currency;
  if (status) transaction.status = status;

  await transaction.save();
  await transaction.populate('categoryId', 'name color icon type');

  res.json({
    success: true,
    message: 'Transaction updated successfully',
    data: { transaction }
  });
});

// @desc    Delete transaction (soft delete)
// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isDeleted: false
  });

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  await transaction.softDelete();

  res.json({
    success: true,
    message: 'Transaction deleted successfully'
  });
});

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
export const getTransactionStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'month' } = req.query;

  console.log('Stats Debug - User from token:', { id: req.user.id, name: req.user.name });
  console.log('Stats Debug - User ID type:', typeof req.user.id, req.user.id instanceof mongoose.Types.ObjectId);
  console.log('Stats Debug - Query params:', { startDate, endDate, groupBy });

  // Build date filter - convert user ID to ObjectId if it's a string
  const userId = getUserObjectId(req.user.id);
  const dateFilter = { userId: userId, isDeleted: false };
  console.log('Stats Debug - Date filter:', dateFilter);
  
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) dateFilter.date.$gte = new Date(startDate);
    if (endDate) dateFilter.date.$lte = new Date(endDate);
    console.log('Stats Debug - Date filter with dates:', dateFilter);
  }

  // Aggregation pipeline
  const pipeline = [
    { $match: dateFilter },
    {
      $group: {
        _id: {
          type: '$type',
          year: { $year: '$date' },
          ...(groupBy === 'month' && { month: { $month: '$date' } }),
          ...(groupBy === 'day' && { 
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          })
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ];

  const stats = await Transaction.aggregate(pipeline);
  console.log('Stats Debug - Aggregation pipeline:', JSON.stringify(pipeline, null, 2));
  console.log('Stats Debug - Stats result:', JSON.stringify(stats, null, 2));

  // Calculate totals
  const totals = await Transaction.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  console.log('Stats Debug - Totals result:', JSON.stringify(totals, null, 2));

  // Category breakdown
  const categoryStats = await Transaction.aggregate([
    { $match: dateFilter },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: {
          categoryId: '$categoryId',
          categoryName: '$category.name',
          categoryColor: '$category.color',
          type: '$type'
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      stats,
      totals,
      categoryStats
    }
  });
});

// @desc    Get monthly summary
// @route   GET /api/transactions/monthly-summary
// @access  Private
export const getMonthlySummary = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Convert user ID to ObjectId if it's a string
  const userId = getUserObjectId(req.user.id);

  console.log('Monthly Summary Debug - User ID:', userId, 'Period:', { year, month });
  console.log('Monthly Summary Debug - Date range:', { startDate, endDate });

  const summary = await Transaction.aggregate([
    {
      $match: {
        userId: userId,
        isDeleted: false,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        transactions: { $push: '$$ROOT' }
      }
    }
  ]);

  console.log('Monthly Summary Debug - Aggregation result:', JSON.stringify(summary, null, 2));

  const income = summary.find(s => s._id === 'income') || { total: 0, count: 0 };
  const expense = summary.find(s => s._id === 'expense') || { total: 0, count: 0 };

  res.json({
    success: true,
    data: {
      period: { year: parseInt(year), month: parseInt(month) },
      income: income.total,
      expense: expense.total,
      balance: income.total - expense.total,
      transactionCount: income.count + expense.count,
      incomeCount: income.count,
      expenseCount: expense.count
    }
  });
});

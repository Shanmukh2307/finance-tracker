import Category from '../models/Category.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, type, color, icon, parentCategory, budget } = req.body;

  // Check if category name already exists for this user
  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    userId: req.user.id,
    type
  });

  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: `Category '${name}' already exists for ${type} transactions`
    });
  }

  // If parentCategory is provided, verify it exists
  if (parentCategory) {
    const parent = await Category.findOne({
      _id: parentCategory,
      $or: [{ userId: req.user.id }, { isDefault: true }]
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found'
      });
    }
  }

  const category = await Category.create({
    name,
    description,
    type,
    color,
    icon,
    parentCategory,
    budget,
    userId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: { category }
  });
});

// @desc    Get all categories for user
// @route   GET /api/categories
// @access  Private
export const getCategories = asyncHandler(async (req, res) => {
  const { type, includeDefault = true, includeStats = false } = req.query;

  // Build query
  const query = {
    $or: [
      { userId: req.user.id },
      ...(includeDefault === 'true' ? [{ isDefault: true }] : [])
    ],
    isActive: true
  };

  if (type) {
    query.$and = [
      { $or: [{ type }, { type: 'both' }] }
    ];
  }

  let categories = await Category.find(query)
    .populate('parentCategory', 'name color icon')
    .populate('subcategories')
    .sort({ isDefault: -1, name: 1 });

  // Include usage statistics if requested
  if (includeStats === 'true') {
    const categoryIds = categories.map(cat => cat._id);
    
    const stats = await Transaction.aggregate([
      {
        $match: {
          userId: req.user.id,
          categoryId: { $in: categoryIds },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$categoryId',
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          lastUsed: { $max: '$date' }
        }
      }
    ]);

    // Merge stats with categories
    categories = categories.map(category => {
      const categoryStats = stats.find(stat => 
        stat._id.toString() === category._id.toString()
      );
      
      return {
        ...category.toObject(),
        stats: categoryStats || {
          totalAmount: 0,
          transactionCount: 0,
          lastUsed: null
        }
      };
    });
  }

  res.json({
    success: true,
    data: { categories }
  });
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    $or: [{ userId: req.user.id }, { isDefault: true }]
  })
    .populate('parentCategory', 'name color icon')
    .populate('subcategories');

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Get usage statistics
  const stats = await Transaction.aggregate([
    {
      $match: {
        userId: req.user.id,
        categoryId: category._id,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        lastUsed: { $max: '$date' },
        firstUsed: { $min: '$date' }
      }
    }
  ]);

  const categoryWithStats = {
    ...category.toObject(),
    stats: stats[0] || {
      totalAmount: 0,
      transactionCount: 0,
      avgAmount: 0,
      lastUsed: null,
      firstUsed: null
    }
  };

  res.json({
    success: true,
    data: { category: categoryWithStats }
  });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
export const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, type, color, icon, parentCategory, budget, isActive } = req.body;

  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found or you do not have permission to update it'
    });
  }

  // Check if new name conflicts with existing categories
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      userId: req.user.id,
      type: type || category.type,
      _id: { $ne: category._id }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `Category '${name}' already exists for ${type || category.type} transactions`
      });
    }
  }

  // If parentCategory is being updated, verify it exists
  if (parentCategory && parentCategory !== category.parentCategory?.toString()) {
    const parent = await Category.findOne({
      _id: parentCategory,
      $or: [{ userId: req.user.id }, { isDefault: true }]
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found'
      });
    }

    // Prevent circular reference
    if (parent.parentCategory?.toString() === category._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create circular reference in category hierarchy'
      });
    }
  }

  // Update fields
  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (type) category.type = type;
  if (color) category.color = color;
  if (icon) category.icon = icon;
  if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
  if (budget) category.budget = { ...category.budget, ...budget };
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: { category }
  });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found or you do not have permission to delete it'
    });
  }

  // Check if category is being used in transactions
  const transactionCount = await Transaction.countDocuments({
    categoryId: category._id,
    isDeleted: false
  });

  if (transactionCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category. It is being used in ${transactionCount} transaction(s). Please reassign these transactions to another category first.`
    });
  }

  // Check if category has subcategories
  const subcategoryCount = await Category.countDocuments({
    parentCategory: category._id,
    isActive: true
  });

  if (subcategoryCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category. It has ${subcategoryCount} subcategory(ies). Please delete or reassign subcategories first.`
    });
  }

  await Category.findByIdAndDelete(category._id);

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
});

// @desc    Get default categories
// @route   GET /api/categories/defaults
// @access  Public
export const getDefaultCategories = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const query = { isDefault: true, isActive: true };
  if (type) {
    query.$or = [{ type }, { type: 'both' }];
  }

  const categories = await Category.find(query).sort({ name: 1 });

  res.json({
    success: true,
    data: { categories }
  });
});

// @desc    Initialize default categories for new user
// @route   POST /api/categories/initialize-defaults
// @access  Private
export const initializeDefaultCategories = asyncHandler(async (req, res) => {
  // Check if user already has categories
  const existingCategories = await Category.countDocuments({ userId: req.user.id });
  
  if (existingCategories > 0) {
    return res.status(400).json({
      success: false,
      message: 'User already has categories initialized'
    });
  }

  // Default categories to create
  const defaultCategories = [
    // Income categories
    { name: 'Salary', type: 'income', color: '#10B981', icon: 'money' },
    { name: 'Freelance', type: 'income', color: '#059669', icon: 'briefcase' },
    { name: 'Investment', type: 'income', color: '#047857', icon: 'trending-up' },
    { name: 'Other Income', type: 'income', color: '#065F46', icon: 'plus' },
    
    // Expense categories
    { name: 'Food & Dining', type: 'expense', color: '#EF4444', icon: 'utensils' },
    { name: 'Transportation', type: 'expense', color: '#F97316', icon: 'car' },
    { name: 'Shopping', type: 'expense', color: '#8B5CF6', icon: 'shopping-bag' },
    { name: 'Entertainment', type: 'expense', color: '#EC4899', icon: 'film' },
    { name: 'Bills & Utilities', type: 'expense', color: '#6B7280', icon: 'file-text' },
    { name: 'Healthcare', type: 'expense', color: '#14B8A6', icon: 'heart' },
    { name: 'Education', type: 'expense', color: '#3B82F6', icon: 'book' },
    { name: 'Other Expenses', type: 'expense', color: '#6366F1', icon: 'more-horizontal' }
  ];

  // Create categories for the user
  const createdCategories = await Category.insertMany(
    defaultCategories.map(cat => ({ ...cat, userId: req.user.id }))
  );

  res.status(201).json({
    success: true,
    message: 'Default categories initialized successfully',
    data: { categories: createdCategories }
  });
});

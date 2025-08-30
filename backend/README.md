# Backend is ready!

## Overview
This is the backend API for the Personal Finance Assistant application built with Node.js, Express, and MongoDB.

## Features
- **User Authentication**: Registration, login, profile management with JWT
- **Transaction Management**: CRUD operations for income/expense tracking
- **Category Management**: Customizable categories with default system categories
- **Receipt Processing**: Upload and OCR processing of receipt images/PDFs
- **File Uploads**: Support for transaction history import
- **Data Analytics**: Transaction statistics and monthly summaries
- **Multi-user Support**: Each user has isolated data
- **Pagination**: Efficient data loading with pagination support

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password
- `PUT /deactivate` - Deactivate account
- `POST /logout` - Logout user

### Transactions (`/api/transactions`)
- `GET /` - Get transactions with filtering and pagination
- `POST /` - Create new transaction
- `GET /:id` - Get single transaction
- `PUT /:id` - Update transaction
- `DELETE /:id` - Delete transaction (soft delete)
- `GET /stats` - Get transaction statistics
- `GET /monthly-summary` - Get monthly summary

### Categories (`/api/categories`)
- `GET /` - Get user categories
- `POST /` - Create new category
- `GET /:id` - Get single category
- `PUT /:id` - Update category
- `DELETE /:id` - Delete category
- `GET /defaults` - Get default system categories
- `POST /initialize-defaults` - Initialize default categories for new user

### File Upload (`/api/upload`)
- `POST /receipt` - Upload receipt for OCR processing
- `POST /process-receipt/:filename` - Process uploaded receipt
- `POST /create-transaction` - Create transaction from extracted receipt data
- `GET /receipt/:filename` - Get uploaded receipt file
- `POST /transaction-history` - Upload transaction history file

## Environment Variables
Create a `.env` file with:
```
MONGODB_URI=mongodb://localhost:27017/finance-tracker
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE=10485760
```

## Installation & Setup
1. Install dependencies: `npm install`
2. Set up environment variables
3. Start MongoDB service
4. Run development server: `npm run dev`
5. Server will start on http://localhost:5000

## Data Models

### User
- Name, email, password (hashed)
- Preferences (currency, date format, theme)
- Account status and last login tracking

### Category
- Name, description, type (income/expense/both)
- Color, icon for UI
- Hierarchical support (parent/subcategories)
- Budget tracking
- User-specific and system default categories

### Transaction
- Amount, description, type, date
- Category association
- Payment method, tags, notes
- Location data
- Receipt attachment support
- Recurring transaction support
- Soft delete functionality

## Key Features

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- File upload restrictions
- User data isolation

### Performance
- Database indexing for optimal queries
- Pagination for large datasets
- Aggregation pipelines for analytics
- Virtual fields for computed data

### File Handling
- Receipt image/PDF upload
- OCR processing (mock implementation)
- Transaction history import
- Secure file access control

### Analytics
- Transaction statistics by category/date
- Monthly summaries
- Spending trends
- Budget tracking support

## Error Handling
- Comprehensive error middleware
- Validation error responses
- Database error handling
- File upload error management

## Next Steps for Frontend Integration
1. Create Next.js frontend application
2. Implement authentication flow
3. Build transaction management UI
4. Add data visualization charts
5. Implement receipt upload interface
6. Create responsive dashboard

The backend is now fully functional and ready for frontend integration!

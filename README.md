# 💰 Finance Tracker Application

A comprehensive full-stack finance tracking application with OCR receipt processing, built with modern web technologies.

![Finance Tracker](https://img.shields.io/badge/Version-1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)

Youtube Demo link : https://youtu.be/RN9UWaxZZbw

## 🚀 Features

### Core Functionality
- **🔐 User Authentication** - Secure JWT-based authentication with password strength validation
- **💸 Transaction Management** - Create, read, update, delete transactions with advanced filtering
- **📊 Dashboard Analytics** - Interactive charts showing income/expense trends and category breakdowns
- **🏷️ Category Management** - Custom categories with color coding and icons
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **🌙 Dark Mode Support** - Beautiful light and dark themes with system preference detection

### Advanced Features
- **📄 Receipt OCR Processing** - Extract transaction data from receipt images using AWS Textract and Tesseract
- **🔍 Smart Search & Filtering** - Filter transactions by date range, category, type, and payment method
- **📈 Dynamic Date Filtering** - Interactive month/year picker for historical data analysis
- **📄 Pagination** - Efficient pagination for large transaction datasets (12 items per page)
- **💾 File Upload** - Support for PNG, JPG, and PDF receipt uploads
- **🎨 Modern UI** - Built with Shadcn UI and Tailwind CSS for a polished experience

## 🏗️ Project Structure

```
finance-tracker/
├── 📁 backend/                          # Node.js/Express API Server
│   ├── 📁 config/
│   │   └── database.js                  # MongoDB connection configuration
│   ├── 📁 controllers/
│   │   ├── authController.js            # Authentication logic
│   │   ├── categoryController.js        # Category CRUD operations
│   │   ├── transactionController.js     # Transaction management
│   │   └── uploadController.js          # File upload handling
│   ├── 📁 lib/
│   │   ├── aws_textract.js             # AWS Textract OCR service
│   │   └── uploadtoS3.js               # AWS S3 file storage
│   ├── 📁 middleware/
│   │   ├── auth.js                     # JWT authentication middleware
│   │   ├── errorHandler.js             # Error handling middleware
│   │   └── validation.js               # Input validation middleware
│   ├── 📁 models/
│   │   ├── Category.js                 # Category data model
│   │   ├── Transaction.js              # Transaction data model
│   │   └── User.js                     # User data model
│   ├── 📁 routes/
│   │   ├── authRoutes.js               # Authentication endpoints
│   │   ├── categoryRoutes.js           # Category endpoints
│   │   ├── transactionRoutes.js        # Transaction endpoints
│   │   └── uploadRoutes.js             # File upload endpoints
│   ├── 📁 services/
│   │   ├── ocrService.js               # OCR service orchestrator
│   │   ├── tesseractOcrService.js      # Tesseract OCR implementation
│   │   └── textractOcrService.js       # AWS Textract implementation
│   ├── 📁 uploads/
│   │   ├── receipts/                   # Processed receipt storage
│   │   └── temp-receipts/              # Temporary upload storage
│   ├── 📁 utils/
│   │   ├── dateParser.js               # Date parsing utilities
│   │   └── receiptCleanup.js           # File cleanup utilities
│   ├── seedData.js                     # Database seeding script
│   ├── server.js                       # Express server entry point
│   └── package.json                    # Backend dependencies
│
├── 📁 frontend/finance-app/             # Next.js Frontend Application
│   ├── 📁 src/
│   │   ├── 📁 app/
│   │   │   ├── 📁 (auth)/              # Authentication pages
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── 📁 (main)/              # Main application pages
│   │   │   │   ├── dashboard/          # Analytics dashboard
│   │   │   │   ├── transactions/       # Transaction management
│   │   │   │   ├── categories/         # Category management
│   │   │   │   └── settings/           # User settings
│   │   │   ├── globals.css             # Global styles
│   │   │   ├── layout.tsx              # Root layout component
│   │   │   └── page.tsx                # Home page
│   │   ├── 📁 components/
│   │   │   ├── 📁 ui/                  # Shadcn UI components
│   │   │   ├── AppNavigation.tsx       # Main navigation component
│   │   │   ├── DashboardCharts.tsx     # Chart components
│   │   │   ├── EnhancedDashboardCharts.tsx # Advanced chart features
│   │   │   ├── FilterableCategoryBreakdown.tsx # Category analytics
│   │   │   ├── MainLayout.tsx          # Layout wrapper
│   │   │   ├── MonthYearPicker.tsx     # Date selection component
│   │   │   ├── ProtectedRoute.tsx      # Authentication guard
│   │   │   ├── ThemeToggle.tsx         # Dark mode toggle
│   │   │   └── TransactionFormModal.tsx # Transaction form with OCR
│   │   ├── 📁 contexts/
│   │   │   ├── AuthContext.tsx         # Authentication state
│   │   │   └── ThemeContext.tsx        # Theme management
│   │   └── 📁 lib/
│   │       ├── api.ts                  # API client functions
│   │       └── utils.ts                # Utility functions
│   ├── components.json                 # Shadcn UI configuration
│   ├── next.config.ts                  # Next.js configuration
│   ├── tailwind.config.js              # Tailwind CSS configuration
│   ├── tsconfig.json                   # TypeScript configuration
│   └── package.json                    # Frontend dependencies
│
├── Financial_Tracker_API_Tests.postman_collection.json # API testing collection
├── Financial_Tracker_Environment.postman_environment.json # Postman environment
└── README.md                           # This file
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer middleware
- **OCR Services**: 
  - AWS Textract (cloud-based)
  - Tesseract (local processing)
- **Cloud Storage**: AWS S3
- **Validation**: Express Validator
- **Security**: bcryptjs for password hashing

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Build Tool**: Turbopack (Next.js built-in)

### Development Tools
- **API Testing**: Postman collection included
- **Code Quality**: ESLint configuration
- **Version Control**: Git

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v6 or higher) - [Download here](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)

### Optional (for full OCR functionality)
- **AWS Account** - For Textract OCR service
- **Tesseract OCR** - For local OCR processing

## 🚦 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Shanmukh2307/finance-tracker.git
cd finance-tracker
```

### 2. Backend Setup

#### Navigate to backend directory
```bash
cd backend
```

#### Install dependencies
```bash
npm install
```

#### Create environment file
Create a `.env` file in the backend directory:

```env
# Database Configuration
MONGODB_URI=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=

# Server Configuration
PORT=3001
NODE_ENV=development

# AWS Configuration (Optional - for advanced OCR)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-region
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=./uploads
```

#### Start the backend server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

#### Navigate to frontend directory (in a new terminal)
```bash
cd frontend/finance-app
```

#### Install dependencies
```bash
npm install
```

#### Create environment file
Create a `.env.local` file in the frontend directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# App Configuration
NEXT_PUBLIC_APP_NAME=Finance Tracker
NEXT_PUBLIC_APP_VERSION=1.0.0
```

#### Start the frontend development server
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### 4. Access the Application

1. Open your browser and go to `http://localhost:3000`
2. Register a new account or use the login page
3. Start tracking your finances!

## 🔧 Configuration Options

### Backend Configuration

#### Database Options
- **Local MongoDB**: Use `mongodb://localhost:27017/finance-tracker`
- **MongoDB Atlas**: Use connection string from your Atlas cluster
- **Docker MongoDB**: Use `mongodb://host.docker.internal:27017/finance-tracker`

#### OCR Service Configuration
The application supports two OCR services:

1. **Tesseract (Default)** - Local processing, no additional setup required
2. **AWS Textract** - Cloud-based, requires AWS credentials

To use AWS Textract, set up the AWS environment variables in your `.env` file.

#### File Upload Configuration
- **MAX_FILE_SIZE**: Maximum file size for uploads (default: 10MB)
- **UPLOAD_PATH**: Directory for storing uploaded files
- **Supported formats**: PNG, JPG, JPEG, PDF

### Frontend Configuration

#### API Endpoint
Update `NEXT_PUBLIC_API_URL` in `.env.local` if your backend runs on a different port or domain.

#### Build Configuration
```bash
# Development build
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Transaction Endpoints
- `GET /api/transactions` - Get transactions (with pagination & filtering)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get single transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/stats` - Get transaction statistics

### Category Endpoints
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Upload Endpoints
- `POST /api/upload/receipt` - Upload and process receipt with OCR


## 🙏 Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful UI components
- [Recharts](https://recharts.org/) for the interactive charts
- [AWS Textract](https://aws.amazon.com/textract/) for OCR capabilities
- [Tesseract.js](https://tesseract.projectnaptha.com/) for local OCR processing
- [MongoDB](https://www.mongodb.com/) for the database
- [Next.js](https://nextjs.org/) for the frontend framework




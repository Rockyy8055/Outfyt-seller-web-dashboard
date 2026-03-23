# Outfyt Seller Dashboard

A modern, production-ready seller web dashboard for the Outfyt multi-vendor fashion delivery platform.

## Features

- **Phone OTP Authentication** - Secure login with phone number and OTP verification
- **Dashboard Overview** - View total products, orders, revenue, and pending orders
- **Product Management** - Add, edit, delete products with image upload support
- **Bulk Upload** - Upload multiple products via CSV/Excel file
- **Order Management** - View and update order statuses
- **Store Settings** - Manage store information and preferences

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI with Radix UI primitives
- **Form Handling**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **State Management**: Zustand for auth state
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running at `http://localhost:5000/api` (or update `.env.local`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── login/                    # Login page
│   ├── verify-otp/               # OTP verification page
│   └── dashboard/                # Dashboard pages
│       ├── products/             # Products module
│       ├── bulk-upload/          # Bulk upload module
│       ├── orders/               # Orders module
│       └── settings/             # Store settings
├── components/
│   ├── layout/                   # Layout components (Sidebar, Topbar)
│   ├── products/                 # Product-related components
│   └── ui/                       # Reusable UI components
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts               # Auth state management
│   └── useToast.ts              # Toast notifications
├── lib/                          # Utility functions
├── services/api/                 # API service layer
│   ├── index.ts                 # Axios instance
│   ├── auth.ts                  # Auth API
│   ├── store.ts                 # Store API
│   ├── products.ts              # Products API
│   ├── orders.ts                # Orders API
│   ├── upload.ts                # Image upload API
│   └── dashboard.ts             # Dashboard stats API
├── types/                        # TypeScript type definitions
└── public/                       # Static assets
    └── sample_products.csv       # Sample CSV for bulk upload
```

## API Endpoints Expected

The dashboard expects the following backend API endpoints:

### Authentication
- `POST /auth/send-otp` - Send OTP to phone number
- `POST /auth/verify-otp` - Verify OTP and get token
- `POST /auth/logout` - Logout user
- `GET /auth/profile` - Get user profile

### Store
- `GET /store` - Get store details
- `PUT /store` - Update store details

### Products
- `GET /products` - List products (with pagination)
- `GET /products/:id` - Get single product
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /products/bulk-upload` - Bulk upload products

### Orders
- `GET /orders` - List orders (with pagination)
- `GET /orders/:id` - Get single order
- `PUT /orders/:id/status` - Update order status

### Upload
- `POST /upload/image` - Upload single image

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics

## Bulk Upload CSV Format

The CSV file should have the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Product name |
| description | No | Product description |
| price | Yes | Price in INR |
| category | Yes | Product category |
| size | Yes | Product size |
| color | Yes | Product color |
| stock | Yes | Stock quantity |
| image_url | No | Product image URL |

Example:
```csv
name,description,price,category,size,color,stock,image_url
Classic T-Shirt,Premium cotton t-shirt,499,men,M,Black,50,https://example.com/image.jpg
```

## Authentication Flow

1. User enters phone number on `/login`
2. OTP is sent to the phone number
3. User enters OTP on `/verify-otp`
4. On successful verification, JWT token is stored
5. User is redirected to `/dashboard`
6. Token is included in all API requests via Authorization header

## Development

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Run Linter
```bash
npm run lint
```

## License

Private - All rights reserved

// Auth Types
export interface User {
  id: string
  phone: string
  name?: string
  email?: string
  role: 'seller' | 'admin'
  storeId?: string
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  message: string
  tempToken?: string
  token?: string
  user?: User
}

// Store Types - Matching Mobile App
export type StoreStatus = 'ACTIVE' | 'INACTIVE'
export type StoreCategory = 'MEN' | 'WOMEN' | 'KIDS' | 'ALL'
export type DeliveryOption = 'TRY_AT_HOME' | 'EXPRESS' | 'STANDARD'

export interface Store {
  id: string
  name: string
  ownerId: string
  phone?: string
  gstNumber?: string
  address: string
  latitude: number
  longitude: number
  isApproved: boolean
  isDisabled: boolean
  status: StoreStatus
  createdAt: string
  updatedAt: string
}

export interface StoreUpdateData {
  name?: string
  phone?: string
  gstNumber?: string
  address?: string
  latitude?: number
  longitude?: number
}

// Product Types - Matching Mobile App
export type ProductStatus = 'ACTIVE' | 'INACTIVE'

export interface Product {
  id: string
  storeId: string
  name: string
  price: number
  category?: string | null
  color?: string | null
  images: string[]
  status: ProductStatus
  stock?: number
  sizes?: { size: string; stock: number }[]
  createdAt: string
  updatedAt: string
}

export interface ProductFormData {
  name: string
  description?: string
  price: number
  category: string
  sizes: string[]
  colors: string[]
  stock: number
  images: string[]
}

export interface ProductListResponse {
  success: boolean
  data: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

// Order Types
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PACKING' | 'READY' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED'
export type PaymentMethod = 'COD' | 'ONLINE'

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  size: string
  quantity: number
  unitPrice: number
  offerPercentage?: number
  productImage?: string | null
  productColor?: string | null
}

export interface Order {
  id: string
  orderNumber: string
  storeId: string
  userId: string
  riderId?: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  totalAmount: number
  amountReceived?: number
  otpCode: string
  deliveryLat: number
  deliveryLng: number
  deliveryAddress?: string
  packingStartedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  items?: OrderItem[]
  customerName?: string
  customerPhone?: string
}

export interface OrderListResponse {
  success: boolean
  data: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Dashboard Types
export interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  recentOrders?: Order[]
}

// Bulk Upload Types
export interface BulkUploadResult {
  successCount: number
  failed: Array<{
    row: number
    error: string
  }>
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// Pagination Types
export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  category?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

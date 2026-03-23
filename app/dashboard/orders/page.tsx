'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { orderApi } from '@/services/api/orders'
import { Order, OrderStatus, PaginationParams } from '@/types'
import { formatCurrency, formatDate, debounce } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from 'lucide-react'
import DeliveryMap from '@/components/map/DeliveryMap'

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pending', color: 'warning', icon: Clock },
  ACCEPTED: { label: 'Accepted', color: 'default', icon: CheckCircle },
  PACKING: { label: 'Packing', color: 'secondary', icon: Package },
  READY: { label: 'Ready', color: 'info', icon: Package },
  PICKED_UP: { label: 'Picked Up', color: 'info', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'info', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'success', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'destructive', icon: XCircle },
}

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<OrderStatus | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: PaginationParams = {
        page,
        limit: 10,
        search,
        status: status || undefined,
      }
      const response = await orderApi.getOrders(params)
      if (response.success) {
        setOrders(response.data)
        setTotalPages(response.pagination.totalPages)
        setTotal(response.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      setOrders([])
      setTotalPages(1)
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleSearch = debounce((value: unknown) => {
    const searchValue = String(value)
    const params = new URLSearchParams(searchParams)
    if (searchValue) {
      params.set('search', searchValue)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`/dashboard/orders?${params.toString()}`)
  }, 300)

  const handleStatusFilter = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'all') {
      params.set('status', value)
    } else {
      params.delete('status')
    }
    params.set('page', '1')
    router.push(`/dashboard/orders?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`/dashboard/orders?${params.toString()}`)
  }

  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order)
    setNewStatus(order.status)
    setStatusDialogOpen(true)
  }

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return

    setIsUpdating(true)
    try {
      await orderApi.updateOrderStatus(selectedOrder.id, newStatus)
      toast({
        title: 'Success',
        description: 'Order status updated successfully',
      })
      setOrders(orders.map(o => 
        o.id === selectedOrder.id ? { ...o, status: newStatus } : o
      ))
      setStatusDialogOpen(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update order status',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getBadgeVariant = (status: OrderStatus) => {
    const color = statusConfig[status]?.color || 'default'
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
      warning: 'warning',
      default: 'default',
      secondary: 'secondary',
      info: 'default',
      success: 'success',
      destructive: 'destructive',
    }
    return variants[color] || 'default'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">{total} orders total</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                className="pl-10"
                defaultValue={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Select value={status || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground md:hidden">
                        {order.customerName}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p>{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                    </TableCell>
                    <TableCell>
                      <p>{order.items?.length || 0} item(s)</p>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(order.status)}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openStatusDialog(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="rounded-lg bg-muted p-4">
                <p className="font-medium">{selectedOrder.customerName || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone || 'N/A'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedOrder.deliveryAddress}
                </p>
              </div>

              {/* OTP Verification */}
              {selectedOrder.paymentMethod === 'COD' && selectedOrder.otpCode && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                  <p className="font-medium text-yellow-800">Delivery OTP</p>
                  <p className="text-2xl font-bold text-yellow-900 tracking-widest mt-1">
                    {selectedOrder.otpCode}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Share this OTP with the customer for delivery verification
                  </p>
                </div>
              )}

              {/* Delivery Location */}
              {selectedOrder.deliveryLat && selectedOrder.deliveryLng && (
                <div className="space-y-2">
                  <p className="font-medium">Delivery Location</p>
                  <DeliveryMap
                    deliveryLat={selectedOrder.deliveryLat}
                    deliveryLng={selectedOrder.deliveryLng}
                    deliveryAddress={selectedOrder.deliveryAddress}
                  />
                </div>
              )}

              {/* Rider Assignment */}
              {selectedOrder.riderId && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Rider Assigned</p>
                    <p className="text-sm text-blue-600">ID: {selectedOrder.riderId}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                <p className="font-medium">Items</p>
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    {/* Product Image */}
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.productImage ? (
                        <img 
                          src={item.productImage} 
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.productName}</p>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.productColor && <span>• Color: {item.productColor}</span>}
                        <span>• Qty: {item.quantity}</span>
                      </div>
                      {item.offerPercentage && item.offerPercentage > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="destructive" className="text-xs">
                            {item.offerPercentage}% OFF
                          </Badge>
                          <span className="text-sm line-through text-muted-foreground">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(item.unitPrice * item.quantity * (1 - item.offerPercentage / 100))}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Status</span>
                <span className="font-medium">{selectedOrder.paymentStatus}</span>
              </div>

              {/* Status Update */}
              <div className="space-y-2">
                <p className="font-medium">Update Status</p>
                <Select
                  value={newStatus || ''}
                  onValueChange={(value) => setNewStatus(value as OrderStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

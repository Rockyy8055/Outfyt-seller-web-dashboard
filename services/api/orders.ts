import { supabase } from '@/lib/supabase'
import { Order, OrderStatus, OrderListResponse, ApiResponse } from '@/types'

const orderSelect = `
  id,
  storeId,
  userId,
  otpCode,
  customerName,
  customerPhone,
  status,
  paymentStatus,
  paymentMethod,
  totalAmount,
  amountReceived,
  deliveryAddress,
  deliveryLat,
  deliveryLng,
  rejectionReason,
  packingStartedAt,
  createdAt,
  updatedAt,
  riderId,
  items:OrderItem(
    id,
    orderId,
    productId,
    productName,
    size,
    quantity,
    unitPrice,
    offerPercentage,
    productImage,
    productColor
  )
`

export const orderApi = {
  getOrders: async (params: { page?: number; limit?: number; status?: string; search?: string }): Promise<OrderListResponse> => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      console.log('=== ORDERS DEBUG ===')
      console.log('Auth User ID:', authUser?.id)
      
      if (authError || !authUser) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Get store by owner ID (auth user ID)
      const { data: store, error: storeError } = await supabase
        .from('Store')
        .select('id')
        .eq('ownerId', authUser.id)
        .single()

      let storeId = store?.id || null
      
      console.log('Store ID:', storeId)
      
      if (storeError || !storeId) {
        const result = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', authUser.id)
          .single()
        storeId = result.data?.id || null
      }

      if (!storeId) {
        console.log('No storeId found')
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Query orders from Order table (PascalCase - same as mobile app)
      let query = supabase
        .from('Order')
        .select(orderSelect, { count: 'exact' })
        .eq('storeId', storeId)

      if (params.status) query = query.eq('status', params.status)
      if (params.search) query = query.ilike('customerName', `%${params.search}%`)

      const from = ((params.page || 1) - 1) * (params.limit || 10)
      const to = from + (params.limit || 10) - 1

      const { data, error, count } = await query.order('createdAt', { ascending: false }).range(from, to)

      console.log('Orders query result:', data?.length)
      console.log('Orders query error:', error)

      if (error) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      const orders = (data || []).map(o => ({
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        storeId: o.storeId,
        userId: o.userId,
        status: o.status,
        paymentMethod: o.paymentMethod || 'COD',
        paymentStatus: o.paymentStatus,
        totalAmount: o.totalAmount,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        deliveryAddress: o.deliveryAddress,
        deliveryLat: o.deliveryLat,
        deliveryLng: o.deliveryLng,
        otpCode: o.otpCode,
        rejectionReason: o.rejectionReason,
        createdAt: o.createdAt,
        items: (o.items || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          orderId: item.orderId as string,
          productId: item.productId as string,
          productName: item.productName as string,
          size: item.size as string,
          quantity: item.quantity as number,
          unitPrice: item.unitPrice as number,
          offerPercentage: item.offerPercentage as number | null,
          productImage: item.productImage as string | null,
          productColor: item.productColor as string | null,
        })),
      })) as Order[]

      return {
        success: true,
        data: orders,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / (params.limit || 10)),
        },
      }
    } catch (err) {
      console.error('Exception in getOrders:', err)
      return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
    }
  },

  getOrder: async (id: string): Promise<ApiResponse<Order>> => {
    try {
      const { data: order, error } = await supabase
        .from('Order')
        .select(orderSelect)
        .eq('id', id)
        .single()

      if (error || !order) {
        return { success: false, message: error?.message || 'Order not found' }
      }

      return {
        success: true,
        data: {
          id: order.id,
          orderNumber: order.id.slice(0, 8).toUpperCase(),
          storeId: order.storeId,
          userId: order.userId,
          status: order.status,
          paymentMethod: order.paymentMethod || 'COD',
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          deliveryLat: order.deliveryLat,
          deliveryLng: order.deliveryLng,
          otpCode: order.otpCode,
          rejectionReason: order.rejectionReason,
          createdAt: order.createdAt,
          items: (order.items || []).map((item: Record<string, unknown>) => ({
            id: item.id as string,
            orderId: item.orderId as string,
            productId: item.productId as string,
            productName: item.productName as string,
            size: item.size as string,
            quantity: item.quantity as number,
            unitPrice: item.unitPrice as number,
            offerPercentage: item.offerPercentage as number | null,
            productImage: item.productImage as string | null,
            productColor: item.productColor as string | null,
          })),
        } as Order
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to get order' }
    }
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<ApiResponse<Order>> => {
    try {
      const { data, error } = await supabase
        .from('Order')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, data: data as Order }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update order' }
    }
  },
}

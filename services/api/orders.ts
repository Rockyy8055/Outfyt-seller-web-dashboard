import { supabase } from '@/lib/supabase'
import { Order, OrderStatus, OrderListResponse, ApiResponse } from '@/types'

function normalizeStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.includes('/storage/v1/object/public/')) return url
  if (url.includes('/storage/v1/object/')) {
    return url.replace('/storage/v1/object/', '/storage/v1/object/public/')
  }
  return url
}

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

      // Try to get store ID from multiple possible table/column name combinations
      let storeId: string | null = null
      
      // Try PascalCase Store table with ownerId
      const { data: store1 } = await supabase
        .from('Store')
        .select('id')
        .eq('ownerId', authUser.id)
        .maybeSingle()
      
      if (store1?.id) {
        storeId = store1.id
        console.log('Found store in Store table:', storeId)
      }
      
      // Try snake_case stores table with owner_id
      if (!storeId) {
        const { data: store2 } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', authUser.id)
          .maybeSingle()
        
        if (store2?.id) {
          storeId = store2.id
          console.log('Found store in stores table:', storeId)
        }
      }
      
      // Try store table with ownerId
      if (!storeId) {
        const { data: store3 } = await supabase
          .from('store')
          .select('id')
          .eq('ownerId', authUser.id)
          .maybeSingle()
        
        if (store3?.id) {
          storeId = store3.id
          console.log('Found store in store table:', storeId)
        }
      }
      
      console.log('Final Store ID:', storeId)

      // Build query - try different table names for Order
      let query: any
      let orderTableName = 'Order'
      
      // First try PascalCase Order table
      let testQuery = supabase.from('Order').select('id', { head: true }).limit(1)
      let { error: testError } = await testQuery
      
      if (testError) {
        // Try lowercase order table
        testQuery = supabase.from('order').select('id', { head: true }).limit(1)
        const { error: testError2 } = await testQuery
        
        if (!testError2) {
          orderTableName = 'order'
        } else {
          // Try orders table
          testQuery = supabase.from('orders').select('id', { head: true }).limit(1)
          const { error: testError3 } = await testQuery
          if (!testError3) {
            orderTableName = 'orders'
          }
        }
      }
      
      console.log('Using Order table name:', orderTableName)

      // Build the select query
      const selectFields = `
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
        riderId
      `

      query = supabase
        .from(orderTableName)
        .select(selectFields, { count: 'exact' })

      // Only filter by storeId if we found one
      if (storeId) {
        query = query.eq('storeId', storeId)
      }

      if (params.status) query = query.eq('status', params.status)
      if (params.search) query = query.ilike('customerName', `%${params.search}%`)

      const from = ((params.page || 1) - 1) * (params.limit || 10)
      const to = from + (params.limit || 10) - 1

      const { data, error, count } = await query.order('createdAt', { ascending: false }).range(from, to)

      console.log('Orders query result:', data?.length)
      console.log('Orders query error:', error)

      if (error) {
        console.error('Orders query error:', error)
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Fetch order items separately for each order
      const ordersWithItems = await Promise.all((data || []).map(async (o) => {
        // Try to get items from OrderItem table
        const { data: items } = await supabase
          .from('OrderItem')
          .select('id, orderId, productId, productName, size, quantity, unitPrice, offerPercentage, productImage, productColor')
          .eq('orderId', o.id)
        
        return {
          ...o,
          items: items || []
        }
      }))

      const orders = ordersWithItems.map(o => ({
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
          productImage: normalizeStorageUrl(item.productImage as string | null),
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
            productImage: normalizeStorageUrl(item.productImage as string | null),
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

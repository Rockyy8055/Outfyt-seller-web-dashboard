import { supabase } from '@/lib/supabase'
import { Order, OrderStatus, OrderListResponse, ApiResponse } from '@/types'

export const orderApi = {
  getOrders: async (params: { page?: number; limit?: number; status?: string; search?: string }): Promise<OrderListResponse> => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
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
      
      if (storeError || !storeId) {
        const result = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', authUser.id)
          .single()
        storeId = result.data?.id || null
      }

      if (!storeId) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Query orders from orders table (snake_case)
      let query = supabase
        .from('orders')
        .select('id, order_number, status, total_amount, payment_method, payment_status, created_at, customer_name, customer_phone, delivery_address, delivery_lat, delivery_lng, otp_code', { count: 'exact' })
        .eq('store_id', storeId)

      if (params.status) query = query.eq('status', params.status)
      if (params.search) query = query.ilike('order_number', `%${params.search}%`)

      const from = ((params.page || 1) - 1) * (params.limit || 10)
      const to = from + (params.limit || 10) - 1

      const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to)

      if (error || !data) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Get order items for each order
      const ordersWithItems = await Promise.all(data.map(async (o) => {
        const itemsResult = await supabase
          .from('order_items')
          .select('id, product_id, product_name, size, quantity, unit_price, offer_percentage, product_image, product_color')
          .eq('order_id', o.id)

        const items = itemsResult.data?.map(item => ({
          id: item.id,
          orderId: o.id,
          productId: item.product_id,
          productName: item.product_name,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          offerPercentage: item.offer_percentage,
          productImage: item.product_image,
          productColor: item.product_color,
        })) || []

        return {
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          totalAmount: o.total_amount,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          createdAt: o.created_at,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          deliveryAddress: o.delivery_address,
          deliveryLat: o.delivery_lat,
          deliveryLng: o.delivery_lng,
          otpCode: o.otp_code,
          items,
        } as Order
      }))

      return {
        success: true,
        data: ordersWithItems,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / (params.limit || 10)),
        },
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
    }
  },

  getOrder: async (id: string): Promise<ApiResponse<Order>> => {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !order) {
        return { success: false, message: error?.message || 'Order not found' }
      }

      // Get order items
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id)

      return {
        success: true,
        data: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          totalAmount: order.total_amount,
          paymentMethod: order.payment_method,
          paymentStatus: order.payment_status,
          createdAt: order.created_at,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          deliveryAddress: order.delivery_address,
          deliveryLat: order.delivery_lat,
          deliveryLng: order.delivery_lng,
          otpCode: order.otp_code,
          storeId: order.store_id,
          userId: order.customer_id,
          items: items?.map(item => ({
            id: item.id,
            orderId: item.order_id,
            productId: item.product_id,
            productName: item.product_name,
            size: item.size,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            offerPercentage: item.offer_percentage,
            productImage: item.product_image,
            productColor: item.product_color,
          })) || [],
        } as Order,
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to get order' }
    }
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<ApiResponse<Order>> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
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

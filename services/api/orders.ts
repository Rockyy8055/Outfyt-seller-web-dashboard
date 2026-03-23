import { supabase } from '@/lib/supabase'
import { Order, OrderStatus, OrderListResponse, ApiResponse } from '@/types'

// Get user ID from phone number (User table in public schema)
async function getUserIdByPhone(phone: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('User')
    .select('id')
    .eq('phone', phone)
    .single()
  
  if (error) {
    const result = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single()
    return result.data?.id || null
  }
  
  return data?.id || null
}

// Get store by owner ID
async function getStoreByOwnerId(ownerId: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('Store')
    .select('id')
    .eq('ownerId', ownerId)
    .single()
  
  if (error) {
    const result = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', ownerId)
      .single()
    return result.data ? { id: result.data.id } : null
  }
  
  return data ? { id: data.id } : null
}

export const orderApi = {
  getOrders: async (params: { page?: number; limit?: number; status?: string; search?: string }): Promise<OrderListResponse> => {
    try {
      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      const phone = authUser.phone
      if (!phone) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Find user in User table by phone
      const userId = await getUserIdByPhone(phone)
      if (!userId) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Get store by owner ID
      const store = await getStoreByOwnerId(userId)
      if (!store) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Query orders
      let query = supabase
        .from('Order')
        .select('id, orderNumber, status, totalAmount, paymentMethod, paymentStatus, createdAt, customerName, customerPhone, deliveryAddress, deliveryLat, deliveryLng, otpCode', { count: 'exact' })
        .eq('storeId', store.id)

      if (params.status) query = query.eq('status', params.status)
      if (params.search) query = query.ilike('orderNumber', `%${params.search}%`)

      const from = ((params.page || 1) - 1) * (params.limit || 10)
      const to = from + (params.limit || 10) - 1

      let { data, error, count } = await query.order('createdAt', { ascending: false }).range(from, to)

      // Fallback to snake_case table if error
      if (error) {
        const result = await supabase
          .from('orders')
          .select('id, order_number, status, total_amount, payment_method, payment_status, created_at, customer_name, customer_phone, delivery_address, delivery_lat, delivery_lng, otp_code', { count: 'exact' })
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .range(from, to)
        
        if (result.data) {
          data = result.data.map(o => ({
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
          }))
        }
        error = result.error
        count = result.count
      }

      if (error || !data) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Get order items for each order
      const ordersWithItems = await Promise.all(data.map(async (o) => {
        const itemsResult = await supabase
          .from('OrderItem')
          .select('id, productId, productName, size, quantity, unitPrice, offerPercentage, productImage, productColor')
          .eq('orderId', o.id)

        let items = itemsResult.data || []

        if (itemsResult.error) {
          const fallbackResult = await supabase
            .from('order_items')
            .select('id, product_id, product_name, size, quantity, unit_price, offer_percentage, product_image, product_color')
            .eq('order_id', o.id)
          
          if (fallbackResult.data) {
            items = fallbackResult.data.map(item => ({
              id: item.id,
              productId: item.product_id,
              productName: item.product_name,
              size: item.size,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              offerPercentage: item.offer_percentage,
              productImage: item.product_image,
              productColor: item.product_color,
            }))
          }
        }

        return {
          ...o,
          items: items,
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
      let { data: order, error } = await supabase
        .from('Order')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        const result = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single()
        
        if (result.data) {
          order = {
            id: result.data.id,
            orderNumber: result.data.order_number,
            status: result.data.status,
            totalAmount: result.data.total_amount,
            paymentMethod: result.data.payment_method,
            paymentStatus: result.data.payment_status,
            createdAt: result.data.created_at,
            customerName: result.data.customer_name,
            customerPhone: result.data.customer_phone,
            deliveryAddress: result.data.delivery_address,
            deliveryLat: result.data.delivery_lat,
            deliveryLng: result.data.delivery_lng,
            otpCode: result.data.otp_code,
            storeId: result.data.store_id,
            userId: result.data.user_id,
            riderId: result.data.rider_id,
          }
        }
        error = result.error
      }

      if (error || !order) {
        return { success: false, message: error?.message || 'Order not found' }
      }

      // Get order items
      let { data: items } = await supabase
        .from('OrderItem')
        .select('*')
        .eq('orderId', id)

      if (!items) {
        const itemsResult = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', id)
        
        if (itemsResult.data) {
          items = itemsResult.data.map(item => ({
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
          }))
        }
      }

      return {
        success: true,
        data: {
          ...order,
          items: items || [],
        } as Order,
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to get order' }
    }
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<ApiResponse<Order>> => {
    try {
      let { data, error } = await supabase
        .from('Order')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        const result = await supabase
          .from('orders')
          .update({ status })
          .eq('id', id)
          .select()
          .single()
        
        if (result.data) {
          data = {
            ...result.data,
            orderNumber: result.data.order_number,
            totalAmount: result.data.total_amount,
            paymentMethod: result.data.payment_method,
            paymentStatus: result.data.payment_status,
            createdAt: result.data.created_at,
            storeId: result.data.store_id,
          }
        }
        error = result.error
      }

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, data: data as Order }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update order' }
    }
  },
}

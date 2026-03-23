import { supabase } from '@/lib/supabase'
import { DashboardStats, Order } from '@/types'

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

export const dashboardApi = {
  getStats: async (): Promise<{ success: boolean; data?: DashboardStats; message?: string }> => {
    try {
      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return { success: false, message: 'Not authenticated' }
      }

      const phone = authUser.phone
      if (!phone) {
        return { success: false, message: 'No phone number found' }
      }

      // Find user in User table by phone
      const userId = await getUserIdByPhone(phone)
      if (!userId) {
        return { success: false, message: 'User not found in database' }
      }

      // Get store by owner ID
      const store = await getStoreByOwnerId(userId)
      if (!store) {
        return { success: false, message: 'No store found for this user' }
      }

      // Get total products count
      let productsCount = 0
      const { count, error: productsError } = await supabase
        .from('Product')
        .select('id', { count: 'exact', head: true })
        .eq('storeId', store.id)
      
      if (!productsError && count !== null) {
        productsCount = count
      } else {
        // Try lowercase table
        const result = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
        if (!result.error && result.count !== null) {
          productsCount = result.count
        }
      }

      // Get orders count and stats
      let totalOrders = 0
      let pendingOrders = 0
      let totalRevenue = 0
      let recentOrders: Order[] = []

      const { data: orders, error: ordersError } = await supabase
        .from('Order')
        .select('id, status, totalAmount, createdAt, orderNumber')
        .eq('storeId', store.id)
        .order('createdAt', { ascending: false })
        .limit(5)

      if (!ordersError && orders) {
        totalOrders = orders.length
        pendingOrders = orders.filter(o => o.status === 'PENDING').length
        totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
        recentOrders = orders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: o.totalAmount,
          createdAt: o.createdAt,
        })) as Order[]
      } else {
        // Try lowercase table
        const result = await supabase
          .from('orders')
          .select('id, status, total_amount, created_at, order_number')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!result.error && result.data) {
          totalOrders = result.data.length
          pendingOrders = result.data.filter(o => o.status === 'PENDING').length
          totalRevenue = result.data.reduce((sum, o) => sum + (o.total_amount || 0), 0)
          recentOrders = result.data.map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            status: o.status,
            totalAmount: o.total_amount,
            createdAt: o.created_at,
          })) as Order[]
        }
      }

      // Get total orders count
      const { count: orderCount } = await supabase
        .from('Order')
        .select('id', { count: 'exact', head: true })
        .eq('storeId', store.id)
      
      if (orderCount !== null) {
        totalOrders = orderCount
      } else {
        const result = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
        if (result.count !== null) {
          totalOrders = result.count
        }
      }

      // Get pending orders count
      const { count: pendingCount } = await supabase
        .from('Order')
        .select('id', { count: 'exact', head: true })
        .eq('storeId', store.id)
        .eq('status', 'PENDING')
      
      if (pendingCount !== null) {
        pendingOrders = pendingCount
      } else {
        const result = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('status', 'PENDING')
        if (result.count !== null) {
          pendingOrders = result.count
        }
      }

      return {
        success: true,
        data: {
          totalProducts: productsCount,
          totalOrders,
          totalRevenue,
          pendingOrders,
          recentOrders,
        },
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return { success: false, message: 'Failed to fetch dashboard stats' }
    }
  },
}

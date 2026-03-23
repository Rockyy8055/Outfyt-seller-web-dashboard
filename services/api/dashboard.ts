import { supabase } from '@/lib/supabase'
import { DashboardStats, Order } from '@/types'

export const dashboardApi = {
  getStats: async (): Promise<{ success: boolean; data?: DashboardStats; message?: string }> => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return { success: false, message: 'Not authenticated' }
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
        return { success: false, message: 'No store found' }
      }

      // Get products count
      let productsCount = 0
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
      
      if (count !== null) productsCount = count

      // Get orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, order_number')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(5)

      let totalOrders = 0
      let pendingOrders = 0
      let totalRevenue = 0
      let recentOrders: Order[] = []

      if (!ordersError && orders) {
        totalOrders = orders.length
        pendingOrders = orders.filter(o => o.status === 'PENDING').length
        totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        recentOrders = orders.map(o => ({
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          totalAmount: o.total_amount,
          createdAt: o.created_at,
        })) as Order[]
      }

      // Get total orders count
      const { count: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
      
      if (orderCount !== null) totalOrders = orderCount

      // Get pending orders count
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('status', 'PENDING')
      
      if (pendingCount !== null) pendingOrders = pendingCount

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

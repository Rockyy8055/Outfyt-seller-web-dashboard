import { supabase } from '@/lib/supabase'
import { Store, StoreUpdateData, ApiResponse } from '@/types'

export const storeApi = {
  getStore: async (): Promise<{ success: boolean; data?: Store; message?: string }> => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return { success: false, message: 'Not authenticated' }
      }

      // Get store by owner ID (auth user ID) - mobile app uses this approach
      const { data: store, error } = await supabase
        .from('Store')
        .select('*')
        .eq('ownerId', authUser.id)
        .single()

      if (error || !store) {
        // Try stores table
        const result = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', authUser.id)
          .single()
        
        if (result.error || !result.data) {
          return { success: false, message: 'No store found' }
        }
        
        return {
          success: true,
          data: {
            id: result.data.id,
            name: result.data.name,
            ownerId: result.data.owner_id,
            phone: result.data.phone,
            gstNumber: result.data.gst_number,
            address: result.data.address,
            latitude: result.data.latitude,
            longitude: result.data.longitude,
            isApproved: result.data.is_approved ?? true,
            isDisabled: result.data.is_disabled ?? false,
            status: result.data.is_disabled ? 'INACTIVE' : 'ACTIVE',
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
          } as Store
        }
      }

      return {
        success: true,
        data: {
          id: store.id,
          name: store.name,
          ownerId: store.ownerId,
          phone: store.phone,
          gstNumber: store.gstNumber,
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
          isApproved: store.isApproved ?? true,
          isDisabled: store.isDisabled ?? false,
          status: store.isDisabled ? 'INACTIVE' : 'ACTIVE',
          createdAt: store.createdAt,
          updatedAt: store.updatedAt,
        } as Store
      }
    } catch (err) {
      console.error('Error fetching store:', err)
      return { success: false, message: err instanceof Error ? err.message : 'Failed to get store' }
    }
  },

  updateStore: async (updateData: StoreUpdateData): Promise<ApiResponse<Store>> => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return { success: false, message: 'Not authenticated' }

      // Get store
      const { data: store } = await supabase
        .from('Store')
        .select('id')
        .eq('ownerId', authUser.id)
        .single()

      let storeId = store?.id || null
      
      if (!storeId) {
        const result = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', authUser.id)
          .single()
        storeId = result.data?.id || null
      }

      if (!storeId) return { success: false, message: 'No store found' }

      // Update store
      const { data, error } = await supabase
        .from('Store')
        .update({
          name: updateData.name,
          phone: updateData.phone,
          gstNumber: updateData.gstNumber,
          address: updateData.address,
          latitude: updateData.latitude,
          longitude: updateData.longitude,
        })
        .eq('id', storeId)
        .select()
        .single()

      if (error) {
        const result = await supabase
          .from('stores')
          .update({
            name: updateData.name,
            phone: updateData.phone,
            gst_number: updateData.gstNumber,
            address: updateData.address,
            latitude: updateData.latitude,
            longitude: updateData.longitude,
          })
          .eq('id', storeId)
          .select()
          .single()

        if (result.error) {
          return { success: false, message: result.error.message }
        }

        return {
          success: true,
          data: {
            id: result.data.id,
            name: result.data.name,
            ownerId: result.data.owner_id,
            phone: result.data.phone,
            gstNumber: result.data.gst_number,
            address: result.data.address,
            latitude: result.data.latitude,
            longitude: result.data.longitude,
            isApproved: result.data.is_approved ?? true,
            isDisabled: result.data.is_disabled ?? false,
            status: result.data.is_disabled ? 'INACTIVE' : 'ACTIVE',
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
          } as Store
        }
      }

      return {
        success: true,
        data: {
          ...data,
          status: data.isDisabled ? 'INACTIVE' : 'ACTIVE'
        } as Store
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update store' }
    }
  },
}

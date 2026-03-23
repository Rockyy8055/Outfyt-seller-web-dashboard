import { supabase } from '@/lib/supabase'
import { Store, StoreUpdateData, ApiResponse } from '@/types'

// Get user ID from phone number (User table in public schema)
async function getUserIdByPhone(phone: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('User')
    .select('id')
    .eq('phone', phone)
    .single()
  
  if (error) {
    // Try lowercase table name
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
async function getStoreByOwnerId(ownerId: string) {
  const { data, error } = await supabase
    .from('Store')
    .select('*')
    .eq('ownerId', ownerId)
    .single()
  
  if (error) {
    // Try lowercase table name
    const result = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', ownerId)
      .single()
    return { data: result.data, error: result.error }
  }
  
  return { data, error }
}

export const storeApi = {
  getStore: async (): Promise<{ success: boolean; data?: Store; message?: string }> => {
    try {
      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return { success: false, message: 'Not authenticated' }
      }

      // Get phone from auth user
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
      const { data: store, error } = await getStoreByOwnerId(userId)
      
      if (error || !store) {
        return { success: false, message: 'No store found for this user' }
      }

      return { 
        success: true, 
        data: {
          id: store.id,
          name: store.name,
          ownerId: store.ownerId || store.owner_id,
          phone: store.phone,
          gstNumber: store.gstNumber || store.gst_number,
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
          isApproved: store.isApproved ?? store.is_approved ?? true,
          isDisabled: store.isDisabled ?? store.is_disabled ?? false,
          status: (store.isDisabled || store.is_disabled) ? 'INACTIVE' : 'ACTIVE',
          createdAt: store.createdAt || store.created_at,
          updatedAt: store.updatedAt || store.updated_at,
        } as Store 
      }
    } catch (error: unknown) {
      console.error('Error fetching store:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Failed to get store' }
    }
  },

  updateStore: async (updateData: StoreUpdateData): Promise<ApiResponse<Store>> => {
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

      // Get store
      const { data: store } = await getStoreByOwnerId(userId)
      if (!store) {
        return { success: false, message: 'No store found' }
      }

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
        .eq('id', store.id)
        .select()
        .single()

      if (error) {
        // Try lowercase table
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
          .eq('id', store.id)
          .select()
          .single()
        
        if (result.error) {
          return { success: false, message: result.error.message }
        }
        return { success: true, data: result.data as Store }
      }

      return { 
        success: true, 
        data: {
          ...data,
          status: data.isDisabled ? 'INACTIVE' : 'ACTIVE'
        } as Store 
      }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : 'Failed to update store' }
    }
  },
}

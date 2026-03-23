import { supabase } from '@/lib/supabase'
import { Product, ProductFormData, ProductListResponse, BulkUploadResult, PaginationParams, ApiResponse } from '@/types'

// Get user ID from phone number (User table in public schema)
async function getUserIdByPhone(phone: string): Promise<string | null> {
  // Try User table first
  const { data, error } = await supabase
    .from('User')
    .select('id')
    .eq('phone', phone)
    .single()
  
  if (data?.id) return data.id
  
  console.log('User table error, trying users:', error)
  
  // Try lowercase table name
  const result = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single()
  
  return result.data?.id || null
}

// Get store by owner ID - try both table names
async function getStoreByOwnerId(ownerId: string): Promise<{ id: string; name: string } | null> {
  // Try Store table first
  const { data, error } = await supabase
    .from('Store')
    .select('id, name')
    .eq('ownerId', ownerId)
    .single()
  
  if (data?.id) return { id: data.id, name: data.name }
  
  console.log('Store table error, trying stores:', error)
  
  // Try lowercase table name
  const result = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', ownerId)
    .single()
  
  return result.data ? { id: result.data.id, name: result.data.name } : null
}

export const productApi = {
  getProducts: async (params: PaginationParams): Promise<ProductListResponse> => {
    try {
      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      console.log('Auth user:', authUser?.phone, authError)
      
      if (authError || !authUser) {
        console.error('Auth error:', authError)
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      const phone = authUser.phone
      if (!phone) {
        console.error('No phone in auth user')
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Find user in User table by phone
      const userId = await getUserIdByPhone(phone)
      console.log('User ID from phone:', userId)
      
      if (!userId) {
        console.error('User not found in database for phone:', phone)
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Get store by owner ID
      const store = await getStoreByOwnerId(userId)
      console.log('Store for user:', store)
      
      if (!store) {
        console.error('No store found for user:', userId)
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Query products from 'products' table (snake_case - used by mobile app)
      const { data, error, count } = await supabase
        .from('products')
        .select('id, store_id, name, category, price, images, color, status, created_at, updated_at, stock_count', { count: 'exact' })
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })

      console.log('Products query result:', { data: data?.length, error, count })
      
      if (error) {
        console.error('Error fetching from products table:', error)
        
        // Try Product table as fallback
        const result = await supabase
          .from('Product')
          .select('id, storeId, name, category, price, images, color, status, createdAt, updatedAt', { count: 'exact' })
          .eq('storeId', store.id)
          .order('createdAt', { ascending: false })
        
        if (result.error) {
          console.error('Error from Product table too:', result.error)
          return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
        }
        
        const from = ((params.page || 1) - 1) * (params.limit || 10)
        const to = from + (params.limit || 10) - 1
        const paginatedData = result.data?.slice(from, to + 1) || []
        
        return {
          success: true,
          data: paginatedData.map(p => ({
            id: p.id,
            storeId: p.storeId,
            name: p.name,
            category: p.category,
            price: p.price,
            images: p.images || [],
            color: p.color,
            status: p.status,
            stock: 0,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })) as Product[],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 10,
            total: result.count || 0,
            totalPages: Math.ceil((result.count || 0) / (params.limit || 10)),
          },
        }
      }

      // Filter by search/category if provided
      let filteredData = data || []
      if (params.search) {
        filteredData = filteredData.filter(p => p.name?.toLowerCase().includes(params.search!.toLowerCase()))
      }
      if (params.category) {
        filteredData = filteredData.filter(p => p.category === params.category)
      }

      const from = ((params.page || 1) - 1) * (params.limit || 10)
      const to = from + (params.limit || 10) - 1
      const paginatedData = filteredData.slice(from, to + 1)

      return {
        success: true,
        data: paginatedData.map(p => ({
          id: p.id,
          storeId: p.store_id,
          name: p.name,
          category: p.category,
          price: p.price,
          images: p.images || [],
          color: p.color,
          status: p.status,
          stock: p.stock_count || 0,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })) as Product[],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: count || filteredData.length,
          totalPages: Math.ceil((count || filteredData.length) / (params.limit || 10)),
        },
      }
    } catch (err) {
      console.error('Exception in getProducts:', err)
      return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
    }
  },

  getProduct: async (id: string): Promise<ApiResponse<Product & { sizes: { size: string; stock: number }[] }>> => {
    try {
      // Try products table first
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error from products table:', error)
        return { success: false, message: error.message }
      }

      return {
        success: true,
        data: {
          id: product.id,
          storeId: product.store_id,
          name: product.name,
          category: product.category,
          price: product.price,
          images: product.images || [],
          color: product.color,
          status: product.status,
          stock: product.stock_count || 0,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
          sizes: [],
        } as Product & { sizes: { size: string; stock: number }[] }
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to get product' }
    }
  },

  createProduct: async (productData: ProductFormData): Promise<ApiResponse<Product>> => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) return { success: false, message: 'Not authenticated' }

      const phone = authUser.phone
      if (!phone) return { success: false, message: 'No phone number found' }

      const userId = await getUserIdByPhone(phone)
      if (!userId) return { success: false, message: 'User not found in database' }

      const store = await getStoreByOwnerId(userId)
      if (!store) return { success: false, message: 'No store associated with user' }

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          price: productData.price,
          category: productData.category,
          color: productData.colors?.[0] || null,
          images: productData.images,
          store_id: store.id,
          status: 'ACTIVE',
          stock_count: productData.stock || 0,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating product:', error)
        return { success: false, message: error.message }
      }

      return {
        success: true,
        data: {
          id: data.id,
          storeId: data.store_id,
          name: data.name,
          category: data.category,
          price: data.price,
          images: data.images || [],
          color: data.color,
          status: data.status,
          stock: data.stock_count || 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        } as Product
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to create product' }
    }
  },

  updateProduct: async (id: string, productData: Partial<ProductFormData>): Promise<ApiResponse<Product>> => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (productData.name) updateData.name = productData.name
      if (productData.price !== undefined) updateData.price = productData.price
      if (productData.category) updateData.category = productData.category
      if (productData.colors) updateData.color = productData.colors[0]
      if (productData.images) updateData.images = productData.images
      if (productData.stock !== undefined) updateData.stock_count = productData.stock

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { success: false, message: error.message }
      }

      return {
        success: true,
        data: {
          id: data.id,
          storeId: data.store_id,
          name: data.name,
          category: data.category,
          price: data.price,
          images: data.images || [],
          color: data.color,
          status: data.status,
          stock: data.stock_count || 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        } as Product
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update product' }
    }
  },

  deleteProduct: async (id: string): Promise<ApiResponse> => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) return { success: false, message: error.message }
      return { success: true }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to delete product' }
    }
  },

  bulkUpload: async (formData: FormData): Promise<BulkUploadResult> => {
    const file = formData.get('file') as File
    if (!file) return { successCount: 0, failed: [{ row: 0, error: 'No file provided' }] }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) return { successCount: 0, failed: [{ row: 0, error: 'Not authenticated' }] }

      const phone = authUser.phone
      if (!phone) return { successCount: 0, failed: [{ row: 0, error: 'No phone number found' }] }

      const userId = await getUserIdByPhone(phone)
      if (!userId) return { successCount: 0, failed: [{ row: 0, error: 'User not found in database' }] }

      const store = await getStoreByOwnerId(userId)
      if (!store) return { successCount: 0, failed: [{ row: 0, error: 'No store associated' }] }

      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) return { successCount: 0, failed: [{ row: 0, error: 'Empty or invalid CSV' }] }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const failed: { row: number; error: string }[] = []
      let successCount = 0

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',')
        const product: Record<string, unknown> = {}

        headers.forEach((header, index) => {
          const value = values[index]?.trim() || ''
          if (header === 'price') product[header] = parseFloat(value) || 0
          else if (header === 'stock' || header === 'stock_count') product['stock_count'] = parseInt(value) || 0
          else if (header === 'image_url' && value) product['images'] = [value]
          else product[header] = value
        })

        if (!product['name']) {
          failed.push({ row: i + 1, error: 'Missing product name' })
          continue
        }

        const { error } = await supabase.from('products').insert({
          name: product['name'] as string,
          price: (product['price'] as number) || 0,
          category: (product['category'] as string) || null,
          images: (product['images'] as string[]) || [],
          store_id: store.id,
          status: 'ACTIVE',
          stock_count: (product['stock_count'] as number) || 0,
        })

        if (error) {
          failed.push({ row: i + 1, error: error.message })
        } else {
          successCount++
        }
      }

      return { successCount, failed }
    } catch (err) {
      return { successCount: 0, failed: [{ row: 0, error: err instanceof Error ? err.message : 'Upload failed' }] }
    }
  },

  getCategories: async (): Promise<ApiResponse<string[]>> => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) return { success: false, message: 'Not authenticated' }

      const phone = authUser.phone
      if (!phone) return { success: false, message: 'No phone number found' }

      const userId = await getUserIdByPhone(phone)
      if (!userId) return { success: false, message: 'User not found in database' }

      const store = await getStoreByOwnerId(userId)
      if (!store) return { success: false, message: 'No store associated' }

      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('store_id', store.id)

      if (error) return { success: false, message: error.message }

      const categories = Array.from(new Set((data || []).map(p => p.category).filter(Boolean))) as string[]
      return { success: true, data: categories }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to get categories' }
    }
  },
}

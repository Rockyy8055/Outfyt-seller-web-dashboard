import { supabase } from '@/lib/supabase'
import { Product, ProductFormData, ProductListResponse, BulkUploadResult, PaginationParams, ApiResponse } from '@/types'

function normalizeStorageUrl(url: string): string {
  if (!url) return url
  if (url.includes('/storage/v1/object/public/')) return url
  if (url.includes('/storage/v1/object/')) {
    return url.replace('/storage/v1/object/', '/storage/v1/object/public/')
  }
  return url
}

function normalizeStorageUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return []
  return (urls as unknown[]).filter((u): u is string => typeof u === 'string').map(normalizeStorageUrl)
}

export const productApi = {
  getProducts: async (params: PaginationParams): Promise<ProductListResponse> => {
    try {
      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      console.log('=== PRODUCTS DEBUG ===')
      console.log('Auth User ID:', authUser?.id)
      console.log('Auth User Phone:', authUser?.phone)
      console.log('Auth Error:', authError)
      
      if (authError || !authUser) {
        return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
      }

      // Get store by owner ID (auth user ID) - mobile app uses Store table with ownerId = auth user id
      const { data: store, error: storeError } = await supabase
        .from('Store')
        .select('id, name, ownerId')
        .eq('ownerId', authUser.id)
        .single()
      
      console.log('Store query result:', store)
      console.log('Store query error:', storeError)
      
      let storeId = store?.id || null
      
      // Fallback to stores table
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

      console.log('Store ID found:', storeId)

      // Query products - use select * to get all available columns
      const { data: allProducts, error: allError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
      
      console.log('All products query result:', allProducts)
      console.log('All products query error:', allError)
      
      if (allError || !allProducts) {
        console.log('Products table failed, trying Product table')
        // Try Product table
        const { data: productData, error: productError } = await supabase
          .from('Product')
          .select('*')
          .eq('storeId', storeId)
        
        console.log('Product table result:', productData)
        console.log('Product table error:', productError)
        
        if (productError || !productData) {
          return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
        }
        
        const products = productData.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          storeId: p.storeId as string,
          name: p.name as string,
          category: p.category as string | null,
          price: p.price as number,
          images: ((p.images as string[]) || []).map(normalizeStorageUrl),
          color: (p.color as string) || null,
          status: (p.status as string) || 'ACTIVE',
          stock: 0,
          createdAt: p.createdAt as string,
          updatedAt: p.updatedAt as string,
        })) as Product[]
        
        return {
          success: true,
          data: products,
          pagination: {
            page: params.page || 1,
            limit: params.limit || 10,
            total: products.length,
            totalPages: Math.ceil(products.length / (params.limit || 10)),
          },
        }
      }
      
      const data = allProducts
      const count = data?.length || 0
      
      console.log('Products found:', count)

      // Filter by search/category if provided
      let filteredProducts = data || []
      if (params.search) {
        filteredProducts = filteredProducts.filter(p => 
          p.name?.toLowerCase().includes(params.search!.toLowerCase())
        )
      }
      if (params.category) {
        filteredProducts = filteredProducts.filter(p => p.category === params.category)
      }

      const from = ((params.page || 1) - 1) * (params.limit || 10)
      const to = from + (params.limit || 10)
      const paginatedProducts = filteredProducts.slice(from, to)

      return {
        success: true,
        data: paginatedProducts.map(p => ({
          id: p.id,
          storeId: p.store_id,
          name: p.name,
          category: p.category,
          price: p.price,
          images: (p.images || []).map(normalizeStorageUrl),
          color: p.color,
          status: p.status,
          stock: p.stock_count || 0,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })) as Product[],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: count || filteredProducts.length,
          totalPages: Math.ceil((count || filteredProducts.length) / (params.limit || 10)),
        },
      }
    } catch (err) {
      console.error('Exception in getProducts:', err)
      return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
    }
  },

  getProduct: async (id: string): Promise<ApiResponse<Product & { sizes: { size: string; stock: number }[] }>> => {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !product) {
        return { success: false, message: error?.message || 'Product not found' }
      }

      return {
        success: true,
        data: {
          id: product.id,
          storeId: product.store_id,
          name: product.name,
          category: product.category,
          price: product.price,
          images: normalizeStorageUrls(product.images),
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
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return { success: false, message: 'Not authenticated' }

      // Get store by owner ID (auth user ID)
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

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          price: productData.price,
          category: productData.category,
          color: productData.colors?.[0] || null,
          images: productData.images,
          store_id: storeId,
          status: 'ACTIVE',
          stock_count: productData.stock || 0,
        })
        .select()
        .single()

      if (error) return { success: false, message: error.message }

      return {
        success: true,
        data: {
          id: data.id,
          storeId: data.store_id,
          name: data.name,
          category: data.category,
          price: data.price,
          images: normalizeStorageUrls(data.images),
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

      if (error) return { success: false, message: error.message }

      return {
        success: true,
        data: {
          id: data.id,
          storeId: data.store_id,
          name: data.name,
          category: data.category,
          price: data.price,
          images: normalizeStorageUrls(data.images),
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
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return { successCount: 0, failed: [{ row: 0, error: 'Not authenticated' }] }

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

      if (!storeId) return { successCount: 0, failed: [{ row: 0, error: 'No store found' }] }

      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) return { successCount: 0, failed: [{ row: 0, error: 'Empty CSV' }] }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const failed: { row: number; error: string }[] = []
      let successCount = 0

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',')
        const product: Record<string, unknown> = {}

        headers.forEach((header, index) => {
          const value = values[index]?.trim() || ''
          if (header === 'price') product[header] = parseFloat(value) || 0
          else if (header === 'stock_count' || header === 'stock') product['stock_count'] = parseInt(value) || 0
          else if (header === 'image_url' && value) product['images'] = [value]
          else product[header] = value
        })

        if (!product['name']) {
          failed.push({ row: i + 1, error: 'Missing name' })
          continue
        }

        const { error } = await supabase.from('products').insert({
          name: product['name'] as string,
          price: (product['price'] as number) || 0,
          category: (product['category'] as string) || null,
          images: (product['images'] as string[]) || [],
          store_id: storeId,
          status: 'ACTIVE',
          stock_count: (product['stock_count'] as number) || 0,
        })

        if (error) failed.push({ row: i + 1, error: error.message })
        else successCount++
      }

      return { successCount, failed }
    } catch (err) {
      return { successCount: 0, failed: [{ row: 0, error: err instanceof Error ? err.message : 'Upload failed' }] }
    }
  },

  getCategories: async (): Promise<ApiResponse<string[]>> => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return { success: false, message: 'Not authenticated' }

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

      const { data, error } = await supabase.from('products').select('category').eq('store_id', storeId)
      if (error) return { success: false, message: error.message }

      const categories = Array.from(new Set((data || []).map(p => p.category).filter(Boolean))) as string[]
      return { success: true, data: categories }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to get categories' }
    }
  },
}

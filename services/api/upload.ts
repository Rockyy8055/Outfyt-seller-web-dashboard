import { supabase } from '@/lib/supabase'

export interface UploadResponse {
  success: boolean
  url: string
  publicId?: string
  message?: string
}

export const uploadApi = {
  uploadImage: async (file: File): Promise<UploadResponse> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `products/${fileName}`

      // Use product-images bucket (same as mobile app)
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return { success: false, url: '', message: uploadError.message }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      console.log('Uploaded image URL:', publicUrl)

      return {
        success: true,
        url: publicUrl,
        publicId: filePath,
      }
    } catch (error: unknown) {
      console.error('Upload exception:', error)
      return { 
        success: false, 
        url: '', 
        message: error instanceof Error ? error.message : 'Failed to upload image' 
      }
    }
  },

  uploadMultiple: async (files: File[]): Promise<UploadResponse[]> => {
    const results: UploadResponse[] = []

    for (const file of files) {
      const result = await uploadApi.uploadImage(file)
      results.push(result)
    }

    return results
  },
}

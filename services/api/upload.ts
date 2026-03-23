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

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) {
        return { success: false, url: '', message: uploadError.message }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return {
        success: true,
        url: publicUrl,
        publicId: filePath,
      }
    } catch (error: unknown) {
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

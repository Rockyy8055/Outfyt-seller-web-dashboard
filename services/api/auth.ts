import { supabase } from '@/lib/supabase'
import { User } from '@/types'

export interface AuthResponse {
  success: boolean
  message?: string
  token?: string
  user?: User
  tempToken?: string
}

export const authApi = {
  // Send OTP to phone number
  async sendOtp(phone: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms',
        },
      })

      if (error) {
        return {
          success: false,
          message: error.message,
        }
      }

      return {
        success: true,
        tempToken: (data as unknown as { session?: { access_token: string } })?.session?.access_token,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP'
      return {
        success: false,
        message: errorMessage,
      }
    }
  },

  // Verify OTP
  async verifyOtp(phone: string, otp: string, tempToken?: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      })

      if (error) {
        return {
          success: false,
          message: error.message,
        }
      }

      const user: User = {
        id: data.user?.id || '',
        phone: data.user?.phone || phone,
        email: data.user?.email,
        name: data.user?.user_metadata?.name,
        storeId: data.user?.user_metadata?.store_id,
        role: 'seller',
        createdAt: data.user?.created_at || new Date().toISOString(),
      }

      return {
        success: true,
        token: data.session?.access_token,
        user,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP'
      return {
        success: false,
        message: errorMessage,
      }
    }
  },

  // Logout
  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  // Get current user
  async getProfile(): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return {
          success: false,
          message: 'Not authenticated',
        }
      }

      return {
        success: true,
        user: {
          id: user.id,
          phone: user.phone || '',
          email: user.email,
          name: user.user_metadata?.name,
          storeId: user.user_metadata?.store_id,
          role: 'seller',
          createdAt: user.created_at || new Date().toISOString(),
        },
      }
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get profile',
      }
    }
  },

  // Get current session
  getSession() {
    return supabase.auth.getSession()
  },

  // Subscribe to auth changes
  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },
}

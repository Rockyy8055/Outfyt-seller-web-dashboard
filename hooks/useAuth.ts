import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  tempToken: string | null
  phone: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setTempToken: (tempToken: string | null) => void
  setPhone: (phone: string | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      tempToken: null,
      phone: null,
      isAuthenticated: false,
      isLoading: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => {
        if (typeof window !== 'undefined') {
          if (token) {
            localStorage.setItem('token', token)
          } else {
            localStorage.removeItem('token')
          }
        }
        set({ token, isAuthenticated: !!token })
      },
      setTempToken: (tempToken) => set({ tempToken }),
      setPhone: (phone) => set({ phone }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
        set({ 
          user: null, 
          token: null, 
          tempToken: null, 
          phone: null, 
          isAuthenticated: false 
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

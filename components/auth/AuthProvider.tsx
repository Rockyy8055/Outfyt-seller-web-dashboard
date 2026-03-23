'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/hooks/useAuth'
import { authApi } from '@/services/api/auth'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

interface AuthContextType {
  isLoading: boolean
  isAuthenticated: boolean
  user: User | null
  token: string | null
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  token: null,
})

export const useAuth = () => useContext(AuthContext)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, token, isAuthenticated, setUser, setToken, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing Supabase session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
        }

        if (session?.user) {
          // User is authenticated via Supabase
          const userData = {
            id: session.user.id,
            phone: session.user.phone || '',
            email: session.user.email,
            name: session.user.user_metadata?.name,
            storeId: session.user.user_metadata?.store_id,
            role: 'seller' as const,
            createdAt: session.user.created_at,
          }
          
          setUser(userData)
          setToken(session.access_token)
        } else if (isAuthenticated && token) {
          // Fallback: verify stored token with backend
          try {
            const response = await authApi.getProfile()
            if (response.success && response.user) {
              setUser(response.user)
            } else {
              // Token is invalid, clear auth
              logout()
            }
          } catch {
            // Token verification failed
            logout()
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setInitialized(true)
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = {
            id: session.user.id,
            phone: session.user.phone || '',
            email: session.user.email,
            name: session.user.user_metadata?.name,
            storeId: session.user.user_metadata?.store_id,
            role: 'seller' as const,
            createdAt: session.user.created_at,
          }
          setUser(userData)
          setToken(session.access_token)
        } else if (event === 'SIGNED_OUT') {
          logout()
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialized) return

    const isAuthRoute = pathname === '/login' || pathname === '/verify-otp'
    const isDashboardRoute = pathname?.startsWith('/dashboard')

    if (isAuthenticated && isAuthRoute) {
      // User is authenticated but on auth page, redirect to dashboard
      router.push('/dashboard')
    } else if (!isAuthenticated && isDashboardRoute) {
      // User is not authenticated but trying to access dashboard, redirect to login
      router.push('/login')
    }
  }, [initialized, isAuthenticated, pathname, router])

  const value: AuthContextType = {
    isLoading: !initialized || isLoading,
    isAuthenticated,
    user,
    token,
  }

  if (isLoading && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading Outfyt Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

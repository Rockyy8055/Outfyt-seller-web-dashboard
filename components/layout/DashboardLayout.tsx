'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuthStore } from '@/hooks/useAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { storeApi } from '@/services/api/store'
import { Store } from '@/types'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { logout } = useAuthStore()
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [store, setStore] = useState<Store | null>(null)
  const [isStoreLoading, setIsStoreLoading] = useState(true)

  // Fetch store data when authenticated
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      const fetchStore = async () => {
        try {
          const response = await storeApi.getStore()
          if (response.success && response.data) {
            setStore(response.data)
          }
        } catch (error) {
          console.error('Failed to fetch store:', error)
        } finally {
          setIsStoreLoading(false)
        }
      }

      fetchStore()
    }
  }, [isAuthLoading, isAuthenticated])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    router.push('/login')
  }

  // Show loading while checking auth or fetching store
  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (isStoreLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading store data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          storeName={store?.name}
        />
        
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

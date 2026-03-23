'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/hooks/useAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { authApi } from '@/services/api/auth'
import { toast } from '@/hooks/useToast'
import { Phone } from 'lucide-react'

const loginSchema = z.object({
  phone: z.string()
    .length(10, 'Phone number must be 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { setTempToken, setPhone } = useAuthStore()
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthLoading, isAuthenticated, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      const phoneWithCountryCode = `+91${data.phone}`
      const response = await authApi.sendOtp(phoneWithCountryCode)
      
      if (response.success) {
        setTempToken(response.tempToken || null)
        setPhone(phoneWithCountryCode)
        toast({
          title: 'OTP Sent',
          description: 'Please check your phone for the verification code',
        })
        router.push('/verify-otp')
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'Failed to send OTP',
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking auth
  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Outfyt</h1>
          <p className="text-purple-200">Seller Dashboard</p>
        </div>
        
        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Enter your phone number to login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    className="pl-10"
                    maxLength={10}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
              
              <Button type="submit" className="w-full" loading={isLoading}>
                Send OTP
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>New to Outfyt? Contact us to register your store.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

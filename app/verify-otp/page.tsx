'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/hooks/useAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { authApi } from '@/services/api/auth'
import { toast } from '@/hooks/useToast'
import { ArrowLeft, Shield } from 'lucide-react'

export default function VerifyOtpPage() {
  const router = useRouter()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  const { phone, tempToken, setToken, setUser } = useAuthStore()
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthLoading, isAuthenticated, router])

  useEffect(() => {
    if (!phone && !isAuthLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    inputRefs.current[0]?.focus()
  }, [phone, router, isAuthLoading, isAuthenticated])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0]
    }
    
    if (/^\d*$/.test(value)) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)
      
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
      
      if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
        handleVerify(newOtp.join(''))
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (otpCode: string) => {
    try {
      setIsLoading(true)
      const response = await authApi.verifyOtp(phone!, otpCode, tempToken || undefined)
      
      if (response.success && response.token && response.user) {
        setToken(response.token)
        setUser(response.user)
        toast({
          title: 'Success',
          description: 'Login successful!',
        })
        router.push('/dashboard')
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'Invalid OTP',
        })
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      setIsLoading(true)
      const response = await authApi.sendOtp(phone!)
      
      if (response.success) {
        toast({
          title: 'OTP Sent',
          description: 'Please check your phone for the new verification code',
        })
        setCountdown(30)
        setCanResend(false)
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
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
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Verify OTP</CardTitle>
            <CardDescription className="text-center">
              Enter the 6-digit code sent to {phone}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-2 mb-6">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold"
                  disabled={isLoading}
                />
              ))}
            </div>
            
            <div className="text-center mb-4">
              {canResend ? (
                <Button
                  variant="link"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="text-primary"
                >
                  Resend OTP
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Resend OTP in {countdown}s
                </p>
              )}
            </div>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Change Phone Number
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

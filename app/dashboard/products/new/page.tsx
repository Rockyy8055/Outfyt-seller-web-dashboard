'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'
import { productApi } from '@/services/api/products'
import { ProductFormData } from '@/types'
import { toast } from '@/hooks/useToast'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NewProductPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: ProductFormData) => {
    setIsLoading(true)
    try {
      const response = await productApi.createProduct(data)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Product created successfully',
        })
        router.push('/dashboard/products')
      } else {
        throw new Error(response.message || 'Failed to create product')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Product</h1>
          <p className="text-muted-foreground">Create a new product for your store</p>
        </div>
      </div>

      <ProductForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}

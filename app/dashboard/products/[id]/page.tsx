'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'
import { productApi } from '@/services/api/products'
import { Product, ProductFormData } from '@/types'
import { toast } from '@/hooks/useToast'
import { ArrowLeft, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface ProductWithInventory extends Product {
  sizes: { size: string; stock: number }[]
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  
  const [product, setProduct] = useState<ProductWithInventory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [inventory, setInventory] = useState<{ size: string; stock: number }[]>([])
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await productApi.getProduct(productId)
        if (response.success && response.data) {
          setProduct(response.data as ProductWithInventory)
          setInventory(response.data.sizes || [])
        } else {
          throw new Error('Product not found')
        }
      } catch (error) {
        console.error('Failed to fetch product:', error)
        toast({ title: 'Error', description: 'Failed to fetch product', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleInventoryChange = async (size: string, stock: number) => {
    setIsUpdatingInventory(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Update or insert inventory record
      const { error } = await supabase
        .from('Inventory')
        .upsert(
          { productId, size, stock },
          { onConflict: 'productId,size' }
        )
      
      if (error) throw error
      
      setInventory(prev => {
        const existing = prev.find(i => i.size === size)
        if (existing) {
          return prev.map(i => i.size === size ? { ...i, stock } : i)
        }
        return [...prev, { size, stock }]
      })
      
      toast({ title: 'Success', description: 'Inventory updated' })
    } catch (error) {
      console.error('Failed to update inventory:', error)
      toast({ title: 'Error', description: 'Failed to update inventory', variant: 'destructive' })
    } finally {
      setIsUpdatingInventory(false)
    }
  }

  const handleSubmit = async (data: ProductFormData) => {
    setIsSaving(true)
    try {
      const response = await productApi.updateProduct(productId, data)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        })
        router.push('/dashboard/products')
      } else {
        throw new Error(response.message || 'Failed to update product')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found</p>
        <Link href="/dashboard/products">
          <Button className="mt-4">Back to Products</Button>
        </Link>
      </div>
    )
  }

  const totalStock = inventory.reduce((sum, i) => sum + i.stock, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Product</h1>
          <p className="text-muted-foreground">Update product details and inventory</p>
        </div>
      </div>

      {/* Inventory Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage stock levels for each size variant. Total stock: <span className="font-medium text-foreground">{totalStock} units</span>
            </p>
            
            {inventory.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inventory.map((item) => (
                  <div key={item.size} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{item.size}</Label>
                      <p className="text-xs text-muted-foreground">Size variant</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={item.stock}
                        onChange={(e) => {
                          const newStock = parseInt(e.target.value) || 0
                          setInventory(prev => 
                            prev.map(i => i.size === item.size ? { ...i, stock: newStock } : i)
                          )
                        }}
                        className="w-20"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInventoryChange(item.size, item.stock)}
                        disabled={isUpdatingInventory}
                      >
                        {isUpdatingInventory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No size variants configured</p>
                <p className="text-sm">Add sizes in the product form below</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ProductForm
        initialData={{
          name: product.name,
          price: product.price,
          category: product.category || '',
          sizes: inventory.map(i => i.size),
          colors: product.color ? [product.color] : [],
          stock: totalStock,
          images: product.images || [],
        }}
        onSubmit={handleSubmit}
        isLoading={isSaving}
      />
    </div>
  )
}

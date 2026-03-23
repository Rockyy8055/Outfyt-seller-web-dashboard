'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from './ImageUpload'
import { ProductFormData } from '@/types'
import { X, Plus } from 'lucide-react'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().min(1, 'Price must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  sizes: z.array(z.object({ value: z.string(), stock: z.number().optional() })).min(1, 'At least one size is required'),
  colors: z.array(z.object({ value: z.string() })).min(1, 'At least one color is required'),
  stock: z.number().min(0, 'Stock cannot be negative'),
  images: z.array(z.string()).min(1, 'At least one image is required'),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  initialData?: Partial<ProductFormData>
  onSubmit: (data: ProductFormData) => Promise<void>
  isLoading?: boolean
  categories?: string[]
}

const defaultCategories = [
  'Men',
  'Women',
  'Kids',
  'Accessories',
  'Footwear',
  'Sportswear',
  'Ethnic',
  'Western',
]

const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const commonColors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Grey', 'Brown', 'Navy']

export function ProductForm({ initialData, onSubmit, isLoading, categories }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      category: initialData?.category || '',
      sizes: initialData?.sizes?.map(s => ({ value: s, stock: 0 })) || [],
      colors: initialData?.colors?.map(c => ({ value: c })) || [],
      stock: initialData?.stock || 0,
      images: initialData?.images || [],
    },
  })

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control,
    name: 'sizes',
  })

  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({
    control,
    name: 'colors',
  })

  const images = watch('images')

  const handleFormSubmit = async (data: ProductFormValues) => {
    // Calculate total stock from sizes
    const totalStock = data.sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
    // Convert back to string arrays for API
    await onSubmit({
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      sizes: data.sizes.map(s => s.value),
      colors: data.colors.map(c => c.value),
      stock: totalStock || data.stock,
      images: data.images,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="Enter product name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter product description"
                rows={4}
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0"
                  {...register('price', { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  {...register('stock', { valueAsNumber: true })}
                />
                {errors.stock && (
                  <p className="text-sm text-destructive">{errors.stock.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={watch('category')}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories || defaultCategories).map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sizes */}
            <div className="space-y-2">
              <Label>Sizes *</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {sizeFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg"
                  >
                    <span className="text-sm font-medium">{field.value}</span>
                    <Input
                      type="number"
                      placeholder="Stock"
                      className="w-20 h-7 text-xs"
                      {...register(`sizes.${index}.stock`, { valueAsNumber: true })}
                    />
                    <button
                      type="button"
                      onClick={() => removeSize(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Select onValueChange={(value) => appendSize({ value, stock: 0 })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add size" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.sizes && (
                <p className="text-sm text-destructive">{errors.sizes.message}</p>
              )}
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <Label>Colors *</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {colorFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full"
                  >
                    <span className="text-sm">{field.value}</span>
                    <button
                      type="button"
                      onClick={() => removeColor(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Select onValueChange={(value) => appendColor({ value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add color" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.colors && (
                <p className="text-sm text-destructive">{errors.colors.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            value={images}
            onChange={(urls) => setValue('images', urls)}
            maxFiles={5}
          />
          {errors.images && (
            <p className="text-sm text-destructive mt-2">{errors.images.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  )
}

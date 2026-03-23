'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { storeApi } from '@/services/api/store'
import { Store, StoreUpdateData } from '@/types'
import { toast } from '@/hooks/useToast'
import { Store as StoreIcon, MapPin, Phone, Mail, FileText, Loader2, Save, CheckCircle, XCircle, Map } from 'lucide-react'
import LocationMap from '@/components/map/LocationMap'

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  gstNumber: z.string().optional(),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),
})

type StoreFormData = z.infer<typeof storeSchema>

export default function SettingsPage() {
  const [store, setStore] = useState<Store | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
  })

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const response = await storeApi.getStore()
        if (response.success && response.data) {
          setStore(response.data)
          setLatitude(response.data.latitude)
          setLongitude(response.data.longitude)
          // Parse address string into components for form
          const addressParts = response.data.address?.split(', ') || []
          reset({
            name: response.data.name,
            phone: response.data.phone || '',
            email: '',
            gstNumber: response.data.gstNumber || '',
            addressLine1: addressParts[0] || '',
            addressLine2: addressParts.slice(1, -3).join(', ') || '',
            city: addressParts[addressParts.length - 3] || '',
            state: addressParts[addressParts.length - 2] || '',
            pincode: addressParts[addressParts.length - 1] || '',
          })
        }
      } catch (error) {
        console.error('Failed to fetch store:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStore()
  }, [reset])

  const onSubmit = async (data: StoreFormData) => {
    setIsSaving(true)
    try {
      // Combine address fields into a single string
      const addressString = [
        data.addressLine1,
        data.addressLine2,
        data.city,
        data.state,
        data.pincode
      ].filter(Boolean).join(', ')

      const updateData: StoreUpdateData = {
        name: data.name,
        phone: data.phone,
        gstNumber: data.gstNumber || undefined,
        address: addressString,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      }

      const response = await storeApi.updateStore(updateData)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Store settings updated successfully',
        })
        if (response.data) {
          setStore(response.data)
        }
      } else {
        throw new Error(response.message || 'Failed to update store')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Store Settings</h1>
        <p className="text-muted-foreground">Manage your store information and preferences</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StoreIcon className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Your store&apos;s basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter store name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  placeholder="Enter GST number"
                  {...register('gstNumber')}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+91 9876543210"
                    className="pl-10"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@yourstore.com"
                    className="pl-10"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Store Address
            </CardTitle>
            <CardDescription>Your store&apos;s physical location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Textarea
                id="addressLine1"
                placeholder="Street address, P.O. box, company name"
                rows={2}
                {...register('addressLine1')}
              />
              {errors.addressLine1 && (
                <p className="text-sm text-destructive">{errors.addressLine1.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                placeholder="Apartment, suite, unit, building, floor, etc."
                {...register('addressLine2')}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="City"
                  {...register('city')}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="State"
                  {...register('state')}
                />
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  placeholder="Pincode"
                  maxLength={6}
                  {...register('pincode')}
                />
                {errors.pincode && (
                  <p className="text-sm text-destructive">{errors.pincode.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Store Status
            </CardTitle>
            <CardDescription>Your store&apos;s current status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {store?.isApproved ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="font-medium">
                  {store?.isApproved ? 'Approved' : 'Pending Approval'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {store?.isDisabled ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">
                  {store?.isDisabled ? 'Disabled' : 'Active'}
                </span>
              </div>
            </div>
            {!store?.isApproved && (
              <p className="text-sm text-muted-foreground">
                Your store is pending approval. You can still add products, but they won&apos;t be visible to customers until approved.
              </p>
            )}
            {store?.isDisabled && (
              <p className="text-sm text-destructive">
                Your store has been disabled. Please contact support for assistance.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Store Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Store Location
            </CardTitle>
            <CardDescription>Drag the marker or click on the map to set your store location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationMap
              latitude={latitude || 19.0760}
              longitude={longitude || 72.8777}
              onLocationChange={(lat, lng) => {
                setLatitude(lat)
                setLongitude(lng)
              }}
              draggable={true}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude || ''}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || null)}
                  placeholder="e.g., 19.0760"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude || ''}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || null)}
                  placeholder="e.g., 72.8777"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              These coordinates are used to calculate delivery distances. Drag the marker or enter coordinates manually.
            </p>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents & Verification
            </CardTitle>
            <CardDescription>Upload required business documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Document upload feature coming soon</p>
              <p className="text-sm">GST certificate, PAN card, etc.</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || isSaving}
          >
            Reset
          </Button>
          <Button type="submit" disabled={!isDirty || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

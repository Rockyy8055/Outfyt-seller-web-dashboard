'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

interface DeliveryMapProps {
  deliveryLat: number
  deliveryLng: number
  deliveryAddress?: string
}

function MapInner({ deliveryLat, deliveryLng, deliveryAddress }: DeliveryMapProps) {
  const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet')
  const L = require('leaflet')
  
  // Fix for marker icons - must run on client only
  useEffect(() => {
    // Import leaflet CSS dynamically
    require('leaflet/dist/leaflet.css')
    
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
    L.Marker.prototype.options.icon = defaultIcon
  }, [])
  
  // Red marker for delivery location
  const deliveryIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
  
  return (
    <MapContainer
      center={[deliveryLat, deliveryLng]}
      zoom={16}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker 
        position={[deliveryLat, deliveryLng]}
        icon={deliveryIcon}
      >
        {deliveryAddress && (
          <Popup>
            <div className="text-sm max-w-[200px]">
              <p className="font-medium">Delivery Location</p>
              <p className="text-gray-600">{deliveryAddress}</p>
            </div>
          </Popup>
        )}
      </Marker>
    </MapContainer>
  )
}

// Wrapper component with mounting check
function DeliveryMapWrapper({ deliveryLat, deliveryLng, deliveryAddress }: DeliveryMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !deliveryLat || !deliveryLng) {
    return (
      <div className="h-[200px] w-full rounded-lg border bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  return (
    <div className="h-[200px] w-full rounded-lg overflow-hidden border">
      <MapInner
        deliveryLat={deliveryLat}
        deliveryLng={deliveryLng}
        deliveryAddress={deliveryAddress}
      />
    </div>
  )
}

// Export with dynamic import to avoid SSR issues
export default dynamic(
  () => Promise.resolve(DeliveryMapWrapper),
  { ssr: false }
)

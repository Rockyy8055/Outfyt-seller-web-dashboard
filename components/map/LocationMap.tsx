'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

interface LocationMapProps {
  latitude: number
  longitude: number
  onLocationChange: (lat: number, lng: number) => void
  draggable?: boolean
}

// Component that handles map events - must be inside MapContainer
function MapEventsHandler({ onLocationChange, draggable }: { onLocationChange: (lat: number, lng: number) => void; draggable: boolean }) {
  const { useMapEvents } = require('react-leaflet')
  
  useMapEvents({
    click(e: { latlng: { lat: number; lng: number } }) {
      if (draggable) {
        onLocationChange(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  
  return null
}

// Inner map component that uses react-leaflet
function MapInner({ latitude, longitude, onLocationChange, draggable = true }: LocationMapProps) {
  const { MapContainer, TileLayer, Marker, useMap } = require('react-leaflet')
  const L = require('leaflet')
  
  const [position, setPosition] = useState<[number, number]>([latitude, longitude])

  // Fix for default marker icon - must run on client only
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
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    })
    L.Marker.prototype.options.icon = defaultIcon
  }, [])

  useEffect(() => {
    setPosition([latitude, longitude])
  }, [latitude, longitude])

  // Component to handle map view updates
  function MapViewUpdater() {
    const map = useMap()
    useEffect(() => {
      map.setView([latitude, longitude], map.getZoom())
    }, [latitude, longitude, map])
    return null
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEventsHandler onLocationChange={onLocationChange} draggable={draggable} />
      <MapViewUpdater />
      <Marker
        position={position}
        draggable={draggable}
        eventHandlers={{
          dragend(e: { target: { getLatLng: () => { lat: number; lng: number } } }) {
            const marker = e.target
            const pos = marker.getLatLng()
            setPosition([pos.lat, pos.lng])
            onLocationChange(pos.lat, pos.lng)
          },
        }}
      />
    </MapContainer>
  )
}

// Wrapper component with mounting check
function LocationMapWrapper({ latitude, longitude, onLocationChange, draggable }: LocationMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !latitude || !longitude) {
    return (
      <div className="h-[300px] w-full rounded-lg border bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full rounded-lg overflow-hidden border">
      <MapInner
        latitude={latitude}
        longitude={longitude}
        onLocationChange={onLocationChange}
        draggable={draggable ?? true}
      />
    </div>
  )
}

// Export with dynamic import to avoid SSR issues
export default dynamic(
  () => Promise.resolve(LocationMapWrapper),
  { ssr: false }
)

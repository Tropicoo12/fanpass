'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useStadiumCheck(clubId: string | null) {
  const [isInStadium, setIsInStadium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clubId || !navigator.geolocation) { setLoading(false); return }

    const check = async () => {
      const supabase = createClient()
      const { data: club } = await supabase
        .from('clubs')
        .select('geofence_lat, geofence_lng, geofence_radius_m')
        .eq('id', clubId)
        .single()

      // Note: geofence columns may not exist yet in clubs table — graceful fallback
      if (!club || !('geofence_lat' in club) || !(club as any).geofence_lat || !(club as any).geofence_lng) {
        setIsInStadium(false)
        setLoading(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = getDistanceMeters(
            pos.coords.latitude, pos.coords.longitude,
            Number((club as any).geofence_lat), Number((club as any).geofence_lng)
          )
          setIsInStadium(dist <= ((club as any).geofence_radius_m ?? 500))
          setLoading(false)
        },
        () => { setIsInStadium(false); setLoading(false) }
      )
    }
    check()
  }, [clubId])

  return { isInStadium, loading }
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

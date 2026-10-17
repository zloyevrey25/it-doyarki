import L, { type CircleMarker, type Map as LeafletMap, type Polyline } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './route-map.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchJson } from '../api/network'
import { useApp } from '../context/AppContext'
import { ROUTE_COLORS } from '../data/catalog'
import type { Itinerary } from '../types'

interface Props {
  selectedBuyerIds: string[]
  activeBuyerIds?: string[]
  onToggleBuyer?: (buyerId: string) => void
  compact?: boolean
  itineraries?: Itinerary[]
}

interface RouteLayer {
  layer: Polyline
  color: string
  isRoadRoute: boolean
}

function textBlock(title: string, detail: string) {
  const wrapper = document.createElement('div')
  const heading = document.createElement('strong')
  const description = document.createElement('span')
  heading.textContent = title
  description.textContent = detail
  wrapper.className = 'real-map-label'
  wrapper.append(heading, description)
  return wrapper
}

async function loadRoadRoute(points: [number, number][], signal: AbortSignal) {
  const route: [number, number][] = []
  for (let index = 1; index < points.length; index += 1) {
    const [from, to] = [points[index - 1], points[index]]
    const coordinates = `${from[1]},${from[0]};${to[1]},${to[0]}`
    const result = await fetchJson<{
      code: string
      routes?: Array<{ geometry: { coordinates: Array<[number, number]> } }>
    }>(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`, { signal }, 10000)
    const geometry = result.routes?.[0]?.geometry.coordinates
    if (result.code !== 'Ok' || !geometry) throw new Error('Маршрут не найден')
    const leg = geometry.map(([longitude, latitude]) => [latitude, longitude] as [number, number])
    route.push(...(index === 1 ? leg : leg.slice(1)))
  }
  return route
}

export function RouteMap({ selectedBuyerIds, activeBuyerIds, onToggleBuyer, compact = false, itineraries }: Props) {
  const { farmLocation, farmCoordinates, buyers } = useApp()
  const [tilesUnavailable, setTilesUnavailable] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const routeLayersRef = useRef(new Map<string, RouteLayer>())
  const buyerMarkersRef = useRef(new Map<string, CircleMarker>())
  const pointLayersRef = useRef<L.Layer[]>([])
  const toggleBuyerRef = useRef(onToggleBuyer)
  const selectedRef = useRef(selectedBuyerIds)
  const activeRef = useRef(activeBuyerIds)
  const activeKey = activeBuyerIds?.join('|') ?? ''
  const itineraryBuyerIds = itineraries?.flatMap((item) => item.ordered_stops.map((stop) => stop.buyer))
  const itineraryBuyerKey = itineraryBuyerIds?.join('|') ?? ''
  const itineraryKey = itineraries?.map((item) => `${item.vehicle}:${item.id}:${item.ordered_stops.map((stop) => stop.buyer).join(',')}`).join('|') ?? ''
  const visibleBuyers = useMemo(
    () => itineraryBuyerIds ? buyers.filter((buyer) => itineraryBuyerIds.includes(buyer.id)) : activeBuyerIds ? buyers.filter((buyer) => activeBuyerIds.includes(buyer.id)) : buyers,
    [buyers, activeKey, itineraryBuyerKey],
  )
  const visibleKey = visibleBuyers.map((buyer) => `${buyer.id}:${buyer.coordinates.join(',')}`).join('|')
  const farmKey = farmCoordinates.join(',')

  useEffect(() => { toggleBuyerRef.current = onToggleBuyer }, [onToggleBuyer])
  useEffect(() => { selectedRef.current = selectedBuyerIds }, [selectedBuyerIds])
  useEffect(() => { activeRef.current = activeBuyerIds }, [activeBuyerIds])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const initialBuyer = compact && visibleBuyers.length === 1 ? visibleBuyers[0] : null
    const initialCenter: [number, number] = initialBuyer
      ? [
          (farmCoordinates[0] + initialBuyer.coordinates[0]) / 2,
          (farmCoordinates[1] + initialBuyer.coordinates[1]) / 2,
        ]
      : farmCoordinates
    const map = L.map(containerRef.current, { zoomControl: true, minZoom: 4 }).setView(initialCenter, initialBuyer ? 10 : 7)
    map.attributionControl.setPrefix(false)
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    let loaded = false
    const tileTimer = window.setTimeout(() => { if (!loaded) { setTilesUnavailable(true); tiles.remove() } }, 10000)
    tiles.on('tileload', () => { loaded = true; setTilesUnavailable(false) })
    tiles.on('tileerror', () => setTilesUnavailable(true))
    mapRef.current = map
    return () => {
      window.clearTimeout(tileTimer)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const controller = new AbortController()
    let cancelled = false
    let fitTimer: number | undefined

    routeLayersRef.current.forEach(({ layer }) => layer.remove())
    routeLayersRef.current.clear()
    pointLayersRef.current.forEach((layer) => layer.remove())
    pointLayersRef.current = []
    buyerMarkersRef.current.clear()
    const drawMap = async () => {
      const farmMarker = L.circleMarker(farmCoordinates, {
        radius: 10, color: '#08663f', weight: 4, fillColor: '#ffffff', fillOpacity: 1,
      }).addTo(map)
      farmMarker.bindTooltip(textBlock('Ферма', farmLocation), { permanent: true, direction: 'top', offset: [0, -10], className: 'real-map-tooltip farm-tooltip' })
      pointLayersRef.current.push(farmMarker)

      const bounds = L.latLngBounds([farmCoordinates])
      visibleBuyers.forEach((buyer, index) => {
        const color = ROUTE_COLORS[index % ROUTE_COLORS.length]
        const isActive = activeRef.current ? activeRef.current.includes(buyer.id) : selectedRef.current.includes(buyer.id)
        const marker = L.circleMarker(buyer.coordinates, {
          radius: isActive ? 10 : 8,
          color: '#ffffff',
          weight: 3,
          fillColor: color,
          fillOpacity: isActive ? 1 : 0.72,
        }).addTo(map)
        marker.bindTooltip(textBlock(buyer.name, buyer.address), { direction: 'top', offset: [0, -8], className: 'real-map-tooltip' })
        marker.bindPopup(textBlock(`${buyer.name} · ${buyer.city}`, `${buyer.address} · ${buyer.distanceKm} км · ≈ ${buyer.deliveryTime} ч`))
        if (toggleBuyerRef.current) marker.on('click', () => toggleBuyerRef.current?.(buyer.id))
        buyerMarkersRef.current.set(buyer.id, marker)
        pointLayersRef.current.push(marker)
        bounds.extend(buyer.coordinates)

      })

      const displayedRoutes = itineraries?.length
        ? itineraries.map((item) => ({ key: `${item.vehicle}:${item.id}`, points: [farmCoordinates, ...item.ordered_stops.map((stop) => stop.coordinates)] as [number, number][], label: item.ordered_stops.map((stop) => stop.buyer_name).join(' → ') }))
        : visibleBuyers.map((buyer) => ({ key: buyer.id, points: [farmCoordinates, buyer.coordinates] as [number, number][], label: buyer.name }))

      displayedRoutes.forEach((route, index) => {
        const color = ROUTE_COLORS[index % ROUTE_COLORS.length]
        const fallback = L.polyline(route.points, { color, weight: 5, opacity: 0.9, dashArray: '7 7' }).addTo(map)
        routeLayersRef.current.set(route.key, { layer: fallback, color, isRoadRoute: false })
      })
      fitTimer = window.setTimeout(() => {
        if (cancelled) return
        map.invalidateSize({ animate: false })
          map.fitBounds(bounds, { padding: [46, 46], maxZoom: compact ? 10 : 7, animate: false })
      }, 80)

      await Promise.all(displayedRoutes.map(async (displayedRoute, index) => {
        try {
          const roadCoordinates = await loadRoadRoute(displayedRoute.points, controller.signal)
          if (cancelled) return
          routeLayersRef.current.get(displayedRoute.key)?.layer.remove()
          const color = ROUTE_COLORS[index % ROUTE_COLORS.length]
          const route = L.polyline(roadCoordinates, {
            color, weight: 5, opacity: 0.9,
          }).addTo(map)
          route.bindTooltip(displayedRoute.label)
          routeLayersRef.current.set(displayedRoute.key, { layer: route, color, isRoadRoute: true })
        } catch {
          // Пунктирная линия остаётся безопасным резервом при недоступности OSRM.
        }
      }))
    }

    void drawMap()
    return () => {
      cancelled = true
      controller.abort()
      if (fitTimer !== undefined) window.clearTimeout(fitTimer)
    }
  }, [farmLocation, farmKey, visibleKey, itineraryKey, compact])

  useEffect(() => {
    routeLayersRef.current.forEach(({ layer, color, isRoadRoute }, buyerId) => {
      const isActive = itineraries?.length ? true : activeBuyerIds ? activeBuyerIds.includes(buyerId) : selectedBuyerIds.includes(buyerId)
      layer.setStyle({
        color,
        weight: isActive ? 5 : 3,
        opacity: isActive ? 0.92 : 0.4,
        dashArray: isRoadRoute ? undefined : '7 7',
      })
    })
    buyerMarkersRef.current.forEach((marker, buyerId) => {
      const isActive = activeBuyerIds ? activeBuyerIds.includes(buyerId) : selectedBuyerIds.includes(buyerId)
      marker.setStyle({ radius: isActive ? 10 : 8, fillOpacity: isActive ? 1 : 0.72 })
    })
  }, [selectedBuyerIds, activeBuyerIds, itineraryKey])

  return (
    <div className={`route-map real-route-map ${compact ? 'is-compact' : ''}`} aria-label="Интерактивная карта маршрутов доставки OpenStreetMap">
      <div ref={containerRef} className="leaflet-host" />
      <div className="map-legend" role="status"><span>{tilesUnavailable ? 'Подложка недоступна. Показана схема точек. ' : ''}Пунктир — условная последовательность рейса; сплошная линия — визуализация OSRM.</span></div>
    </div>
  )
}

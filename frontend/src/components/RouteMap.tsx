import L, { type CircleMarker, type Map as LeafletMap, type Polyline } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './route-map.css'
import { useEffect, useMemo, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { ROUTE_COLORS } from '../data/catalog'

interface Props {
  selectedBuyerIds: string[]
  activeBuyerIds?: string[]
  onToggleBuyer?: (buyerId: string) => void
  compact?: boolean
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

async function loadRoadRoute(from: [number, number], to: [number, number], signal: AbortSignal) {
  const coordinates = `${from[1]},${from[0]};${to[1]},${to[0]}`
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`, { signal })
  if (!response.ok) throw new Error('Сервис маршрутов временно недоступен')
  const result = await response.json() as {
    code: string
    routes?: Array<{ geometry: { coordinates: Array<[number, number]> } }>
  }
  const geometry = result.routes?.[0]?.geometry.coordinates
  if (result.code !== 'Ok' || !geometry) throw new Error('Маршрут не найден')
  return geometry.map(([longitude, latitude]) => [latitude, longitude] as [number, number])
}

export function RouteMap({ selectedBuyerIds, activeBuyerIds, onToggleBuyer, compact = false }: Props) {
  const { farmLocation, farmCoordinates, buyers } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const routeLayersRef = useRef(new Map<string, RouteLayer>())
  const buyerMarkersRef = useRef(new Map<string, CircleMarker>())
  const pointLayersRef = useRef<L.Layer[]>([])
  const toggleBuyerRef = useRef(onToggleBuyer)
  const selectedRef = useRef(selectedBuyerIds)
  const activeRef = useRef(activeBuyerIds)
  const activeKey = activeBuyerIds?.join('|') ?? ''
  const visibleBuyers = useMemo(
    () => activeBuyerIds ? buyers.filter((buyer) => activeBuyerIds.includes(buyer.id)) : buyers,
    [buyers, activeKey],
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    return () => {
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

        const fallback = L.polyline([farmCoordinates, buyer.coordinates], {
          color, weight: isActive ? 5 : 3, opacity: isActive ? 0.9 : 0.38, dashArray: '7 7',
        }).addTo(map)
        if (toggleBuyerRef.current) fallback.on('click', () => toggleBuyerRef.current?.(buyer.id))
        routeLayersRef.current.set(buyer.id, { layer: fallback, color, isRoadRoute: false })
      })
      fitTimer = window.setTimeout(() => {
        if (cancelled) return
        map.invalidateSize({ animate: false })
        if (compact && visibleBuyers.length === 1) {
          const [buyerLatitude, buyerLongitude] = visibleBuyers[0].coordinates
          map.setView([
            (farmCoordinates[0] + buyerLatitude) / 2,
            (farmCoordinates[1] + buyerLongitude) / 2,
          ], 10, { animate: false })
        } else {
          map.fitBounds(bounds, { padding: [46, 46], maxZoom: compact ? 10 : 7 })
        }
      }, 80)

      await Promise.all(visibleBuyers.map(async (buyer, index) => {
        try {
          const roadCoordinates = await loadRoadRoute(farmCoordinates, buyer.coordinates, controller.signal)
          if (cancelled) return
          routeLayersRef.current.get(buyer.id)?.layer.remove()
          const color = ROUTE_COLORS[index % ROUTE_COLORS.length]
          const isActive = activeRef.current ? activeRef.current.includes(buyer.id) : selectedRef.current.includes(buyer.id)
          const route = L.polyline(roadCoordinates, {
            color, weight: isActive ? 5 : 3, opacity: isActive ? 0.9 : 0.42,
          }).addTo(map)
          route.bindTooltip(`${buyer.name}: ${buyer.distanceKm} км`)
          if (toggleBuyerRef.current) route.on('click', () => toggleBuyerRef.current?.(buyer.id))
          routeLayersRef.current.set(buyer.id, { layer: route, color, isRoadRoute: true })
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
  }, [farmLocation, farmKey, visibleKey, compact])

  useEffect(() => {
    routeLayersRef.current.forEach(({ layer, color, isRoadRoute }, buyerId) => {
      const isActive = activeBuyerIds ? activeBuyerIds.includes(buyerId) : selectedBuyerIds.includes(buyerId)
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
  }, [selectedBuyerIds, activeBuyerIds])

  return (
    <div className={`route-map real-route-map ${compact ? 'is-compact' : ''}`} aria-label="Интерактивная карта маршрутов доставки OpenStreetMap">
      <div ref={containerRef} className="leaflet-host" />
      <div className="map-legend"><span><i className="legend-line selected" />Выбранный путь</span><span><i className="legend-line" />Доступный путь</span></div>
    </div>
  )
}

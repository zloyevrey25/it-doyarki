import { DEMO_BUYERS, ROUTE_COLORS } from '../data/catalog'
import type { CSSProperties } from 'react'

interface Props {
  selectedBuyerIds: string[]
  activeBuyerIds?: string[]
  onToggleBuyer?: (buyerId: string) => void
  compact?: boolean
}

export function RouteMap({ selectedBuyerIds, activeBuyerIds, onToggleBuyer, compact = false }: Props) {
  const visible = activeBuyerIds ? DEMO_BUYERS.filter((buyer) => activeBuyerIds.includes(buyer.id)) : DEMO_BUYERS
  const farm = { x: 48, y: 48 }
  return (
    <div className={`route-map ${compact ? 'is-compact' : ''}`} aria-label="Схема маршрутов доставки">
      <div className="map-caption"><span>Схематичная карта</span><small>Демо-координаты, без внешнего геокодинга</small></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="map-river" d="M-5 63C18 44 27 74 48 53s37-14 58-35" />
        <path className="map-road" d="M5 18L95 84M13 87L88 10M0 40L100 42" />
        {visible.map((buyer, index) => {
          const selected = selectedBuyerIds.includes(buyer.id)
          return <line key={buyer.id} x1={farm.x} y1={farm.y} x2={buyer.position.x} y2={buyer.position.y} stroke={ROUTE_COLORS[index % ROUTE_COLORS.length]} className={selected || activeBuyerIds ? 'map-route is-active' : 'map-route'} />
        })}
      </svg>
      <div className="farm-marker" style={{ left: `${farm.x}%`, top: `${farm.y}%` }}><span>⌂</span><b>Ферма</b></div>
      {visible.map((buyer, index) => {
        const selected = selectedBuyerIds.includes(buyer.id)
        return (
          <button
            type="button"
            key={buyer.id}
            className={`buyer-marker ${selected ? 'is-selected' : ''}`}
            style={{ left: `${buyer.position.x}%`, top: `${buyer.position.y}%`, '--marker-color': ROUTE_COLORS[index % ROUTE_COLORS.length] } as CSSProperties}
            onClick={() => onToggleBuyer?.(buyer.id)}
            aria-label={`${selected ? 'Убрать' : 'Добавить'} маршрут ${buyer.name}`}
          >
            <span className="marker-pin" />
            <span className="marker-label"><b>{buyer.name}</b><small>{buyer.city} · {buyer.distanceKm} км</small></span>
          </button>
        )
      })}
      <div className="map-legend"><span><i className="legend-dot selected" />Желаемый маршрут</span><span><i className="legend-dot" />Доступный маршрут</span></div>
    </div>
  )
}

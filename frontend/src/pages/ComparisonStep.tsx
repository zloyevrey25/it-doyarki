import { apiClient } from '../api/client'
import { ProductMascot } from '../components/ProductMascot'
import { EmptyState, ErrorState, LoadingState } from '../components/RequestState'
import { RouteMap } from '../components/RouteMap'
import { useApp } from '../context/AppContext'
import { buildOptimizeRequest, DEMO_BUYERS } from '../data/catalog'
import type { ComparisonSolution, Product, Vehicle } from '../types'
import { money, number, riskLabel } from '../utils'
import './comparison-step.css'

interface AlternativePlanProps {
  solution: ComparisonSolution
  bestProfit: number
  products: Product[]
  vehicles: Vehicle[]
}

function AlternativePlan({ solution, bestProfit, products, vehicles }: AlternativePlanProps) {
  const profitDifference = bestProfit - solution.profit

  return (
    <details className="alternative-plan">
      <summary>
        <span className="alternative-rank">{solution.rank}</span>
        <span className="alternative-title"><b>Решение {solution.rank}</b><small>{solution.buyers_used.length} покупателя · {solution.vehicles_used.length} машины</small></span>
        <span className="alternative-difference">на {money.format(profitDifference)} меньше</span>
        <strong>{money.format(solution.profit)}</strong>
        <span className="alternative-chevron" aria-hidden="true">⌄</span>
      </summary>

      <div className="alternative-content">
        <div className="alternative-metrics">
          <span><small>Выручка</small><b>{money.format(solution.revenue)}</b></span>
          <span><small>Транспорт</small><b>{money.format(solution.transport_cost)}</b></span>
          <span><small>Отгружено</small><b>{number.format(solution.plan_metrics.total_shipped_kg)} кг</b></span>
          <span><small>Спрос выполнен</small><b>{number.format(solution.plan_metrics.fulfillment_rate_percent)}%</b></span>
        </div>

        <div className="alternative-detail-grid">
          <div>
            <h3>Маршруты</h3>
            {solution.route_metrics.map((route) => {
              const vehicle = vehicles.find((item) => item.id === route.vehicle)
              return (
                <div className="alternative-route-line" key={`${route.vehicle}-${route.buyer}`}>
                  <span><b>{route.buyer_name}</b><small>{route.city} · {vehicle?.plateNumber ?? route.vehicle} · {route.delivery_time} ч</small></span>
                  <span>{number.format(route.shipped_kg)} кг</span>
                  <strong>{money.format(route.route_profit)}</strong>
                </div>
              )
            })}
          </div>
          <div>
            <h3>Отгрузки</h3>
            {solution.shipments.map((shipment) => {
              const product = products.find((item) => item.id === shipment.product)
              const buyer = DEMO_BUYERS.find((item) => item.id === shipment.buyer)
              return (
                <div className="alternative-shipment-line" key={`${shipment.product}-${shipment.buyer}-${shipment.vehicle}`}>
                  <span><b>{product?.name ?? shipment.product}</b><small>→ {buyer?.name ?? shipment.buyer}</small></span>
                  <strong>{number.format(shipment.quantity)} кг</strong>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </details>
  )
}

export function ComparisonStep() {
  const { products, vehicles, farmLocation, selectedBuyers, comparison, setComparison, status, setStatus, error, setError } = useApp()

  const retry = async () => {
    setStatus('loading')
    setError('')
    try {
      const result = await apiClient.compareRoutes(buildOptimizeRequest(products, vehicles, farmLocation), selectedBuyers, 3)
      setComparison(result)
      setStatus(result.solutions.length ? 'success' : 'empty')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка backend.')
      setStatus('error')
    }
  }

  if (status === 'loading') return <main className="page"><LoadingState text="Сравниваем комбинации маршрутов…" /></main>
  if (status === 'error') return <main className="page"><ErrorState message={error} onRetry={retry} /></main>
  if (!comparison?.solutions.length) return <main className="page"><EmptyState text="Для выбранных направлений допустимое решение не найдено." /></main>

  const best = comparison.recommended_solution
  const selectedProducts = products.filter((product) => product.selected)
  const availableVehicles = vehicles.filter((vehicle) => vehicle.available)

  return (
    <main className="page page-comparison">
      <div className="page-heading compact-page-heading">
        <span className="eyebrow">Этап 3 из 3</span>
        <h1>Сравнение и оптимальное решение</h1>
        <p>Главные показатели собраны в сводку, а подробности альтернатив можно раскрыть ниже.</p>
      </div>

      <section className="frozen-summary compact-summary panel" aria-label="Зафиксированные исходные данные">
        <div className="summary-location"><span>Ферма</span><b>{farmLocation}</b></div>
        <div className="summary-group"><span>Урожай</span><div className="summary-chip-list">{selectedProducts.map((product) => <b key={product.id}>{product.name} · {number.format(product.quantityKg)} кг</b>)}</div></div>
        <div className="summary-group"><span>Транспорт</span><div className="summary-chip-list">{availableVehicles.map((vehicle) => <b key={vehicle.id}>{vehicle.plateNumber} · {number.format(vehicle.capacityKg)} кг</b>)}</div></div>
      </section>

      <section className="comparison-section compact-comparison">
        <div className="section-title compact-section-title"><div><h2>Выбранные направления</h2><p>Короткое сравнение до выбора оптимальной комбинации</p></div></div>
        <div className="route-columns compact-route-columns">
          {selectedBuyers.map((buyerId) => {
            const buyer = DEMO_BUYERS.find((item) => item.id === buyerId)
            if (!buyer) return null
            const route = comparison.solutions.flatMap((solution) => solution.route_metrics).find((item) => item.buyer === buyerId)
            const shipments = comparison.solutions.flatMap((solution) => solution.shipments).filter((item) => item.buyer === buyerId)
            const uniqueShipments = Array.from(new Map(shipments.map((item) => [item.product, item])).values())
            const vehicle = route ? vehicles.find((item) => item.id === route.vehicle) : undefined
            const margin = uniqueShipments.length ? Math.min(...uniqueShipments.map((item) => item.delivery_time_margin)) : null
            const worstRisk = uniqueShipments.some((item) => item.spoilage_risk === 'high') ? 'high' : uniqueShipments.some((item) => item.spoilage_risk === 'medium') ? 'medium' : 'low'

            return (
              <article className="compact-route-card" key={buyerId}>
                <header><span className="route-index">{buyer.name.slice(0, 1)}</span><div><h3>{buyer.name}</h3><p>{buyer.address}</p></div></header>
                <div className="route-highlight-grid">
                  <span><small>Время</small><b>{route?.delivery_time ?? buyer.deliveryTime} ч</b></span>
                  <span><small>Загрузка</small><b>{route ? `${number.format(route.shipped_kg)} кг` : '—'}</b></span>
                  <span><small>Прибыль</small><b className="positive">{money.format(route?.route_profit ?? 0)}</b></span>
                  <span><small>Риск</small><b className={`risk risk-${worstRisk}`}>{route ? riskLabel(worstRisk) : '—'}</b></span>
                </div>
                <footer><span>{vehicle ? `${vehicle.plateNumber} · ${vehicle.model}` : 'Машина не назначена'}</span><b>Запас времени: {margin === null ? '—' : `${number.format(margin)} ч`}</b></footer>
              </article>
            )
          })}
        </div>
      </section>

      <section className="optimal-panel compact-optimal-panel">
        <div className="optimal-heading">
          <div><span className="section-kicker">Рекомендовано оптимизатором</span><h2>Оптимальное решение</h2><p>{comparison.explanation}</p></div>
          <span className="profit-pill">Прибыль <b>{money.format(best.profit)}</b></span>
        </div>
        <div className="optimal-metrics">
          <article><span>Выручка</span><strong>{money.format(best.revenue)}</strong></article>
          <article><span>Транспорт</span><strong>{money.format(best.transport_cost)}</strong></article>
          <article><span>Итоговая прибыль</span><strong>{money.format(best.profit)}</strong></article>
          <article><span>Выполнение спроса</span><strong>{number.format(best.plan_metrics.fulfillment_rate_percent)}%</strong></article>
        </div>
        <div className="optimal-grid">
          <div><h3>Маршруты и отгрузки</h3>{best.route_metrics.map((route) => <article className="optimal-route" key={`${route.vehicle}-${route.buyer}`}><div><b>{route.buyer_name}</b><small>{route.city} · {route.distance_km} км · {route.delivery_time} ч</small></div><span>{number.format(route.shipped_kg)} кг</span><strong>{money.format(route.route_profit)}</strong></article>)}</div>
          <div><h3>Что отправляем</h3>{best.shipments.map((shipment) => { const product = products.find((item) => item.id === shipment.product); const buyer = DEMO_BUYERS.find((item) => item.id === shipment.buyer); return <div className="shipment-line" key={`${shipment.product}-${shipment.buyer}-${shipment.vehicle}`}>{product && <ProductMascot name={product.name} color={product.color} accent={product.accent} shape={product.mascotShape} size={28}/>}<span><b>{product?.name ?? shipment.product}</b><small>→ {buyer?.name}</small></span><strong>{number.format(shipment.quantity)} кг</strong></div> })}</div>
          <div><h3>Остатки</h3>{Object.entries(best.leftovers).map(([productId, value]) => <div className="leftover-line" key={productId}><span>{products.find((item) => item.id === productId)?.name ?? productId}</span><strong>{number.format(value)} кг</strong></div>)}</div>
        </div>
        <div className="constraint-list"><span>✓ Запасы</span><span>✓ Спрос</span><span>✓ Вместимость</span><span>✓ Доступность машин</span><span>✓ Сроки доставки</span></div>
      </section>

      {comparison.solutions.length > 1 && (
        <section className="alternatives panel compact-alternatives">
          <div className="section-title compact-section-title"><div><h2>Другие допустимые планы</h2><p>Нажмите на решение, чтобы увидеть маршруты, отгрузки и показатели</p></div></div>
          <div className="alternative-list">
            {comparison.solutions.slice(1).map((solution) => <AlternativePlan key={solution.rank} solution={solution} bestProfit={best.profit} products={products} vehicles={vehicles} />)}
          </div>
        </section>
      )}

      <section className="final-map compact-final-map">
        <div className="section-title compact-section-title"><div><h2>Карта итогового плана</h2><p>Только маршруты из рекомендованной комбинации</p></div></div>
        <RouteMap selectedBuyerIds={best.buyers_used} activeBuyerIds={best.buyers_used} compact />
      </section>
    </main>
  )
}

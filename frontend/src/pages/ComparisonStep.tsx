import { apiClient } from '../api/client'
import { EmptyState, ErrorState, LoadingState } from '../components/RequestState'
import { RouteMap } from '../components/RouteMap'
import { useApp } from '../context/AppContext'
import { buildOptimizeRequest } from '../data/catalog'
import type { Buyer, ComparisonSolution, Product, Vehicle } from '../types'
import { money, number, riskLabel } from '../utils'
import './comparison-step.css'
import { PlanChanges } from '../components/PlanChanges'
import { buyerPlan } from '../data/buyerPlan'
import { productEmoji, vehicleEmoji } from '../data/emoji'

const routeProfitExplanation = 'Выручка минус затраты направления. Фиксированная стоимость машины учтена один раз в итоговой прибыли.'

function RouteProfitHint() {
  return <span className="info-hint" title={routeProfitExplanation} aria-label={routeProfitExplanation} tabIndex={0}>ⓘ</span>
}

interface AlternativePlanProps {
  solution: ComparisonSolution
  bestProfit: number
  products: Product[]
  vehicles: Vehicle[]
  buyers: Buyer[]
}

function AlternativePlan({ solution, bestProfit, products, vehicles, buyers }: AlternativePlanProps) {
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
            <h3>Маршруты · до фикс. затрат</h3>
            {solution.route_metrics.map((route) => {
              const vehicle = vehicles.find((item) => item.id === route.vehicle)
              return (
                <div className="alternative-route-line" key={`${route.vehicle}-${route.buyer}`}>
                  <span><b>{route.buyer_name}</b><small><span className="emoji-icon vehicle-emoji" aria-hidden="true">{vehicleEmoji(route.vehicle)}</span>{route.city} · {vehicle?.plateNumber ?? route.vehicle} · {route.delivery_time} ч{vehicle?.refrigerationHours ? ` · ❄ +${vehicle.refrigerationHours} ч` : ''}</small></span>
                  <span>{number.format(route.shipped_kg)} кг</span>
                  <strong aria-label={`До фикс. затрат: ${money.format(route.route_profit)}`}>{money.format(route.route_profit)}</strong>
                </div>
              )
            })}
          </div>
          <div>
            <h3>Отгрузки</h3>
            {solution.shipments.map((shipment) => {
              const product = products.find((item) => item.id === shipment.product)
              const buyer = buyers.find((item) => item.id === shipment.buyer)
              return (
                <div className="alternative-shipment-line" key={`${shipment.product}-${shipment.buyer}-${shipment.vehicle}`}>
                  <span><b><span className="emoji-icon product-emoji" aria-hidden="true">{productEmoji(shipment.product)}</span>{product?.name ?? shipment.product}</b><small>→ {buyer?.name ?? shipment.buyer}</small></span>
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
  const { products, vehicles, farmLocation, buyers, selectedBuyers, comparison, setComparison, status, setStatus, error, setError } = useApp()

  const retry = async () => {
    setStatus('loading')
    setError('')
    try {
      const result = await apiClient.compareRoutes(buildOptimizeRequest(products, vehicles, farmLocation, buyers), selectedBuyers, 3)
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
        <h1>Результат расчёта</h1>
      </div>

      <section className="frozen-summary compact-summary" aria-label="Зафиксированные исходные данные">
        <div className="summary-location"><span>Ферма</span><b title={farmLocation}>{farmLocation}</b></div>
        <div className="summary-group"><span>Урожай</span><div className="summary-chip-list">{selectedProducts.map((product) => <b key={product.id}><span className="emoji-icon product-emoji" aria-hidden="true">{productEmoji(product.id)}</span>{product.name} · {number.format(typeof product.quantityKg === 'number' ? product.quantityKg : 0)} кг</b>)}</div></div>
        <div className="summary-group"><span>Транспорт</span><div className="summary-chip-list">{availableVehicles.map((vehicle) => <b key={vehicle.id}><span className="emoji-icon vehicle-emoji" aria-hidden="true">{vehicleEmoji(vehicle.id)}</span>{vehicle.plateNumber} · {number.format(vehicle.capacityKg)} кг{vehicle.refrigerationHours ? ` · ❄ +${vehicle.refrigerationHours} ч` : ''}</b>)}</div></div>
      </section>

      <section className="optimal-panel compact-optimal-panel">
        <div className="optimal-heading">
          <div><h2>Рекомендованный план</h2><p title={comparison.explanation}>{comparison.explanation}</p></div>
          <span className="profit-pill">Прибыль <b>{money.format(best.profit)}</b></span>
        </div>
        <div className="optimal-metrics">
          <article><span>Выручка</span><strong>{money.format(best.revenue)}</strong></article>
          <article><span>Транспорт</span><strong>{money.format(best.transport_cost)}</strong></article>
          <article><span>Выполнение спроса</span><strong>{number.format(best.plan_metrics.fulfillment_rate_percent)}%</strong></article>
        </div>
        <div className="shipment-summary">
          <h3>Основные отгрузки</h3><div className="shipment-grid">{best.shipments.map((shipment) => { const product = products.find((item) => item.id === shipment.product); const buyer = buyers.find((item) => item.id === shipment.buyer); return <div className="shipment-line" key={`${shipment.product}-${shipment.buyer}-${shipment.vehicle}`}><span className="emoji-icon product-emoji" aria-hidden="true">{productEmoji(shipment.product)}</span><span><b>{product?.name ?? shipment.product}</b><small>→ {buyer?.name}</small></span><strong>{number.format(shipment.quantity)} кг</strong></div> })}</div>
        </div>
        <div className="plan-footer"><p className="leftovers-inline"><b>Остатки:</b> {Object.entries(best.leftovers).map(([productId, value], index) => <span key={productId}>{index > 0 && ' · '}<span className="emoji-icon product-emoji" aria-hidden="true">{productEmoji(productId)}</span>{(products.find((item) => item.id === productId)?.name ?? productId).toLocaleLowerCase('ru-RU')} {number.format(value)} кг</span>)}</p><div className="constraint-list" aria-label="Проверки ограничений"><span>✓ Запасы</span><span>✓ Спрос</span><span>✓ Вместимость</span><span>✓ Машины</span><span>✓ Сроки</span></div></div>
      </section>

      <section className="comparison-section compact-comparison">
        <div className="section-title compact-section-title"><div><h2>Направления рекомендованного плана</h2><p>До фикс. затрат <RouteProfitHint /></p></div></div>
        <div className="compact-route-columns">
          {selectedBuyers.map((buyerId) => {
            const buyer = buyers.find((item) => item.id === buyerId)
            if (!buyer) return null
            const direction = buyerPlan(best, buyerId)
            if (!direction.included) return <article className="compact-route-card is-absent" key={buyerId}><h3>{buyer.name}</h3><p>Не включён в рекомендованный план</p></article>
            return <details className="compact-route-card" key={buyerId}>
              <summary><span><h3>{buyer.name}</h3><small>{number.format(direction.weight)} кг · {money.format(direction.contribution)} · <b className={`risk risk-${direction.risk}`}>{riskLabel(direction.risk!)}</b></small></span><i aria-hidden="true">⌄</i></summary>
              <div className="route-more"><span><small>Машины</small><b className="vehicle-label-list">{direction.vehicles.map((id, index) => { const vehicle = vehicles.find((item) => item.id === id); return <span key={id}>{index > 0 && '; '}<span className="emoji-icon vehicle-emoji" aria-hidden="true">{vehicleEmoji(id)}</span>{vehicle?.plateNumber ?? id}{vehicle?.model ? ` · ${vehicle.model}` : ''}</span> })}</b></span><span><small>Время доставки</small><b>{direction.times.map((time) => `${number.format(time)} ч`).join(' / ')}</b></span><span><small>Мин. запас времени</small><b>{direction.margin === null ? '—' : `${number.format(direction.margin)} ч`}</b></span></div>
            </details>
          })}
        </div>
      </section>

      {comparison.solutions.length > 1 && (
        <section className="alternatives panel compact-alternatives">
          <div className="section-title compact-section-title"><div><h2>Другие допустимые планы</h2><p>Нажмите на решение, чтобы увидеть маршруты, отгрузки и показатели</p></div></div>
          <div className="alternative-list">
            {comparison.solutions.slice(1).map((solution) => <AlternativePlan key={solution.rank} solution={solution} bestProfit={best.profit} products={products} vehicles={vehicles} buyers={buyers} />)}
          </div>
        </section>
      )}

      <PlanChanges />

      <section className="final-map compact-final-map">
        <div className="section-title compact-section-title"><div><h2>Карта итогового плана</h2><p>Только маршруты из рекомендованной комбинации</p></div></div>
        <RouteMap selectedBuyerIds={best.buyers_used} activeBuyerIds={best.buyers_used} compact />
      </section>
    </main>
  )
}

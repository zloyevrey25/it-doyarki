import { apiClient } from '../api/client'
import { EmptyState } from '../components/RequestState'
import { useRef, useState } from 'react'
import { PlanChanges } from '../components/PlanChanges'
import { validPrices } from '../data/planChanges'
import { ProductMascot } from '../components/ProductMascot'
import { RouteMap } from '../components/RouteMap'
import { useApp } from '../context/AppContext'
import { buildOptimizeRequest } from '../data/catalog'
import { money, number } from '../utils'

export function BuyersStep() {
  const { products, vehicles, farmLocation, buyers, optimization, selectedBuyers, setSelectedBuyers, setComparison, setStep, status, setStatus, error, setError } = useApp()
  const toggleBuyer = (id: string) => setSelectedBuyers((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const { setBuyers, acceptCalculation, stale, dataNotice } = useApp()
  const busy = useRef(false)
  const [editingBuyerId, setEditingBuyerId] = useState<string | null>(null)
  const request = buildOptimizeRequest(products, vehicles, farmLocation, buyers)
  const pricesValid = validPrices(request)
  const availableVehicleCount = vehicles.filter((vehicle) => vehicle.available).length

  const reload = async () => {
    if (busy.current || !pricesValid) return
    busy.current = true
    setStatus('loading'); setError('')
    try { const result = await apiClient.optimize(request); acceptCalculation(result, request, false); setStatus(result.shipments.length ? 'success' : 'empty') }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Ошибка backend.'); setStatus('error') }
    finally { busy.current = false }
  }

  const compare = async () => {
    if (!selectedBuyers.length || stale || !pricesValid || busy.current) return
    busy.current = true
    setStatus('loading'); setError('')
    try { const result = await apiClient.compareRoutes(buildOptimizeRequest(products, vehicles, farmLocation, buyers), selectedBuyers, 3); setComparison(result); setStatus(result.solutions.length ? 'success' : 'empty'); setStep(3) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Ошибка backend.'); setStatus('error') }
    finally { busy.current = false }
  }

  if (!optimization) return <main className="page"><EmptyState text="Вернитесь к исходным данным и выполните расчёт." /></main>

  return (
    <main className="page page-buyers">
      <div className="page-heading heading-inline buyers-heading"><div><span className="eyebrow">Этап 2 из 3</span><h1>Покупатели и маршруты</h1><p>Выберите покупателей для сравнения.</p></div><div className="heading-tools"><span className="compact-badge"><b>{selectedBuyers.length}</b> выбрано</span><span className="compact-badge">{availableVehicleCount} машины</span>{!stale && <button className="button button-secondary compact-action" disabled={status === 'loading' || !pricesValid} onClick={reload}>{status === 'loading' ? 'Рассчитываем…' : 'Пересчитать'}</button>}</div></div>
      {stale && <div className="recalculation-notice" role="status"><span><b>Условия изменены</b> · пересчитайте результат{!pricesValid && ' · цена должна быть конечным неотрицательным числом'}</span><button className="button button-primary compact-action" disabled={status === 'loading' || !pricesValid} onClick={reload}>{status === 'loading' ? 'Рассчитываем…' : 'Пересчитать'}</button></div>}
      {error && <p className="request-alert compact-alert" role="alert">{error}</p>}
      {dataNotice && <p className="data-notice" role="status">{dataNotice}</p>}
      <PlanChanges />
      <section className={`metric-strip buyers-metrics ${stale ? 'is-stale' : ''}`} aria-label={`Ключевые показатели${stale ? ', значения устарели' : ''}`}><article className="primary-metric"><span>Прибыль</span><strong>{money.format(optimization.profit)}</strong><small>Прибыль = выручка − транспортные расходы</small></article><article><span>Выручка</span><strong>{money.format(optimization.revenue)}</strong></article><article><span>Транспортные расходы</span><strong>{money.format(optimization.transport_cost)}</strong></article></section>

      <div className="buyers-layout">
        <section className="buyer-list" aria-label="Покупатели">
          {buyers.map((buyer) => {
            const selected = selectedBuyers.includes(buyer.id)
            const metric = optimization.buyer_metrics[buyer.id]
            const editing = editingBuyerId === buyer.id
            const visibleDemands = products.filter((product) => product.selected).map((product) => ({ product, demand: buyer.demands.find((d) => d.productId === product.id) })).filter((item) => item.demand)
            const buyerPricesValid = visibleDemands.every(({ demand }) => Number.isFinite(demand?.pricePerKg) && (demand?.pricePerKg ?? -1) >= 0)
            return <article className={`buyer-card ${selected ? 'is-selected' : ''}`} key={buyer.id}>
              <div className="buyer-card-head"><div><h2>{buyer.name}</h2>{!buyer.name.includes(buyer.city) && <p>{buyer.address}</p>}<p>{buyer.distanceKm} км · ≈ {buyer.deliveryTime} ч</p></div><button className={`wish-button ${selected ? 'is-selected' : ''}`} disabled={status === 'loading'} onClick={() => toggleBuyer(buyer.id)} aria-pressed={selected}>☆ {selected ? 'Желаемое' : 'Выбрать'}</button></div>
              <div className="buyer-card-toolbar"><span>Спрос и цена</span><button className="price-mode-button" disabled={status === 'loading' || (editing && !buyerPricesValid)} onClick={() => setEditingBuyerId(editing ? null : buyer.id)}>{editing ? 'Готово' : 'Изменить цены'}</button></div>
              <div className="buyer-product-head" aria-hidden="true"><span /><span>Продукт</span><span>Количество</span><span>Цена</span><span>Потенциально</span></div>
              <div className="buyer-products">{visibleDemands.map(({ product, demand }) => { if (!demand) return null; const item = metric?.products[product.id]; return <div className="buyer-product-row" key={product.id}><ProductMascot name={product.name} color={product.color} accent={product.accent} shape={product.mascotShape} size={30}/><b>{product.name}</b><span>{number.format(demand.requestedKg)} кг</span>{editing ? <label className="price-editor"><span className="sr-only">Цена, ₽/кг</span><input type="number" min="0" step="any" aria-label={`Цена ${product.name}, ${buyer.name}`} disabled={status === 'loading'} value={Number.isFinite(demand.pricePerKg) ? demand.pricePerKg : ''} aria-invalid={!Number.isFinite(demand.pricePerKg) || demand.pricePerKg < 0} onChange={(e) => { const value = e.target.value === '' ? NaN : Number(e.target.value); setBuyers(buyers.map((b) => b.id === buyer.id ? { ...b, demands: b.demands.map((d) => d.productId === product.id ? { ...d, pricePerKg: value } : d) } : b)) }} /></label> : <span>{number.format(demand.pricePerKg)} ₽/кг</span>}<strong>{money.format(item?.potential_revenue ?? 0)}</strong></div> })}</div>
              <footer><span>Потенциально{stale ? ' · устарело' : ''}</span><strong>{money.format(metric?.total_potential_revenue ?? 0)}</strong></footer>
            </article>
          })}
        </section>
        <aside className="map-column"><RouteMap selectedBuyerIds={selectedBuyers} onToggleBuyer={toggleBuyer} /></aside>
      </div>
      <div className="page-action"><span>{selectedBuyers.length ? `Выбрано маршрутов: ${selectedBuyers.length}` : 'Выберите хотя бы один желаемый маршрут'}</span><button className="button button-primary button-large" disabled={!selectedBuyers.length || stale || !pricesValid || status === 'loading'} onClick={compare}>Перейти к сравнению <span>→</span></button></div>
    </main>
  )
}

import { apiClient } from '../api/client'
import { EmptyState } from '../components/RequestState'
import { useRef } from 'react'
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
  const request = buildOptimizeRequest(products, vehicles, farmLocation, buyers)
  const pricesValid = validPrices(request)

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
      <div className="calculation-tools"><p role="status">{stale ? 'Показатели устарели: условия изменены. Выполните пересчёт.' : 'Показатели последнего успешного расчёта.'}{!pricesValid && ' Цена должна быть конечным неотрицательным числом.'}</p><button className="button button-primary" disabled={status === 'loading' || !pricesValid} onClick={reload}>{status === 'loading' ? 'Рассчитываем…' : 'Пересчитать'}</button></div>
      {error && <p className="request-alert" role="alert">{error}</p>}
      {dataNotice && <p role="status">{dataNotice}</p>}
      <PlanChanges />
      <div className="page-heading heading-inline"><div><span className="eyebrow">Этап 2 из 3</span><h1>Покупатели и маршруты</h1><p>Отметьте желаемые направления — оптимизатор найдёт лучшую комбинацию.</p></div><div className="selection-counter"><b>{selectedBuyers.length}</b><span>выбрано</span></div></div>
      <section className="metric-strip" aria-label="Ключевые показатели"><article><span>Потенциальная прибыль</span><strong>{money.format(optimization.profit)}</strong></article><article><span>Возможная выручка</span><strong>{money.format(optimization.revenue)}</strong></article><article><span>Транспортные расходы</span><strong>{money.format(optimization.transport_cost)}</strong></article><article><span>Доступно машин</span><strong>{vehicles.filter((vehicle) => vehicle.available).length}</strong></article></section>
      <div className="formula-note"><b>Цель оптимизации — максимизация прибыли.</b><span>Прибыль = выручка − транспортные расходы.</span></div>

      <div className="buyers-layout">
        <section className="buyer-list" aria-label="Покупатели">
          {buyers.map((buyer) => {
            const selected = selectedBuyers.includes(buyer.id)
            const metric = optimization.buyer_metrics[buyer.id]
            return <article className={`buyer-card ${selected ? 'is-selected' : ''}`} key={buyer.id}><div className="buyer-card-head"><div className="buyer-avatar">{buyer.name.slice(0, 1)}</div><div><h2>{buyer.name}</h2><p>{buyer.address}</p><p>{buyer.distanceKm} км · ≈ {buyer.deliveryTime} ч</p></div><button className={`wish-button ${selected ? 'is-selected' : ''}`} disabled={status === 'loading'} onClick={() => toggleBuyer(buyer.id)} aria-pressed={selected}>☆ {selected ? 'Желаемое' : 'Выбрать'}</button></div><div className="buyer-products">{products.filter((product) => product.selected).map((product) => { const item = metric?.products[product.id]; const demand = buyer.demands.find((d) => d.productId === product.id); if (!demand) return null; return <div className="buyer-product-row" key={product.id}><ProductMascot name={product.name} color={product.color} accent={product.accent} shape={product.mascotShape} size={38}/><span><b>{product.name}</b><small>{number.format(demand.requestedKg)} кг</small><label className="price-editor">Цена, ₽/кг<input type="number" min="0" step="any" aria-label={`Цена ${product.name}, ${buyer.name}`} disabled={status === 'loading'} value={Number.isFinite(demand.pricePerKg) ? demand.pricePerKg : ''} aria-invalid={!Number.isFinite(demand.pricePerKg) || demand.pricePerKg < 0} onChange={(e) => { const value = e.target.value === '' ? NaN : Number(e.target.value); setBuyers(buyers.map((b) => b.id === buyer.id ? { ...b, demands: b.demands.map((d) => d.productId === product.id ? { ...d, pricePerKg: value } : d) } : b)) }} /></label></span><strong>{money.format(item?.potential_revenue ?? 0)}</strong></div> })}</div><footer><span>Общая потенциальная выручка{stale ? ' (устарела)' : ''}</span><strong>{money.format(metric?.total_potential_revenue ?? 0)}</strong></footer></article>
          })}
        </section>
        <aside className="map-column"><RouteMap selectedBuyerIds={selectedBuyers} onToggleBuyer={toggleBuyer} /></aside>
      </div>
      <div className="page-action"><span>{selectedBuyers.length ? `Выбрано маршрутов: ${selectedBuyers.length}` : 'Выберите хотя бы один желаемый маршрут'}</span><button className="button button-primary button-large" disabled={!selectedBuyers.length || stale || !pricesValid || status === 'loading'} onClick={compare}>Перейти к сравнению <span>→</span></button></div>
    </main>
  )
}

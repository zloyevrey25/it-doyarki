import { apiClient } from '../api/client'
import { EmptyState, ErrorState, LoadingState } from '../components/RequestState'
import { ProductMascot } from '../components/ProductMascot'
import { RouteMap } from '../components/RouteMap'
import { useApp } from '../context/AppContext'
import { buildOptimizeRequest, DEMO_BUYERS } from '../data/catalog'
import { money, number } from '../utils'

export function BuyersStep() {
  const { products, vehicles, farmLocation, optimization, setOptimization, selectedBuyers, setSelectedBuyers, setComparison, setStep, status, setStatus, error, setError } = useApp()
  const toggleBuyer = (id: string) => setSelectedBuyers((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])

  const reload = async () => {
    setStatus('loading'); setError('')
    try { const result = await apiClient.optimize(buildOptimizeRequest(products, vehicles, farmLocation)); setOptimization(result); setStatus(result.shipments.length ? 'success' : 'empty') }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Ошибка backend.'); setStatus('error') }
  }

  const compare = async () => {
    if (!selectedBuyers.length) return
    setStatus('loading'); setError('')
    try { const result = await apiClient.compareRoutes(buildOptimizeRequest(products, vehicles, farmLocation), selectedBuyers, 3); setComparison(result); setStatus(result.solutions.length ? 'success' : 'empty'); setStep(3) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Ошибка backend.'); setStatus('error') }
  }

  if (status === 'loading') return <main className="page"><LoadingState text="Ищем прибыльные маршруты…" /></main>
  if (status === 'error') return <main className="page"><ErrorState message={error} onRetry={reload} /></main>
  if (!optimization) return <main className="page"><EmptyState text="Вернитесь к исходным данным и выполните расчёт." /></main>

  return (
    <main className="page">
      <div className="page-heading heading-inline"><div><span className="eyebrow">Этап 2 из 3</span><h1>Покупатели и маршруты</h1><p>Отметьте желаемые направления — оптимизатор найдёт лучшую комбинацию.</p></div><div className="selection-counter"><b>{selectedBuyers.length}</b><span>выбрано</span></div></div>
      <div className="demo-notice"><span>Демо-каталог</span> Организации, расстояния и координаты заданы локально. Расчёт прибыли выполняет FastAPI backend.</div>

      <section className="metric-strip" aria-label="Ключевые показатели"><article><span>Потенциальная прибыль</span><strong>{money.format(optimization.profit)}</strong></article><article><span>Возможная выручка</span><strong>{money.format(optimization.revenue)}</strong></article><article><span>Транспортные расходы</span><strong>{money.format(optimization.transport_cost)}</strong></article><article><span>Доступно машин</span><strong>{vehicles.filter((vehicle) => vehicle.available).length}</strong></article></section>
      <div className="formula-note"><b>Цель оптимизации — максимизация прибыли.</b><span>Прибыль = выручка − транспортные расходы.</span></div>

      <div className="buyers-layout">
        <section className="buyer-list" aria-label="Покупатели">
          {DEMO_BUYERS.map((buyer) => {
            const selected = selectedBuyers.includes(buyer.id)
            const metric = optimization.buyer_metrics[buyer.id]
            return <article className={`buyer-card ${selected ? 'is-selected' : ''}`} key={buyer.id}><div className="buyer-card-head"><div className="buyer-avatar">{buyer.name.slice(0, 1)}</div><div><h2>{buyer.name}</h2><p>{buyer.city} · {buyer.distanceKm} км · ≈ {buyer.deliveryTime} ч</p></div><button className={`wish-button ${selected ? 'is-selected' : ''}`} onClick={() => toggleBuyer(buyer.id)} aria-pressed={selected}>☆ {selected ? 'Желаемое' : 'Выбрать'}</button></div><div className="buyer-products">{products.filter((product) => product.selected).map((product) => { const item = metric?.products[product.id]; if (!item || item.requested_kg <= 0) return null; return <div className="buyer-product-row" key={product.id}><ProductMascot name={product.name} color={product.color} accent={product.accent} shape={product.mascotShape} size={38}/><span><b>{product.name}</b><small>{number.format(item.requested_kg)} кг × {money.format(item.price_per_kg)}/кг</small></span><strong>{money.format(item.potential_revenue)}</strong></div> })}</div><footer><span>Общая потенциальная выручка</span><strong>{money.format(metric?.total_potential_revenue ?? 0)}</strong></footer></article>
          })}
        </section>
        <aside className="map-column"><RouteMap selectedBuyerIds={selectedBuyers} onToggleBuyer={toggleBuyer} /></aside>
      </div>
      <div className="page-action"><span>{selectedBuyers.length ? `Выбрано маршрутов: ${selectedBuyers.length}` : 'Выберите хотя бы один желаемый маршрут'}</span><button className="button button-primary button-large" disabled={!selectedBuyers.length} onClick={compare}>Перейти к сравнению <span>→</span></button></div>
    </main>
  )
}

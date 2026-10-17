import { useMemo, useRef, useState } from 'react'
import { apiClient } from '../api/client'
import { useApp } from '../context/AppContext'
import { buildOptimizeRequest } from '../data/catalog'
import { productEmoji, vehicleEmoji } from '../data/emoji'
import { canonicalFarmLocation, createNearbyBuyers, DEFAULT_FARM_LOCATION, FARM_LOCATION_SUGGESTIONS, geocodeFarmLocation, requireBuyerCoverage } from '../data/nearbyBuyers'
import { buyerIdentity, locationIdentity, preservePrices, validPrices } from '../data/planChanges'
import type { Product } from '../types'
import '../input-step.css'
import '../components/release-fixes.css'

export function InputStep() {
  const { farmLocation, setFarmLocation, setFarmCoordinates, setBuyers, buyers, products, setProducts, vehicles, setVehicles, calculatedRequest, acceptCalculation, status, error, setStep, setStatus, setError } = useApp()
  const [activeCategory, setActiveCategory] = useState<'Ягоды' | 'Фрукты' | 'Овощи'>('Ягоды')
  const pending = useRef(false)
  const [offerDemo, setOfferDemo] = useState(false)

  const visibleProducts = products.filter((product) => product.category === activeCategory)

  const errors = useMemo(() => {
    const next: Record<string, string> = {}
    if (!farmLocation.trim()) next.location = 'Укажите город или адрес фермы.'
    if (!products.some((product) => product.selected)) next.products = 'Выберите хотя бы один продукт.'
    products.forEach((product) => {
      if (product.quantityKg !== '' && (!Number.isFinite(product.quantityKg) || product.quantityKg < 0)) next[`${product.id}-quantity`] = 'Количество должно быть конечным неотрицательным числом.'
      if (product.selected && (typeof product.quantityKg !== 'number' || !Number.isFinite(product.quantityKg) || product.quantityKg <= 0)) next[`${product.id}-quantity`] = 'Для выбранного продукта укажите количество больше нуля.'
      if (product.selected && (!Number.isInteger(product.maxDeliveryTime) || product.maxDeliveryTime <= 0)) next[`${product.id}-time`] = 'Укажите целое число часов больше нуля.'
    })
    if (!vehicles.some((vehicle) => vehicle.available)) next.vehicles = 'Нужна хотя бы одна доступная машина.'
    return next
  }, [farmLocation, products, vehicles])

  const updateProduct = (id: string, patch: Partial<Product>) => setProducts((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))

  const fillExample = () => {
    const example: Record<string, { quantityKg: number, maxDeliveryTime: number }> = {
      strawberry: { quantityKg: 900, maxDeliveryTime: 6 },
      tomato: { quantityKg: 1200, maxDeliveryTime: 10 },
      cucumber: { quantityKg: 1567, maxDeliveryTime: 12 },
    }
    setProducts((items) => items.map((item) => example[item.id]
      ? { ...item, selected: true, ...example[item.id] }
      : { ...item, selected: false, quantityKg: '' }))
    setActiveCategory('Ягоды')
  }

  const submit = async () => {
    if (pending.current || Object.keys(errors).length) return
    pending.current = true
    setOfferDemo(false)
    setStatus('loading'); setError('')
    try {
      let coordinates: [number, number]
      try { coordinates = await geocodeFarmLocation(farmLocation) }
      catch (error) { setOfferDemo(true); throw error }
      const found = createNearbyBuyers(coordinates)
      const reset = !!calculatedRequest && (locationIdentity(farmLocation) !== locationIdentity(calculatedRequest.farm_location ?? '') || found.map(buyerIdentity).sort().join('|') !== buyers.map(buyerIdentity).sort().join('|'))
      const nearbyBuyers = reset ? found : preservePrices(found, buyers)
      try { requireBuyerCoverage(nearbyBuyers) } catch (error) { setOfferDemo(true); throw error }
      const request = buildOptimizeRequest(products, vehicles, farmLocation, coordinates, nearbyBuyers)
      if (!validPrices(request)) throw new Error('Исправьте цены покупателей: требуется конечное неотрицательное число.')
      const result = await apiClient.optimize(request)
      setFarmCoordinates(coordinates); setBuyers(nearbyBuyers)
      acceptCalculation(result, request, reset)
      setStatus(result.shipments.length ? 'success' : 'empty'); setStep(2); window.scrollTo(0, 0)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка backend.'); setStatus('error')
    } finally { pending.current = false }
  }

  return (
    <main className="page page-input">
      {error && <p className="request-alert" role="alert">{error}</p>}
      {offerDemo && <button className="button button-secondary" onClick={() => { setFarmLocation(DEFAULT_FARM_LOCATION); setError(''); setOfferDemo(false) }}>Выбрать демонстрационный адрес: Обнинск</button>}
      <fieldset disabled={status === 'loading'} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className="page-heading"><span className="eyebrow">Этап 1 из 4</span><h1>Исходные данные</h1><p>Укажите урожай, местоположение и транспорт — остальное рассчитает оптимизатор.</p></div>

      <section className="panel location-panel" aria-labelledby="location-title">
        <small>Компании демонстрационные. Охват ограничен локальным каталогом городов: нужны 4–5 покупателей в расчётном радиусе 700 км.</small>
        <div className="section-title"><div><h2 id="location-title">Местоположение фермы</h2><p>Укажите реальный адрес — он станет начальной точкой маршрутов</p></div></div>
        <label className="field"><span>Населённый пункт / адрес</span><input list="farm-location-suggestions" value={farmLocation} onChange={(event) => setFarmLocation(event.target.value)} onBlur={(event) => setFarmLocation(canonicalFarmLocation(event.target.value))} placeholder="Например, Обнинск" aria-invalid={Boolean(errors.location)} />{errors.location && <small className="field-error">{errors.location}</small>}</label>
        <datalist id="farm-location-suggestions">{FARM_LOCATION_SUGGESTIONS.map((location) => <option value={location} key={location} />)}</datalist>
      </section>

      <section className="panel" aria-labelledby="harvest-title">
        <div className="section-title section-title-row"><div><h2 id="harvest-title">Ваш урожай</h2><p>Выберите продукты и задайте доступный объём</p></div><button className="button button-secondary example-fill" type="button" onClick={fillExample}>Заполнить пример</button></div>
        {errors.products && <p className="section-error">{errors.products}</p>}
        <div className="category-tabs" role="tablist" aria-label="Категории урожая">
          {(['Ягоды', 'Фрукты', 'Овощи'] as const).map((category) => <button key={category} type="button" role="tab" aria-selected={activeCategory === category} aria-controls="product-category-panel" className={`category-tab ${activeCategory === category ? 'is-active' : ''}`} onClick={() => setActiveCategory(category)}><span>{category}</span><b>{products.filter((product) => product.category === category).length}</b></button>)}
        </div>
        <div className="product-grid" id="product-category-panel" role="tabpanel" aria-label={activeCategory}>
          {visibleProducts.map((product) => <article key={product.id} className={`product-card ${product.selected ? 'is-active' : ''}`}><label className="product-select"><input type="checkbox" checked={product.selected} onChange={(e) => updateProduct(product.id, { selected: e.target.checked, quantityKg: '' })} /><span className="checkmark" /><span className="emoji-icon product-emoji input-product-emoji" aria-hidden="true">{productEmoji(product.id)}</span><span><b>{product.name}</b><small>{product.category}</small></span></label><div className="product-fields"><label className="field compact"><span>Количество, кг</span><input type="number" min="1" value={product.quantityKg} disabled={!product.selected} aria-label={`Количество, кг: ${product.name}`} onChange={(e) => updateProduct(product.id, { quantityKg: e.target.value === '' ? '' : Number(e.target.value) })} aria-invalid={Boolean(errors[`${product.id}-quantity`])} />{errors[`${product.id}-quantity`] && <small className="field-error">{errors[`${product.id}-quantity`]}</small>}</label><label className="field compact"><span>Макс. доставка, ч</span><input type="number" min="1" step="1" value={product.maxDeliveryTime} disabled={!product.selected} aria-label={`Максимальная доставка, ч: ${product.name}`} onChange={(e) => updateProduct(product.id, { maxDeliveryTime: Number(e.target.value) })} aria-invalid={Boolean(errors[`${product.id}-time`])} />{errors[`${product.id}-time`] && <small className="field-error">{errors[`${product.id}-time`]}</small>}</label></div></article>)}
        </div>
      </section>

      <section className="panel" aria-labelledby="transport-title">
        <div className="section-title"><div><h2 id="transport-title">Транспорт</h2><p>Недоступные машины не попадут в план</p></div></div>
        {errors.vehicles && <p className="section-error">{errors.vehicles}</p>}
        <div className="vehicle-grid">{vehicles.map((vehicle) => <article className={`vehicle-card ${vehicle.available ? '' : 'is-disabled'}`} key={vehicle.id}><span className="emoji-icon input-vehicle-emoji" role="img" aria-label={`Машина ${vehicle.model}`}>{vehicleEmoji(vehicle.id)}</span><div className="vehicle-main"><div className="plate-line"><strong className="plate-number">{vehicle.plateNumber}</strong>{vehicle.refrigerationHours > 0 && <span className="refrigeration-note">❄ +{vehicle.refrigerationHours} ч</span>}</div><b>{vehicle.model}</b><small>Грузоподъёмность: {vehicle.capacityKg.toLocaleString('ru-RU')} кг</small></div><label className="switch"><input type="checkbox" checked={vehicle.available} onChange={(e) => setVehicles((items) => items.map((item) => item.id === vehicle.id ? { ...item, available: e.target.checked } : item))} aria-label={`${vehicle.available ? 'Сделать недоступной' : 'Сделать доступной'} машину ${vehicle.plateNumber}`} /><span /><b>{vehicle.available ? 'Доступна' : 'Недоступна'}</b></label></article>)}</div>
      </section>

      </fieldset>
      <div className="page-action"><span role="status">{status === 'loading' ? 'Ищем адрес и рассчитываем план…' : Object.keys(errors).length ? 'Заполните обязательные поля' : 'Данные готовы к расчёту'}</span><button className="button button-primary button-large" disabled={status === 'loading' || Boolean(Object.keys(errors).length)} onClick={submit}>{status === 'loading' ? 'Рассчитываем…' : error ? 'Повторить расчёт' : 'Найти покупателей и маршруты'} <span>→</span></button></div>
    </main>
  )
}

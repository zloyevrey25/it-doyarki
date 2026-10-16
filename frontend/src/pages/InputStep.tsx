import { useMemo, useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import { ProductMascot } from '../components/ProductMascot'
import { TruckIllustration } from '../components/TruckIllustration'
import { useApp } from '../context/AppContext'
import { buildOptimizeRequest } from '../data/catalog'
import type { Product } from '../types'

export function InputStep() {
  const { farmLocation, setFarmLocation, products, setProducts, vehicles, setVehicles, setOptimization, setComparison, setStep, setStatus, setError } = useApp()
  const [showCustom, setShowCustom] = useState(false)
  const [custom, setCustom] = useState({ name: '', category: 'Овощи' as Product['category'], quantityKg: 100, maxDeliveryTime: 12 })

  const errors = useMemo(() => {
    const next: Record<string, string> = {}
    if (!farmLocation.trim()) next.location = 'Укажите город или адрес фермы.'
    if (!products.some((product) => product.selected)) next.products = 'Выберите хотя бы один продукт.'
    products.forEach((product) => {
      if (product.quantityKg < 0) next[`${product.id}-quantity`] = 'Количество не может быть отрицательным.'
      if (product.selected && product.quantityKg <= 0) next[`${product.id}-quantity`] = 'Для выбранного продукта укажите количество больше нуля.'
      if (product.selected && product.maxDeliveryTime <= 0) next[`${product.id}-time`] = 'Срок доставки должен быть положительным.'
    })
    if (!vehicles.some((vehicle) => vehicle.available)) next.vehicles = 'Нужна хотя бы одна доступная машина.'
    return next
  }, [farmLocation, products, vehicles])

  const updateProduct = (id: string, patch: Partial<Product>) => setProducts((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))

  const addCustomProduct = (event: FormEvent) => {
    event.preventDefault()
    if (!custom.name.trim() || custom.quantityKg <= 0 || custom.maxDeliveryTime <= 0) return
    const id = `custom_${Date.now()}`
    setProducts((items) => [...items, {
      id, name: custom.name.trim(), category: custom.category, selected: true,
      quantityKg: custom.quantityKg, maxDeliveryTime: custom.maxDeliveryTime,
      color: '#8ebd63', accent: '#4b7d3e', mascotShape: 'generic',
    }])
    setCustom({ name: '', category: 'Овощи', quantityKg: 100, maxDeliveryTime: 12 })
    setShowCustom(false)
  }

  const submit = async () => {
    if (Object.keys(errors).length) return
    setStatus('loading'); setError(''); setComparison(null)
    try {
      const result = await apiClient.optimize(buildOptimizeRequest(products, vehicles, farmLocation))
      setOptimization(result); setStatus(result.shipments.length ? 'success' : 'empty'); setStep(2)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка backend.'); setStatus('error')
    }
  }

  return (
    <main className="page page-input">
      <div className="page-heading"><span className="eyebrow">Этап 1 из 3</span><h1>Исходные данные</h1><p>Укажите урожай, местоположение и транспорт — остальное рассчитает оптимизатор.</p></div>

      <section className="panel location-panel" aria-labelledby="location-title">
        <div className="section-title"><span className="section-icon">⌖</span><div><h2 id="location-title">Местоположение фермы</h2><p>Город или адрес без использования внешнего геокодинга</p></div></div>
        <label className="field"><span>Населённый пункт / адрес</span><input value={farmLocation} onChange={(event) => setFarmLocation(event.target.value)} placeholder="Например, Казань" aria-invalid={Boolean(errors.location)} />{errors.location && <small className="field-error">{errors.location}</small>}</label>
      </section>

      <section className="panel" aria-labelledby="harvest-title">
        <div className="section-title section-title-row"><div className="title-group"><span className="section-icon">✣</span><div><h2 id="harvest-title">Ваш урожай</h2><p>Выберите продукты и задайте доступный объём</p></div></div><button className="button button-secondary" onClick={() => setShowCustom((value) => !value)} aria-expanded={showCustom}>＋ Добавить свой продукт</button></div>
        {showCustom && <form className="custom-product-form" onSubmit={addCustomProduct}><label className="field"><span>Название</span><input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} required /></label><label className="field"><span>Категория</span><select value={custom.category} onChange={(e) => setCustom({ ...custom, category: e.target.value as Product['category'] })}><option>Овощи</option><option>Фрукты</option><option>Другое</option></select></label><label className="field"><span>Количество, кг</span><input type="number" min="0.1" value={custom.quantityKg} onChange={(e) => setCustom({ ...custom, quantityKg: Number(e.target.value) })} /></label><label className="field"><span>Макс. время, ч</span><input type="number" min="0.1" step="0.5" value={custom.maxDeliveryTime} onChange={(e) => setCustom({ ...custom, maxDeliveryTime: Number(e.target.value) })} /></label><button className="button button-primary" type="submit">Добавить</button></form>}
        {errors.products && <p className="section-error">{errors.products}</p>}
        <div className="product-grid">
          {products.map((product) => <article key={product.id} className={`product-card ${product.selected ? 'is-active' : ''}`}><label className="product-select"><input type="checkbox" checked={product.selected} onChange={(e) => updateProduct(product.id, { selected: e.target.checked })} /><span className="checkmark" /><ProductMascot name={product.name} color={product.color} accent={product.accent} shape={product.mascotShape} /><span><b>{product.name}</b><small>{product.category}</small></span></label><div className="product-fields"><label className="field compact"><span>Количество, кг</span><input type="number" min="0" value={product.quantityKg} disabled={!product.selected} onChange={(e) => updateProduct(product.id, { quantityKg: Number(e.target.value) })} aria-invalid={Boolean(errors[`${product.id}-quantity`])} />{errors[`${product.id}-quantity`] && <small className="field-error">{errors[`${product.id}-quantity`]}</small>}</label><label className="field compact"><span>Макс. доставка, ч</span><input type="number" min="0.1" step="0.5" value={product.maxDeliveryTime} disabled={!product.selected} onChange={(e) => updateProduct(product.id, { maxDeliveryTime: Number(e.target.value) })} aria-invalid={Boolean(errors[`${product.id}-time`])} />{errors[`${product.id}-time`] && <small className="field-error">{errors[`${product.id}-time`]}</small>}</label></div></article>)}
        </div>
      </section>

      <section className="panel" aria-labelledby="transport-title">
        <div className="section-title"><span className="section-icon">▰</span><div><h2 id="transport-title">Транспорт</h2><p>Недоступные машины не попадут в план</p></div></div>
        {errors.vehicles && <p className="section-error">{errors.vehicles}</p>}
        <div className="vehicle-grid">{vehicles.map((vehicle) => <article className={`vehicle-card ${vehicle.available ? '' : 'is-disabled'}`} key={vehicle.id}><TruckIllustration color={vehicle.color} muted={!vehicle.available} /><div className="vehicle-main"><strong className="plate-number">{vehicle.plateNumber}</strong><b>{vehicle.model}</b><small>Грузоподъёмность: {vehicle.capacityKg.toLocaleString('ru-RU')} кг</small></div><label className="switch"><input type="checkbox" checked={vehicle.available} onChange={(e) => setVehicles((items) => items.map((item) => item.id === vehicle.id ? { ...item, available: e.target.checked } : item))} aria-label={`${vehicle.available ? 'Сделать недоступной' : 'Сделать доступной'} машину ${vehicle.plateNumber}`} /><span /><b>{vehicle.available ? 'Доступна' : 'Недоступна'}</b></label></article>)}</div>
      </section>

      <div className="page-action"><span>{Object.keys(errors).length ? 'Заполните обязательные поля' : 'Данные готовы к расчёту'}</span><button className="button button-primary button-large" disabled={Boolean(Object.keys(errors).length)} onClick={submit}>Найти покупателей и маршруты <span>→</span></button></div>
    </main>
  )
}

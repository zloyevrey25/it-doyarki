import { useEffect } from 'react'
import { EmptyState } from '../components/RequestState'
import { useApp } from '../context/AppContext'
import { productEmoji, vehicleEmoji } from '../data/emoji'
import { duration, money, number, riskLabel } from '../utils'
import './route-sheets-step.css'

const PRINT_TITLE = 'Маршрутный лист — Спаси урожай'

export function RouteSheetsStep() {
  const { comparison, products, vehicles, stale, setStep } = useApp()

  useEffect(() => {
    const previousTitle = document.title
    document.title = PRINT_TITLE
    return () => { document.title = previousTitle }
  }, [])

  if (!comparison?.recommended_solution) {
    return <main className="page"><EmptyState text="Сначала выполните расчёт и выберите рекомендованный план." /></main>
  }

  const plan = comparison.recommended_solution
  const printSheets = () => {
    if (stale) return
    document.title = PRINT_TITLE
    window.print()
  }

  return (
    <main className="page page-route-sheets">
      <header className="route-sheets-heading print-heading">
        <div><span className="completion-status">✓ Расчёт завершён</span><span className="eyebrow">Этап 4 из 4</span><h1>План поставок готов</h1><p>Маршрутные листы сформированы из рекомендованного решения без повторного расчёта.</p></div>
        <div className="route-sheet-actions screen-only">
          <button className="button button-primary" type="button" disabled={stale} onClick={printSheets}>Сохранить маршрутный лист в PDF</button>
          <button className="button button-secondary" type="button" onClick={() => setStep(3)}>Вернуться к результату</button>
          <button className="button button-ghost" type="button" onClick={() => setStep(1)}>Изменить условия и пересчитать</button>
        </div>
      </header>

      {stale && <p className="stale-sheets-alert screen-only" role="alert">Условия изменены. Маршрутные листы устарели — выполните новый расчёт перед сохранением PDF.</p>}

      <section className="route-sheets-summary print-summary" aria-label="Итог плана поставок">
        <article className="is-primary"><span>Прибыль</span><strong>{money.format(plan.profit)}</strong></article>
        <article><span>Отгружено</span><strong>{number.format(plan.plan_metrics.total_shipped_kg)} кг</strong></article>
        <article><span>Остатки</span><strong>{number.format(plan.plan_metrics.total_leftovers_kg)} кг</strong></article>
        <article><span>Использовано машин</span><strong>{plan.vehicles_used.length}</strong></article>
      </section>

      <section className="route-sheet-list" aria-label="Маршрутные листы машин">
        {plan.itineraries.map((itinerary, sheetIndex) => {
          const vehicle = vehicles.find((item) => item.id === itinerary.vehicle)
          const vehicleMetric = plan.vehicle_metrics[itinerary.vehicle]
          const routeLabel = ['Ферма', ...itinerary.ordered_stops.map((stop) => stop.city)].join(' → ')
          return (
            <article className="route-sheet" key={`${itinerary.vehicle}-${itinerary.id}`}>
              <header className="route-sheet-header">
                <span className="sheet-number">Маршрутный лист № {sheetIndex + 1}</span>
                <div className="sheet-vehicle-visual"><span className="emoji-icon sheet-vehicle-emoji" role="img" aria-label={`Машина ${vehicleMetric?.model || vehicle?.model || itinerary.vehicle}`}>{vehicleEmoji(itinerary.vehicle)}</span></div>
                <div className="sheet-vehicle-title"><h2>{vehicleMetric?.model || vehicle?.model || itinerary.vehicle}</h2><p>{vehicleMetric?.plate_number || vehicle?.plateNumber || itinerary.vehicle}</p></div>
                <span className={`cold-badge ${itinerary.refrigeration_hours ? 'is-cold' : ''}`}>{itinerary.refrigeration_hours ? `❄ Холодильник +${itinerary.refrigeration_hours} ч` : 'Без холодильника'}</span>
              </header>

              <div className="sheet-route-line"><span>Последовательность</span><strong>{routeLabel}</strong></div>
              <dl className="sheet-metrics">
                <div><dt>Загрузка</dt><dd>{number.format(itinerary.total_load_kg)} / {number.format(vehicleMetric?.capacity_kg ?? vehicle?.capacityKg ?? 0)} кг</dd></div>
                <div><dt>Расстояние</dt><dd>{number.format(itinerary.total_distance_km)} км</dd></div>
                <div><dt>Полное время</dt><dd>{duration(itinerary.total_time)}</dd></div>
                <div><dt>Стоимость рейса</dt><dd>{money.format(itinerary.itinerary_cost)}</dd></div>
              </dl>

              <div className="sheet-stops">
                {itinerary.ordered_stops.map((stop) => (
                  <section className="sheet-stop" key={`${itinerary.id}-${stop.order}`}>
                    <span className="stop-order">{stop.order}</span>
                    <div className="stop-main">
                      <div className="stop-title"><div><h3>{stop.buyer_name}</h3><p>{stop.city} · прибытие {duration(stop.arrival_time)}</p></div><span className={`risk risk-${stop.spoilage_risk}`}>Риск порчи: {riskLabel(stop.spoilage_risk).toLocaleLowerCase('ru-RU')}</span></div>
                      <div className="stop-unloads">
                        {stop.unloads.map((unload) => {
                          const product = products.find((item) => item.id === unload.product)
                          return <div className="stop-product" key={unload.product}><span className="emoji-icon product-emoji sheet-product-emoji" aria-hidden="true">{productEmoji(unload.product)}</span><span>{product?.name ?? unload.product}</span><strong>{number.format(unload.quantity)} кг</strong></div>
                        })}
                      </div>
                      <div className="stop-totals"><span>Выгрузка: <b>{number.format(stop.unloaded_kg)} кг</b></span><span>Остаток в машине: <b>{number.format(stop.remaining_load_kg)} кг</b></span></div>
                    </div>
                  </section>
                ))}
              </div>

              <footer className="sheet-revenue"><span>Итоговая выручка рейса</span><strong>{money.format(itinerary.revenue)}</strong></footer>
            </article>
          )
        })}
      </section>
    </main>
  )
}

import { useApp } from '../context/AppContext'
import { shipmentChanges } from '../data/planChanges'
import { productEmoji, vehicleEmoji } from '../data/emoji'
import { money, number } from '../utils'
import './release-fixes.css'

export function PlanChanges() {
  const { previousPlan: before, optimization: after, products, buyers, vehicles, stale } = useApp()
  if (!before || !after || stale) return null
  const changes = shipmentChanges(before, after)
  const rows = [
    ['Выручка', before.revenue, after.revenue],
    ['Транспортные затраты', before.transport_cost, after.transport_cost],
    ['Прибыль', before.profit, after.profit],
  ] as const
  return <details className="plan-changes"><summary>До / после пересчёта · прибыль: {money.format(after.profit - before.profit)} · {changes.length ? `изменено отгрузок: ${changes.length}` : 'План отгрузок не изменился'}</summary>
    <p>Сравнение двух последних успешных расчётов по всем найденным покупателям.</p>
    <div className="change-table"><table><thead><tr><th>Показатель</th><th>До</th><th>После</th><th>Разница</th></tr></thead><tbody>
      {rows.map(([label, from, to]) => <tr key={label}><th>{label}</th><td>{money.format(from)}</td><td>{money.format(to)}</td><td>{money.format(to - from)}</td></tr>)}
      {[...new Set([...Object.keys(before.leftovers), ...Object.keys(after.leftovers)])].map((id) => { const from = before.leftovers[id] ?? 0; const to = after.leftovers[id] ?? 0; return <tr key={id}><th>Остаток: <span className="emoji-icon product-emoji" aria-hidden="true">{productEmoji(id)}</span>{products.find((p) => p.id === id)?.name ?? id}</th><td>{number.format(from)} кг</td><td>{number.format(to)} кг</td><td>{number.format(to - from)} кг</td></tr> })}
    </tbody></table></div>
    {changes.length ? <ul>{changes.map((row) => <li key={`${row.product}-${row.buyer}-${row.vehicle}`}><span className="emoji-icon product-emoji" aria-hidden="true">{productEmoji(row.product)}</span>{products.find((p) => p.id === row.product)?.name ?? row.product} → {buyers.find((b) => b.id === row.buyer)?.name ?? row.buyer} · <span className="emoji-icon vehicle-emoji" aria-hidden="true">{vehicleEmoji(row.vehicle)}</span>{vehicles.find((v) => v.id === row.vehicle)?.plateNumber ?? row.vehicle}: {number.format(row.from)} → {number.format(row.to)} кг (Δ {number.format(row.to - row.from)} кг)</li>)}</ul> : <p>План отгрузок не изменился.</p>}
  </details>
}

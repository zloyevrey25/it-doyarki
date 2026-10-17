export const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
export const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export function duration(hours: number) {
  if (!Number.isFinite(hours) || hours < 0) return '—'
  const totalMinutes = Math.round(hours * 60)
  const wholeHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!wholeHours) return `${minutes} мин`
  if (!minutes) return `${wholeHours} ч`
  return `${wholeHours} ч ${minutes} мин`
}

export function riskLabel(risk: string) {
  return risk === 'low' ? 'Низкий' : risk === 'medium' ? 'Средний' : 'Высокий'
}

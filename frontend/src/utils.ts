export const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
export const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export function riskLabel(risk: string) {
  return risk === 'low' ? 'Низкий' : risk === 'medium' ? 'Средний' : 'Высокий'
}

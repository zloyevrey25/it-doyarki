import type { Buyer, OptimizationResult, OptimizeRequest } from '../types'

export const buyerIdentity = (buyer: Buyer) => `${buyer.city}:${buyer.coordinates.join(',')}`
export const locationIdentity = (address: string) => address.trim().toLocaleLowerCase('ru-RU')
export function preservePrices(next: Buyer[], previous: Buyer[]) {
  return next.map((buyer) => {
    const old = previous.find((item) => buyerIdentity(item) === buyerIdentity(buyer))
    return { ...buyer, demands: buyer.demands.map((demand) => ({ ...demand,
      pricePerKg: old?.demands.find((item) => item.productId === demand.productId)?.pricePerKg ?? demand.pricePerKg,
    })) }
  })
}
export const validPrices = (request: OptimizeRequest) => Object.values(request.prices).every((prices) => Object.values(prices).every((price) => Number.isFinite(price) && price >= 0))
export function shipmentChanges(before: OptimizationResult, after: OptimizationResult) {
  const key = (row: OptimizationResult['shipments'][number]) => JSON.stringify([row.product, row.buyer, row.vehicle])
  const old = new Map(before.shipments.map((row) => [key(row), row]))
  const next = new Map(after.shipments.map((row) => [key(row), row]))
  return [...new Set([...old.keys(), ...next.keys()])].flatMap((id) => {
    const row = next.get(id) ?? old.get(id)!
    const from = old.get(id)?.quantity ?? 0
    const to = next.get(id)?.quantity ?? 0
    return Math.abs(to - from) > 1e-6 ? [{ ...row, from, to }] : []
  })
}

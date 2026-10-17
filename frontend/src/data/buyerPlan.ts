import type { OptimizationResult } from '../types'

export function buyerPlan(plan: OptimizationResult, buyerId: string) {
  const itineraries = plan.itineraries.filter((item) => item.ordered_stops.some((stop) => stop.buyer === buyerId))
  const shipments = plan.shipments.filter((row) => row.buyer === buyerId)
  return {
    included: shipments.length > 0,
    weight: shipments.reduce((sum, row) => sum + row.quantity, 0),
    contribution: itineraries.reduce((sum, row) => sum + row.contribution_before_fixed_cost, 0),
    vehicles: [...new Set(shipments.map((row) => row.vehicle))],
    times: [...new Set(itineraries.flatMap((item) => item.ordered_stops.filter((stop) => stop.buyer === buyerId).map((stop) => stop.arrival_time)))].sort((a, b) => a - b),
    margin: shipments.length ? Math.min(...shipments.map((row) => row.delivery_time_margin)) : null,
    risk: !shipments.length ? null : shipments.some((row) => row.spoilage_risk === 'high') ? 'high' as const : shipments.some((row) => row.spoilage_risk === 'medium') ? 'medium' as const : 'low' as const,
  }
}

export type MascotShape = 'strawberry' | 'blueberry' | 'round' | 'cucumber' | 'carrot' | 'potato' | 'cabbage' | 'generic'

export interface Product {
  id: string
  name: string
  category: 'Фрукты' | 'Ягоды' | 'Овощи' | 'Другое'
  selected: boolean
  quantityKg: number | ''
  maxDeliveryTime: number
  color: string
  accent: string
  mascotShape: MascotShape
}

export interface Vehicle {
  id: string
  plateNumber: string
  model: string
  capacityKg: number
  fixedCost: number
  available: boolean
  color: string
  refrigerationHours: number
  speedKmh: number
  costPerKm: number
  routeBaseCost: number
}

export interface BuyerDemand {
  productId: string
  requestedKg: number
  pricePerKg: number
}

export interface Buyer {
  id: string
  name: string
  city: string
  address: string
  distanceKm: number
  deliveryTime: number
  coordinates: [number, number]
  demands: BuyerDemand[]
}

export interface Shipment {
  product: string
  buyer: string
  vehicle: string
  quantity: number
  itinerary_id: string
  stop_order: number
  arrival_time: number
  delivery_time_margin: number
  spoilage_risk: 'low' | 'medium' | 'high'
}

export interface RouteOption {
  itinerary_id: string
  vehicle: string
  buyers: string[]
  buyer_names: string[]
  cities: string[]
  distance_km: number
  delivery_time: number
  route_cost: number
  shipped_kg: number
  route_revenue: number
  route_profit: number
}

export interface ItineraryUnload {
  product: string
  quantity: number
  delivery_time_margin: number
  spoilage_risk: 'low' | 'medium' | 'high'
}

export interface ItineraryStop {
  order: number
  buyer: string
  buyer_name: string
  city: string
  coordinates: [number, number]
  leg_distance_km: number
  distance_km: number
  arrival_time: number
  unloads: ItineraryUnload[]
}

export interface Itinerary {
  id: string
  vehicle: string
  ordered_stops: ItineraryStop[]
  total_distance_km: number
  total_time: number
  total_load_kg: number
  itinerary_cost: number
  fixed_vehicle_cost: number
  revenue: number
  contribution_before_fixed_cost: number
  refrigeration_hours: number
  spoilage_risk: 'low' | 'medium' | 'high'
}

export interface BuyerMetric {
  name: string
  city: string
  distance_km: number
  products: Record<string, {
    requested_kg: number
    price_per_kg: number
    potential_revenue: number
  }>
  total_potential_revenue: number
}

export interface VehicleMetric {
  model: string
  plate_number: string
  capacity_kg: number
  used_capacity_kg: number
  free_capacity_kg: number
  utilization_percent: number
  available: boolean
  used: boolean
}

export interface PlanMetrics {
  total_shipped_kg: number
  total_leftovers_kg: number
  total_demand_kg: number
  fulfilled_demand_kg: number
  fulfillment_rate_percent: number
  profit_margin_percent: number
}

export interface OptimizationResult {
  shipments: Shipment[]
  itineraries: Itinerary[]
  revenue: number
  transport_cost: number
  profit: number
  leftovers: Record<string, number>
  used_capacity: Record<string, number>
  buyer_metrics: Record<string, BuyerMetric>
  plan_metrics: PlanMetrics
  vehicle_metrics: Record<string, VehicleMetric>
  route_metrics: RouteOption[]
}

export interface ComparisonSolution extends OptimizationResult {
  rank: number
  recommended: boolean
  buyers_used: string[]
  vehicles_used: string[]
  total_delivery_time: number
}

export interface CompareRoutesResult {
  solutions: ComparisonSolution[]
  recommended_solution: ComparisonSolution
  explanation: string
}

export interface OptimizeRequest {
  farm_location?: string
  products: string[]
  buyers: string[]
  stock: Record<string, number>
  demand: Record<string, Record<string, number>>
  prices: Record<string, Record<string, number>>
  vehicles: Record<string, {
    capacity: number
    cost: number
    available: boolean
    model: string
    plate_number: string
    refrigeration_hours: number
    speed_kmh: number
    cost_per_km: number
    route_base_cost: number
  }>
  max_delivery_time: Record<string, number>
  farm_coordinates: [number, number]
  buyer_info: Record<string, { name: string; city: string; distance_km: number; coordinates: [number, number] }>
}

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty'

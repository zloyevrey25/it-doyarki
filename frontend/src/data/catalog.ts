import type { Buyer, OptimizeRequest, Product, Vehicle } from '../types'

export const PRODUCT_CATALOG: Product[] = [
  { id: 'strawberry', name: 'Клубника', category: 'Ягоды', selected: true, quantityKg: '', maxDeliveryTime: 6, color: '#ef4444', accent: '#15803d', mascotShape: 'strawberry' },
  { id: 'blueberry', name: 'Голубика', category: 'Ягоды', selected: false, quantityKg: '', maxDeliveryTime: 5, color: '#526aa6', accent: '#477a48', mascotShape: 'blueberry' },
  { id: 'tomato', name: 'Томаты', category: 'Овощи', selected: true, quantityKg: '', maxDeliveryTime: 10, color: '#f04438', accent: '#2f8f46', mascotShape: 'round' },
  { id: 'cucumber', name: 'Огурцы', category: 'Овощи', selected: true, quantityKg: '', maxDeliveryTime: 12, color: '#36a852', accent: '#16743a', mascotShape: 'cucumber' },
  { id: 'apple', name: 'Яблоки', category: 'Фрукты', selected: false, quantityKg: '', maxDeliveryTime: 18, color: '#e53e3e', accent: '#2f855a', mascotShape: 'round' },
  { id: 'banana', name: 'Бананы', category: 'Фрукты', selected: false, quantityKg: '', maxDeliveryTime: 14, color: '#f4cf4d', accent: '#6f8c45', mascotShape: 'generic' },
  { id: 'carrot', name: 'Морковь', category: 'Овощи', selected: false, quantityKg: '', maxDeliveryTime: 24, color: '#f59e0b', accent: '#2f9e44', mascotShape: 'carrot' },
  { id: 'potato', name: 'Картофель', category: 'Овощи', selected: false, quantityKg: '', maxDeliveryTime: 36, color: '#b98555', accent: '#7b5b3d', mascotShape: 'potato' },
  { id: 'cabbage', name: 'Капуста', category: 'Овощи', selected: false, quantityKg: '', maxDeliveryTime: 20, color: '#73c66a', accent: '#319b4f', mascotShape: 'cabbage' },
  { id: 'pear', name: 'Груши', category: 'Фрукты', selected: false, quantityKg: '', maxDeliveryTime: 16, color: '#b8cc4b', accent: '#57913f', mascotShape: 'generic' },
]

export const DEFAULT_VEHICLES: Vehicle[] = [
  { id: 'truck_1', plateNumber: 'А067ВС', model: 'ГАЗель Next', capacityKg: 1500, fixedCost: 1800, available: true, color: '#3d7a5b', refrigerationHours: 0, speedKmh: 70, costPerKm: 7.2, routeBaseCost: 900 },
  { id: 'truck_2', plateNumber: 'В670МТ', model: 'Isuzu NPR 75', capacityKg: 3000, fixedCost: 2600, available: true, color: '#4d6f8f', refrigerationHours: 8, speedKmh: 68, costPerKm: 8.35, routeBaseCost: 900 },
  { id: 'truck_3', plateNumber: 'С676КН', model: 'Mercedes-Benz Atego', capacityKg: 5000, fixedCost: 3900, available: true, color: '#c88438', refrigerationHours: 12, speedKmh: 66, costPerKm: 9.5, routeBaseCost: 900 },
  { id: 'truck_4', plateNumber: 'О321РТ', model: 'Ford Transit', capacityKg: 1500, fixedCost: 1700, available: false, color: '#7d8792', refrigerationHours: 0, speedKmh: 65, costPerKm: 10.65, routeBaseCost: 900 },
]

export function buildOptimizeRequest(products: Product[], vehicles: Vehicle[], farmLocation: string, farmCoordinates: [number, number], buyers: Buyer[]): OptimizeRequest {
  const selectedProducts = products.filter((product) => product.selected)
  const productIds = selectedProducts.map((product) => product.id)
  const buyerIds = buyers.map((buyer) => buyer.id)

  const stock: Record<string, number> = {}
  const maxDeliveryTime: Record<string, number> = {}
  const demand: OptimizeRequest['demand'] = {}
  const prices: OptimizeRequest['prices'] = {}

  selectedProducts.forEach((product) => {
    stock[product.id] = typeof product.quantityKg === 'number' ? product.quantityKg : 0
    maxDeliveryTime[product.id] = product.maxDeliveryTime
    demand[product.id] = {}
    prices[product.id] = {}
    buyers.forEach((buyer) => {
      const item = buyer.demands.find((entry) => entry.productId === product.id)
      demand[product.id][buyer.id] = item?.requestedKg ?? 0
      prices[product.id][buyer.id] = item?.pricePerKg ?? 0
    })
  })

  const vehiclePayload: OptimizeRequest['vehicles'] = {}
  vehicles.forEach((vehicle) => {
    vehiclePayload[vehicle.id] = {
      capacity: vehicle.capacityKg,
      cost: vehicle.fixedCost,
      available: vehicle.available,
      model: vehicle.model,
      plate_number: vehicle.plateNumber,
      refrigeration_hours: vehicle.refrigerationHours,
      speed_kmh: vehicle.speedKmh,
      cost_per_km: vehicle.costPerKm,
      route_base_cost: vehicle.routeBaseCost,
    }
  })

  return {
    farm_location: farmLocation,
    farm_coordinates: farmCoordinates,
    products: productIds,
    buyers: buyerIds,
    stock,
    demand,
    prices,
    vehicles: vehiclePayload,
    max_delivery_time: maxDeliveryTime,
    buyer_info: Object.fromEntries(buyers.map((buyer) => [buyer.id, {
      name: buyer.name,
      city: buyer.city,
      distance_km: buyer.distanceKm,
      coordinates: buyer.coordinates,
    }])),
  }
}

export const ROUTE_COLORS = ['#1d8f5a', '#3578d4', '#8b5cc7', '#d47b35']

export const DEFAULT_FARM_COORDINATES: [number, number] = [55.112005, 36.586531]

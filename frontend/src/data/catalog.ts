import type { Buyer, OptimizeRequest, Product, Vehicle } from '../types'

export const PRODUCT_CATALOG: Product[] = [
  { id: 'strawberry', name: 'Клубника', category: 'Фрукты', selected: true, quantityKg: 900, maxDeliveryTime: 6, color: '#ef4444', accent: '#15803d', mascotShape: 'strawberry' },
  { id: 'tomato', name: 'Томаты', category: 'Овощи', selected: true, quantityKg: 1200, maxDeliveryTime: 10, color: '#f04438', accent: '#2f8f46', mascotShape: 'round' },
  { id: 'cucumber', name: 'Огурцы', category: 'Овощи', selected: true, quantityKg: 700, maxDeliveryTime: 12, color: '#36a852', accent: '#16743a', mascotShape: 'cucumber' },
  { id: 'apple', name: 'Яблоки', category: 'Фрукты', selected: false, quantityKg: 0, maxDeliveryTime: 18, color: '#e53e3e', accent: '#2f855a', mascotShape: 'round' },
  { id: 'carrot', name: 'Морковь', category: 'Овощи', selected: false, quantityKg: 0, maxDeliveryTime: 24, color: '#f59e0b', accent: '#2f9e44', mascotShape: 'carrot' },
  { id: 'potato', name: 'Картофель', category: 'Овощи', selected: false, quantityKg: 0, maxDeliveryTime: 36, color: '#b98555', accent: '#7b5b3d', mascotShape: 'potato' },
  { id: 'cabbage', name: 'Капуста', category: 'Овощи', selected: false, quantityKg: 0, maxDeliveryTime: 20, color: '#73c66a', accent: '#319b4f', mascotShape: 'cabbage' },
  { id: 'pear', name: 'Груши', category: 'Фрукты', selected: false, quantityKg: 0, maxDeliveryTime: 16, color: '#b8cc4b', accent: '#57913f', mascotShape: 'generic' },
]

export const DEFAULT_VEHICLES: Vehicle[] = [
  { id: 'truck_1', plateNumber: 'А123ВС 63', model: 'ГАЗель Next', capacityKg: 1500, fixedCost: 1800, available: true, color: '#3d7a5b' },
  { id: 'truck_2', plateNumber: 'В456МТ 116', model: 'ГАЗон Next', capacityKg: 3000, fixedCost: 2600, available: true, color: '#4d6f8f' },
  { id: 'truck_3', plateNumber: 'С789КН 116', model: 'Mercedes-Benz Atego', capacityKg: 5000, fixedCost: 3900, available: true, color: '#c88438' },
  { id: 'truck_4', plateNumber: 'О321РТ 16', model: 'Ford Transit', capacityKg: 1500, fixedCost: 1700, available: false, color: '#7d8792' },
]

export const DEMO_BUYERS: Buyer[] = [
  {
    id: 'buyer_1', name: 'СеверМаркет', city: 'Казань', distanceKm: 120, deliveryTime: 2, position: { x: 66, y: 25 },
    demands: [
      { productId: 'strawberry', requestedKg: 350, pricePerKg: 320 },
      { productId: 'tomato', requestedKg: 300, pricePerKg: 180 },
      { productId: 'cucumber', requestedKg: 240, pricePerKg: 145 },
      { productId: 'apple', requestedKg: 300, pricePerKg: 150 },
      { productId: 'carrot', requestedKg: 220, pricePerKg: 95 },
      { productId: 'potato', requestedKg: 500, pricePerKg: 80 },
      { productId: 'cabbage', requestedKg: 260, pricePerKg: 110 },
      { productId: 'pear', requestedKg: 200, pricePerKg: 170 },
    ],
  },
  {
    id: 'buyer_2', name: 'АгроСнаб', city: 'Уфа', distanceKm: 320, deliveryTime: 4, position: { x: 83, y: 48 },
    demands: [
      { productId: 'strawberry', requestedKg: 420, pricePerKg: 280 },
      { productId: 'tomato', requestedKg: 450, pricePerKg: 170 },
      { productId: 'cucumber', requestedKg: 350, pricePerKg: 130 },
      { productId: 'apple', requestedKg: 400, pricePerKg: 145 },
      { productId: 'carrot', requestedKg: 300, pricePerKg: 90 },
      { productId: 'potato', requestedKg: 600, pricePerKg: 76 },
      { productId: 'cabbage', requestedKg: 300, pricePerKg: 105 },
      { productId: 'pear', requestedKg: 260, pricePerKg: 160 },
    ],
  },
  {
    id: 'buyer_3', name: 'ВостокФуд', city: 'Самара', distanceKm: 500, deliveryTime: 6, position: { x: 72, y: 76 },
    demands: [
      { productId: 'strawberry', requestedKg: 260, pricePerKg: 420 },
      { productId: 'tomato', requestedKg: 520, pricePerKg: 160 },
      { productId: 'cucumber', requestedKg: 300, pricePerKg: 120 },
      { productId: 'apple', requestedKg: 350, pricePerKg: 180 },
      { productId: 'carrot', requestedKg: 250, pricePerKg: 110 },
      { productId: 'potato', requestedKg: 700, pricePerKg: 82 },
      { productId: 'cabbage', requestedKg: 350, pricePerKg: 115 },
      { productId: 'pear', requestedKg: 300, pricePerKg: 190 },
    ],
  },
  {
    id: 'buyer_4', name: 'ВолгаРитейл', city: 'Ульяновск', distanceKm: 390, deliveryTime: 5, position: { x: 32, y: 78 },
    demands: [
      { productId: 'strawberry', requestedKg: 300, pricePerKg: 350 },
      { productId: 'tomato', requestedKg: 380, pricePerKg: 175 },
      { productId: 'cucumber', requestedKg: 280, pricePerKg: 138 },
      { productId: 'apple', requestedKg: 280, pricePerKg: 160 },
      { productId: 'carrot', requestedKg: 220, pricePerKg: 100 },
      { productId: 'potato', requestedKg: 450, pricePerKg: 78 },
      { productId: 'cabbage', requestedKg: 240, pricePerKg: 108 },
      { productId: 'pear', requestedKg: 220, pricePerKg: 175 },
    ],
  },
]

const ROUTE_COSTS: Record<string, number[]> = {
  truck_1: [2400, 4200, 6100, 4900],
  truck_2: [2700, 4500, 6400, 5200],
  truck_3: [3200, 5000, 7000, 5700],
  truck_4: [2200, 4000, 5900, 4700],
}

export function buildOptimizeRequest(products: Product[], vehicles: Vehicle[], farmLocation: string): OptimizeRequest {
  const selectedProducts = products.filter((product) => product.selected)
  const productIds = selectedProducts.map((product) => product.id)
  const buyerIds = DEMO_BUYERS.map((buyer) => buyer.id)

  const stock: Record<string, number> = {}
  const maxDeliveryTime: Record<string, number> = {}
  const demand: OptimizeRequest['demand'] = {}
  const prices: OptimizeRequest['prices'] = {}

  selectedProducts.forEach((product) => {
    stock[product.id] = product.quantityKg
    maxDeliveryTime[product.id] = product.maxDeliveryTime
    demand[product.id] = {}
    prices[product.id] = {}
    DEMO_BUYERS.forEach((buyer) => {
      const item = buyer.demands.find((entry) => entry.productId === product.id)
      demand[product.id][buyer.id] = item?.requestedKg ?? 0
      prices[product.id][buyer.id] = item?.pricePerKg ?? 0
    })
  })

  const vehiclePayload: OptimizeRequest['vehicles'] = {}
  const deliveryTime: OptimizeRequest['delivery_time'] = {}
  const deliveryCost: OptimizeRequest['delivery_cost'] = {}
  vehicles.forEach((vehicle, vehicleIndex) => {
    vehiclePayload[vehicle.id] = {
      capacity: vehicle.capacityKg,
      cost: vehicle.fixedCost,
      available: vehicle.available,
      model: vehicle.model,
      plate_number: vehicle.plateNumber,
    }
    deliveryTime[vehicle.id] = {}
    deliveryCost[vehicle.id] = {}
    DEMO_BUYERS.forEach((buyer, buyerIndex) => {
      deliveryTime[vehicle.id][buyer.id] = Number((buyer.deliveryTime + vehicleIndex * 0.15).toFixed(2))
      deliveryCost[vehicle.id][buyer.id] = ROUTE_COSTS[vehicle.id]?.[buyerIndex] ?? 3000
    })
  })

  return {
    farm_location: farmLocation,
    products: productIds,
    buyers: buyerIds,
    stock,
    demand,
    prices,
    vehicles: vehiclePayload,
    max_delivery_time: maxDeliveryTime,
    delivery_time: deliveryTime,
    delivery_cost: deliveryCost,
    buyer_info: Object.fromEntries(DEMO_BUYERS.map((buyer) => [buyer.id, {
      name: buyer.name,
      city: buyer.city,
      distance_km: buyer.distanceKm,
    }])),
  }
}

export const ROUTE_COLORS = ['#1d8f5a', '#3578d4', '#8b5cc7', '#d47b35']

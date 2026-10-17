import type { Buyer, BuyerDemand } from '../types'
import { DEFAULT_FARM_COORDINATES, PRODUCT_CATALOG } from './catalog'
import { fetchJson, NetworkError } from '../api/network'

interface DeliveryCity {
  city: string
  coordinates: [number, number]
}

export const DEFAULT_FARM_LOCATION = 'село Большие Кабаны, Республика Татарстан'
const MAX_DELIVERY_RADIUS_KM = 700

const DELIVERY_CITIES: DeliveryCity[] = [
  { city: 'Калининград', coordinates: [54.7104, 20.4522] },
  { city: 'Псков', coordinates: [57.8193, 28.3318] },
  { city: 'Великий Новгород', coordinates: [58.5215, 31.2755] },
  { city: 'Санкт-Петербург', coordinates: [59.9343, 30.3351] },
  { city: 'Петрозаводск', coordinates: [61.7849, 34.3469] },
  { city: 'Мурманск', coordinates: [68.9585, 33.0827] },
  { city: 'Архангельск', coordinates: [64.5393, 40.5187] },
  { city: 'Вологда', coordinates: [59.2205, 39.8915] },
  { city: 'Ярославль', coordinates: [57.6261, 39.8845] },
  { city: 'Кострома', coordinates: [57.7677, 40.9264] },
  { city: 'Иваново', coordinates: [57.0004, 40.9739] },
  { city: 'Тверь', coordinates: [56.8587, 35.9176] },
  { city: 'Москва', coordinates: [55.7558, 37.6176] },
  { city: 'Смоленск', coordinates: [54.7826, 32.0453] },
  { city: 'Брянск', coordinates: [53.2521, 34.3717] },
  { city: 'Калуга', coordinates: [54.5070, 36.2523] },
  { city: 'Тула', coordinates: [54.1931, 37.6173] },
  { city: 'Рязань', coordinates: [54.6095, 39.7126] },
  { city: 'Владимир', coordinates: [56.1291, 40.4066] },
  { city: 'Нижний Новгород', coordinates: [56.2965, 43.9361] },
  { city: 'Саранск', coordinates: [54.1838, 45.1749] },
  { city: 'Пенза', coordinates: [53.1959, 45.0183] },
  { city: 'Тамбов', coordinates: [52.7212, 41.4523] },
  { city: 'Липецк', coordinates: [52.6102, 39.5947] },
  { city: 'Воронеж', coordinates: [51.6608, 39.2003] },
  { city: 'Белгород', coordinates: [50.5954, 36.5873] },
  { city: 'Курск', coordinates: [51.7304, 36.1926] },
  { city: 'Казань', coordinates: [55.7944, 49.1110] },
  { city: 'Чебоксары', coordinates: [56.1439, 47.2489] },
  { city: 'Йошкар-Ола', coordinates: [56.6344, 47.8999] },
  { city: 'Ульяновск', coordinates: [54.3142, 48.4031] },
  { city: 'Самара', coordinates: [53.1959, 50.1002] },
  { city: 'Саратов', coordinates: [51.5336, 46.0343] },
  { city: 'Волгоград', coordinates: [48.7080, 44.5133] },
  { city: 'Ростов-на-Дону', coordinates: [47.2357, 39.7015] },
  { city: 'Краснодар', coordinates: [45.0355, 38.9753] },
  { city: 'Ставрополь', coordinates: [45.0428, 41.9734] },
  { city: 'Минеральные Воды', coordinates: [44.2107, 43.1353] },
  { city: 'Астрахань', coordinates: [46.3479, 48.0336] },
  { city: 'Уфа', coordinates: [54.7388, 55.9721] },
  { city: 'Оренбург', coordinates: [51.7682, 55.0969] },
  { city: 'Ижевск', coordinates: [56.8527, 53.2115] },
  { city: 'Пермь', coordinates: [58.0105, 56.2502] },
  { city: 'Киров', coordinates: [58.6035, 49.6679] },
  { city: 'Сыктывкар', coordinates: [61.6688, 50.8350] },
  { city: 'Екатеринбург', coordinates: [56.8389, 60.6057] },
  { city: 'Челябинск', coordinates: [55.1644, 61.4368] },
  { city: 'Курган', coordinates: [55.4410, 65.3411] },
  { city: 'Тюмень', coordinates: [57.1522, 65.5272] },
  { city: 'Омск', coordinates: [54.9885, 73.3242] },
  { city: 'Новосибирск', coordinates: [55.0084, 82.9357] },
  { city: 'Барнаул', coordinates: [53.3548, 83.7698] },
  { city: 'Кемерово', coordinates: [55.3547, 86.0873] },
  { city: 'Томск', coordinates: [56.4846, 84.9476] },
  { city: 'Красноярск', coordinates: [56.0153, 92.8932] },
  { city: 'Абакан', coordinates: [53.7212, 91.4424] },
  { city: 'Иркутск', coordinates: [52.2864, 104.2807] },
  { city: 'Улан-Удэ', coordinates: [51.8335, 107.5841] },
  { city: 'Чита', coordinates: [52.0340, 113.4994] },
  { city: 'Якутск', coordinates: [62.0355, 129.6755] },
  { city: 'Благовещенск', coordinates: [50.2907, 127.5272] },
  { city: 'Хабаровск', coordinates: [48.4802, 135.0719] },
  { city: 'Владивосток', coordinates: [43.1155, 131.8855] },
  { city: 'Южно-Сахалинск', coordinates: [46.9591, 142.7380] },
]

const BUYER_NAMES = ['ФрешМаркет', 'РегионПродукт', 'АгроСнаб', 'ВекторМаркет', 'ФудЛогистика']
const DEMAND_BASE: Record<string, number> = {
  strawberry: 320,
  blueberry: 240,
  tomato: 420,
  cucumber: 300,
  apple: 360,
  banana: 380,
  carrot: 260,
  potato: 560,
  cabbage: 300,
  pear: 260,
}
const PRICE_BASE: Record<string, number> = {
  strawberry: 340,
  blueberry: 420,
  tomato: 175,
  cucumber: 135,
  apple: 160,
  banana: 190,
  carrot: 100,
  potato: 80,
  cabbage: 110,
  pear: 175,
}

function toRadians(value: number) {
  return value * Math.PI / 180
}

export function distanceKm(from: [number, number], to: [number, number]) {
  const earthRadiusKm = 6371
  const latitudeDelta = toRadians(to[0] - from[0])
  const longitudeDelta = toRadians(to[1] - from[1])
  const startLatitude = toRadians(from[0])
  const endLatitude = toRadians(to[0])
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine))
}

function makeDemands(index: number): BuyerDemand[] {
  const demandFactor = [1, 1.18, .86, 1.08, .94][index % 5]
  const priceFactor = [1, .94, 1.12, 1.04, .98][index % 5]
  return PRODUCT_CATALOG.map((product) => ({
    productId: product.id,
    requestedKg: Math.round((DEMAND_BASE[product.id] ?? 250) * demandFactor / 10) * 10,
    pricePerKg: Math.round((PRICE_BASE[product.id] ?? 120) * priceFactor),
  }))
}

export function createNearbyBuyers(farmCoordinates: [number, number]): Buyer[] {
  return DELIVERY_CITIES
    .map((point) => ({ point, directDistance: distanceKm(farmCoordinates, point.coordinates) }))
    .filter(({ directDistance }) => directDistance >= 10 && directDistance * 1.18 <= MAX_DELIVERY_RADIUS_KM)
    .sort((left, right) => left.directDistance - right.directDistance)
    .slice(0, 5)
    .map(({ point, directDistance }, index) => {
      const estimatedRoadDistance = Math.round(directDistance * 1.18)
      return {
        id: `buyer_${index + 1}`,
        name: `${BUYER_NAMES[index]} — ${point.city}`,
        city: point.city,
        address: `Распределительный центр, ${point.city}`,
        distanceKm: estimatedRoadDistance,
        deliveryTime: Number(Math.max(.5, estimatedRoadDistance / 70).toFixed(1)),
        coordinates: point.coordinates,
        demands: makeDemands(index),
      }
    })
}

export async function geocodeFarmLocation(query: string): Promise<[number, number]> {
  if (query.trim().toLocaleLowerCase('ru-RU') === DEFAULT_FARM_LOCATION.toLocaleLowerCase('ru-RU')) {
    return DEFAULT_FARM_COORDINATES
  }

  const params = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'ru', q: query.trim() })
  let results: Array<{ lat: string; lon: string }>
  try { results = await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json', 'Accept-Language': 'ru' },
  }, 10000) } catch (error) {
    throw new NetworkError(error instanceof NetworkError ? error.kind : 'unavailable', `Поиск адреса: ${error instanceof Error ? error.message : 'Сервис недоступен.'}`)
  }
  if (!Array.isArray(results)) throw new NetworkError('unavailable', 'Сервис адресов вернул некорректный ответ. Повторите попытку.')
  if (!results.length) throw new NetworkError('address', 'Адрес не найден. Уточните населённый пункт или улицу.')
  if (!Number.isFinite(Number(results[0].lat)) || !Number.isFinite(Number(results[0].lon))) throw new NetworkError('unavailable', 'Не удалось определить координаты адреса.')
  return [Number(results[0].lat), Number(results[0].lon)]
}

export const DEFAULT_BUYERS = createNearbyBuyers(DEFAULT_FARM_COORDINATES)

export const FARM_LOCATION_SUGGESTIONS = [DEFAULT_FARM_LOCATION, ...DELIVERY_CITIES.map(({ city }) => city)]

export function canonicalFarmLocation(value: string) {
  const normalized = value.trim().toLocaleLowerCase('ru-RU')
  return FARM_LOCATION_SUGGESTIONS.find((item) => item.toLocaleLowerCase('ru-RU') === normalized) ?? value
}

export function requireBuyerCoverage(buyers: Buyer[]) {
  if (buyers.length < 4) throw new NetworkError('coverage', `В локальном каталоге найдено ${buyers.length} покупателей в пределах 700 км. Для расчёта нужны 4–5. Выберите демонстрационный адрес или другой населённый пункт.`)
}

const PRODUCT_EMOJI: Record<string, string> = {
  strawberry: '🍓',
  blueberry: '🫐',
  tomato: '🍅',
  cucumber: '🥒',
  apple: '🍎',
  banana: '🍌',
  carrot: '🥕',
  potato: '🥔',
  cabbage: '🥬',
  pear: '🍐',
}

const VEHICLE_EMOJI: Record<string, string> = {
  truck_1: '🚚',
  truck_2: '🚛',
  truck_3: '🛻',
  truck_4: '🚐',
}

export function productEmoji(productId: string) {
  return PRODUCT_EMOJI[productId] ?? '📦'
}

export function vehicleEmoji(vehicleId: string) {
  return VEHICLE_EMOJI[vehicleId] ?? '🚚'
}

// Run against Vite + the real local API. Playwright can be supplied externally;
// no browser-test dependency is added to the application.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const base = process.env.TEST_URL || 'http://127.0.0.1:5173'
function checkPlan(request, plan) {
  const close = (a, b) => assert.ok(Math.abs(a - b) < .02, `${a} != ${b}`)
  let revenue = 0
  const loads = {}, stocks = {}, demands = {}, routes = new Set()
  for (const s of plan.shipments) {
    assert.ok(request.vehicles[s.vehicle].available)
    assert.ok(s.quantity >= 0)
    assert.ok(request.delivery_time[s.vehicle][s.buyer] <= request.max_delivery_time[s.product] + request.vehicles[s.vehicle].refrigeration_hours)
    close(s.delivery_time_margin, request.max_delivery_time[s.product] + request.vehicles[s.vehicle].refrigeration_hours - request.delivery_time[s.vehicle][s.buyer])
    revenue += s.quantity * request.prices[s.product][s.buyer]
    loads[s.vehicle] = (loads[s.vehicle] || 0) + s.quantity
    stocks[s.product] = (stocks[s.product] || 0) + s.quantity
    const key = `${s.product}|${s.buyer}`
    demands[key] = (demands[key] || 0) + s.quantity
    assert.ok(demands[key] <= request.demand[s.product][s.buyer] + .001)
    routes.add(`${s.vehicle}|${s.buyer}`)
  }
  let cost = 0
  for (const [id, load] of Object.entries(loads)) { assert.ok(load <= request.vehicles[id].capacity + .001); cost += request.vehicles[id].cost }
  for (const key of routes) { const [v, b] = key.split('|'); cost += request.delivery_cost[v][b] }
  for (const id of request.products) { assert.ok((stocks[id] || 0) <= request.stock[id] + .001); close(plan.leftovers[id], request.stock[id] - (stocks[id] || 0)) }
  close(plan.revenue, revenue); close(plan.transport_cost, cost); close(plan.profit, revenue - cost)
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.route('https://**/*', (route) => route.abort())
  const errors = []
  const heights = {}
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(base)
  assert.equal(await page.locator('.scene-fruit').count(), 3)
  assert.ok(await page.getByRole('button', { name: 'Начать оптимизацию', exact: true }).evaluate((button) => button.getBoundingClientRect().height >= 60))
  await page.screenshot({ path: '/tmp/harvest-landing-1440.png', fullPage: true })
  await page.getByRole('button', { name: /Начать|Рассчитать|Попробовать/ }).first().click()
  await page.waitForTimeout(350)
  const submitButton = page.getByRole('button', { name: 'Найти покупателей и маршруты' })
  const strawberryCard = page.locator('.product-card').filter({ hasText: 'Клубника' })
  const blueberryCard = page.locator('.product-card').filter({ hasText: 'Голубика' })
  assert.equal(await strawberryCard.getByRole('spinbutton', { name: /Количество/ }).inputValue(), '')
  assert.equal(await submitButton.isDisabled(), true)
  assert.equal(await blueberryCard.getByRole('spinbutton', { name: /Количество/ }).isDisabled(), true)
  await blueberryCard.getByRole('checkbox').check()
  assert.equal(await blueberryCard.getByRole('spinbutton', { name: /Количество/ }).inputValue(), '')
  assert.equal(await submitButton.isDisabled(), true)
  await blueberryCard.getByRole('checkbox').uncheck()
  assert.equal(await page.getByRole('tab', { name: /Ягоды/ }).getAttribute('aria-selected'), 'true')
  await page.getByRole('tab', { name: /Фрукты/ }).click()
  await page.locator('.product-card').filter({ hasText: 'Яблоки' }).waitFor()
  await page.locator('.product-card').filter({ hasText: 'Бананы' }).waitFor()
  await page.locator('.product-card').filter({ hasText: 'Груши' }).waitFor()
  await page.getByRole('tab', { name: /Овощи/ }).click()
  await page.locator('.product-card').filter({ hasText: 'Томаты' }).waitFor()
  await page.locator('.product-card').filter({ hasText: 'Огурцы' }).waitFor()
  await page.getByRole('tab', { name: /Ягоды/ }).click()
  const locationInput = page.getByLabel('Населённый пункт / адрес')
  assert.equal(await locationInput.getAttribute('list'), 'farm-location-suggestions')
  assert.ok(await page.locator('#farm-location-suggestions option').count() > 20)
  await locationInput.fill('казань')
  await locationInput.blur()
  assert.equal(await locationInput.inputValue(), 'Казань')
  await locationInput.fill('село Большие Кабаны, Республика Татарстан')
  await page.getByRole('button', { name: 'Заполнить пример', exact: true }).click()
  const strawberryQuantity = strawberryCard.getByRole('spinbutton', { name: /Количество/ })
  const strawberryTime = strawberryCard.getByRole('spinbutton', { name: /Максимальная доставка/ })
  assert.equal(await strawberryQuantity.inputValue(), '900')
  await strawberryQuantity.fill('0'); assert.equal(await submitButton.isDisabled(), true)
  await strawberryQuantity.fill('-1'); assert.equal(await submitButton.isDisabled(), true)
  await strawberryQuantity.fill('900')
  await strawberryTime.fill('6.5'); assert.equal(await submitButton.isDisabled(), true)
  await strawberryTime.fill('6')
  assert.equal(await submitButton.isEnabled(), true)
  heights.input = await page.evaluate(() => document.documentElement.scrollHeight)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'desktop input overflow')
  await page.screenshot({ path: '/tmp/harvest-input-1440.png', fullPage: true })
  const calculate = async (button) => {
    const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/optimize'))
    await button.click()
    const response = await responsePromise
    assert.equal(response.status(), 200)
    const request = response.request().postDataJSON(), plan = await response.json()
    checkPlan(request, plan)
    await page.getByRole('heading', { name: 'Покупатели и маршруты', exact: true }).waitFor()
    await page.waitForTimeout(350)
    return { request, plan }
  }
  const original = await calculate(page.getByRole('button', { name: 'Найти покупателей и маршруты' }))
  heights.buyers = await page.evaluate(() => document.documentElement.scrollHeight)
  assert.equal(original.request.buyers.length, 5)
  const buyerColumns = await page.locator('.buyer-list').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length)
  assert.equal(buyerColumns, 2)
  await page.getByRole('button', { name: 'Изменить цены', exact: true }).first().click()
  const price = page.getByRole('spinbutton', { name: /Цена Клубника/ }).first()
  await price.fill('1000')
  await page.getByText('Условия изменены', { exact: false }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Перейти к сравнению' }).isDisabled(), true)
  const increased = await calculate(page.getByRole('button', { name: 'Пересчитать', exact: true }))
  assert.equal(increased.request.prices.strawberry.buyer_1, 1000)
  await page.locator('.plan-changes summary').click()
  await page.getByRole('rowheader', { name: 'Транспортные затраты', exact: true }).waitFor()
  await page.screenshot({ path: '/tmp/harvest-buyers-1440.png', fullPage: true })
  await page.getByRole('button', { name: 'Перейти на стартовую страницу' }).click()
  await page.locator('.landing').waitFor()
  await page.getByRole('button', { name: 'Начать', exact: true }).click()
  const used = increased.plan.shipments[0].vehicle
  const plate = increased.request.vehicles[used].plate_number
  await page.getByRole('checkbox', { name: `Сделать недоступной машину ${plate}` }).uncheck({ force: true })
  const disabled = await calculate(page.getByRole('button', { name: 'Найти покупателей и маршруты' }))
  assert.equal(disabled.request.prices.strawberry.buyer_1, 1000)
  assert.ok(disabled.plan.shipments.every((s) => s.vehicle !== used))
  await page.getByRole('button', { name: 'Перейти к сравнению' }).click()
  const comparisonDialog = page.getByRole('dialog', { name: 'Покупатели не выбраны' })
  await comparisonDialog.waitFor()
  await comparisonDialog.getByText('Покупатели не выбраны. Использовать для сравнения все варианты?', { exact: true }).waitFor()
  assert.ok(await comparisonDialog.getByRole('button', { name: 'Вернуться к выбору' }).isEnabled())
  await page.screenshot({ path: '/tmp/harvest-buyers-dialog-1440.png', fullPage: true })
  const comparisonResponse = page.waitForResponse((r) => r.url().endsWith('/api/compare-routes'))
  await comparisonDialog.getByRole('button', { name: 'Использовать всех' }).click()
  const comparison = await comparisonResponse
  assert.equal(comparison.status(), 200)
  const solutions = await comparison.json()
  for (const solution of solutions.solutions) checkPlan(comparison.request().postDataJSON(), solution)
  const buyersByVehicle = new Map()
  for (const route of solutions.recommended_solution.route_metrics) buyersByVehicle.set(route.vehicle, new Set([...(buyersByVehicle.get(route.vehicle) || []), route.buyer]))
  assert.ok([...buyersByVehicle.values()].some((buyers) => buyers.size >= 2), 'example with one vehicle and two buyers')
  await page.getByRole('heading', { name: 'Рекомендованный план', exact: true }).waitFor()
  await page.getByText('До фикс. затрат', { exact: false }).first().waitFor()
  await page.waitForTimeout(350)
  heights.comparisonCollapsed = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.screenshot({ path: '/tmp/harvest-comparison-collapsed-1440.png', fullPage: true })
  await page.locator('.compact-route-card summary').first().click()
  await page.locator('.route-more').first().waitFor()
  await page.locator('.alternative-plan summary').first().click()
  await page.locator('.alternative-content').first().waitFor()
  await page.locator('.model-assumptions summary').click()
  await page.locator('.assumptions-popover').waitFor()
  heights.comparisonExpanded = await page.evaluate(() => document.documentElement.scrollHeight)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'desktop comparison overflow')
  await page.screenshot({ path: '/tmp/harvest-comparison-1440.png', fullPage: true })
  // Pure behavior checks use the same frontend modules served by Vite.
  const unit = await page.evaluate(async () => {
    const { createNearbyBuyers, requireBuyerCoverage } = await import('/src/data/nearbyBuyers.ts')
    const { fetchJson } = await import('/src/api/network.ts')
    const { buyerPlan } = await import('/src/data/buyerPlan.ts')
    const { preservePrices, validPrices, shipmentChanges } = await import('/src/data/planChanges.ts')
    const { buildOptimizeRequest, PRODUCT_CATALOG, DEFAULT_VEHICLES } = await import('/src/data/catalog.ts')
    const cases = new Map()
    for (let lat = 43; lat <= 70; lat += 1) for (let lon = 20; lon <= 150; lon += 2) {
      const buyers = createNearbyBuyers([lat, lon])
      if ([0, 3, 4, 5].includes(buyers.length) && !cases.has(buyers.length)) {
        let accepted = true; try { requireBuyerCoverage(buyers) } catch { accepted = false }
        cases.set(buyers.length, { lat, lon, accepted, unique: new Set(buyers.map((b) => b.city)).size === buyers.length, radius: buyers.every((b) => b.distanceKm <= 700) })
      }
    }
    const buyers = createNearbyBuyers([55.6493585, 49.3054794])
    const edited = structuredClone(buyers); edited[0].demands[0].pricePerKg = 999
    const preserved = preservePrices([...buyers].reverse(), edited)
    const request = buildOptimizeRequest(PRODUCT_CATALOG, DEFAULT_VEHICLES, 'farm', buyers)
    const invalid = [-1, NaN, Infinity].every((price) => { request.prices.strawberry.buyer_1 = price; return !validPrices(request) })
    const recommended = { shipments: [{ product:'p', buyer:'a', vehicle:'v1', quantity:10, delivery_time_margin:3, spoilage_risk:'low' }, { product:'p', buyer:'a', vehicle:'v2', quantity:20, delivery_time_margin:1, spoilage_risk:'high' }], route_metrics:[{ buyer:'a', vehicle:'v1', route_profit:100, delivery_time:2 }, { buyer:'a', vehicle:'v2', route_profit:200, delivery_time:4 }] }
    const alternative = { shipments:[{ product:'p', buyer:'b', vehicle:'v3', quantity:999, delivery_time_margin:99, spoilage_risk:'low' }], route_metrics:[{buyer:'a',vehicle:'v3',route_profit:9999,delivery_time:99}] }
    const comparison = { recommended_solution: recommended, solutions:[recommended, alternative] }
    return { cases: [...cases], invalid, preserved: preserved.find((b) => b.city === edited[0].city).demands[0].pricePerKg, aggregate:buyerPlan(comparison.recommended_solution,'a'), absent:buyerPlan(comparison.recommended_solution,'b'), unchanged:shipmentChanges(recommended,recommended).length, fetchJson: typeof fetchJson }
  })
  assert.deepEqual(unit.cases.map(([n]) => n).sort(), [0,3,4,5])
  for (const [n, c] of unit.cases) { assert.equal(c.accepted, n >= 4); assert.ok(c.unique && c.radius) }
  assert.equal(unit.preserved,999); assert.ok(unit.invalid); assert.equal(unit.unchanged,0)
  assert.equal(unit.aggregate.weight,30); assert.equal(unit.aggregate.contribution,300); assert.equal(unit.aggregate.margin,1); assert.equal(unit.aggregate.risk,'high'); assert.equal(unit.aggregate.vehicles.length,2)
  assert.equal(unit.absent.included,false); assert.equal(unit.absent.risk,null)
  assert.equal(unit.fetchJson,'function')
  await page.route('**/__slow', async (route) => { await new Promise((resolve) => setTimeout(resolve,100)); await route.fulfill({json:{ok:true}}) })
  const timeoutKind = await page.evaluate(async () => { const { fetchJson } = await import('/src/api/network.ts'); try { await fetchJson('/__slow',{},20) } catch (error) { return error.kind } })
  assert.equal(timeoutKind,'timeout')
  // Error handling and double submission: failures are injected, successes use API.
  await page.getByRole('button', { name: 'Перейти на стартовую страницу' }).click()
  await page.locator('.landing').waitFor()
  await page.getByRole('button', { name: 'Начать', exact: true }).click()
  await page.route('**/api/optimize', (route) => route.abort())
  await page.getByRole('button', { name: 'Найти покупателей и маршруты' }).click()
  await page.getByRole('alert').filter({ hasText: /Расчёт:/ }).waitFor()
  assert.ok(await page.getByRole('button', { name: 'Повторить расчёт' }).isEnabled())
  await page.unroute('**/api/optimize')
  const address = page.getByLabel('Населённый пункт / адрес')
  await address.fill('несуществующий адрес')
  await page.getByRole('button', { name: 'Повторить расчёт' }).click()
  await page.getByRole('alert').filter({ hasText: /Поиск адреса:/ }).waitFor()
  assert.equal(await address.inputValue(), 'несуществующий адрес')
  await page.route('https://nominatim.openstreetmap.org/**', (route) => route.fulfill({ json: [] }))
  await page.getByRole('button', { name: 'Повторить расчёт' }).click()
  await page.getByRole('alert').filter({ hasText: /Адрес не найден/ }).waitFor()
  await page.getByRole('button', { name: /Выбрать демонстрационный адрес/ }).click()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'desktop input overflow after error states')
  let requests = 0
  await page.route('**/api/optimize', async (route) => { requests++; await new Promise((resolve) => setTimeout(resolve, 300)); await route.continue() })
  const finalResponse = page.waitForResponse((r) => r.url().endsWith('/api/optimize'))
  await page.getByRole('button', { name: 'Найти покупателей и маршруты' }).evaluate((button) => { button.click(); button.click() })
  assert.ok(await page.getByRole('button', { name: /Рассчитываем/ }).isDisabled())
  assert.equal((await finalResponse).status(),200)
  assert.equal(requests,1)
  await page.getByRole('heading', { name:'Покупатели и маршруты', exact:true }).waitFor()
  await page.waitForTimeout(500)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'desktop buyers overflow after retry')
  await page.screenshot({path:'/tmp/harvest-buyers-1440.png',fullPage:true})
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({status:'PASS', originalProfit:original.plan.profit, increasedProfit:increased.plan.profit, disabledProfit:disabled.plan.profit, heights, coverage:unit.cases, checks:'real API finances and constraints; price retention; vehicle disabled; stale results; offline; alternatives; assumptions; direction details; desktop overflow; errors; double submit'},null,2))
} finally { await browser.close() }

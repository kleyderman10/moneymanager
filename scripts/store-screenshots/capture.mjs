// Genera las capturas para App Store y Play Store con datos demo.
// Uso (desde moneymanager/):
//   npm i --no-save playwright-core@1.63.0
//   npm run build            (o la app de producción en dist/)
//   node scripts/store-screenshots/capture.mjs
// Salida: scripts/store-screenshots/output/
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as fx from './fixtures.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const out = path.join(here, 'output')
const PORT = 4173
const BASE = `http://localhost:${PORT}`

// Tamaño final = viewport * deviceScaleFactor.
const DEVICES = [
  { dir: 'ios-iphone-6.9', viewport: { width: 440, height: 956 }, scale: 3, mobile: true }, // 1320x2868
  { dir: 'ipad-13', viewport: { width: 1032, height: 1376 }, scale: 2, mobile: true }, // 2064x2752
  { dir: 'android-phone', viewport: { width: 360, height: 640 }, scale: 3, mobile: true }, // 1080x1920
]

const SHOTS = [
  { name: 'dashboard', route: '/' },
  { name: 'movimientos', route: '/transactions' },
  { name: 'cuentas', route: '/wallets' },
  { name: 'tarjeta-movimientos', route: '/wallets', action: (p) => p.getByRole('button', { name: 'Movimientos' }).first().click() },
  { name: 'tarjeta-pagar', route: '/wallets', action: (p) => p.getByRole('button', { name: 'Pagar', exact: true }).first().click() },
  { name: 'presupuestos', route: '/budgets' },
  { name: 'metas', route: '/goals' },
  { name: 'reportes', route: '/reports' },
]

const json = (data, status = 200) => ({
  status,
  contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
  body: JSON.stringify(data),
})

const handleApi = (route) => {
  const req = route.request()
  if (req.method() === 'OPTIONS') return route.fulfill(json({}, 204))
  const { pathname } = new URL(req.url())
  const p = pathname.replace(/^.*\/api/, '')

  if (p === '/auth/me') return route.fulfill(json(fx.user))
  if (p === '/subscriptions/status') return route.fulfill(json(fx.subscriptionStatus))
  if (p === '/subscriptions/plans') return route.fulfill(json({ plans: [] }))
  if (p === '/categories') return route.fulfill(json(fx.categories))
  if (p === '/registers') return route.fulfill(json(fx.registers))
  if (p === '/registers/tags') return route.fulfill(json([]))
  if (p === '/summary') return route.fulfill(json(fx.summary))
  if (p === '/wallets') return route.fulfill(json(fx.wallets))
  if (/^\/wallets\/[^/]+\/payment-plan$/.test(p)) return route.fulfill(json(fx.paymentPlan))
  if (/^\/wallets\/[^/]+\/statement$/.test(p)) return route.fulfill(json(fx.cardStatement))
  if (p === '/budgets') return route.fulfill(json(fx.budgets))
  if (p === '/goals') return route.fulfill(json(fx.goals))
  if (p === '/credits') return route.fulfill(json([]))
  if (p === '/recurring') return route.fulfill(json([]))
  if (p === '/recurring/upcoming') return route.fulfill(json(fx.upcoming))
  if (p === '/recurring/process') return route.fulfill(json({}))
  if (p === '/simulations/capacity') return route.fulfill(json(fx.capacity))
  if (p === '/ai/insights') return route.fulfill(json(fx.insights))
  if (p === '/ai/health-score') return route.fulfill(json(fx.healthScore))
  if (p.startsWith('/reports/monthly/')) return route.fulfill(json(fx.monthlyReport))
  if (p.startsWith('/reports/yearly/')) return route.fulfill(json(fx.yearlyReport))
  return route.fulfill(json([]))
}

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch { /* aún no responde */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('vite preview no arrancó')
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, shell: true, stdio: 'ignore' })
const stop = () => { try { spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true, stdio: 'ignore' }) } catch { /* ya cerrado */ } }

try {
  await waitForServer()
  const browser = await chromium.launch()

  for (const device of DEVICES) {
    const dir = path.join(out, device.dir)
    await mkdir(dir, { recursive: true })
    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.scale,
      isMobile: device.mobile,
      hasTouch: true,
      locale: 'es-CO',
      colorScheme: 'dark',
    })
    await context.addInitScript(() => {
      localStorage.setItem('accessToken', 'demo')
      localStorage.setItem('refreshToken', 'demo')
    })
    await context.route(/\/api\//, handleApi)

    let n = 1
    for (const shot of SHOTS) {
      const page = await context.newPage()
      try {
        await page.goto(BASE + shot.route, { waitUntil: 'networkidle' })
        await page.addStyleTag({ content: '*{animation:none!important;transition:none!important;caret-color:transparent!important}' })
        await page.waitForTimeout(1200)
        if (shot.action) {
          await shot.action(page)
          await page.waitForTimeout(1200)
        }
        const file = path.join(dir, `${String(n).padStart(2, '0')}-${shot.name}.png`)
        await page.screenshot({ path: file })
        console.log('ok  ', path.relative(root, file))
        n++
      } catch (error) {
        console.log('FALLÓ', device.dir, shot.name, error.message.split('\n')[0])
      }
      await page.close()
    }
    await context.close()
  }

  // Feature graphic de Play Store (1024x500) con capturas reales dentro de marcos.
  const shotB64 = async (name) => (await readFile(path.join(out, 'android-phone', name))).toString('base64')
  const logo = (await readFile(path.join(root, 'src/assets/branding/knexura-flow-icon.png'))).toString('base64')
  const html = `<html><body style="margin:0;width:1024px;height:500px;overflow:hidden;background:linear-gradient(135deg,#071D29,#0E4A5C);font-family:Inter,Segoe UI,Arial,sans-serif;color:#fff;position:relative">
    <div style="position:absolute;left:64px;top:110px;width:460px">
      <img src="data:image/png;base64,${logo}" style="width:72px;height:72px;border-radius:18px" />
      <div style="font-size:46px;font-weight:800;line-height:1.1;margin-top:20px">Knexura Flow</div>
      <div style="font-size:22px;opacity:.85;margin-top:14px;line-height:1.35">Controla tus gastos, presupuestos y tarjetas de crédito en un solo lugar.</div>
    </div>
    ${[['01-dashboard.png', 590, 70, 0], ['04-tarjeta-movimientos.png', 780, 40, 0]].map(([f, x, y]) => `<img src="data:image/png;base64,__${f}__" style="position:absolute;left:${x}px;top:${y + 60}px;width:200px;border-radius:22px;border:4px solid #0b2a38;box-shadow:0 12px 30px rgba(0,0,0,.45)" />`).join('')}
  </body></html>`
  let finalHtml = html
  for (const f of ['01-dashboard.png', '04-tarjeta-movimientos.png']) {
    finalHtml = finalHtml.replace(`__${f}__`, await shotB64(f))
  }
  const fgContext = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 })
  const fgPage = await fgContext.newPage()
  await fgPage.setContent(finalHtml)
  await fgPage.waitForTimeout(300)
  await mkdir(path.join(out, 'play-feature-graphic'), { recursive: true })
  await fgPage.screenshot({ path: path.join(out, 'play-feature-graphic', 'feature-graphic-1024x500.png') })
  console.log('ok   feature graphic')

  await browser.close()
} finally {
  stop()
}

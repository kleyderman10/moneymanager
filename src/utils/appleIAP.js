import { Capacitor } from '@capacitor/core'
import { subscriptionsAPI } from '@/api'

// cordova-plugin-purchase is a Cordova (not Capacitor) plugin: it attaches a global
// `window.CdvPurchase` at runtime instead of exposing an ES module, so it's referenced
// directly rather than imported. It's absent entirely on web/dev builds.

// Product IDs arrive with the plans from our backend rather than being inlined at build
// time: a missing env file in CI used to compile them away to `undefined` silently, which
// ships an iOS paywall with no purchasable product and no legal fallback.
let productIdsByPlanCode = {}

export const configureAppleProducts = (plans = []) => {
  productIdsByPlanCode = plans.reduce((acc, plan) => {
    if (plan?.code && plan?.appleProductId) acc[plan.code] = plan.appleProductId
    return acc
  }, {})
}

const configuredProductIds = () => Object.values(productIdsByPlanCode)

// True on any native iOS build, regardless of whether cordova-plugin-purchase has
// finished attaching `window.CdvPurchase` yet. The UI must key off this (not
// isAppleIAPAvailable) to decide whether to ever offer a non-Apple checkout: Apple
// Guideline 3.1.1 requires digital subscriptions on iOS to go through Apple IAP only,
// and falling back to an external checkout just because the plugin hasn't loaded yet
// is itself a rejection risk (and is what likely hid the IAP from App Review).
export const isIOSNativePlatform = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
)

export const isAppleIAPAvailable = () => (
  isIOSNativePlatform()
  && configuredProductIds().length > 0
  && Boolean(window.CdvPurchase)
)

let readyPromise = null

// cordova-plugin-purchase attaches `window.CdvPurchase` asynchronously after the
// WebView loads, so a synchronous check can race the plugin on cold start. On iOS
// we wait (poll) for it instead of assuming it's missing.
export const waitForAppleIAPReady = (timeoutMs = 8000) => {
  if (!isIOSNativePlatform()) return Promise.resolve(false)
  if (readyPromise) return readyPromise

  readyPromise = new Promise((resolve) => {
    if (window.CdvPurchase) {
      resolve(true)
      return
    }
    const start = Date.now()
    const interval = setInterval(() => {
      if (window.CdvPurchase) {
        clearInterval(interval)
        resolve(true)
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        resolve(false)
      }
    }, 100)
  })
  return readyPromise
}

let setupPromise = null
let pendingPurchase = null
let registeredProductIds = []
// Keyed by product ID: what StoreKit said when it refused to load that product.
const loadErrors = new Map()

// StoreKit reports an unknown identifier by returning it in `invalidProductIdentifiers`,
// which the plugin surfaces as INVALID_PRODUCT_ID / "Product not found in AppStore. #400".
// That answer comes from Apple, not from our code, so the fix is always in App Store
// Connect — say so instead of showing the raw plugin string.
const describeLoadFailure = (productId) => {
  const reported = loadErrors.get(productId)
  const detail = reported ? ` (App Store respondió: ${reported})` : ''
  return `App Store no reconoce el producto "${productId}"${detail}. `
    + 'Verifica en App Store Connect que el ID del producto coincida exactamente, que el '
    + 'Contrato de Aplicaciones de Pago esté activo, que la suscripción esté disponible en '
    + 'tu país y que se haya enviado junto con una versión de la app.'
}

const setup = () => {
  if (setupPromise) return setupPromise

  setupPromise = (async () => {
    const { store, ProductType, Platform } = window.CdvPurchase

    registeredProductIds = configuredProductIds()
    store.register(registeredProductIds.map((id) => ({
      type: ProductType.AUTO_RENEWABLE_SUBSCRIPTION,
      id,
      platform: Platform.APPLE_APPSTORE,
    })))

    store.error((error) => {
      if (error?.productId) loadErrors.set(error.productId, error.message || `código ${error.code}`)
    })

    // Verification happens on our own backend (App Store Server API), not the plugin's
    // built-in receipt-validation service, so we skip transaction.verify()/.verified() and
    // go straight from "approved" to our /apple/verify endpoint, then finish() ourselves.
    store.when().approved(async (transaction) => {
      const settled = pendingPurchase
      pendingPurchase = null
      try {
        const originalTransactionId = transaction.originalTransactionId || transaction.transactionId
        await subscriptionsAPI.verifyApplePurchase(originalTransactionId)
        await transaction.finish()
        settled?.resolve({ success: true })
      } catch (e) {
        settled?.resolve({ success: false, message: e.response?.data?.message || e.message || 'No se pudo verificar la compra' })
      }
    })

    const errors = await store.initialize([Platform.APPLE_APPSTORE])

    // initialize() reports per-product load failures alongside genuine platform failures.
    // A rejected product ID must not abort the whole setup: the other tiers may be fine,
    // and blowing up here used to surface Apple's "#400" as if the store were unreachable.
    const { ErrorCode } = window.CdvPurchase
    const fatal = (errors || []).filter((e) => {
      if (e?.productId) {
        loadErrors.set(e.productId, e.message || `código ${e.code}`)
        return false
      }
      return e?.code !== ErrorCode.INVALID_PRODUCT_ID
    })
    if (fatal.length) {
      throw new Error(fatal[0]?.message || 'No se pudo inicializar App Store')
    }

    // initialize() resolves once the platform adapter is set up — it does NOT wait for
    // Apple to actually return each product's pricing/offer data, which arrives
    // separately and asynchronously. Checking product.getOffer() right after initialize()
    // races that fetch and was coming back empty on essentially every first attempt,
    // surfacing as "El producto de suscripción no está disponible todavía" even for a
    // correctly configured product. store.ready() is the plugin's own signal that every
    // registered product has finished loading; wait for it (with a timeout, in case the
    // App Store Connect side is genuinely unreachable/misconfigured) before returning.
    await new Promise((resolve) => {
      if (store.isReady) { resolve(); return }
      const timeout = setTimeout(resolve, 8000)
      store.ready(() => { clearTimeout(timeout); resolve() })
    })
  })()

  return setupPromise
}

// Guideline 3.1.1 requires a way to restore an auto-renewable subscription on a new
// device or after a reinstall. restorePurchases() replays owned transactions through the
// same approved() handler above, so our backend re-verifies them and the entitlement
// comes back without charging again.
export const restoreApplePurchases = async () => {
  if (!isAppleIAPAvailable()) {
    return { success: false, message: 'Las compras de App Store no están disponibles en este dispositivo' }
  }

  try {
    await setup()
  } catch (e) {
    setupPromise = null
    return { success: false, message: e.message || 'No se pudo conectar con App Store' }
  }

  try {
    await window.CdvPurchase.store.restorePurchases()
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message || 'No se pudieron restaurar tus compras' }
  }
}

export const purchaseAppleSubscription = async (planCode) => {
  const productId = productIdsByPlanCode[planCode]
  if (!isAppleIAPAvailable() || !productId) {
    return { success: false, message: 'Este plan no está disponible como compra dentro de la app' }
  }

  // The plan list can arrive after setup() already registered an older (or empty) set of
  // product IDs, which would leave this product permanently unknown to the store.
  if (setupPromise && !registeredProductIds.includes(productId)) {
    setupPromise = null
    loadErrors.clear()
  }

  try {
    await setup()
  } catch (e) {
    setupPromise = null
    return { success: false, message: e.message || 'No se pudo conectar con App Store' }
  }

  const { store } = window.CdvPurchase
  const product = store.get(productId)
  if (!product) {
    // Distinct from "no offer yet": the store never returned this product ID at all,
    // which (now that setup() waits for store.ready()) points to a real App Store
    // Connect mismatch rather than a loading race.
    return { success: false, message: describeLoadFailure(productId) }
  }
  const offer = product.getOffer()
  if (!offer) {
    return { success: false, message: 'El producto de suscripción no tiene una oferta de precio configurada todavía' }
  }

  return new Promise((resolve) => {
    pendingPurchase = { resolve }
    store.order(offer).then((err) => {
      if (err && pendingPurchase) {
        pendingPurchase = null
        resolve({ success: false, message: err.message || 'No se pudo iniciar la compra' })
      }
    })
  })
}

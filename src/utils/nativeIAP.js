import { Capacitor } from '@capacitor/core'
import { subscriptionsAPI } from '@/api'
import { i18n } from '@/i18n'

const t = i18n.global.t

// cordova-plugin-purchase is a Cordova (not Capacitor) plugin: it attaches a global
// `window.CdvPurchase` at runtime instead of exposing an ES module, so it's referenced
// directly rather than imported. It's absent entirely on web/dev builds.

// Product IDs arrive with the plans from our backend rather than being inlined at build
// time: a missing env file in CI used to compile them away to `undefined` silently, which
// ships a paywall with no purchasable product and no legal fallback. Apple and Google need
// different IDs because Play only accepts lowercase letters, digits, "_" and ".".
let productIdsByPlanCode = {}

const STORES = {
  ios: {
    platformKey: 'APPLE_APPSTORE',
    planField: 'appleProductId',
    name: 'App Store',
    get manageHint() { return t('nativeIAP.iosManageHint') },
    get configHint() { return t('nativeIAP.iosConfigHint') },
    verify: (transaction) => subscriptionsAPI.verifyApplePurchase(
      transaction.originalTransactionId || transaction.transactionId
    ),
  },
  android: {
    platformKey: 'GOOGLE_PLAY',
    planField: 'googleProductId',
    name: 'Google Play',
    get manageHint() { return t('nativeIAP.androidManageHint') },
    get configHint() { return t('nativeIAP.androidConfigHint') },
    // Play identifies a subscription by its purchase token, which stays stable across
    // automatic renewals — the equivalent of Apple's originalTransactionId. On the
    // transaction that token is exposed as `purchaseId`; `purchaseToken` itself lives on
    // the parent receipt, and `transactionId` is the per-renewal orderId, so neither of
    // those is the identifier the backend must key the subscription on.
    verify: (transaction) => subscriptionsAPI.verifyGooglePurchase(
      transaction.purchaseId || transaction.parentReceipt?.purchaseToken
    ),
  },
}

const currentStore = () => (Capacitor.isNativePlatform() ? STORES[Capacitor.getPlatform()] : null)

export const configureNativeProducts = (plans = []) => {
  const store = currentStore()
  if (!store) {
    productIdsByPlanCode = {}
    return
  }
  productIdsByPlanCode = plans.reduce((acc, plan) => {
    const productId = plan?.[store.planField]
    if (plan?.code && productId) acc[plan.code] = productId
    return acc
  }, {})
}

const configuredProductIds = () => Object.values(productIdsByPlanCode)

// True on any native build, regardless of whether cordova-plugin-purchase has finished
// attaching `window.CdvPurchase` yet. The UI must key off this (not isNativeIAPAvailable)
// to decide whether to ever offer an external checkout: Apple Guideline 3.1.1 and Google
// Play's Payments policy both require in-app digital subscriptions to go through the
// store's own billing, and falling back to a web checkout just because the plugin hasn't
// loaded yet is itself grounds for rejection or removal.
export const isNativePlatform = () => Boolean(currentStore())

export const isNativeIAPAvailable = () => (
  isNativePlatform()
  && configuredProductIds().length > 0
  && Boolean(window.CdvPurchase)
)

let readyPromise = null

// cordova-plugin-purchase attaches `window.CdvPurchase` asynchronously after the WebView
// loads, so a synchronous check can race the plugin on cold start. We wait (poll) for it
// instead of assuming it's missing.
export const waitForNativeIAPReady = (timeoutMs = 8000) => {
  if (!isNativePlatform()) return Promise.resolve(false)
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
// Keyed by product ID: what the store said when it refused to load that product.
const loadErrors = new Map()

// A store reports an unknown identifier by returning it among the invalid ones, which the
// plugin surfaces as INVALID_PRODUCT_ID (Apple's variant reads "Product not found in
// AppStore. #400"). That answer comes from the store, not from our code, so the fix is
// always in App Store Connect or Play Console — say so instead of showing the raw string.
const describeLoadFailure = (productId) => {
  const store = currentStore()
  const reported = loadErrors.get(productId)
  const detail = reported ? ` (${t('nativeIAP.storeResponded', { store: store.name, reported })})` : ''
  return `${t('nativeIAP.productNotRecognized', { store: store.name, productId })}${detail}. ${store.configHint}`
}

const setup = () => {
  if (setupPromise) return setupPromise

  setupPromise = (async () => {
    const { store, ProductType, Platform } = window.CdvPurchase
    const platform = Platform[currentStore().platformKey]

    registeredProductIds = configuredProductIds()
    store.register(registeredProductIds.map((id) => ({
      // PAID_SUBSCRIPTION is what this plugin version exposes; the previously used
      // AUTO_RENEWABLE_SUBSCRIPTION does not exist on CdvPurchase.ProductType and left the
      // type undefined, which on Android decides whether Play is queried for SUBS or INAPP.
      type: ProductType.PAID_SUBSCRIPTION,
      id,
      platform,
    })))

    store.error((error) => {
      if (error?.productId) loadErrors.set(error.productId, error.message || t('nativeIAP.code', { code: error.code }))
    })

    // Verification happens on our own backend (App Store Server API / Play Developer API),
    // not the plugin's built-in receipt-validation service, so we skip transaction.verify()
    // and go straight from "approved" to our verify endpoint, then finish() ourselves.
    // finish() is also what acknowledges the purchase to Play, which must happen within
    // three days or Google automatically refunds it.
    store.when().approved(async (transaction) => {
      const settled = pendingPurchase
      pendingPurchase = null
      try {
        await currentStore().verify(transaction)
        await transaction.finish()
        settled?.resolve({ success: true })
      } catch (e) {
        settled?.resolve({ success: false, message: e.response?.data?.message || e.message || t('nativeIAP.verifyPurchaseError') })
      }
    })

    const errors = await store.initialize([platform])

    // initialize() reports per-product load failures alongside genuine platform failures.
    // A rejected product ID must not abort the whole setup: the other tiers may be fine,
    // and blowing up here used to surface Apple's "#400" as if the store were unreachable.
    const { ErrorCode } = window.CdvPurchase
    const fatal = (errors || []).filter((e) => {
      if (e?.productId) {
        loadErrors.set(e.productId, e.message || t('nativeIAP.code', { code: e.code }))
        return false
      }
      return e?.code !== ErrorCode.INVALID_PRODUCT_ID
    })
    if (fatal.length) {
      throw new Error(fatal[0]?.message || t('nativeIAP.initError', { store: currentStore().name }))
    }

    // initialize() resolves once the platform adapter is set up — it does NOT wait for the
    // store to actually return each product's pricing/offer data, which arrives separately
    // and asynchronously. Checking product.getOffer() right after initialize() races that
    // fetch and was coming back empty on essentially every first attempt, surfacing as "no
    // hay oferta todavía" even for a correctly configured product. store.ready() is the
    // plugin's own signal that every registered product finished loading; wait for it (with
    // a timeout, in case the store side is genuinely unreachable/misconfigured).
    await new Promise((resolve) => {
      if (store.isReady) { resolve(); return }
      const timeout = setTimeout(resolve, 8000)
      store.ready(() => { clearTimeout(timeout); resolve() })
    })
  })()

  return setupPromise
}

// Apple Guideline 3.1.1 and Play's policy both require a way to restore an auto-renewable
// subscription on a new device or after a reinstall. restorePurchases() replays owned
// transactions through the same approved() handler above, so our backend re-verifies them
// and the entitlement comes back without charging again.
export const restoreNativePurchases = async () => {
  if (!isNativeIAPAvailable()) {
    return { success: false, message: t('nativeIAP.inAppPurchasesUnavailable') }
  }

  try {
    await setup()
  } catch (e) {
    setupPromise = null
    return { success: false, message: e.message || t('nativeIAP.connectError', { store: currentStore().name }) }
  }

  try {
    await window.CdvPurchase.store.restorePurchases()
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message || t('nativeIAP.restoreError') }
  }
}

export const purchaseNativeSubscription = async (planCode) => {
  const productId = productIdsByPlanCode[planCode]
  if (!isNativeIAPAvailable() || !productId) {
    return { success: false, message: t('nativeIAP.planNotAvailable') }
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
    return { success: false, message: e.message || t('nativeIAP.connectError', { store: currentStore().name }) }
  }

  const { store } = window.CdvPurchase
  const product = store.get(productId)
  if (!product) {
    // Distinct from "no offer yet": the store never returned this product ID at all, which
    // (now that setup() waits for store.ready()) points to a real store-side mismatch
    // rather than a loading race.
    return { success: false, message: describeLoadFailure(productId) }
  }
  const offer = product.getOffer()
  if (!offer) {
    return { success: false, message: t('nativeIAP.noOfferConfigured') }
  }

  return new Promise((resolve) => {
    pendingPurchase = { resolve }
    store.order(offer).then((err) => {
      if (err && pendingPurchase) {
        pendingPurchase = null
        resolve({ success: false, message: err.message || t('nativeIAP.startPurchaseError') })
      }
    })
  })
}

// Where the user manages or cancels an existing subscription, for the paywall disclosure.
export const storeManageHint = () => currentStore()?.manageHint || ''
export const storeName = () => currentStore()?.name || ''

import { Capacitor } from '@capacitor/core'
import { subscriptionsAPI } from '@/api'

// cordova-plugin-purchase is a Cordova (not Capacitor) plugin: it attaches a global
// `window.CdvPurchase` at runtime instead of exposing an ES module, so it's referenced
// directly rather than imported. It's absent entirely on web/dev builds.
const PRODUCT_IDS_BY_PLAN_CODE = {
  'personal-monthly': import.meta.env.VITE_APPLE_IAP_PRODUCT_ID_MONTHLY || null,
  'personal-quarterly': import.meta.env.VITE_APPLE_IAP_PRODUCT_ID_QUARTERLY || null,
  'personal-annual': import.meta.env.VITE_APPLE_IAP_PRODUCT_ID_ANNUAL || null,
}
const CONFIGURED_PRODUCT_IDS = Object.values(PRODUCT_IDS_BY_PLAN_CODE).filter(Boolean)

export const isAppleIAPAvailable = () => (
  Capacitor.isNativePlatform()
  && Capacitor.getPlatform() === 'ios'
  && CONFIGURED_PRODUCT_IDS.length > 0
  && Boolean(window.CdvPurchase)
)

let setupPromise = null
let pendingPurchase = null

const setup = () => {
  if (setupPromise) return setupPromise

  setupPromise = (async () => {
    const { store, ProductType, Platform } = window.CdvPurchase

    store.register(CONFIGURED_PRODUCT_IDS.map((id) => ({
      type: ProductType.AUTO_RENEWABLE_SUBSCRIPTION,
      id,
      platform: Platform.APPLE_APPSTORE,
    })))

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
    if (errors?.length) {
      throw new Error(errors[0]?.message || 'No se pudo inicializar App Store')
    }
  })()

  return setupPromise
}

export const purchaseAppleSubscription = async (planCode) => {
  const productId = PRODUCT_IDS_BY_PLAN_CODE[planCode]
  if (!isAppleIAPAvailable() || !productId) {
    return { success: false, message: 'Este plan no está disponible como compra dentro de la app' }
  }

  try {
    await setup()
  } catch (e) {
    setupPromise = null
    return { success: false, message: e.message || 'No se pudo conectar con App Store' }
  }

  const { store } = window.CdvPurchase
  const product = store.get(productId)
  const offer = product?.getOffer()
  if (!offer) {
    return { success: false, message: 'El producto de suscripción no está disponible todavía' }
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

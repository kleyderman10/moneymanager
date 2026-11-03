import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

// En la app nativa `location.origin` es el servidor interno de Capacitor, no sirve para un enlace
// que otra persona abrirá: se usa el dominio público.
const PUBLIC_BASE_URL = (import.meta.env.VITE_PUBLIC_URL || 'https://moneymanager-e7fa9ac13e3f.herokuapp.com').replace(/\/$/, '')

export const buildSplitUrl = (path) => `${Capacitor.isNativePlatform() ? PUBLIC_BASE_URL : window.location.origin}${path}`

// Abre la hoja de compartir del sistema (AirDrop, Quick Share, WhatsApp...). Si no existe,
// copia el enlace. Devuelve 'shared' | 'copied' | 'cancelled'.
export const shareLink = async ({ title, text, url }) => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, url, dialogTitle: title })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return 'shared'
    }
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch (error) {
    if (error?.name === 'AbortError' || /cancel/i.test(error?.message || '')) return 'cancelled'
    throw error
  }
}

import { Capacitor } from '@capacitor/core'
import { version } from '../../package.json'

// Plataforma desde la que se usa Flow: app Android/iOS, web instalada (PWA) o navegador.
// Se manda en cada petición para que el panel de administración muestre desde dónde se
// instala e ingresa la gente.
export const getClientPlatform = () => {
  const native = Capacitor.getPlatform()
  if (native === 'android' || native === 'ios') return native
  try {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
    return standalone ? 'pwa' : 'web'
  } catch {
    return 'web'
  }
}

export const APP_VERSION = version

import { Capacitor, registerPlugin } from '@capacitor/core'

// Servicio nativo de Android que lee las notificaciones de las apps del banco. En iPhone y en la
// web no existe: iOS no permite leer notificaciones de otras apps (ahí se usa un Atajo).
export const NotificationCapture = registerPlugin('NotificationCapture')

export const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

// Apps desde las que se escuchan avisos. El filtro por contenido (monto + palabra de movimiento)
// se aplica además en el dispositivo, así que una app de esta lista que no envíe cobros se ignora.
// Los paquetes de bancos hay que validarlos con la app instalada de cada banco: agregar uno aquí
// no requiere cambios nativos.
export const BANK_PACKAGES = [
  // Bancos y billeteras
  'com.todo1.mobile', // Bancolombia
  'com.nequi.MobileApp', // Nequi
  'com.davivienda.daviplataapp', // Daviplata
  'com.nu.production', // Nu
  // SMS: muchos bancos avisan por mensaje de texto
  'com.google.android.apps.messaging',
  'com.samsung.android.messaging',
  'com.android.mms',
]

export const apiBaseUrl = () => import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`

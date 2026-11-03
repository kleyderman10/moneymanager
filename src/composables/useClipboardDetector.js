import { onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { usePendingStore } from '@/stores/pending'
import { useSnackbar } from '@/stores/snackbar'

const SEEN_KEY = 'pendingClipboardSeen'
const LOOKS_LIKE_BANK = /(\$\s?\d|\bCOP\b)/i
const HAS_ACTION = /(compra|compraste|pagaste|pago|retiro|retiraste|enviaste|transferiste|recibiste|recibi[oó]|abono|consignaci[oó]n|dep[oó]sito|n[oó]mina|d[eé]bito|cargo)/i

const hash = (text) => {
  let h = 0
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0
  return String(h)
}

const lastSeen = () => { try { return localStorage.getItem(SEEN_KEY) } catch { return null } }
const markSeen = (value) => { try { localStorage.setItem(SEEN_KEY, value) } catch { /* sin almacenamiento */ } }

// Al volver a la app, si el portapapeles trae un aviso del banco, lo manda a la bandeja "Por
// confirmar". Solo actúa si el permiso de lectura ya fue concedido (nunca lo pide por su cuenta)
// y cada texto se procesa una sola vez. Nada se registra sin que el usuario lo confirme.
export const useClipboardDetector = () => {
  const { t } = useI18n()
  const router = useRouter()
  const pending = usePendingStore()
  const snackbar = useSnackbar()
  let running = false

  const check = async () => {
    if (running || document.visibilityState !== 'visible') return
    if (!navigator.clipboard?.readText || !navigator.permissions?.query) return
    running = true
    try {
      const permission = await navigator.permissions.query({ name: 'clipboard-read' })
      if (permission.state !== 'granted') return
      const text = (await navigator.clipboard.readText()).slice(0, 1000).trim()
      if (text.length < 8 || !LOOKS_LIKE_BANK.test(text) || !HAS_ACTION.test(text)) return
      const key = hash(text)
      if (key === lastSeen()) return
      markSeen(key)
      const { duplicate } = await pending.addFromText(text, 'clipboard')
      if (!duplicate) snackbar.withAction(t('pending.detected'), t('pending.review'), () => router.push('/pending'))
    } catch { /* el texto no era un aviso reconocible o no hay permiso */ } finally {
      running = false
    }
  }

  onMounted(() => {
    check()
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    pending.fetchCount()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('focus', check)
    document.removeEventListener('visibilitychange', check)
  })
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const chatStream = vi.fn()
const chat = vi.fn()
const getConversations = vi.fn()
const getConversation = vi.fn()
const deleteConversation = vi.fn()

vi.mock('@/api', () => ({ aiAPI: { chatStream: (...args) => chatStream(...args), chat: (...args) => chat(...args), getChatHistory: vi.fn(), clearChat: vi.fn(), getConversations: (...a) => getConversations(...a), getConversation: (...a) => getConversation(...a), deleteConversation: (...a) => deleteConversation(...a) } }))

vi.mock('@/i18n', () => ({ i18n: { global: { t: (key) => key } } }))

const memory = new Map()
vi.stubGlobal('localStorage', {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
})

const sse = (events) => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''))

describe('aiChat store (streaming)', () => {
  let useAiChatStore

  beforeEach(async () => {
    vi.resetAllMocks()
    getConversations.mockResolvedValue({ data: [] })
    memory.clear()
    setActivePinia(createPinia())
    ;({ useAiChatStore } = await import('./aiChat'))
  })

  it('arma la respuesta por partes y al final adopta el historial del servidor', async () => {
    chatStream.mockResolvedValue(sse([
      { type: 'tool', name: 'getBudgets', status: 'start' },
      { type: 'tool', name: 'getBudgets', status: 'done' },
      { type: 'text', delta: 'Vas ' },
      { type: 'text', delta: 'bien' },
      { type: 'done', stopped: false, messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: 'Vas bien' }] },
    ]))
    const store = useAiChatStore()
    await store.sendMessage('hola')
    expect(store.messages.map((m) => m.content)).toEqual(['hola', 'Vas bien'])
    expect(store.loading).toBe(false)
    expect(store.streaming).toBe(false)
    expect(store.error).toBeNull()
  })

  it('guarda el medidor de uso que envía el servidor y limpia el contexto al cambiar de conversación', async () => {
    const usage = { context: { pct: 72, level: 'warn', compacted: false }, quota: { remaining: 3, level: 'ok', period: 'day', pct: 40 } }
    chatStream.mockResolvedValue(sse([{ type: 'done', messages: [], usage }]))
    const store = useAiChatStore()
    await store.sendMessage('hola')
    expect(store.usage.context.pct).toBe(72)
    store.newConversation()
    expect(store.usage.context).toBeNull()
    expect(store.usage.quota.remaining).toBe(3)
  })

  it('adjunta las tarjetas a la respuesta y guarda las sugerencias; se limpian al preguntar de nuevo', async () => {
    const card = { kind: 'goals', items: [] }
    chatStream.mockResolvedValue(sse([
      { type: 'block', block: card },
      { type: 'text', delta: 'Vas bien' },
      { type: 'done', stopped: false, messages: [], suggestions: ['Resume mi mes'] },
    ]))
    const store = useAiChatStore()
    await store.sendMessage('metas')
    expect(store.messages.at(-1).blocks).toEqual([card])
    expect(store.suggestions).toEqual(['Resume mi mes'])
    chatStream.mockResolvedValue(sse([{ type: 'done', messages: [] }]))
    await store.regenerate()
    expect(chatStream).toHaveBeenLastCalledWith('metas', expect.anything())
    expect(store.suggestions).toEqual([])
  })

  it('no crea burbuja del asistente hasta que llega texto', async () => {
    let release
    chatStream.mockImplementation(() => new Promise((resolve) => { release = () => resolve(sse([{ type: 'done', messages: [] }])) }))
    const store = useAiChatStore()
    const pending = store.sendMessage('hola')
    await Promise.resolve()
    expect(store.loading).toBe(true)
    expect(store.messages).toHaveLength(1)
    release()
    await pending
  })

  it('si el servidor no acepta el stream (no 2xx) repite la consulta con axios', async () => {
    chatStream.mockResolvedValue(new Response('{}', { status: 402 }))
    chat.mockResolvedValue({ data: { reply: 'ok', messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: 'ok' }] } })
    const store = useAiChatStore()
    await store.sendMessage('hola')
    expect(chat).toHaveBeenCalledWith('hola', expect.objectContaining({ brief: false }))
    expect(store.messages.at(-1).content).toBe('ok')
  })

  it('detener conserva el texto ya recibido y no marca error', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    chatStream.mockImplementation((_text, { signal }) => Promise.resolve(new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text', delta: 'parcial' })}\n\n`))
        signal.addEventListener('abort', () => controller.error(abortError))
      },
    }))))
    const store = useAiChatStore()
    const pending = store.sendMessage('hola')
    await vi.waitFor(() => expect(store.streaming).toBe(true))
    store.stop()
    await pending
    expect(store.messages.map((m) => m.content)).toEqual(['hola', 'parcial'])
    expect(store.error).toBeNull()
    expect(store.lastFailed).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('un evento de error muestra el error y permite reintentar', async () => {
    chatStream.mockResolvedValue(sse([{ type: 'error', code: 'AI_ERROR', message: 'Error al procesar la consulta AI' }]))
    const store = useAiChatStore()
    await store.sendMessage('hola')
    expect(store.error).toBe('Error al procesar la consulta AI')
    expect(store.lastFailed).toBe('hola')
  })

  it('envía la preferencia de respuestas breves', async () => {
    chatStream.mockResolvedValue(sse([{ type: 'done', messages: [] }]))
    const store = useAiChatStore()
    store.setBrief(true)
    await store.sendMessage('hola')
    expect(chatStream).toHaveBeenCalledWith('hola', expect.objectContaining({ brief: true }))
  })
})

describe('aiChat store (conversaciones)', () => {
  let useAiChatStore

  beforeEach(async () => {
    vi.resetAllMocks()
    memory.clear()
    getConversations.mockResolvedValue({ data: [] })
    setActivePinia(createPinia())
    ;({ useAiChatStore } = await import('./aiChat'))
  })

  it('al abrir el chat muestra la conversación más reciente', async () => {
    getConversations.mockResolvedValue({ data: [{ id: 'c2', title: 'Reciente' }, { id: 'c1', title: 'Antigua' }] })
    getConversation.mockResolvedValue({ data: { id: 'c2', messages: [{ role: 'user', content: 'hola' }] } })
    const store = useAiChatStore()
    await store.fetchHistory()
    expect(getConversation).toHaveBeenCalledWith('c2')
    expect(store.currentId).toBe('c2')
    expect(store.messages).toHaveLength(1)
  })

  it('el primer mensaje adopta el id y el siguiente continúa esa conversación', async () => {
    chatStream.mockResolvedValue(sse([
      { type: 'meta', conversationId: 'c9' },
      { type: 'text', delta: 'Hola' },
      { type: 'done', stopped: false, conversationId: 'c9', messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'Hola' }] },
    ]))
    const store = useAiChatStore()
    await store.sendMessage('a')
    expect(chatStream.mock.calls[0][1]).toMatchObject({ conversationId: null, newConversation: false })
    expect(store.currentId).toBe('c9')

    chatStream.mockResolvedValue(sse([{ type: 'done', stopped: false, conversationId: 'c9', messages: [] }]))
    await store.sendMessage('b')
    expect(chatStream.mock.calls[1][1]).toMatchObject({ conversationId: 'c9', newConversation: false })
  })

  it('nueva conversación vacía el chat y el siguiente mensaje pide crear otra', async () => {
    getConversations.mockResolvedValue({ data: [{ id: 'c1', title: 'A' }] })
    getConversation.mockResolvedValue({ data: { id: 'c1', messages: [{ role: 'user', content: 'a' }] } })
    const store = useAiChatStore()
    await store.fetchHistory()
    store.newConversation()
    expect(store.messages).toEqual([])
    expect(store.currentId).toBeNull()

    chatStream.mockResolvedValue(sse([{ type: 'done', stopped: false, conversationId: 'c2', messages: [] }]))
    await store.sendMessage('otra')
    expect(chatStream.mock.calls[0][1]).toMatchObject({ conversationId: null, newConversation: true })
    expect(store.currentId).toBe('c2')
  })

  it('tras una nueva conversación, abrir el chat de nuevo no salta a la anterior', async () => {
    getConversations.mockResolvedValue({ data: [{ id: 'c1', title: 'A' }] })
    const store = useAiChatStore()
    store.newConversation()
    await store.fetchHistory()
    expect(getConversation).not.toHaveBeenCalled()
    expect(store.messages).toEqual([])
  })

  it('eliminar la conversación abierta abre la siguiente', async () => {
    getConversations.mockResolvedValue({ data: [{ id: 'c2', title: 'B' }, { id: 'c1', title: 'A' }] })
    getConversation.mockImplementation((id) => Promise.resolve({ data: { id, messages: [{ role: 'user', content: id }] } }))
    deleteConversation.mockResolvedValue({})
    const store = useAiChatStore()
    await store.fetchHistory()
    expect(store.currentId).toBe('c2')
    await store.deleteConversation('c2')
    expect(deleteConversation).toHaveBeenCalledWith('c2')
    expect(store.conversations.map((c) => c.id)).toEqual(['c1'])
    expect(store.currentId).toBe('c1')
  })

  it('si el servidor no puede borrar, la conversación se conserva', async () => {
    getConversations.mockResolvedValue({ data: [{ id: 'c1', title: 'A' }] })
    deleteConversation.mockRejectedValue(new Error('red'))
    const store = useAiChatStore()
    await store.fetchConversations()
    await store.deleteConversation('c1')
    expect(store.conversations).toHaveLength(1)
  })
})

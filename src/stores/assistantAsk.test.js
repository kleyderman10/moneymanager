import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const chatStream = vi.fn()
vi.mock('@/api', () => ({ aiAPI: { chatStream: (...args) => chatStream(...args) }, assistantAPI: {} }))
vi.mock('@/stores/categories', () => ({ useCategoriesStore: () => ({}) }))

const sse = (events, init) => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), init)

describe('assistant store: preguntas abiertas con el motor del chat', () => {
  let store

  beforeEach(async () => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    const { useAssistantStore } = await import('./assistant')
    store = useAssistantStore()
  })

  it('arma la respuesta por partes, avisa cada trozo y la deja en el historial', async () => {
    chatStream.mockResolvedValue(sse([
      { type: 'text', delta: 'Gastaste ' },
      { type: 'text', delta: 'mucho.' },
      { type: 'done', messages: [] },
    ]))
    const chunks = []
    const reply = await store.ask('¿por qué gasté tanto?', { onDelta: (d) => chunks.push(d) })
    expect(reply).toBe('Gastaste mucho.')
    expect(chunks).toEqual(['Gastaste ', 'mucho.'])
    expect(store.thread.at(-1)).toEqual({ role: 'assistant', content: 'Gastaste mucho.' })
    expect(store.history.at(-1).content).toBe('Gastaste mucho.')
    expect(store.state).toBe('result')
    expect(chatStream).toHaveBeenCalledWith('¿por qué gasté tanto?', { brief: true, newConversation: false })
  })

  it('«nueva conversación» abre un hilo nuevo solo en la siguiente pregunta', async () => {
    chatStream.mockImplementation(async () => sse([{ type: 'text', delta: 'Ok.' }, { type: 'done', messages: [] }]))
    store.nextAskNew = true
    await store.ask('hola')
    await store.ask('otra')
    expect(chatStream.mock.calls[0][1].newConversation).toBe(true)
    expect(chatStream.mock.calls[1][1].newConversation).toBe(false)
  })

  it('un rechazo del servidor (p. ej. sin Pro) o un evento de error muestran el mensaje', async () => {
    chatStream.mockResolvedValue(new Response(JSON.stringify({ message: 'Necesitas Pro' }), { status: 402 }))
    expect(await store.ask('hola')).toBeNull()
    expect(store.state).toBe('error')
    expect(store.result.reply).toBe('Necesitas Pro')

    chatStream.mockResolvedValue(sse([{ type: 'error', message: 'Falló' }]))
    await store.ask('hola')
    expect(store.result.reply).toBe('Falló')
  })
})

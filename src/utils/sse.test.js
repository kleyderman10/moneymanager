import { describe, expect, it } from 'vitest'
import { readSSE } from './sse'

const events = async (response) => {
  const out = []
  for await (const event of readSSE(response)) out.push(event)
  return out
}

const streamOf = (chunks) => new Response(new ReadableStream({
  start(controller) {
    const encoder = new TextEncoder()
    chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
    controller.close()
  },
}))

describe('readSSE', () => {
  it('parsea eventos completos', async () => {
    const response = streamOf(['data: {"type":"text","delta":"Hola"}\n\ndata: {"type":"done"}\n\n'])
    expect(await events(response)).toEqual([{ type: 'text', delta: 'Hola' }, { type: 'done' }])
  })

  it('une un evento partido entre varios fragmentos', async () => {
    const response = streamOf(['data: {"type":"te', 'xt","delta":"mu', 'ndo"}\n', '\ndata: {"type":"done"}\n\n'])
    expect(await events(response)).toEqual([{ type: 'text', delta: 'mundo' }, { type: 'done' }])
  })

  it('acepta saltos de línea CRLF y un último evento sin cierre', async () => {
    const response = streamOf(['data: {"a":1}\r\n\r\ndata: {"b":2}'])
    expect(await events(response)).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('ignora bloques que no son JSON válido', async () => {
    const response = streamOf([': ping\n\ndata: no-es-json\n\ndata: {"ok":true}\n\n'])
    expect(await events(response)).toEqual([{ ok: true }])
  })

  it('sin cuerpo en streaming lee el texto completo', async () => {
    const response = { text: async () => 'data: {"type":"text","delta":"A"}\n\ndata: {"type":"done"}\n\n' }
    expect(await events(response)).toEqual([{ type: 'text', delta: 'A' }, { type: 'done' }])
  })
})

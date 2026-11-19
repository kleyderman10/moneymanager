// Lector de Server-Sent Events para fetch(). Cada bloque `data: {json}` se devuelve ya parseado.
// Si el entorno no ofrece un cuerpo en streaming (algunas WebViews con el HTTP nativo de Capacitor
// entregan la respuesta completa de una vez), se lee el texto entero y se emiten los mismos
// eventos al terminar: la UI funciona igual, solo sin efecto de escritura progresiva.

const parseBlock = (block) => {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''));
  if (!data.length) return null
  try {
    return JSON.parse(data.join('\n'))
  } catch {
    return null
  }
}

const splitBlocks = (buffer) => {
  const blocks = []
  let rest = buffer
  let cut
  while ((cut = rest.search(/\r?\n\r?\n/)) !== -1) {
    blocks.push(rest.slice(0, cut))
    rest = rest.slice(cut).replace(/^\r?\n\r?\n/, '')
  }
  return { blocks, rest }
}

export async function* readSSE(response) {
  const reader = response.body?.getReader?.()
  if (!reader) {
    const { blocks, rest } = splitBlocks(await response.text())
    for (const block of [...blocks, rest]) {
      const event = parseBlock(block)
      if (event) yield event
    }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { blocks, rest } = splitBlocks(buffer)
      buffer = rest
      for (const block of blocks) {
        const event = parseBlock(block)
        if (event) yield event
      }
    }
    const last = parseBlock(buffer)
    if (last) yield last
  } finally {
    reader.releaseLock?.()
  }
}

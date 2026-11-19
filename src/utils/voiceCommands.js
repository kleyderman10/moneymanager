// Comandos de voz que controlan al asistente en vez de ser una pregunta: callarlo, empezar de nuevo,
// repetir la última respuesta y activar o desactivar la voz. Solo se reconocen frases cortas y
// exactas, para no confundir una pregunta como «¿para qué sirve esto?» con «para».

const normalize = (text) => String(text || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^(flow|oye flow|hey flow) /, '')
  .replace(/ (por favor|please)$/, '')

const COMMANDS = [
  ['voice_off', /^(desactiva|apaga|quita|silencia|desactivar|apagar) (la )?voz$|^(mute|voice off|turn off (the )?voice)$/],
  ['voice_on', /^(activa|enciende|prende|activar|encender) (la )?voz$|^(unmute|voice on|turn on (the )?voice)$/],
  ['stop', /^(detente|detener|detenerte|para|parar|callate|callar|silencio|basta|alto|stop|be quiet|shut up|quiet)$/],
  ['new', /^(nueva conversacion|nuevo chat|nueva consulta|empieza de nuevo|empezar de nuevo|reinicia|reiniciar|new conversation|new chat|start over)$/],
  ['repeat', /^(repite|repetir|repite la respuesta|repite eso|dilo otra vez|otra vez|repeat|repeat that|say that again)$/],
]

export const parseVoiceCommand = (text) => {
  const clean = normalize(text)
  if (!clean) return null
  return COMMANDS.find(([, pattern]) => pattern.test(clean))?.[0] || null
}

// Corta el texto que llega por partes en frases completas para empezar a leerlas antes de que
// termine la respuesta. push() devuelve las frases ya completas; flush() lo que quedó al final.
export const createSentenceStream = () => {
  let buffer = ''
  const take = () => {
    const out = []
    for (;;) {
      const match = /^([\s\S]*?[.!?]+(?=\s)|[\s\S]*?\n)\s*/.exec(buffer)
      if (!match) break
      const sentence = match[1].trim()
      buffer = buffer.slice(match[0].length)
      if (sentence) out.push(sentence)
    }
    return out
  }
  return {
    push(delta) {
      buffer += delta
      return take()
    },
    flush() {
      const rest = buffer.trim()
      buffer = ''
      return rest ? [rest] : []
    },
  }
}

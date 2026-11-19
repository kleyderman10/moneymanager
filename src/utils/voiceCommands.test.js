import { describe, it, expect } from 'vitest'
import { parseVoiceCommand, createSentenceStream } from './voiceCommands'
import { humanizeForSpeech } from './voice'

describe('parseVoiceCommand', () => {
  it('reconoce los comandos en español e inglés, con acentos y cortesías', () => {
    expect(parseVoiceCommand('Detente')).toBe('stop')
    expect(parseVoiceCommand('cállate, por favor')).toBe('stop')
    expect(parseVoiceCommand('Flow, para')).toBe('stop')
    expect(parseVoiceCommand('nueva conversación')).toBe('new')
    expect(parseVoiceCommand('Repite la respuesta.')).toBe('repeat')
    expect(parseVoiceCommand('desactiva la voz')).toBe('voice_off')
    expect(parseVoiceCommand('activa voz')).toBe('voice_on')
    expect(parseVoiceCommand('start over')).toBe('new')
  })

  it('no confunde preguntas o gastos con comandos', () => {
    expect(parseVoiceCommand('¿para qué sirve esto?')).toBeNull()
    expect(parseVoiceCommand('gasté 20 mil en comida')).toBeNull()
    expect(parseVoiceCommand('repite el gasto de ayer en comida')).toBeNull()
    expect(parseVoiceCommand('')).toBeNull()
    expect(parseVoiceCommand(null)).toBeNull()
  })
})

describe('createSentenceStream', () => {
  it('entrega frases completas a medida que llegan y el resto al final', () => {
    const s = createSentenceStream()
    expect(s.push('Este mes gastaste $1.200.000')).toEqual([])
    expect(s.push(' en total. Lo más')).toEqual(['Este mes gastaste $1.200.000 en total.'])
    expect(s.push(' alto fue comida! Y')).toEqual(['Lo más alto fue comida!'])
    expect(s.flush()).toEqual(['Y'])
    expect(s.flush()).toEqual([])
  })

  it('no corta cifras con puntos y trata cada línea de una lista como frase', () => {
    const s = createSentenceStream()
    expect(s.push('Gastaste 1.200.000 pesos.\n- Comida: 600.000\n- Transporte')).toEqual(['Gastaste 1.200.000 pesos.', '- Comida: 600.000'])
    expect(s.flush()).toEqual(['- Transporte'])
  })
})

describe('humanizeForSpeech', () => {
  it('lee flechas, dólares y markdown de forma natural', () => {
    expect(humanizeForSpeech('Comida ▲ 12%', 'es')).toBe('Comida sube 12 por ciento')
    expect(humanizeForSpeech('Transporte ▼ 5%', 'en')).toBe('Transporte down 5 percent')
    expect(humanizeForSpeech('Total 1500 USD', 'es')).toBe('Total 1500 dólares')
    expect(humanizeForSpeech('**Gastaste** `$20.000`', 'es')).toBe('Gastaste 20.000 pesos')
  })
})

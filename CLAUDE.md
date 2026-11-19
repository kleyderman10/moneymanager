# CLAUDE.md

## Investigating a feature

When investigating a feature:
- Use **Codebase Memory** to discover unknown entry points and explore the architecture/feature in general.
- Use **Grep** to trace identifiers, constants, or already-known strings along the dependency chain.
- Load only the implementations involved in the chain.
- Avoid reading unrelated projects, tests, migrations, generated files and node_modules unless required.

## Asistente de IA (Flow) — cliente

- **Chat**: `components/AIChatPanel.vue` + `components/ai/*` (mensaje, compositor con dictado, medidor `AiUsageMeter`); estado en `stores/aiChat.js` (streaming SSE con `utils/sse.js`, conversaciones, detener, sugerencias, tarjetas). Las tarjetas reutilizan `components/assistant/AssistantCard.vue`.
- **Voz**: `components/assistant/AssistantSheet.vue` + `stores/assistant.js`. Las preguntas abiertas (`type: 'ask'`) se responden con `assistant.ask()` sobre el stream del chat y se leen frase a frase (`utils/voiceCommands.js`). TTS nativo con `@capacitor-community/text-to-speech`, `speechSynthesis` en web. Lectura de mensajes del chat: `utils/speakText.js`.
- **Móvil**: `npm run cap:sync`; `.env.capacitor` fija `VITE_API_BASE_URL`. Si el servidor no acepta el stream (respuesta no 2xx), el store reintenta por axios sin stream; si CapacitorHttp rompe el streaming en el dispositivo, hay que verificarlo allí.
- Plan y estado por fases: `PLAN-ASISTENTE-IA.md`. Pruebas: `npx vitest run`.

# "Oye Flow": activación por voz local (openWakeWord)

La app escucha la frase **"Oye Flow"** en el dispositivo y, al detectarla, abre el asistente de voz existente. No se envía audio a ningún servidor mientras se espera la frase.

## Arquitectura

```
Vue (stores/wakeword.js, composables/useVoiceActivation.js)
  -> services/wakeword/WakeWordService.js        elige el motor
  -> WakeWordProvider (contrato)  <- OpenWakeWordProvider (plugin Capacitor "WakeWord")
  -> Android: WakeWordPlugin.kt -> WakeWordEngine.kt -> AudioCaptureManager.kt + OpenWakeWordPipeline.kt
  -> ONNX Runtime Mobile (onnxruntime-android 1.25.1)
```

Para cambiar de motor (Porcupine, otro) basta con otro `WakeWordProvider` devuelto por `createProvider()`. Los componentes Vue no cambian.

## Pipeline (igual que openWakeWord upstream)

Audio PCM16 mono 16 kHz en bloques de 1280 muestras (80 ms):

1. `melspectrogram.onnx`: entrada `[1, muestras]` (valores int16 como float). Se pasan las últimas 1760 muestras (1280 nuevas + 480 de contexto) y salen 8 frames de 32 bandas. Transformación `x / 10 + 2`.
2. `embedding_model.onnx`: entrada `[1, 76, 32, 1]` (ventana deslizante de 76 frames), salida 96 valores.
3. Clasificador (`oye_flow.onnx`): entrada `[1, 16, 96]` (últimos 16 embeddings), salida un puntaje 0-1.
4. Si `puntaje >= umbral` y pasó el cooldown (2 s): detección.

El motor tarda ~1,3 s en "calentar" (16 embeddings) tras cada inicio/reanudación.

## Flujo con el asistente

```
Wake word LISTENING (asistente cerrado)
  "Oye Flow" -> el motor SUELTA el micrófono -> evento wakeWordDetected -> Vue abre el asistente
Asistente abierto: wake word PAUSED (no hay doble captura)
Asistente cerrado: wake word resume -> LISTENING
App en segundo plano: wake word detenido (primera versión: solo primer plano)
```

Esto lo coordina `useVoiceActivation`. El asistente actual usa reconocimiento de voz del dispositivo y el LLM del API (Gemini); la detección no crea ninguna sesión hasta que se dice la frase.

## Modelos

Android: `android/app/src/main/assets/wakewords/`

| Archivo | Origen |
| --- | --- |
| `melspectrogram.onnx`, `embedding_model.onnx` | openWakeWord v0.5.1 (GitHub releases), Apache-2.0 |
| `oye_flow.onnx` | **por entrenar** (ver `TRAINING.md`) |

Versión de desarrollo: `android/app/src/debug/assets/wakewords/hey_jarvis_v0.1.onnx` (solo APK debug). Es un modelo preentrenado de terceros con licencia **CC BY-NC-SA 4.0: no comercial**. No va en release.

Para probar el pipeline con "Hey Jarvis" cree `.env.capacitor.local` (ignorado por git):

```
VITE_WAKEWORD_MODEL=hey_jarvis_v0.1.onnx
VITE_WAKEWORD_LABEL=Hey Jarvis
```

y ejecute `npm run cap:sync` y compile en debug. Borre ese archivo para volver a `oye_flow.onnx`.

### Sustituir el modelo

1. Copie el nuevo `.onnx` a `android/app/src/main/assets/wakewords/oye_flow.onnx` (mismo nombre) o use otro nombre y `VITE_WAKEWORD_MODEL`.
2. Debe ser un clasificador openWakeWord con entrada `[1,16,96]` y salida `[1,1]`.
3. `npm run cap:sync` y recompile. Recalibre el umbral (ver `TESTING.md`).

## Umbral y sensibilidad

El usuario elige Baja / Normal / Alta (Ajustes de voz del asistente): umbrales 0.80 / 0.60 / 0.45 (`SENSITIVITY_THRESHOLDS` en `stores/wakeword.js`). Son valores iniciales: calíbrelos con el modelo real.

## Depuración

En desarrollo (`npm run dev` o build debug) la ruta `/dev/wakeword` muestra estado, puntaje, pico, detecciones y permite Start/Stop/Pause/Resume y mover el umbral. No existe en producción.

## Permisos

- Android: `RECORD_AUDIO` (ya declarado). Se pide al activar la función, tras mostrar la explicación.
- iOS: `NSMicrophoneUsageDescription` actualizado en `Info.plist`.

## Plataformas

| Plataforma | Estado |
| --- | --- |
| Android | Implementado (Kotlin + ONNX Runtime). Compila; pendiente validar en dispositivo real. |
| iOS | **No implementado**: el contrato JS es el mismo, falta el plugin Swift (`AVAudioEngine` + `onnxruntime-objc`). Mientras tanto la opción aparece como no disponible. |
| Web | No soportado en esta versión (la UI lo indica). El asistente sigue activándose con toque. |

## Privacidad

El audio se captura en memoria, se procesa en el dispositivo y se descarta. Nunca llega a JavaScript, a disco, al API ni a analítica. Solo cruzan eventos (`wakeWordDetected`, estado, error) y, en desarrollo, el puntaje.

## Errores

`MICROPHONE_PERMISSION_DENIED`, `MICROPHONE_UNAVAILABLE`, `MODEL_NOT_FOUND`, `MODEL_LOAD_ERROR`, `ORT_INITIALIZATION_ERROR`, `AUDIO_CAPTURE_ERROR`, `INFERENCE_ERROR`, `UNSUPPORTED_PLATFORM`, `ALREADY_RUNNING`, `NOT_INITIALIZED`. La app muestra mensajes simples. Tras un error no se reintenta sola: se libera el micrófono y se espera una acción del usuario.

## Limitaciones

- Solo con la app abierta y visible. No hay servicio permanente, ni arranque con el teléfono.
- Con pantalla bloqueada o app en segundo plano no escucha (comportamiento por diseño en esta versión).
- Sin `oye_flow.onnx` la función muestra "modelo no disponible".

## Solución de problemas

- *Aparece "modelo no disponible"*: falta `oye_flow.onnx` en `assets/wakewords/` o el nombre no coincide.
- *No detecta*: baje el umbral (sensibilidad Alta) y revise el puntaje en `/dev/wakeword`.
- *Se activa solo*: suba el umbral y añada esas frases como negativos al entrenar.
- *El micrófono no está disponible*: otra app lo usa (llamada, grabadora).

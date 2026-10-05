# Entrenar `oye_flow.onnx`

El modelo se entrena aparte (Python, solo para entrenar/evaluar/exportar). Nada de Python va dentro de la app.

## Resumen

openWakeWord entrena un clasificador pequeño sobre los *embeddings* de audio. Los ejemplos positivos se generan con voz sintética (TTS), por lo que no se necesitan grabaciones de usuarios.

- Frase objetivo: `Oye Flow` (nombre del modelo: `oye_flow`).
- Entrene primero la frase oficial. No convierta variaciones en objetivos distintos.

## Procedimiento

1. Siga el cuaderno oficial de entrenamiento automático del repositorio openWakeWord (`notebooks/automatic_model_training.ipynb`, Google Colab o local con GPU). Use la versión del repositorio que coincida con los modelos `v0.5.1`.
2. En la configuración: `target_phrase: ["oye flow"]`, `model_name: oye_flow`.
3. Generación sintética: use varias voces y velocidades de un TTS en español. Incluya voces con acento latinoamericano (Colombia, México, Argentina). **Anote el TTS usado y su licencia**: la licencia de los datos determina si el modelo puede usarse comercialmente.
4. Negativos: añada la lista de frases cercanas (ver abajo), habla general en español, ruido, música y TV.
5. Exporte a ONNX (el cuaderno lo hace) y copie `oye_flow.onnx` a `android/app/src/main/assets/wakewords/`.

## Registre en `wakeword-evaluation/MODEL_CARD.md`

Dataset y licencias, cantidad de positivos y negativos, voces, validación, umbral elegido y métricas (ver abajo). El modelo comercial debe tener origen y licencia documentados. **No distribuya como solución final los modelos preentrenados de terceros** (CC BY-NC-SA).

## Conjunto de evaluación

```
wakeword-evaluation/
  positive/      "Oye Flow": voces masculinas y femeninas, acentos LATAM (colombiano en especial), velocidades y volúmenes distintos
  negative/      habla normal sin la frase
  noise/         TV, música, calle, carro, habitación silenciosa
  near_matches/  frases fonéticamente cercanas
```

No guarde en el repositorio audio de usuarios reales sin su autorización.

## Falsos positivos

No asuma cuáles serán: ejecute el modelo sobre `near_matches/` y `negative/`, anote las frases con puntaje alto y agréguelas como negativos al siguiente entrenamiento. Prioridad: que Flow no se abra por accidente.

## Métricas a medir

Tasa de verdaderos positivos, tasa de falsos positivos, activaciones falsas por hora, puntaje medio de detección, detecciones perdidas, latencia de detección, CPU, RAM y batería (en un dispositivo real; no se publican cifras sin medirlas).

## Elegir el umbral

Con la pantalla `/dev/wakeword`, anote el puntaje al decir la frase (debe superar el umbral con holgura) y el pico durante habla normal y ruido (debe quedar por debajo). Ajuste `SENSITIVITY_THRESHOLDS` en `src/stores/wakeword.js`.

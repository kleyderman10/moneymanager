# Entrenar "Oye Flow" paso a paso

Archivos de esta carpeta:

| Archivo | Para qué |
| --- | --- |
| `oye_flow.yaml` | Configuración de `openwakeword/train.py` |
| `generate_spanish_clips.py` | Genera los clips con voces de Piper en español |
| `negative_phrases.txt` | Frases parecidas que no deben activar |
| `MODEL_CARD.md` | Plantilla para documentar datos, licencias y métricas |

> Lo preparé sin poder ejecutarlo (aquí no hay GPU). Las URLs de descarga y las versiones siguen el cuaderno oficial de openWakeWord; si alguna cambió, el cuaderno `automatic_model_training.ipynb` del repositorio manda.

## 1. Entorno (Google Colab, GPU T4 gratis)
Abra un cuaderno nuevo, Entorno de ejecución → Cambiar tipo → GPU. Cada bloque es una celda.

```bash
!git clone https://github.com/dscripka/openWakeWord
!pip install -e ./openWakeWord
!pip install piper-tts soundfile scipy mutagen torchinfo torchmetrics speechbrain==0.5.14 audiomentations torch-audiomentations acoustics pronouncing datasets deep-phonemizer
!python -c "import openwakeword; openwakeword.utils.download_models()"
```

Suba a Colab (panel de archivos) el contenido de esta carpeta: `oye_flow.yaml`, `generate_spanish_clips.py`, `negative_phrases.txt`.

## 2. Datos de aumento (ruido, reverberación, negativos)
```python
import os, numpy as np, scipy.io.wavfile, datasets
from tqdm import tqdm

# Respuestas al impulso (reverberación)
os.makedirs("mit_rirs", exist_ok=True)
rir = datasets.load_dataset("davidscripka/MIT_environmental_impulse_responses", split="train", streaming=True)
for row in tqdm(rir):
    scipy.io.wavfile.write(f"mit_rirs/{row['audio']['path'].split('/')[-1]}", 16000, (row["audio"]["array"] * 32767).astype(np.int16))

# Ruido de fondo (AudioSet, subconjunto) y música (FMA)
os.makedirs("audioset_16k", exist_ok=True)
os.makedirs("fma", exist_ok=True)
# Siga las celdas "Download Data" del cuaderno oficial para audioset_16k y fma
# (mismos nombres de carpeta que en oye_flow.yaml).
```

```bash
!wget -q https://huggingface.co/datasets/davidscripka/openwakeword_features/resolve/main/openwakeword_features_ACAV100M_2000_hrs_16bit.npy
!wget -q https://huggingface.co/datasets/davidscripka/openwakeword_features/resolve/main/validation_set_features.npy
```

## 3. Voces en español
Descargue de <https://huggingface.co/rhasspy/piper-voices> (carpeta `es/`) pares `.onnx` + `.onnx.json` a `voices/`. Use varias voces, hombres y mujeres, de `es_MX` y `es_AR` si las hay, y `es_ES` para variedad. **Apunte la licencia de cada una** (tarjeta de la voz) y use solo las que permitan uso comercial.

## 4. Clips
```bash
!python generate_spanish_clips.py --voices-dir ./voices --out ./my_custom_model/oye_flow
```
Escucha unos cuantos antes de seguir (`IPython.display.Audio`). Si "flow" suena como "flou" muy raro en todas las voces, agregue variantes a `POSITIVE` (por ejemplo "oye flou"), pero sin cambiar la frase objetivo.

## 5. Entrenar
```bash
!python openWakeWord/openwakeword/train.py --training_config oye_flow.yaml --augment_clips
!python openWakeWord/openwakeword/train.py --training_config oye_flow.yaml --train_model
```
Al terminar quedan `my_custom_model/oye_flow.onnx` (y `.tflite`). Descargue el `.onnx`.

## 6. Verificar que es compatible
```python
import onnxruntime as o
s = o.InferenceSession("oye_flow.onnx")
print(s.get_inputs()[0].shape, s.get_outputs()[0].shape)   # debe ser [1, 16, 96] y [1, 1]
```

## 7. Instalar en la app
1. Copie el archivo a `android/app/src/main/assets/wakewords/oye_flow.onnx`.
2. Borre `.env.capacitor.local` (para volver a `oye_flow.onnx` y "Oye Flow").
3. `npm run cap:sync` y compile. En ajustes del asistente aparece la opción, porque el modelo ya está incluido.
4. Calibre el umbral con `/dev/wakeword` y complete [../TESTING.md](../TESTING.md).

## 8. Documentar
Rellene `MODEL_CARD.md` (datos, voces con licencia, métricas). Es lo que respalda el uso comercial.

## Si no funciona bien
- **Se activa con otras frases:** añádalas a `negative_phrases.txt`, regenere negativos y reentrene.
- **No responde a su voz:** aumente `n_samples`, agregue voces, o grabe 50–100 muestras suyas y de familiares (con su permiso) como positivos adicionales en `positive_train`.
- **Falsos positivos por hora altos:** baje `target_false_positives_per_hour` o suba `max_negative_weight`.

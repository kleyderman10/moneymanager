"""Genera los clips de entrenamiento de "Oye Flow" con voces de Piper en español.

El TTS que trae openWakeWord es en inglés y pronuncia mal "oye flow". Aquí se usan voces
españolas/latinoamericanas de Piper, con velocidades y variaciones distintas, y se guardan como WAV
16 kHz mono 16 bits en la estructura que espera train.py.

Uso:
    pip install piper-tts soundfile numpy scipy
    python generate_spanish_clips.py --voices-dir ./voices --out ./my_custom_model/oye_flow

Las voces (.onnx + .onnx.json) se descargan de https://huggingface.co/rhasspy/piper-voices
(carpeta es/es_MX, es/es_ES, es/es_AR). ANOTE la licencia de cada voz en MODEL_CARD.md: de ella
depende si el modelo puede usarse comercialmente. Use solo voces con licencia permisiva.
"""
import argparse
import random
import wave
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

POSITIVE = ["oye flow", "Oye Flow.", "oye, flow", "Oye Flow!", "oye flow, ayúdame"]
SPEEDS = [0.85, 0.95, 1.0, 1.1, 1.2]  # length_scale: >1 = más lento


def load_voice(path: Path):
    from piper import PiperVoice
    return PiperVoice.load(str(path))


def synth(voice, text, length_scale, noise_scale, noise_w, speaker_id):
    """Devuelve (muestras int16, frecuencia). Soporta las dos APIs de piper-tts."""
    import io
    buffer = io.BytesIO()
    try:  # piper-tts >= 1.3
        from piper import SynthesisConfig
        config = SynthesisConfig(length_scale=length_scale, noise_scale=noise_scale, noise_w_scale=noise_w, speaker_id=speaker_id)
        with wave.open(buffer, "wb") as out:
            voice.synthesize_wav(text, out, syn_config=config)
    except ImportError:  # piper-tts < 1.3
        with wave.open(buffer, "wb") as out:
            voice.synthesize(text, out, speaker_id=speaker_id, length_scale=length_scale, noise_scale=noise_scale, noise_w=noise_w)
    buffer.seek(0)
    with wave.open(buffer, "rb") as src:
        rate = src.getframerate()
        data = np.frombuffer(src.readframes(src.getnframes()), dtype=np.int16)
    return data, rate


def save16k(path: Path, samples, rate):
    audio = samples.astype(np.float32)
    if rate != 16000:
        audio = resample_poly(audio, 16000, rate)
    audio = np.clip(audio, -32768, 32767).astype(np.int16)
    with wave.open(str(path), "wb") as out:
        out.setnparams((1, 2, 16000, 0, "NONE", "not compressed"))
        out.writeframes(audio.tobytes())


def render(voices, phrases, folder: Path, count, rng):
    folder.mkdir(parents=True, exist_ok=True)
    for index in range(count):
        voice, name = rng.choice(voices)
        speakers = max(1, voice.config.num_speakers)
        samples, rate = synth(
            voice, rng.choice(phrases), rng.choice(SPEEDS),
            rng.uniform(0.5, 0.9), rng.uniform(0.5, 1.0), rng.randrange(speakers) if speakers > 1 else None,
        )
        save16k(folder / f"{name}_{index:06d}.wav", samples, rate)
        if index % 500 == 0:
            print(f"{folder.name}: {index}/{count}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voices-dir", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--negatives", default=Path(__file__).with_name("negative_phrases.txt"), type=Path)
    parser.add_argument("--n-train", type=int, default=20000)
    parser.add_argument("--n-test", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    voices = [(load_voice(path), path.stem) for path in sorted(args.voices_dir.glob("*.onnx"))]
    if not voices:
        raise SystemExit("No hay voces .onnx en --voices-dir")
    print("Voces:", ", ".join(name for _, name in voices))

    negatives = [line.strip() for line in args.negatives.read_text(encoding="utf8").splitlines() if line.strip()]
    render(voices, POSITIVE, args.out / "positive_train", args.n_train, rng)
    render(voices, POSITIVE, args.out / "positive_test", args.n_test, rng)
    # Negativos adversariales: frases parecidas. El habla general y el ruido los aporta train.py.
    render(voices, negatives, args.out / "negative_train", args.n_train // 2, rng)
    render(voices, negatives, args.out / "negative_test", args.n_test // 2, rng)
    print("Listo. Ahora: python openwakeword/train.py --training_config oye_flow.yaml --augment_clips --train_model")


if __name__ == "__main__":
    main()

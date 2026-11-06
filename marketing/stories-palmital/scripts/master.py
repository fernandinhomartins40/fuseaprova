"""Masteriza o áudio do vídeo renderizado: ganho até ~-14 dB RMS com limitador suave, sem tocar no vídeo.

Uso: python scripts/master.py out/stories-palmital-197.mp4
"""
import pathlib
import subprocess
import sys
import wave

import numpy as np

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ALVO_RMS_DB = -16.0
TETO = 0.89


def ffmpeg(*args: str) -> None:
    subprocess.run(['npx', 'remotion', 'ffmpeg', '-loglevel', 'error', '-y', *args], check=True, cwd=RAIZ, shell=True)


def main(video: pathlib.Path) -> None:
    bruto, pronto = video.with_suffix('.bruto.wav'), video.with_suffix('.master.wav')
    ffmpeg('-i', str(video), '-vn', '-ac', '2', '-ar', '48000', str(bruto))
    with wave.open(str(bruto)) as w:
        taxa, canais = w.getframerate(), w.getnchannels()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    rms_db = 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-12)
    a *= 10 ** ((ALVO_RMS_DB - rms_db) / 20)
    # limitador suave: linear até 0,8 e curva tanh até o teto
    joelho = 0.7
    acima = np.abs(a) > joelho
    a[acima] = np.sign(a[acima]) * (joelho + (TETO - joelho) * np.tanh((np.abs(a[acima]) - joelho) / (TETO - joelho)))
    with wave.open(str(pronto), 'wb') as w:
        w.setnchannels(canais)
        w.setsampwidth(2)
        w.setframerate(taxa)
        w.writeframes((a * 32767).astype(np.int16).tobytes())
    final = video.with_name(video.stem + '-final.mp4')
    ffmpeg('-i', str(video), '-i', str(pronto), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
           '-movflags', '+faststart', str(final))
    bruto.unlink()
    pronto.unlink()
    print(f'RMS {rms_db:.1f} dB -> {ALVO_RMS_DB} dB: {final}')


main(RAIZ / sys.argv[1])

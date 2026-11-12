"""Gera a narração de um vídeo a partir de roteiros/<video>.json e grava as durações em src/<video>/narracao.json.

Uso:
  python scripts/narracao.py v2                 # gera todas as falas
  python scripts/narracao.py v2 --so quiz:3     # regenera só a 3ª fala da cena "quiz" (ex.: corrigir gagueira)

O roteiro traz a voz da ElevenLabs, os ajustes de voz, a semente e as falas por cena (cada fala é um clipe;
as animações disparam no início de cada um). Sem chave da ElevenLabs no .env, usa a voz do edge-tts.
"""
import argparse
import asyncio
import json
import pathlib
import subprocess
import wave

import edge_tts
import numpy as np

import eleven
from fala import preparar

RAIZ = pathlib.Path(__file__).resolve().parent.parent
VOZ_RESERVA = 'pt-BR-FranciscaNeural'


def apara(mp3: pathlib.Path) -> tuple[pathlib.Path, float]:
    """Converte para WAV, tira o silêncio das pontas, normaliza o pico e devolve a duração."""
    wav = mp3.with_suffix('.wav')
    subprocess.run(['npx', 'remotion', 'ffmpeg', '-loglevel', 'error', '-y', '-i', str(mp3), '-ac', '1', '-ar', '44100',
                    str(wav)], check=True, cwd=RAIZ, shell=True)
    mp3.unlink()
    with wave.open(str(wav)) as w:
        taxa = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    voz = np.nonzero(np.abs(a) > 400)[0]
    folga = int(0.04 * taxa)
    a = a[max(0, voz[0] - folga): voz[-1] + folga]
    a = (a / np.abs(a).max() * 0.95 * 32767).astype(np.int16)
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(taxa)
        w.writeframes(a.tobytes())
    return wav, len(a) / taxa


async def main(video: str, so: set[str]) -> None:
    roteiro = json.loads((RAIZ / 'roteiros' / f'{video}.json').read_text(encoding='utf-8'))
    saida = RAIZ / 'public' / 'audio' / video
    saida.mkdir(parents=True, exist_ok=True)
    # Videoaula por dados: a duração fica junto do modelo; o texto vai para a voz já preparado (fala.py).
    por_dados = 'cenas' in roteiro
    destino = RAIZ / 'src' / 'videoaula' / 'narracao' / f'{video}.json' if por_dados else RAIZ / 'src' / video / 'narracao.json'
    falado = (lambda t: preparar(t, roteiro.get('pronuncia'))) if por_dados else (lambda t: t)
    destino.parent.mkdir(parents=True, exist_ok=True)
    anterior_json = json.loads(destino.read_text(encoding='utf-8')) if destino.exists() else {}
    tem_chave = (RAIZ / '.env').exists() and eleven.env().get('ELEVENLABS_API_KEY')
    print('voz:', f"ElevenLabs {roteiro['nomeVoz']}" if tem_chave else f'edge-tts {VOZ_RESERVA}')
    falas = roteiro['falas']
    corrido = [falado(t) for lista in falas.values() for t in lista]
    resultado: dict[str, list[dict]] = {}
    n = 0
    for cena, lista in falas.items():
        resultado[cena] = []
        for i, texto in enumerate(lista):
            chave = f'{cena}:{i + 1}'
            if so and chave not in so and cena in anterior_json and i < len(anterior_json[cena]):
                resultado[cena].append(anterior_json[cena][i])
                n += 1
                continue
            arquivo = saida / f'voz-{cena}-{i + 1}.mp3'
            if tem_chave:
                eleven.sintetizar(falado(texto), arquivo, roteiro['voz'], ' '.join(corrido[max(0, n - 2):n]),
                                  corrido[n + 1] if n + 1 < len(corrido) else '',
                                  ajustes=roteiro['ajustes'], semente=roteiro['semente'],
                                  modelo=roteiro.get('modelo', eleven.MODELO))
            else:
                await edge_tts.Communicate(texto, VOZ_RESERVA, rate='+15%').save(str(arquivo))
            n += 1
            arquivo, d = apara(arquivo)
            resultado[cena].append({'arquivo': f'audio/{video}/{arquivo.name}', 'segundos': round(d, 3), 'texto': texto})
            print(f'{chave}: {d:.2f}s')
    destino.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding='utf-8')
    total = sum(c['segundos'] for lista in resultado.values() for c in lista)
    print(f'fala total: {total:.1f}s')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--so', nargs='*', default=[])
    a = ap.parse_args()
    asyncio.run(main(a.video, set(a.so)))

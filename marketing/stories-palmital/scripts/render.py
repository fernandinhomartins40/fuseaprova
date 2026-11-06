"""Renderiza e masteriza vídeos: python scripts/render.py v1 v2 ...

Marketing sai em out/<video>-final.mp4. Videoaula (roteiro com `cenas`, ou videoaulaN) fica fora do marketing, na raiz do repositório:
videoaulas/<materia>/<slug>.mp4 é o arquivo do app, no padrão leve de docs/videoaulas/PLANO.md §4; o resto vai para videoaulas/_trabalho/.
"""
import json
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
FFMPEG = RAIZ / 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
VIDEOAULAS = RAIZ.parent.parent / 'videoaulas'


def ler_roteiro(video: str) -> dict:
    arquivo = RAIZ / 'roteiros' / f'{video}.json'
    return json.loads(arquivo.read_text(encoding='utf-8')) if arquivo.exists() else {}


for video in sys.argv[1:] or ['v1', 'v2', 'v3', 'v4', 'v5', 'v6']:
    roteiro = ler_roteiro(video)
    aula = video.startswith('videoaula') or 'cenas' in roteiro
    pasta = VIDEOAULAS / '_trabalho' if aula else RAIZ / 'out'
    pasta.mkdir(parents=True, exist_ok=True)
    bruto = pasta / f'{video}.mp4'
    subprocess.run(['npx', 'remotion', 'render', 'src/index.ts', video, str(bruto), '--codec=h264', '--crf=18', '--log=error'],
                   check=True, cwd=RAIZ, shell=True)
    subprocess.run([sys.executable, 'scripts/master.py', str(bruto)], check=True, cwd=RAIZ)
    if aula:
        # videoaulaN são os testes antigos, sem matéria no roteiro
        leve = VIDEOAULAS / roteiro.get('materia', '_trabalho/testes') / f'{video}.mp4'
        leve.parent.mkdir(parents=True, exist_ok=True)
        # pan: o -ac 1 sobe o volume e estoura os picos na hora de virar mono
        subprocess.run([str(FFMPEG), '-loglevel', 'error', '-y', '-i', str(pasta / f'{video}-final.mp4'), '-s', '720x1280', '-sws_flags', 'lanczos',
                        '-r', '24', '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', '30', '-maxrate', '900k', '-bufsize', '1800k',
                        '-pix_fmt', 'yuv420p', '-af', 'pan=mono|c0=0.5*c0+0.5*c1', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', str(leve)], check=True, cwd=RAIZ)
        print(f'app: {leve} ({leve.stat().st_size / 1e6:.2f} MB)')

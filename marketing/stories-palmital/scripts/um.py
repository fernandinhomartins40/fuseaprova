"""Um vídeo da campanha até 05/12, do roteiro ao arquivo do dia.

    python scripts/um.py v24 voz      # narração (roteiros/v24.json) + trilha (ESTILOS['v24']) + registro no Raiz
    python scripts/um.py v24 quadros  # um quadro por cena (fim da última fala) numa folha, para conferir
    python scripts/um.py v24 final    # render + master e cópia para out/campanha-ate-05-12/<dia>/<n>-v24.mp4
"""
import json
import pathlib
import re
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
RASCUNHO = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else RAIZ / 'out' / 'quadros'
DIAS = {23: '25-11', 24: '25-11', 25: '25-11', 26: '25-11'}
for i, d in enumerate(['26-11', '27-11', '28-11', '29-11', '30-11', '01-12', '02-12', '03-12', '04-12', '05-12']):
    DIAS[27 + 2 * i] = DIAS[28 + 2 * i] = d


def roda(*cmd: str) -> None:
    subprocess.run(list(cmd), check=True, cwd=RAIZ, shell=cmd[0] == 'npx')


def registra(v: str) -> None:
    raiz = RAIZ / 'src' / 'Raiz.tsx'
    s = raiz.read_text(encoding='utf-8')
    if f"from './{v}'" in s:
        return
    ultimo = max(int(n) for n in re.findall(r"import \* as v(\d+) from", s))
    s = s.replace(f"import * as v{ultimo} from './v{ultimo}';", f"import * as v{ultimo} from './v{ultimo}';\nimport * as {v} from './{v}';")
    s = s.replace(f"  {{ id: 'v{ultimo}', ...v{ultimo} }},", f"  {{ id: 'v{ultimo}', ...v{ultimo} }},\n  {{ id: '{v}', ...{v} }},")
    raiz.write_text(s, encoding='utf-8')


def quadros(v: str) -> list[int]:
    """Mesma conta de src/linhaDoTempo.ts: fim da última fala de cada cena."""
    idx = (RAIZ / 'src' / v / 'index.ts').read_text(encoding='utf-8')
    ordem = re.findall(r"'(\w+)'", re.search(r'montarLinha\(narracao, \[([^\]]*)\]', idx).group(1))
    m = re.search(r'true, \{([^}]*)\}', idx)
    sobra = {k: int(n) for k, n in re.findall(r'(\w+): (\d+)', m.group(1))} if m else {}
    narr = json.loads((RAIZ / 'src' / v / 'narracao.json').read_text(encoding='utf-8'))
    t, saida = 0, []
    for nome in ordem:
        f, fim = 8, 0
        for c in narr[nome]:
            q = -(-int(c['segundos'] * 30 * 1000) // 1000)
            fim = f + q
            f += q + 3
        saida.append(t + fim - 2)
        t += fim + 17 + sobra.get(nome, 0) - 12
    return saida


def folha(v: str) -> None:
    from PIL import Image
    RASCUNHO.mkdir(parents=True, exist_ok=True)
    qs = quadros(v)
    for q in qs:
        roda('npx', 'remotion', 'still', 'src/index.ts', v, str(RASCUNHO / f'{v}-{q}.png'), f'--frame={q}', '--log=error', '--gl=angle')
    col = 4
    w = Image.new('RGB', (360 * col, 640 * (-(-len(qs) // col))), 'white')
    for i, q in enumerate(qs):
        w.paste(Image.open(RASCUNHO / f'{v}-{q}.png').resize((360, 640)), ((i % col) * 360, (i // col) * 640))
    w.save(RASCUNHO / f'{v}-folha.png')
    print(RASCUNHO / f'{v}-folha.png', qs)


if __name__ == '__main__':
    v, passo = sys.argv[1], sys.argv[2]
    if passo == 'voz':
        (RAIZ / 'src' / v / 'momentos.json').unlink(missing_ok=True)
        roda(sys.executable, 'scripts/narracao.py', v)
        roda(sys.executable, 'scripts/trilha.py', v)
        registra(v)
    elif passo == 'quadros':
        folha(v)
    elif passo == 'final':
        roda(sys.executable, 'scripts/render.py', v)
        n = int(v[1:])
        dia = DIAS[n]
        pasta = RAIZ / 'out' / 'campanha-ate-05-12' / dia
        ordem = sorted(k for k, d in DIAS.items() if d == dia).index(n) + 1
        destino = pasta / f'{ordem}-{v}.mp4'
        destino.write_bytes((RAIZ / 'out' / f'{v}-final.mp4').read_bytes())
        print('copiado:', destino)

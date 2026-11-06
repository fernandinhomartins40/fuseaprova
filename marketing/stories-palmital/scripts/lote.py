"""Produz um lote de videoaulas (docs/videoaulas/PLANO.md).

Uso:
  python scripts/lote.py 1 voz      # JSON, narração (só o que falta) e trilhas; atualiza o registro das composições
  python scripts/lote.py 1 fotos    # última imagem de cada cena em videoaulas/_trabalho/quadros/lote-1/
  python scripts/lote.py 1 render   # videoaulas/<materia>/<slug>.mp4 para conferir e subir
"""
import importlib.util
import json
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('roteiro_md', RAIZ / 'scripts' / 'roteiro-md.py')
roteiro_md = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(roteiro_md)


def py(*args: str) -> None:
    subprocess.run([sys.executable, *args], check=True, cwd=RAIZ)


def registro() -> None:
    """Regenera a lista de composições com todo roteiro que já tem narração."""
    slugs = sorted(p.stem for p in (RAIZ / 'src' / 'videoaula' / 'narracao').glob('*.json'))
    linhas = ["import { criarVideoaula, Roteiro } from './modelo';", '']
    for i, s in enumerate(slugs):
        linhas += [f"import r{i} from '../../roteiros/{s}.json';", f"import n{i} from './narracao/{s}.json';"]
    linhas += ['', '// Gerado por scripts/lote.py.', 'export const videoaulas = [']
    linhas += [f"  {{ id: '{s}', ...criarVideoaula(r{i} as unknown as Roteiro, n{i}) }}," for i, s in enumerate(slugs)]
    linhas += ['];', '']
    (RAIZ / 'src' / 'videoaula' / 'registro.gerado.ts').write_text('\n'.join(linhas), encoding='utf-8')


def main(lote: int, etapa: str) -> None:
    secoes = [s for s in roteiro_md.secoes().values() if s['lote'] == lote]
    slugs = [s['slug'] for s in secoes]
    if etapa == 'voz':
        py('scripts/roteiro-md.py', *[s['va'] for s in secoes])
        materias = {json.loads((RAIZ / 'roteiros' / f'{s}.json').read_text(encoding='utf-8'))['materia'] for s in slugs}
        for m in materias:
            if not (RAIZ / 'public' / 'audio' / m / 'trilha.wav').exists():
                py('scripts/trilha.py', m)
        for s in slugs:
            if not (RAIZ / 'src' / 'videoaula' / 'narracao' / f'{s}.json').exists():
                py('scripts/narracao.py', s)
        registro()
    elif etapa == 'fotos':
        subprocess.run(['node', 'scripts/fotos.mjs', str(lote), *slugs], check=True, cwd=RAIZ)
    elif etapa == 'render':
        py('scripts/render.py', *slugs)


if __name__ == '__main__':
    main(int(sys.argv[1]), sys.argv[2])

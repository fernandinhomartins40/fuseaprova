"""Monta roteiros/<slug>.json a partir de docs/videoaulas/roteiros-*.md (falas e resumo) e roteiros/cenas/*.json (telas).

Uso: python scripts/roteiro-md.py VA-001 VA-002 ...

Recusa cena sem tela, tela sem fala e marca `em` que não existe na fala, para o erro aparecer antes de gastar voz.
"""
import glob
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DOCS = RAIZ.parent.parent / 'docs' / 'videoaulas'
CAB = re.compile(r'^## (VA-\d{3}) · (.+)\n`([a-z0-9-]+)` · (.+?) · (\d+) questões · lote (\d+)', re.M)
BASE = {'voz': 'NQmLEqxcRTkWYIYZSYod', 'nomeVoz': 'Matheus', 'semente': 29,
        'ajustes': {'stability': 0.4, 'similarity_boost': 0.78, 'style': 0.6, 'use_speaker_boost': True, 'speed': 1.06}}
VOLTA = 'Agora volta pra questão!'


def secoes() -> dict[str, dict]:
    achadas = {}
    for f in sorted(glob.glob(str(DOCS / 'roteiros-*.md'))):
        s = open(f, encoding='utf8').read()
        marcas = list(CAB.finditer(s))
        for i, m in enumerate(marcas):
            fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(s)
            achadas[m[1]] = {'va': m[1], 'titulo': m[2], 'slug': m[3], 'lote': int(m[6]), 'corpo': s[m.end():fim]}
    return achadas


def falas_do_md(corpo: str) -> tuple[dict[str, list[str]], list[str]]:
    falas: dict[str, list[str]] = {}
    atual = None
    for linha in corpo.splitlines():
        cena = re.match(r'^\d+\. \*\*([a-z0-9-]+)\*\*', linha)
        fala = re.match(r'^\s+- "(.+)"\s*$', linha)
        if cena:
            atual = cena[1]
            falas[atual] = []
        elif fala and atual:
            falas[atual].append(fala[1])
    resumo = re.search(r'^\*\*Resumo:\*\* (.+)$', corpo, re.M)
    linhas = re.findall(r'"([^"]+)"', resumo[1]) if resumo else []
    return falas, linhas


def conferir(slug: str, falas: dict[str, list[str]], cenas: dict) -> None:
    faltam = (set(falas) - {'fecho'}) ^ set(cenas)
    assert not faltam, f'{slug}: cenas sem par entre falas e telas: {faltam}'
    for nome, cena in cenas.items():
        for b in cena['blocos']:
            for item in [b, *b.get('itens', [])]:
                if not isinstance(item, dict):
                    continue
                i = item.get('fala', b.get('fala', 0))
                assert i < len(falas[nome]), f'{slug}/{nome}: fala {i} não existe'
                for chave in ('em', 'forteEm', 'contarEm'):
                    em = item.get(chave)
                    if isinstance(em, str):
                        j = item.get(chave.replace('Em', 'Fala'), i) if chave != 'em' else i
                        assert em in falas[nome][j], f'{slug}/{nome}: "{em}" não está na fala {j}: {falas[nome][j]}'


def gerar(sec: dict, telas: dict) -> None:
    falas, resumo = falas_do_md(sec['corpo'])
    t = telas[sec['slug']]
    conferir(sec['slug'], falas, t['cenas'])
    falas['fecho'] = ['Resumindo: ' + ' '.join(l.rstrip('.?!') + '.' for l in resumo), VOLTA]
    roteiro = {**BASE, 'va': sec['va'], 'titulo': sec['titulo'], 'materia': t['materia'], 'pronuncia': t.get('pronuncia', {}),
               'falas': falas, 'cenas': {**t['cenas'], 'fecho': {'tipo': 'resumo', 'linhas': resumo}}}
    destino = RAIZ / 'roteiros' / f"{sec['slug']}.json"
    destino.write_text(json.dumps(roteiro, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(sec['va'], destino.name)


if __name__ == '__main__':
    todas = secoes()
    telas: dict = {}
    for f in glob.glob(str(RAIZ / 'roteiros' / 'cenas' / '*.json')):
        telas.update(json.loads(open(f, encoding='utf8').read()))
    for va in sys.argv[1:]:
        gerar(todas[va], telas)

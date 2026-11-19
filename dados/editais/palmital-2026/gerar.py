"""
Gera os textos literais do edital de Palmital (Concurso Público nº 01/2026, FAU) usados pela
ferramenta "Descubra seu cargo" a partir dos PDFs oficiais desta pasta. Nada é digitado à mão:
os quadros de cargos, os requisitos (Anexo I), as atribuições, o conteúdo programático (Anexo II)
e os bairros do ACS saem do próprio PDF.

Uso (na raiz do repositório):
    python -I -X utf8 dados/editais/palmital-2026/gerar.py

Saídas:
    packages/shared/src/editais/palmital2026/textos.gerado.ts
    apps/api/src/servicos/edital/corpus.gerado.ts
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
EDITAL = AQUI / 'EDITAL_CONCURSO_PUBLICO_PALMITAL_2.pdf'
RETIFICACAO = AQUI / 'RETIFICACAO_EDITAL_ABERTURA_-_PROVA_DE_TITULOS_1.pdf'
ANEXO1 = AQUI / 'ANEXO_I_-_REQUISITOS_E_ATRIBUICOES_DOS_CARGOS_-_PALMITAL.pdf'
ANEXO2 = AQUI / 'ANEXO_II_-_CONTEUDO_PROGRAMATICO_-_PALMITAL.pdf'

CABECALHO = re.compile(r'MUNICÍPIO DE PALMITAL\s*\n\s*ESTADO DO PARANÁ\s*\n')


def texto(pdf: Path) -> str:
    return ''.join(p.get_text() for p in pymupdf.open(pdf))


def limpa(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip()


def chave(nome: str) -> str:
    """Nome normalizado para casar o quadro do edital com os anexos."""
    n = nome.upper().replace('12X36 DIURNO', '12/36')
    n = re.sub(r'\(.*?\)', '', n)
    for a, b in (('TÉCNICO DE CONTROLE', 'TÉCNICO CONTROLE'), (' DA ', ' '), (' DE ', ' '), (' DO ', ' ')):
        n = n.replace(a, b)
    return re.sub(r'[^A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇ/]', '', n)


# --------------------------------------------------------------- quadros 3.1 a 3.4 e ESF
def quadros():
    cargos, esf = [], []
    for pag in pymupdf.open(EDITAL):
        for t in pag.find_tables().tables:
            for linha in t.extract():
                cel = [limpa(c or '') for c in linha]
                cel = [c for c in cel if c]
                if cel and re.fullmatch(r'[1-4]\d\d', cel[0]) and len(cel) >= 7:
                    cod, nome, carga, ampla, pcd, afro, sal = cel[:7]
                    taxa = cel[7] if len(cel) > 7 else ''
                    cargos.append({
                        'codigo': int(cod),
                        'nome': re.sub(r'\s*\(\d.*?\)$', '', nome),
                        'carga': carga,
                        'vagas': ampla,
                        'pcd': 0 if pcd == '-' else int(pcd),
                        'afro': 0 if afro == '-' else int(afro),
                        'remuneracao': sal,
                        'taxa': taxa,
                    })
                elif cel and re.fullmatch(r'ESF [IVX]+', cel[0]) and len(cel) == 2:
                    bairros = [b.strip() for b in re.split(r';', cel[1].rstrip('.'))]
                    # "Dalzoto; Pedreira e Rua Joaquim..." vira dois itens no fim da lista.
                    fim = bairros.pop()
                    bairros += [b.strip() for b in fim.split(' e Rua ')] if ' e Rua ' in fim else [fim]
                    if len(bairros) and bairros[-1].startswith('Joaquim'):
                        bairros[-1] = 'Rua ' + bairros[-1]
                    esf.append({'area': cel[0], 'bairros': bairros})
    return cargos, esf


# ------------------------------------------------------------------------------ Anexo I
def anexo1():
    t = CABECALHO.sub('', texto(ANEXO1))
    out = {}
    for p in re.split(r'\n\s*CARGO:\s*', t)[1:]:
        nome, _, resto = p.partition('\n')
        req, _, atrib = resto.partition('Atribuições:')
        req = re.sub(r'CARGO DE NÍVEL.*$', '', limpa(req)).strip()
        req = re.sub(r'^Requisitos:\s*', '', req)
        atrib = re.split(r'\n\s*CARGO DE NÍVEL|\n\s*NÍVEL (?:MÉDIO|FUNDAMENTAL)', atrib)[0]
        itens = [limpa(i) for i in re.split(r'✓', atrib)]
        cab = itens.pop(0) if itens else ''
        tarefas = [re.sub(r'\s*TAREFAS TÍPICAS:\s*$', '', i) for i in itens if i]
        m = re.search(r'DESCRIÇÃO SUMÁRIA:\s*(.*?)\s*TAREFAS TÍPICAS', limpa(atrib.replace('✓', ' ')))
        desc = m.group(1) if m else ''
        if desc and tarefas and tarefas[0].startswith(desc[:30]):
            tarefas.pop(0)
        out[chave(nome)] = {'nome': limpa(nome), 'requisitos': req, 'descricao': desc, 'tarefas': tarefas, 'cab': cab}
    return out


# ----------------------------------------------------------------------------- Anexo II
def anexo2():
    linhas = texto(ANEXO2).split('\n')
    cargos, comuns = {}, {}
    atual, anterior, buf, cg = None, None, [], False

    def fecha():
        nonlocal buf
        if atual:
            (comuns if atual[0] == 'c' else cargos)[atual[1]] = limpa(' '.join(buf))
        buf = []

    for l in linhas:
        s = l.strip()
        if atual and atual[0] == 'c':
            if s.startswith('Conhecimentos Gerais:'):
                cg = True
            elif cg and buf and buf[-1].endswith('.') and s and not s.startswith('MUNICÍPIO') and s != 'ESTADO DO PARANÁ':
                # O quadro dos conhecimentos comuns aparece no meio do texto de um cargo (ACS e
                # Auxiliar Administrativo): o que vem depois dele continua o cargo anterior.
                fecha()
                atual, buf, cg = ('e', anterior), [cargos.pop(anterior)], False
        if atual and atual[0] == 'e':
            anterior = atual[1]
        if s.startswith('CARGO DE NÍVEL') or s in ('NÍVEL SUPERIOR', 'NÍVEL MÉDIO/TÉCNICO', 'NÍVEL FUNDAMENTAL'):
            fecha(); atual = None; continue
        if s.startswith('CARGO:'):
            fecha(); atual = ('e', s[6:].strip()); continue
        if s.startswith('CONHECIMENTOS COMUNS'):
            fecha(); atual = ('c', s); continue
        if s.startswith('MUNICÍPIO DE PALMITAL') or s == 'ESTADO DO PARANÁ' or s.startswith('ANEXO II') or s.startswith('CONCURSO PÚBLICO'):
            continue
        if s:
            buf.append(s)
    fecha()

    def materias(txt):
        p = re.split(r'(Língua Portuguesa:|Matemática/ ?Raciocínio Lógico:|Conhecimentos Gerais:)', txt)
        return {p[i].rstrip(':').replace('/ ', '/'): p[i + 1].strip() for i in range(1, len(p), 2)}

    niveis = {'SUPERIOR': 'superior', 'MÉDIO': 'medio', 'FUNDAMENTAL': 'fundamental'}
    com = {}
    for k, v in comuns.items():
        nivel = next(n for a, n in niveis.items() if a in k)
        com[nivel] = {'titulo': k.title().replace(' Aos ', ' aos ').replace(' De ', ' de '), 'materias': materias(v)}
    esp = {chave(k): re.sub(r'^(Conhecimentos? Específicos?:\s*)+', '', v) for k, v in cargos.items()}
    return com, esp


# --------------------------------------------------------------------- corpo do edital
def corpo():
    t = CABECALHO.sub('', texto(EDITAL))
    t = re.sub(r'[ \t]+\n', '\n', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    ret = limpa(CABECALHO.sub('', texto(RETIFICACAO)))
    return t.strip(), ret


def ts(nome: str, valor) -> str:
    return f'export const {nome} = {json.dumps(valor, ensure_ascii=False, indent=2)} as const;\n'


def main():
    cargos, esf = quadros()
    a1 = anexo1()
    comuns, a2 = anexo2()
    assert len(cargos) == 49, len(cargos)
    assert [e['area'] for e in esf] == ['ESF I', 'ESF III', 'ESF IV', 'ESF V', 'ESF VI'], esf
    textos = {}
    faltam = []
    for c in cargos:
        k = chave(c['nome'])
        if c['codigo'] in (113, 114):
            k = chave(f"MÉDICO CLÍNICO GERAL – {c['carga'].upper()}")
        r1, r2 = a1.get(k), a2.get(k)
        if not r1 or not r2:
            faltam.append((c['codigo'], c['nome'], bool(r1), bool(r2)))
        textos[c['codigo']] = {
            'nomeAnexo': r1['nome'] if r1 else None,
            'requisitos': r1['requisitos'] if r1 else None,
            'descricao': (r1['descricao'] or None) if r1 else None,
            'tarefas': r1['tarefas'] if r1 else [],
            'especificos': r2 or None,
        }
    # Só o Pedreiro (408) não aparece nos anexos; qualquer outra falta é erro do gerador.
    assert faltam == [(408, 'Pedreiro', False, False)], faltam
    usados1 = {chave(t['nomeAnexo']) for t in textos.values() if t['nomeAnexo']}
    assert usados1 == set(a1), set(a1) - usados1

    cab = ('/* Gerado por dados/editais/palmital-2026/gerar.py a partir dos PDFs oficiais. '
           'Não edite à mão: rode o gerador de novo. */\n')
    destino = RAIZ / 'packages/shared/src/editais/palmital2026/textos.gerado.ts'
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        cab + '/* eslint-disable */\n\n'
        + '/** Quadros 3.1 a 3.4 do edital, como estão no PDF. */\n' + ts('QUADRO_CARGOS', cargos)
        + '\n/** Áreas e bairros do Agente Comunitário de Saúde (Tabela 3.3, nota 2). */\n' + ts('AREAS_ACS', esf)
        + '\n/** Anexo I (requisitos, descrição e tarefas) e Anexo II (conhecimentos específicos), por código. */\n'
        + ts('TEXTOS_CARGOS', {str(k): v for k, v in textos.items()})
        + '\n/** Anexo II: conhecimentos comuns, como o anexo os agrupa. */\n' + ts('CONHECIMENTOS_COMUNS', comuns),
        encoding='utf-8', newline='\n')

    edital, ret = corpo()
    destino2 = RAIZ / 'apps/api/src/servicos/edital/corpus.gerado.ts'
    destino2.parent.mkdir(parents=True, exist_ok=True)
    destino2.write_text(
        cab + '/* eslint-disable */\n\n'
        + '/** Texto integral do Edital de Abertura nº 01/2026 (os quadros saem melhor dos dados estruturados). */\n'
        + f'export const TEXTO_EDITAL = {json.dumps(edital, ensure_ascii=False)};\n\n'
        + '/** Retificação de 18/11/2026 (datas do formulário da prova de títulos). */\n'
        + f'export const TEXTO_RETIFICACAO = {json.dumps(ret, ensure_ascii=False)};\n',
        encoding='utf-8', newline='\n')
    print('ok:', len(cargos), 'cargos,', sum(len(e['bairros']) for e in esf), 'bairros', file=sys.stderr)


if __name__ == '__main__':
    main()

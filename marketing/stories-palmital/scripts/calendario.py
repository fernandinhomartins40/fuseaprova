"""Gera out/campanha-ate-05-12/CALENDARIO.md a partir dos roteiros v23–v46 (o texto do post é o gancho do vídeo)."""
import json
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
TITULOS = {
    23: 'A notícia', 24: 'A palavra de uma letra', 25: 'A pergunta que ninguém faz', 26: 'Quanto custa?',
    27: 'A resposta no edital', 28: 'Na fila do banco', 29: 'O padrão da banca', 30: 'O que você esquece',
    31: 'O ritmo da prova', 32: 'Dois candidatos', 33: 'Teste sem risco', 34: 'O plano da semana',
    35: 'Faltam 6 dias', 36: 'A matéria de todos', 37: 'A armadilha de dezembro', 38: 'Do zero',
    39: 'Faltam 4 dias', 40: 'Os 4 passos', 41: 'Não tenho tempo', 42: 'O número 80',
    43: 'Amanhã acaba', 44: 'Quanto custa por dia', 45: 'Hoje à meia-noite', 46: 'Últimas horas',
}
DIAS = {23: '25-11', 24: '25-11', 25: '25-11', 26: '25-11'}
for i, d in enumerate(['26-11', '27-11', '28-11', '29-11', '30-11', '01-12', '02-12', '03-12', '04-12', '05-12']):
    DIAS[27 + 2 * i] = DIAS[28 + 2 * i] = d
HORAS = {'25-11': ['12h', '15h', '18h', '21h']}

linhas = [
    '# Campanha "R$ 197 em até 6x" — calendário de postagem (25/11 a 05/12)',
    '',
    'Preparatório para o concurso da Prefeitura de Palmital. Cada vídeo está na pasta do dia, com o nome na ordem de postagem.',
    'Horário sugerido: o 1º às 12h e o 2º às 19h (no dia 25/11, os quatro: 12h, 15h, 18h e 21h).',
    '',
]
dia_atual = None
for n in range(23, 47):
    dia = DIAS[n]
    if dia != dia_atual:
        linhas += ['', f'## {dia.replace("-", "/")}', '']
        dia_atual = dia
        ordem = 0
    ordem += 1
    hora = HORAS.get(dia, ['12h', '19h'])[ordem - 1]
    rot = json.loads((RAIZ / 'roteiros' / f'v{n}.json').read_text(encoding='utf-8'))
    gancho = rot['falas']['gancho'][0]
    linhas.append(f'{ordem}. **{TITULOS[n]}** (`v{n}`) · {hora} · arquivo `{dia}/{ordem}-v{n}.mp4`  ')
    linhas.append(f'   Texto do post: "{gancho} Preparatório para o concurso da Prefeitura de Palmital: R$ 197 em até 6x sem juros até 05/12. Link na bio."')
linhas += [
    '',
    '---',
    'Atenção: em 06/12 o preço precisa ir para R$ 297 em produção (PRICE_CENTS=29700), com o OK do dono. Os vídeos anunciam essa alta.',
    '',
]
(RAIZ / 'out' / 'campanha-ate-05-12' / 'CALENDARIO.md').write_text('\n'.join(linhas), encoding='utf-8')
print('ok', len(linhas))

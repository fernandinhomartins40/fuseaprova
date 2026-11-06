"""Prepara o texto do roteiro para a voz: números por extenso, símbolos em palavras e a pronúncia de cada roteiro.

Em voz alta, "1.000" e "÷" dão leitura errada; o roteiro continua escrito como aparece na tela.
Autoteste: python scripts/fala.py
"""
import re

UNID = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze',
        'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
# Substantivos femininos que aparecem depois de número nos roteiros ("2 horas", "200 pessoas").
FEMININOS = {'pessoa', 'pessoas', 'hora', 'horas', 'caixa', 'caixas', 'van', 'vans', 'nota', 'notas', 'prova', 'provas',
             'parcela', 'parcelas', 'saca', 'sacas', 'casa', 'casas', 'fileira', 'fileiras', 'cadeira', 'cadeiras',
             'semana', 'semanas', 'letra', 'letras', 'sílaba', 'sílabas', 'vez', 'vezes', 'palavra', 'palavras',
             'dúzia', 'dúzias', 'tonelada', 'toneladas', 'camisa', 'camisas', 'calça', 'calças', 'senha', 'senhas',
             'dupla', 'duplas', 'peça', 'peças', 'parte', 'partes', 'questão', 'questões', 'etapa', 'etapas'}


def _ate_mil(n: int, fem: bool) -> str:
    if n == 100:
        return 'cem'
    partes = []
    if n >= 100:
        c = CEM[n // 100]
        partes.append(c[:-2] + 'as' if fem and n // 100 >= 2 else c)
        n %= 100
    if n >= 20:
        partes.append(DEZ[n // 10])
        n %= 10
    if n or not partes:
        partes.append({1: 'uma', 2: 'duas'}.get(n, UNID[n]) if fem else UNID[n])
    return ' e '.join(partes)


def por_extenso(n: int, fem: bool = False) -> str:
    if n < 1000:
        return _ate_mil(n, fem)
    if n < 1_000_000:
        mil, resto = divmod(n, 1000)
        cab = 'mil' if mil == 1 else f'{_ate_mil(mil, fem)} mil'
        if not resto:
            return cab
        return f"{cab} {'e ' if resto <= 100 or resto % 100 == 0 else ''}{_ate_mil(resto, fem)}"
    mi, resto = divmod(n, 1_000_000)
    cab = 'um milhão' if mi == 1 else f'{_ate_mil(mi, False)} milhões'
    return cab if not resto else f"{cab} {'e ' if resto <= 100 or resto % 1000 == 0 else ''}{por_extenso(resto, fem)}"


NUMERO = re.compile(r'(?<![\w])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(?:\s+(\w+))?')


def _numero(m: re.Match) -> str:
    inteiro, decimal, seguinte = m[1], m[2], m[3]
    fem = not decimal and (seguinte or '').lower() in FEMININOS
    txt = por_extenso(int(inteiro.replace('.', '')), fem)
    if decimal:
        zeros = len(decimal) - len(decimal.lstrip('0'))
        txt += ' vírgula ' + 'zero ' * zeros + (por_extenso(int(decimal)) if decimal.strip('0') else '')
        txt = txt.rstrip()
    return f'{txt} {seguinte}' if seguinte else txt


def preparar(texto: str, pronuncia: dict[str, str] | None = None) -> str:
    for de in sorted(pronuncia or {}, key=len, reverse=True):
        texto = texto.replace(de, pronuncia[de])
    texto = re.sub(r'(?<=\d)\s*=\s*(?=\d)', ' é igual a ', texto)
    texto = texto.replace(' = ', ' é ').replace('÷', ' dividido por ').replace('×', ' vezes ').replace('−', ' menos ')
    texto = texto.replace(' + ', ' mais ').replace('→', ':').replace('%', ' por cento')
    texto = NUMERO.sub(_numero, texto)
    return re.sub(r'\s+', ' ', texto).strip()


if __name__ == '__main__':
    for n, f, esperado in [(100, False, 'cem'), (101, False, 'cento e um'), (120, False, 'cento e vinte'),
                           (1000, False, 'mil'), (1200, False, 'mil e duzentos'), (1250, False, 'mil duzentos e cinquenta'),
                           (2500, False, 'dois mil e quinhentos'), (5040, False, 'cinco mil e quarenta'),
                           (10000, False, 'dez mil'), (200, True, 'duzentas'), (2, True, 'duas'), (21, True, 'vinte e uma')]:
        assert por_extenso(n, f) == esperado, (n, por_extenso(n, f))
    for de, para in [('2,5 quilos são 2.500 gramas.', 'dois vírgula cinco quilos são dois mil e quinhentos gramas.'),
                     ('0,75 litro', 'zero vírgula setenta e cinco litro'), ('0,045', 'zero vírgula zero quarenta e cinco'),
                     ('30% de 200', 'trinta por cento de duzentos'), ('50 pessoas', 'cinquenta pessoas'), ('2 horas', 'duas horas'),
                     ('3 vezes 20, 60 pães.', 'três vezes vinte, sessenta pães.'), ('Total = quantidade', 'Total é quantidade'),
                     ('3 + 2 = 5', 'três mais dois é igual a cinco')]:
        assert preparar(de) == para, (de, preparar(de))
    assert preparar('Vai RR agora', {'RR': 'erre erre'}) == 'Vai erre erre agora'
    print('ok')

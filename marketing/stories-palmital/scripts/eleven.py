"""ElevenLabs: busca vozes brasileiras, gera amostras e sintetiza as falas.

Uso:
  python scripts/eleven.py vozes                 # lista vozes pt-BR da Voice Library
  python scripts/eleven.py amostras ID [ID ...]  # gera out/amostras/<nome>.mp3 com trechos do roteiro
  python scripts/eleven.py usar ID               # grava a voz escolhida no .env

A chave fica em .env (ELEVENLABS_API_KEY), nunca no código.
"""
import json
import pathlib
import sys
import urllib.parse
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
API = 'https://api.elevenlabs.io/v1'
MODELO = 'eleven_multilingual_v2'
SEMENTE = 21  # troque para obter outra leitura do mesmo texto
# Keren bem animada: estilo alto; estabilidade 0,3 (abaixo disso ela gagueja em alguns trechos).
AJUSTES = {'stability': 0.3, 'similarity_boost': 0.75, 'style': 0.9, 'use_speaker_boost': True, 'speed': 1.2}


def env() -> dict[str, str]:
    valores = {}
    for linha in (RAIZ / '.env').read_text(encoding='utf-8').splitlines():
        if '=' in linha and not linha.lstrip().startswith('#'):
            k, v = linha.split('=', 1)
            valores[k.strip()] = v.strip()
    return valores


def chave() -> str:
    k = env().get('ELEVENLABS_API_KEY', '')
    if not k:
        sys.exit('Preencha ELEVENLABS_API_KEY no arquivo .env do projeto.')
    return k


def chamar(metodo: str, caminho: str, corpo: dict | None = None, binario: bool = False):
    req = urllib.request.Request(
        API + caminho,
        method=metodo,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={'xi-api-key': chave(), 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            dados = r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f'ElevenLabs {e.code}: {e.read().decode(errors="replace")[:400]}')
    return dados if binario else json.loads(dados)


def sintetizar(texto: str, destino: pathlib.Path, voz: str, anterior: str = '', proximo: str = '',
               ajustes: dict | None = None, semente: int | None = None) -> None:
    """Gera um MP3. O texto vizinho (anterior/próximo) mantém a entonação contínua entre os clipes."""
    corpo = {'text': texto, 'model_id': MODELO, 'voice_settings': ajustes or AJUSTES, 'seed': SEMENTE if semente is None else semente}
    if anterior:
        corpo['previous_text'] = anterior
    if proximo:
        corpo['next_text'] = proximo
    destino.write_bytes(chamar('POST', f'/text-to-speech/{voz}?output_format=mp3_44100_128', corpo, binario=True))


def garantir_na_biblioteca(voz: str) -> None:
    minhas = {v['voice_id'] for v in chamar('GET', '/voices')['voices']}
    if voz in minhas:
        return
    q = urllib.parse.urlencode({'search': voz, 'page_size': 5})
    achadas = [v for v in chamar('GET', f'/shared-voices?{q}')['voices'] if v['voice_id'] == voz]
    if not achadas:
        sys.exit(f'Voz {voz} não encontrada na sua conta nem na Voice Library.')
    v = achadas[0]
    chamar('POST', f'/voices/add/{v["public_owner_id"]}/{voz}', {'new_name': v['name']})


def vozes() -> None:
    vistas = {}
    for genero in ('female', 'male'):
        q = urllib.parse.urlencode({'language': 'pt', 'accent': 'brazilian', 'gender': genero,
                                    'sort': 'usage_character_count_1y', 'page_size': 12})
        for v in chamar('GET', f'/shared-voices?{q}')['voices']:
            vistas[v['voice_id']] = v
    for v in vistas.values():
        print(f"{v['voice_id']}  {v['name'][:28]:28} {v['gender']:6} {v.get('age') or '':12} "
              f"{v.get('use_case') or '':18} {v.get('descriptive') or ''}")
        print(f"   {(v.get('description') or '')[:110]}")


AMOSTRA = ('Você quer trabalhar na Prefeitura de Palmital? '
           'O acesso completo custa trezentos e noventa e sete reais. '
           'Mas, no lançamento, sai por cento e noventa e sete, à vista no Pix.')


def amostras(ids: list[str]) -> None:
    pasta = RAIZ / 'out' / 'amostras'
    pasta.mkdir(parents=True, exist_ok=True)
    nomes = {v['voice_id']: v['name'] for v in chamar('GET', '/voices')['voices']}
    for voz in ids:
        garantir_na_biblioteca(voz)
        nome = nomes.get(voz) or {v['voice_id']: v['name'] for v in chamar('GET', '/voices')['voices']}.get(voz, voz)
        arquivo = pasta / f"{''.join(c for c in nome if c.isalnum())[:24]}-{voz[:6]}.mp3"
        sintetizar(AMOSTRA, arquivo, voz)
        print(arquivo)


def usar(voz: str) -> None:
    garantir_na_biblioteca(voz)
    arq = RAIZ / '.env'
    linhas = [l for l in arq.read_text(encoding='utf-8').splitlines() if not l.startswith('ELEVENLABS_VOICE_ID=')]
    linhas.append(f'ELEVENLABS_VOICE_ID={voz}')
    arq.write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    print('voz gravada no .env')


if __name__ == '__main__':
    cmd, *args = sys.argv[1:] or ['vozes']
    {'vozes': lambda: vozes(), 'amostras': lambda: amostras(args), 'usar': lambda: usar(args[0])}[cmd]()

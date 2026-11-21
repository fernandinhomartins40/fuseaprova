"""Sintetiza a trilha de cada vídeo e os efeitos sonoros. Tudo autoral, sem samples.

Uso:
  python scripts/trilha.py v2     # gera public/audio/v2/trilha.wav no estilo do v2
  python scripts/trilha.py sfx    # gera os efeitos (whoosh, ding, pop)
"""
import sys
import pathlib
import wave

import numpy as np

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'public' / 'audio'
TAXA = 44100
BPM = 122
BATIDA = 60 / BPM
COMPASSO = BATIDA * 4
DURACAO = 66.0
rng = np.random.default_rng(7)


def t_(seg: float) -> np.ndarray:
    return np.arange(int(seg * TAXA)) / TAXA


def nota(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def poe(destino: np.ndarray, som: np.ndarray, seg: float, ganho: float = 1.0) -> None:
    i = int(seg * TAXA)
    if i >= len(destino):
        return
    n = min(len(som), len(destino) - i)
    destino[i:i + n] += som[:n] * ganho


def passa_alta(x: np.ndarray, k: int = 6) -> np.ndarray:
    return x - np.convolve(x, np.ones(k) / k, mode='same')


def passa_baixa(x: np.ndarray, k: int) -> np.ndarray:
    return np.convolve(x, np.ones(k) / k, mode='same')


# --- instrumentos -----------------------------------------------------------
def bumbo() -> np.ndarray:
    t = t_(0.35)
    f = 48 + 110 * np.exp(-t * 28)
    fase = 2 * np.pi * np.cumsum(f) / TAXA
    corpo = np.sin(fase) * np.exp(-t * 9)
    clique = rng.standard_normal(len(t)) * np.exp(-t * 300) * 0.25
    return np.tanh((corpo + clique) * 1.6)


def palma() -> np.ndarray:
    t = t_(0.28)
    ruido = passa_alta(rng.standard_normal(len(t)), 3)
    env = np.exp(-t * 22)
    for atraso in (0.008, 0.017):  # as três "mãos" da palma
        env += np.exp(-np.clip(t - atraso, 0, None) * 60) * (t >= atraso) * 0.6
    return ruido * env * 0.5


def chimbal(aberto: bool = False) -> np.ndarray:
    t = t_(0.22 if aberto else 0.06)
    return passa_alta(rng.standard_normal(len(t)), 2) * np.exp(-t * (14 if aberto else 70)) * 0.35


def pluck(midis: list[int], seg: float, brilho: float = 1.0) -> np.ndarray:
    """Acorde de serras desafinadas, com brilho que decai (filtro natural por harmônicos)."""
    t = t_(seg)
    soma = np.zeros_like(t)
    for m in midis:
        for desafina in (-0.12, 0.0, 0.12):
            f = nota(m + desafina)
            for h in range(1, int(min(28, 9000 / f))):
                soma += np.sin(2 * np.pi * f * h * t) / h * np.exp(-t * (4 + h * 1.1 / brilho))
    return soma * np.exp(-t * 3.2) / (len(midis) * 3)


def baixo(midi: int, seg: float) -> np.ndarray:
    t = t_(seg)
    f = nota(midi)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t * 200) * np.exp(-t * 4)
    return np.tanh(s * env * 1.4) * 0.8


def oitocentos(midi: int, seg: float) -> np.ndarray:
    """Baixo 808 do trap: seno grave e longo, com um leve deslize de afinação no ataque."""
    t = t_(seg)
    f = nota(midi) * (1 + 0.5 * np.exp(-t * 30))
    s = np.sin(2 * np.pi * np.cumsum(f) / TAXA)
    return np.tanh(s * 2.2) * np.minimum(1, t * 300) * np.exp(-t * 1.6) * 0.8


def caixa() -> np.ndarray:
    t = t_(0.22)
    tom = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.6
    return (tom + passa_alta(rng.standard_normal(len(t)), 2) * np.exp(-t * 18) * 0.7) * 0.6


def sino(midi: int, seg: float = 0.5) -> np.ndarray:
    t = t_(seg)
    f = nota(midi)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 7) * 0.5


def subida(seg: float) -> np.ndarray:
    t = t_(seg)
    ruido = rng.standard_normal(len(t))
    ruido = passa_alta(ruido, 3)
    return ruido * (t / seg) ** 2 * 0.25


# --- arranjo ----------------------------------------------------------------
# I–V–vi–IV em Ré maior: D A Bm G
ACORDES = [[62, 66, 69, 74], [61, 64, 69, 73], [62, 66, 71, 74], [62, 67, 71, 74]]
BAIXOS = [38, 33, 35, 31]
ARPEJO = [74, 78, 81, 78, 73, 76, 81, 76, 74, 78, 83, 78, 74, 79, 83, 79]
BUMBO, BAIXO_GANHO, BRILHO, CHIMBAL = 0.55, 0.32, 1.0, 0.8
GROOVE = 'house'

# Um estilo por vídeo: andamento, harmonia (4 acordes), baixo e timbre.
ESTILOS = {
    # v1: pop/house animado em Ré maior (I–V–vi–IV)
    'v1': dict(bpm=122, acordes=ACORDES, baixos=BAIXOS, bumbo=0.55, baixo=0.32, brilho=1.0, chimbal=0.8, semente=7),
    # v2: lo-fi pop noturno, acordes com sétima, mais suave
    'v2': dict(bpm=94, acordes=[[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]],
               baixos=[41, 40, 38, 36], bumbo=0.45, baixo=0.36, brilho=0.55, chimbal=0.45, semente=11),
    # v3: pulsante e decidido, Lá menor (i–VI–III–VII)
    'v3': dict(bpm=128, acordes=[[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]],
               baixos=[33, 29, 36, 31], bumbo=0.62, baixo=0.34, brilho=1.25, chimbal=0.9, semente=23),
    # v4: saltitante e alegre, Mi maior (I–V–vi–IV)
    'v4': dict(bpm=116, acordes=[[64, 68, 71, 76], [63, 66, 71, 75], [61, 64, 68, 73], [61, 64, 69, 73]],
               baixos=[40, 35, 37, 33], bumbo=0.55, baixo=0.3, brilho=1.1, chimbal=0.85, semente=31),
    # v5: convite caloroso e animado, Sol maior (I–iii–IV–V), groove de 112 BPM
    'v5': dict(bpm=112, acordes=[[55, 59, 62, 67], [59, 62, 66, 71], [60, 64, 67, 72], [62, 66, 69, 74]],
               baixos=[31, 35, 36, 38], bumbo=0.52, baixo=0.32, brilho=0.95, chimbal=0.75, semente=43),
    # v6: tutorial leve e confiante, Lá maior (I–IV–vi–V), 118 BPM
    'v6': dict(bpm=118, acordes=[[57, 61, 64, 69], [62, 66, 69, 74], [54, 57, 61, 66], [52, 56, 59, 64]],
               baixos=[33, 38, 30, 28], bumbo=0.54, baixo=0.3, brilho=1.05, chimbal=0.8, semente=53),
    # v7: sóbrio e decidido, Ré menor (i–VI–III–VII), 120 BPM, menos brilho
    'v7': dict(bpm=120, acordes=[[62, 65, 69, 74], [58, 62, 65, 70], [53, 57, 60, 65], [60, 64, 67, 72]],
               baixos=[38, 34, 29, 36], bumbo=0.58, baixo=0.34, brilho=0.7, chimbal=0.7, semente=71),
    # v8: tenso no começo e resolvido no fim, Fá# menor (i–VI–III–VII), 110 BPM
    'v8': dict(bpm=110, acordes=[[54, 57, 61, 66], [50, 54, 57, 62], [57, 61, 64, 69], [52, 56, 59, 64]],
               baixos=[30, 26, 33, 28], bumbo=0.56, baixo=0.34, brilho=0.65, chimbal=0.6, semente=83),
    # v9: dinâmico, Si menor (i–VI–III–VII), 124 BPM
    'v9': dict(bpm=124, acordes=[[59, 62, 66, 71], [55, 59, 62, 67], [50, 54, 57, 62], [57, 61, 64, 69]],
               baixos=[35, 31, 26, 33], bumbo=0.6, baixo=0.33, brilho=0.85, chimbal=0.8, semente=91),
    # v10: curioso e confiante, Mi menor (i–iv–VI–V), 114 BPM
    'v10': dict(bpm=114, acordes=[[52, 55, 59, 64], [57, 60, 64, 69], [48, 52, 55, 60], [47, 51, 54, 59]],
                baixos=[28, 33, 24, 35], bumbo=0.55, baixo=0.32, brilho=0.8, chimbal=0.7, semente=101),
    # v11: notícia urgente e confiante, Lá menor (i–VI–III–VII), 122 BPM
    'v11': dict(bpm=122, acordes=[[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]],
                baixos=[33, 29, 24, 31], bumbo=0.6, baixo=0.34, brilho=0.8, chimbal=0.8, semente=111),
    # v12: tecnológico e leve, Ré maior (I–V–vi–IV), 116 BPM
    'v12': dict(bpm=116, acordes=[[62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]],
                baixos=[38, 33, 35, 31], bumbo=0.52, baixo=0.3, brilho=1.0, chimbal=0.75, semente=121),
    # v13–v15: campanha colorida "antes do dia 25", pop alegre em tom maior
    # v13: Sol maior (I–V–vi–IV), 124 BPM
    'v13': dict(bpm=124, acordes=[[55, 59, 62, 67], [62, 66, 69, 74], [52, 55, 59, 64], [60, 64, 67, 72]],
                baixos=[31, 38, 28, 36], bumbo=0.58, baixo=0.32, brilho=1.15, chimbal=0.85, semente=131),
    # v14: Fá maior (I–vi–IV–V), 112 BPM, mais leve para a lista
    'v14': dict(bpm=112, acordes=[[65, 69, 72, 77], [62, 65, 69, 74], [58, 62, 65, 70], [60, 64, 67, 72]],
                baixos=[29, 38, 34, 36], bumbo=0.5, baixo=0.3, brilho=1.05, chimbal=0.75, semente=141),
    # v15: Mi maior (I–IV–V–IV), 128 BPM, saltitante
    'v15': dict(bpm=128, acordes=[[64, 68, 71, 76], [57, 61, 64, 69], [59, 63, 66, 71], [57, 61, 64, 69]],
                baixos=[40, 33, 35, 33], bumbo=0.6, baixo=0.32, brilho=1.25, chimbal=0.9, semente=151),
    # v16: curioso, de "laboratório", Lá menor (i–VI–III–VII), 104 BPM e pouco brilho
    'v16': dict(bpm=104, acordes=[[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]],
                baixos=[33, 29, 36, 31], bumbo=0.5, baixo=0.32, brilho=0.7, chimbal=0.6, semente=161),
    # v17–v20: contagem regressiva para 25/11, cada uma com uma batida diferente das anteriores
    # v17: disco alegre de domingo, Si bemol maior (I–vi–ii–V), 118 BPM
    'v17': dict(bpm=118, acordes=[[58, 62, 65, 70], [55, 58, 62, 67], [60, 63, 67, 72], [53, 57, 60, 65]],
                baixos=[34, 31, 36, 29], bumbo=0.58, baixo=0.3, brilho=1.2, chimbal=0.85, semente=171, groove='disco'),
    # v18: funk de segunda-feira, Dó menor (i–VI–III–VII), 130 BPM
    'v18': dict(bpm=130, acordes=[[60, 63, 67, 72], [56, 60, 63, 68], [55, 58, 63, 67], [58, 62, 65, 70]],
                baixos=[36, 32, 39, 34], bumbo=0.66, baixo=0.36, brilho=0.9, chimbal=0.8, semente=181, groove='funk'),
    # v19: trap de véspera, Sol menor (i–VI–VII–i), 140 BPM em meio tempo
    'v19': dict(bpm=140, acordes=[[55, 58, 62, 67], [51, 55, 58, 63], [53, 57, 60, 65], [55, 58, 62, 67]],
                baixos=[31, 27, 29, 31], bumbo=0.62, baixo=0.34, brilho=0.85, chimbal=0.8, semente=191, groove='trap'),
    # v20: funk de festa no dia 25, Mi bemol maior (I–V–vi–IV), 132 BPM e mais brilho
    'v20': dict(bpm=132, acordes=[[63, 67, 70, 75], [58, 62, 65, 70], [60, 63, 67, 72], [56, 60, 63, 68]],
                baixos=[39, 34, 36, 32], bumbo=0.66, baixo=0.34, brilho=1.25, chimbal=0.9, semente=201, groove='funk'),
    # aulas: mais calmas que as de venda, para a explicação ficar na frente
    # aula1: estudo leve, Fá maior (I–vi–IV–V), 100 BPM
    'aula1': dict(bpm=100, acordes=[[65, 69, 72, 77], [62, 65, 69, 74], [58, 62, 65, 70], [60, 64, 67, 72]],
                  baixos=[29, 38, 34, 36], bumbo=0.42, baixo=0.28, brilho=0.75, chimbal=0.55, semente=61),
    # aula2: curioso e esperto, Dó maior (I–V–vi–IV), 104 BPM
    'aula2': dict(bpm=104, acordes=[[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]],
                  baixos=[36, 31, 33, 29], bumbo=0.44, baixo=0.28, brilho=0.8, chimbal=0.6, semente=67),
}
# Videoaulas por dados: uma trilha por matéria, gerada uma vez só.
ESTILOS['portugues'] = ESTILOS['aula1']
ESTILOS['matematica'] = ESTILOS['aula2']


def usa_estilo(nome: str) -> None:
    global BPM, BATIDA, COMPASSO, ACORDES, BAIXOS, ARPEJO, BUMBO, BAIXO_GANHO, BRILHO, CHIMBAL, GROOVE, rng
    e = ESTILOS[nome]
    GROOVE = e.get('groove', 'house')
    BPM, ACORDES, BAIXOS = e['bpm'], e['acordes'], e['baixos']
    BATIDA, COMPASSO = 60 / BPM, 240 / BPM
    BUMBO, BAIXO_GANHO, BRILHO, CHIMBAL = e['bumbo'], e['baixo'], e['brilho'], e['chimbal']
    rng = np.random.default_rng(e['semente'])
    if nome != 'v1':  # arpejo derivado do acorde, uma oitava acima
        ARPEJO = None


def env_pump(pump: np.ndarray, seg: float) -> None:
    i = int(seg * TAXA)
    env = 1 - 0.6 * np.exp(-t_(BATIDA) * 14)
    pump[i:i + len(env)] = env[: max(0, min(len(env), len(pump) - i))]


def groove(bat, harm, pump, ini: float, raiz: int, c: int, k, p) -> None:
    """Bateria e baixo dos estilos novos: funk (batida dembow), trap (meio tempo com 808) e disco (baixo em oitavas)."""
    passo = BATIDA / 4
    if GROOVE == 'funk':
        for s in (0, 3, 8, 11):  # tum . . tum . . . . tum . . tum
            poe(bat, k, ini + s * passo, BUMBO)
            env_pump(pump, ini + s * passo)
            poe(harm, baixo(raiz, passo * 2.5), ini + s * passo, BAIXO_GANHO)
        for s in (4, 12):
            poe(bat, p, ini + s * passo, 0.75)
        for s in (6, 14):
            poe(bat, caixa(), ini + s * passo, 0.55)
        for s in range(0, 16, 2):
            poe(bat, chimbal(), ini + s * passo, 0.3 * CHIMBAL)
    elif GROOVE == 'trap':
        for s, dur in ((0, 7), (7, 3), (10, 6)):
            poe(bat, k, ini + s * passo, BUMBO)
            poe(harm, oitocentos(raiz, dur * passo), ini + s * passo, BAIXO_GANHO * 1.6)
        poe(bat, caixa(), ini + 8 * passo, 0.75)
        poe(bat, p, ini + 8 * passo, 0.5)
        for s in range(16):
            rolo = c % 2 == 1 and s >= 12  # rolinho de chimbal em tercinas no fim dos compassos ímpares
            for r in range(3 if rolo else 1):
                poe(bat, chimbal(), ini + s * passo + r * passo / 3, (0.45 if s % 2 == 0 else 0.3) * CHIMBAL)
    else:  # disco
        for b in range(4):
            tb = ini + b * BATIDA
            poe(bat, k, tb, BUMBO)
            env_pump(pump, tb)
            if b in (1, 3):
                poe(bat, p, tb, 0.7)
            poe(bat, chimbal(aberto=True), tb + BATIDA / 2, CHIMBAL)
            for o in range(2):  # baixo em oitavas, colcheias
                poe(harm, baixo(raiz + 12 * o, BATIDA / 2.2), tb + o * BATIDA / 2, BAIXO_GANHO)


def trilha() -> np.ndarray:
    n = int(DURACAO * TAXA)
    bat, harm, pump = np.zeros(n), np.zeros(n), np.ones(n)
    k, p = bumbo(), palma()
    compassos = int(DURACAO / COMPASSO) + 1
    for c in range(compassos):
        ini = c * COMPASSO
        acorde, raiz = ACORDES[c % 4], BAIXOS[c % 4]
        intro = c < 2
        cheio = c >= 2
        if cheio and GROOVE != 'house':
            groove(bat, harm, pump, ini, raiz, c, k, p)
        for b in range(4 if GROOVE == 'house' else 0):
            tb = ini + b * BATIDA
            if cheio:
                poe(bat, k, tb, BUMBO)
                # sidechain: o resto "respira" com o bumbo
                i = int(tb * TAXA)
                env = 1 - 0.65 * np.exp(-t_(BATIDA) * 14)
                pump[i:i + len(env)] = env[: max(0, min(len(env), n - i))]
                if b in (1, 3):
                    poe(bat, p, tb, 0.7)
                poe(bat, chimbal(aberto=True), tb + BATIDA / 2, CHIMBAL)
                poe(harm, baixo(raiz, BATIDA / 2), tb + BATIDA / 2, BAIXO_GANHO)
            for s in range(4):
                if cheio and s % 2 == 1:
                    poe(bat, chimbal(), tb + s * BATIDA / 4, 0.35)
            # stabs de acorde no contratempo (padrão 3-3-2)
        for pos in ((0, 0.75, 1.5, 2.25, 3, 3.5) if GROOVE != 'trap' else (0, 1.5, 2.5)):
            poe(harm, pluck(acorde, 0.45, brilho=(0.6 if intro else 1.0) * BRILHO), ini + pos * BATIDA, 1.1 if intro else 1.0)
        if c >= 6:  # arpejo entra depois da apresentação
            arpejo = ARPEJO or [acorde[j] + 12 for j in (0, 1, 2, 1, 0, 2, 3, 2) * 2]
            for s, m in enumerate(arpejo):
                poe(harm, sino(m + (0 if c % 4 != 3 else -2), 0.3), ini + s * BATIDA / 4, 0.3)
        if c % 8 == 7:  # virada antes de cada bloco de 8 compassos
            poe(bat, subida(COMPASSO), ini, 0.8)
            for s in range(8):
                poe(bat, p, ini + 3 * BATIDA + s * BATIDA / 8, 0.25 + s * 0.05)
    harm *= pump
    mix = bat + harm
    mix /= np.max(np.abs(mix)) + 1e-9
    mix = np.tanh(mix * 1.3) / np.tanh(1.3)
    fade = int(1.5 * TAXA)
    mix[-fade:] *= np.linspace(1, 0, fade)
    return mix * 0.9


# --- efeitos ----------------------------------------------------------------
def whoosh() -> np.ndarray:
    t = t_(0.45)
    ruido = rng.standard_normal(len(t))
    # varredura: mistura de passa-baixa (grave) para passa-alta (agudo)
    grave, agudo = passa_baixa(ruido, 24), passa_alta(ruido, 4)
    mov = t / t[-1]
    s = grave * (1 - mov) * 2.2 + agudo * mov
    return s * np.sin(np.pi * mov) ** 1.5 * 0.6


def ding() -> np.ndarray:
    t = t_(1.2)
    s = sum(a * np.sin(2 * np.pi * nota(m) * t) * np.exp(-t * d) for m, a, d in ((86, 0.6, 3), (93, 0.35, 4), (98, 0.25, 6)))
    s2 = np.zeros_like(s)
    atraso = int(0.09 * TAXA)
    s2[atraso:] = s[:-atraso]  # segunda nota, tipo "caixa registradora"
    return (s + 0.8 * s2) * 0.6


def pop() -> np.ndarray:
    t = t_(0.12)
    f = 300 + 900 * np.exp(-t * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / TAXA) * np.exp(-t * 35) * 0.7


def grava(nome: str, x: np.ndarray) -> None:
    x = np.clip(x, -1, 1)
    with wave.open(str(SAIDA / nome), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TAXA)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print(nome, f'{len(x) / TAXA:.2f}s')


if __name__ == '__main__':
    alvo = sys.argv[1] if len(sys.argv) > 1 else 'sfx'
    if alvo == 'sfx':
        SAIDA.mkdir(parents=True, exist_ok=True)
        grava('sfx-whoosh.wav', whoosh())
        grava('sfx-ding.wav', ding())
        grava('sfx-pop.wav', pop())
    else:
        usa_estilo(alvo)
        (SAIDA / alvo).mkdir(parents=True, exist_ok=True)
        grava(f'{alvo}/trilha.wav', trilha())

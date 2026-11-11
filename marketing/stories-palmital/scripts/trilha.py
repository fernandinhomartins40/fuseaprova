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
    global BPM, BATIDA, COMPASSO, ACORDES, BAIXOS, ARPEJO, BUMBO, BAIXO_GANHO, BRILHO, CHIMBAL, rng
    e = ESTILOS[nome]
    BPM, ACORDES, BAIXOS = e['bpm'], e['acordes'], e['baixos']
    BATIDA, COMPASSO = 60 / BPM, 240 / BPM
    BUMBO, BAIXO_GANHO, BRILHO, CHIMBAL = e['bumbo'], e['baixo'], e['brilho'], e['chimbal']
    rng = np.random.default_rng(e['semente'])
    if nome != 'v1':  # arpejo derivado do acorde, uma oitava acima
        ARPEJO = None


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
        for b in range(4):
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
        for pos in (0, 0.75, 1.5, 2.25, 3, 3.5):
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

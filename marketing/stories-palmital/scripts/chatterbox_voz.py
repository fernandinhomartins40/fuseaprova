"""Voz open source (Chatterbox Multilingual, MIT) rodando local, em CPU.

Roda no ambiente .venv-voz:
  .venv-voz/Scripts/python scripts/chatterbox_voz.py amostras [--ref voz.wav]
  .venv-voz/Scripts/python scripts/chatterbox_voz.py fala "texto" saida.wav [--ref voz.wav] [--expressao 0.6]

--ref: 10 a 20 s de uma voz brasileira gravada com autorização (ex.: você mesmo). Sem ela, usa a voz padrão do modelo.
"""
import argparse
import pathlib

import torch
import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

RAIZ = pathlib.Path(__file__).resolve().parent.parent
AMOSTRA = ('Você quer trabalhar na Prefeitura de Palmital? '
           'O acesso completo custa trezentos e noventa e sete reais. '
           'Mas, no lançamento, sai por cento e noventa e sete, à vista no Pix.')

_modelo = None


def modelo() -> ChatterboxMultilingualTTS:
    global _modelo
    if _modelo is None:
        torch.manual_seed(7)
        _modelo = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    return _modelo


def fala(texto: str, saida: pathlib.Path, ref: str | None = None, expressao: float = 0.6, cfg: float = 0.4) -> None:
    """expressao (exaggeration): 0,5 é neutro; mais alto deixa a fala mais animada. cfg menor dá ritmo mais solto."""
    m = modelo()
    wav = m.generate(texto, language_id='pt', audio_prompt_path=ref, exaggeration=expressao, cfg_weight=cfg)
    saida.parent.mkdir(parents=True, exist_ok=True)
    ta.save(str(saida), wav, m.sr)
    print(saida)


def amostras(ref: str | None) -> None:
    pasta = RAIZ / 'out' / 'amostras'
    nome = pathlib.Path(ref).stem if ref else 'padrao'
    for expressao in (0.5, 0.7):
        fala(AMOSTRA, pasta / f'chatterbox-{nome}-expressao{int(expressao * 10)}.wav', ref, expressao)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['amostras', 'fala'])
    ap.add_argument('texto', nargs='?')
    ap.add_argument('saida', nargs='?')
    ap.add_argument('--ref')
    ap.add_argument('--expressao', type=float, default=0.6)
    a = ap.parse_args()
    if a.cmd == 'amostras':
        amostras(a.ref)
    else:
        fala(a.texto, pathlib.Path(a.saida), a.ref, a.expressao)

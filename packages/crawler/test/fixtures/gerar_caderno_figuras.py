"""Gera um caderno sintetico de 2 colunas: figura vetorial, imagem e questoes so de texto."""
import sys

import pymupdf

LARG, ALT = 595, 842
doc = pymupdf.open()


def texto(pg, x, y, t, negrito=False):
    pg.insert_text((x, y), t, fontname="hebo" if negrito else "helv", fontsize=10)


def alternativas(pg, x, y):
    for i, letra in enumerate("ABCDE"):
        texto(pg, x, y + i * 13, f"({letra}) Opcao {letra}")
    return y + 5 * 13


marca = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 40, 40), False)
marca.clear_with(235)

pg = doc.new_page(width=LARG, height=ALT)
# coluna esquerda: questao 1 (texto) e questao 2 (figura vetorial)
texto(pg, 50, 80, "01) Quanto e dois mais dois?", True)
y = alternativas(pg, 50, 100)
texto(pg, 50, y + 25, "02) Observe a figura abaixo:", True)
pg.draw_rect(pymupdf.Rect(60, y + 40, 200, y + 130), color=(0, 0, 1), fill=(0.8, 0.9, 1), width=1.5)
pg.draw_line((60, y + 40), (200, y + 130), color=(1, 0, 0), width=1.5)
texto(pg, 100, y + 90, "A")
alternativas(pg, 50, y + 150)
# coluna direita: questao 3 (texto) e questao 4 (imagem)
texto(pg, 320, 80, "03) Assinale a correta, sem figura nenhuma:", True)
y3 = alternativas(pg, 320, 100)
texto(pg, 320, y3 + 25, "04) Considere o grafico:", True)
pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 120, 80), False)
pix.clear_with(90)
pg.insert_image(pymupdf.Rect(330, y3 + 40, 450, y3 + 120), pixmap=pix)
alternativas(pg, 320, y3 + 140)

pg2 = doc.new_page(width=LARG, height=ALT)
texto(pg2, 50, 80, "05) Ultima questao, so texto.", True)
alternativas(pg2, 50, 100)

# marca d'agua repetida em todas as paginas (como a do PCI) e rodape
for p in (doc[0], doc[1]):
    p.insert_image(pymupdf.Rect(0, 700, 100, 800), pixmap=marca)
    texto(p, 400, 830, "www.pciconcursos.com.br")
doc.save(sys.argv[1])

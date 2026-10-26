#!/usr/bin/env python3
"""
Estilos do texto de um PDF (opcional): negrito, itálico e sublinhado.

Uso: python3 -I estilos_pdf.py <arquivo.pdf>   (precisa do PyMuPDF: `pip install pymupdf`)
Saída (JSON no stdout): { "paginas": [ { "runs": [ ... ] } ] }, um item por página, em que cada
run é um trecho de uma linha com o mesmo estilo:
  { "t": texto, "e": "u" | "b" | "i", "a": contexto antes, "d": contexto depois, "L": linha toda, "k": ordem }
  - "u" = sublinhado; "b" = negrito; "i" = itálico (um run por estilo);
  - "k" = quantas vezes o mesmo trecho com contexto aparece antes na página (0 = primeira);
  - "a"/"d" = até 24 caracteres vizinhos (sem espaços) na ordem de leitura, para o Node achar o
    trecho no texto do pdftotext; "L" = a linha inteira tem esse estilo (título, citação).
Sem PyMuPDF, o script sai com código 3 e o coletor segue sem estilos. Não usa rede.
"""
import json
import re
import sys

try:
    import pymupdf
except Exception:  # pragma: no cover
    sys.exit(3)

CTX = 24
RE_NEGRITO = re.compile(r"bold|black|heavy|semibold|demi", re.I)
RE_ITALICO = re.compile(r"italic|oblique", re.I)
RE_ENUM = re.compile(r"^\s*(\(?[A-E]\)|\d{1,3}\s*[.)–-])\s*")


def segmentos(pagina):
    """Traços finos (sublinhados ou bordas): (x0, x1, y)."""
    segs = []
    for d in pagina.get_drawings():
        r = d["rect"]
        if d.get("fill") is not None and r.height <= 1.8 and r.width >= 2:
            segs.append((r.x0, r.x1, (r.y0 + r.y1) / 2))
            continue
        for it in d["items"]:
            if it[0] == "l":
                p1, p2 = it[1], it[2]
                if abs(p1.y - p2.y) <= 0.6 and abs(p1.x - p2.x) >= 2:
                    segs.append((min(p1.x, p2.x), max(p1.x, p2.x), (p1.y + p2.y) / 2))
            elif it[0] == "re" and it[1].height <= 1.8 and it[1].width >= 2:
                segs.append((it[1].x0, it[1].x1, (it[1].y0 + it[1].y1) / 2))
    return segs


def pagina_runs(pagina):
    segs = segmentos(pagina)
    raw = pagina.get_text("rawdict")
    linhas = []  # cada linha: lista de [char, destaque, italico, bbox]
    for bloco in raw["blocks"]:
        for linha in bloco.get("lines", []):
            cs = []
            for sp in linha["spans"]:
                negrito = bool(sp["flags"] & 16) or bool(RE_NEGRITO.search(sp["font"]))
                italico = bool(sp["flags"] & 2) or bool(RE_ITALICO.search(sp["font"]))
                for ch in sp["chars"]:
                    cs.append([ch["c"], negrito, italico, ch["bbox"], sp["size"], False])
            if cs:
                linhas.append(cs)

    # Sublinhado: um traço vale para os caracteres logo acima dele; traço que passa muito do
    # texto coberto é borda de tabela, não sublinhado.
    for cs in linhas:
        for seg in segs:
            x0, x1, y = seg
            cobertos = []
            for i, c in enumerate(cs):
                bx0, by0, bx1, by1 = c[3]
                tam = c[4]
                if (bx0 + bx1) / 2 >= x0 - 0.5 and (bx0 + bx1) / 2 <= x1 + 0.5 and by1 - 0.4 * tam <= y <= by1 + 0.2 * tam:
                    cobertos.append(i)
            if not cobertos:
                continue
            ini = cs[cobertos[0]][3][0]
            fim = cs[cobertos[-1]][3][2]
            if (x1 - x0) > (fim - ini) + 6:
                continue
            for i in cobertos:
                cs[i][5] = True  # sublinhado

    # Sequência de leitura (com contexto entre linhas) sem espaços.
    seq = []
    pos_linha = []
    for cs in linhas:
        ini = len(seq)
        for c in cs:
            if not c[0].isspace():
                seq.append(c[0])
        pos_linha.append((ini, len(seq)))

    seq_str = "".join(seq)
    runs = []
    for cs, (ini, fim) in zip(linhas, pos_linha):
        texto = "".join(c[0] for c in cs)
        m = RE_ENUM.match(texto)
        pref = m.end() if m else 0
        # índice de cada char na seq (só não-espaço)
        idx = []
        n = ini
        for c in cs:
            if c[0].isspace():
                idx.append(None)
            else:
                idx.append(n)
                n += 1
        # colunas do char: 1 negrito, 2 itálico, 5 sublinhado
        for estilo, col in (("u", 5), ("b", 1), ("i", 2)):
            i = pref
            while i < len(cs):
                if cs[i][col] and not cs[i][0].isspace():
                    j = i
                    while j < len(cs) and (cs[j][col] or cs[j][0].isspace()):
                        j += 1
                    while j > i and cs[j - 1][0].isspace():
                        j -= 1
                    t = "".join(c[0] for c in cs[i:j])
                    if re.search(r"\w", t):
                        a = idx[i]
                        b = idx[j - 1] + 1
                        corpo = [c for c in cs[pref:] if not c[0].isspace()]
                        toda = bool(corpo) and all(c[col] for c in corpo)
                        inicio = max(0, a - CTX)
                        padrao = seq_str[inicio:b + CTX]
                        # k: quantas vezes esse mesmo trecho com contexto aparece antes na página
                        # (a mesma frase pode vir duas vezes, só uma sublinhada).
                        k = 0
                        j2 = seq_str.find(padrao)
                        while 0 <= j2 < inicio:
                            k += 1
                            j2 = seq_str.find(padrao, j2 + 1)
                        runs.append(
                            {
                                "t": t,
                                "e": estilo,
                                "a": seq_str[inicio:a],
                                "d": seq_str[b:b + CTX],
                                "L": toda,
                                "k": k,
                            }
                        )
                    i = j
                else:
                    i += 1
    return runs


def main():
    doc = pymupdf.open(sys.argv[1])
    saida = {"paginas": [{"runs": pagina_runs(p)} for p in doc]}
    sys.stdout.buffer.write(json.dumps(saida, ensure_ascii=True).encode("utf-8"))


if __name__ == "__main__":
    main()

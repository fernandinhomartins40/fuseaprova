#!/usr/bin/env python3
"""
Recorte das figuras das questões de um caderno de prova em PDF (opcional, precisa do PyMuPDF).

Uso: python3 -I figuras_pdf.py <caderno.pdf> <pedido.json>
  pedido.json: { "saida": "<pasta>", "dpi": 170, "questoes": [ { "chave": "<id>", "numero": 3 } ] }
Saída (JSON em pedido["resultado"], se houver, ou no stdout): { "paginas": N, "resultados": [ ... ] }, um item por pedido:
  { chave, numero, ok, arquivo?, pagina?, caixas?, confianca ("alta"|"media"|"baixa"), estrategia, motivo? }

Como funciona (sem rede, o PDF é tratado como dado não confiável: só é lido e desenhado):
  1. acha o marcador "NN)" ou "NN." de cada questão (sequência crescente na ordem de leitura:
     página, coluna, altura); os cadernos FAU têm 1 ou 2 colunas;
  2. a região da questão vai do marcador até o marcador seguinte, e continua na coluna/página
     seguinte quando a questão atravessa a quebra;
  3. dentro da região procura desenhos vetoriais e imagens (sem a marca d'água do PCI, as caixas
     brancas de máscara e os sublinhados do texto); agrupa por proximidade e recorta só a figura
     (com os rótulos que a tocam). Imagens pequenas dentro do texto (símbolos) ou tabelas só de
     texto caem no recorte da questão inteira, com confiança menor;
  4. grava um PNG com margem branca, sem cabeçalho, rodapé nem marca d'água.
"""
import json
import os
import re
import sys

try:
    import pymupdf
except Exception:  # pragma: no cover
    sys.exit(3)

MARCADOR = re.compile(r"^\s*0*(\d{1,3})\s*[.)–—-]\s*(\S.*)?$")
RE_MARCA = re.compile(r"pciconcursos|pcimark", re.I)
RE_DESTAQUE = re.compile(r"destaque|sublinhad|grifad|negrito|it[aá]lic", re.I)
RE_ALT = re.compile(r"^\s*\(?[A-E]\)")
LIMITE_BYTES = 1_900_000
BORDA = 4.0  # margem branca em pontos
AGRUPA = 5.0  # distância máxima entre elementos do mesmo desenho
FOLGA_ROTULO = 9.0


def inter(a, b):
    return pymupdf.Rect(a) & pymupdf.Rect(b)


def area(r):
    r = pymupdf.Rect(r)
    return max(0.0, r.width) * max(0.0, r.height)


def uniao(rs):
    u = pymupdf.Rect(rs[0])
    for r in rs[1:]:
        u |= pymupdf.Rect(r)
    return u


def linhas_da_pagina(pagina):
    """Linhas de texto úteis: (bbox, texto, negrito). Sem marcas d'água e números de página."""
    saida = []
    alt = pagina.rect.height
    for b in pagina.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for ln in b["lines"]:
            spans = [s for s in ln["spans"] if s["text"].strip()]
            if not spans:
                continue
            texto = "".join(s["text"] for s in ln["spans"]).strip()
            if RE_MARCA.search(texto):
                continue
            x0, y0, x1, y1 = ln["bbox"]
            if y1 < 0 or y0 > alt:
                continue
            if re.fullmatch(r"\d{1,3}", texto) and (y0 > alt * 0.9 or y1 < alt * 0.08):
                continue  # número da página
            s0 = spans[0]
            neg = bool(s0["flags"] & 16) or bool(re.search(r"bold|black|heavy", s0["font"], re.I))
            saida.append((pymupdf.Rect(x0, y0, x1, y1), texto, neg))
    return saida


def marcas_dagua(doc):
    """xrefs das imagens que se repetem, na mesma posição, na maioria das páginas (marca do PCI)."""
    contagem = {}
    for p in doc:
        vistos = set()
        for im in p.get_image_info(xrefs=True):
            chave = tuple(round(v / 4) for v in im["bbox"])
            if chave not in vistos:
                vistos.add(chave)
                contagem[chave] = contagem.get(chave, 0) + 1
    n = len(doc)
    limite = max(2, n * 0.5)
    return {c for c, v in contagem.items() if v >= limite and n >= 2}


def colunas(pagina, linhas):
    """Devolve a lista de faixas x [(x0, x1)]: 2 colunas se o texto respeita o meio da página."""
    larg = pagina.rect.width
    meio = larg / 2
    uteis = [r for r, t, _ in linhas if r.width > 20]
    if len(uteis) < 6:
        return [(0.0, larg)]
    cruzam = sum(1 for r in uteis if r.x0 < meio - 25 and r.x1 > meio + 25)
    direita = sum(1 for r in uteis if r.x0 >= meio - 10)
    if direita < 6 or cruzam > 0.25 * len(uteis):
        return [(0.0, larg)]
    return [(0.0, meio), (meio, larg)]


def coluna_de(r, faixas):
    if len(faixas) == 1:
        return 0
    cx = (r.x0 + r.x1) / 2
    return 0 if cx < faixas[0][1] else 1


def achar_marcadores(doc, paginas):
    """Candidatos a marcador de questão, na ordem de leitura: (pagina, coluna, y0, numero, rect)."""
    cands = []
    for pn, p in enumerate(doc):
        linhas, faixas = paginas[pn]
        for r, texto, neg in linhas:
            m = MARCADOR.match(texto)
            if not m:
                continue
            c = coluna_de(r, faixas)
            fx0 = faixas[c][0]
            if r.x0 - fx0 > 70:  # marcador começa perto da margem esquerda da coluna
                continue
            if RE_ALT.match(texto):
                continue
            cands.append((pn, c, r.y0, int(m.group(1)), r, neg, texto))
    cands.sort(key=lambda c: (c[0], c[1], c[2]))
    return cands


def escolher_sequencia(cands, alvos):
    """Escolhe, na ordem de leitura, o marcador de cada número crescente (1, 2, 3...)."""
    escolhidos = {}
    pos = -1
    maximo = (max(alvos) + 1) if alvos else 0
    esperado = 1
    while esperado <= maximo:
        achou = None
        for i in range(pos + 1, len(cands)):
            if cands[i][3] == esperado:
                # entre os candidatos do mesmo número, prefere o em negrito
                melhor = i
                for j in range(i, len(cands)):
                    if cands[j][3] == esperado and cands[j][5] and not cands[i][5]:
                        melhor = j
                        break
                    if cands[j][3] != esperado and cands[j][3] > esperado:
                        break
                achou = melhor
                break
        if achou is not None:
            escolhidos[esperado] = achou
            pos = achou
        esperado += 1
    return escolhidos


def desenhos_uteis(pagina, marcas, wm):
    """Elementos gráficos: lista de (rect, tipo) com tipo 'img' | 'img_pequena' | 'vetor'."""
    larg, alt = pagina.rect.width, pagina.rect.height
    itens = []
    for im in pagina.get_image_info(xrefs=True):
        r = pymupdf.Rect(im["bbox"])
        chave = tuple(round(v / 4) for v in im["bbox"])
        if chave in wm:
            continue
        if r.is_empty or r.width < 3 or r.height < 3:
            continue
        if r.width > larg * 0.95 and r.height > alt * 0.9:
            continue
        itens.append((r, "img"))
    for d in pagina.get_drawings():
        r = pymupdf.Rect(d["rect"])
        fill, cor = d.get("fill"), d.get("color")
        if fill is not None and cor is None and all(c > 0.97 for c in fill):
            continue  # máscara branca
        if fill is None and cor is None:
            continue
        if r.width > larg * 0.9 and r.height > alt * 0.85:
            continue  # moldura da página
        if r.width < 0.2 and r.height < 0.2:
            continue
        itens.append((r, "vetor"))
    return itens


def agrupar(itens):
    """Agrupa elementos que se tocam (distância <= AGRUPA). Devolve [(rect, [tipos], n)]."""
    grupos = []
    for r, t in itens:
        novo = [pymupdf.Rect(r), {t}, 1]
        resto = []
        for g in grupos:
            infl = pymupdf.Rect(g[0].x0 - AGRUPA, g[0].y0 - AGRUPA, g[0].x1 + AGRUPA, g[0].y1 + AGRUPA)
            if infl.intersects(novo[0]) or infl.contains(novo[0]):
                novo[0] |= g[0]
                novo[1] |= g[1]
                novo[2] += g[2]
            else:
                resto.append(g)
        # a união pode ter alcançado outros grupos
        mudou = True
        while mudou:
            mudou = False
            r2 = []
            for g in resto:
                infl = pymupdf.Rect(g[0].x0 - AGRUPA, g[0].y0 - AGRUPA, g[0].x1 + AGRUPA, g[0].y1 + AGRUPA)
                if infl.intersects(novo[0]):
                    novo[0] |= g[0]
                    novo[1] |= g[1]
                    novo[2] += g[2]
                    mudou = True
                else:
                    r2.append(g)
            resto = r2
        grupos = resto + [novo]
    return grupos


def pedacos_da_questao(doc, paginas, cands, escolhidos, numero):
    """Pedaços (página, x0, x1, y0, y1) da região da questão, de um marcador ao seguinte."""
    i = escolhidos.get(numero)
    if i is None:
        return None
    pn, c, y0, _, r, _, _ = cands[i]
    seguinte = cands[i + 1] if i + 1 < len(cands) else None
    # o próximo marcador escolhido (qualquer número) delimita o fim
    ordem = sorted(escolhidos.values())
    k = ordem.index(i)
    seguinte = cands[ordem[k + 1]] if k + 1 < len(ordem) else None
    pedacos = []
    p_atual, c_atual, y_ini = pn, c, max(0.0, r.y0 - 2)
    for _ in range(40):
        linhas, faixas = paginas[p_atual]
        fx0, fx1 = faixas[c_atual] if c_atual < len(faixas) else faixas[-1]
        alt = doc[p_atual].rect.height
        fim = alt * 0.97
        ultimo = False
        if seguinte and seguinte[0] == p_atual and seguinte[1] == c_atual:
            fim = seguinte[4].y0 - 1
            ultimo = True
        pedacos.append([p_atual, fx0, fx1, y_ini, fim])
        if ultimo:
            break
        # continua na próxima coluna / página
        if c_atual + 1 < len(faixas):
            c_atual += 1
        else:
            p_atual += 1
            c_atual = 0
            if p_atual >= len(doc):
                break
        if seguinte and (p_atual, c_atual) > (seguinte[0], seguinte[1]):
            break
        y_ini = 0.0
        if seguinte is None and len(pedacos) >= 3:
            break
    return pedacos


def eh_titulo(texto):
    letras = [c for c in texto if c.isalpha()]
    return (
        len(letras) >= 4
        and len(texto) <= 70
        and sum(1 for c in letras if c.isupper()) >= 0.92 * len(letras)
        and not RE_ALT.match(texto)
        and not MARCADOR.match(texto)
    )


def conteudo_do_pedaco(doc, paginas, ped, marcas, wm):
    """Linhas e elementos gráficos que caem num pedaço."""
    pn, x0, x1, y0, y1 = ped
    linhas, faixas = paginas[pn]
    caixa = pymupdf.Rect(x0 - 2, y0, x1 + 2, y1)
    ls = []
    for r, t, neg in linhas:
        cy = (r.y0 + r.y1) / 2
        if y0 <= cy <= y1 and (len(faixas) == 1 or x0 - 2 <= (r.x0 + r.x1) / 2 <= x1 + 2):
            ls.append((r, t, neg))
    gs = []
    for r, t in desenhos_uteis(doc[pn], marcas, wm):
        cy = (r.y0 + r.y1) / 2
        cx = (r.x0 + r.x1) / 2
        if not (y0 <= cy <= y1):
            continue
        if len(faixas) > 1 and not (x0 - 2 <= cx <= x1 + 2):
            continue
        gs.append((r, t))
    # títulos de seção ("MATEMÁTICA", "CONHECIMENTOS GERAIS") no fim não são da questão
    ls.sort(key=lambda t: (t[0].y0, t[0].x0))
    cortou = False
    while ls and eh_titulo(ls[-1][1]):
        ls.pop()
        cortou = True
    if cortou and ls:
        limite = ls[-1][0].y1 + 6
        gs = [g for g in gs if g[0].y0 <= limite]
    return ls, gs, caixa


def figuras_do_pedaco(ls, gs, caixa):
    """Grupos de elementos gráficos que parecem uma figura (e quais são símbolos pequenos)."""
    # sublinhados do texto: segmentos finos logo abaixo de uma linha de texto
    def sublinhado(r):
        if r.height > 2.2 or r.width > 400:
            return False
        for lr, _, _ in ls:
            if r.x0 >= lr.x0 - 2 and r.x1 <= lr.x1 + 2 and lr.y0 <= r.y1 and abs(r.y0 - lr.y1) < 4:
                return True
        return False

    sem = [(r, t) for r, t in gs if not sublinhado(r)]
    figuras, simbolos = [], []
    for g in agrupar(sem):
        r, tipos, n = g
        tem_img = "img" in tipos
        if r.width >= 22 and r.height >= 22:
            figuras.append((r, tipos, n))
        elif tem_img and r.width >= 8 and r.height >= 6:
            simbolos.append((r, tipos, n))
        # vetores pequenos (realces, setas do texto): ignorados
    return figuras, simbolos


def incluir_rotulos(caixa_fig, ls, limite):
    """Aumenta a caixa com rótulos curtos que tocam o desenho (eixos, legendas) e apara os
    parágrafos do enunciado/alternativas que o retângulo de uma imagem com margem branca cobre."""
    cx = pymupdf.Rect(caixa_fig)
    larg = limite.width
    infl = pymupdf.Rect(cx.x0 - 4, cx.y0 - 4, cx.x1 + 4, cx.y1 + 4)
    base = pymupdf.Rect(cx)
    for r, t, _ in ls:
        if infl.intersects(r) and len(t) <= 30 and r.width < larg * 0.4 and not RE_ALT.match(t) and not MARCADOR.match(t):
            cx |= r
    if area(cx) > 1.6 * area(base) + 400:
        cx = base
    for r, t, _ in ls:
        longa = len(t) > 40 or r.width > larg * 0.5 or bool(RE_ALT.match(t)) or bool(MARCADOR.match(t))
        if longa and cx.intersects(r) and r.height > 0:
            meio = (cx.y0 + cx.y1) / 2
            ry = (r.y0 + r.y1) / 2
            if ry < meio and r.y1 < cx.y1 - 8:
                cx.y0 = max(cx.y0, r.y1 + 1.5)
            elif ry >= meio and r.y0 > cx.y0 + 8:
                cx.y1 = min(cx.y1, r.y0 - 1.5)
    return cx


def aparar_branco(pg, dpi=72):
    """Menor retângulo (em pontos) que contém tudo o que não é branco na página."""
    pix = pg.get_pixmap(dpi=dpi, alpha=False)
    larg, alt, n = pix.width, pix.height, pix.n
    tabela = bytes(255 if i >= 246 else i for i in range(256))
    dados = pix.samples
    branca = b"\xff" * (larg * n)
    topo, base, esq, dir_ = None, None, larg, 0
    for y in range(alt):
        linha = dados[y * larg * n:(y + 1) * larg * n].translate(tabela)
        if linha == branca:
            continue
        if topo is None:
            topo = y
        base = y
        esq = min(esq, (len(linha) - len(linha.lstrip(b"\xff"))) // n)
        dir_ = max(dir_, (len(linha.rstrip(b"\xff")) + n - 1) // n)
    if topo is None:
        return None
    k = 72.0 / dpi
    return pymupdf.Rect(esq * k, topo * k, (dir_ + 1) * k, (base + 1) * k)


def renderizar(doc, pedacos_caixa, dpi, destino):
    """Empilha os recortes (vetoriais) numa página nova, apara o branco e grava o PNG."""
    larg = max(r.width for _, r in pedacos_caixa) + 2 * BORDA
    alt = sum(r.height for _, r in pedacos_caixa) + BORDA * (len(pedacos_caixa) + 1)
    novo = pymupdf.open()
    pg = novo.new_page(width=larg, height=alt)
    y = BORDA
    for pn, r in pedacos_caixa:
        alvo = pymupdf.Rect(BORDA, y, BORDA + r.width, y + r.height)
        pg.show_pdf_page(alvo, doc, pn, clip=r)
        y += r.height + BORDA
    caixa = aparar_branco(pg)
    if caixa is not None:
        m = BORDA * 1.5
        corte = pymupdf.Rect(caixa.x0 - m, caixa.y0 - m, caixa.x1 + m, caixa.y1 + m) & pg.rect
        if not corte.is_empty and corte.width > 4 and corte.height > 4:
            try:
                pg.set_cropbox(corte)
            except ValueError:  # pragma: no cover
                pass
    pix = pg.get_pixmap(dpi=dpi, alpha=False)
    pix.save(destino)
    # o upload do painel aceita no máximo 2 MB: reduz a resolução até caber
    while os.path.getsize(destino) > LIMITE_BYTES and dpi > 60:
        dpi = int(dpi * 0.8)
        pix = pg.get_pixmap(dpi=dpi, alpha=False)
        pix.save(destino)
    novo.close()
    return pix.width, pix.height


def tighten(ls, gs, ped):
    """Caixa justa do conteúdo do pedaço (texto e gráficos), ou None se vazio."""
    rs = [r for r, _, _ in ls] + [r for r, _ in gs]
    if not rs:
        return None
    u = uniao(rs)
    return pymupdf.Rect(max(ped[1], u.x0 - 1), max(0, u.y0 - 1), min(ped[2] + 2, u.x1 + 1), u.y1 + 1)


def processar(pdf, pedido):
    doc = pymupdf.open(pdf)
    # tira a marca d'água do PCI do desenho (imagens repetidas em todas as páginas)
    wm = marcas_dagua(doc)
    for p in doc:
        for im in p.get_image_info(xrefs=True):
            chave = tuple(round(v / 4) for v in im["bbox"])
            if chave in wm and im.get("xref"):
                try:
                    p.delete_image(im["xref"])
                except Exception:
                    pass
    paginas = []
    for p in doc:
        ls = linhas_da_pagina(p)
        paginas.append((ls, colunas(p, ls)))
    cands = achar_marcadores(doc, paginas)
    alvos = [q["numero"] for q in pedido["questoes"]]
    escolhidos = escolher_sequencia(cands, alvos)
    os.makedirs(pedido["saida"], exist_ok=True)
    dpi = int(pedido.get("dpi", 170))
    resultados = []
    for q in pedido["questoes"]:
        res = {"chave": q["chave"], "numero": q["numero"], "ok": False}
        try:
            ped = pedacos_da_questao(doc, paginas, cands, escolhidos, q["numero"])
            if not ped:
                res.update(confianca="baixa", estrategia="nenhuma", motivo="marcador da questão não achado")
                resultados.append(res)
                continue
            conteudo = []
            for p in ped:
                ls, gs, caixa = conteudo_do_pedaco(doc, paginas, p, None, wm)
                conteudo.append((p, ls, gs, caixa))
            # descarta pedaços vazios de continuação
            conteudo = [c for i, c in enumerate(conteudo) if i == 0 or c[1] or c[2]]
            # a questão não deve incluir o título da próxima seção no fim
            todas_fig, todos_simb = [], []
            for p, ls, gs, caixa in conteudo:
                f, s = figuras_do_pedaco(ls, gs, caixa)
                for r, tipos, n in f:
                    todas_fig.append((p, r, tipos, n, ls, caixa))
                for r, tipos, n in s:
                    todos_simb.append((p, r, tipos, n))
            # figuras que ocupam quase todo o pedaço de texto com muito texto = molduras
            if todas_fig:
                escolhida = []
                for item in todas_fig:
                    p, r, tipos, n, ls, caixa = item
                    escolhida.append(item)
                # tamanho: o maior grupo manda; os demais entram se estiverem no mesmo pedaço
                maior = max(escolhida, key=lambda it: area(it[1]))
                mesmos = [it for it in escolhida if it[0] is maior[0] and area(it[1]) >= 0.08 * area(maior[1])]
                outros_pedacos = [it for it in escolhida if it[0] is not maior[0]]
                r = uniao([it[1] for it in mesmos])
                p, ls, caixa = maior[0], maior[4], maior[5]
                r = incluir_rotulos(r, ls, caixa)
                r = pymupdf.Rect(max(r.x0 - 2, 0), max(r.y0 - 2, 0), r.x1 + 2, r.y1 + 2)
                larga = r.width > 0.9 * (p[2] - p[1]) + 4
                caixas = [(p[0], r)]
                conf = "alta"
                est = "figura"
                if outros_pedacos or len(mesmos) > 3:
                    conf = "media"
                    est = "figuras"
                    # várias figuras: empilha a maior de cada pedaço
                    vistos = {id(maior[0])}
                    for it in outros_pedacos:
                        if id(it[0]) in vistos:
                            continue
                        vistos.add(id(it[0]))
                        rr = incluir_rotulos(it[1], it[4], it[5])
                        caixas.append((it[0][0], pymupdf.Rect(rr.x0 - 2, rr.y0 - 2, rr.x1 + 2, rr.y1 + 2)))
                if area(r) < 40 * 40:
                    conf = "media"
                util = uniao([x[0] for x in ls] + [r])
                if larga and area(r) > 0.9 * area(util):
                    conf = "baixa"
                    est = "questao"
                    caixas = []
                if caixas:
                    res.update(_gravar(doc, caixas, dpi, pedido, q, conf, est))
                    resultados.append(res)
                    continue
            # sem figura vetorial/imagem grande: símbolos pequenos ou tabela de texto -> questão inteira
            caixas = []
            for p, ls, gs, caixa in conteudo:
                t = tighten(ls, gs, p)
                if t is not None and not t.is_empty:
                    caixas.append((p[0], t))
            if not caixas:
                res.update(confianca="baixa", estrategia="nenhuma", motivo="região da questão vazia")
                resultados.append(res)
                continue
            conf = "media" if todos_simb else "baixa"
            est = "simbolos" if todos_simb else "questao"
            if not todos_simb and RE_DESTAQUE.search(q.get("enunciado") or ""):
                conf, est = "media", "destaque"
            res.update(_gravar(doc, caixas, dpi, pedido, q, conf, est))
        except Exception as e:  # pragma: no cover
            res.update(confianca="baixa", estrategia="erro", motivo=f"{type(e).__name__}: {e}")
        resultados.append(res)
    return {"paginas": len(doc), "resultados": resultados}


def _gravar(doc, caixas, dpi, pedido, q, conf, est):
    nome = f"{q['chave']}.png"
    destino = os.path.join(pedido["saida"], nome)
    w, h = renderizar(doc, caixas, dpi, destino)
    return {
        "ok": True,
        "arquivo": nome,
        "pagina": caixas[0][0] + 1,
        "caixas": [[caixas[i][0] + 1] + [round(v, 1) for v in tuple(caixas[i][1])] for i in range(len(caixas))],
        "largura": w,
        "altura": h,
        "confianca": conf,
        "estrategia": est,
    }


def main():
    if len(sys.argv) != 3:
        print("uso: figuras_pdf.py <caderno.pdf> <pedido.json>", file=sys.stderr)
        return 2
    with open(sys.argv[2], encoding="utf-8") as f:
        pedido = json.load(f)
    try:
        pymupdf.TOOLS.mupdf_display_errors(False)
    except Exception:  # pragma: no cover
        pass
    saida = processar(sys.argv[1], pedido)
    texto = json.dumps(saida, ensure_ascii=False)
    if pedido.get("resultado"):  # o MuPDF também escreve avisos no stdout: o JSON vai para arquivo
        with open(pedido["resultado"], "w", encoding="utf-8") as f:
            f.write(texto)
    else:
        sys.stdout.write(texto)
    return 0


if __name__ == "__main__":
    sys.exit(main())

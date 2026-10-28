#!/usr/bin/env node
/**
 * Gera o PDF "Concursos no Paraná por banca" a partir de concursos-pr-por-banca.json.
 *   node marketing/pesquisa/gerar-pdf.mjs
 * Saída: marketing/pesquisa/concursos-pr-por-banca.pdf
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '../..');
const { chromium } = createRequire(path.join(raiz, 'apps/web/package.json'))('playwright');

const dados = JSON.parse(readFileSync(path.join(aqui, 'concursos-pr-por-banca.json'), 'utf8'));
const fonte = (f) => pathToFileURL(path.join(raiz, 'design/fonts', f)).href;
const logo = pathToFileURL(path.join(raiz, 'apps/web/public/lp/assets/img/logo.webp')).href;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = new Intl.NumberFormat('pt-BR');
const ORDEM_SITUACAO = { 'inscrições abertas': 0, 'edital publicado': 1, 'inscrições encerradas, prova a realizar': 2, previsto: 3 };
const ROTULO = { 'inscrições abertas': 'Inscrições abertas', 'edital publicado': 'Edital publicado', 'inscrições encerradas, prova a realizar': 'Prova a realizar', previsto: 'Previsto (sem edital)' };
const COR = { 'inscrições abertas': 'verde', 'edital publicado': 'azul', 'inscrições encerradas, prova a realizar': 'roxo', previsto: 'laranja' };
const FORA = new Set(['A definir', 'Organização própria do órgão', 'Não identificada']);

// agrupa por banca e ordena pelo número de certames (depois pelas vagas conhecidas)
const porBanca = new Map();
for (const c of dados) {
  if (!porBanca.has(c.banca)) porBanca.set(c.banca, []);
  porBanca.get(c.banca).push(c);
}
const bancas = [...porBanca.entries()]
  .map(([nome, lista]) => ({
    nome,
    lista: lista.sort((a, b) => ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao] || a.municipio.localeCompare(b.municipio, 'pt')),
    vagas: lista.reduce((s, c) => s + (c.vagas || 0), 0),
    previstos: lista.filter((c) => c.situacao === 'previsto').length,
    fora: FORA.has(nome),
  }))
  .sort((a, b) => a.fora - b.fora || b.lista.length - a.lista.length || b.vagas - a.vagas);
const ranqueadas = bancas.filter((b) => !b.fora);
const total = dados.length;
const totalPrevistos = dados.filter((c) => c.situacao === 'previsto').length;
const maior = ranqueadas[0];

const dominio = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
};

const tabela = (lista) => `
  <table>
    <thead><tr><th>Órgão</th><th>Situação</th><th class="n">Vagas</th><th>Inscrições</th><th>Prova</th><th>Fonte</th></tr></thead>
    <tbody>${lista
      .map(
        (c) => `<tr>
        <td><b>${esc(c.orgao)}</b><span class="mun">${esc(c.municipio)} · ${esc(c.esfera)}</span>${
          c.cargos_destaque?.length ? `<span class="cargos">${esc(c.cargos_destaque.slice(0, 4).join(', '))}</span>` : ''
        }${c.nota ? `<span class="cargos">${esc(c.nota)}</span>` : ''}</td>
        <td><span class="selo ${COR[c.situacao]}">${ROTULO[c.situacao] ?? esc(c.situacao)}</span><span class="conf">confiança ${esc(c.confianca)}</span></td>
        <td class="n">${c.vagas == null ? '–' : fmt.format(c.vagas)}</td>
        <td>${esc(c.inscricoes ?? '–')}</td>
        <td>${esc(c.data_prova ?? '–')}</td>
        <td class="fonte"><a href="${esc(c.fonte)}">${esc(dominio(c.fonte))}</a></td>
      </tr>`,
      )
      .join('')}</tbody>
  </table>`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Concursos no Paraná por banca</title><style>
@font-face { font-family: 'Baloo 2'; font-weight: 800; src: url('${fonte('baloo-2-latin-800-normal.woff2')}'); }
@font-face { font-family: 'Nunito'; font-weight: 700; src: url('${fonte('nunito-latin-700-normal.woff2')}'); }
@font-face { font-family: 'Nunito'; font-weight: 900; src: url('${fonte('nunito-latin-900-normal.woff2')}'); }
@page { size: A4; margin: 16mm 14mm 18mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 700 10.5px/1.45 'Nunito', sans-serif; color: #10272A; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3 { font-family: 'Baloo 2', sans-serif; font-weight: 800; margin: 0; line-height: 1.05; }
.capa { height: 262mm; display: flex; flex-direction: column; justify-content: space-between; padding: 18mm 16mm; border-radius: 10mm; color: #fff; background: linear-gradient(150deg, #FF6A16, #F0484D 50%, #7C4DFF); page-break-after: always; }
.capa img { align-self: flex-start; height: 18mm; width: auto; background: #fff; border-radius: 4mm; padding: 2mm 4mm; }
.capa h1 { font-size: 44px; max-width: 13ch; }
.capa p { font-size: 15px; max-width: 46ch; opacity: .95; margin-top: 6mm; }
.capa .grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
.capa .num { background: rgba(255,255,255,.16); border-radius: 5mm; padding: 5mm; }
.capa .num b { display: block; font: 800 34px 'Baloo 2'; line-height: 1; }
section { page-break-before: always; }
h2 { font-size: 26px; margin-bottom: 4mm; }
h3 { font-size: 18px; }
p.lead { font-size: 12px; color: #4C6567; max-width: 95ch; margin: 0 0 5mm; }
table { width: 100%; border-collapse: collapse; margin-top: 3mm; }
th { text-align: left; font: 900 9px 'Nunito'; letter-spacing: .04em; color: #4C6567; border-bottom: 1.5px solid #10272A; padding: 2mm 2mm; }
td { padding: 2.2mm 2mm; border-bottom: 1px solid #E8E2D6; vertical-align: top; }
tr { page-break-inside: avoid; }
td.n, th.n { text-align: right; white-space: nowrap; }
.mun, .cargos, .conf { display: block; color: #4C6567; font-size: 9px; }
.cargos { font-style: italic; }
.fonte a { color: #2F7BFF; text-decoration: none; word-break: break-all; font-size: 9px; }
.selo { display: inline-block; padding: .6mm 2.2mm; border-radius: 99px; font-size: 8.5px; font-weight: 900; white-space: nowrap; }
.selo.verde { background: #E2F7EC; color: #0F7A45; } .selo.azul { background: #E3EEFF; color: #1F4FD1; }
.selo.roxo { background: #EEE8FF; color: #5B2BD9; } .selo.laranja { background: #FFEDE0; color: #B84308; }
.ranking td, .ranking th { font-size: 10.5px; }
.ranking .barra { height: 3mm; border-radius: 99px; background: linear-gradient(90deg, #FF6A16, #7C4DFF); }
.banca { margin-top: 8mm; page-break-inside: auto; }
.banca .cab { display: flex; justify-content: space-between; align-items: baseline; border-left: 2.5mm solid #FF6A16; padding-left: 3mm; page-break-after: avoid; }
.banca .cab span { color: #4C6567; font-size: 10.5px; }
.caixa { border-radius: 4mm; padding: 4mm 5mm; background: #FFF5E8; margin: 3mm 0 5mm; }
.caixa.verde { background: #E9F8F1; }
ul { margin: 2mm 0; padding-left: 5mm; } li { margin: 1mm 0; }
</style></head><body>

<div class="capa">
  <img src="${logo}" alt="Fuse Aprova">
  <div>
    <h1>Concursos no Paraná por banca</h1>
    <p>Mapa dos certames previstos, com edital publicado ou com inscrições abertas no PR, para decidir as próximas bancas do Fuse Aprova. Situação em 28/10/2026.</p>
  </div>
  <div class="grade">
    <div class="num"><b>${total}</b>certames mapeados</div>
    <div class="num"><b>${ranqueadas.length}</b>bancas identificadas</div>
    <div class="num"><b>${totalPrevistos}</b>previstos, ainda sem edital</div>
  </div>
</div>

<section>
  <h2>Ranking de bancas</h2>
  <p class="lead">Ordenado pelo número de certames no escopo. "Vagas conhecidas" soma só os certames que informam vagas; cadastro de reserva e vagas não informadas contam como zero. A ${esc(maior.nome)} lidera com ${maior.lista.length} certames.</p>
  <table class="ranking">
    <thead><tr><th>#</th><th>Banca</th><th class="n">Certames</th><th class="n">Previstos</th><th class="n">Vagas conhecidas</th><th style="width:35%"></th></tr></thead>
    <tbody>${ranqueadas
      .map(
        (b, i) => `<tr><td>${i + 1}</td><td><b>${esc(b.nome)}</b></td><td class="n">${b.lista.length}</td><td class="n">${b.previstos}</td><td class="n">${b.vagas ? fmt.format(b.vagas) : '–'}</td><td><div class="barra" style="width:${(b.lista.length / maior.lista.length) * 100}%"></div></td></tr>`,
      )
      .join('')}</tbody>
  </table>
  <div class="caixa">
    <h3>Recomendação de prioridade</h3>
    <ul>
      <li><b>1. Fundação FAFIPA:</b> a banca com mais certames no PR, incluindo Curitiba (348 vagas, provas em 06/12 e 13/12/2026) e vários contratos ainda sem edital.</li>
      <li><b>2. Unioeste/COGEPS:</b> volume alto no Oeste e provas e gabaritos públicos, o que facilita montar o banco de questões.</li>
      <li><b>3. Instituto UniFil:</b> forte no Norte do PR e em cidades maiores.</li>
      <li><b>4. Instituto AOCP:</b> poucos certames no PR, mas grandes (São José dos Pinhais, 81 vagas previstas).</li>
      <li>Omni e Unicampo ficam para uma expansão posterior: muitos certames pequenos, em câmaras e municípios pequenos.</li>
    </ul>
  </div>
  <div class="caixa verde">
    <h3>FAU-Unicentro: contratados sem edital (antecipação)</h3>
    <ul>
      <li><b>Prefeitura de Palmital:</b> banca contratada segundo nota da prefeitura (10/09/2026); edital em elaboração.</li>
      <li><b>Prefeitura de Querência do Norte:</b> contrato no PNCP assinado em 04/02/2026 (R$ 151.800,00); edital não publicado.</li>
      <li><b>CISOP (Consórcio de Saúde do Oeste do PR), Cascavel:</b> contrato no PNCP assinado em 12/05/2026 (R$ 107.900,00); não aparece no site da FAU.</li>
    </ul>
  </div>
</section>

<section>
  <h2>Certames por banca</h2>
  <p class="lead">Dentro de cada banca, a ordem é: inscrições abertas, edital publicado, prova a realizar e previsto. A confiança é alta quando a fonte é a banca, o órgão ou o PNCP; média quando vem de agregador confiável; baixa quando é só notícia.</p>
  ${bancas
    .map(
      (b) => `<div class="banca"><div class="cab"><h3>${esc(b.nome)}</h3><span>${b.lista.length} certame(s)${b.vagas ? ` · ${fmt.format(b.vagas)} vagas conhecidas` : ''}</span></div>${tabela(b.lista)}</div>`,
    )
    .join('')}
</section>

<section>
  <h2>Método e limitações</h2>
  <ul>
    <li><b>Escopo:</b> prefeituras, câmaras, autarquias, consórcios e órgãos com sede no PR, com prova em 2026 ou 2027, em uma destas situações: previsto (banca contratada, sem edital), edital publicado, inscrições abertas ou inscrições encerradas com prova a realizar. Certames com prova já aplicada até 28/10/2026 e seleções só por títulos ficaram de fora.</li>
    <li><b>Fontes:</b> sites das bancas, PCI Concursos, Ache Concursos e outros agregadores, portais de prefeituras e diários oficiais, e a busca pública do PNCP (contratos com o CNPJ da FAU).</li>
    <li><b>Limitações:</b> o PNCP derrubou parte das conexões, então pode haver mais contratos sem edital do que os listados. Os sites da UniFil, da AOCP e do JC Concursos bloquearam a leitura automática, e a página da COPS/UEL depende de JavaScript; nesses casos os dados vieram de agregadores (confiança média). Nenhum bloqueio foi contornado.</li>
    <li><b>Bancas sem certame no escopo do PR:</b> FGV, Cebraspe, Fundatec, Vunesp, NC-UFPR e Consulplan atuaram no PR em 2026, mas a prova já passou. IBFC, IBAM, Instituto Excelência, Legatus, PUC-PR, IPPEC, Ibest, Selecon e FUNTEF-PR não tiveram certame encontrado.</li>
    <li>Os dados completos estão em <b>marketing/pesquisa/concursos-pr-por-banca.json</b>; este PDF é gerado a partir dele por <b>gerar-pdf.mjs</b>.</li>
  </ul>
</section>
</body></html>`;

const arquivoHtml = path.join(aqui, 'concursos-pr-por-banca.html');
writeFileSync(arquivoHtml, html);
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.goto(pathToFileURL(arquivoHtml).href, { waitUntil: 'networkidle' });
await pagina.pdf({
  path: path.join(aqui, 'concursos-pr-por-banca.pdf'),
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;font:9px sans-serif;color:#888;padding:0 14mm;display:flex;justify-content:space-between"><span>Fuse Aprova · Concursos no Paraná por banca · 28/10/2026</span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>',
  margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
});
await navegador.close();
console.log('PDF gerado:', path.join(aqui, 'concursos-pr-por-banca.pdf'));

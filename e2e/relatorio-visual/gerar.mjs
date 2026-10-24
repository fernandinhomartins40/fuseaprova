#!/usr/bin/env node
/**
 * Relatório visual lado a lado (D1/D11): captura do Playwright (390×844, linha de base em
 * testes/__capturas__) × mockup de Telas_referencia/. Para revisão humana: os mockups são
 * composições geradas por IA, sem pixel exato, então não há diff automático contra eles.
 *
 *   pnpm e2e:relatorio   →   e2e/relatorio-visual/index.html
 *
 * Se a última execução falhou numa tela, mostra também o "atual" e o "diff" de test-results/.
 */
import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const e2e = path.resolve(aqui, '..');
const raiz = path.resolve(e2e, '..');
const capturas = path.join(
  e2e,
  'testes',
  '__capturas__',
  process.env.E2E_PLATAFORMA ?? process.platform,
);
const referencias = path.join(raiz, 'Telas_referencia');
const resultados = path.join(e2e, 'test-results');
const img = path.join(aqui, 'img');

const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function listar(pasta) {
  return existsSync(pasta) ? (await readdir(pasta)).filter((f) => f.endsWith('.png')).sort() : [];
}

async function main() {
  const caps = await listar(capturas);
  if (!caps.length) {
    console.error(
      'Nenhuma captura em testes/__capturas__/<plataforma>. Rode antes: pnpm e2e (ou pnpm e2e:atualizar).',
    );
    process.exit(1);
  }
  const refs = await listar(referencias);
  const pastasResultado = existsSync(resultados) ? await readdir(resultados) : [];
  const visual = pastasResultado.find((p) => p.startsWith('06-visual'));

  await rm(img, { recursive: true, force: true });
  await mkdir(img, { recursive: true });

  const linhas = [];
  for (const cap of caps) {
    const num = cap.slice(0, 2);
    const nome = cap
      .replace(/\.png$/, '')
      .slice(3)
      .replace(/-/g, ' ');
    await copyFile(path.join(capturas, cap), path.join(img, `cap-${cap}`));
    const ref = refs.find((r) => r.startsWith(`${num}_`));
    if (ref) await copyFile(path.join(referencias, ref), path.join(img, `ref-${ref}`));
    let atual = null;
    let diff = null;
    if (visual) {
      const base = cap.replace(/\.png$/, '');
      for (const [tipo, sufixo] of [
        ['atual', '-actual.png'],
        ['diff', '-diff.png'],
      ]) {
        const f = path.join(resultados, visual, base + sufixo);
        if (existsSync(f)) {
          await copyFile(f, path.join(img, `${tipo}-${cap}`));
          if (tipo === 'atual') atual = `img/atual-${cap}`;
          else diff = `img/diff-${cap}`;
        }
      }
    }
    linhas.push({
      num,
      nome,
      cap: `img/cap-${cap}`,
      ref: ref ? `img/ref-${ref}` : null,
      atual,
      diff,
    });
  }

  const cartao = (l) => `
  <section class="tela" id="t${l.num}">
    <h2>${l.num} · ${esc(l.nome)}</h2>
    <div class="par">
      <figure><img src="${l.cap}" alt="Captura ${esc(l.nome)}" loading="lazy"><figcaption>Captura Playwright · 390×844</figcaption></figure>
      ${
        l.ref
          ? `<figure><img src="${l.ref}" alt="Referência ${esc(l.nome)}" loading="lazy"><figcaption>Telas_referencia/${esc(path.basename(l.ref).slice(4))}</figcaption></figure>`
          : `<figure class="vazio"><div>Sem tela de referência nova (D1: composição de design/html com a paleta nova)</div><figcaption>—</figcaption></figure>`
      }
      ${l.atual ? `<figure><img src="${l.atual}" alt="Atual"><figcaption>Última execução (falhou)</figcaption></figure>` : ''}
      ${l.diff ? `<figure><img src="${l.diff}" alt="Diferença"><figcaption>Diferença</figcaption></figure>` : ''}
    </div>
  </section>`;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório visual Fuse Aprova</title>
<style>
  :root { --bg: #faf8f2; --tx: #123f42; --linha: #d8e1df; --cartao: #fff; --suave: #4f6d70; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0f1d1f; --tx: #e8f1f0; --linha: #2c4245; --cartao: #16292b; --suave: #9fb6b4; } }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px 64px; background: var(--bg); color: var(--tx); font: 15px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  header, main { max-width: 1240px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 26px; }
  p.sub { margin: 0 0 16px; color: var(--suave); }
  nav { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
  nav a { color: inherit; border: 1px solid var(--linha); border-radius: 999px; padding: 3px 10px; text-decoration: none; font-size: 13px; }
  .tela { background: var(--cartao); border: 1px solid var(--linha); border-radius: 16px; padding: 16px; margin-bottom: 20px; }
  .tela h2 { margin: 0 0 12px; font-size: 18px; }
  .par { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; align-items: start; }
  figure { margin: 0; }
  figure img { width: 100%; max-width: 390px; height: auto; display: block; border: 1px solid var(--linha); border-radius: 12px; }
  figcaption { font-size: 12.5px; color: var(--suave); margin-top: 6px; }
  .vazio div { border: 1px dashed var(--linha); border-radius: 12px; padding: 24px; color: var(--suave); min-height: 200px; display: grid; place-items: center; text-align: center; }
</style>
</head>
<body>
<header>
  <h1>Relatório visual · captura × referência</h1>
  <p class="sub">Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Linha de base de regressão: tolerância de 2% (maxDiffPixelRatio 0.02) em 390×844. Os mockups de Telas_referencia são composições, por isso a comparação com eles é por revisão humana (D1).</p>
  <nav>${linhas.map((l) => `<a href="#t${l.num}">${l.num} ${esc(l.nome)}</a>`).join('')}</nav>
</header>
<main>${linhas.map(cartao).join('\n')}</main>
</body>
</html>
`;
  await writeFile(path.join(aqui, 'index.html'), html, 'utf8');
  console.info(`Relatório: ${path.join(aqui, 'index.html')} (${linhas.length} telas)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

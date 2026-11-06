import { continueRender, delayRender, staticFile } from 'remotion';

const arquivos: [string, string, string][] = [
  ['Nunito', '700', 'nunito-latin-700-normal.woff2'],
  ['Nunito', '800', 'nunito-latin-800-normal.woff2'],
  ['Nunito', '900', 'nunito-latin-900-normal.woff2'],
  ['Baloo 2', '700', 'baloo-2-latin-700-normal.woff2'],
  ['Baloo 2', '800', 'baloo-2-latin-800-normal.woff2'],
];

// As fontes vêm do próprio projeto (sem Google Fonts), como no app.
const espera = delayRender('fontes');
Promise.all(
  arquivos.map(async ([familia, peso, arquivo]) => {
    const face = new FontFace(familia, `url(${staticFile(`fonts/${arquivo}`)})`, { weight: peso });
    await face.load();
    document.fonts.add(face);
  }),
).then(() => continueRender(espera));

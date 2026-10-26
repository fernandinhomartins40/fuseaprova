/**
 * Markdown simples do enunciado (PRD 5.17): parágrafos, quebras de linha, listas com "- ",
 * **negrito**, *itálico* e imagem ![texto](url). Gera elementos React (sem innerHTML).
 *
 * O importador de cadernos (D18) grava o sublinhado e o negrito do caderno como `**termo**` e o
 * itálico como `*termo*`; o app mostra os dois primeiros em negrito (não há sublinhado).
 * `MarkdownEmLinha` serve às alternativas, que são uma linha só e podem ter o termo em destaque.
 */
import type { ReactNode } from 'react';
import s from './Markdown.module.css';

const URL_PERMITIDA = /^(\/|https?:\/\/)/i;
const TOKEN = /(!\[[^\]]*\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function emLinha(texto: string, chave: string): ReactNode[] {
  const partes = texto.split(TOKEN).filter((p) => p !== '');
  return partes.map((p, i) => {
    const k = `${chave}-${i}`;
    const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(p);
    if (img) {
      const [, alt = '', url = ''] = img;
      if (!URL_PERMITIDA.test(url)) return alt;
      return <img key={k} src={url} alt={alt} className={s.imagem} loading="lazy" />;
    }
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return <strong key={k}>{p.slice(2, -2)}</strong>;
    }
    if ((p.startsWith('*') && p.endsWith('*')) || (p.startsWith('_') && p.endsWith('_'))) {
      if (p.length > 2) return <em key={k}>{p.slice(1, -1)}</em>;
    }
    return p;
  });
}

function comQuebras(linhas: string[], chave: string): ReactNode[] {
  const out: ReactNode[] = [];
  linhas.forEach((l, i) => {
    if (i > 0) out.push(<br key={`${chave}-br${i}`} />);
    out.push(...emLinha(l, `${chave}-${i}`));
  });
  return out;
}

/** Só a formatação em linha (negrito/itálico), sem parágrafos: para alternativas. */
export function MarkdownEmLinha({ texto }: { texto: string }) {
  return <>{emLinha(texto, 'l')}</>;
}

/** O texto sem as marcas de Markdown em linha (para rótulos de acessibilidade). */
export function semMarcasMarkdown(texto: string): string {
  return texto.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\s][^*]*)\*/g, '$1');
}

export function Markdown({ texto, className }: { texto: string; className?: string }) {
  const blocos = texto.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  return (
    <div className={className}>
      {blocos.map((b, i) => {
        const linhas = b.split('\n');
        if (linhas.every((l) => /^\s*[-*] /.test(l))) {
          return (
            <ul key={i} className={s.lista}>
              {linhas.map((l, j) => (
                <li key={j}>{emLinha(l.replace(/^\s*[-*] /, ''), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={s.paragrafo}>
            {comQuebras(linhas, String(i))}
          </p>
        );
      })}
    </div>
  );
}

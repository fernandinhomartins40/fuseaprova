import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import '../../../../apps/web/src/styles/tokens.css';
import { Alternativa, type EstadoAlternativa } from '../../../../apps/web/src/ui/Alternativa';
import { BannerUnidade } from '../../../../apps/web/src/ui/BannerUnidade';
import { BarraProgresso } from '../../../../apps/web/src/ui/BarraProgresso';
import { Botao3D } from '../../../../apps/web/src/ui/Botao3D';
import { Chip } from '../../../../apps/web/src/ui/Chip';
import { FolhaFeedback } from '../../../../apps/web/src/ui/FolhaFeedback';
import { IconeTraco } from '../../../../apps/web/src/ui/IconeTraco';
import { limita } from '../comum';
import { p, sai } from '../v22/cenas';

// Telas do app em HTML de verdade (os componentes de apps/web/src/ui com os tokens do app), animadas quadro a quadro.
// Cada tela recebe `t` (quadros desde que apareceu) e `d` (quantos quadros fica no ar).

export type PropsTela = { t: number; d: number; linhas?: string[]; cor?: string; rodape?: string };

const nada = () => {};
const pop = (t: number, em: number) => {
  const k = p(t, em, em + 10, sai);
  return { opacity: k, transform: `translateY(${(1 - k) * 18}px) scale(${0.92 + 0.08 * k})` };
};
const conta = (t: number, de: number, ate: number, alvo: number) => Math.round(interpolate(t, [de, ate], [0, alvo], limita));

const titulo: React.CSSProperties = { fontFamily: 'var(--fa-font-display)', fontWeight: 800, color: 'var(--fa-ink)', margin: 0, lineHeight: 1.15 };

/* ------------------------------------------------------------- questão */
const ALTS: [('A' | 'B' | 'C' | 'D' | 'E'), string][] = [
  ['A', 'Fomos à Curitiba no feriado.'],
  ['B', 'Entregue o documento à ela.'],
  ['C', 'O candidato chegou à prefeitura às 8 horas.'],
  ['D', 'Comprei uma bicicleta à prazo.'],
  ['E', 'Começou à chover no fim da prova.'],
];

const Enunciado: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...pop(t, 0) }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <Chip variante="laranja">Português · Crase</Chip>
      <Chip variante="claro">Estilo FAU</Chip>
    </div>
    <p style={{ ...titulo, fontSize: 19 }}>Assinale a alternativa em que o uso do acento grave (crase) está correto.</p>
  </div>
);

export const TelaQuestao: React.FC<PropsTela> = ({ t, d }) => {
  const marca = t >= d * 0.5;
  const corrige = t >= d * 0.68;
  const estado = (l: string): EstadoAlternativa => (corrige ? (l === 'C' ? 'correta' : 'apagada') : marca && l === 'C' ? 'selecionada' : 'neutra');
  const xp = p(t, d * 0.72, d * 0.72 + 10, sai);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <Enunciado t={t} />
      {ALTS.map(([l, texto], i) => (
        <div key={l} style={pop(t, 6 + i * 4)}>
          <Alternativa letra={l} texto={texto} estado={estado(l)} focavel={false} onSelecionar={nada} />
        </div>
      ))}
      <div style={{ opacity: xp, transform: `scale(${0.8 + 0.2 * xp})`, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fa-green-soft)', borderRadius: 16, padding: '10px 14px' }}>
        <span style={{ color: '#fff', background: 'var(--fa-green)', borderRadius: 99, width: 30, height: 30, display: 'grid', placeItems: 'center' }}>
          <IconeTraco nome="check" tamanho={18} espessura={3.2} />
        </span>
        <b style={{ ...titulo, fontSize: 22, color: 'var(--fa-green)', flex: 1 }}>Mandou bem!</b>
        <Chip variante="ouro">+10 XP</Chip>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- erro */
export const TelaErro: React.FC<PropsTela> = ({ t, d }) => {
  const marca = t >= d * 0.14;
  const corrige = t >= d * 0.3;
  const estado = (l: string): EstadoAlternativa =>
    corrige ? (l === 'A' ? 'errada' : l === 'C' ? 'reveladaCorreta' : 'apagada') : marca && l === 'A' ? 'selecionada' : 'neutra';
  const treme = corrige ? Math.sin((t - d * 0.3) * 1.8) * 7 * Math.max(0, 1 - (t - d * 0.3) / 14) : 0;
  const folha = p(t, d * 0.42, d * 0.42 + 14, sai);
  return (
    <div style={{ position: 'relative', height: 700, overflow: 'hidden', transform: 'translateZ(0)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Enunciado t={t} />
        {ALTS.map(([l, texto], i) => (
          <div key={l} style={{ ...pop(t, 4 + i * 3), translate: l === 'A' ? `${treme}px 0` : undefined }}>
            <Alternativa letra={l} texto={texto} estado={estado(l)} focavel={false} onSelecionar={nada} />
          </div>
        ))}
      </div>
      {/* a folha real do app sobe por cima (o transform do pai prende o position: fixed dela aqui dentro) */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - folha) * 100}%)`, opacity: folha > 0 ? 1 : 0 }}>
        <FolhaFeedback
          tipo="erro"
          titulo="Resposta correta: C"
          explicacao="Quem vai, vai a Curitiba (e volta de Curitiba). Cidade sem artigo não recebe crase."
          dicaBolso="Troque por uma palavra masculina. Se virar “ao”, tem crase."
          linhaRevisao="Essa questão volta na sua revisão amanhã."
          textoBotao="ENTENDI"
          onContinuar={nada}
        />
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- revisão */
export const TelaRevisao: React.FC<PropsTela> = ({ t, d }) => {
  const dias = [1, 3, 7, 15];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'linear-gradient(135deg, #1D6FE0, #1553B0)', borderRadius: 22, padding: '18px 18px 20px', color: '#fff', ...pop(t, 0) }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1, opacity: 0.85 }}>REVISÃO DE HOJE</div>
        <div style={{ ...titulo, color: '#fff', fontSize: 30, marginTop: 4 }}>{conta(t, 4, 24, 12)} questões para hoje</div>
        <div style={{ fontSize: 15, marginTop: 4, opacity: 0.9 }}>Seus erros voltam até virarem acerto.</div>
      </div>
      <div style={{ ...pop(t, 10), ...titulo, fontSize: 19 }}>Cada erro volta em:</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {dias.map((n, i) => {
          const k = p(t, 16 + i * 7, 26 + i * 7, sai);
          return (
            <div key={n} style={{ flex: 1, textAlign: 'center', borderRadius: 16, padding: '10px 0', background: k > 0.5 ? 'var(--fa-acao)' : 'var(--fa-line)', color: k > 0.5 ? '#fff' : 'var(--fa-ink)', transform: `scale(${1 + Math.sin(k * Math.PI) * 0.14})` }}>
              <div style={{ ...titulo, color: 'inherit', fontSize: 30 }}>{n}</div>
              <div style={{ fontSize: 12, fontWeight: 900 }}>{n === 1 ? 'DIA' : 'DIAS'}</div>
            </div>
          );
        })}
      </div>
      {[
        ['Língua Portuguesa', 0.62, 'portugues'],
        ['Matemática e RL', 0.48, 'matematica'],
        ['Conhecimentos Gerais', 0.71, 'gerais'],
      ].map(([nome, v, c], i) => (
        <div key={nome as string} style={{ ...pop(t, 30 + i * 5) }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{nome as string}</div>
          <BarraProgresso valor={(v as number) * p(t, 34 + i * 5, Math.max(50 + i * 5, d * 0.7))} rotulo={nome as string} cor={c as 'portugues'} />
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------- simulado */
export const TelaSimulado: React.FC<PropsTela> = ({ t, d }) => {
  const blocos: [number, string][] = [
    [5, 'PORTUGUÊS'],
    [5, 'MAT/RL'],
    [5, 'C. GERAIS'],
    [25, 'ESPECÍFICOS'],
  ];
  const seg = Math.max(0, 4 * 3600 - Math.max(0, t - d * 0.55) * 1);
  const relogio = `${Math.floor(seg / 3600)}:${String(Math.floor((seg % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(seg % 60)).padStart(2, '0')}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', borderRadius: 22, padding: 18, color: '#fff', ...pop(t, 0) }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1, opacity: 0.85 }}>PROVA COMPLETA NO PADRÃO FAU</div>
        <div style={{ ...titulo, color: '#fff', fontSize: 30, marginTop: 4 }}>
          {conta(t, 4, 22, 40)} questões · 4h
          <br />
          mínimo 50%
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {blocos.map(([n, r], i) => (
            <div key={r} style={{ flex: 1, background: 'rgba(255,255,255,0.16)', borderRadius: 12, padding: '8px 0', textAlign: 'center', ...pop(t, 10 + i * 4) }}>
              <div style={{ ...titulo, color: '#fff', fontSize: 24 }}>{conta(t, 12 + i * 4, 26 + i * 4, n)}</div>
              <div style={{ fontSize: 10, fontWeight: 900 }}>{r}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, ...pop(t, 26) }}>
        <span style={{ color: '#7C3AED' }}>
          <IconeTraco nome="relogio" tamanho={26} />
        </span>
        <span style={{ ...titulo, fontSize: 34, fontVariantNumeric: 'tabular-nums', color: '#5B21B6' }}>{relogio}</span>
      </div>
      <div style={pop(t, 32)}>
        <Botao3D variante="roxo">COMEÇAR SIMULADO</Botao3D>
      </div>
    </div>
  );
};

/* ------------------------------------------------------- pergunte ao edital */
const PERGUNTA = 'Motorista precisa de CNH?';
const RESPOSTA =
  'O cargo 406 Motorista tem 8 vagas + cadastro de reserva. Exige ensino fundamental, CNH categoria C, D ou E e 1 ano de experiência (Anexo I). A CNH também é conferida na prova prática (itens 13.8 e 13.9).';

export const TelaEdital: React.FC<PropsTela> = ({ t, d }) => {
  const letras = Math.floor(interpolate(t, [6, 6 + PERGUNTA.length * 1.1], [0, PERGUNTA.length], limita));
  const aperta = t > d * 0.36 && t < d * 0.36 + 5;
  const palavras = RESPOSTA.split(' ');
  const mostra = Math.floor(interpolate(t, [d * 0.4, d * 0.85], [0, palavras.length], limita));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...pop(t, 0), display: 'flex', alignItems: 'center', gap: 10 }}>
        <Img src={staticFile('img/capi-explicando.webp')} style={{ height: 54 }} />
        <h3 style={{ ...titulo, fontSize: 26 }}>Pergunte ao edital</h3>
      </div>
      <div style={{ ...pop(t, 3), border: '2px solid var(--fa-line)', borderRadius: 16, padding: '14px 16px', fontSize: 18, fontWeight: 700, background: '#fff', minHeight: 54 }}>
        {PERGUNTA.slice(0, letras)}
        <span style={{ opacity: Math.floor(t / 8) % 2 && letras < PERGUNTA.length + 1 ? 1 : 0, color: 'var(--fa-acao)' }}>|</span>
      </div>
      <div style={{ ...pop(t, 5), transform: aperta ? 'translateY(4px)' : undefined }}>
        <Botao3D variante="secundario">Perguntar</Botao3D>
      </div>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.45, fontWeight: 600, minHeight: 150 }}>{palavras.slice(0, mostra).join(' ')}</p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--fa-ink-2)', opacity: p(t, d * 0.85, d * 0.85 + 8) }}>
        Resposta gerada por inteligência artificial a partir do texto do edital. Confira sempre o item citado.
      </p>
    </div>
  );
};

/* ------------------------------------------------------- descubra seu cargo */
export const TelaCargo: React.FC<PropsTela> = ({ t, d }) => {
  const reqs = ['Ensino fundamental completo', 'CNH categoria C, D ou E', '1 ano de experiência'];
  const res = p(t, d * 0.38, d * 0.38 + 12, sai);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...pop(t, 0) }}>
        <Img src={staticFile('img/capi-acenando.webp')} style={{ height: 96 }} />
        <div style={{ background: '#fff', borderRadius: 18, padding: '12px 14px', fontSize: 15.5, fontWeight: 700, boxShadow: '0 2px 0 var(--fa-line)' }}>
          Eu leio o edital com você e mostro, cargo por cargo, se você pode concorrer.
        </div>
      </div>
      <div style={{ ...pop(t, 8), ...titulo, fontSize: 22 }}>Motorista</div>
      {reqs.map((r, i) => {
        const k = p(t, 14 + i * 8, 22 + i * 8, sai);
        return (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14, padding: '10px 12px', ...pop(t, 10 + i * 6) }}>
            <span style={{ width: 28, height: 28, borderRadius: 99, display: 'grid', placeItems: 'center', color: '#fff', background: k > 0.5 ? 'var(--fa-green)' : 'var(--fa-line)', transform: `scale(${1 + Math.sin(k * Math.PI) * 0.3})` }}>
              {k > 0.5 ? <IconeTraco nome="check" tamanho={16} espessura={3.2} /> : null}
            </span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{r}</span>
          </div>
        );
      })}
      <div style={{ opacity: res, transform: `scale(${0.85 + 0.15 * res})`, background: '#e6f4ea', border: '2px solid #34D399', borderRadius: 18, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...titulo, fontSize: 21, color: '#166534' }}>
          <IconeTraco nome="check" tamanho={22} espessura={3.2} /> Você atende aos requisitos
        </div>
        <div style={{ fontSize: 15, marginTop: 4, color: '#14532d' }}>Agora é se inscrever e estudar pela trilha do seu cargo.</div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- trilha */
export const TelaTrilha: React.FC<PropsTela> = ({ t, d }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={pop(t, 0)}>
      <BannerUnidade unidade={1} secao={1} titulo="Português: crase e concordância" noEdital onGuia={nada} />
    </div>
    <div style={{ background: 'linear-gradient(135deg, #0f6e70, #0b5557)', borderRadius: 22, padding: 18, color: '#fff', position: 'relative', overflow: 'hidden', ...pop(t, 8) }}>
      <div style={{ fontSize: 15, opacity: 0.85 }}>Seu próximo treino</div>
      <div style={{ ...titulo, color: '#fff', fontSize: 26 }}>Português · Crase</div>
      <div style={{ display: 'flex', gap: 16, fontWeight: 800, margin: '6px 0 14px' }}>
        <span>⏱ 5 min</span>
        <span>5 questões</span>
      </div>
      <div style={{ width: 210 }}>
        <Botao3D variante="claro" compacto bloco={false}>
          Continuar treino →
        </Botao3D>
      </div>
      <Img src={staticFile('img/capi-estudando.webp')} style={{ position: 'absolute', right: -6, bottom: -8, height: 140 }} />
    </div>
    <div style={pop(t, 16)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
        <span>Sua meta de hoje</span>
        <span>{t > d * 0.7 ? '1 de 1 treino' : '0 de 1 treino'}</span>
      </div>
      <BarraProgresso valor={p(t, 22, d * 0.7)} rotulo="Meta de hoje" cor="acerto" />
    </div>
  </div>
);

/* ------------------------------------------------------------ lição concluída */
export const TelaLicao: React.FC<PropsTela> = ({ t }) => {
  const stats: [string, string, string][] = [
    ['XP TOTAL', `⚡ ${conta(t, 10, 30, 45)}`, '#E8A400'],
    ['PRECISÃO', `${conta(t, 14, 34, 80)}%`, '#1a7f37'],
    ['TEMPO', `${Math.floor(conta(t, 18, 38, 192) / 60)}:${String(conta(t, 18, 38, 192) % 60).padStart(2, '0')}`, '#1D6FE0'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 4 }}>
      <Img src={staticFile('img/capi-celebrando.webp')} style={{ height: 170, ...pop(t, 0) }} />
      <h3 style={{ ...titulo, fontSize: 34, color: '#D9480F', ...pop(t, 4) }}>Lição concluída!</h3>
      <div style={{ fontWeight: 800, color: 'var(--fa-ink-2)', ...pop(t, 6) }}>Crase · Unidade 1 · Lição 3</div>
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        {stats.map(([r, v, c], i) => (
          <div key={r} style={{ flex: 1, border: `3px solid ${c}`, borderRadius: 16, overflow: 'hidden', ...pop(t, 8 + i * 4) }}>
            <div style={{ background: c, color: '#fff', fontSize: 11, fontWeight: 900, textAlign: 'center', padding: '5px 0' }}>{r}</div>
            <div style={{ ...titulo, fontSize: 24, color: c, textAlign: 'center', padding: '10px 0', background: '#fff' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- oferta */
export const TelaOferta: React.FC<PropsTela> = ({ t, rodape = 'Até 5/12. Depois, R$ 297.' }) => {
  const itens = ['Trilha do seu cargo', '+10 mil questões no estilo FAU', 'Revisão dos erros e simulados', 'Acesso até o dia da prova'];
  const pulso = 1 + Math.max(0, Math.sin((t - 30) / 6)) * 0.03 * (t > 30 ? 1 : 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...pop(t, 0) }}>
        <Chip variante="laranja">ACESSO COMPLETO</Chip>
        <Chip variante="acerto">7 dias de garantia</Chip>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, ...pop(t, 4) }}>
        <span style={{ ...titulo, fontSize: 64, color: '#E8590C' }}>R$ {conta(t, 4, 20, 197)}</span>
      </div>
      <div style={{ ...pop(t, 8), fontSize: 19, fontWeight: 800, marginTop: -6 }}>
        em até <b style={{ color: '#E8590C' }}>6x de R$ 32,83</b> sem juros
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fa-ink-2)' }}>no cartão · ou à vista no Pix</div>
      </div>
      {itens.map((x, i) => (
        <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 10, ...pop(t, 12 + i * 4) }}>
          <span style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--fa-green)', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <IconeTraco nome="check" tamanho={15} espessura={3.2} />
          </span>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{x}</span>
        </div>
      ))}
      <div style={{ ...pop(t, 30), transform: `scale(${pulso})`, marginTop: 4 }}>
        <Botao3D variante="laranja">GARANTIR O MEU</Botao3D>
      </div>
      <div style={{ ...pop(t, 34), textAlign: 'center', fontWeight: 900, fontSize: 15, color: '#B42318' }}>{rodape}</div>
    </div>
  );
};

/* ------------------------------------------------------- frase de impacto */
export const TelaTexto: React.FC<PropsTela> = ({ t, linhas = [], cor = '#E8590C' }) => (
  <div style={{ background: cor, borderRadius: 24, padding: '30px 18px', textAlign: 'center', margin: -18 }}>
    {linhas.map((l, i) => {
      const k = p(t, i * 5, i * 5 + 12, sai);
      const grande = i === 0;
      return (
        <div
          key={i}
          style={{
            ...titulo,
            color: '#fff',
            fontSize: grande ? (l.length > 10 ? 48 : 66) : 30,
            opacity: k,
            transform: `scale(${0.6 + 0.4 * k + Math.sin(k * Math.PI) * 0.08})`,
            textShadow: '0 4px 0 rgba(0,0,0,0.18)',
          }}
        >
          {l}
        </div>
      );
    })}
  </div>
);

/* ---------------------------------------------------------------- datas */
export const TelaDatas: React.FC<PropsTela> = ({ t }) => {
  const itens: [string, string, string][] = [
    ['49', 'cargos no edital', '#0f7b7b'],
    ['27/12', 'fim das inscrições', '#E8590C'],
    ['21/02', 'prova objetiva (2027)', '#1D6FE0'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...pop(t, 0), ...titulo, fontSize: 22 }}>Concurso · Prefeitura de Palmital</div>
      {itens.map(([n, r, c], i) => (
        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 18, padding: '12px 16px', borderLeft: `8px solid ${c}`, ...pop(t, 6 + i * 7) }}>
          <span style={{ ...titulo, fontSize: 40, color: c, minWidth: 120 }}>{n}</span>
          <span style={{ fontWeight: 800, fontSize: 18 }}>{r}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------------------------------------------------------------- garantia */
export const TelaGarantia: React.FC<PropsTela> = ({ t }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', padding: '10px 0' }}>
    <div style={{ color: '#1a7f37', transform: `scale(${0.6 + 0.4 * p(t, 0, 12, sai)})` }}>
      <span style={{ display: "grid", placeItems: "center", width: 110, height: 110, borderRadius: 99, background: "var(--fa-green)", color: "#fff" }}><IconeTraco nome="check" tamanho={64} espessura={3.4} /></span>
    </div>
    <div style={{ ...titulo, fontSize: 40, color: '#1a7f37', ...pop(t, 6) }}>7 dias de garantia</div>
    <div style={{ fontWeight: 800, fontSize: 19, ...pop(t, 12) }}>Se não gostar, devolvemos 100% do valor.</div>
  </div>
);

/* ------------------------------------------------------------- pagamento */
// QR ilustrativo (padrão fixo, não lê como código de verdade).
const QR = Array.from({ length: 121 }, (_, i) => ((i * 37 + (i >> 3) * 11) % 7) < 3);
const Canto: React.FC<{ s: React.CSSProperties }> = ({ s }) => (
  <span style={{ position: 'absolute', width: 26, height: 26, border: '6px solid #111', borderRadius: 4, background: '#fff', boxShadow: 'inset 0 0 0 4px #fff, inset 0 0 0 10px #111', ...s }} />
);
export const TelaPagamento: React.FC<PropsTela> = ({ t }) => {
  const liberado = p(t, 34, 44, sai);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...pop(t, 0), ...titulo, fontSize: 24 }}>Como você quer pagar?</div>
      <div style={{ display: 'flex', gap: 12, ...pop(t, 5) }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 18, padding: 12, border: '3px solid #0f6e70', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Chip variante="acerto">PIX</Chip>
          <div style={{ position: 'relative', width: 110, height: 110, display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 1 }}>
            {QR.map((x, i) => <span key={i} style={{ background: x && p(t, 6 + (i % 11), 14 + (i % 11), sai) > 0.5 ? '#111' : 'transparent' }} />)}
            <Canto s={{ left: 0, top: 0 }} /><Canto s={{ right: 0, top: 0 }} /><Canto s={{ left: 0, bottom: 0 }} />
          </div>
          <span style={{ fontWeight: 900, fontSize: 15, color: '#0f6e70' }}>à vista</span>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 18, padding: 12, border: '3px solid #E8590C', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, ...pop(t, 12) }}>
          <Chip variante="laranja">CARTÃO</Chip>
          <div style={{ width: 120, height: 76, borderRadius: 12, background: 'linear-gradient(135deg,#E8590C,#7C3AED)', position: 'relative', boxShadow: '0 4px 0 rgba(0,0,0,0.15)' }}>
            <span style={{ position: 'absolute', left: 12, top: 16, width: 22, height: 16, borderRadius: 4, background: '#FFD27A' }} />
            <span style={{ position: 'absolute', left: 12, bottom: 12, color: '#fff', fontWeight: 900, fontSize: 12, letterSpacing: 2 }}>•••• 2026</span>
          </div>
          <span style={{ ...titulo, fontSize: 30, color: '#E8590C' }}>{conta(t, 14, 24, 6)}x</span>
          <span style={{ fontWeight: 900, fontSize: 15, color: '#E8590C', marginTop: -8 }}>sem juros</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--fa-green)', color: '#fff', borderRadius: 16, padding: '12px 14px', opacity: liberado, transform: `scale(${0.8 + 0.2 * liberado + Math.sin(liberado * Math.PI) * 0.08})` }}>
        <IconeTraco nome="check" tamanho={24} espessura={3.4} />
        <span style={{ fontWeight: 900, fontSize: 19 }}>Acesso liberado na hora</span>
      </div>
    </div>
  );
};

export const TELAS_HTML = {
  questao: TelaQuestao,
  erro: TelaErro,
  revisao: TelaRevisao,
  simulado: TelaSimulado,
  edital: TelaEdital,
  cargo: TelaCargo,
  trilha: TelaTrilha,
  licao: TelaLicao,
  oferta: TelaOferta,
  texto: TelaTexto,
  datas: TelaDatas,
  garantia: TelaGarantia,
  pagamento: TelaPagamento,
};
export type TipoTela = keyof typeof TELAS_HTML;

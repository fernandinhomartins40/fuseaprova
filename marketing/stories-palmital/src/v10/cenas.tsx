import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Em, limita, PropsCena, tremida } from '../comum';
import { Chip, Efeito, Entra, Fundo, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Coluna, noite, Traco } from '../v7/cenas';
import { BlocoOferta, Fechamento, VitrineApp } from '../v8/pecas';

// V10 · "O erro que mais reprova" — curiosidade no gancho, demonstração (mesmo assunto, dois jeitos), motivo para começar antes

/* 1. Gancho: promessa de revelar o erro --------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const pulso = 1 + Math.max(0, Math.sin((frame - b.ini) / 6)) * 0.05;
  return (
    <Fundo {...noite} halo={{ x: 700, y: 1300, cor: 'rgba(220,38,38,0.2)' }}>
      <Coluna>
        <Rotulo atraso={a.ini - 4}>Concurso · Prefeitura de Palmital</Rotulo>
        <div style={{ height: 34 }} />
        <Palavras texto="O erro que mais / *reprova* não é / falta de estudo." atraso={a.ini} passo={3} tamanho={110} alinhamento="left" fundoDestaque={cor.vermelho} corDestaque={cor.branco} />
        <Traco em={a.ini + 30} />
        <div style={{ height: 60 }} />
        <Entra atraso={b.ini + 4} de="zoom">
          <div style={{ transform: `scale(${pulso})`, transformOrigin: '0 50%' }}>
            <Chip fundo={cor.ouro} texto={cor.tinta} tamanho={38}>
              Fica até o final ↓
            </Chip>
          </div>
        </Entra>
      </Coluna>
      <Em y={1080}>
        <Entra atraso={a.ini + 24} de="zoom">
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 300, lineHeight: 1, color: 'rgba(255,255,255,0.1)' }}>?</div>
        </Entra>
      </Em>
      <Efeito nome="pop" em={b.ini + 4} volume={0.35} />
    </Fundo>
  );
};

/* 2 e 3. O mesmo assunto, cobrado de dois jeitos ------------------------ */
const CartaoJeito: React.FC<{ rotulo: string; texto: string; alternativas?: boolean; destaque?: boolean; treme?: number }> = ({ rotulo, texto, alternativas, destaque, treme = -99 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 936,
        padding: '30px 34px',
        borderRadius: 30,
        background: cor.branco,
        border: destaque ? `6px solid ${cor.laranjaVivo}` : '6px solid transparent',
        boxShadow: '0 24px 50px rgba(0,0,0,0.35)',
        transform: `translateX(${tremida(frame - treme) * 16}px)`,
      }}
    >
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 3, color: destaque ? cor.laranja : cor.muted, textTransform: 'uppercase' }}>{rotulo}</div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, lineHeight: 1.15, color: cor.tinta, marginTop: 12 }}>{texto}</div>
      {alternativas
        ? ['A', 'B', 'C', 'D'].map((l) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, border: '3px solid #E5E7EB', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, color: cor.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l}</div>
              <div style={{ height: 13, flex: 1, borderRadius: 7, background: '#EEF0F3' }} />
            </div>
          ))
        : null}
    </div>
  );
};

export const CenaErro: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo {...noite}>
      <Coluna>
        <Palavras texto="Conteúdo certo. / *Jeito errado.*" atraso={a.ini} passo={3} tamanho={104} alinhamento="left" fundoDestaque={cor.vermelho} corDestaque={cor.branco} />
      </Coluna>
      <Em y={620}>
        <Entra atraso={b.ini + 20} de="esquerda">
          <CartaoJeito rotulo="Como está no livro" texto="O que é crase?" />
        </Entra>
      </Em>
      <Em y={900}>
        <Entra atraso={b.ini + 44} de="direita">
          <CartaoJeito rotulo="Como cai na prova" texto="Assinale a alternativa em que o acento grave foi empregado corretamente." alternativas destaque />
        </Entra>
      </Em>
      <Efeito nome="pop" em={b.ini + 20} volume={0.35} />
      <Efeito nome="pop" em={b.ini + 44} volume={0.35} />
    </Fundo>
  );
};

export const CenaExplica: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const banca = useMola(b.ini + 30, { damping: 13, stiffness: 170 });
  const cartoes = interpolate(frame, [b.ini - 6, b.ini + 6], [1, 0], limita);
  return (
    <Fundo {...noite}>
      <div style={{ opacity: cartoes }}>
        <Coluna>
          <Palavras texto="Quem só leu a teoria / *trava* na segunda." atraso={a.ini} passo={3} tamanho={84} alinhamento="left" fundoDestaque={cor.vermelho} corDestaque={cor.branco} />
        </Coluna>
        <Em y={700}>
          <CartaoJeito rotulo="Como cai na prova" texto="Assinale a alternativa em que o acento grave foi empregado corretamente." alternativas destaque treme={a.ini + 30} />
        </Em>
        <Efeito nome="pop" em={a.ini + 30} volume={0.4} />
      </div>
      {frame >= b.ini - 6 ? (
        <Coluna>
          <Palavras texto="Cada banca tem / o seu *jeito* de cobrar." atraso={b.ini} passo={3} tamanho={92} alinhamento="left" fundoDestaque={cor.laranjaVivo} corDestaque={cor.branco} />
          <div style={{ height: 80 }} />
          <Entra atraso={b.ini + 26}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 44, color: 'rgba(255,255,255,0.85)' }}>Em Palmital, a banca é a</div>
          </Entra>
          <div style={{ height: 20 }} />
          <div
            style={{
              transform: `scale(${interpolate(banca, [0, 1], [1.6, 1])})`,
              transformOrigin: '0 50%',
              opacity: Math.min(1, banca * 2),
              fontFamily: fonte.display,
              fontWeight: 800,
              fontSize: 200,
              lineHeight: 0.9,
              color: cor.branco,
              border: '8px solid rgba(255,255,255,0.9)',
              borderRadius: 36,
              padding: '24px 48px 10px',
            }}
          >
            FAU
          </div>
          <Efeito nome="ding" em={b.ini + 30} volume={0.4} />
        </Coluna>
      ) : null}
    </Fundo>
  );
};

/* 4. Produto ------------------------------------------------------------- */
export const CenaProduto: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...noite} halo={{ x: 800, y: 1000, cor: 'rgba(255,106,31,0.22)' }}>
    <VitrineApp ini={falas[0].ini + 20} fim={falas[0].fim} logo={falas[0].ini} />
  </Fundo>
);

/* 5. Por que agora: depois do edital sobram poucas semanas -------------- */
export const CenaAntes: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const linha = interpolate(frame, [a.ini + 10, a.ini + 50], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const marco = (x: number, rotulo: string, em: number, tinta: string) => (
    <div style={{ position: 'absolute', left: x - 120, top: 0, width: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: interpolate(frame, [em, em + 8], [0, 1], limita) }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: tinta, border: '6px solid #fff' }} />
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 42, color: cor.branco, marginTop: 14 }}>{rotulo}</div>
    </div>
  );
  return (
    <Fundo {...noite} halo={{ x: 300, y: 1100, cor: 'rgba(21,128,61,0.22)' }}>
      <Coluna>
        <Palavras texto="O melhor momento / é *agora*, antes / do edital." atraso={a.ini} passo={3} tamanho={100} alinhamento="left" fundoDestaque={cor.verde} corDestaque={cor.branco} />
      </Coluna>
      <div style={{ position: 'absolute', left: 72, top: 1000, width: 936, height: 200 }}>
        <div style={{ position: 'absolute', left: 0, top: 15, width: 936 * linha, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.4)' }} />
        <div style={{ position: 'absolute', left: 60, top: 11, width: 560 * interpolate(frame, [b.ini - 10, b.ini + 20], [0, 1], limita), height: 16, borderRadius: 8, background: cor.verde }} />
        <div style={{ position: 'absolute', left: 660, top: 11, width: 220 * interpolate(frame, [b.ini + 20, b.ini + 40], [0, 1], limita), height: 16, borderRadius: 8, background: cor.vermelho }} />
        {marco(60, 'Agora', a.ini + 14, cor.verde)}
        {marco(660, 'Edital', a.ini + 30, cor.ouro)}
        {marco(880, 'Prova', a.ini + 44, cor.vermelho)}
      </div>
      <Em x={340} y={1250}>
        <Entra atraso={b.ini}>
          <Chip fundo={cor.verde} tamanho={34}>
            Meses de vantagem
          </Chip>
        </Entra>
      </Em>
      <Em x={800} y={1250}>
        <Entra atraso={b.ini + 26}>
          <Chip fundo={cor.vermelho} tamanho={34}>
            Poucas semanas
          </Chip>
        </Entra>
      </Em>
      <Efeito nome="pop" em={b.ini} volume={0.35} />
      <Efeito nome="pop" em={b.ini + 26} volume={0.35} />
    </Fundo>
  );
};

/* 6. Oferta -------------------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas }) => (
  <Fundo de="#1A1220" para="#3A1608" manchas={['rgba(255,106,31,0.5)', 'rgba(255,194,51,0.25)']} halo={{ x: 540, y: 1150, cor: 'rgba(255,106,31,0.3)' }}>
    <BlocoOferta fala={falas[0]} motivo="Pro *valor* não / te segurar:" />
  </Fundo>
);

/* 7. Fecho --------------------------------------------------------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo {...noite} halo={{ x: 540, y: 900, cor: 'rgba(255,106,31,0.22)' }}>
      <Coluna>
        <Palavras texto="Agora você já sabe / qual é o *erro.*" atraso={a.ini - 4} passo={3} tamanho={96} alinhamento="left" fundoDestaque={cor.vermelho} corDestaque={cor.branco} />
        <Traco em={a.ini + 20} />
      </Coluna>
      <Fechamento em={b.ini - 4} y={720} pergunta="Comenta: “não vou cometer” 👇" />
    </Fundo>
  );
};

import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Em, limita, PropsCena, tremida } from '../comum';
import { Chip, Efeito, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Centro, FundoCinema, Manchete, paletas, Sobrelinha, Surge } from '../v8/cinema';
import { BlocoOferta, Fechamento, VitrineApp } from '../v8/pecas';

// V10 · "O erro que mais reprova" — curiosidade no gancho, demonstração (mesmo assunto, dois jeitos), motivo para começar antes

/* 1. Gancho: promessa de revelar o erro --------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const pulso = 1 + Math.max(0, Math.sin((frame - b.ini) / 6)) * 0.04;
  const marca = useMola(a.ini + 30, { damping: 18, stiffness: 120 });
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Em y={1020}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 560, lineHeight: 1, color: 'rgba(255,255,255,0.06)', transform: `scale(${0.8 + marca * 0.2}) rotate(${(1 - marca) * -10}deg)` }}>?</div>
      </Em>
      <Centro>
        <Sobrelinha atraso={a.ini - 4}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="O erro que mais / *reprova* não é / falta de estudo." atraso={a.ini} tamanho={112} faixa={cor.vermelho} />
        <div style={{ height: 60 }} />
        <Surge em={b.ini + 2}>
          <div style={{ transform: `scale(${pulso})`, transformOrigin: '0 50%' }}>
            <Chip fundo={cor.ouro} texto={cor.tinta} tamanho={40}>
              Fica até o final ↓
            </Chip>
          </div>
        </Surge>
      </Centro>
      <Efeito nome="pop" em={b.ini + 2} volume={0.35} />
    </FundoCinema>
  );
};

/* 2 e 3. O mesmo assunto, cobrado de dois jeitos ------------------------ */
const CartaoJeito: React.FC<{ rotulo: string; texto: string; alternativas?: boolean; destaque?: boolean; treme?: number }> = ({ rotulo, texto, alternativas, destaque, treme = -99 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 936,
        padding: '32px 36px',
        borderRadius: 32,
        background: cor.branco,
        border: destaque ? `6px solid ${cor.laranjaVivo}` : '6px solid transparent',
        boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
        transform: `translateX(${tremida(frame - treme) * 16}px)`,
      }}
    >
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 3, color: destaque ? cor.laranja : cor.muted, textTransform: 'uppercase' }}>{rotulo}</div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 50, lineHeight: 1.15, color: cor.tinta, marginTop: 12 }}>{texto}</div>
      {alternativas
        ? ['A', 'B', 'C', 'D'].map((l) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, border: '3px solid #E5E7EB', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, color: cor.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l}</div>
              <div style={{ height: 13, flex: 1, borderRadius: 7, background: '#EEF0F3' }} />
            </div>
          ))
        : null}
    </div>
  );
};

export const CenaErro: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 270, width: 936 }}>
        <Manchete texto="Conteúdo certo. / *Jeito errado.*" atraso={a.ini} tamanho={108} faixa={cor.vermelho} />
      </div>
      <Em y={640}>
        <Surge em={b.ini + 18} de="esquerda">
          <CartaoJeito rotulo="Como está no livro" texto="O que é crase?" />
        </Surge>
      </Em>
      <Em y={930}>
        <Surge em={b.ini + 42} de="direita">
          <CartaoJeito rotulo="Como cai na prova" texto="Assinale a alternativa em que o acento grave foi empregado corretamente." alternativas destaque />
        </Surge>
      </Em>
      <Efeito nome="pop" em={b.ini + 18} volume={0.35} />
      <Efeito nome="pop" em={b.ini + 42} volume={0.35} />
    </FundoCinema>
  );
};

export const CenaExplica: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const banca = useMola(b.ini + 34, { damping: 16, stiffness: 150 });
  const cartoes = interpolate(frame, [b.ini - 6, b.ini + 4], [1, 0], limita);
  return (
    <FundoCinema paleta={paletas.petroleo} duracao={duracao}>
      {cartoes > 0 ? (
        <div style={{ opacity: cartoes }}>
          <div style={{ position: 'absolute', left: 72, top: 270, width: 936 }}>
            <Manchete texto="Quem só leu a teoria / *trava* na segunda." atraso={a.ini} tamanho={88} faixa={cor.vermelho} />
          </div>
          <Em y={720}>
            <CartaoJeito rotulo="Como cai na prova" texto="Assinale a alternativa em que o acento grave foi empregado corretamente." alternativas destaque treme={a.ini + 30} />
          </Em>
          <Efeito nome="pop" em={a.ini + 30} volume={0.4} />
        </div>
      ) : null}
      {frame >= b.ini - 6 ? (
        <Centro>
          <Manchete texto="Cada banca tem / o seu *jeito* de cobrar." atraso={b.ini} tamanho={92} />
          <div style={{ height: 80 }} />
          <Surge em={b.ini + 26}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 46, color: 'rgba(255,255,255,0.85)' }}>Em Palmital, a banca é a</div>
          </Surge>
          <div style={{ height: 24 }} />
          <div
            style={{
              transform: `scale(${interpolate(banca, [0, 1], [1.4, 1])})`,
              transformOrigin: '0 50%',
              opacity: Math.min(1, banca * 2),
              fontFamily: fonte.display,
              fontWeight: 800,
              fontSize: 210,
              lineHeight: 0.9,
              color: cor.branco,
              border: '8px solid rgba(255,255,255,0.9)',
              borderRadius: 36,
              padding: '26px 50px 12px',
              boxShadow: '0 0 60px rgba(34,195,181,0.25)',
            }}
          >
            FAU
          </div>
          <Efeito nome="ding" em={b.ini + 34} volume={0.4} />
        </Centro>
      ) : null}
    </FundoCinema>
  );
};

/* 4. Produto ------------------------------------------------------------- */
export const CenaProduto: React.FC<PropsCena> = ({ falas, duracao }) => (
  <FundoCinema paleta={paletas.noite} duracao={duracao}>
    <VitrineApp ini={falas[0].ini + 20} fim={falas[0].fim} logo={falas[0].ini} />
  </FundoCinema>
);

/* 5. Por que agora: depois do edital sobram poucas semanas -------------- */
export const CenaAntes: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const linha = interpolate(frame, [a.ini + 10, a.ini + 50], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const marco = (x: number, rotulo: string, em: number, tinta: string) => (
    <div style={{ position: 'absolute', left: x - 120, top: 0, width: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: interpolate(frame, [em, em + 8], [0, 1], limita) }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: tinta, border: '6px solid #fff', boxShadow: `0 0 24px ${tinta}` }} />
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 46, color: cor.branco, marginTop: 14 }}>{rotulo}</div>
    </div>
  );
  return (
    <FundoCinema paleta={paletas.verde} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 300, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Por que agora</Sobrelinha>
        <Manchete texto="O melhor momento / é *agora*, antes / do edital." atraso={a.ini} tamanho={104} faixa={cor.verde} />
      </div>
      <div style={{ position: 'absolute', left: 72, top: 1000, width: 936, height: 200 }}>
        <div style={{ position: 'absolute', left: 0, top: 16, width: 936 * linha, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.35)' }} />
        <div style={{ position: 'absolute', left: 60, top: 12, width: 560 * interpolate(frame, [b.ini - 10, b.ini + 20], [0, 1], limita), height: 16, borderRadius: 8, background: cor.verde, boxShadow: `0 0 20px ${cor.verde}` }} />
        <div style={{ position: 'absolute', left: 660, top: 12, width: 220 * interpolate(frame, [b.ini + 20, b.ini + 40], [0, 1], limita), height: 16, borderRadius: 8, background: cor.vermelho, boxShadow: `0 0 20px ${cor.vermelho}` }} />
        {marco(60, 'Agora', a.ini + 14, cor.verde)}
        {marco(660, 'Edital', a.ini + 30, cor.ouro)}
        {marco(880, 'Prova', a.ini + 44, cor.vermelho)}
      </div>
      <Em x={330} y={1270}>
        <Surge em={b.ini}>
          <Chip fundo={cor.verde} tamanho={36}>
            Meses de vantagem
          </Chip>
        </Surge>
      </Em>
      <Em x={800} y={1270}>
        <Surge em={b.ini + 26}>
          <Chip fundo={cor.vermelho} tamanho={36}>
            Poucas semanas
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="pop" em={b.ini} volume={0.35} />
      <Efeito nome="pop" em={b.ini + 26} volume={0.35} />
    </FundoCinema>
  );
};

/* 6. Oferta -------------------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => (
  <FundoCinema paleta={paletas.oferta} duracao={duracao}>
    <BlocoOferta falas={falas} motivo="Pro *valor* não / te segurar:" />
  </FundoCinema>
);

/* 7. Fecho --------------------------------------------------------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 330, width: 936 }}>
        <Manchete texto="Agora você já sabe / qual é o *erro.*" atraso={a.ini - 4} tamanho={98} faixa={cor.vermelho} />
      </div>
      <Fechamento em={b.ini - 4} y={760} pergunta="Comenta: “não vou cometer” 👇" />
    </FundoCinema>
  );
};

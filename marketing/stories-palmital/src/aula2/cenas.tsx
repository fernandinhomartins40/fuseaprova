import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Area, Em, limita, PropsCena, SeloBatida, Texto } from '../comum';
import { BarraPercentual, CenaChamadaAula, ChipMateria, Conta, Marca, useConta } from '../aulas';
import { Brilhos, Capi, Chip, Confetes, Efeito, Entra, Fundo, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';

// Aula 2 · Aumento e desconto percentual — verde-água e azul com dourado
const ceu = { de: '#0E9F6E', para: cor.azulNoite, manchas: [cor.turquesa, cor.ouro, cor.azul] };

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...ceu} halo={{ x: 540, y: 1300, cor: 'rgba(255,255,255,0.3)' }}>
    <Area style={{ justifyContent: 'flex-start' }}>
      <ChipMateria icone="icone-matematica" texto="Aula rápida · Matemática" />
      <div style={{ height: 30 }} />
      <Palavras texto="*Aumento* e *desconto* / numa conta só!" atraso={falas[0].ini} passo={3} tamanho={100} />
    </Area>
    <Em y={900}>
      <Capi pose="explicando" altura={760} atraso={14} />
    </Em>
    <SeloBatida texto="%" em={falas[0].ini + 40} x={130} y={1010} tamanho={110} giro={-8} />
    <Brilhos
      atraso={20}
      pontos={[
        { x: 860, y: 1040, t: 62, cor: cor.ouro },
        { x: 200, y: 1450, t: 44, cor: cor.branco },
      ]}
    />
  </Fundo>
);

/* 2. Por cento = de cada cem --------------------------------------------- */
const Grade: React.FC<{ em: number; pinta: number; quantos: number }> = ({ em, pinta, quantos }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 58px)', gap: 10, padding: 22, borderRadius: 30, background: 'rgba(255,255,255,0.12)' }}>
      {Array.from({ length: 100 }, (_, i) => {
        const aparece = interpolate(frame, [em + (i % 10) + Math.floor(i / 10) * 2, em + (i % 10) + Math.floor(i / 10) * 2 + 6], [0, 1], limita);
        const pintado = i < quantos && frame >= pinta + i * 2;
        return (
          <div
            key={i}
            style={{
              width: 58,
              height: 58,
              borderRadius: 12,
              background: pintado ? cor.ouro : 'rgba(255,255,255,0.85)',
              boxShadow: pintado ? `0 5px 0 ${cor.ouroSombra}` : '0 5px 0 rgba(0,0,0,0.12)',
              opacity: aparece,
              transform: `scale(${aparece * (pintado ? 1.06 : 1)})`,
            }}
          />
        );
      })}
    </div>
  );
};

export const CenaPorcento: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo de={cor.azulNoite} para="#0B6E6A" manchas={[cor.turquesa, cor.azul]} halo={{ x: 540, y: 1000, cor: 'rgba(255,194,51,0.18)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Palavras texto="Por cento = / de cada *100*" atraso={a.ini} passo={3} tamanho={96} />
      </Area>
      <Em y={560}>
        <Grade em={a.ini + 16} pinta={b.ini + 6} quantos={20} />
      </Em>
      <Em y={1360}>
        <Conta em={b.ini + 74}>20% = 0,2</Conta>
      </Em>
      <Efeito nome="pop" em={b.ini + 74} volume={0.5} />
    </Fundo>
  );
};

/* 3. Desconto ------------------------------------------------------------ */
const Etiqueta: React.FC<{ em: number; preco: string }> = ({ em, preco }) => {
  const p = useMola(em, { damping: 11, stiffness: 150 });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        padding: '26px 52px 26px 34px',
        borderRadius: 30,
        background: cor.branco,
        boxShadow: '0 12px 0 rgba(0,0,0,0.15), 0 30px 60px rgba(0,0,0,0.25)',
        transform: `rotate(${interpolate(p, [0, 1], [-14, -3])}deg) scale(${interpolate(p, [0, 1], [0.5, 1])})`,
        opacity: Math.min(1, p * 2),
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: `8px solid ${cor.muted}` }} />
      <div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 4, color: cor.muted }}>TÊNIS</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 96, lineHeight: 1, color: cor.tinta }}>{preco}</div>
      </div>
    </div>
  );
};

export const CenaDesconto: React.FC<PropsCena> = ({ falas }) => {
  const [a, b, c] = falas;
  const resultado = useConta(150, 120, c.ini + 70, c.ini + 110);
  return (
    <Fundo {...ceu} halo={{ x: 540, y: 900, cor: 'rgba(255,255,255,0.2)' }}>
      <Confetes inicio={c.ini + 110} quantidade={50} />
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo atraso={a.ini - 4}>Desconto</Rotulo>
      </Area>
      <Em x={480} y={360}>
        <Etiqueta em={a.ini + 4} preco="R$ 150" />
      </Em>
      <SeloBatida texto="−20%" em={a.ini + 60} x={700} y={330} fundo={cor.coral} tinta={cor.branco} sombra="#B91C1C" tamanho={70} giro={6} />
      <Em y={720}>
        <BarraPercentual em={b.ini + 24} partes={[{ pct: 20, cor: cor.coral, rotulo: '−20' }, { pct: 80, cor: cor.verde, rotulo: 'sobram 80%' }]} />
      </Em>
      <Em y={930}>
        <Conta em={b.ini + 120} fundo={cor.ouro}>× 0,8</Conta>
      </Em>
      <Em y={1170}>
        <Conta em={c.ini + 8} tamanho={76}>
          150 × 0,8 = <span style={{ color: cor.verde }}>R$ {resultado}</span>
        </Conta>
      </Em>
      <Efeito nome="ding" em={c.ini + 110} volume={0.35} />
    </Fundo>
  );
};

/* 4. Aumento ------------------------------------------------------------- */
export const CenaAumento: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo de={cor.azul} para={cor.azulNoite} manchas={[cor.turquesa, cor.ouro]} halo={{ x: 540, y: 900, cor: 'rgba(255,255,255,0.22)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo atraso={a.ini - 4}>Aumento</Rotulo>
        <div style={{ height: 28 }} />
        <Palavras texto="É o *contrário*" atraso={a.ini} passo={3} tamanho={100} />
      </Area>
      <Em y={700}>
        <BarraPercentual em={b.ini + 30} largura={850} partes={[{ pct: 100, cor: cor.branco, tinta: cor.tinta, rotulo: '100%' }, { pct: 10, cor: cor.ouro, tinta: cor.tinta, rotulo: '+10' }]} />
      </Em>
      <Em y={880}>
        <Entra atraso={b.ini + 80}>
          <Texto tamanho={56}>fica com 110%</Texto>
        </Entra>
      </Em>
      <Em y={1080}>
        <Conta em={b.ini + 150} fundo={cor.ouro}>× 1,1</Conta>
      </Em>
      <Efeito nome="pop" em={b.ini + 150} volume={0.5} />
    </Fundo>
  );
};

/* 5. Pegadinha: +10% e −10% ---------------------------------------------- */
const Passo: React.FC<{ valor: string; em: number; corFundo?: string }> = ({ valor, em, corFundo = cor.branco }) => (
  <Entra atraso={em} de="zoom">
    <div
      style={{
        width: 230,
        padding: '22px 0',
        borderRadius: 30,
        background: corFundo,
        color: cor.tinta,
        fontFamily: fonte.display,
        fontWeight: 800,
        fontSize: 96,
        lineHeight: 1,
        textAlign: 'center',
        boxShadow: '0 10px 0 rgba(0,0,0,0.18)',
      }}
    >
      {valor}
    </div>
  </Entra>
);

const Seta: React.FC<{ rotulo: string; em: number }> = ({ rotulo, em }) => (
  <Entra atraso={em} de="esquerda" distancia={40}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 36, color: cor.ouro }}>{rotulo}</div>
      <svg width="70" height="34" viewBox="0 0 70 34" fill="none" stroke={cor.branco} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17h58M48 4l14 13-14 13" />
      </svg>
    </div>
  </Entra>
);

export const CenaPegadinha: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo de="#7F1D1D" para={cor.azulNoite} manchas={[cor.coral, cor.roxo]} halo={{ x: 540, y: 900, cor: 'rgba(240,72,77,0.25)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Entra atraso={a.ini - 4} de="zoom">
          <Chip fundo={cor.coral} icone="icone-alvo">
            Pegadinha!
          </Chip>
        </Entra>
        <div style={{ height: 28 }} />
        <Palavras texto="*+10%* e depois *−10%* / volta ao preço?" atraso={a.ini + 4} passo={3} tamanho={84} />
      </Area>
      <Em y={820}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Passo valor="100" em={b.ini + 14} />
          <Seta rotulo="+10%" em={b.ini + 34} />
          <Passo valor="110" em={b.ini + 44} />
          <Seta rotulo="−10%" em={b.ini + 90} />
          <Passo valor="99" em={b.ini + 150} corFundo={cor.ouro} />
        </div>
      </Em>
      <Em y={1040}>
        <Entra atraso={b.ini + 110}>
          <Texto tamanho={50}>10% de 110 = 11 → 110 − 11 = 99</Texto>
        </Entra>
      </Em>
      <Em y={1200}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <Marca certo={false} em={b.ini + 4} tamanho={96} />
          <Entra atraso={b.ini + 8}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 84, color: cor.branco }}>Não volta!</div>
          </Entra>
        </div>
      </Em>
      <Efeito nome="pop" em={b.ini + 4} volume={0.5} />
      <Efeito nome="ding" em={b.ini + 150} volume={0.3} />
    </Fundo>
  );
};

/* 6. Chamada ------------------------------------------------------------- */
export const CenaChamada: React.FC<PropsCena> = (props) => <CenaChamadaAula {...props} {...ceu} />;

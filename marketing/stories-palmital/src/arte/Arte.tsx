import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Celular } from '../componentes';
import { cor, fonte } from '../tema';

// Arte estática "Saiu o edital": 1º impacto "preciso estudar", 2º "é fácil no Fuse Aprova", 3º preço e 6x.
// Sem preço riscado (só o valor que existe hoje e o aumento anunciado), sem brasão, com o aviso de não vínculo.

const Check: React.FC<{ children: React.ReactNode; tamanho: number }> = ({ children, tamanho }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: tamanho * 0.45 }}>
    <div style={{ flex: 'none', width: tamanho * 1.25, height: tamanho * 1.25, borderRadius: '50%', background: cor.verde, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={tamanho * 0.8} height={tamanho * 0.8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </div>
    <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: tamanho, lineHeight: 1.15, color: cor.tinta }}>{children}</div>
  </div>
);

export const Arte: React.FC<{ story?: boolean }> = ({ story }) => {
  // story: área livre das barras do Instagram em cima e embaixo
  return (
    <AbsoluteFill style={{ background: cor.creme, padding: story ? '230px 72px 260px' : '64px 64px 44px', display: 'flex', flexDirection: 'column' }}>
      {/* luzes suaves no fundo */}
      <div style={{ position: 'absolute', right: -260, top: -220, width: 820, height: 820, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,106,31,0.20), transparent 65%)' }} />
      <div style={{ position: 'absolute', left: -300, bottom: 120, width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,128,140,0.14), transparent 65%)' }} />

      {/* 1. a notícia e o chamado */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ background: cor.teal, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 2, textTransform: 'uppercase', padding: '12px 24px', borderRadius: 999 }}>
          Concurso Prefeitura de Palmital
        </div>
        <Img src={staticFile('img/logo-completa.webp')} style={{ height: 76 }} />
      </div>
      <div style={{ position: 'relative', fontFamily: fonte.corpo, fontWeight: 800, fontSize: 32, color: cor.laranja, marginTop: 34 }}>
        Edital publicado · inscrições de 25/11 a 27/12
      </div>
      <div style={{ position: 'relative', fontFamily: fonte.display, fontWeight: 800, fontSize: 112, lineHeight: 0.98, color: cor.tinta, marginTop: 10 }}>
        Hora de começar
        <br />
        a <span style={{ color: cor.laranjaVivo }}>estudar.</span>
      </div>

      {/* 2. é fácil: o app */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: 30, marginTop: 20 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, lineHeight: 1.05, color: cor.tinta }}>
            Com o <span style={{ color: cor.laranja }}>Fuse Aprova</span> fica fácil:
          </div>
          <Check tamanho={33}>Questões no estilo da banca</Check>
          <Check tamanho={33}>Lições curtas, no celular</Check>
          <Check tamanho={33}>Simulados iguais à prova</Check>
        </div>
        <div style={{ position: 'relative', flex: 'none' }}>
          <Celular tela="real-inicio" largura={story ? 320 : 215} style={{ transform: 'rotate(4deg)' }} />
          <Img
            src={staticFile('img/capi-estudando.webp')}
            style={{ position: 'absolute', left: story ? -130 : -105, bottom: -16, height: story ? 250 : 190, filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.25))' }}
          />
        </div>
      </div>

      {/* 3. preço e parcelamento */}
      <div
        style={{
          position: 'relative',
          marginTop: 30,
          borderRadius: 40,
          background: `linear-gradient(135deg, ${cor.laranjaVivo}, ${cor.laranja})`,
          padding: '26px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: `0 12px 0 ${cor.laranjaSombra}, 0 30px 50px rgba(217,72,15,0.3)`,
        }}
      >
        <div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 2, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>Valor promocional</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 100, lineHeight: 0.95, color: cor.branco }}>R$ 197</div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, color: cor.branco, marginTop: 6 }}>
            ou <span style={{ background: cor.ouro, color: cor.tinta, padding: '2px 12px', borderRadius: 10 }}>6x de R$ 32,83</span> sem juros no cartão
          </div>
        </div>
        <div style={{ flex: 'none', background: cor.branco, borderRadius: 26, padding: '18px 22px', textAlign: 'center', transform: 'rotate(3deg)' }}>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 20, letterSpacing: 1, color: cor.muted, textTransform: 'uppercase' }}>Na próxima
            <br />
            semana sobe para</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, lineHeight: 1.1, color: cor.vermelho }}>R$ 297</div>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 34 }}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 38, color: cor.tinta }}>
          Garanta o seu: <span style={{ color: cor.laranja }}>link na bio</span>
        </div>
      </div>
      <div style={{ position: 'relative', fontFamily: fonte.corpo, fontWeight: 700, fontSize: 17, color: cor.muted, textAlign: 'center', marginTop: 10 }}>
        Fuse Aprova não tem vínculo com a FAU-Unicentro nem com a Prefeitura de Palmital.
      </div>
    </AbsoluteFill>
  );
};

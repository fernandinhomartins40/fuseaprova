import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { AcaoBio, Area, Aviso, Em, limita, PropsCena, Texto } from '../comum';
import { Celular, Chip, Efeito, Entra, Fundo, Icone, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';

// V7 · "Parcelado em até 6x" — mais sóbrio: fundo escuro, tipografia alinhada à esquerda, sem confete nem carimbo
export const noite = { de: '#121726', para: cor.azulNoite, manchas: ['rgba(255,106,31,0.35)', 'rgba(29,111,224,0.4)', 'rgba(20,128,140,0.35)'] };

/** Barra laranja fina sob os títulos, que cresce da esquerda. */
export const Traco: React.FC<{ em: number; largura?: number }> = ({ em, largura = 220 }) => {
  const p = useMola(em, { damping: 20 });
  return <div style={{ width: largura * p, height: 10, borderRadius: 5, background: cor.laranjaVivo, marginTop: 26 }} />;
};

export const Coluna: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Area style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>{children}</Area>
);

/* 1. Gancho: pergunta + promessa de novidade no final ------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const cel = useMola(a.ini + 10, { damping: 16, stiffness: 100 });
  const pulso = 1 + Math.max(0, Math.sin((frame - b.ini) / 6)) * 0.05;
  return (
    <Fundo {...noite} halo={{ x: 760, y: 1400, cor: 'rgba(255,106,31,0.22)' }}>
      <Coluna>
        <Rotulo atraso={2}>Concurso · Prefeitura de Palmital</Rotulo>
        <div style={{ height: 34 }} />
        <Palavras texto="Vai fazer o / concurso de / *Palmital?*" atraso={a.ini} passo={3} tamanho={124} alinhamento="left" fundoDestaque={cor.laranjaVivo} corDestaque={cor.branco} />
        <Traco em={a.ini + 18} />
        <div style={{ height: 40 }} />
        <Entra atraso={b.ini - 2}>
          <Texto tamanho={50} style={{ textAlign: 'left' }}>
            Fica até o final:
            <br />
            <span style={{ color: cor.ouro }}>começar ficou mais fácil.</span>
          </Texto>
        </Entra>
        <div style={{ height: 30 }} />
        <Entra atraso={b.ini + 14} de="zoom">
          <div style={{ transform: `scale(${pulso})`, transformOrigin: '0 50%' }}>
            <Chip fundo={cor.ouro} texto={cor.tinta} tamanho={34}>
              Novidade no final ↓
            </Chip>
          </div>
        </Entra>
      </Coluna>
      <div style={{ position: 'absolute', left: 600, top: 1120, transform: `translateY(${(1 - cel) * 1200}px) rotate(-8deg)` }}>
        <Celular tela="real-inicio" largura={420} />
      </div>
      <Efeito nome="pop" em={b.ini + 14} volume={0.35} />
    </Fundo>
  );
};

/* 2. Banca: quem organiza e o que o app oferece -------------------------- */
const disciplinas = [
  { icone: 'icone-portugues', nome: 'Português' },
  { icone: 'icone-matematica', nome: 'Matemática' },
  { icone: 'icone-gerais', nome: 'Conhecimentos Gerais' },
  { icone: 'icone-especificos', nome: 'Específicas do cargo' },
];

export const CenaBanca: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const selo = useMola(a.ini + 22, { damping: 13, stiffness: 170 });
  const cel = useMola(b.ini + 40, { damping: 16, stiffness: 100 });
  const conta = Math.round(interpolate(frame, [b.ini + 26, b.ini + 70], [0, 10000], { ...limita, easing: (t) => 1 - (1 - t) ** 3 }));
  return (
    <Fundo de="#0F1A2E" para="#0B3B44" manchas={['rgba(20,128,140,0.45)', 'rgba(255,194,51,0.22)', 'rgba(29,111,224,0.35)']}>
      <Coluna>
        <Rotulo atraso={a.ini - 6}>Banca organizadora</Rotulo>
        <div style={{ height: 30 }} />
        <div
          style={{
            transform: `scale(${interpolate(selo, [0, 1], [1.6, 1])})`,
            transformOrigin: '0 50%',
            opacity: Math.min(1, selo * 2),
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
        <div style={{ height: 50 }} />
        <Entra atraso={b.ini + 22} de="esquerda">
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 120, lineHeight: 1, color: cor.ouro }}>
            {conta.toLocaleString('pt-BR')}+
          </div>
          <Texto tamanho={46} style={{ textAlign: 'left' }}>
            questões no estilo da banca
          </Texto>
        </Entra>
        <div style={{ height: 40 }} />
        {disciplinas.map((d, i) => (
          <Entra key={d.nome} atraso={b.ini + 50 + i * 6} de="esquerda">
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 16 }}>
              <Icone nome={d.icone} tamanho={64} />
              <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.92)' }}>{d.nome}</div>
            </div>
          </Entra>
        ))}
      </Coluna>
      <div style={{ position: 'absolute', left: 640, top: 1020, transform: `translateY(${(1 - cel) * 1200}px) rotate(6deg)` }}>
        <Celular tela="real-acerto" largura={400} />
      </div>
      <Efeito nome="pop" em={a.ini + 22} volume={0.45} />
      <Efeito nome="whoosh" em={b.ini + 22} volume={0.3} />
    </Fundo>
  );
};

/* 3. Como funciona: quatro recursos, o celular acompanha a fala --------- */
const recursos = [
  { titulo: 'Lições curtas', tela: 'real-trilha', em: 0 },
  { titulo: 'Explicação em cada questão', tela: 'real-acerto', em: 0.18 },
  { titulo: 'Revisão do que você erra', tela: 'real-revisao', em: 0.48 },
  { titulo: 'Simulados no formato da prova', tela: 'real-simulado', em: 0.72 },
];

export const CenaApp: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a] = falas;
  const len = a.fim - a.ini;
  const quando = recursos.map((r) => a.ini + Math.round(r.em * len));
  const atual = quando.filter((q) => frame >= q).length - 1;
  const cel = useMola(a.ini - 4, { damping: 16, stiffness: 110 });
  return (
    <Fundo {...noite} halo={{ x: 800, y: 1000, cor: 'rgba(29,111,224,0.3)' }}>
      <Coluna>
        <Rotulo>Como funciona</Rotulo>
        <div style={{ height: 40 }} />
        {recursos.map((r, i) => {
          const ativo = i === Math.max(0, atual);
          return (
            <Entra key={r.titulo} atraso={quando[i]} de="esquerda">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, width: 520, marginBottom: 46, opacity: ativo ? 1 : 0.55 }}>
                <div
                  style={{
                    flex: 'none',
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    background: ativo ? cor.laranjaVivo : 'rgba(255,255,255,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: fonte.display,
                    fontWeight: 800,
                    fontSize: 38,
                    color: cor.branco,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 50, lineHeight: 1.08, color: cor.branco }}>{r.titulo}</div>
              </div>
            </Entra>
          );
        })}
      </Coluna>
      <div style={{ position: 'absolute', left: 610, top: 560, transform: `translateX(${(1 - cel) * 1000}px) rotate(4deg)` }}>
        <Celular tela={recursos[Math.max(0, atual)].tela} largura={420} />
      </div>
      {quando.slice(1).map((q) => (
        <Efeito key={q} nome="pop" em={q} volume={0.3} />
      ))}
    </Fundo>
  );
};

/* 4. Oferta: parcelado no cartão em até 6x sem juros -------------------- */
export const Cartao: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 14, stiffness: 120 });
  return (
    <div
      style={{
        width: 560,
        height: 350,
        borderRadius: 36,
        padding: 40,
        background: `linear-gradient(135deg, ${cor.laranjaVivo} 0%, ${cor.laranja} 55%, #7A2A08 100%)`,
        boxShadow: '0 40px 80px rgba(0,0,0,0.45)',
        transform: `perspective(1400px) rotateY(${interpolate(p, [0, 1], [70, -12]) + Math.sin(frame / 30) * 3}deg) rotate(-6deg)`,
        opacity: Math.min(1, p * 2),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ width: 90, height: 66, borderRadius: 14, background: 'linear-gradient(135deg, #FFE27A, #D99A00)' }} />
      <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 40, letterSpacing: 6, color: 'rgba(255,255,255,0.92)' }}>•••• •••• •••• 2026</div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 34, color: cor.branco }}>Fuse Aprova</div>
    </div>
  );
};

/** "6x sem juros de R$ 32,83" que bate na tela. */
export const SeisVezes: React.FC<{ em: number }> = ({ em }) => {
  const seis = useMola(em, { damping: 10, stiffness: 200, mass: 0.7 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, transform: `scale(${interpolate(seis, [0, 1], [2.2, 1])})`, opacity: Math.min(1, seis * 3) }}>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 230, lineHeight: 0.9, color: cor.branco }}>6x</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: cor.ouro, color: cor.tinta, fontFamily: fonte.display, fontWeight: 800, fontSize: 64, lineHeight: 1, padding: '14px 28px', borderRadius: 22 }}>
          sem juros
        </div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 44, color: cor.branco }}>de R$ 32,83</div>
      </div>
    </div>
  );
};

export const CenaOferta: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo de="#1A1220" para="#3A1608" manchas={['rgba(255,106,31,0.5)', 'rgba(255,194,51,0.25)', 'rgba(220,38,38,0.25)']} halo={{ x: 540, y: 1250, cor: 'rgba(255,106,31,0.3)' }}>
      <Coluna>
        <Rotulo atraso={a.ini - 4} corTexto={cor.ouro}>
          Novidade
        </Rotulo>
        <div style={{ height: 30 }} />
        <Palavras texto="Agora no / *cartão* de crédito" atraso={a.ini + 30} passo={3} tamanho={100} alinhamento="left" fundoDestaque={cor.branco} corDestaque={cor.laranja} />
        <div style={{ height: 24 }} />
        <Entra atraso={a.ini + 52}>
          <Texto tamanho={44} corTexto="rgba(255,255,255,0.85)" style={{ textAlign: 'left' }}>
            Acesso completo · R$ 197
          </Texto>
        </Entra>
      </Coluna>
      <Em x={560} y={830}>
        <Cartao em={a.ini + 36} />
      </Em>
      <Em y={1210}>
        <SeisVezes em={b.ini} />
      </Em>
      <Efeito nome="whoosh" em={a.ini + 36} volume={0.35} />
      <Efeito nome="ding" em={b.ini} volume={0.45} />
    </Fundo>
  );
};

/* 5. Prazo: 14 dias que vão acabando ------------------------------------ */
export const CenaPrazo: React.FC<PropsCena> = ({ falas, duracao }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  // depois que os 14 entram, os dias "passam" um a um até sobrar a metade
  const passados = Math.floor(interpolate(frame, [a.ini + 40, duracao - 10], [0, 7], limita));
  return (
    <Fundo {...noite} halo={{ x: 540, y: 1150, cor: 'rgba(255,194,51,0.18)' }}>
      <Coluna>
        <Rotulo atraso={a.ini - 6} corTexto={cor.ouro}>
          Atenção
        </Rotulo>
        <div style={{ height: 30 }} />
        <Palavras texto="Essa oportunidade / vale só *2 semanas*" atraso={a.ini} passo={3} tamanho={96} alinhamento="left" fundoDestaque={cor.ouro} corDestaque={cor.tinta} />
        <Traco em={a.ini + 24} />
      </Coluna>
      <Em y={1000}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 110px)', gap: 18 }}>
          {Array.from({ length: 14 }, (_, i) => {
            const foi = i < passados;
            return (
              <Entra key={i} atraso={a.ini + 8 + i * 2} de="zoom">
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 22,
                    background: foi ? 'rgba(255,255,255,0.08)' : cor.branco,
                    color: foi ? 'rgba(255,255,255,0.3)' : cor.tinta,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: fonte.display,
                    fontWeight: 800,
                    fontSize: 46,
                    textDecoration: foi ? 'line-through' : 'none',
                  }}
                >
                  {i + 1}
                </div>
              </Entra>
            );
          })}
        </div>
        <div style={{ height: 40 }} />
        <Entra atraso={a.ini + 40}>
          <Chip fundo={cor.vermelho} tamanho={36} icone="icone-relogio">
            Depois, acaba
          </Chip>
        </Entra>
        <div style={{ height: 26 }} />
        <Entra atraso={b.ini} de="zoom">
          <Chip fundo={cor.laranjaVivo} tamanho={40}>
            Parcele no cartão agora
          </Chip>
        </Entra>
      </Em>
      <Efeito nome="pop" em={a.ini + 40} volume={0.35} />
      <Efeito nome="pop" em={b.ini} volume={0.4} />
    </Fundo>
  );
};

/* 6. Chamada final ------------------------------------------------------- */
const resumo = ['Concurso de Palmital', 'Questões no estilo da FAU', 'Até 6x sem juros no cartão', 'Oportunidade de 2 semanas'];

export const CenaChamada: React.FC<PropsCena> = ({ falas }) => {
  const [a] = falas;
  return (
    <Fundo {...noite} halo={{ x: 540, y: 1300, cor: 'rgba(255,106,31,0.28)' }}>
      <Coluna>
        <Palavras texto="Garanta seu / acesso *agora*" atraso={a.ini - 4} passo={3} tamanho={112} alinhamento="left" fundoDestaque={cor.laranjaVivo} corDestaque={cor.branco} />
        <div style={{ height: 44 }} />
        {resumo.map((r, i) => (
          <Entra key={r} atraso={a.ini + 10 + i * 5} de="esquerda">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={cor.ouro} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 44, color: cor.branco }}>{r}</div>
            </div>
          </Entra>
        ))}
      </Coluna>
      <AcaoBio em={a.ini + 30} y={1060} texto="Quero garantir o meu" fundo={cor.laranjaVivo} sombra={cor.laranjaSombra} corBio={cor.azulNoite} />
      <Aviso />
    </Fundo>
  );
};

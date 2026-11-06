import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AcaoBio, Area, Aviso, Carimbo, Em, limita, PropsCena, SeloBatida, Texto, tremida } from '../comum';
import { Brilhos, Capi, Celular, Chip, Confetes, Efeito, Entra, Fundo, Icone, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';

// V4 · "Você acertaria?" — quiz, verde e turquesa com lima e dourado
const quiz = { de: '#12B886', para: '#0B6E6A', manchas: [cor.turquesa, cor.ouro, '#A3E635'] };
const verdeOk = '#16A34A';

/** Alternativa de quiz no estilo do app: letra, texto, estado certo/errado. */
const Alternativa: React.FC<{ letra: string; texto: string; estado?: 'neutro' | 'certa' | 'apagada'; destaque?: number }> = ({
  letra,
  texto,
  estado = 'neutro',
  destaque = 0,
}) => {
  const certa = estado === 'certa';
  const apagada = estado === 'apagada';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        width: 900,
        padding: '22px 26px',
        borderRadius: 28,
        background: certa ? '#E7F6EC' : cor.branco,
        border: `5px solid ${certa ? verdeOk : '#E5E7EB'}`,
        boxShadow: `0 8px 0 ${certa ? '#0F7A36' : 'rgba(0,0,0,0.15)'}${certa ? ', 0 0 50px rgba(34,197,94,0.55)' : ''}`,
        opacity: apagada ? 0.45 : 1,
        transform: `scale(${1 + destaque * 0.04})`,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          flexShrink: 0,
          borderRadius: 20,
          background: certa ? verdeOk : 'transparent',
          border: certa ? 'none' : '4px solid #E5E7EB',
          color: certa ? cor.branco : cor.muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonte.corpo,
          fontWeight: 900,
          fontSize: 38,
        }}
      >
        {certa ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
        ) : (
          letra
        )}
      </div>
      <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 40, color: certa ? '#0F5F2D' : cor.tinta, lineHeight: 1.15 }}>{texto}</div>
    </div>
  );
};

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = () => {
  const frame = useCurrentFrame();
  return (
    <Fundo {...quiz} halo={{ x: 540, y: 1250, cor: 'rgba(255,255,255,0.28)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Entra atraso={2} de="cima">
          <Chip icone="icone-dica" fundo="rgba(255,255,255,0.22)">
            Teste rápido
          </Chip>
        </Entra>
        <div style={{ height: 40 }} />
        <Palavras texto="Concurso de / *Palmital:* você / *acertaria?*" atraso={6} tamanho={116} fundoDestaque={cor.ouro} corDestaque={cor.tinta} />
        <div style={{ height: 24 }} />
        <Entra atraso={26}>
          <Texto tamanho={42}>Uma questão no estilo da banca FAU</Texto>
        </Entra>
      </Area>
      {[
        { x: 120, y: 1000, t: 150, g: -14 },
        { x: 860, y: 920, t: 120, g: 12 },
      ].map((q, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: q.x - q.t / 2,
            top: q.y + Math.sin(frame / 10 + i) * 14,
            fontFamily: fonte.display,
            fontWeight: 800,
            fontSize: q.t,
            color: 'rgba(255,255,255,0.85)',
            transform: `rotate(${q.g}deg)`,
            textShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          ?
        </div>
      ))}
      <Em y={960}>
        <Capi pose="incentivando" altura={700} atraso={14} />
      </Em>
    </Fundo>
  );
};

/* 2. O quiz ------------------------------------------------------------- */
const alternativas = [
  { letra: 'A', texto: 'Vou à Curitiba no sábado.' },
  { letra: 'B', texto: 'Cheguei à Prefeitura de Palmital às 8h.' },
  { letra: 'C', texto: 'Fiquei frente à frente com ele.' },
  { letra: 'D', texto: 'Comprei uma moto à prazo.' },
];

export const CenaQuiz: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a, b, c] = falas;
  const revela = frame >= c.ini - 2;
  const contagem = interpolate(frame, [b.ini, c.ini - 2], [0, 3], limita);
  const numero = 3 - Math.floor(contagem);
  const explica = spring({ frame: frame - c.ini - 30, fps, config: { damping: 15, stiffness: 110 } });
  const R = 70;
  return (
    <Fundo {...quiz}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Entra atraso={a.ini - 6} de="cima">
          <div style={{ width: 936, padding: '28px 34px', borderRadius: 32, background: cor.branco, boxShadow: '0 10px 0 rgba(0,0,0,0.18)' }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 3, color: cor.teal }}>PORTUGUÊS · CRASE</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 54, color: cor.tinta, lineHeight: 1.1, marginTop: 6 }}>
              Qual frase usa a crase
              <br />
              do jeito certo?
            </div>
          </div>
        </Entra>
        <div style={{ height: 30 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {alternativas.map((alt, i) => (
            <Entra key={alt.letra} atraso={a.ini + 6 + i * 5} de="direita" distancia={200}>
              <Alternativa
                letra={alt.letra}
                texto={alt.texto}
                estado={!revela ? 'neutro' : alt.letra === 'B' ? 'certa' : 'apagada'}
                destaque={revela && alt.letra === 'B' ? Math.max(0, Math.sin((frame - c.ini) / 4)) * (frame < c.ini + 14 ? 1 : 0) : 0}
              />
            </Entra>
          ))}
        </div>
      </Area>
      {/* cronômetro 3-2-1 */}
      {frame >= b.ini && !revela ? (
        <div style={{ position: 'absolute', right: 70, top: 1250, width: 2 * R + 20, height: 2 * R + 20 }}>
          <svg width={2 * R + 20} height={2 * R + 20} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={R + 10} cy={R + 10} r={R} fill={cor.branco} stroke="rgba(0,0,0,0.08)" strokeWidth={14} />
            <circle
              cx={R + 10}
              cy={R + 10}
              r={R}
              fill="none"
              stroke={cor.coral}
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * R}
              strokeDashoffset={2 * Math.PI * R * (contagem / 3)}
            />
          </svg>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 90, color: cor.coral }}>
            {Math.max(1, numero)}
          </AbsoluteFill>
        </div>
      ) : null}
      {/* explicação */}
      {revela ? (
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 1210,
            width: 700,
            padding: '24px 28px',
            borderRadius: 30,
            background: '#E7F6EC',
            border: `4px solid ${verdeOk}`,
            transform: `translateY(${(1 - explica) * 400}px)`,
            opacity: explica,
          }}
        >
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 46, color: '#0F5F2D', lineHeight: 1 }}>Letra B!</div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 32, color: '#0F5F2D', lineHeight: 1.25, marginTop: 8 }}>
            Chegar <b>a</b> + <b>a</b> prefeitura = <b>à</b> prefeitura. Hora exata também: <b>às</b> 8h.
          </div>
        </div>
      ) : null}
      {revela ? (
        <Em x={890} y={1180}>
          <Capi pose="explicando" altura={420} atraso={c.ini + 30} />
        </Em>
      ) : null}
      <Efeito nome="ding" em={c.ini - 2} volume={0.5} />
      {[0, 1, 2].map((k) => (
        <Efeito key={k} nome="pop" em={Math.round(b.ini + ((c.ini - 2 - b.ini) * k) / 3)} volume={0.3} />
      ))}
    </Fundo>
  );
};

/* 3. O app: treino com explicação, revisão, simulado e ranking -------- */
const passos = [
  { titulo: 'Explicação na hora', telas: ['real-acerto'], icone: 'icone-acerto' },
  { titulo: 'Errou? Volta na revisão', telas: ['real-revisao'], icone: 'icone-revisao' },
  { titulo: 'Simulado e ranking', telas: ['real-simulado', 'real-liga'], icone: 'icone-simulados' },
];

export const CenaApp: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const atual = falas.reduce((acc, f, i) => (frame >= f.ini - 6 ? i : acc), 0);
  const p = spring({ frame: frame - (falas[atual].ini - 6), fps, config: { damping: 15, stiffness: 120 } });
  const passo = passos[atual];
  return (
    <Fundo de="#0EA5A0" para="#0B4F6C" manchas={[cor.turquesa, '#A3E635', cor.azul]} halo={{ x: 540, y: 1100, cor: 'rgba(255,255,255,0.25)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>Treino no Fuse Aprova</Rotulo>
        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
          <Icone nome={passo.icone} tamanho={92} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 78, color: cor.branco, lineHeight: 1 }}>{passo.titulo}</div>
        </div>
        <div style={{ height: 22 }} />
        <div style={{ display: 'flex', gap: 14 }}>
          {passos.map((_, i) => (
            <div key={i} style={{ width: i === atual ? 70 : 22, height: 22, borderRadius: 11, background: i <= atual ? cor.ouro : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
      </Area>
      <Em y={600}>
        <div style={{ display: 'flex', gap: 30, transform: `translateY(${(1 - p) * 600}px)`, opacity: p }}>
          {passo.telas.map((t, i) => (
            <div key={t} style={{ transform: `rotate(${passo.telas.length > 1 ? (i ? 5 : -5) : 0}deg)` }}>
              <Celular tela={t} largura={passo.telas.length > 1 ? 400 : 460} />
            </div>
          ))}
        </div>
      </Em>
      {falas.map((f, i) => (i > 0 ? <Efeito key={i} nome="pop" em={f.ini - 6} volume={0.35} /> : null))}
    </Fundo>
  );
};

/* 4. Edital ------------------------------------------------------------- */
export const CenaEdital: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cel = spring({ frame: frame - falas[1].ini + 4, fps, config: { damping: 15, stiffness: 110 } });
  return (
    <Fundo {...quiz}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Palavras texto="O edital de Palmital / nem *saiu* ainda!" tamanho={92} fundoDestaque={cor.ouro} corDestaque={cor.tinta} />
        <div style={{ height: 22 }} />
        <Entra atraso={falas[1].ini - 2}>
          <Texto tamanho={42}>Quando sair, o app se ajusta ao seu cargo.</Texto>
        </Entra>
      </Area>
      <Em x={300} y={780}>
        <Capi pose="constancia" altura={620} atraso={8} />
      </Em>
      <div style={{ position: 'absolute', left: 580, top: 700, transform: `translateX(${(1 - cel) * 600}px) rotate(${5 + (1 - cel) * 10}deg)` }}>
        <Celular tela="real-edital" largura={420} />
      </div>
      <SeloBatida texto="SEM CUSTO EXTRA" em={falas[1].fim - 24} x={90} y={1440} />
    </Fundo>
  );
};

/* 5. Oferta como quiz --------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const certo = frame >= b.ini;
  const preco = useMola(b.ini, { damping: 9, stiffness: 170 });
  const risca = interpolate(frame, [a.fim - 12, a.fim], [0, 1], limita);
  return (
    <Fundo de={cor.branco} para="#E9FBF2" claro manchas={['rgba(34,197,94,0.3)', 'rgba(255,194,51,0.45)', 'rgba(34,195,181,0.3)']}>
      <Area style={{ justifyContent: 'flex-start', paddingTop: 270 }}>
        <Entra de="cima">
          <Chip fundo={cor.teal} icone="icone-coroa">
            Lançamento
          </Chip>
        </Entra>
        <div style={{ height: 30 }} />
        <Entra atraso={4}>
          <div style={{ width: 936, padding: '28px 34px', borderRadius: 32, background: cor.branco, boxShadow: '0 10px 0 rgba(0,0,0,0.08), 0 20px 50px rgba(0,0,0,0.08)' }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 3, color: cor.teal }}>PERGUNTA BÔNUS · CONCURSO PALMITAL</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 54, color: cor.tinta, lineHeight: 1.1, marginTop: 6 }}>
              Quanto custa o acesso completo?
            </div>
          </div>
        </Entra>
        <div style={{ height: 30 }} />
        <Entra atraso={a.ini + 8} de="direita" distancia={200}>
          <div style={{ position: 'relative' }}>
            <Alternativa letra="A" texto="R$ 397" estado={certo ? 'apagada' : 'neutro'} />
            <div
              style={{
                position: 'absolute',
                left: 124,
                top: '50%',
                width: 150,
                height: 8,
                marginTop: -4,
                background: cor.coral,
                borderRadius: 4,
                transformOrigin: 'left',
                transform: `scaleX(${risca})`,
              }}
            />
          </div>
        </Entra>
        <div style={{ height: 18 }} />
        <Entra atraso={a.ini + 14} de="direita" distancia={200}>
          <Alternativa letra="B" texto={certo ? 'R$ 197 no lançamento' : 'R$ ???'} estado={certo ? 'certa' : 'neutro'} />
        </Entra>
        <div style={{ height: 36 }} />
        <div
          style={{
            transform: `scale(${interpolate(preco, [0, 1], [0.2, 1])})`,
            opacity: Math.min(1, preco * 2),
            display: 'flex',
            alignItems: 'flex-start',
            color: verdeOk,
            fontFamily: fonte.display,
            fontWeight: 800,
            lineHeight: 0.9,
          }}
        >
          <span style={{ fontSize: 90, marginTop: 40, marginRight: 12 }}>R$</span>
          <span style={{ fontSize: 260, letterSpacing: -4 }}>197</span>
        </div>
        <Entra atraso={b.ini + 24}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 38, color: cor.tinta }}>
            <Icone nome="icone-pix" tamanho={54} /> à vista no Pix · acesso até a prova
          </div>
        </Entra>
      </Area>
      <Em y={1180}>
        <Capi pose="incentivando" altura={400} atraso={b.ini + 40} />
      </Em>
      <Efeito nome="ding" em={b.ini} volume={0.5} />
      <Confetes inicio={b.ini} />
    </Fundo>
  );
};

/* 6. Chamada ------------------------------------------------------------ */
export const CenaChamada: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  return (
    <Fundo de="#12B886" para="#0B4F6C" manchas={[cor.ouro, cor.turquesa, '#A3E635', cor.azul]} halo={{ x: 540, y: 1000, cor: 'rgba(255,255,255,0.3)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Palavras texto="Imagina treinando / todo dia para a / prova de *Palmital!*" tamanho={96} fundoDestaque={cor.ouro} corDestaque={cor.tinta} />
      </Area>
      <Em y={690}>
        <div style={{ transform: `translate(${tremida(frame - 32) * 10}px, ${tremida(frame - 29) * 6}px)` }}>
          <Capi pose="celebrando" altura={620} atraso={8} />
        </div>
      </Em>
      <Carimbo em={26} y={990} texto="ACERTOU!" />
      <Efeito nome="pop" em={26} volume={0.5} />
      <Brilhos
        atraso={14}
        pontos={[
          { x: 150, y: 700, t: 62, cor: cor.ouro },
          { x: 880, y: 650, t: 46, cor: cor.branco },
        ]}
      />
      <AcaoBio em={falas[1].ini - 4} y={1350} texto="Quero treinar" fundo={cor.laranja} sombra={cor.laranjaSombra} corBio={cor.teal} />
      <Confetes inicio={28} quantidade={60} />
      <Aviso />
    </Fundo>
  );
};

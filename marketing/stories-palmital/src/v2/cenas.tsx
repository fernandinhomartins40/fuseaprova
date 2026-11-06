import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AcaoBio, Area, Aviso, Em, limita, PrecoAntigo, PropsCena, SeloBatida, Texto } from '../comum';
import { Brilhos, Capi, Celular, Chip, Confetes, Efeito, Entra, Fundo, Icone, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';

// V2 · "Cabe na sua rotina" — noite, azul-marinho com neon turquesa e dourado
const noite = { de: '#16245E', para: '#0A1030', manchas: [cor.roxo, cor.turquesa, cor.azul] };
const neon = cor.turquesa;

const Estrelas: React.FC = () => (
  <Brilhos
    pontos={[
      { x: 90, y: 330, t: 26, cor: cor.branco },
      { x: 960, y: 290, t: 30, cor: cor.ouro },
      { x: 860, y: 620, t: 20, cor: cor.branco },
      { x: 150, y: 820, t: 22, cor: neon },
      { x: 980, y: 1180, t: 26, cor: cor.branco },
      { x: 60, y: 1420, t: 24, cor: cor.ouro },
    ]}
  />
);

/** Relógio analógico com ponteiros girando rápido ("o dia passando"). */
const Relogio: React.FC<{ tamanho: number }> = ({ tamanho }) => {
  const frame = useCurrentFrame();
  const r = tamanho / 2;
  const min = frame * 14;
  const hora = frame * 1.2;
  const ponteiro = (ang: number, comp: number, larg: number, c: string) => (
    <line
      x1={r}
      y1={r}
      x2={r + Math.sin((ang * Math.PI) / 180) * comp}
      y2={r - Math.cos((ang * Math.PI) / 180) * comp}
      stroke={c}
      strokeWidth={larg}
      strokeLinecap="round"
    />
  );
  return (
    <svg width={tamanho} height={tamanho} style={{ filter: `drop-shadow(0 0 40px ${neon}88)` }}>
      <circle cx={r} cy={r} r={r - 10} fill="rgba(255,255,255,0.06)" stroke={neon} strokeWidth={10} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={r + Math.sin(a) * (r - 34)}
            y1={r - Math.cos(a) * (r - 34)}
            x2={r + Math.sin(a) * (r - 54)}
            y2={r - Math.cos(a) * (r - 54)}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={i % 3 ? 4 : 8}
            strokeLinecap="round"
          />
        );
      })}
      {ponteiro(hora, r * 0.45, 14, cor.branco)}
      {ponteiro(min, r * 0.68, 9, cor.ouro)}
      <circle cx={r} cy={r} r={14} fill={cor.ouro} />
    </svg>
  );
};

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = () => (
  <Fundo {...noite} halo={{ x: 540, y: 1250, cor: 'rgba(34,195,181,0.28)' }}>
    <Estrelas />
    <Area style={{ justifyContent: 'flex-start' }}>
      <Entra atraso={2} de="cima">
        <Chip icone="icone-localizacao" fundo="rgba(34,195,181,0.22)">
          Concurso Palmital · PR
        </Chip>
      </Entra>
      <div style={{ height: 44 }} />
      <Palavras texto="Acha que não / sobra *tempo* / para estudar?" atraso={6} tamanho={112} fundoDestaque={neon} corDestaque={cor.tinta} />
      <div style={{ height: 26 }} />
      <Entra atraso={28}>
        <Texto tamanho={40} corTexto="rgba(255,255,255,0.92)">
          para o concurso da Prefeitura de Palmital?
        </Texto>
      </Entra>
    </Area>
    <Em x={330} y={1040}>
      <Entra atraso={14} de="zoom">
        <Relogio tamanho={420} />
      </Entra>
    </Em>
    <Em x={790} y={930}>
      <Capi pose="constancia" altura={640} atraso={22} />
    </Em>
  </Fundo>
);

/* 2. Um dia de rotina: manhã, almoço e noite ---------------------------- */
const momentos = [
  { hora: '07:00', onde: 'No café da manhã', faz: 'uma lição rapidinha', tela: 'real-trilha', de: '#FF9A5A', para: '#E8456B' },
  { hora: '12:00', onde: 'Na hora do almoço', faz: 'revisa o que errou', tela: 'real-revisao', de: '#3BA0FF', para: '#1D4FC0' },
  { hora: '22:00', onde: 'Antes de dormir', faz: 'mais umas questões', tela: 'real-acerto', de: '#2A2F7A', para: '#0A1030' },
];

export const CenaRotina: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const atual = falas.reduce((a, f, i) => (frame >= f.ini - 6 ? i : a), 0);
  return (
    <AbsoluteFill>
      {momentos.map((m, i) => (
        <AbsoluteFill key={m.hora} style={{ opacity: interpolate(frame, [falas[i].ini - 10, falas[i].ini + 4], [i === 0 ? 1 : 0, 1], limita) }}>
          <Fundo de={m.de} para={m.para} manchas={[cor.ouro, cor.rosa, neon]} />
        </AbsoluteFill>
      ))}
      {/* linha do dia: manhã → almoço → noite */}
      <Em y={260}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {momentos.map((m, i) => (
            <React.Fragment key={m.hora}>
              <div
                style={{
                  fontFamily: fonte.corpo,
                  fontWeight: 900,
                  fontSize: 28,
                  letterSpacing: 2,
                  padding: '10px 22px',
                  borderRadius: 999,
                  background: i <= atual ? cor.branco : 'rgba(255,255,255,0.18)',
                  color: i <= atual ? cor.tinta : 'rgba(255,255,255,0.75)',
                }}
              >
                {m.hora}
              </div>
              {i < 2 ? <div style={{ width: 60, height: 4, borderRadius: 2, background: i < atual ? cor.branco : 'rgba(255,255,255,0.3)' }} /> : null}
            </React.Fragment>
          ))}
        </div>
      </Em>
      {momentos.map((m, i) => {
        const ini = falas[i].ini - 6;
        const fim = falas[i + 1] ? falas[i + 1].ini - 6 : 9999;
        if (frame < ini || frame >= fim + 12) return null;
        const p = spring({ frame: frame - ini, fps, config: { damping: 15, stiffness: 130 } });
        const sai = frame >= fim ? interpolate(frame, [fim, fim + 12], [0, 1], limita) : 0;
        return (
          <AbsoluteFill key={m.hora} style={{ opacity: 1 - sai }}>
            <Em y={360}>
              <div style={{ transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`, opacity: p, textAlign: 'center' }}>
                <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 170, lineHeight: 1, color: cor.branco, textShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
                  {m.hora}
                </div>
                <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: cor.branco, lineHeight: 1.1 }}>{m.onde}</div>
                <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.9)' }}>{m.faz}</div>
              </div>
            </Em>
            <Em y={760}>
              <div style={{ transform: `translateY(${(1 - p) * 500}px) rotate(${(1 - p) * 8}deg)` }}>
                <Celular tela={m.tela} largura={380} />
              </div>
            </Em>
            <Efeito nome="pop" em={ini + 4} volume={0.35} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/* 3. A soma: 15 minutos ------------------------------------------------- */
export const CenaSoma: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const enche = interpolate(frame, [falas[0].ini, falas[0].ini + 40], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const R = 250;
  const volta = 2 * Math.PI * R;
  return (
    <Fundo {...noite} halo={{ x: 540, y: 820, cor: 'rgba(255,194,51,0.25)' }}>
      <Estrelas />
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>No fim do dia</Rotulo>
      </Area>
      <Em y={360}>
        <div style={{ position: 'relative', width: 2 * R + 60, height: 2 * R + 60 }}>
          <svg width={2 * R + 60} height={2 * R + 60} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 30px ${cor.ouro}88)` }}>
            <circle cx={R + 30} cy={R + 30} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={36} />
            <circle
              cx={R + 30}
              cy={R + 30}
              r={R}
              fill="none"
              stroke={cor.ouro}
              strokeWidth={36}
              strokeLinecap="round"
              strokeDasharray={volta}
              strokeDashoffset={volta * (1 - enche)}
            />
          </svg>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 240, lineHeight: 0.9, color: cor.branco }}>{Math.round(15 * enche)}</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 44, letterSpacing: 6, color: cor.ouro }}>MINUTOS</div>
          </AbsoluteFill>
        </div>
      </Em>
      <Em y={1000}>
        <Entra atraso={falas[0].ini + 30}>
          <Texto tamanho={56} style={{ fontFamily: fonte.display }}>
            sem mudar a sua rotina
          </Texto>
        </Entra>
      </Em>
      <Em y={1110}>
        <Capi pose="incentivando" altura={460} atraso={falas[0].ini + 20} />
      </Em>
    </Fundo>
  );
};

/* 4. Hábito: ofensiva, meta e lembrete --------------------------------- */
const ajudas = [
  { icone: 'elemento-faisca', titulo: 'Ofensiva', sub: 'dias seguidos' },
  { icone: 'icone-alvo', titulo: 'Meta do dia', sub: 'sabe quando parar' },
  { icone: 'icone-relogio', titulo: 'Lembrete', sub: 'na hora que você quer' },
];

export const CenaHabito: React.FC<PropsCena> = ({ falas }) => {
  const len = falas[0].fim - falas[0].ini;
  return (
    <Fundo de="#1B2A6B" para="#0A1030" manchas={[cor.coral, cor.ouro, neon]}>
      <Estrelas />
      <Area style={{ justifyContent: 'flex-start' }}>
        <Palavras texto="O app te ajuda / a manter o *ritmo*" tamanho={96} fundoDestaque={cor.ouro} corDestaque={cor.tinta} />
      </Area>
      <div style={{ position: 'absolute', left: 50, top: 560 }}>
        <Entra de="esquerda" distancia={300}>
          <div style={{ transform: 'rotate(-4deg)' }}>
            <Celular tela="real-ofensiva" largura={430} />
          </div>
        </Entra>
      </div>
      <div style={{ position: 'absolute', left: 520, top: 640, width: 510, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {ajudas.map((a, i) => (
          <Entra key={a.titulo} atraso={Math.round(len * (0.35 + i * 0.18))} de="direita" distancia={240}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '24px 26px',
                borderRadius: 30,
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.22)',
                boxShadow: `0 0 40px rgba(34,195,181,0.18)`,
              }}
            >
              <Icone nome={a.icone} tamanho={84} />
              <div>
                <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: cor.branco, lineHeight: 1 }}>{a.titulo}</div>
                <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 28, color: 'rgba(255,255,255,0.75)' }}>{a.sub}</div>
              </div>
            </div>
          </Entra>
        ))}
      </div>
    </Fundo>
  );
};

/* 5. Edital ------------------------------------------------------------- */
export const CenaEdital: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cel = spring({ frame: frame - falas[1].ini + 4, fps, config: { damping: 15, stiffness: 110 } });
  return (
    <Fundo de={cor.teal} para="#0A1030" manchas={[neon, cor.azul, cor.ouro]}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>Concurso de Palmital</Rotulo>
        <div style={{ height: 20 }} />
        <Palavras texto="O edital de Palmital / ainda *não saiu.*" tamanho={92} fundoDestaque={cor.ouro} corDestaque={cor.tinta} />
        <div style={{ height: 24 }} />
        <Entra atraso={falas[1].ini - 2}>
          <Texto tamanho={42}>Quando sair, o app se ajusta ao seu cargo e ao conteúdo cobrado.</Texto>
        </Entra>
      </Area>
      <div style={{ position: 'absolute', left: 610, top: 720, transform: `translateX(${(1 - cel) * 600}px) rotate(${4 + (1 - cel) * 10}deg)` }}>
        <Celular tela="real-edital" largura={420} />
      </div>
      <Em x={290} y={760}>
        <Capi pose="explicando" altura={560} atraso={falas[1].ini + 6} />
      </Em>
      <SeloBatida texto="SEM CUSTO ADICIONAL" em={falas[1].fim - 30} x={60} y={1400} tamanho={42} />
    </Fundo>
  );
};

/* 6. Oferta em cupom ---------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  const preco = useMola(b.ini, { damping: 8, stiffness: 160 });
  const cupom = useMola(2, { damping: 14, stiffness: 120 });
  return (
    <Fundo {...noite} halo={{ x: 540, y: 820, cor: `rgba(34,195,181,${0.35 * Math.min(1, preco)})` }}>
      <Estrelas />
      <Em y={300}>
        <div
          style={{
            position: 'relative',
            width: 900,
            padding: '50px 40px 46px',
            borderRadius: 44,
            background: cor.branco,
            boxShadow: `0 20px 0 rgba(0,0,0,0.25), 0 0 80px rgba(34,195,181,0.35)`,
            transform: `translateY(${(1 - cupom) * 400}px) rotate(${(1 - cupom) * -6}deg)`,
            opacity: cupom,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* recortes laterais de cupom */}
          {[-1, 1].map((l) => (
            <div
              key={l}
              style={{ position: 'absolute', top: 560, [l < 0 ? 'left' : 'right']: -34, width: 68, height: 68, borderRadius: 34, background: '#101A45' }}
            />
          ))}
          <Chip fundo={cor.teal} icone="icone-coroa">
            Lançamento
          </Chip>
          <div style={{ height: 24 }} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 56, color: cor.tinta, lineHeight: 1 }}>Acesso completo</div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 2, color: cor.teal, marginTop: 8 }}>
            CONCURSO PREFEITURA DE PALMITAL
          </div>
          <div style={{ height: 16 }} />
          <PrecoAntigo entra={a.ini + 10} corta={a.fim - 12} tamanho={72} />
          <div
            style={{
              transform: `scale(${interpolate(preco, [0, 1], [0.2, 1])})`,
              opacity: Math.min(1, preco * 2),
              display: 'flex',
              alignItems: 'flex-start',
              color: cor.teal,
              fontFamily: fonte.display,
              fontWeight: 800,
              lineHeight: 0.9,
            }}
          >
            <span style={{ fontSize: 56, marginTop: 50, color: cor.tinta }}>por&nbsp;</span>
            <span style={{ fontSize: 90, marginTop: 36, marginRight: 12 }}>R$</span>
            <span style={{ fontSize: 270, letterSpacing: -4 }}>197</span>
          </div>
          <div style={{ width: '100%', borderTop: '5px dashed #E5E7EB', margin: '30px 0 26px' }} />
          <Entra atraso={b.ini + 20}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 36, color: cor.tinta }}>
              <Icone nome="icone-pix" tamanho={52} /> à vista no Pix · pagamento único
            </div>
          </Entra>
          <div style={{ height: 14 }} />
          <Entra atraso={b.ini + 28}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 36, color: cor.tinta }}>
              <Icone nome="icone-relogio" tamanho={52} /> acesso até o dia da prova
            </div>
          </Entra>
        </div>
      </Em>
      <Em y={1260}>
        <Capi pose="incentivando" altura={400} atraso={b.ini + 30} />
      </Em>
      <Efeito nome="ding" em={b.ini} volume={0.5} />
      <Confetes inicio={b.ini} cores={[neon, cor.ouro, cor.branco, cor.rosa]} />
    </Fundo>
  );
};

/* 7. Chamada ------------------------------------------------------------ */
export const CenaChamada: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...noite} halo={{ x: 540, y: 980, cor: 'rgba(255,194,51,0.3)' }}>
    <Estrelas />
    <Area style={{ justifyContent: 'flex-start' }}>
      <Palavras texto="15 minutos por dia / rumo à Prefeitura / de *Palmital.*" tamanho={100} fundoDestaque={cor.ouro} corDestaque={cor.tinta} />
    </Area>
    <Em y={690}>
      <Capi pose="celebrando" altura={640} atraso={10} />
    </Em>
    <AcaoBio em={falas[1].ini - 4} y={1350} texto="Começar hoje" fundo={cor.teal} sombra={cor.tealSombra} corBio={cor.teal} />
    <Aviso />
  </Fundo>
);

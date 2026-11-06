import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AcaoBio, Area, Aviso, Carimbo, Em, limita, PrecoAntigo, PropsCena, SeloBatida, Texto, tremida } from '../comum';
import { Brilhos, Capi, Celular, Chip, Confetes, Efeito, Entra, Fundo, Icone, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';

// V3 · "A conta que aprova" — editorial, roxo profundo e dourado
const roxo = { de: '#3A1585', para: '#14062F', manchas: ['#6D3FE0', cor.rosa, '#2C1B8F'] };
const ouro = cor.ouro;

const Numero: React.FC<{ valor: number; casas?: number; sufixo?: string; ini: number; dur?: number; tamanho?: number }> = ({
  valor,
  casas = 0,
  sufixo = '',
  ini,
  dur = 24,
  tamanho = 230,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [ini, ini + dur], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
  const n = (valor * t).toFixed(casas).replace('.', ',');
  return (
    <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: tamanho, lineHeight: 0.9, color: ouro, textShadow: `0 0 60px ${ouro}66` }}>
      {n}
      <span style={{ fontSize: tamanho * 0.42, marginLeft: 10 }}>{sufixo}</span>
    </div>
  );
};

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...roxo} halo={{ x: 540, y: 1300, cor: 'rgba(255,194,51,0.22)' }}>
    <Area style={{ justifyContent: 'flex-start' }}>
      <Entra atraso={2} de="cima">
        <Chip icone="icone-localizacao" fundo="rgba(255,194,51,0.2)">
          Concurso Palmital · PR
        </Chip>
      </Entra>
      <div style={{ height: 40 }} />
      <Palavras texto="Quer passar no / concurso da / *Prefeitura* de / *Palmital?*" atraso={6} tamanho={100} fundoDestaque={ouro} corDestaque={cor.tinta} />
      <div style={{ height: 34 }} />
      <Entra atraso={falas[1].ini - 2} de="zoom">
        <div
          style={{
            fontFamily: fonte.display,
            fontWeight: 800,
            fontSize: 64,
            color: cor.tinta,
            background: cor.branco,
            padding: '10px 34px',
            borderRadius: 22,
            boxShadow: `0 10px 0 rgba(0,0,0,0.25)`,
            transform: 'rotate(-2deg)',
          }}
        >
          Faz essa conta comigo =
        </div>
      </Entra>
    </Area>
    <Em y={1000}>
      <Capi pose="explicando" altura={680} atraso={14} />
    </Em>
  </Fundo>
);

/* 2. A conta ------------------------------------------------------------- */
export const CenaConta: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a, b, c] = falas;
  const barra1 = spring({ frame: frame - b.ini - 6, fps, config: { damping: 14, stiffness: 90 } });
  const barra2 = spring({ frame: frame - c.ini - 6, fps, config: { damping: 14, stiffness: 70 } });
  const fase = frame < b.ini - 4 ? 0 : frame < c.ini - 4 ? 1 : 2;
  const Barra: React.FC<{ alt: number; p: number; rotulo: string; valor: string; destaque?: boolean }> = ({ alt, p, rotulo, valor, destaque }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: 260 }}>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, color: destaque ? ouro : cor.branco, opacity: p }}>{valor}</div>
      <div
        style={{
          width: 200,
          height: alt * p,
          borderRadius: '24px 24px 8px 8px',
          background: destaque ? `linear-gradient(180deg, ${ouro}, ${cor.ouroVivo})` : 'rgba(255,255,255,0.35)',
          boxShadow: destaque ? `0 0 60px ${ouro}88` : 'none',
        }}
      />
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, letterSpacing: 3, color: 'rgba(255,255,255,0.8)' }}>{rotulo}</div>
    </div>
  );
  return (
    <Fundo {...roxo}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>A conta</Rotulo>
      </Area>
      <Em y={340}>
        <div style={{ height: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {fase === 0 ? (
            <>
              <Numero valor={15} sufixo="min" ini={a.ini} />
              <Texto tamanho={46}>por dia</Texto>
            </>
          ) : fase === 1 ? (
            <>
              <Numero valor={7.5} casas={1} sufixo="h" ini={b.ini} />
              <Texto tamanho={46}>em 1 mês</Texto>
            </>
          ) : (
            <>
              <Numero valor={45} sufixo="h+" ini={c.ini} />
              <Texto tamanho={46}>em 6 meses</Texto>
            </>
          )}
        </div>
      </Em>
      <Em y={760}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 80, height: 760 }}>
          <Barra alt={90} p={barra1} rotulo="1 MÊS" valor="7h30" />
          <Barra alt={540} p={barra2} rotulo="6 MESES" valor="45h+" destaque />
        </div>
      </Em>
      <Efeito nome="pop" em={b.ini} volume={0.4} />
      <Efeito nome="ding" em={c.ini + 10} volume={0.35} />
    </Fundo>
  );
};

/* 3. Esperar o edital × começar hoje ---------------------------------- */
const Coluna: React.FC<{ entra: number; titulo: string; linhas: string[]; icone: string; bom?: boolean }> = ({ entra, titulo, linhas, icone, bom }) => (
  <Entra atraso={entra} de={bom ? 'direita' : 'esquerda'} distancia={260}>
    <div
      style={{
        width: 450,
        height: 640,
        padding: '40px 30px',
        borderRadius: 40,
        background: bom ? `linear-gradient(170deg, ${ouro}, ${cor.ouroVivo})` : 'rgba(255,255,255,0.08)',
        border: bom ? 'none' : '3px solid rgba(255,255,255,0.18)',
        boxShadow: bom ? `0 14px 0 ${cor.ouroSombra}, 0 0 80px ${ouro}66` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
        transform: bom ? 'scale(1.05)' : 'none',
      }}
    >
      <div style={{ filter: bom ? 'none' : 'grayscale(1)', opacity: bom ? 1 : 0.6 }}>
        <Icone nome={icone} tamanho={130} />
      </div>
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 3, color: bom ? cor.tinta : 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
        {titulo}
      </div>
      {linhas.map((l) => (
        <div
          key={l}
          style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 46, lineHeight: 1.05, color: bom ? cor.tinta : 'rgba(255,255,255,0.75)', textAlign: 'center' }}
        >
          {l}
        </div>
      ))}
    </div>
  </Entra>
);

export const CenaContraste: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...roxo} halo={{ x: 790, y: 1000, cor: 'rgba(255,194,51,0.25)' }}>
    <Area style={{ justifyContent: 'flex-start' }}>
      <Palavras texto="Esperar o edital / ou começar *hoje?*" tamanho={96} fundoDestaque={ouro} corDestaque={cor.tinta} />
    </Area>
    <Em y={620}>
      <div style={{ display: 'flex', gap: 40 }}>
        <Coluna entra={falas[0].ini + 20} titulo="ESPERA O EDITAL" linhas={['Começa do zero', 'Pouco tempo', 'Muita matéria']} icone="icone-relogio" />
        <Coluna entra={falas[1].ini - 4} titulo="COMEÇA HOJE" linhas={['Meses de treino', 'Sem correria', 'Chega pronto']} icone="icone-coroa" bom />
      </div>
    </Em>
    <Efeito nome="pop" em={falas[1].ini - 4} volume={0.45} />
  </Fundo>
);

/* 4. O método: três telas em leque ------------------------------------ */
const leque = [
  { tela: 'real-acerto', rotulo: 'Questões no estilo da FAU', x: 250, giro: -9 },
  { tela: 'real-revisao', rotulo: 'Revisão do que errou', x: 540, giro: 0 },
  { tela: 'real-simulado', rotulo: 'Simulados no formato da prova', x: 830, giro: 9 },
];

export const CenaMetodo: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ultimo = leque.reduce((a, _, i) => (frame >= falas[i + 1].ini - 4 ? i : a), -1);
  return (
    <Fundo {...roxo} halo={{ x: 540, y: 1000, cor: 'rgba(255,194,51,0.2)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>Fuse Aprova</Rotulo>
        <div style={{ height: 18 }} />
        <Palavras texto="Minutos que viram / treino de *verdade*" tamanho={92} fundoDestaque={ouro} corDestaque={cor.tinta} />
      </Area>
      {leque.map((l, i) => {
        const p = spring({ frame: frame - falas[i + 1].ini + 4, fps, config: { damping: 14, stiffness: 120 } });
        const ativo = i === ultimo;
        return (
          <div
            key={l.tela}
            style={{
              position: 'absolute',
              left: l.x - 165,
              top: 660,
              zIndex: ativo ? 3 : i === 1 ? 2 : 1,
              transform: `translateY(${(1 - p) * 900}px) rotate(${l.giro}deg) scale(${ativo ? 1.08 : 0.96})`,
              opacity: p,
            }}
          >
            <Celular tela={l.tela} largura={330} />
          </div>
        );
      })}
      <Em y={1440}>
        <div style={{ height: 80, display: 'flex', alignItems: 'center' }}>
          {ultimo >= 0 ? (
            <Chip key={ultimo} fundo={cor.branco} texto={cor.tinta} tamanho={34} icone="icone-acerto">
              {leque[ultimo].rotulo}
            </Chip>
          ) : null}
        </div>
      </Em>
      {leque.map((l, i) => (
        <Efeito key={l.tela} nome="pop" em={falas[i + 1].ini - 4} volume={0.35} />
      ))}
    </Fundo>
  );
};

/* 5. Edital ------------------------------------------------------------- */
export const CenaEdital: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cel = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 110 } });
  return (
    <Fundo de="#2C1B8F" para="#14062F" manchas={[cor.turquesa, '#6D3FE0', ouro]}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>Quando o edital de Palmital sair</Rotulo>
        <div style={{ height: 18 }} />
        <Palavras texto="O app se ajusta / ao *seu cargo*" tamanho={100} fundoDestaque={ouro} corDestaque={cor.tinta} />
      </Area>
      <Em y={620}>
        <div style={{ transform: `translateY(${(1 - cel) * 700}px) rotate(${(1 - cel) * 8}deg)` }}>
          <Celular tela="real-edital" largura={440} />
        </div>
      </Em>
      <SeloBatida texto="SEM CUSTO ADICIONAL" em={falas[0].fim - 36} x={110} y={1420} />
    </Fundo>
  );
};

/* 6. Oferta editorial --------------------------------------------------- */
const itens = ['Todas as provas da FAU', 'Questões comentadas', 'Simulados ilimitados', 'Acesso até o dia da prova'];

export const CenaOferta: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  const preco = useMola(b.ini, { damping: 8, stiffness: 160 });
  return (
    <Fundo {...roxo} halo={{ x: 540, y: 700, cor: `rgba(255,194,51,${0.35 * Math.min(1, preco)})` }}>
      <Area style={{ justifyContent: 'flex-start', paddingTop: 270 }}>
        <Entra de="cima">
          <Chip fundo={ouro} texto={cor.tinta} icone="icone-coroa">
            Lançamento
          </Chip>
        </Entra>
        <div style={{ height: 26 }} />
        <Entra atraso={6}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.branco, lineHeight: 1, textAlign: 'center' }}>Acesso completo</div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 2, color: ouro, marginTop: 8 }}>
            CONCURSO PREFEITURA DE PALMITAL
          </div>
        </Entra>
        <div style={{ height: 18 }} />
        <PrecoAntigo entra={a.ini + 10} corta={a.fim - 12} corTexto="rgba(255,255,255,0.6)" />
        <div
          style={{
            transform: `scale(${interpolate(preco, [0, 1], [0.2, 1])})`,
            opacity: Math.min(1, preco * 2),
            display: 'flex',
            alignItems: 'flex-start',
            color: ouro,
            fontFamily: fonte.display,
            fontWeight: 800,
            lineHeight: 0.9,
            textShadow: `0 0 70px ${ouro}66`,
          }}
        >
          <span style={{ fontSize: 100, marginTop: 44, marginRight: 14 }}>R$</span>
          <span style={{ fontSize: 330, letterSpacing: -6 }}>197</span>
        </div>
        <Entra atraso={b.ini + 26}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 38, color: cor.branco }}>
            <Icone nome="icone-pix" tamanho={54} /> à vista no Pix · pagamento único
          </div>
        </Entra>
        <div style={{ height: 40 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 760 }}>
          {itens.map((t, i) => (
            <Entra key={t} atraso={b.ini + 34 + i * 6} de="esquerda" distancia={120}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  paddingBottom: 14,
                  borderBottom: '2px solid rgba(255,255,255,0.15)',
                  fontFamily: fonte.corpo,
                  fontWeight: 900,
                  fontSize: 38,
                  color: cor.branco,
                }}
              >
                <Icone nome="icone-acerto" tamanho={50} />
                {t}
              </div>
            </Entra>
          ))}
        </div>
      </Area>
      <Em y={1290}>
        <Capi pose="incentivando" altura={340} atraso={b.ini + 50} />
      </Em>
      <Efeito nome="ding" em={b.ini} volume={0.5} />
      <Confetes inicio={b.ini} cores={[ouro, cor.ouroVivo, cor.branco, cor.rosa]} />
    </Fundo>
  );
};

/* 7. Chamada ------------------------------------------------------------ */
export const CenaChamada: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  return (
    <Fundo {...roxo} halo={{ x: 540, y: 1000, cor: 'rgba(255,194,51,0.3)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Palavras texto="Sua vaga em Palmital: / a conta fecha / a seu *favor.*" tamanho={84} fundoDestaque={ouro} corDestaque={cor.tinta} />
      </Area>
      <Em y={690}>
        <div style={{ transform: `translate(${tremida(frame - 30) * 10}px, ${tremida(frame - 27) * 6}px)` }}>
          <Capi pose="celebrando" altura={620} atraso={8} />
        </div>
      </Em>
      <Carimbo em={24} y={990} />
      <Efeito nome="pop" em={24} volume={0.5} />
      <Brilhos
        atraso={14}
        pontos={[
          { x: 160, y: 700, t: 62, cor: ouro },
          { x: 880, y: 640, t: 46, cor: cor.branco },
        ]}
      />
      <AcaoBio em={falas[1].ini - 4} y={1350} texto="Garantir meu acesso" fundo={cor.verde} sombra={cor.verdeSombra} corBio={cor.roxoSombra} />
      <Confetes inicio={26} quantidade={60} cores={[ouro, cor.ouroVivo, cor.branco, cor.rosa]} />
      <Aviso />
    </Fundo>
  );
};

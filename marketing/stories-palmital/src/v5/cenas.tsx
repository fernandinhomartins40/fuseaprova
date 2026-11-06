import React from 'react';
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AcaoBio, Area, Aviso, Carimbo, Em, limita, PrecoAntigo, PropsCena, SeloBatida, Texto, tremida } from '../comum';
import { Brilhos, Capi, Celular, Chip, Confetes, Efeito, Entra, Fundo, Icone, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Comparativo, ItemVitrine, TelaVitrine, XPVoando } from '../v1/cenas';

// V5 · "Quer estudar para Palmital?" — convite em tons de pôr do sol; cada cena tem a sua cor

/* 1. Gancho ------------------------------------------------------------- */
const iconesGancho = [
  { nome: 'icone-portugues', x: 115, y: 1000, t: 150, giro: -10 },
  { nome: 'icone-matematica', x: 965, y: 950, t: 140, giro: 9 },
  { nome: 'icone-simulados', x: 125, y: 1410, t: 138, giro: 8 },
  { nome: 'icone-calendario', x: 955, y: 1360, t: 146, giro: -8 },
];

/** Ícones do app que surgem em volta da Capi, com brilho, flutuando devagar. */
const IconesEmVolta: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {iconesGancho.map((ic, i) => {
        const inicio = em + i * 5;
        return (
          <div
            key={ic.nome}
            style={{
              position: 'absolute',
              left: ic.x - ic.t / 2,
              top: ic.y + Math.sin(frame / 12 + i * 1.7) * 14,
              transform: `rotate(${ic.giro + Math.sin(frame / 16 + i) * 3}deg)`,
              filter: 'drop-shadow(0 0 34px rgba(255,255,255,0.65)) drop-shadow(0 14px 18px rgba(0,0,0,0.25))',
            }}
          >
            <Entra atraso={inicio} de="zoom">
              <Icone nome={ic.nome} tamanho={ic.t} />
            </Entra>
            <Efeito nome="pop" em={inicio} volume={0.22} />
          </div>
        );
      })}
    </>
  );
};

export const CenaGancho: React.FC<PropsCena> = ({ falas }) => (
  <Fundo de={cor.laranjaVivo} para="#D6336C" manchas={[cor.ouro, cor.rosa, cor.coral, cor.ouroVivo]} halo={{ x: 540, y: 1300, cor: 'rgba(255,255,255,0.34)' }}>
    <Area style={{ justifyContent: 'flex-start' }}>
      <Entra atraso={2} de="cima">
        <Chip icone="icone-localizacao">Concurso Palmital · PR</Chip>
      </Entra>
      <div style={{ height: 30 }} />
      <Palavras texto="Quer estudar para / o concurso da / *Prefeitura* / de *Palmital?*" atraso={8} passo={2} tamanho={102} />
    </Area>
    <Em y={860}>
      <Capi pose="boas-vindas" altura={760} atraso={14} />
    </Em>
    <IconesEmVolta em={falas[1].ini - 6} />
    <Brilhos
      atraso={22}
      pontos={[
        { x: 245, y: 925, t: 60, cor: cor.ouro },
        { x: 845, y: 1160, t: 46, cor: cor.branco },
        { x: 250, y: 1270, t: 40, cor: cor.ouro },
      ]}
    />
  </Fundo>
);

/* 2. Sair na frente: dois tempos, como nos outros vídeos ---------------- */
export const CenaAntes: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const troca = b.ini - 3;
  const len = b.fim - b.ini;
  const sai = interpolate(frame, [troca - 8, troca], [1, 0], limita);
  return (
    <Fundo de={cor.azul} para={cor.roxoNoite} manchas={[cor.roxo, cor.turquesa, cor.rosa]} halo={{ x: 540, y: 1250, cor: 'rgba(255,194,51,0.2)' }}>
      {frame < troca ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Em y={300}>
            <Capi pose="constancia" altura={620} atraso={a.ini - 8} />
          </Em>
          <Em y={960}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, width: 936 }}>
              <Rotulo atraso={4}>Fique sabendo</Rotulo>
              <Palavras texto="O *edital* ainda / não saiu." atraso={a.ini - 2} passo={2} tamanho={110} />
            </div>
          </Em>
        </AbsoluteFill>
      ) : (
        <Sequence from={troca} layout="none">
          <Area style={{ justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
              <Rotulo>O segredo de quem passa</Rotulo>
              <Palavras texto="Agora você / sai na *frente!*" tamanho={104} corDestaque={cor.branco} fundoDestaque={cor.laranjaVivo} />
              <div style={{ height: 8 }} />
              <Comparativo atraso={Math.round(len * 0.25)} rotulo="QUEM ESPERA O EDITAL" texto="Pouco tempo, muita matéria" icone="icone-relogio" />
              <Comparativo atraso={Math.round(len * 0.52)} rotulo="QUEM COMEÇA AGORA" texto="Meses de vantagem" icone="icone-calendario" bom />
            </div>
          </Area>
          <Em y={1080}>
            <Capi pose="estudando" altura={500} atraso={Math.round(len * 0.6)} />
          </Em>
          <Brilhos
            atraso={Math.round(len * 0.6)}
            pontos={[
              { x: 190, y: 1200, t: 56, cor: cor.ouro },
              { x: 890, y: 1320, t: 44, cor: cor.branco },
            ]}
          />
          <Efeito nome="pop" em={Math.round(len * 0.25)} volume={0.35} />
          <Efeito nome="ding" em={Math.round(len * 0.52)} volume={0.35} />
        </Sequence>
      )}
    </Fundo>
  );
};

/* 3. Vitrine das telas reais: cada fala tem cor, título e selo próprios -- */
const telas: TelaVitrine[] = [
  { tela: 'real-trilha', rotulo: '01 · Trilha', titulo: 'Tudo em ordem, / passo a passo', sub: 'Estude pelo celular, com o caminho pronto', selo: 'icone-alvo', de: cor.laranjaVivo, para: '#C2255C', manchas: [cor.ouro, cor.rosa] },
  { tela: 'real-acerto', rotulo: '02 · Questões', titulo: 'No estilo da / banca FAU', sub: 'Acertou ou errou, a explicação aparece na hora', selo: 'icone-acerto', de: '#12B886', para: cor.tealSombra, manchas: [cor.turquesa, cor.ouro] },
  { tela: 'real-revisao', rotulo: '03 · Revisão', titulo: 'O que você errou / volta para você', sub: 'Até aprender de vez', selo: 'icone-revisao', de: cor.rosa, para: cor.roxoNoite, manchas: [cor.coral, cor.roxo] },
  { tela: 'real-simulado', rotulo: '04 · Simulado', titulo: 'Igualzinho / à prova', sub: '40 questões · 4 horas · padrão FAU', selo: 'icone-simulados', de: cor.roxo, para: cor.azulNoite, manchas: [cor.rosa, cor.azul] },
];

export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const inicios = falas.map((f, i) => (i === 0 ? 0 : f.ini - 6));
  return (
    <Fundo de={cor.laranjaVivo} para={cor.laranja}>
      {telas.map((t, i) => {
        const dur = (inicios[i + 1] ?? duracao + 10) - inicios[i];
        return (
          <Sequence key={t.tela} from={inicios[i]} durationInFrames={dur + 18}>
            <ItemVitrine t={t} i={i} dur={i === telas.length - 1 ? dur + 30 : dur} />
            {i > 0 ? <Efeito nome="pop" em={4} volume={0.35} /> : null}
          </Sequence>
        );
      })}
      <XPVoando quando={[falas[1].ini + 40, falas[2].ini + 30]} />
    </Fundo>
  );
};

/* 4. O app se ajusta ao edital ------------------------------------------ */
const itensEdital = ['Seu cargo e as vagas', 'Trilha com o que cai', 'Simulados do seu cargo'];

export const CenaEdital: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a, b] = falas;
  const cel = spring({ frame: frame - 12, fps, config: { damping: 15, stiffness: 110 } });
  return (
    <Fundo de="#0EA5A0" para={cor.azulNoite} manchas={[cor.turquesa, cor.azul, cor.ouro]} halo={{ x: 790, y: 1050, cor: 'rgba(255,255,255,0.2)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo atraso={a.ini - 6}>Quando o edital sair</Rotulo>
        <div style={{ height: 22 }} />
        <Palavras texto="O app se ajusta / ao seu *cargo.*" atraso={a.ini} tamanho={104} />
      </Area>
      {/* tela real: o aviso de edital publicado */}
      <div style={{ position: 'absolute', left: 600, top: 600, transform: `translateX(${(1 - cel) * 600}px) rotate(${4 + (1 - cel) * 10}deg)` }}>
        <Celular tela="real-edital" largura={420} />
      </div>
      <div style={{ position: 'absolute', left: 56, top: 640, width: 520, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {itensEdital.map((item, i) => (
          <Entra key={item} atraso={a.ini + 34 + i * 14} de="esquerda" distancia={200}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: cor.branco, borderRadius: 26, padding: '20px 22px', boxShadow: '0 8px 0 rgba(0,0,0,0.18)' }}>
              <Icone nome="icone-acerto" tamanho={58} />
              <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, color: cor.tinta, lineHeight: 1.12 }}>{item}</div>
            </div>
          </Entra>
        ))}
      </div>
      <Em x={280} y={1000}>
        <Capi pose="explicando" altura={470} atraso={a.ini + 62} />
      </Em>
      <SeloBatida texto="SEM PAGAR A MAIS" em={b.ini} x={56} y={1500} tamanho={54} />
    </Fundo>
  );
};

/* 5. Oferta ------------------------------------------------------------- */
const beneficios = [
  { icone: 'icone-especificos', texto: 'Provas no estilo FAU' },
  { icone: 'icone-acerto', texto: 'Questões comentadas' },
  { icone: 'icone-simulados', texto: 'Simulados ilimitados' },
  { icone: 'icone-relogio', texto: 'Acesso até o dia da prova' },
];

export const CenaOferta: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  // "cento e noventa e sete" começa perto de 58% da fala
  const revela = a.ini + Math.round((a.fim - a.ini) * 0.58);
  const preco = useMola(revela, { damping: 8, stiffness: 160 });
  const pulso = frame > b.fim ? 1 + Math.max(0, Math.sin((frame - b.fim) / 6)) * 0.03 : 1;
  const luz = interpolate(frame, [revela, revela + 20], [0, 1], limita);
  const economia = useMola(revela + 16, { damping: 9, stiffness: 170 });
  return (
    <Fundo
      de={cor.branco}
      para="#FFE8D6"
      claro
      manchas={['rgba(255,194,51,0.6)', 'rgba(236,72,153,0.25)', 'rgba(255,106,31,0.3)', 'rgba(34,195,181,0.25)']}
      halo={{ x: 540, y: 700, cor: `rgba(255,194,51,${0.5 * luz})` }}
    >
      <Area style={{ justifyContent: 'flex-start', paddingTop: 270 }}>
        <Entra de="cima">
          <Chip fundo={cor.laranja} icone="icone-coroa">
            Condição de lançamento
          </Chip>
        </Entra>
        <div style={{ height: 26 }} />
        <Entra atraso={6}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 58, color: cor.tinta, lineHeight: 1, whiteSpace: 'nowrap' }}>
            Acesso completo ao Fuse Aprova
          </div>
        </Entra>
        <div style={{ height: 18 }} />
        <PrecoAntigo entra={a.ini + 14} corta={revela - 10} />
        <div
          style={{
            transform: `scale(${interpolate(preco, [0, 1], [0.2, 1]) * pulso})`,
            opacity: Math.min(1, preco * 2),
            display: 'flex',
            alignItems: 'flex-start',
            color: cor.verde,
            fontFamily: fonte.display,
            fontWeight: 800,
            lineHeight: 0.9,
            marginTop: 4,
            textShadow: '0 10px 30px rgba(21,128,61,0.25)',
          }}
        >
          <span style={{ fontSize: 60, marginTop: 58, color: cor.tinta }}>por&nbsp;</span>
          <span style={{ fontSize: 96, marginTop: 40, marginRight: 14 }}>R$</span>
          <span style={{ fontSize: 300, letterSpacing: -4 }}>197</span>
        </div>
        <Entra atraso={b.ini - 2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 38, color: cor.tinta }}>
            <Icone nome="icone-pix" tamanho={56} /> à vista no Pix · pagamento único
          </div>
        </Entra>
        <div style={{ height: 30 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, width: '100%' }}>
          {beneficios.map((item, i) => (
            <Entra key={item.texto} atraso={revela + 24 + i * 6} de="zoom">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: cor.branco,
                  border: '4px solid #E5E7EB',
                  boxShadow: '0 6px 0 #E5E7EB',
                  borderRadius: 26,
                  padding: '16px 18px',
                  fontFamily: fonte.corpo,
                  fontWeight: 900,
                  fontSize: 33,
                  color: cor.tinta,
                  lineHeight: 1.15,
                  height: 132,
                }}
              >
                <Icone nome={item.icone} tamanho={70} />
                {item.texto}
              </div>
            </Entra>
          ))}
        </div>
      </Area>
      <div
        style={{
          position: 'absolute',
          left: 830,
          top: 455,
          transform: `scale(${economia}) rotate(${10 + Math.sin(frame / 10) * 3}deg)`,
          width: 168,
          height: 168,
          borderRadius: '50%',
          background: cor.coral,
          boxShadow: '0 10px 0 #B8262B, 0 0 40px rgba(240,72,77,0.45)',
          color: cor.branco,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonte.display,
          fontWeight: 800,
          lineHeight: 0.95,
        }}
      >
        <span style={{ fontSize: 19, fontFamily: fonte.corpo, fontWeight: 900, letterSpacing: 1 }}>ECONOMIZE</span>
        <span style={{ fontSize: 46 }}>R$ 200</span>
      </div>
      <Em y={1240}>
        <Capi pose="incentivando" altura={480} atraso={revela + 44} />
      </Em>
      <Efeito nome="ding" em={revela} volume={0.5} />
      <Confetes inicio={revela} />
    </Fundo>
  );
};

/* 6. Chamada final ------------------------------------------------------ */
export const CenaChamada: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  return (
    <Fundo de={cor.rosa} para={cor.laranjaVivo} manchas={[cor.roxo, cor.ouro, cor.coral, cor.azul]} halo={{ x: 540, y: 1000, cor: 'rgba(255,255,255,0.3)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>Concurso Prefeitura de Palmital</Rotulo>
        <div style={{ height: 24 }} />
        <Palavras texto="Quer estudar / para *Palmital?*" atraso={4} passo={2} tamanho={112} />
        <div style={{ height: 22 }} />
        <Entra atraso={24}>
          <Texto tamanho={42}>Quem se prepara antes chega mais longe.</Texto>
        </Entra>
      </Area>
      <Em y={670}>
        <div style={{ transform: `translate(${tremida(frame - 40) * 10}px, ${tremida(frame - 37) * 6}px)` }}>
          <Capi pose="celebrando" altura={650} atraso={12} />
        </div>
      </Em>
      <Carimbo em={34} />
      <Efeito nome="pop" em={34} volume={0.5} />
      <Brilhos
        atraso={20}
        pontos={[
          { x: 170, y: 720, t: 66, cor: cor.ouro },
          { x: 200, y: 1180, t: 46, cor: cor.branco },
          { x: 880, y: 1150, t: 54, cor: cor.ouro },
        ]}
      />
      <AcaoBio em={falas[1].ini - 4} y={1350} texto="Quero começar hoje" fundo={cor.teal} sombra={cor.tealSombra} corBio={cor.laranja} />
      <Confetes inicio={28} quantidade={70} />
      <Aviso />
    </Fundo>
  );
};

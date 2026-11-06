import React from 'react';
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Area, Carimbo, Em, limita, PropsCena, Texto, tremida } from '../comum';
import { Botao3D, Brilhos, Capi, Celular, Chip, Confetes, Efeito, Entra, Fundo, Icone, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte, SEGURO_BASE, SEGURO_TOPO } from '../tema';

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = () => (
  <Fundo
    de={cor.laranjaVivo}
    para={cor.coral}
    manchas={[cor.ouro, cor.rosa, cor.roxo, cor.ouroVivo]}
    halo={{ x: 540, y: 1400, cor: 'rgba(255,255,255,0.32)' }}
  >
    <Area style={{ justifyContent: 'flex-start' }}>
      <Entra atraso={2} de="cima">
        <Chip icone="icone-localizacao">Concurso Palmital · PR</Chip>
      </Entra>
      <div style={{ height: 44 }} />
      <Palavras texto="Quer trabalhar / na *Prefeitura* / de *Palmital?*" atraso={6} tamanho={120} />
      <div style={{ height: 30 }} />
      <Entra atraso={30}>
        <Texto tamanho={44} corTexto="rgba(255,255,255,0.92)">
          O próximo concurso já está a caminho.
        </Texto>
      </Entra>
    </Area>
    <Em y={960}>
      <Capi pose="boas-vindas" altura={880} atraso={16} />
    </Em>
    <Brilhos
      atraso={22}
      pontos={[
        { x: 150, y: 1060, t: 76, cor: cor.ouro },
        { x: 870, y: 1010, t: 58, cor: cor.branco },
        { x: 900, y: 1420, t: 46, cor: cor.ouro },
        { x: 110, y: 1500, t: 42, cor: cor.branco },
      ]}
    />
  </Fundo>
);

/* 2. O edital ainda não saiu ------------------------------------------ */
export const Comparativo: React.FC<{ atraso: number; rotulo: string; texto: string; icone: string; bom?: boolean }> = ({
  atraso,
  rotulo,
  texto,
  icone,
  bom,
}) => (
  <Entra atraso={atraso} de={bom ? 'direita' : 'esquerda'} distancia={240}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        width: 900,
        padding: '30px 36px',
        borderRadius: 32,
        background: bom ? cor.verde : 'rgba(255,255,255,0.08)',
        border: bom ? 'none' : '3px solid rgba(255,255,255,0.18)',
        boxShadow: bom ? `0 10px 0 ${cor.verdeSombra}, 0 0 60px rgba(34,197,94,0.45)` : 'none',
        transform: bom ? 'scale(1.04)' : 'none',
      }}
    >
      <div
        style={{
          width: 116,
          height: 116,
          borderRadius: 30,
          background: bom ? cor.branco : 'rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          filter: bom ? 'none' : 'grayscale(1)',
          opacity: bom ? 1 : 0.7,
        }}
      >
        <Icone nome={icone} tamanho={86} />
      </div>
      <div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 4, color: bom ? cor.ouro : 'rgba(255,255,255,0.55)' }}>
          {rotulo}
        </div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, lineHeight: 1.05, color: bom ? cor.branco : 'rgba(255,255,255,0.7)' }}>
          {texto}
        </div>
      </div>
    </div>
  </Entra>
);

export const CenaEdital: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const troca = falas[1].ini - 3;
  const len = falas[1].fim - falas[1].ini;
  const sai = interpolate(frame, [troca - 8, troca], [1, 0], limita);
  return (
    <Fundo de={cor.azul} para={cor.roxoNoite} manchas={[cor.roxo, cor.turquesa, cor.rosa]}>
      {frame < troca ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Em y={300}>
            <Capi pose="constancia" altura={620} />
          </Em>
          <Em y={950}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, width: 936 }}>
              <Rotulo atraso={6}>Fique sabendo</Rotulo>
              <Palavras texto="O *edital* ainda não / foi publicado." atraso={8} tamanho={100} />
              <Entra atraso={28}>
                <Texto corTexto="rgba(255,255,255,0.8)">A FAU-Unicentro já foi contratada<br />para organizar o concurso.</Texto>
              </Entra>
            </div>
          </Em>
        </AbsoluteFill>
      ) : (
        <Sequence from={troca} layout="none">
          <Area style={{ justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 }}>
              <Rotulo>O segredo de quem passa</Rotulo>
              <Palavras texto="Comece *antes* / do edital." tamanho={116} corDestaque={cor.branco} fundoDestaque={cor.laranjaVivo} />
              <div style={{ height: 30 }} />
              <Comparativo atraso={Math.round(len * 0.4)} rotulo="DEPOIS DO EDITAL" texto="Pouco tempo, muita matéria" icone="icone-relogio" />
              <Comparativo atraso={Math.round(len * 0.72)} rotulo="ANTES DO EDITAL" texto="Meses de vantagem" icone="icone-calendario" bom />
            </div>
          </Area>
        </Sequence>
      )}
    </Fundo>
  );
};

/* 3. Problema → solução ------------------------------------------------ */
const velhos = [
  { icone: 'icone-portugues', texto: 'Apostilas enormes' },
  { icone: 'icone-relogio', texto: 'Horas e horas na cadeira' },
];

/** Cartão que é "descartado": entra, recebe um selo ✕ e fica apagado. */
const Descartado: React.FC<{ icone: string; texto: string; entra: number; descarta: number }> = ({ icone, texto, entra, descarta }) => {
  const frame = useCurrentFrame();
  const x = useMola(descarta, { damping: 9, stiffness: 220 });
  const apaga = interpolate(frame, [descarta, descarta + 10], [0, 1], limita);
  return (
    <Entra atraso={entra} de="baixo" distancia={60}>
      <div style={{ position: 'relative', transform: `scale(${1 - apaga * 0.05}) rotate(${apaga * -1.5}deg)` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            width: 880,
            padding: '28px 34px',
            borderRadius: 32,
            background: cor.branco,
            boxShadow: '0 10px 0 rgba(45,47,54,0.08), 0 20px 40px rgba(45,47,54,0.08)',
            filter: `grayscale(${apaga})`,
            opacity: 1 - apaga * 0.45,
          }}
        >
          <Icone nome={icone} tamanho={96} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.tinta, lineHeight: 1.05 }}>{texto}</div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: -26,
            top: -26,
            width: 96,
            height: 96,
            borderRadius: 48,
            background: cor.coral,
            boxShadow: `0 6px 0 #B8262B, 0 0 30px rgba(240,72,77,0.5)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${x}) rotate(${(1 - x) * -90}deg)`,
          }}
        >
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </div>
      </div>
    </Entra>
  );
};

const situacoes = [
  { icone: 'icone-calendario', texto: 'No café da manhã' },
  { icone: 'icone-relogio', texto: 'Na pausa do trabalho' },
  { icone: 'icone-calendario', texto: 'Antes de dormir' },
];

export const CenaSolucao: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const troca = falas[1].ini - 3;
  const len = falas[1].fim - falas[1].ini;
  const len0 = falas[0].fim - falas[0].ini;
  const someVelho = interpolate(frame, [troca - 8, troca], [1, 0], limita);
  return (
    <Fundo
      de={cor.creme}
      para="#FFE6D1"
      claro
      manchas={['rgba(255,194,51,0.55)', 'rgba(34,195,181,0.35)', 'rgba(236,72,153,0.28)', 'rgba(139,92,246,0.25)']}
    >
      {frame < troca ? (
        <Area style={{ justifyContent: 'center', opacity: someVelho }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>
            <Rotulo corTexto={cor.muted}>Você não precisa de</Rotulo>
            {velhos.map((v, i) => {
              const descarta = falas[0].ini + Math.round(len0 * (0.35 + i * 0.35));
              return (
                <React.Fragment key={v.texto}>
                  <Descartado icone={v.icone} texto={v.texto} entra={6 + i * 10} descarta={descarta} />
                  <Efeito nome="pop" em={descarta} volume={0.45} />
                </React.Fragment>
              );
            })}
          </div>
        </Area>
      ) : (
        <Sequence from={troca} layout="none">
          <Area style={{ justifyContent: 'flex-start' }}>
            <div style={{ position: 'relative' }}>
              <Entra de="zoom">
                <Img src={staticFile('img/logo-completa.webp')} style={{ width: 600, display: 'block' }} />
              </Entra>
              <Brilhos
                atraso={8}
                pontos={[
                  { x: -70, y: -10, t: 58, cor: cor.ouro },
                  { x: 600, y: 0, t: 46, cor: cor.turquesa },
                  { x: 570, y: 210, t: 36, cor: cor.rosa },
                ]}
              />
            </div>
            <div style={{ height: 34 }} />
            <Palavras
              texto="Estude pelo celular / em *15 minutos* por dia."
              atraso={10}
              tamanho={84}
              corTexto={cor.tinta}
              fundoDestaque={cor.laranja}
              corDestaque={cor.branco}
            />
            <div style={{ height: 30 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, width: 900 }}>
              {situacoes.map((sit, i) => (
                <Entra key={sit.texto} atraso={Math.round(len * 0.55) + i * 7} de="zoom">
                  <Chip fundo={cor.branco} texto={cor.tinta} tamanho={30} icone={sit.icone}>
                    {sit.texto}
                  </Chip>
                </Entra>
              ))}
            </div>
          </Area>
          <Em y={1090}>
            <Capi pose="estudando" altura={560} atraso={14} />
          </Em>
        </Sequence>
      )}
    </Fundo>
  );
};

/* 4. Vitrine das telas reais ------------------------------------------- */
const telas = [
  { tela: 'real-trilha', rotulo: '01 · Trilha', titulo: 'Conteúdo em ordem, / passo a passo', sub: 'Português, Matemática, Conhecimentos Gerais e o específico do seu cargo', selo: 'icone-alvo', de: cor.laranjaVivo, para: cor.laranja, manchas: [cor.ouro, cor.coral] },
  { tela: 'real-acerto', rotulo: '02 · Questões', titulo: 'No estilo da / banca FAU', sub: 'Acertou ou errou, a explicação aparece na hora', selo: 'icone-acerto', de: '#22C55E', para: cor.verdeSombra, manchas: [cor.turquesa, cor.ouro] },
  { tela: 'real-ofensiva', rotulo: '03 · Constância', titulo: 'Um pouco / todo dia', sub: 'A ofensiva conta quantos dias seguidos você estudou', selo: 'elemento-faisca', de: '#FF8A00', para: cor.coral, manchas: [cor.ouro, cor.rosa] },
  { tela: 'real-revisao', rotulo: '04 · Revisão', titulo: 'O que você / errou volta', sub: 'No momento certo, para fixar de vez', selo: 'icone-revisao', de: '#3B8BFF', para: cor.azulNoite, manchas: [cor.turquesa, cor.roxo] },
  { tela: 'real-simulado', rotulo: '05 · Simulado', titulo: 'Treine como no / dia da prova', sub: '40 questões · 4 horas · padrão FAU', selo: 'icone-simulados', de: cor.roxo, para: cor.roxoNoite, manchas: [cor.rosa, cor.azul] },
  { tela: 'real-liga', rotulo: '06 · Liga', titulo: 'Ranking / de Palmital', sub: 'Compare sua evolução com quem também estuda', selo: 'icone-liga', de: cor.ouroVivo, para: '#E0661A', manchas: [cor.coral, '#FFE27A'] },
];

/** Selo do recurso sobre o celular: grande, com halo pulsante e brilhos. */
export const SeloRecurso: React.FC<{ icone: string; lado: number; sai: number }> = ({ icone, lado, sai }) => {
  const frame = useCurrentFrame();
  const p = useMola(10, { damping: 9, stiffness: 170 });
  const pulso = 1 + Math.sin(frame / 7) * 0.04;
  const halo = 0.5 + 0.5 * Math.sin(frame / 7);
  return (
    <div
      style={{
        position: 'absolute',
        left: lado < 0 ? 40 : 800,
        top: 780,
        width: 240,
        height: 240,
        opacity: 1 - sai,
        transform: `scale(${p * pulso}) rotate(${lado * 8 + Math.sin(frame / 9) * 3}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -40,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,255,255,${0.55 + halo * 0.25}) 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 64,
          background: 'linear-gradient(160deg, #FFFFFF 0%, #FFF4E6 100%)',
          border: '6px solid rgba(255,255,255,0.9)',
          boxShadow: '0 14px 0 rgba(0,0,0,0.18), 0 0 0 10px rgba(255,255,255,0.28), 0 30px 60px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icone nome={icone} tamanho={180} style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.2))' }} />
      </div>
      <Brilhos
        atraso={14}
        pontos={[
          { x: -30, y: -34, t: 52, cor: cor.branco },
          { x: 210, y: 190, t: 40, cor: cor.ouro },
        ]}
      />
    </div>
  );
};

export type TelaVitrine = (typeof telas)[number];

/** Uma tela da vitrine: fundo próprio revelado em círculo, título, celular e selo. */
export const ItemVitrine: React.FC<{ t: TelaVitrine; i: number; dur: number }> = ({ t, i, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const sai = spring({ frame: frame - (dur - 10), fps, config: { damping: 200 } });
  const x = (1 - entra) * 900 - sai * 900;
  const giro = (1 - entra) * 14 - sai * 14;
  const lado = i % 2 ? 1 : -1;
  const revela = i === 0 ? 1 : spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `circle(${revela * 140}% at ${lado < 0 ? 15 : 85}% 55%)` }}>
        <Fundo de={t.de} para={t.para} manchas={t.manchas} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 64%, rgba(255,255,255,0.35) 0%, transparent 38%)' }} />
      <AbsoluteFill style={{ paddingTop: SEGURO_TOPO - 20, alignItems: 'center', paddingLeft: 60, paddingRight: 60 }}>
        <div style={{ opacity: 1 - sai, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Rotulo>{t.rotulo}</Rotulo>
          <Palavras texto={t.titulo} tamanho={80} passo={2} />
          <Entra atraso={8} distancia={30}>
            <Texto tamanho={34} corTexto="rgba(255,255,255,0.92)" style={{ maxWidth: 860 }}>
              {t.sub}
            </Texto>
          </Entra>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ top: 680, alignItems: 'center' }}>
        <div style={{ transform: `translateX(${x}px) rotate(${giro}deg)` }}>
          <Celular tela={t.tela} largura={500} />
        </div>
      </AbsoluteFill>
      <SeloRecurso icone={t.selo} lado={lado} sai={sai} />
    </AbsoluteFill>
  );
};

export const CenaVitrine: React.FC<PropsCena> = ({ falas, duracao }) => {
  // cada tela entra um pouco antes da sua fala e fica até a próxima entrar
  const inicios = falas.map((f, i) => (i === 0 ? 0 : f.ini - 6));
  return (
    <Fundo de={cor.laranjaVivo} para={cor.laranja}>
      {telas.map((_, i) => {
        const dur = (inicios[i + 1] ?? duracao + 10) - inicios[i];
        return (
          <Sequence key={i} from={inicios[i]} durationInFrames={dur + 18}>
            <ItemVitrine t={telas[i]} i={i} dur={i === telas.length - 1 ? dur + 30 : dur} />
            {i > 0 ? <Efeito nome="pop" em={4} volume={0.35} /> : null}
          </Sequence>
        );
      })}
      <XPVoando quando={[falas[1].ini + 30, falas[2].ini + 14, falas[4].ini + 20]} />
    </Fundo>
  );
};

export const XPVoando: React.FC<{ quando: number[] }> = ({ quando }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {quando.map((ini, i) => {
        const f = frame - ini;
        if (f < 0 || f > 34) return null;
        const y = interpolate(f, [0, 34], [1300, 1060]);
        const op = interpolate(f, [0, 6, 26, 34], [0, 1, 1, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: i % 2 ? 90 : 760,
              top: y,
              opacity: op,
              background: cor.ouro,
              color: cor.ouroTinta,
              fontFamily: fonte.display,
              fontWeight: 800,
              fontSize: 58,
              padding: '6px 30px',
              borderRadius: 24,
              boxShadow: `0 8px 0 ${cor.ouroSombra}, 0 0 40px rgba(255,194,51,0.6)`,
            }}
          >
            +10 XP
          </div>
        );
      })}
    </>
  );
};

/* 5. O app se adapta ao edital ---------------------------------------- */
const itensEdital = ['Seu cargo e as vagas', 'Trilha com o que cai', 'Simulados oficiais', 'Contagem regressiva'];

export const CenaAdapta: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const selo = useMola(falas[2].ini - 2, { damping: 9, stiffness: 180 });
  const cel = spring({ frame: frame - falas[1].ini + 6, fps, config: { damping: 15, stiffness: 110 } });
  return (
    <Fundo de={cor.teal} para={cor.azulNoite} manchas={[cor.turquesa, cor.azul, cor.ouro]}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo atraso={falas[0].ini - 4}>Quando o edital sair</Rotulo>
        <div style={{ height: 22 }} />
        <Palavras texto="O app se ajusta / ao *seu* edital." atraso={falas[0].ini} tamanho={104} />
      </Area>
      {/* tela real: o aviso de edital publicado */}
      <div style={{ position: 'absolute', left: 600, top: 600, transform: `translateX(${(1 - cel) * 600}px) rotate(${4 + (1 - cel) * 10}deg)` }}>
        <Celular tela="real-edital" largura={420} />
      </div>
      <div style={{ position: 'absolute', left: 56, top: 640, width: 520, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {itensEdital.map((item, i) => (
          <Entra key={item} atraso={falas[1].ini + 16 + i * 14} de="esquerda" distancia={200}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                background: cor.branco,
                borderRadius: 26,
                padding: '20px 22px',
                boxShadow: '0 8px 0 rgba(0,0,0,0.18)',
              }}
            >
              <Icone nome="icone-acerto" tamanho={58} />
              <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, color: cor.tinta, lineHeight: 1.12 }}>{item}</div>
            </div>
          </Entra>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 56,
          top: 1170,
          transform: `scale(${interpolate(selo, [0, 1], [2.4, 1])}) rotate(${interpolate(selo, [0, 1], [-14, -4])}deg)`,
          transformOrigin: '0 50%',
          opacity: Math.min(1, selo * 3),
        }}
      >
        <div
          style={{
            background: cor.ouro,
            color: cor.tinta,
            fontFamily: fonte.display,
            fontWeight: 800,
            fontSize: 52,
            lineHeight: 1,
            padding: '16px 34px',
            borderRadius: 24,
            boxShadow: `0 10px 0 ${cor.ouroSombra}, 0 0 50px rgba(255,194,51,0.55)`,
            whiteSpace: 'nowrap',
          }}
        >
          SEM CUSTO ADICIONAL
        </div>
      </div>
      <Efeito nome="pop" em={falas[2].ini - 2} volume={0.6} />
      <Em x={250} y={1290}>
        <Capi pose="explicando" altura={460} atraso={falas[1].ini + 10} />
      </Em>
    </Fundo>
  );
};

/* 6. Oferta ------------------------------------------------------------- */
const beneficios = [
  { icone: 'icone-especificos', texto: 'Todas as provas da FAU' },
  { icone: 'icone-acerto', texto: 'Questões comentadas' },
  { icone: 'icone-simulados', texto: 'Simulados ilimitados' },
  { icone: 'icone-relogio', texto: 'Acesso até o dia da prova' },
];

export const CenaOferta: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b, c] = falas;
  const corte = interpolate(frame, [a.fim - 14, a.fim - 2], [0, 1], limita);
  const preco = useMola(b.ini, { damping: 8, stiffness: 160 });
  const pulso = 1 + Math.max(0, Math.sin((frame - b.fim) / 6)) * 0.03 * (frame > b.fim ? 1 : 0);
  const luz = interpolate(frame, [b.ini, b.ini + 20], [0, 1], limita);
  const economia = useMola(b.ini + 16, { damping: 9, stiffness: 170 });
  return (
    <Fundo
      de={cor.branco}
      para="#FFF3D6"
      claro
      manchas={['rgba(255,194,51,0.6)', 'rgba(34,195,181,0.3)', 'rgba(236,72,153,0.25)', 'rgba(255,106,31,0.3)']}
      halo={{ x: 540, y: 700, cor: `rgba(255,194,51,${0.5 * luz})` }}
    >
      <Area style={{ justifyContent: 'flex-start', paddingTop: 270 }}>
        <Entra de="cima">
          <Chip fundo={cor.laranja} icone="icone-coroa">
            Condição de lançamento
          </Chip>
        </Entra>
        <div style={{ height: 30 }} />
        <Entra atraso={8}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 58, color: cor.tinta, lineHeight: 1, whiteSpace: 'nowrap' }}>
            Acesso completo ao Fuse Aprova
          </div>
        </Entra>
        <div style={{ height: 22 }} />
        <Entra atraso={a.ini + 14}>
          <div style={{ position: 'relative', fontFamily: fonte.display, fontWeight: 700, fontSize: 80, color: cor.muted, opacity: 1 - corte * 0.35 }}>
            de R$ 397
            <div
              style={{
                position: 'absolute',
                left: -8,
                right: -8,
                top: '50%',
                height: 8,
                marginTop: -4,
                background: cor.coral,
                borderRadius: 4,
                transformOrigin: 'left',
                transform: `scaleX(${corte})`,
              }}
            />
          </div>
        </Entra>
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
        <Entra atraso={b.ini + 34}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 38, color: cor.tinta }}>
            <Icone nome="icone-pix" tamanho={56} /> à vista no Pix · pagamento único
          </div>
        </Entra>
        <div style={{ height: 34 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, width: '100%' }}>
          {beneficios.map((item, i) => (
            <Entra key={item.texto} atraso={b.ini + 40 + i * 6} de="zoom">
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
          boxShadow: `0 10px 0 #B8262B, 0 0 40px rgba(240,72,77,0.45)`,
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
      <Em y={1275}>
        <Capi pose="incentivando" altura={430} atraso={b.ini + 56} />
      </Em>
      <Efeito nome="ding" em={b.ini} volume={0.5} />
      <Confetes inicio={b.ini} />
    </Fundo>
  );
};

/* 7. Chamada final ----------------------------------------------------- */
export const CenaChamada: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const botao = falas[1].ini - 4;
  const aperta = frame > botao + 20 ? Math.max(0, Math.sin((frame - botao - 20) / 5)) ** 4 : 0;
  const pulsoBio = 1 + Math.max(0, Math.sin((frame - botao) / 6)) * 0.05;
  return (
    <Fundo
      de={cor.roxo}
      para={cor.laranjaVivo}
      manchas={[cor.rosa, cor.ouro, cor.coral, cor.azul]}
      halo={{ x: 540, y: 1000, cor: 'rgba(255,255,255,0.3)' }}
    >
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>Concurso Prefeitura de Palmital</Rotulo>
        <div style={{ height: 24 }} />
        <Palavras texto="Sua aprovação / começa *hoje.*" atraso={4} tamanho={112} />
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
      <Em y={1350}>
        <Efeito nome="pop" em={botao} volume={0.5} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
          <Entra atraso={botao} de="zoom">
            <Botao3D tamanho={48} apertado={aperta}>
              Garantir meu acesso
            </Botao3D>
          </Entra>
          <Entra atraso={botao + 10}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 30px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.95)',
                color: cor.roxoSombra,
                fontFamily: fonte.corpo,
                fontWeight: 900,
                fontSize: 38,
                letterSpacing: 1,
                transform: `scale(${pulsoBio})`,
                boxShadow: '0 8px 0 rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={cor.roxoSombra} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
              </svg>
              Link na bio
            </div>
          </Entra>
        </div>
      </Em>
      <Confetes inicio={28} quantidade={70} />
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: SEGURO_BASE - 110 }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.8)', textAlign: 'center', padding: '0 80px' }}>
          Fuse Aprova não tem vínculo com a FAU-Unicentro nem com a Prefeitura de Palmital.
        </div>
      </AbsoluteFill>
    </Fundo>
  );
};

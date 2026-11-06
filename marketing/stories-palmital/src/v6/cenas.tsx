import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { AcaoBio, Area, Aviso, Carimbo, Em, limita, PropsCena, SeloBatida, Texto, tremida } from '../comum';
import { Brilhos, Capi, Celular, Chip, Confetes, Efeito, Entra, Fundo, Icone, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Comparativo, ItemVitrine, TelaVitrine, XPVoando } from '../v1/cenas';

// V6 · "Estude agora" — tutorial do app; azul e turquesa com dourado
const ceu = { de: cor.azul, para: '#0B6E6A', manchas: [cor.turquesa, cor.ouro, cor.roxo] };

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...ceu} halo={{ x: 540, y: 1300, cor: 'rgba(255,255,255,0.3)' }}>
    <Area style={{ justifyContent: 'flex-start' }}>
      <Entra atraso={2} de="cima">
        <Chip icone="icone-localizacao">Concurso Palmital · PR</Chip>
      </Entra>
      <div style={{ height: 30 }} />
      <Palavras texto="Estude *agora* para o / concurso da Prefeitura / de *Palmital!*" atraso={8} passo={2} tamanho={96} />
      <div style={{ height: 24 }} />
      <Entra atraso={falas[1].ini - 2} de="zoom">
        <Chip fundo={cor.ouro} texto={cor.tinta} icone="icone-dica">
          Passo a passo no app
        </Chip>
      </Entra>
    </Area>
    <Em y={930}>
      <Capi pose="boas-vindas" altura={760} atraso={14} />
    </Em>
    <Brilhos
      atraso={20}
      pontos={[
        { x: 170, y: 1010, t: 66, cor: cor.ouro },
        { x: 880, y: 1080, t: 50, cor: cor.branco },
        { x: 200, y: 1420, t: 42, cor: cor.branco },
      ]}
    />
    <Efeito nome="pop" em={falas[1].ini - 2} volume={0.35} />
  </Fundo>
);

/* 2. Por que questões da FAU ------------------------------------------- */
const disciplinas = [
  { icone: 'icone-portugues', nome: 'Português' },
  { icone: 'icone-matematica', nome: 'Matemática' },
  { icone: 'icone-gerais', nome: 'Conhecimentos Gerais' },
];

/** Cartão de "prova anterior": cabeçalho da banca, disciplina e linhas de questão (sem texto inventado). */
const CartaoProva: React.FC<{ i: number; entra: number; icone: string; nome: string }> = ({ i, entra, icone, nome }) => {
  const p = useMola(entra, { damping: 13, stiffness: 140 });
  const giro = (i - 1) * 7;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 - 250 + (i - 1) * 190,
        top: 700 + Math.abs(i - 1) * 40,
        width: 500,
        padding: '28px 30px',
        borderRadius: 30,
        background: cor.branco,
        boxShadow: '0 12px 0 rgba(0,0,0,0.12), 0 30px 60px rgba(0,0,0,0.25)',
        transform: `translateY(${(1 - p) * 700}px) rotate(${giro * p}deg)`,
        opacity: Math.min(1, p * 2),
        zIndex: i === 1 ? 2 : 1,
      }}
    >
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, letterSpacing: 3, color: cor.teal }}>PROVA ANTERIOR · BANCA FAU</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
        <Icone nome={icone} tamanho={70} />
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 40, color: cor.tinta, lineHeight: 1.05 }}>{nome}</div>
      </div>
      {[0.95, 0.8, 0.88, 0.6].map((w, k) => (
        <div key={k} style={{ height: 14, width: `${w * 100}%`, borderRadius: 7, background: '#E9ECEF', marginTop: k ? 12 : 22 }} />
      ))}
      <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
        {['A', 'B', 'C', 'D'].map((l) => (
          <div
            key={l}
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              border: '4px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonte.corpo,
              fontWeight: 900,
              fontSize: 26,
              color: cor.muted,
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CenaFau: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b, c] = falas;
  const banca = useMola(a.ini + 20, { damping: 9, stiffness: 180 });
  const conta = Math.round(interpolate(frame, [b.ini + 30, b.ini + 75], [0, 10000], { ...limita, easing: (t) => 1 - (1 - t) ** 3 }));
  return (
    <Fundo de="#0EA5A0" para={cor.azulNoite} manchas={[cor.turquesa, cor.azul, cor.ouro]} halo={{ x: 540, y: 1000, cor: 'rgba(255,255,255,0.2)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo atraso={a.ini - 6}>Quem organiza o concurso</Rotulo>
        <div style={{ height: 24 }} />
        <div
          style={{
            transform: `scale(${interpolate(banca, [0, 1], [2.2, 1])}) rotate(${interpolate(banca, [0, 1], [-10, -3])}deg)`,
            opacity: Math.min(1, banca * 3),
            background: cor.ouro,
            color: cor.tinta,
            fontFamily: fonte.display,
            fontWeight: 800,
            fontSize: 104,
            lineHeight: 1,
            padding: '18px 48px',
            borderRadius: 32,
            boxShadow: `0 12px 0 ${cor.ouroSombra}, 0 0 60px rgba(255,194,51,0.5)`,
          }}
        >
          Banca FAU
        </div>
        <div style={{ height: 30 }} />
        <Entra atraso={b.ini + 26}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: cor.branco, lineHeight: 1, textAlign: 'center' }}>
            {conta.toLocaleString('pt-BR')}+ questões
          </div>
          <Texto tamanho={36} corTexto="rgba(255,255,255,0.88)">
            de provas anteriores no app
          </Texto>
        </Entra>
      </Area>
      {disciplinas.map((d, i) => (
        <CartaoProva key={d.nome} i={i} entra={a.ini + 34 + i * 6} icone={d.icone} nome={d.nome} />
      ))}
      <Em x={240} y={1150}>
        <Capi pose="explicando" altura={440} atraso={a.ini + 24} />
      </Em>
      {frame >= c.ini ? <SeloBatida texto="VOCÊ CONHECE A BANCA" em={c.ini + 10} x={450} y={1300} tamanho={42} /> : null}
      <Efeito nome="pop" em={a.ini + 20} volume={0.5} />
      <Efeito nome="whoosh" em={b.ini} volume={0.35} />
    </Fundo>
  );
};

/* 3. Passo a passo: uma tela real para cada passo ----------------------- */
const telas: TelaVitrine[] = [
  { tela: '02-Cadastro', rotulo: 'Passo 1', titulo: 'Crie sua conta / e escolha o cargo', sub: 'Leva menos de um minuto', selo: 'icone-alvo', de: cor.azul, para: cor.azulNoite, manchas: [cor.turquesa, cor.roxo] },
  { tela: 'real-trilha', rotulo: 'Passo 2', titulo: 'Toque na lição / do dia', sub: 'A trilha mostra o que estudar, em ordem', selo: 'icone-progresso', de: cor.laranjaVivo, para: cor.laranja, manchas: [cor.ouro, cor.coral] },
  { tela: 'real-acerto', rotulo: 'Passo 3', titulo: 'Responda e veja / a explicação', sub: 'Questões no estilo da banca FAU', selo: 'icone-acerto', de: '#22C55E', para: cor.verdeSombra, manchas: [cor.turquesa, cor.ouro] },
  { tela: 'real-revisao', rotulo: 'Passo 4', titulo: 'O que errou / volta na revisão', sub: 'Até você aprender de vez', selo: 'icone-revisao', de: cor.rosa, para: cor.roxoNoite, manchas: [cor.coral, cor.roxo] },
  { tela: 'real-simulado', rotulo: 'Bônus', titulo: 'Simulado igual / à prova', sub: '40 questões · 4 horas · padrão FAU', selo: 'icone-simulados', de: cor.roxo, para: cor.azulNoite, manchas: [cor.rosa, cor.azul] },
];

export const CenaPassos: React.FC<PropsCena> = ({ falas, duracao }) => {
  const inicios = falas.map((f, i) => (i === 0 ? 0 : f.ini - 6));
  return (
    <Fundo de={cor.azul} para={cor.azulNoite}>
      {telas.map((t, i) => {
        const dur = (inicios[i + 1] ?? duracao + 10) - inicios[i];
        return (
          <Sequence key={t.tela} from={inicios[i]} durationInFrames={dur + 18}>
            <ItemVitrine t={t} i={i} dur={i === telas.length - 1 ? dur + 30 : dur} />
            {i > 0 ? <Efeito nome="pop" em={4} volume={0.35} /> : null}
          </Sequence>
        );
      })}
      <XPVoando quando={[falas[2].ini + 40, falas[3].ini + 34]} />
    </Fundo>
  );
};

/* 4. Rotina: 15 minutos por dia ----------------------------------------- */
const momentos = [
  { icone: 'icone-localizacao', texto: 'No ônibus' },
  { icone: 'icone-relogio', texto: 'No intervalo' },
  { icone: 'icone-calendario', texto: 'Antes de dormir' },
];

export const CenaRotina: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  const cel = useMola(a.ini + 6, { damping: 15, stiffness: 110 });
  return (
    <Fundo de={cor.ouroVivo} para="#E0661A" manchas={[cor.coral, '#FFE27A', cor.rosa]} halo={{ x: 540, y: 1150, cor: 'rgba(255,255,255,0.28)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Palavras texto="*15 minutos* por dia / já fazem diferença" atraso={a.ini - 4} tamanho={92} fundoDestaque={cor.branco} corDestaque={cor.laranja} />
        <div style={{ height: 26 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, width: 940 }}>
          {momentos.map((m, i) => (
            <Entra key={m.texto} atraso={b.ini + i * 9} de="zoom">
              <Chip fundo={cor.branco} texto={cor.tinta} tamanho={32} icone={m.icone}>
                {m.texto}
              </Chip>
            </Entra>
          ))}
        </div>
      </Area>
      <div style={{ position: 'absolute', left: 560, top: 720, transform: `translateY(${(1 - cel) * 700}px) rotate(5deg)` }}>
        <Celular tela="real-ofensiva" largura={430} />
      </div>
      <Em x={300} y={880}>
        <Capi pose="estudando" altura={600} atraso={a.ini + 12} />
      </Em>
      {momentos.map((_, i) => (
        <Efeito key={i} nome="pop" em={b.ini + i * 9} volume={0.3} />
      ))}
    </Fundo>
  );
};

/* 5. Antes do edital: dois tempos --------------------------------------- */
export const CenaAntes: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const troca = b.ini - 3;
  const len = b.fim - b.ini;
  const sai = interpolate(frame, [troca - 8, troca], [1, 0], limita);
  return (
    <Fundo de={cor.roxo} para={cor.roxoNoite} manchas={[cor.rosa, cor.turquesa, cor.azul]} halo={{ x: 540, y: 1250, cor: 'rgba(255,194,51,0.2)' }}>
      {frame < troca ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Em y={300}>
            <Capi pose="constancia" altura={620} atraso={a.ini - 8} />
          </Em>
          <Em y={960}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, width: 936 }}>
              <Rotulo atraso={4}>Fique sabendo</Rotulo>
              <Palavras texto="O *edital* ainda / nem saiu!" atraso={a.ini - 2} passo={2} tamanho={110} />
            </div>
          </Em>
        </AbsoluteFill>
      ) : (
        <Sequence from={troca} layout="none">
          <Area style={{ justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
              <Rotulo>O segredo de quem passa</Rotulo>
              <Palavras texto="Quem começa agora / chega na *frente!*" tamanho={96} corDestaque={cor.branco} fundoDestaque={cor.laranjaVivo} />
              <div style={{ height: 8 }} />
              <Comparativo atraso={Math.round(len * 0.25)} rotulo="QUEM ESPERA O EDITAL" texto="Pouco tempo, muita matéria" icone="icone-relogio" />
              <Comparativo atraso={Math.round(len * 0.52)} rotulo="QUEM COMEÇA AGORA" texto="Meses de vantagem" icone="icone-calendario" bom />
            </div>
          </Area>
          <Em y={1080}>
            <Capi pose="incentivando" altura={500} atraso={Math.round(len * 0.6)} />
          </Em>
          <Efeito nome="pop" em={Math.round(len * 0.25)} volume={0.35} />
          <Efeito nome="ding" em={Math.round(len * 0.52)} volume={0.35} />
        </Sequence>
      )}
    </Fundo>
  );
};

/* 6. Chamada final ------------------------------------------------------ */
export const CenaChamada: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  return (
    <Fundo de={cor.azul} para={cor.turquesa} manchas={[cor.ouro, cor.roxo, cor.coral, cor.turquesa]} halo={{ x: 540, y: 1000, cor: 'rgba(255,255,255,0.3)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo>Concurso Prefeitura de Palmital</Rotulo>
        <div style={{ height: 24 }} />
        <Palavras texto="Estude *agora* / para *Palmital!*" atraso={4} passo={2} tamanho={112} />
        <div style={{ height: 22 }} />
        <Entra atraso={24}>
          <Texto tamanho={42}>Não espere o edital para começar.</Texto>
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
      <AcaoBio em={falas[1].ini - 6} y={1350} texto="Quero estudar agora" fundo={cor.laranjaVivo} sombra={cor.laranjaSombra} corBio={cor.azul} />
      <Confetes inicio={28} quantidade={70} />
      <Aviso />
    </Fundo>
  );
};

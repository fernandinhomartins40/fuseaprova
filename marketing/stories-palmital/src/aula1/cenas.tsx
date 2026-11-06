import React from 'react';
import { Area, Carimbo, Em, PropsCena } from '../comum';
import { CenaChamadaAula, ChipMateria, Grafia, Silabas } from '../aulas';
import { Brilhos, Capi, Chip, Efeito, Entra, Fundo, Palavras, Rotulo, SemCapi } from '../componentes';
import { cor } from '../tema';

// Aula 1 · Proparoxítonas — roxo e azul-noite com dourado
const ceu = { de: cor.roxo, para: cor.azulNoite, manchas: [cor.rosa, cor.azul, cor.ouro] };

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...ceu} halo={{ x: 540, y: 1300, cor: 'rgba(255,255,255,0.3)' }}>
    <Area style={{ justifyContent: 'flex-start' }}>
      <ChipMateria icone="icone-portugues" texto="Aula rápida · Português" />
      <div style={{ height: 30 }} />
      <Palavras texto="*Proparoxítona:* / a regra de acento / mais fácil!" atraso={8} passo={3} tamanho={98} />
      <div style={{ height: 26 }} />
      <Entra atraso={falas[1].ini - 2} de="zoom">
        <Chip fundo={cor.ouro} texto={cor.tinta} icone="icone-relogio">
          Menos de 1 minuto
        </Chip>
      </Entra>
    </Area>
    <Em y={960}>
      <Capi pose="explicando" altura={740} atraso={14} />
    </Em>
    <Brilhos
      atraso={20}
      pontos={[
        { x: 160, y: 1040, t: 62, cor: cor.ouro },
        { x: 870, y: 1100, t: 48, cor: cor.branco },
      ]}
    />
    <Efeito nome="pop" em={falas[1].ini - 2} volume={0.35} />
  </Fundo>
);

/* 2. Sílaba tônica ------------------------------------------------------ */
export const CenaTonica: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo de={cor.azulNoite} para={cor.roxoNoite} manchas={[cor.roxo, cor.azul]} halo={{ x: 540, y: 1000, cor: 'rgba(255,194,51,0.18)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo atraso={a.ini - 4}>Sílaba tônica</Rotulo>
        <div style={{ height: 28 }} />
        <Palavras texto="A sílaba *mais* *forte* / da palavra" atraso={a.ini} passo={3} tamanho={88} />
      </Area>
      <Em y={860}>
        <Silabas silabas={['sá', 'ba', 'do']} forte={0} em={a.ini + 14} forteEm={a.ini + 50} contarEm={b.ini + 80} tamanho={104} />
      </Em>
      <Em y={1280}>
        <Palavras texto="*Antepenúltima* / = a 3ª do fim" atraso={b.ini + 4} passo={3} tamanho={76} />
      </Em>
    </Fundo>
  );
};

/* 3. Exemplos ----------------------------------------------------------- */
const exemplos = [
  { silabas: ['lâm', 'pa', 'da'], forte: 0 },
  { silabas: ['mé', 'di', 'co'], forte: 0 },
  { silabas: ['ma', 'te', 'má', 'ti', 'ca'], forte: 2 },
];

export const CenaExemplos: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...ceu} halo={{ x: 540, y: 900, cor: 'rgba(255,255,255,0.18)' }}>
    <Area style={{ justifyContent: 'flex-start' }}>
      <Rotulo atraso={2}>Proparoxítonas</Rotulo>
    </Area>
    {exemplos.map((e, i) => (
      <Em key={i} y={450 + i * 330}>
        <Silabas silabas={e.silabas} forte={e.forte} em={falas[i].ini - 6} forteEm={falas[i].ini + 10} tamanho={e.silabas.length > 3 ? 78 : 92} />
      </Em>
    ))}
  </Fundo>
);

/* 4. A regra ------------------------------------------------------------ */
export const CenaRegra: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  const semCapi = React.useContext(SemCapi);
  return (
    <Fundo de={cor.laranja} para={cor.roxoSombra} manchas={[cor.ouro, cor.coral, cor.roxo]} halo={{ x: 540, y: 900, cor: 'rgba(255,255,255,0.3)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Rotulo atraso={a.ini - 4}>A regra</Rotulo>
        <div style={{ height: 28 }} />
        <Palavras texto="*Toda* proparoxítona / leva *acento*" atraso={a.ini} passo={4} tamanho={100} />
      </Area>
      <Carimbo em={b.ini} x={320} y={760} texto="SEMPRE!" topo="★ SEM EXCEÇÃO ★" />
      {semCapi ? (
        // videoaula do app: exemplos no lugar da Capi
        <Em y={1060}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
            {['sábado', 'lâmpada', 'último'].map((p, i) => (
              <Grafia key={p} texto={p} certo em={b.ini + 14 + i * 10} tamanho={80} />
            ))}
          </div>
        </Em>
      ) : (
        <Em y={1080}>
          <Capi pose="celebrando" altura={600} atraso={b.ini + 4} />
        </Em>
      )}
      <Efeito nome="pop" em={b.ini} volume={0.6} />
    </Fundo>
  );
};

/* 5. Pegadinha: rubrica ------------------------------------------------- */
export const CenaPegadinha: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo de="#7F1D1D" para={cor.azulNoite} manchas={[cor.coral, cor.roxo]} halo={{ x: 540, y: 800, cor: 'rgba(240,72,77,0.25)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Entra atraso={a.ini - 4} de="zoom">
          <Chip fundo={cor.coral} icone="icone-alvo">
            Pegadinha!
          </Chip>
        </Entra>
      </Area>
      <Em y={560}>
        <Silabas silabas={['ru', 'bri', 'ca']} forte={1} em={a.ini + 20} forteEm={b.ini + 12} tamanho={104} />
      </Em>
      <Em y={940}>
        <Palavras texto="A forte é *BRI*" atraso={b.ini + 6} passo={3} tamanho={80} />
      </Em>
      <Em y={1140}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 }}>
          <Grafia texto="rúbrica" certo={false} em={b.ini + 60} />
          <Grafia texto="rubrica" certo em={b.ini + 92} />
        </div>
      </Em>
    </Fundo>
  );
};

/* 6. Macete ------------------------------------------------------------- */
export const CenaMacete: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo de={cor.teal} para={cor.azulNoite} manchas={[cor.turquesa, cor.ouro]} halo={{ x: 540, y: 900, cor: 'rgba(255,255,255,0.22)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Entra atraso={a.ini - 4} de="zoom">
          <Chip fundo={cor.ouro} texto={cor.tinta} icone="icone-dica">
            Macete
          </Chip>
        </Entra>
        <div style={{ height: 28 }} />
        <Palavras texto="Conte *3* *sílabas* / do fim" atraso={a.ini} passo={3} tamanho={96} />
      </Area>
      <Em y={760}>
        <Silabas silabas={['pás', 'sa', 'ro']} forte={0} em={a.ini + 10} contarEm={a.ini + 30} forteEm={b.ini + 10} tamanho={104} />
      </Em>
      <Em y={1180}>
        <Grafia texto="pássaro" certo em={b.ini + 40} />
      </Em>
    </Fundo>
  );
};

/* 7. Chamada ------------------------------------------------------------ */
export const CenaChamada: React.FC<PropsCena> = (props) => <CenaChamadaAula {...props} {...ceu} />;

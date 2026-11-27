import './fontes';
import React from 'react';
import { Composition, Still } from 'remotion';
import { Arte } from './arte/Arte';
import { ALTURA, FPS, LARGURA } from './tema';
import * as v1 from './v1';
import * as v2 from './v2';
import * as v3 from './v3';
import * as v4 from './v4';
import * as v5 from './v5';
import * as v6 from './v6';
import * as v7 from './v7';
import * as v8 from './v8';
import * as v9 from './v9';
import * as v10 from './v10';
import * as v11 from './v11';
import * as v12 from './v12';
import * as v13 from './v13';
import * as v14 from './v14';
import * as v15 from './v15';
import * as v16 from './v16';
import * as v17 from './v17';
import * as v18 from './v18';
import * as v19 from './v19';
import * as v20 from './v20';
import * as v21 from './v21';
import * as v22 from './v22';
import * as v23 from './v23';
import * as v24 from './v24';
import * as v25 from './v25';
import * as v26 from './v26';
import * as v27 from './v27';
import * as v28 from './v28';
import * as v29 from './v29';
import * as v30 from './v30';
import * as v31 from './v31';
import * as v32 from './v32';
import * as v33 from './v33';
import * as v34 from './v34';
import * as v35 from './v35';
import * as v36 from './v36';
import * as v37 from './v37';
import * as v38 from './v38';
import * as v39 from './v39';
import * as v40 from './v40';
import * as v41 from './v41';
import * as v42 from './v42';
import * as v43 from './v43';
import * as v44 from './v44';
import * as v45 from './v45';
import * as v46 from './v46';
import * as v47 from './v47';
import * as v48 from './v48';
import * as aula1 from './aula1';
import * as aula2 from './aula2';
import * as videoaula1 from './videoaula1';
import * as videoaula2 from './videoaula2';
import { videoaulas } from './videoaula/registro.gerado';

const videos = [
  { id: 'v1', ...v1 },
  { id: 'v2', ...v2 },
  { id: 'v3', ...v3 },
  { id: 'v4', ...v4 },
  { id: 'v5', ...v5 },
  { id: 'v6', ...v6 },
  { id: 'v7', ...v7 },
  { id: 'v8', ...v8 },
  { id: 'v9', ...v9 },
  { id: 'v10', ...v10 },
  { id: 'v11', ...v11 },
  { id: 'v12', ...v12 },
  { id: 'v13', ...v13 },
  { id: 'v14', ...v14 },
  { id: 'v15', ...v15 },
  { id: 'v16', ...v16 },
  { id: 'v17', ...v17 },
  { id: 'v18', ...v18 },
  { id: 'v19', ...v19 },
  { id: 'v20', ...v20 },
  { id: 'v21', ...v21 },
  { id: 'v22', ...v22 },
  { id: 'v23', ...v23 },
  { id: 'v24', ...v24 },
  { id: 'v25', ...v25 },
  { id: 'v26', ...v26 },
  { id: 'v27', ...v27 },
  { id: 'v28', ...v28 },
  { id: 'v29', ...v29 },
  { id: 'v30', ...v30 },
  { id: 'v31', ...v31 },
  { id: 'v32', ...v32 },
  { id: 'v33', ...v33 },
  { id: 'v34', ...v34 },
  { id: 'v35', ...v35 },
  { id: 'v36', ...v36 },
  { id: 'v37', ...v37 },
  { id: 'v38', ...v38 },
  { id: 'v39', ...v39 },
  { id: 'v40', ...v40 },
  { id: 'v41', ...v41 },
  { id: 'v42', ...v42 },
  { id: 'v43', ...v43 },
  { id: 'v44', ...v44 },
  { id: 'v45', ...v45 },
  { id: 'v46', ...v46 },
  { id: 'v47', ...v47 },
  { id: 'v48', ...v48 },
  { id: 'aula1', ...aula1 },
  { id: 'aula2', ...aula2 },
  { id: 'videoaula1', ...videoaula1 },
  { id: 'videoaula2', ...videoaula2 },
  ...videoaulas,
];

export const Raiz: React.FC = () => (
  <>
    {videos.map((v) => (
      <Composition key={v.id} id={v.id} component={v.Video} durationInFrames={v.linha.duracao} fps={FPS} width={LARGURA} height={ALTURA} />
    ))}
    <Still id="arte-feed" component={Arte} width={1080} height={1350} />
    <Still id="arte-story" component={Arte} width={1080} height={1920} defaultProps={{ story: true }} />
  </>
);

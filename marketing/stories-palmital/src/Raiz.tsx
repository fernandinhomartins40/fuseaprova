import './fontes';
import React from 'react';
import { Composition } from 'remotion';
import { ALTURA, FPS, LARGURA } from './tema';
import * as v1 from './v1';
import * as v2 from './v2';
import * as v3 from './v3';
import * as v4 from './v4';
import * as v5 from './v5';
import * as v6 from './v6';
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
  </>
);

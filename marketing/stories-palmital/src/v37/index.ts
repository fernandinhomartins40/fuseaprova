// v37 · campanha até 05/12 · 01/12 · "A armadilha de dezembro" — gerado por scripts/campanha.py
import { criarVenda, Momento } from '../venda/cena';
import momentos from './momentos.json';
import narracao from './narracao.json';

export const { linha, Video } = criarVenda(narracao, momentos as Momento[], 'audio/v20/trilha.wav');

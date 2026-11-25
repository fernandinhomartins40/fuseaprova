// v41 · campanha até 05/12 · 03/12 · "A desculpa mais comum" — gerado por scripts/campanha.py
import { criarVenda, Momento } from '../venda/cena';
import momentos from './momentos.json';
import narracao from './narracao.json';

export const { linha, Video } = criarVenda(narracao, momentos as Momento[], 'audio/v21/trilha.wav');

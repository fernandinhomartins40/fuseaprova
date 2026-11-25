// v27 · campanha até 05/12 · 26/11 · "A resposta escondida no edital" — gerado por scripts/campanha.py
import { criarVenda, Momento } from '../venda/cena';
import momentos from './momentos.json';
import narracao from './narracao.json';

export const { linha, Video } = criarVenda(narracao, momentos as Momento[], 'audio/v19/trilha.wav');

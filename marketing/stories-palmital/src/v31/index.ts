// v31 · campanha até 05/12 · 28/11 · "O que mais pesa na prova" — gerado por scripts/campanha.py
import { criarVenda, Momento } from '../venda/cena';
import momentos from './momentos.json';
import narracao from './narracao.json';

export const { linha, Video } = criarVenda(narracao, momentos as Momento[], 'audio/v20/trilha.wav');

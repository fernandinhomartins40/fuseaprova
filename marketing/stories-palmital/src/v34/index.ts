// v34 · campanha até 05/12 · 29/11 · "O hábito de domingo" — gerado por scripts/campanha.py
import { criarVenda, Momento } from '../venda/cena';
import momentos from './momentos.json';
import narracao from './narracao.json';

export const { linha, Video } = criarVenda(narracao, momentos as Momento[], 'audio/v22/trilha.wav');

// v38 · campanha até 05/12 · 01/12 · "Sem saber nada" — gerado por scripts/campanha.py
import { criarVenda, Momento } from '../venda/cena';
import momentos from './momentos.json';
import narracao from './narracao.json';

export const { linha, Video } = criarVenda(narracao, momentos as Momento[], 'audio/v18/trilha.wav');

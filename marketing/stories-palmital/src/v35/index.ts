// v35 · campanha até 05/12 · 30/11 · "Daqui a 6 dias" — gerado por scripts/campanha.py
import { criarVenda, Momento } from '../venda/cena';
import momentos from './momentos.json';
import narracao from './narracao.json';

export const { linha, Video } = criarVenda(narracao, momentos as Momento[], 'audio/v21/trilha.wav');

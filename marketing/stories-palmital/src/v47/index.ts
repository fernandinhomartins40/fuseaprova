// v47 · campanha até 05/12 · 26/11 · "As 5 coisas (Will)" — gerado por scripts/campanha.py
import { criarVenda, Momento } from '../venda/cena';
import momentos from './momentos.json';
import narracao from './narracao.json';

export const { linha, Video } = criarVenda(narracao, momentos as Momento[], 'audio/v21/trilha.wav');

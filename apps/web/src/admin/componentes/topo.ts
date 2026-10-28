/**
 * D24: as telas de conteúdo rodam dentro do layout do /super. O layout publica aqui como
 * receber o título (barra superior do celular) e se a tela está no celular; o `Cabecalho`
 * das telas de conteúdo usa isso sem depender do módulo do /super (evita import circular).
 */
import { createContext, useContext } from 'react';

export interface TopoPainel {
  definirTopo: (t: { titulo: string; voltar?: string | undefined }) => void;
  celular: boolean;
}

export const ContextoTopoPainel = createContext<TopoPainel | null>(null);

export const useTopoPainel = () => useContext(ContextoTopoPainel);

/** Título da tela inicial do conteúdo (a raiz da trilha "Conteúdo"). */
export const TITULO_RAIZ_CONTEUDO = 'Resumo do conteúdo';

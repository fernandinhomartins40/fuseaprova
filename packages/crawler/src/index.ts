/**
 * @fuse/crawler — coletor FAU/PCI e importador de PDF do Fuse Aprova.
 *
 *   import { importarProva, ClienteHttp, atualizarCertames } from '@fuse/crawler';
 *   await importarProva({ db, caderno: '/srv/…/caderno.pdf', gabarito: '/srv/…/gabarito.pdf', provaId });
 */
export * from './config.js';
export * from './util/texto.js';
export * from './rede/limitador.js';
export * from './rede/robots.js';
export * from './rede/bloqueio.js';
export * from './rede/cliente.js';
export * from './arquivos/armazenamento.js';
export * from './fau/classificacao.js';
export * from './fau/parser.js';
export * from './fau/certames.js';
export * from './fau/docs.js';
export * from './pci/parser.js';
export * from './pci/comandos.js';
export * from './importacao/pdf.js';
export * from './importacao/texto-pdf.js';
export * from './importacao/caderno.js';
export * from './importacao/gabarito.js';
export * from './importacao/confronto.js';
export * from './importacao/importar.js';
export * from './prova.js';

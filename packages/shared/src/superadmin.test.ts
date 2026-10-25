import { describe, expect, it } from 'vitest';
import { ehAdmin, NOMES_PAPEL, PAPEIS } from './dominio.js';
import { emailComunicacao, escHtml, layoutEmail, paragrafosHtml } from './email.js';
import {
  AprovarManualEntrada,
  celulaCsv,
  CodigoRecuperacao,
  CodigoTotp,
  ComunicacaoCriarEntrada,
  ComunicacaoPreviaEntrada,
  ConfiguracoesProduto,
  DoisFatoresVerificarEntrada,
  EditarUsuarioEntrada,
  gerarCsv,
  JOBS_WORKER,
  Reconfirmacao,
  ROTAS,
  rotasComGuarda,
  statusLocalDoAsaas,
} from './api/index.js';

describe('papéis (D13)', () => {
  it('superadmin é admin; aluno não', () => {
    expect(PAPEIS).toEqual(['aluno', 'admin', 'superadmin']);
    expect(ehAdmin('admin')).toBe(true);
    expect(ehAdmin('superadmin')).toBe(true);
    expect(ehAdmin('aluno')).toBe(false);
    expect(ehAdmin(null)).toBe(false);
    expect(NOMES_PAPEL.superadmin).toBe('Superadmin');
  });

  it('toda rota /super é do superadmin e tem rate limit (menos as de 2FA de leitura)', () => {
    const sup = rotasComGuarda('superadmin');
    expect(sup.length).toBeGreaterThan(40);
    for (const n of sup) {
      expect(ROTAS[n].caminho.startsWith('/super')).toBe(true);
      expect((ROTAS[n] as { limite?: unknown }).limite).toBeDefined();
    }
    expect(rotasComGuarda('superadmin_2fa')).toEqual(['super2faStatus', 'super2faIniciar', 'super2faAtivar', 'super2faVerificar']);
  });
});

describe('Asaas → status local', () => {
  it.each([
    ['RECEIVED', 'pago'],
    ['CONFIRMED', 'pago'],
    ['RECEIVED_IN_CASH', 'pago'],
    ['PENDING', 'pendente'],
    ['AWAITING_RISK_ANALYSIS', 'pendente'],
    ['OVERDUE', 'vencido'],
    ['REFUNDED', 'estornado'],
    ['CHARGEBACK_REQUESTED', 'estornado'],
    ['CHARGEBACK_DISPUTE', 'estornado'],
    ['AWAITING_CHARGEBACK_REVERSAL', 'estornado'],
    ['REFUND_IN_PROGRESS', null],
  ])('%s → %s', (s, esperado) => {
    expect(statusLocalDoAsaas(s)).toBe(esperado);
  });
  it('removida vira vencido', () => {
    expect(statusLocalDoAsaas('PENDING', true)).toBe('vencido');
  });
});

describe('CSV', () => {
  it('escapa ;, aspas, quebra de linha e fórmulas; BOM e CRLF', () => {
    expect(celulaCsv(null)).toBe('');
    expect(celulaCsv(undefined)).toBe('');
    expect(celulaCsv(12)).toBe('12');
    expect(celulaCsv('a;b')).toBe('"a;b"');
    expect(celulaCsv('diz "oi"')).toBe('"diz ""oi"""');
    expect(celulaCsv('=SOMA(A1)')).toBe("'=SOMA(A1)");
    expect(celulaCsv('linha\nnova')).toBe('"linha\nnova"');
    expect(gerarCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a;b\r\n1;x\r\n');
  });
});

describe('contratos do superadmin', () => {
  it('reconfirmação exige senha ou código; códigos normalizados', () => {
    expect(Reconfirmacao.safeParse({}).success).toBe(false);
    expect(Reconfirmacao.parse({ senha: 'x' })).toEqual({ senha: 'x' });
    expect(Reconfirmacao.parse({ codigo: '123 456' })).toEqual({ codigo: '123456' });
    expect(CodigoTotp.safeParse('12345').success).toBe(false);
    expect(CodigoRecuperacao.parse('abcde-fghjk')).toBe('ABCDEFGHJK');
    expect(CodigoRecuperacao.safeParse('curto').success).toBe(false);
    expect(DoisFatoresVerificarEntrada.safeParse({}).success).toBe(false);
    expect(DoisFatoresVerificarEntrada.safeParse({ codigoRecuperacao: 'ABCDE-FGHJK' }).success).toBe(true);
  });

  it('aprovação manual: valor não é campo; forma, data e observação obrigatórias', () => {
    const base = { recebidoEm: '2026-10-20', forma: 'pix_direto', observacao: 'Pix na conta PJ', confirmacao: { senha: 'x' } };
    const ok = AprovarManualEntrada.parse(base);
    expect(ok.acaoAsaas).toBe('receber_em_dinheiro');
    expect('valorCentavos' in ok).toBe(false);
    expect(AprovarManualEntrada.safeParse({ ...base, observacao: '' }).success).toBe(false);
    expect(AprovarManualEntrada.safeParse({ ...base, comprovante: '../etc/passwd' }).success).toBe(false);
  });

  it('editar usuário precisa de algum campo; comunicação de inativos precisa dos dias', () => {
    expect(EditarUsuarioEntrada.safeParse({ motivo: 'Correção' }).success).toBe(false);
    expect(EditarUsuarioEntrada.safeParse({ nome: 'Ana Lima', motivo: 'Correção' }).success).toBe(true);
    const c = { canal: 'email', segmento: 'inativos', assunto: 'Volte', mensagem: 'Sentimos sua falta' };
    expect(ComunicacaoPreviaEntrada.safeParse(c).success).toBe(false);
    expect(ComunicacaoPreviaEntrada.safeParse({ ...c, diasInativo: 7 }).success).toBe(true);
    expect(ComunicacaoCriarEntrada.safeParse({ ...c, segmento: 'todos', link: 'https://fora.com' }).success).toBe(false);
  });

  it('configurações: WhatsApp só dígitos (DDI + DDD) e e-mail válido ou vazio', () => {
    const base = { suporteWhatsapp: '+55 (42) 99999-0000', suporteEmail: '', manutencao: { ativa: false, mensagem: '' }, aviso: { ativo: false, texto: '', tom: 'info' }, avisoEdital: '' };
    expect(ConfiguracoesProduto.parse(base).suporteWhatsapp).toBe('5542999990000');
    expect(ConfiguracoesProduto.safeParse({ ...base, suporteWhatsapp: '123' }).success).toBe(false);
    expect(ConfiguracoesProduto.safeParse({ ...base, suporteEmail: 'sem-arroba' }).success).toBe(false);
  });

  it('a lista de jobs do worker inclui a fila de comunicação', () => {
    expect(JOBS_WORKER.map((j) => j.nome)).toContain('enviar-comunicacoes');
  });
});

describe('e-mail (layout compartilhado)', () => {
  it('escapa HTML, separa parágrafos e leva o descadastro no rodapé', () => {
    expect(escHtml('<b>"x"</b>')).toBe('&#60;b&#62;&#34;x&#34;&#60;/b&#62;');
    expect(paragrafosHtml('um\nlinha\n\ndois')).toBe('<p>um<br>linha</p>\n<p>dois</p>');
    expect(layoutEmail('Título', '<p>x</p>')).toContain('<h1');
    const e = emailComunicacao({ nome: 'Marina Souza', assunto: 'Novidade', mensagem: 'Oi <script>', appUrl: 'https://app.x' });
    expect(e.html).toContain('Olá, Marina!');
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('https://app.x/aprender');
    expect(e.texto).toContain('https://app.x/configuracoes');
    expect(emailComunicacao({ nome: 'Ana', assunto: 'a', mensagem: 'b', link: '/liga', appUrl: 'https://app.x' }).html).toContain('https://app.x/liga');
  });
});

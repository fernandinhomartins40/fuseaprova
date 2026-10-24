import { describe, expect, it } from 'vitest';
import { completarCpf, formatarCpf, limparCpf, ocultarCpf, validarCpf } from './cpf.js';
import { formatarCelular, limparCelular, ocultarCelular, validarCelular } from './celular.js';
import {
  dentroDoArrependimento,
  deveAutoRetirar,
  normalizarEmail,
  pendenciasParaPublicar,
  validarEmail,
  validarHora,
  validarNomeCompleto,
  validarSenha,
} from './validacao.js';

describe('CPF', () => {
  it('valida os dígitos verificadores', () => {
    expect(validarCpf('529.982.247-25')).toBe(true);
    expect(validarCpf('52998224725')).toBe(true);
    expect(validarCpf('529.982.247-24')).toBe(false);
    expect(validarCpf('111.111.111-11')).toBe(false);
    expect(validarCpf('123')).toBe(false);
    expect(validarCpf('000.000.001-91')).toBe(true);
  });

  it('máscara progressiva', () => {
    expect(formatarCpf('529')).toBe('529');
    expect(formatarCpf('52998')).toBe('529.98');
    expect(formatarCpf('5299822')).toBe('529.982.2');
    expect(formatarCpf('5299822472599')).toBe('529.982.247-25');
    expect(limparCpf('529.982.247-25')).toBe('52998224725');
  });

  it('oculta para logs e admin', () => {
    expect(ocultarCpf('529.982.247-25')).toBe('***.982.247-**');
    expect(ocultarCpf('12')).toBe('***.***.***-**');
  });

  it('gera CPF válido a partir da base', () => {
    const cpf = completarCpf('123456789');
    expect(cpf).toBe('12345678909');
    expect(validarCpf(cpf)).toBe(true);
  });
});

describe('celular', () => {
  it('valida 11 dígitos com DDD e 9', () => {
    expect(validarCelular('(42) 99876-5432')).toBe(true);
    expect(validarCelular('+55 42 99876-5432')).toBe(true);
    expect(validarCelular('42 3876-5432')).toBe(false);
    expect(validarCelular('(20) 99876-5432')).toBe(false);
    expect(validarCelular('(42) 89876-5432')).toBe(false);
  });

  it('máscara e limpeza', () => {
    expect(formatarCelular('')).toBe('');
    expect(formatarCelular('4')).toBe('(4');
    expect(formatarCelular('42998')).toBe('(42) 998');
    expect(formatarCelular('42998765432')).toBe('(42) 99876-5432');
    expect(limparCelular('5542998765432')).toBe('42998765432');
    expect(ocultarCelular('42998765432')).toBe('(42) *****-5432');
  });
});

describe('validações do cadastro', () => {
  it('nome com 2 ou mais palavras', () => {
    expect(validarNomeCompleto('Marina Souza')).toBe(true);
    expect(validarNomeCompleto('Marina')).toBe(false);
    expect(validarNomeCompleto('Marina S')).toBe(false);
    expect(validarNomeCompleto('José da Silva')).toBe(true);
  });

  it('e-mail, senha e hora', () => {
    expect(validarEmail('marina@exemplo.com.br')).toBe(true);
    expect(validarEmail('marina@exemplo')).toBe(false);
    expect(normalizarEmail('  Marina@Exemplo.COM ')).toBe('marina@exemplo.com');
    expect(validarSenha('12345678')).toBe(true);
    expect(validarSenha('1234567')).toBe(false);
    expect(validarHora('07:30')).toBe(true);
    expect(validarHora('24:00')).toBe(false);
  });

  it('pendências para publicar', () => {
    const ok = {
      enunciado: 'Enunciado',
      alternativas: ['A', 'B', 'C', 'D', 'E'].map((letra) => ({ letra, texto: 'x' })),
      gabarito: 'C',
      explicacao: 'Porque sim.',
      dicaBolso: 'Macete.',
      dica: 'Dica.',
      revisadoPor: 'admin',
    };
    expect(pendenciasParaPublicar(ok)).toEqual([]);
    expect(
      pendenciasParaPublicar({
        ...ok,
        enunciado: ' ',
        alternativas: ok.alternativas.slice(0, 4),
        gabarito: 'F',
        explicacao: null,
        dicaBolso: '',
        dica: null,
        revisadoPor: null,
      }),
    ).toHaveLength(7);
  });

  it('auto-retirada com 3 reports e prazo de arrependimento', () => {
    expect(deveAutoRetirar(3)).toBe(true);
    expect(deveAutoRetirar(2)).toBe(false);
    const pago = new Date('2026-10-01T12:00:00Z');
    expect(dentroDoArrependimento(pago, new Date('2026-10-08T12:00:00Z'))).toBe(true);
    expect(dentroDoArrependimento(pago, new Date('2026-10-08T12:00:01Z'))).toBe(false);
  });
});

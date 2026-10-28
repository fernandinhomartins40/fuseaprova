import { describe, expect, it } from 'vitest';
import { MS_HORA, MS_MINUTO } from './datas.js';
import {
  folgaDoIntervalo,
  idadeEmHoras,
  intervaloDoCron,
  lerUltimoBackup,
  situacaoDoJob,
} from './operacao.js';
import {
  ArquivoCsvResposta,
  celulaCsv,
  ComunicacaoCriarEntrada,
  CupomSalvarEntrada,
  EditarUsuarioEntrada,
  ExportarUsuarioEntrada,
  JOBS_WORKER,
} from './api/index.js';

describe('S-09: agenda dos jobs', () => {
  it('intervalo de cada formato de cron da agenda', () => {
    expect(intervaloDoCron('* * * * *')).toBe(MS_MINUTO);
    expect(intervaloDoCron('*/5 * * * *')).toBe(5 * MS_MINUTO);
    expect(intervaloDoCron('59 * * * *')).toBe(MS_HORA);
    expect(intervaloDoCron('30 3 * * *')).toBe(24 * MS_HORA);
    expect(intervaloDoCron('')).toBe(24 * MS_HORA);
  });

  it('folga: o próprio intervalo, entre 4 min e 2 h', () => {
    expect(folgaDoIntervalo(MS_MINUTO)).toBe(4 * MS_MINUTO);
    expect(folgaDoIntervalo(15 * MS_MINUTO)).toBe(15 * MS_MINUTO);
    expect(folgaDoIntervalo(24 * MS_HORA)).toBe(2 * MS_HORA);
  });

  it('backup diário atrasa depois de 26 h; fila de minuto em 5 min; sem execução não atrasa', () => {
    const ultima = new Date('2026-10-10T03:30:00-03:00');
    expect(
      situacaoDoJob(ultima, '30 3 * * *', new Date('2026-10-11T05:29:00-03:00')).atrasado,
    ).toBe(false);
    const dez = situacaoDoJob(ultima, '30 3 * * *', new Date('2026-10-20T03:30:00-03:00'));
    expect(dez.atrasado).toBe(true);
    expect(dez.esperadaAte?.toISOString()).toBe('2026-10-11T08:30:00.000Z');
    expect(
      situacaoDoJob(new Date('2026-10-20T12:00:00Z'), '* * * * *', new Date('2026-10-20T12:06:00Z'))
        .atrasado,
    ).toBe(true);
    expect(situacaoDoJob(null, '* * * * *', new Date())).toEqual({
      atrasado: false,
      esperadaAte: null,
    });
  });

  it('idade em horas com uma casa', () => {
    expect(idadeEmHoras(new Date('2026-10-10T00:00:00Z'), new Date('2026-10-20T00:00:00Z'))).toBe(
      240,
    );
    expect(idadeEmHoras(new Date('2026-10-10T00:00:00Z'), new Date('2026-10-10T01:30:00Z'))).toBe(
      1.5,
    );
  });

  it('lê o ULTIMO_BACKUP antigo e o novo (com a marca dos arquivos)', () => {
    expect(lerUltimoBackup('2026-10-26T22:12:50-0300 /srv/fuse/backups/diario/a.dump\n')).toEqual({
      em: new Date('2026-10-27T01:12:50Z'),
      caminho: '/srv/fuse/backups/diario/a.dump',
      arquivosOk: null,
    });
    expect(lerUltimoBackup('2026-10-26T22:12:50-03:00 /x.dump arquivos=falhou').arquivosOk).toBe(
      false,
    );
    expect(lerUltimoBackup('2026-10-26T22:12:50-03:00 /x.dump arquivos=ok').arquivosOk).toBe(true);
    expect(lerUltimoBackup('lixo')).toEqual({ em: null, caminho: null, arquivosOk: null });
    expect(lerUltimoBackup('2026-99-99T99:99:99-0300 /x').em).toBeNull();
  });

  it('todo job tem nome em português e a agenda tem o job de alertas', () => {
    for (const j of JOBS_WORKER) expect(j.titulo.length).toBeGreaterThan(3);
    expect(JOBS_WORKER.find((j) => j.nome === 'alertas')?.cron).toBe('*/15 * * * *');
  });
});

describe('S-18: CSV', () => {
  it('números, inclusive negativos, continuam números (R4-10)', () => {
    expect(celulaCsv('-397,00')).toBe('-397,00');
    expect(celulaCsv(-12)).toBe('-12');
    expect(celulaCsv('3.5')).toBe('3.5');
  });

  it('fórmula depois de espaço e com sinais de largura total é neutralizada (R1-15)', () => {
    expect(celulaCsv(' =1+1')).toBe("' =1+1");
    expect(celulaCsv('　@SOMA(A1)')).toBe("'　@SOMA(A1)");
    expect(celulaCsv('＝1+1')).toBe("'＝1+1");
    expect(celulaCsv('＋1')).toBe("'＋1");
    expect(celulaCsv('－1')).toBe("'－1");
    expect(celulaCsv('＠x')).toBe("'＠x");
    expect(celulaCsv('\tx')).toBe("'\tx");
    expect(celulaCsv('-x')).toBe("'-x");
    expect(celulaCsv('\r=1')).toBe(`"'\r=1"`);
    expect(celulaCsv(' texto')).toBe(' texto');
  });

  it('a resposta de CSV traz o aviso (null quando nada foi cortado)', () => {
    expect(ArquivoCsvResposta.parse({ nomeArquivo: 'a.csv', conteudo: 'x' }).aviso).toBeNull();
  });
});

describe('S-11, S-12, S-17, S-21: contratos com reconfirmação', () => {
  it('comunicação pede motivo e reconfirmação', () => {
    const c = {
      canal: 'email',
      segmento: 'todos',
      assunto: 'Volte',
      mensagem: 'Sentimos sua falta',
    };
    expect(ComunicacaoCriarEntrada.safeParse(c).success).toBe(false);
    expect(
      ComunicacaoCriarEntrada.safeParse({
        ...c,
        motivo: 'Campanha de volta',
        confirmacao: { senha: 'x' },
      }).success,
    ).toBe(true);
    expect(
      ComunicacaoCriarEntrada.safeParse({
        ...c,
        motivo: 'Campanha',
        confirmacao: { senha: 'x' },
        chaveIdempotencia: 'nao-uuid',
      }).success,
    ).toBe(false);
  });

  it('cupom pede reconfirmação', () => {
    const base = {
      codigo: 'BLACK',
      tipo: 'percentual',
      valor: 10,
      validoAte: null,
      limiteUsos: null,
      concursoId: null,
      ativo: true,
      motivo: 'Campanha',
    };
    expect(CupomSalvarEntrada.safeParse(base).success).toBe(false);
    expect(
      CupomSalvarEntrada.safeParse({ ...base, confirmacao: { codigo: '123456' } }).success,
    ).toBe(true);
  });

  it('exportação LGPD pede motivo e reconfirmação; editar aceita a reconfirmação', () => {
    expect(ExportarUsuarioEntrada.safeParse({}).success).toBe(false);
    expect(
      ExportarUsuarioEntrada.safeParse({ motivo: 'Pedido do titular', confirmacao: { senha: 'x' } })
        .success,
    ).toBe(true);
    expect(
      EditarUsuarioEntrada.safeParse({
        email: 'a@b.com',
        motivo: 'Troca',
        confirmacao: { senha: 'x' },
      }).success,
    ).toBe(true);
  });
});

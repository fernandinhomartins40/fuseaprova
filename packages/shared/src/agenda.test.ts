import { describe, expect, it } from 'vitest';
import { dobrarLinhaIcs, escaparIcs, gerarIcsEstudo, linkGoogleAgenda } from './agenda.js';

const AGORA = new Date('2026-11-03T10:00:00-03:00');
const URL_APP = 'https://www.fuseaprova.com.br/aprender';

describe('agenda (.ics) — D30', () => {
  it('estudo diário no horário de São Paulo, com alarme, até a véspera da prova', () => {
    const ics = gerarIcsEstudo({
      hora: '19:00',
      agora: AGORA,
      url: URL_APP,
      dataProva: '2026-12-14',
    });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART;TZID=America/Sao_Paulo:20261103T190000');
    expect(ics).toContain('DTEND;TZID=America/Sao_Paulo:20261103T192000');
    expect(ics).toContain('RRULE:FREQ=DAILY;UNTIL=20261214T025959Z');
    expect(ics).toContain('TRIGGER:PT0M');
    expect(ics).toContain('DTSTAMP:20261103T130000Z');
    // dia da prova: dia inteiro, alarme na véspera
    expect(ics).toContain('DTSTART;VALUE=DATE:20261214');
    expect(ics).toContain('DTEND;VALUE=DATE:20261215');
    expect(ics).toContain('SUMMARY:Dia da prova');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    // nenhuma linha passa de 75 octetos
    for (const l of ics.split('\r\n'))
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it('sem prova (ou prova passada): repetição sem fim e um evento só', () => {
    for (const dataProva of [null, '2026-11-01']) {
      const ics = gerarIcsEstudo({ hora: '07:05', agora: AGORA, url: URL_APP, dataProva });
      expect(ics).toContain('RRULE:FREQ=DAILY\r\n');
      expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
      expect(ics).toContain('T070500');
    }
  });

  it('estudo que cruza a meia-noite termina no dia seguinte', () => {
    const ics = gerarIcsEstudo({ hora: '23:50', agora: AGORA, url: URL_APP, dataProva: null });
    expect(ics).toContain('DTEND;TZID=America/Sao_Paulo:20261104T001000');
    expect(
      linkGoogleAgenda({ hora: '23:50', agora: AGORA, url: URL_APP, dataProva: null }),
    ).toContain('dates=20261103T235000%2F20261104T001000');
  });

  it('escapa e dobra o texto', () => {
    expect(escaparIcs('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const longa = `DESCRIPTION:${'á'.repeat(60)}`;
    const dobrada = dobrarLinhaIcs(longa);
    const partes = dobrada.split('\r\n');
    expect(partes.length).toBeGreaterThan(1);
    expect(partes.slice(1).every((p) => p.startsWith(' '))).toBe(true);
    expect(partes.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(longa);
    expect(dobrarLinhaIcs('curta')).toBe('curta');
  });

  it('link do Google Agenda com repetição diária e fuso', () => {
    const u = new URL(
      linkGoogleAgenda({ hora: '19:00', agora: AGORA, url: URL_APP, dataProva: null }),
    );
    expect(u.origin).toBe('https://calendar.google.com');
    expect(u.searchParams.get('action')).toBe('TEMPLATE');
    expect(u.searchParams.get('dates')).toBe('20261103T190000/20261103T192000');
    expect(u.searchParams.get('ctz')).toBe('America/Sao_Paulo');
    expect(u.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY');
  });
});

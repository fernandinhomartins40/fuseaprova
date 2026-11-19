import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { comCache, interpretarCurso, responderPergunta } from '../src/servicos/edital/ia.js';

/** D44: IA pública da ferramenta "Descubra seu cargo". */
let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
afterAll(() => t.fechar());

const CFG = { apiKey: 'chave', baseUrl: 'http://fusai.invalido/v1', modelo: 'fuse/deepseek-chat' };
/** fetch falso que devolve `conteudo` como resposta do modelo e guarda o corpo enviado. */
function fetchFalso(conteudo: string, status = 200) {
  const enviados: { model: string; messages: { role: string; content: string }[] }[] = [];
  const fn = (async (_url: string, init: RequestInit) => {
    enviados.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: conteudo } }] }), {
      status,
    });
  }) as unknown as typeof fetch;
  return { fn, enviados };
}

describe('rotas públicas', () => {
  it('não exigem login e validam a entrada', async () => {
    const r = await t.chamar('editalCurso', { corpo: { cargo: 104, curso: 'x' } });
    expect(r.statusCode).toBe(400);
    expect(r.json().erro).toBeTruthy();
    const p = await t.chamar('editalPergunta', { corpo: { pergunta: 'oi' } });
    expect(p.statusCode).toBe(400);
  });

  it('sem chave do Fusai respondem 503 em português, sem quebrar', async () => {
    const r = await t.chamar('editalPergunta', { corpo: { pergunta: 'Qual a data da prova?' } });
    expect(r.statusCode).toBe(503);
    expect(r.json()).toMatchObject({ codigo: 'ia_indisponivel' });
  });
});

describe('interpretarCurso', () => {
  it('manda o requisito literal e devolve o veredito do modelo', async () => {
    const f = fetchFalso('{"veredito":"consta","explicacao":"O requisito cita Enfermagem."}');
    const r = await interpretarCurso(CFG, 104, 'Bacharelado em Enfermagem', f.fn);
    expect(r).toEqual({ veredito: 'consta', explicacao: 'O requisito cita Enfermagem.' });
    expect(f.enviados[0]!.model).toBe('fuse/deepseek-chat');
    expect(f.enviados[0]!.messages[1]!.content).toContain(
      'Curso de Enfermagem e Registro no Conselho Regional de Enfermagem (COREN)',
    );
  });

  it('resposta fora do formato nunca vira "consta"', async () => {
    const r = await interpretarCurso(CFG, 104, 'Enfermagem', fetchFalso('sim, consta').fn);
    expect(r.veredito).toBe('confirmar');
  });

  it('cargo sem curso superior específico é 404', async () => {
    await expect(interpretarCurso(CFG, 403, 'Direito', fetchFalso('{}').fn)).rejects.toMatchObject({
      codigo: 'nao_encontrado',
    });
  });

  it('erro do Fusai vira ia_indisponivel', async () => {
    await expect(
      interpretarCurso(CFG, 104, 'Enfermagem', fetchFalso('', 500).fn),
    ).rejects.toMatchObject({ codigo: 'ia_indisponivel' });
  });
});

describe('responderPergunta', () => {
  it('leva o edital inteiro e, com cargo, o texto dos anexos', async () => {
    const f = fetchFalso('A prova é em 21/02/2027 (item 10.2).');
    expect(await responderPergunta(CFG, 'Quando é a prova?', 301, f.fn)).toContain('21/02/2027');
    const [sistema, usuario] = f.enviados[0]!.messages;
    expect(sistema!.content).toContain('10.2 A prova objetiva será aplicada');
    expect(sistema!.content).toContain('Jardim Santa Amália');
    expect(usuario!.content).toContain('Agente Comunitário de Saúde');
    expect(usuario!.content).toContain('Portaria 344/98');
  });

  it('Pedreiro: avisa que o edital não traz requisitos', async () => {
    const f = fetchFalso('ok');
    await responderPergunta(CFG, 'O que o pedreiro precisa?', 408, f.fn);
    expect(f.enviados[0]!.messages[1]!.content).toContain('o edital não traz requisitos');
  });
});

it('comCache reaproveita a resposta para a mesma pergunta (sem acento e maiúsculas)', async () => {
  let n = 0;
  const gerar = async () => ++n;
  expect(await comCache('teste:Quando é a prova?', gerar)).toBe(1);
  expect(await comCache('teste:quando e a  prova?', gerar)).toBe(1);
});

/**
 * Confronto entre o caderno extraído e o gabarito definitivo (puro).
 *
 * Para cada número: a questão existe no caderno? tem 5 alternativas? há resposta no
 * gabarito? está anulada ou alterada? (e, com o preliminar, o que mudou).
 * Problemas impedem a gravação ou exigem correção no painel e contam como divergência;
 * avisos só orientam a revisão humana.
 */
import type { Letra } from '@fuse/shared';
import type { QuestaoExtraida } from './caderno.js';
import type { GabaritoCargo, RespostaGabarito } from './gabarito.js';

export interface ItemConfronto {
  numero: number;
  questao: QuestaoExtraida | null;
  resposta: RespostaGabarito | null;
  letraPreliminar: Letra | null;
  /** 'ANULADA', a letra definitiva ou null (sem gabarito). */
  gabaritoDefinitivo: Letra | 'ANULADA' | null;
  /** Status com que a questão seria gravada (null = não grava). */
  status: 'rascunho' | 'anulada' | null;
  problemas: string[];
  avisos: string[];
}

export interface ResultadoConfronto {
  itens: ItemConfronto[];
  divergencias: number;
  anuladas: number;
  alteradas: number;
  gravaveis: number;
}

export function confrontar(
  questoes: QuestaoExtraida[],
  gabarito: GabaritoCargo,
  preliminar?: GabaritoCargo | null,
): ResultadoConfronto {
  const porNumero = new Map(questoes.map((q) => [q.numero, q]));
  const numeros = [...new Set([...porNumero.keys(), ...gabarito.respostas.keys()])].sort(
    (a, b) => a - b,
  );
  const itens: ItemConfronto[] = numeros.map((numero) => {
    const questao = porNumero.get(numero) ?? null;
    const resposta = gabarito.respostas.get(numero) ?? null;
    const pre = preliminar?.respostas.get(numero) ?? null;
    const letraPreliminar = pre && !pre.anulada ? pre.letra : null;
    const problemas: string[] = [];
    // Os avisos do caderno que viram problema abaixo não se repetem.
    const avisos = (questao?.avisos ?? []).filter(
      (a) => !/alternativas extraídas|^enunciado vazio$|^disciplina não identificada$/.test(a),
    );

    if (!questao) problemas.push('questão não encontrada no caderno');
    if (!resposta) problemas.push('questão sem resposta no gabarito definitivo');
    if (questao && questao.alternativas.length !== 5)
      problemas.push(`${questao.alternativas.length} alternativas (esperado 5)`);
    if (questao && !questao.enunciado) problemas.push('enunciado vazio');
    if (questao && !questao.disciplina)
      problemas.push('disciplina não identificada (gravada como Conhecimentos Específicos)');

    if (resposta?.anulada) avisos.push('anulada no gabarito definitivo');
    if (resposta?.alterada) {
      avisos.push(
        letraPreliminar
          ? `gabarito alterado: de ${letraPreliminar} para ${resposta.letra}`
          : `gabarito alterado para ${resposta.letra}`,
      );
      if (letraPreliminar && letraPreliminar === resposta.letra)
        avisos.push('marcada como alterada, mas igual ao preliminar; confira');
    } else if (
      resposta &&
      !resposta.anulada &&
      letraPreliminar &&
      letraPreliminar !== resposta.letra
    ) {
      avisos.push(
        `definitivo (${resposta.letra}) difere do preliminar (${letraPreliminar}) sem marca de alteração; vale o definitivo`,
      );
    }
    if (
      resposta?.letra &&
      questao &&
      !questao.alternativas.some((a) => a.letra === resposta.letra)
    ) {
      problemas.push(`o gabarito (${resposta.letra}) não está entre as alternativas extraídas`);
    }

    const gabaritoDefinitivo = resposta ? (resposta.anulada ? 'ANULADA' : resposta.letra) : null;
    const gravavel =
      !!questao && !!resposta && questao.alternativas.length >= 2 && !!questao.enunciado;
    return {
      numero,
      questao,
      resposta,
      letraPreliminar,
      gabaritoDefinitivo,
      status: gravavel ? (resposta!.anulada ? 'anulada' : 'rascunho') : null,
      problemas,
      avisos,
    };
  });
  return {
    itens,
    divergencias: itens.filter((i) => i.problemas.length).length,
    anuladas: itens.filter((i) => i.resposta?.anulada).length,
    alteradas: itens.filter((i) => i.resposta?.alterada).length,
    gravaveis: itens.filter((i) => i.status).length,
  };
}

/** Texto da observação do item para o painel admin (ConfrontoJson.observacao). */
export function observacaoDoItem(i: ItemConfronto): string | null {
  const partes = [...i.problemas, ...i.avisos];
  return partes.length ? partes.join('; ') : null;
}

/** Nota da explicação para questão com gabarito alterado (PRD 7.4). */
export function notaDeAlteracao(i: ItemConfronto): string | null {
  if (!i.resposta?.alterada || !i.resposta.letra) return null;
  return i.letraPreliminar
    ? `Gabarito alterado pela banca após os recursos: a resposta preliminar era ${i.letraPreliminar} e o gabarito definitivo é ${i.resposta.letra}.`
    : `Gabarito alterado pela banca após os recursos: o gabarito definitivo é ${i.resposta.letra}.`;
}

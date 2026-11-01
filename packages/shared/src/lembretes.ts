/**
 * D30: lembretes personalizados (notificação local no app nativo e Web Push no site).
 *
 * O servidor monta o plano (GET /me/lembretes) e o worker escolhe o texto do push com as mesmas
 * funções: cada lembrete tem um tipo, um texto curto e específico e uma ROTA obrigatória, sempre
 * de uma lista fechada de telas do app. Tocar na notificação abre exatamente essa tela.
 *
 * Regras:
 * - sem opt-in (notificações desligadas ou sem horário) ou sem acesso: nenhum lembrete;
 * - no máximo 1 lembrete por dia, no horário escolhido pelo aluno (fuso de São Paulo);
 * - hoje fica de fora se a meta do dia já foi cumprida;
 * - mais 1 aviso de "ofensiva em risco" às 21:00, só hoje e só se ele ainda não estudou
 *   (no máximo 2 por dia);
 * - no dia da prova, nenhum lembrete.
 */
import {
  diaDaSemana,
  diaSP,
  diferencaDias,
  inicioDoDiaSP,
  MS_MINUTO,
  somarDias,
  type Dia,
} from './datas.js';

/** Telas que uma notificação pode abrir (o resto vira a trilha). */
export const ROTAS_NOTIFICACAO = [
  '/aprender',
  '/revisar',
  '/revisar/praticar',
  '/reforco/praticar',
  '/desempenho',
  '/anotacoes',
  '/simulado',
] as const;
export type RotaNotificacao = (typeof ROTAS_NOTIFICACAO)[number];
export const ROTA_NOTIFICACAO_PADRAO: RotaNotificacao = '/aprender';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIXO_REFORCO_TEMA = '/reforco/praticar?assunto=';

/** Rota da lista fechada, ou o reforço de um tema (`/reforco/praticar?assunto=<uuid>`). */
export function rotaNotificacaoValida(rota: unknown): rota is string {
  if (typeof rota !== 'string') return false;
  if ((ROTAS_NOTIFICACAO as readonly string[]).includes(rota)) return true;
  return (
    rota.startsWith(PREFIXO_REFORCO_TEMA) && UUID.test(rota.slice(PREFIXO_REFORCO_TEMA.length))
  );
}

/** A rota, se válida; senão, a trilha. Usado no toque da notificação (app e service worker). */
export function normalizarRotaNotificacao(rota: unknown): string {
  return rotaNotificacaoValida(rota) ? rota : ROTA_NOTIFICACAO_PADRAO;
}

export function rotaReforcoDoTema(assuntoId: string): string {
  return `${PREFIXO_REFORCO_TEMA}${assuntoId}`;
}

/* ------------------------------------------------------------------ tipos */

export const TIPOS_LEMBRETE = [
  'revisao_vencida',
  'revisao_agendada',
  'prova_perto',
  'tema_fraco',
  'simulado',
  'resumo_semana',
  'trilha',
  'treino',
  'ofensiva_risco',
] as const;
export type TipoLembrete = (typeof TIPOS_LEMBRETE)[number];

export interface TemaFracoLembrete {
  assuntoId: string;
  nome: string;
}

/** Dados do dia que escolhem o texto e a rota. */
export interface ContextoLembrete {
  /** Revisões vencidas (hoje) ou que vencem naquele dia (dias seguintes). */
  revisoes: number;
  ofensiva: number;
  /** Dias até a prova (null sem data ou já passou). */
  diasParaProva: number | null;
  /** Tema fraco da vez (rodízio), se houver. */
  tema: TemaFracoLembrete | null;
  /** O tema da vez é o mais fraco de todos. */
  temaMaisFraco: boolean;
  trilhaConcluida: boolean;
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number;
  /** Índice do dia no plano (varia o texto genérico). */
  indice: number;
}

export interface TextoLembrete {
  tipo: TipoLembrete;
  titulo: string;
  corpo: string;
  rota: string;
}

/** Rota de cada tipo: todo tipo de lembrete abre uma tela (teste garante). */
export const ROTA_DO_TIPO: Record<TipoLembrete, (c: Pick<ContextoLembrete, 'tema'>) => string> = {
  revisao_vencida: () => '/revisar/praticar',
  revisao_agendada: () => '/revisar/praticar',
  prova_perto: () => '/reforco/praticar',
  tema_fraco: (c) => (c.tema ? rotaReforcoDoTema(c.tema.assuntoId) : '/desempenho'),
  simulado: () => '/simulado',
  resumo_semana: () => '/desempenho',
  trilha: () => '/aprender',
  treino: () => '/reforco/praticar',
  ofensiva_risco: () => '/aprender',
};

function plural(n: number, um: string, varios: string): string {
  return n === 1 ? `1 ${um}` : `${n} ${varios}`;
}

const FRASES_TRILHA = [
  'Sua próxima lição está pronta. 5 minutinhos e a ofensiva continua!',
  'A Capi está te esperando para a lição de hoje.',
  'Um pouco por dia vence o edital. Bora para a próxima lição?',
] as const;

/** Escolhe o tipo, o texto e a rota do lembrete de um dia (ordem de prioridade abaixo). */
export function escolherLembrete(c: ContextoLembrete): TextoLembrete {
  const montar = (tipo: TipoLembrete, titulo: string, corpo: string): TextoLembrete => ({
    tipo,
    titulo,
    corpo,
    rota: ROTA_DO_TIPO[tipo](c),
  });
  const prova = c.diasParaProva;
  const faltam = prova === 1 ? 'A prova é amanhã' : `Faltam ${prova} dias para a prova`;

  // 1. Reta final (até 3 dias): treino inteligente, que mistura revisão e temas fracos.
  if (prova !== null && prova <= 3)
    return montar(
      'prova_perto',
      faltam,
      'Treino inteligente de hoje: 10 questões no que mais importa.',
    );
  // 2. Revisão: erros vencidos (hoje) ou que voltam naquele dia.
  if (c.revisoes > 0)
    return c.indice === 0
      ? montar(
          'revisao_vencida',
          `${plural(c.revisoes, 'erro esperando', 'erros esperando')} revisão`,
          'Revise agora e não deixe o conteúdo escapar.',
        )
      : montar(
          'revisao_agendada',
          `${plural(c.revisoes, 'questão volta', 'questões voltam')} hoje`,
          'É dia de revisar: rever no tempo certo fixa o conteúdo.',
        );
  // 3. Prova em até 30 dias: dia sim, dia não (sábado com tempo: simulado).
  if (prova !== null && prova <= 30) {
    if (c.diaSemana === 6 && prova >= 7)
      return montar(
        'simulado',
        `${faltam}: que tal um simulado?`,
        'Treine no ritmo da prova e veja sua nota.',
      );
    if (c.indice % 2 === 0)
      return montar(
        'prova_perto',
        faltam,
        'Treino inteligente de hoje: 10 questões no que mais importa.',
      );
  }
  // 4. Tema fraco da vez.
  if (c.tema)
    return montar(
      'tema_fraco',
      c.temaMaisFraco ? `Reforce ${c.tema.nome}: seu ponto mais fraco` : `Reforce ${c.tema.nome}`,
      '10 questões com a dica do tema antes. Bora melhorar?',
    );
  // 5. Domingo: resumo da semana.
  if (c.diaSemana === 0)
    return montar(
      'resumo_semana',
      'Como foi sua semana?',
      'Veja no que você está bem e no que precisa melhorar.',
    );
  // 6. Trilha ou, com ela concluída, o treino inteligente.
  if (c.trilhaConcluida)
    return montar(
      'treino',
      'Treino inteligente de hoje',
      '10 questões para manter tudo fresco até a prova.',
    );
  return montar(
    'trilha',
    c.ofensiva >= 2 ? `Ofensiva de ${c.ofensiva} dias: não pare agora` : 'Hora de estudar',
    FRASES_TRILHA[c.indice % FRASES_TRILHA.length]!,
  );
}

/** Aviso noturno (21:00) de quem tem ofensiva e ainda não estudou hoje. */
export function avisoOfensiva(ofensiva: number): TextoLembrete {
  return {
    tipo: 'ofensiva_risco',
    titulo: `Sua ofensiva de ${ofensiva} dias está em risco`,
    corpo: 'Ainda dá tempo: uma lição rápida mantém a sequência.',
    rota: ROTA_DO_TIPO.ofensiva_risco({ tema: null }),
  };
}

/* ------------------------------------------------------------------ plano */

export const DIAS_PLANO_LEMBRETES = 7;
export const HORA_AVISO_OFENSIVA = '21:00';
/** O aviso da ofensiva só sai se ficar pelo menos 1 h depois do lembrete do dia. */
const INTERVALO_MINIMO_AVISO_MIN = 60;
/** Ofensiva a partir da qual vale avisar o risco. */
export const OFENSIVA_MINIMA_AVISO = 2;

export interface EntradaPlanoLembretes {
  agora: Date;
  notificacoes: boolean;
  /** 'HH:MM' em São Paulo, ou null sem lembrete. */
  hora: string | null;
  acesso: boolean;
  metaCumpridaHoje: boolean;
  /** A ofensiva de hoje já contou (estudou hoje). */
  estudouHoje: boolean;
  ofensiva: number;
  revisoesVencidas: number;
  /** Revisões que vencem em cada um dos próximos dias (dia de São Paulo → quantidade). */
  revisoesPorDia: Readonly<Record<Dia, number>>;
  /** Temas fracos, do mais fraco para o menos fraco. */
  temasFracos: readonly TemaFracoLembrete[];
  trilhaConcluida: boolean;
  dataProva: Dia | null;
  dias?: number;
}

export interface ItemPlanoLembrete extends TextoLembrete {
  quando: Date;
}

function instanteSP(dia: Dia, hora: string): Date {
  const [h, m] = hora.split(':').map(Number) as [number, number];
  return new Date(inicioDoDiaSP(dia).getTime() + (h * 60 + m) * MS_MINUTO);
}

/** Plano dos próximos dias (hoje incluído), em ordem cronológica. */
export function planejarLembretes(e: EntradaPlanoLembretes): ItemPlanoLembrete[] {
  if (!e.notificacoes || !e.hora || !e.acesso) return [];
  const hoje = diaSP(e.agora);
  const limite = e.agora.getTime() + MS_MINUTO;
  const itens: ItemPlanoLembrete[] = [];
  let temasUsados = 0;

  for (let i = 0; i < (e.dias ?? DIAS_PLANO_LEMBRETES); i++) {
    const dia = somarDias(hoje, i);
    const quando = instanteSP(dia, e.hora);
    const prova = e.dataProva ? diferencaDias(e.dataProva, dia) : null;
    if (prova === 0) continue; // dia da prova: nada de lembrete
    if (quando.getTime() > limite && !(i === 0 && e.metaCumpridaHoje)) {
      const tema = e.temasFracos.length ? e.temasFracos[temasUsados % e.temasFracos.length]! : null;
      const texto = escolherLembrete({
        revisoes: i === 0 ? e.revisoesVencidas : (e.revisoesPorDia[dia] ?? 0),
        ofensiva: i === 0 ? e.ofensiva : 0,
        diasParaProva: prova !== null && prova > 0 ? prova : null,
        tema,
        temaMaisFraco: temasUsados % Math.max(1, e.temasFracos.length) === 0,
        trilhaConcluida: e.trilhaConcluida,
        diaSemana: diaDaSemana(dia),
        indice: i,
      });
      if (texto.tipo === 'tema_fraco') temasUsados++;
      itens.push({ ...texto, quando });
    }
    if (i === 0 && !e.estudouHoje && e.ofensiva >= OFENSIVA_MINIMA_AVISO) {
      const aviso = instanteSP(dia, HORA_AVISO_OFENSIVA);
      const depoisDoLembrete =
        aviso.getTime() - quando.getTime() >= INTERVALO_MINIMO_AVISO_MIN * MS_MINUTO;
      if (aviso.getTime() > limite && depoisDoLembrete)
        itens.push({ ...avisoOfensiva(e.ofensiva), quando: aviso });
    }
  }
  return itens.sort((a, b) => a.quando.getTime() - b.quando.getTime());
}

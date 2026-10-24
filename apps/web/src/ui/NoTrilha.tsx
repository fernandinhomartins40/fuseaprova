import type { TipoLicao } from '@fuse/shared';
import { IconeCheio } from './IconeTraco';
import s from './NoTrilha.module.css';

export type EstadoNoTrilha = 'concluida' | 'atual' | 'bloqueada';

export interface NoTrilhaProps {
  tipo: TipoLicao;
  estado: EstadoNoTrilha;
  titulo: string;
  /** Anel de progresso da lição atual (vezes feitas / 3). */
  anel?: number;
  /** Deslocamento horizontal do zigue-zague, em px. */
  deslocamento?: number;
  podeAbrir: boolean;
  /** Balão "COMEÇAR" acima do nó atual. */
  balao?: string | null;
  onAbrir?: () => void;
}

function descricao(tipo: TipoLicao, estado: EstadoNoTrilha): string {
  const nome = tipo === 'bau' ? 'Baú' : tipo === 'desafio' ? 'Desafio da unidade' : 'Lição';
  const est =
    estado === 'concluida'
      ? tipo === 'bau'
        ? 'aberto'
        : 'concluída'
      : estado === 'atual'
        ? 'disponível'
        : 'bloqueada';
  return `${nome}, ${est}`;
}

/** Nó da trilha: concluída (dourado), atual (laranja com anel e balão), bloqueada, baú e troféu. */
export function NoTrilha({
  tipo,
  estado,
  titulo,
  anel = 0,
  deslocamento = 0,
  podeAbrir,
  balao,
  onAbrir,
}: NoTrilhaProps) {
  const raio = 46;
  const circ = 2 * Math.PI * raio;
  const classes = [
    s.no,
    s[estado],
    tipo === 'bau' ? s.bau : '',
    tipo === 'desafio' ? s.desafio : '',
  ]
    .filter(Boolean)
    .join(' ');

  let icone;
  if (tipo === 'bau') icone = <IconeCheio nome="bau" tamanho={40} />;
  else if (tipo === 'desafio') icone = <IconeCheio nome="trofeu" tamanho={34} />;
  else if (estado === 'concluida') icone = <IconeCheio nome="estrela" tamanho={34} />;
  else if (estado === 'atual') icone = <IconeCheio nome="play" tamanho={34} />;
  else icone = <IconeCheio nome="cadeado" tamanho={28} />;

  return (
    <div className={s.posicao} style={{ transform: `translateX(${deslocamento}px)` }}>
      {balao ? (
        <div className={s.balao} aria-hidden="true">
          {balao}
        </div>
      ) : null}
      <div className={s.envoltorio}>
        {estado === 'atual' && tipo !== 'bau' ? (
          <svg className={s.anel} viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={raio} className={s.anelTrilho} />
            <circle
              cx="50"
              cy="50"
              r={raio}
              className={s.anelValor}
              strokeDasharray={`${circ * Math.max(0, Math.min(1, anel))} ${circ}`}
            />
          </svg>
        ) : null}
        <button
          type="button"
          className={classes}
          disabled={!podeAbrir}
          aria-label={`${titulo}. ${descricao(tipo, estado)}`}
          onClick={onAbrir}
        >
          <span className={s.icone}>{icone}</span>
        </button>
      </div>
    </div>
  );
}

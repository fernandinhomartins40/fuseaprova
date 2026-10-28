/**
 * Componentes visuais do painel admin (botões, campos, estados, tabela, modal, paginação).
 */
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../api';
import { BASE_ADMIN, juntarClasses, type TomSelo } from '../util';
import { TITULO_RAIZ_CONTEUDO, useTopoPainel } from './topo';
import s from './ui.module.css';

/* ------------------------------------------------------------ cabeçalho */

/**
 * Cabeçalho das telas de conteúdo. Dentro do layout do /super (D24): trilha "Conteúdo › Tela",
 * o título vai para a barra superior no celular e o `document.title` acompanha.
 */
export function Cabecalho(props: { titulo: string; subtitulo?: ReactNode; acoes?: ReactNode }) {
  const topo = useTopoPainel();
  const { titulo } = props;
  const definir = topo?.definirTopo;
  useEffect(() => {
    if (!definir) return;
    definir({ titulo });
    document.title = `${titulo} · Conteúdo · Fuse Aprova`;
  }, [definir, titulo]);
  const naRaiz = titulo === TITULO_RAIZ_CONTEUDO;
  return (
    <header className={s.cabecalho}>
      <div>
        {topo ? (
          <nav aria-label="Você está em" className={topo.celular ? s.oculto : undefined}>
            <ol className={s.trilha}>
              <li>{naRaiz ? 'Conteúdo' : <Link to={BASE_ADMIN}>Conteúdo</Link>}</li>
              {naRaiz ? null : <li>{titulo}</li>}
            </ol>
          </nav>
        ) : null}
        <h1 className={juntarClasses(s.titulo, topo?.celular && s.oculto)}>{props.titulo}</h1>
        {props.subtitulo ? <p className={s.subtitulo}>{props.subtitulo}</p> : null}
      </div>
      {props.acoes ? <div className={s.acoes}>{props.acoes}</div> : null}
    </header>
  );
}

export function TituloSecao({ children }: { children: ReactNode }) {
  return <h2 className={s.secaoTitulo}>{children}</h2>;
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={juntarClasses(s.cartao, className)}>{children}</section>;
}

/* --------------------------------------------------------------- botões */

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma';

export function Botao({
  variante = 'secundario',
  pequeno,
  carregando,
  className,
  children,
  type = 'button',
  disabled,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  pequeno?: boolean;
  carregando?: boolean;
}) {
  return (
    <button
      type={type}
      className={juntarClasses(s.botao, s[variante], pequeno && s.pequeno, className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? 'Aguarde…' : children}
    </button>
  );
}

/* --------------------------------------------------------------- campos */

interface PropsCampoBase {
  rotulo: string;
  erro?: string | undefined;
  ajuda?: ReactNode;
}

function CampoCaixa(props: {
  id: string;
  rotulo: string;
  erro?: string | undefined;
  ajuda?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.campo}>
      <label className={s.rotulo} htmlFor={props.id}>
        {props.rotulo}
      </label>
      {props.children}
      {props.ajuda ? (
        <span className={s.ajuda} id={`${props.id}-ajuda`}>
          {props.ajuda}
        </span>
      ) : null}
      {props.erro ? (
        <span className={s.erroCampo} id={`${props.id}-erro`} role="alert">
          {props.erro}
        </span>
      ) : null}
    </div>
  );
}

function descritoPor(id: string, erro?: string, ajuda?: ReactNode): string | undefined {
  const ids = [ajuda ? `${id}-ajuda` : null, erro ? `${id}-erro` : null].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  className,
  ...resto
}: PropsCampoBase & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <CampoCaixa id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <input
        id={id}
        className={juntarClasses(s.entrada, erro && s.entradaErro, className)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor(id, erro, ajuda)}
        {...resto}
      />
    </CampoCaixa>
  );
}

export function CampoArea({
  rotulo,
  erro,
  ajuda,
  className,
  ...resto
}: PropsCampoBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <CampoCaixa id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <textarea
        id={id}
        className={juntarClasses(s.entrada, erro && s.entradaErro, className)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor(id, erro, ajuda)}
        {...resto}
      />
    </CampoCaixa>
  );
}

export interface OpcaoSelecao {
  valor: string;
  rotulo: string;
}

export function CampoSelecao({
  rotulo,
  erro,
  ajuda,
  opcoes,
  vazio,
  className,
  ...resto
}: PropsCampoBase &
  SelectHTMLAttributes<HTMLSelectElement> & {
    opcoes: readonly OpcaoSelecao[];
    /** Texto da opção vazia (sem valor), se houver. */
    vazio?: string;
  }) {
  const id = useId();
  return (
    <CampoCaixa id={id} rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <select
        id={id}
        className={juntarClasses(s.entrada, erro && s.entradaErro, className)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor(id, erro, ajuda)}
        {...resto}
      >
        {vazio !== undefined ? <option value="">{vazio}</option> : null}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </CampoCaixa>
  );
}

export function Marcar({
  rotulo,
  ...resto
}: { rotulo: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className={s.marcar}>
      <input type="checkbox" {...resto} />
      <span>{rotulo}</span>
    </label>
  );
}

/** Converte um objeto em opções de seleção. */
export function opcoesDe(nomes: Record<string, string>): OpcaoSelecao[] {
  return Object.entries(nomes).map(([valor, rotulo]) => ({ valor, rotulo }));
}

/* ---------------------------------------------------------------- selos */

export function Selo({ tom = 'neutro', children }: { tom?: TomSelo; children: ReactNode }) {
  return <span className={juntarClasses(s.selo, s[`tom-${tom}`])}>{children}</span>;
}

/* --------------------------------------------------------------- estados */

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className={juntarClasses(s.estado, s.carregando)} role="status" aria-live="polite">
      {texto}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className={s.estado}>{children}</div>;
}

export function ErroCaixa({ erro, tentar }: { erro: unknown; tentar?: () => void }) {
  return (
    <div className={juntarClasses(s.alerta, s.alertaErro)} role="alert">
      {mensagemDeErro(erro)}
      {tentar ? (
        <>
          {' '}
          <Botao pequeno variante="fantasma" onClick={tentar}>
            Tentar de novo
          </Botao>
        </>
      ) : null}
    </div>
  );
}

export function Alerta({
  tom,
  children,
}: {
  tom: 'erro' | 'sucesso' | 'aviso' | 'info';
  children: ReactNode;
}) {
  const classe = {
    erro: s.alertaErro,
    sucesso: s.alertaSucesso,
    aviso: s.alertaAviso,
    info: s.alertaInfo,
  }[tom];
  return (
    <div className={juntarClasses(s.alerta, classe)} role={tom === 'erro' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

/**
 * Carregando / erro / vazio / conteúdo de uma consulta do TanStack Query.
 */
export function Consulta<T>(props: {
  consulta: { isPending: boolean; isError: boolean; error: unknown; data: T | undefined; refetch: () => unknown };
  vazio?: (d: T) => boolean;
  textoVazio?: ReactNode;
  children: (d: T) => ReactNode;
}) {
  const { consulta } = props;
  if (consulta.isPending) return <Carregando />;
  if (consulta.isError || consulta.data === undefined) {
    return <ErroCaixa erro={consulta.error} tentar={() => void consulta.refetch()} />;
  }
  if (props.vazio?.(consulta.data)) return <Vazio>{props.textoVazio ?? 'Nada por aqui.'}</Vazio>;
  return <>{props.children(consulta.data)}</>;
}

/* ---------------------------------------------------------------- tabela */

export function Tabela({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  return (
    <div className={s.tabelaCaixa}>
      <table className={s.tabela} aria-label={rotulo}>
        {children}
      </table>
    </div>
  );
}

export function Paginacao(props: {
  pagina: number;
  porPagina: number;
  total: number;
  aoMudar: (pagina: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(props.total / props.porPagina));
  const inicio = props.total === 0 ? 0 : (props.pagina - 1) * props.porPagina + 1;
  const fim = Math.min(props.total, props.pagina * props.porPagina);
  return (
    <nav className={s.paginacao} aria-label="Paginação">
      <span>
        {inicio}–{fim} de {props.total.toLocaleString('pt-BR')}
      </span>
      <span className={s.acoes}>
        <Botao
          pequeno
          disabled={props.pagina <= 1}
          onClick={() => props.aoMudar(props.pagina - 1)}
        >
          Anterior
        </Botao>
        <span>
          Página {props.pagina} de {paginas}
        </span>
        <Botao
          pequeno
          disabled={props.pagina >= paginas}
          onClick={() => props.aoMudar(props.pagina + 1)}
        >
          Próxima
        </Botao>
      </span>
    </nav>
  );
}

/* ----------------------------------------------------------------- modal */

export function Modal(props: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largo?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const { aberto, aoFechar } = props;

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const caixa = ref.current;
    const focavel = caixa?.querySelector<HTMLElement>(
      'input, textarea, select, button:not([data-fechar])',
    );
    (focavel ?? caixa)?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      anterior?.focus?.();
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div
      className={s.fundoModal}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        ref={ref}
        className={juntarClasses(s.modal, props.largo && s.modalLargo)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
      >
        <h2 id={idTitulo} className={s.modalTitulo}>
          {props.titulo}
        </h2>
        {props.children}
        {props.rodape ? <div className={s.modalRodape}>{props.rodape}</div> : null}
      </div>
    </div>
  );
}

export { s as estilos };

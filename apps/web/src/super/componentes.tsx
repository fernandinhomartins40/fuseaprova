/**
 * Componentes do /super (D13): contexto do layout, cabeçalho de página, folha que sobe de
 * baixo no celular (modal no desktop), reconfirmação de senha ou TOTP, números e listas
 * que viram cartões no celular.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import type { Reconfirmacao } from '@fuse/shared/api';
import { Botao, CampoTexto, Modal, estilos as a } from '../admin/componentes/ui';
import { juntarClasses } from '../admin/util';
import { Icone } from './icones';
import type { Faixa } from './midia';
import s from './super.module.css';

/* ------------------------------------------------------------ contexto */

export interface CtxLayout {
  faixa: Faixa;
  /** A tela informa o título e se é um detalhe (mostra "voltar" na barra do celular). */
  definirTopo: (t: { titulo: string; voltar?: string | undefined; acoes?: ReactNode }) => void;
  /** Recarrega o /me do app (depois do 2FA); resolve quando o /me novo chegou. */
  atualizarSessao: () => Promise<void> | void;
  sair: () => void;
}

export const ContextoLayout = createContext<CtxLayout>({
  faixa: 'desktop',
  definirTopo: () => undefined,
  atualizarSessao: () => undefined,
  sair: () => undefined,
});

export const useLayout = () => useContext(ContextoLayout);
export const useCelular = () => useLayout().faixa === 'mobile';

/* ------------------------------------------------------- cabeçalho de página */

export interface Migalha {
  rotulo: string;
  para?: string;
}

/**
 * Cabeçalho de página: título, trilha (breadcrumb) e ações. No celular, o título e o
 * "voltar" vão para a barra superior fixa, e as ações ficam no topo do conteúdo.
 */
export function Pagina(props: {
  titulo: string;
  trilha?: Migalha[];
  voltar?: string;
  acoes?: ReactNode;
  subtitulo?: ReactNode;
  children: ReactNode;
}) {
  const { definirTopo, faixa } = useLayout();
  const { titulo, voltar } = props;
  useEffect(() => {
    definirTopo({ titulo, voltar });
    document.title = `${titulo} · Superadmin · Fuse Aprova`;
  }, [definirTopo, titulo, voltar]);
  return (
    <div className={voltar && faixa === 'mobile' ? s.empilhada : undefined}>
      <header className={s.pagina}>
        <div>
          {props.trilha?.length ? (
            <nav aria-label="Você está em">
              <ol className={s.trilha}>
                {props.trilha.map((m) => (
                  <li key={m.rotulo}>{m.para ? <Link to={m.para}>{m.rotulo}</Link> : m.rotulo}</li>
                ))}
              </ol>
            </nav>
          ) : null}
          <h1 className={s.tituloPagina}>{titulo}</h1>
          {props.subtitulo ? <p className={a.subtitulo}>{props.subtitulo}</p> : null}
        </div>
        {props.acoes ? <div className={s.acoesPagina}>{props.acoes}</div> : null}
      </header>
      <div className={s.corpoPagina}>{props.children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- folha */

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * No celular: folha que sobe de baixo, com alça (arrastar para baixo fecha), foco preso e
 * Esc para fechar. `cheia` = tela cheia (ações sensíveis). No tablet/desktop: o modal do admin.
 */
export function Folha(props: {
  titulo: string;
  aberta: boolean;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  cheia?: boolean;
  larga?: boolean;
}) {
  const { faixa } = useLayout();
  const { aberta } = props;
  // Referência estável: as telas passam funções novas a cada render, e o efeito de foco
  // (aqui e no Modal do admin) rodaria de novo a cada tecla, roubando o foco do campo.
  const fecharAtual = useRef(props.aoFechar);
  fecharAtual.current = props.aoFechar;
  const aoFechar = useCallback(() => fecharAtual.current(), []);
  const ref = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const [arraste, setArraste] = useState(0);
  const inicio = useRef<number | null>(null);
  const celular = faixa === 'mobile';

  useEffect(() => {
    if (!aberta || !celular) return;
    const anterior = document.activeElement as HTMLElement | null;
    const caixa = ref.current;
    const primeiro = caixa?.querySelector<HTMLElement>('input, textarea, select, button:not([data-fechar])');
    (primeiro ?? caixa)?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        aoFechar();
        return;
      }
      if (e.key !== 'Tab' || !caixa) return;
      const lista = [...caixa.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (!lista.length) return;
      const prim = lista[0]!;
      const ult = lista[lista.length - 1]!;
      if (e.shiftKey && document.activeElement === prim) {
        e.preventDefault();
        ult.focus();
      } else if (!e.shiftKey && document.activeElement === ult) {
        e.preventDefault();
        prim.focus();
      }
    };
    document.addEventListener('keydown', tecla);
    const corpo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = corpo;
      anterior?.focus?.();
    };
  }, [aberta, celular, aoFechar]);

  if (!aberta) return null;
  if (!celular) {
    return (
      <Modal titulo={props.titulo} aberto aoFechar={aoFechar} rodape={props.rodape} largo={props.larga ?? false}>
        {props.children}
      </Modal>
    );
  }
  const soltar = () => {
    if (arraste > 90) aoFechar();
    setArraste(0);
    inicio.current = null;
  };
  return (
    <div
      className={s.fundoFolha}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={juntarClasses(s.folha, props.cheia && s.folhaCheia)}
        style={arraste ? { transform: `translateY(${arraste}px)` } : undefined}
      >
        <button
          type="button"
          className={s.alca}
          aria-label="Arraste para baixo ou toque para fechar"
          data-fechar
          onClick={aoFechar}
          onPointerDown={(e) => {
            inicio.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (inicio.current !== null) setArraste(Math.max(0, e.clientY - inicio.current));
          }}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        />
        <div className={s.folhaTopo}>
          <h2 id={idTitulo}>{props.titulo}</h2>
          <button type="button" className={s.botaoIcone} aria-label="Fechar" data-fechar onClick={aoFechar} style={{ color: 'var(--adm-texto-suave)' }}>
            ✕
          </button>
        </div>
        <div className={s.folhaCorpo}>{props.children}</div>
        {props.rodape ? <div className={s.folhaRodape}>{props.rodape}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- reconfirmação */

/**
 * Senha da conta ou código do app autenticador, pedidos em toda ação sensível.
 * Devolve `null` enquanto não está preenchido.
 */
export function useReconfirmacao() {
  const [modo, setModo] = useState<'senha' | 'codigo'>('senha');
  const [valor, setValor] = useState('');
  const nomeGrupo = useId();
  const pronto = modo === 'senha' ? valor.length > 0 : /^\d{6}$/.test(valor.replace(/\s+/g, ''));
  const confirmacao: Reconfirmacao | null = pronto ? (modo === 'senha' ? { senha: valor } : { codigo: valor.replace(/\s+/g, '') }) : null;
  const limpar = useCallback(() => setValor(''), []);
  const campo = (
    <fieldset style={{ border: '1px solid var(--adm-borda)', borderRadius: 12, padding: '10px 12px', margin: '12px 0 0' }}>
      <legend style={{ fontWeight: 800, padding: '0 4px' }}>Confirme que é você</legend>
      <div className={a.acoes} role="radiogroup" aria-label="Como confirmar" style={{ marginBottom: 8 }}>
        <label className={a.marcar}>
          <input type="radio" name={nomeGrupo} checked={modo === 'senha'} onChange={() => { setModo('senha'); setValor(''); }} />
          <span>Senha</span>
        </label>
        <label className={a.marcar}>
          <input type="radio" name={nomeGrupo} checked={modo === 'codigo'} onChange={() => { setModo('codigo'); setValor(''); }} />
          <span>Código do app</span>
        </label>
      </div>
      {modo === 'senha' ? (
        <CampoTexto rotulo="Sua senha" type="password" autoComplete="current-password" value={valor} onChange={(e) => setValor(e.target.value)} />
      ) : (
        <CampoTexto
          rotulo="Código de 6 dígitos"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      )}
    </fieldset>
  );
  return { confirmacao, campo, limpar };
}

/* --------------------------------------------------------------- números */

export function Kpi(props: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; testId?: string }) {
  return (
    <div className={s.kpi} data-testid={props.testId}>
      <div className={s.kpiRotulo}>{props.rotulo}</div>
      <div className={s.kpiValor}>{props.valor}</div>
      {props.detalhe ? <div className={s.kpiDetalhe}>{props.detalhe}</div> : null}
    </div>
  );
}

/* -------------------------------------------------- lista → cartões */

/** Item de lista no celular: título, subtítulo, valor à direita e chevron. */
export function CartaoLinha(props: { para?: string; aoTocar?: () => void; titulo: ReactNode; sub?: ReactNode; valor?: ReactNode; extra?: ReactNode }) {
  const corpo = (
    <>
      <div className={s.cartaoCorpo}>
        <div className={s.cartaoTitulo}>{props.titulo}</div>
        {props.sub ? <div className={s.cartaoSub}>{props.sub}</div> : null}
        {props.extra}
      </div>
      {props.valor !== undefined ? <div className={s.cartaoValor}>{props.valor}</div> : null}
      {props.para || props.aoTocar ? (
        <span className={s.chevron}>
          <Icone nome="chevron" tamanho={20} />
        </span>
      ) : null}
    </>
  );
  if (props.para) {
    return (
      <li>
        <Link className={s.cartaoLinha} to={props.para}>
          {corpo}
        </Link>
      </li>
    );
  }
  if (props.aoTocar) {
    return (
      <li>
        <button type="button" className={s.cartaoLinha} onClick={props.aoTocar}>
          {corpo}
        </button>
      </li>
    );
  }
  return (
    <li>
      <div className={s.cartaoLinha}>{corpo}</div>
    </li>
  );
}

export function Cartoes({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  return (
    <ul className={s.cartoes} aria-label={rotulo}>
      {children}
    </ul>
  );
}

/* ------------------------------------------------------- ações da ficha */

export interface ItemAcao {
  rotulo: string;
  aoClicar: () => void;
  variante?: 'primario' | 'perigo';
  carregando?: boolean;
  /** Fica à mostra no celular (as outras vão para a folha "Mais ações"). */
  principal?: boolean;
}

/**
 * Barra de ações de uma ficha. Desktop e tablet: todos os botões. Celular: só as principais,
 * e "Mais ações" abre uma folha com o resto (alvos de 52 px).
 */
export function AcoesFicha({ itens, rotulo }: { itens: (ItemAcao | false | null | undefined)[]; rotulo: string }) {
  const celular = useCelular();
  const [aberta, setAberta] = useState(false);
  const lista = itens.filter((i): i is ItemAcao => !!i);
  if (!lista.length) return null;
  const visiveis = celular ? lista.filter((i) => i.principal) : lista;
  const resto = celular ? lista.filter((i) => !i.principal) : [];
  return (
    <div className={s.acoesFicha} role="group" aria-label={rotulo}>
      {visiveis.map((i) => (
        <Botao key={i.rotulo} variante={i.variante ?? 'secundario'} carregando={i.carregando ?? false} onClick={i.aoClicar}>
          {i.rotulo}
        </Botao>
      ))}
      {resto.length ? (
        <>
          <Botao onClick={() => setAberta(true)} aria-haspopup="dialog">
            <Icone nome="mais" tamanho={18} /> Mais ações
          </Botao>
          <Folha titulo="Ações" aberta={aberta} aoFechar={() => setAberta(false)}>
            <ul className={s.listaMais}>
              {resto.map((i) => (
                <li key={i.rotulo}>
                  <button
                    type="button"
                    className={i.variante === 'perigo' ? s.perigoItem : undefined}
                    disabled={i.carregando}
                    onClick={() => {
                      setAberta(false);
                      i.aoClicar();
                    }}
                  >
                    {i.rotulo}
                  </button>
                </li>
              ))}
            </ul>
          </Folha>
        </>
      ) : null}
    </div>
  );
}

/** Botão "Atualizar" (no lugar de puxar para atualizar). */
export function BotaoAtualizar({ aoClicar, carregando }: { aoClicar: () => void; carregando?: boolean }) {
  return (
    <Botao onClick={aoClicar} carregando={carregando ?? false} aria-label="Atualizar">
      <Icone nome="atualizar" tamanho={18} /> Atualizar
    </Botao>
  );
}

export { s as estilosSuper };

import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { iniciais } from '@fuse/shared';
import { Avatar } from './Avatar';
import { Botao3D } from './Botao3D';
import { Capi } from './Capi';
import { IconeCheio, IconeTraco } from './IconeTraco';
import { Imagem } from './Imagem';
import s from './Layout.module.css';

/** Coluna de conteúdo com respiro lateral; `comNav` reserva espaço para a navegação. */
export function Pagina({
  children,
  comNav = false,
  comRodapeFixo = false,
  className,
  rotulo,
}: {
  children: ReactNode;
  comNav?: boolean;
  comRodapeFixo?: boolean;
  className?: string;
  rotulo?: string;
}) {
  return (
    <main
      className={[
        s.pagina,
        comNav ? s.comNav : '',
        comRodapeFixo ? s.comRodape : '',
        className ?? '',
      ].join(' ')}
      aria-label={rotulo}
    >
      {children}
    </main>
  );
}

/** Cabeçalho das abas: logo completa à esquerda, avatar (ou ação) à direita. */
export function CabecalhoApp({
  nome,
  id,
  direita,
}: {
  nome?: string;
  id?: string;
  direita?: ReactNode;
}) {
  return (
    <header className={s.cabecalho}>
      <Link to="/aprender" className={s.logo} aria-label="Fuse Aprova, ir para o início">
        <Imagem nome="logo-completa" tamanho={136} carregamento="eager" />
      </Link>
      {direita ??
        (nome ? (
          <Link
            to="/perfil"
            className={s.avatarLink}
            // O nome acessível contém o texto visível, as iniciais (WCAG 2.5.3).
            aria-label={`Abrir seu perfil, ${iniciais(nome)}`}
          >
            <Avatar nome={nome} id={id} suave tamanho={46} />
          </Link>
        ) : null)}
    </header>
  );
}

/** Cabeçalho de fluxo: voltar e, opcionalmente, "Etapa n de 2" com barra. */
export function CabecalhoVoltar({
  aoVoltar,
  para,
  etapa,
  titulo,
  direita,
  semVoltar = false,
}: {
  semVoltar?: boolean;
  aoVoltar?: () => void;
  para?: string;
  etapa?: { atual: number; total: number };
  titulo?: string;
  direita?: ReactNode;
}) {
  const navegar = useNavigate();
  return (
    <header className={s.voltar}>
      {semVoltar ? (
        <span />
      ) : (
        <button
          type="button"
          className={s.botaoIcone}
          aria-label="Voltar"
          onClick={() => (aoVoltar ? aoVoltar() : para ? navegar(para) : navegar(-1))}
        >
          <IconeTraco nome="voltar" tamanho={26} espessura={2.6} />
        </button>
      )}
      <div className={s.voltarMeio}>
        {etapa ? (
          <>
            <span className={s.etapaTexto}>
              Etapa {etapa.atual} de {etapa.total}
            </span>
            <div
              className={s.etapaBarra}
              role="progressbar"
              aria-label="Progresso do cadastro"
              aria-valuemin={0}
              aria-valuemax={etapa.total}
              aria-valuenow={etapa.atual}
            >
              <div
                className={s.etapaValor}
                style={{ width: `${(etapa.atual / etapa.total) * 100}%` }}
              />
            </div>
          </>
        ) : titulo ? (
          <span className={s.voltarTitulo}>{titulo}</span>
        ) : null}
      </div>
      <div className={s.voltarDireita}>{direita}</div>
    </header>
  );
}

/** Contadores do cabeçalho da Trilha: chip do concurso, ofensiva e gemas. */
export function Contadores({
  sigla,
  ofensiva,
  gemas,
  diasParaProva,
}: {
  sigla: string;
  ofensiva: number;
  gemas: number;
  diasParaProva?: number | null;
}) {
  const [a, b] = sigla.split('·').map((p) => p.trim());
  return (
    <div className={s.contadores}>
      <Link
        to="/concurso"
        className={s.chipConcurso}
        aria-label={`Sobre o concurso: ${a} ${b}${diasParaProva != null ? ` ${diasParaProva}d` : ''}`}
      >
        {/* Os espaços entre os spans não aparecem (flex), mas separam as palavras no nome. */}
        <span className={s.chipA}>{a}</span> <span className={s.chipB}>{b}</span>{' '}
        {diasParaProva != null ? <span className={s.chipDias}>{diasParaProva}d</span> : null}
      </Link>
      <span className={s.contador} role="img" aria-label={`Ofensiva de ${ofensiva} dias`}>
        <IconeCheio nome="chama" tamanho={24} />
        <span className={s.numLaranja}>{ofensiva}</span>
      </span>
      <span className={s.contador} role="img" aria-label={`${gemas} gemas`}>
        <IconeCheio nome="gema" tamanho={24} />
        <span className={s.numAzul}>{gemas}</span>
      </span>
    </div>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className={s.carregando} role="status">
      <span className={s.giro} aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function ErroTela({ mensagem, onTentar }: { mensagem: string; onTentar?: () => void }) {
  return (
    <div className={s.erroTela} role="alert">
      <Capi pose="incentivando" tamanho={150} />
      <p className={s.erroTexto}>{mensagem}</p>
      {onTentar ? (
        <Botao3D variante="secundario" onClick={onTentar}>
          TENTAR DE NOVO
        </Botao3D>
      ) : null}
    </div>
  );
}

/** Título de seção ("Sua preparação") com ação opcional à direita. */
export function TituloSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className={s.tituloSecao}>
      <h2>{children}</h2>
      {acao}
    </div>
  );
}

/** Cartão branco padrão das telas novas. */
export function Cartao({
  children,
  className,
  como: Como = 'div',
}: {
  children: ReactNode;
  className?: string;
  como?: 'div' | 'section' | 'article' | 'li';
}) {
  return <Como className={[s.cartao, className ?? ''].join(' ')}>{children}</Como>;
}

/** Linha de lista clicável com ícone 3D, título, subtítulo e chevron (Revisar, Perfil). */
export function LinhaLista({
  icone,
  fundoIcone,
  titulo,
  subtitulo,
  direita,
  onClick,
  children,
  rotulo,
}: {
  icone: ReactNode;
  fundoIcone?: string;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  direita?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  rotulo?: string;
}) {
  const conteudo = (
    <>
      <span className={s.linhaIcone} data-fundo={fundoIcone}>
        {icone}
      </span>
      <span className={s.linhaTextos}>
        <span className={s.linhaTitulo}>{titulo}</span>
        {subtitulo ? <span className={s.linhaSub}>{subtitulo}</span> : null}
        {children}
      </span>
      {direita}
      {onClick ? <IconeTraco nome="chevron" tamanho={22} className={s.linhaChevron} /> : null}
    </>
  );
  return onClick ? (
    <button type="button" className={s.linha} onClick={onClick} aria-label={rotulo}>
      {conteudo}
    </button>
  ) : (
    <div className={s.linha}>{conteudo}</div>
  );
}

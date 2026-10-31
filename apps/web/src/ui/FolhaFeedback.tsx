import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { AulaQuestao } from '@fuse/shared/api';
import { AulaTema } from './AulaTema';
import { Botao3D } from './Botao3D';
import { Chip } from './Chip';
import { Imagem } from './Imagem';
import { IconeTraco } from './IconeTraco';
import s from './FolhaFeedback.module.css';

export interface FolhaFeedbackProps {
  tipo: 'acerto' | 'erro';
  titulo: string;
  /** Selo "+10 XP" (acerto). */
  xp?: number | null;
  /** COMBO × n (a partir de 3 acertos seguidos; só visual). */
  combo?: number | null;
  explicacao: ReactNode;
  /** Cartão "Dica de bolso" (erro). */
  dicaBolso?: string | null;
  /** Linha "Essa questão volta na sua revisão amanhã". */
  linhaRevisao?: string | null;
  /** D28: aba "Entenda o tema" (a mesma mini-aula de antes de responder). */
  aula?: AulaQuestao | null;
  /** D28: aba "Anotar" (editor da anotação pessoal). */
  anotacao?: ReactNode;
  textoBotao: string;
  onContinuar: () => void;
  /** Rodapé da folha (link "Reportar problema"). */
  rodape?: ReactNode;
  /** Aviso extra (ex.: resposta guardada offline). */
  aviso?: ReactNode;
}

type Estado = 'recolhida' | 'aberta' | 'cheia';
type Aba = 'resposta' | 'tema' | 'anotar';

const CHAVE_DETALHE = 'fa:folha-detalhe-aberto';
/**
 * Toques no botão de continuar logo que a folha sobe são ignorados: o VERIFICAR fica no mesmo
 * lugar, e um toque duplo pulava a correção sem o aluno ver.
 */
export const TRAVA_CONTINUAR_MS = 700;

/** Preferência por viewer: a folha abre com o detalhe à vista ou recolhida. Padrão: aberta. */
function lerAberta(): boolean {
  try {
    return localStorage.getItem(CHAVE_DETALHE) !== '0';
  } catch {
    return true;
  }
}

function gravarAberta(aberta: boolean): void {
  try {
    localStorage.setItem(CHAVE_DETALHE, aberta ? '1' : '0');
  } catch {
    // sem armazenamento (janela privada etc.): vale só para esta tela
  }
}

/**
 * Folha de feedback: fixa embaixo, sobe em 200 ms. Verde no acerto, vermelha no erro.
 * O título fica numa região role="status" para o leitor de tela anunciar.
 *
 * Três tamanhos: recolhida (só o resultado, para ver a questão corrigida), aberta e tela cheia.
 * As abas mostram a explicação da resposta, a mini-aula do tema e a anotação do aluno. O botão de
 * continuar fica sempre à vista e só avança quando o aluno toca nele.
 */
export function FolhaFeedback({
  tipo,
  titulo,
  xp,
  combo,
  explicacao,
  dicaBolso,
  linhaRevisao,
  aula,
  anotacao,
  textoBotao,
  onContinuar,
  rodape,
  aviso,
}: FolhaFeedbackProps) {
  const botao = useRef<HTMLButtonElement>(null);
  const idDetalhe = useId();
  const [estado, setEstado] = useState<Estado>(() => (lerAberta() ? 'aberta' : 'recolhida'));
  const [aba, setAba] = useState<Aba>('resposta');
  const montadaEm = useRef(Date.now());
  const [travado, setTravado] = useState(true);
  useEffect(() => {
    montadaEm.current = Date.now();
    botao.current?.focus({ preventScroll: true });
    const t = setTimeout(() => setTravado(false), TRAVA_CONTINUAR_MS);
    return () => clearTimeout(t);
  }, []);

  const mudar = (novo: Estado) => {
    if (novo !== 'cheia') gravarAberta(novo === 'aberta');
    setEstado(novo);
  };
  const abrirAba = (a: Aba) => {
    setAba(a);
    if (estado === 'recolhida') mudar('aberta');
  };
  const continuar = () => {
    if (Date.now() - montadaEm.current < TRAVA_CONTINUAR_MS) return;
    onContinuar();
  };

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'resposta', rotulo: 'Resposta' },
    ...(aula ? [{ id: 'tema' as const, rotulo: 'Entenda o tema' }] : []),
    ...(anotacao ? [{ id: 'anotar' as const, rotulo: 'Anotar' }] : []),
  ];
  const aberta = estado !== 'recolhida';

  return (
    <section
      className={[s.folha, s[tipo], estado === 'cheia' ? s.cheia : ''].join(' ')}
      aria-label="Resultado da resposta"
    >
      <div className={s.cartao}>
        <div className={s.topo}>
          <div role="status" aria-live="polite" className={s.status}>
            <h2 className={s.titulo}>
              <span className={s.iconeTitulo} aria-hidden="true">
                <IconeTraco nome={tipo === 'acerto' ? 'check' : 'x'} tamanho={18} espessura={3.4} />
              </span>
              {titulo}
            </h2>
            <div className={s.selos}>
              {xp ? <span className={s.xp}>+{xp} XP</span> : null}
              {combo ? <Chip variante="laranja">COMBO × {combo}</Chip> : null}
            </div>
          </div>
          {estado === 'aberta' ? (
            <Imagem
              nome={tipo === 'acerto' ? 'mascote-celebrando' : 'mascote-incentivando'}
              tamanho={60}
              className={s.mascote}
              carregamento="eager"
            />
          ) : null}
          <div className={s.controles}>
            {estado !== 'cheia' ? (
              <button
                type="button"
                className={s.controle}
                aria-label="Ver em tela cheia"
                onClick={() => {
                  if (estado === 'recolhida') setAba('resposta');
                  mudar('cheia');
                }}
              >
                <IconeTraco nome="expandir" tamanho={20} />
              </button>
            ) : (
              <button
                type="button"
                className={s.controle}
                aria-label="Sair da tela cheia"
                onClick={() => mudar('aberta')}
              >
                <IconeTraco nome="recolher" tamanho={20} />
              </button>
            )}
            <button
              type="button"
              className={s.controle}
              aria-expanded={aberta}
              aria-controls={idDetalhe}
              aria-label={aberta ? 'Recolher explicação' : 'Abrir explicação'}
              onClick={() => mudar(aberta ? 'recolhida' : 'aberta')}
            >
              <span className={aberta ? s.chevronAberto : s.chevron} aria-hidden="true">
                <IconeTraco nome="chevronBaixo" tamanho={20} espessura={3} />
              </span>
            </button>
          </div>
        </div>

        {!aberta ? (
          <div className={s.atalhos}>
            {abas.map((a) => (
              <button key={a.id} type="button" className={s.atalho} onClick={() => abrirAba(a.id)}>
                {a.id === 'resposta'
                  ? dicaBolso
                    ? 'Ver explicação e dica de bolso'
                    : 'Ver explicação'
                  : a.rotulo}
              </button>
            ))}
          </div>
        ) : null}

        <div id={idDetalhe} className={s.detalhe} hidden={!aberta}>
          {abas.length > 1 ? (
            <div className={s.abas} role="tablist" aria-label="Detalhes da resposta">
              {abas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  id={`${idDetalhe}-${a.id}`}
                  aria-selected={aba === a.id}
                  aria-controls={`${idDetalhe}-painel`}
                  className={aba === a.id ? s.abaAtiva : s.aba}
                  onClick={() => setAba(a.id)}
                >
                  {a.id === 'tema' ? <Imagem nome="icone-dica" tamanho={16} /> : null}
                  {a.id === 'anotar' ? <IconeTraco nome="lapis" tamanho={16} /> : null}
                  {a.rotulo}
                </button>
              ))}
            </div>
          ) : null}
          <div
            id={`${idDetalhe}-painel`}
            role={abas.length > 1 ? 'tabpanel' : undefined}
            aria-labelledby={abas.length > 1 ? `${idDetalhe}-${aba}` : undefined}
            className={s.painel}
          >
            {aba === 'resposta' ? (
              <>
                <div className={s.explicacao}>{explicacao}</div>
                {dicaBolso ? (
                  <div className={s.dicaBolso}>
                    <Imagem nome="icone-dica" tamanho={28} carregamento="eager" />
                    <div>
                      <strong>Dica de bolso</strong>
                      <p>{dicaBolso}</p>
                    </div>
                  </div>
                ) : null}
                {linhaRevisao ? (
                  <p className={s.linhaRevisao}>
                    <Imagem nome="icone-revisao" tamanho={24} carregamento="eager" />
                    {linhaRevisao}
                  </p>
                ) : null}
              </>
            ) : null}
            {aba === 'tema' && aula ? (
              <div className={s.cartaoBranco}>
                <AulaTema aula={aula} compacta />
              </div>
            ) : null}
            {aba === 'anotar' ? <div className={s.cartaoBranco}>{anotacao}</div> : null}
          </div>
        </div>
        {aviso}
      </div>
      <div className={s.acoes}>
        <Botao3D
          ref={botao}
          variante={tipo === 'acerto' ? 'acerto' : 'perigo'}
          onClick={continuar}
          aria-disabled={travado || undefined}
          iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
        >
          {textoBotao}
        </Botao3D>
        {rodape ? <div className={s.rodape}>{rodape}</div> : null}
      </div>
    </section>
  );
}

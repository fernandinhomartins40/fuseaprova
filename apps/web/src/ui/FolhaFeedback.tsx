import { useEffect, useRef, type ReactNode } from 'react';
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
  textoBotao: string;
  onContinuar: () => void;
  /** Rodapé da folha (link "Reportar problema"). */
  rodape?: ReactNode;
  /** Aviso extra (ex.: resposta guardada offline). */
  aviso?: ReactNode;
}

/**
 * Folha de feedback: fixa embaixo, sobe em 200 ms. Verde no acerto, vermelha no erro.
 * O texto fica numa região role="status" para o leitor de tela anunciar.
 */
export function FolhaFeedback({
  tipo,
  titulo,
  xp,
  combo,
  explicacao,
  dicaBolso,
  linhaRevisao,
  textoBotao,
  onContinuar,
  rodape,
  aviso,
}: FolhaFeedbackProps) {
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botao.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className={[s.folha, s[tipo]].join(' ')} aria-label="Resultado da resposta">
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
            <div className={s.explicacao}>{explicacao}</div>
          </div>
          <Imagem
            nome={tipo === 'acerto' ? 'mascote-celebrando' : 'mascote-incentivando'}
            tamanho={118}
            className={s.mascote}
            carregamento="eager"
          />
        </div>
        {dicaBolso ? (
          <div className={s.dicaBolso}>
            <Imagem nome="icone-dica" tamanho={28} />
            <div>
              <strong>Dica de bolso</strong>
              <p>{dicaBolso}</p>
            </div>
          </div>
        ) : null}
        {linhaRevisao ? (
          <p className={s.linhaRevisao}>
            <Imagem nome="icone-revisao" tamanho={24} />
            {linhaRevisao}
          </p>
        ) : null}
        {aviso}
      </div>
      <Botao3D
        ref={botao}
        variante={tipo === 'acerto' ? 'acerto' : 'perigo'}
        onClick={onContinuar}
        iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
      >
        {textoBotao}
      </Botao3D>
      {rodape ? <div className={s.rodape}>{rodape}</div> : null}
    </section>
  );
}

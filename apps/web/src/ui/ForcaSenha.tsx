import { Fragment } from 'react';
import { avaliarSenha, compararSenhas } from '@fuse/shared';
import { IconeTraco } from './IconeTraco';
import s from './ForcaSenha.module.css';

export interface PropsForcaSenha {
  senha: string;
  /** E-mail e nome já digitados: senha que os contém perde força. */
  pessoal?: readonly string[];
}

/**
 * Indicador de força da senha: barra de 5 segmentos, nível por extenso, dica do que melhorar e
 * lista do que já foi atendido. Só orienta: a API exige apenas o tamanho mínimo.
 * O nível é lido pelos leitores de tela (aria-live) quando muda.
 */
export function ForcaSenha({ senha, pessoal = [] }: PropsForcaSenha) {
  const a = avaliarSenha(senha, pessoal);
  const digitou = senha.length > 0;
  const cheios = digitou ? a.nivel + 1 : 0;
  return (
    <div className={[s.forca, s[`nivel${a.nivel}`]].join(' ')}>
      <div className={s.barra} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={[s.segmento, i < cheios ? s.cheio : ''].join(' ')} />
        ))}
      </div>
      <p className={s.resumo} aria-live="polite">
        {digitou ? (
          <>
            <span className={s.rotulo}>
              <span className={s.visual}>Força da senha: </span>
              {a.rotulo}
            </span>
            {a.dica ? <span className={s.dica}>{a.dica}</span> : null}
          </>
        ) : (
          <span className={s.dica}>Crie uma senha que só você saiba.</span>
        )}
      </p>
      <ul className={s.lista} aria-label="Requisitos da senha">
        {a.criterios.map((c, i) => {
          const estado = c.ok ? s.ok : digitou && c.obrigatorio ? s.falta : '';
          return (
            <Fragment key={c.id}>
              {i === 1 ? <li className={s.legenda}>Para deixar mais forte:</li> : null}
              <li className={[s.item, estado].join(' ')}>
                <span className={s.marca} aria-hidden="true">
                  <IconeTraco
                    nome={estado === s.falta ? 'x' : 'check'}
                    tamanho={11}
                    espessura={3.4}
                  />
                </span>
                <span>
                  {c.texto}
                  <span className={s.visual}>{c.ok ? ' (atendido)' : ' (não atendido)'}</span>
                </span>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}

/** Texto e tom do feedback da confirmação; null enquanto a pessoa ainda está digitando. */
export function feedbackConfirmacao(
  senha: string,
  confirma: string,
): { tom: 'ok' | 'erro'; texto: string } | null {
  const situacao = compararSenhas(senha, confirma);
  if (situacao === 'coincide') return { tom: 'ok', texto: 'As senhas coincidem.' };
  if (situacao === 'diferente') return { tom: 'erro', texto: 'As senhas ainda não coincidem.' };
  return null;
}

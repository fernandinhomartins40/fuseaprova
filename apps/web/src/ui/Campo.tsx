import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { formatarCelular, formatarCpf } from '@fuse/shared';
import { IconeTraco } from './IconeTraco';
import s from './Campo.module.css';

export type MascaraCampo = 'cpf' | 'celular';

export interface CampoProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  rotulo: string;
  valor: string;
  onValor: (valor: string) => void;
  erro?: string | null;
  /** Texto de ajuda abaixo do campo (ex.: "Para identificar seu pagamento."). */
  ajuda?: ReactNode;
  mascara?: MascaraCampo;
  /** Senha com botão de mostrar/ocultar. */
  senha?: boolean;
  /** Retorno ao vivo (ex.: "As senhas coincidem"); some quando há `erro`. */
  feedback?: { tom: 'ok' | 'erro'; texto: string } | null;
}

export function aplicarMascara(valor: string, mascara?: MascaraCampo): string {
  if (mascara === 'cpf') return formatarCpf(valor);
  if (mascara === 'celular') return formatarCelular(valor);
  return valor;
}

/** Campo de formulário: rótulo sempre visível, erro abaixo com ícone, máscara de CPF/celular. */
export function Campo({
  rotulo,
  valor,
  onValor,
  erro,
  ajuda,
  mascara,
  senha = false,
  feedback = null,
  id,
  className,
  ...resto
}: CampoProps) {
  const gerado = useId();
  const idCampo = id ?? `campo-${gerado}`;
  const idErro = `${idCampo}-erro`;
  const idAjuda = `${idCampo}-ajuda`;
  const idFeedback = `${idCampo}-feedback`;
  const [visivel, setVisivel] = useState(false);
  const tomFeedback = erro ? null : (feedback?.tom ?? null);
  const descritores = [
    erro ? idErro : null,
    ajuda ? idAjuda : null,
    tomFeedback ? idFeedback : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={[s.campo, className ?? ''].join(' ')}>
      <label htmlFor={idCampo} className={s.rotulo}>
        {rotulo}
      </label>
      <div
        className={[
          s.caixa,
          erro || tomFeedback === 'erro' ? s.comErro : '',
          tomFeedback === 'ok' ? s.comSucesso : '',
        ].join(' ')}
      >
        <input
          {...resto}
          id={idCampo}
          className={s.input}
          value={valor}
          onChange={(e) => onValor(aplicarMascara(e.target.value, mascara))}
          aria-invalid={erro || tomFeedback === 'erro' ? true : undefined}
          aria-describedby={descritores || undefined}
          type={senha ? (visivel ? 'text' : 'password') : resto.type}
          inputMode={mascara ? 'numeric' : resto.inputMode}
          {...(mascara === 'cpf'
            ? { maxLength: 14 }
            : mascara === 'celular'
              ? // cabe "+55 (42) 99999-9999" colado; a máscara reduz a 11 dígitos (R2-13)
                { maxLength: 20 }
              : {})}
        />
        {senha ? (
          <button
            type="button"
            className={s.olho}
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visivel}
          >
            <IconeTraco nome={visivel ? 'olhoFechado' : 'olho'} tamanho={22} />
          </button>
        ) : null}
      </div>
      {ajuda && !erro ? (
        <p id={idAjuda} className={s.ajuda}>
          {ajuda}
        </p>
      ) : null}
      {tomFeedback && feedback ? (
        <p
          id={idFeedback}
          className={tomFeedback === 'ok' ? s.feedbackOk : s.feedbackErro}
          aria-live="polite"
        >
          <IconeTraco
            nome={tomFeedback === 'ok' ? 'check' : 'alerta'}
            tamanho={16}
            espessura={2.8}
          />
          <span>{feedback.texto}</span>
        </p>
      ) : null}
      {erro ? (
        <p id={idErro} className={s.erro} role="alert">
          <IconeTraco nome="alerta" tamanho={16} espessura={2.6} />
          <span>{erro}</span>
        </p>
      ) : null}
    </div>
  );
}

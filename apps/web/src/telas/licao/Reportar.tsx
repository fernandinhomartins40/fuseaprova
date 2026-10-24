import { useState } from 'react';
import { NOMES_TIPO_REPORT, TIPOS_REPORT, type TipoReport } from '@fuse/shared';
import { ReportEntrada } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { Botao3D, Modal, useToast } from '../../ui';
import s from './Licao.module.css';

/** Reportar problema: gabarito errado, enunciado com erro, explicação confusa ou outro + texto. */
export function ReportarProblema({
  aberto,
  questaoId,
  onFechar,
}: {
  aberto: boolean;
  questaoId: string;
  onFechar: () => void;
}) {
  const toast = useToast();
  const [tipo, setTipo] = useState<TipoReport | null>(null);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!tipo) return;
    const corpo = { tipo, texto: texto.trim() || undefined };
    const r = ReportEntrada.safeParse(corpo);
    if (!r.success) {
      setErro(r.error.issues[0]?.message ?? 'Confira o texto.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await chamar('questaoReport', { params: { id: questaoId }, corpo });
      toast('Obrigado! Vamos revisar essa questão.', 'sucesso');
      setTipo(null);
      setTexto('');
      onFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo="Reportar problema"
      onFechar={onFechar}
      formato="folha"
      descricao="O que está errado nesta questão?"
      rodape={
        <Botao3D disabled={!tipo} carregando={enviando} onClick={() => void enviar()}>
          ENVIAR
        </Botao3D>
      }
    >
      <div role="radiogroup" aria-label="Tipo de problema" className={s.reportOpcoes}>
        {TIPOS_REPORT.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            className={[s.reportOpcao, tipo === t ? s.reportMarcada : ''].join(' ')}
            onClick={() => setTipo(t)}
          >
            {NOMES_TIPO_REPORT[t]}
          </button>
        ))}
      </div>
      <label className={s.reportTexto}>
        <span>Conte mais (opcional)</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
          rows={3}
        />
      </label>
      {erro ? (
        <p role="alert" className={s.reportErro}>
          {erro}
        </p>
      ) : null}
    </Modal>
  );
}

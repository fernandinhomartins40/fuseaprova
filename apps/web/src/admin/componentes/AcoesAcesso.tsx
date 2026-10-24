/**
 * Ações sensíveis de pagamento e acesso: reembolso (estorno no Asaas) e liberação/revogação
 * manual de acesso com motivo obrigatório (fica na auditoria).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatarReais } from '@fuse/shared';
import { LiberarAcessoEntrada } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../api';
import { cpfMascarado, dataHora } from '../util';
import { Alerta, Botao, CampoArea, estilos as s, Marcar, Modal } from './ui';

export interface PedidoParaReembolso {
  id: string;
  valorCentavos: number;
  pagoEm: string | null;
  dentroDoArrependimento: boolean;
  usuario?: { nome: string; email: string; cpfOculto: string };
}

export function ModalReembolso({ pedido, aoFechar }: { pedido: PedidoParaReembolso; aoFechar: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [foraDoPrazo, setForaDoPrazo] = useState(false);
  const qc = useQueryClient();
  const reembolsar = useMutation({
    mutationFn: () =>
      api('adminPedidoReembolso', { params: { id: pedido.id }, corpo: { motivo, foraDoPrazo } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'pedidos'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] });
    },
  });
  const motivoOk = motivo.trim().length >= 3;
  const prazoOk = pedido.dentroDoArrependimento || foraDoPrazo;

  return (
    <Modal
      titulo="Reembolsar pedido?"
      aberto
      aoFechar={aoFechar}
      rodape={
        reembolsar.isSuccess ? (
          <Botao onClick={aoFechar}>Fechar</Botao>
        ) : (
          <>
            <Botao data-fechar onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              disabled={!motivoOk || !prazoOk}
              carregando={reembolsar.isPending}
              onClick={() => reembolsar.mutate()}
            >
              Confirmar reembolso
            </Botao>
          </>
        )
      }
    >
      {reembolsar.isSuccess ? (
        <Alerta tom="sucesso">
          Estorno pedido ao Asaas. O acesso do aluno cai e as sessões são encerradas quando o webhook de estorno
          chegar.
        </Alerta>
      ) : (
        <>
          <dl className={s.dl}>
            {pedido.usuario ? (
              <>
                <dt>Aluno</dt>
                <dd>
                  {pedido.usuario.nome} · {pedido.usuario.email}
                </dd>
                <dt>CPF</dt>
                <dd className={s.mono}>{cpfMascarado(pedido.usuario.cpfOculto)}</dd>
              </>
            ) : null}
            <dt>Valor</dt>
            <dd>{formatarReais(pedido.valorCentavos)}</dd>
            <dt>Pago em</dt>
            <dd>{dataHora(pedido.pagoEm)}</dd>
          </dl>
          <Alerta tom="aviso">
            O reembolso chama o estorno no Asaas. O acesso <strong>não</strong> cai na hora: ele é revogado quando
            o webhook de estorno chegar.
          </Alerta>
          {!pedido.dentroDoArrependimento ? (
            <Marcar
              rotulo="O pagamento tem mais de 7 dias (fora do direito de arrependimento). Reembolsar mesmo assim."
              checked={foraDoPrazo}
              onChange={(e) => setForaDoPrazo(e.target.checked)}
            />
          ) : null}
          <CampoArea
            rotulo="Motivo do reembolso"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            ajuda="Obrigatório. Fica na auditoria."
          />
          {reembolsar.isError ? <Alerta tom="erro">{mensagemDeErro(reembolsar.error)}</Alerta> : null}
        </>
      )}
    </Modal>
  );
}

export function ModalAcessoManual(props: {
  usuario: { id: string; nome: string; email: string; cpfOculto: string };
  modo: 'liberar' | 'revogar';
  aoFechar: () => void;
}) {
  const { usuario, modo } = props;
  const [motivo, setMotivo] = useState('');
  const [tentou, setTentou] = useState(false);
  const qc = useQueryClient();
  const executar = useMutation({
    mutationFn: () =>
      modo === 'liberar'
        ? api('adminUsuarioLiberarAcesso', { params: { id: usuario.id }, corpo: { motivo } })
        : api('adminUsuarioRevogarAcesso', { params: { id: usuario.id }, corpo: { motivo } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'pedidos'] });
    },
  });
  const validacao = LiberarAcessoEntrada.safeParse({ motivo });
  const erroMotivo = validacao.success ? undefined : validacao.error.issues[0]?.message;

  return (
    <Modal
      titulo={modo === 'liberar' ? 'Liberar acesso manualmente?' : 'Revogar acesso?'}
      aberto
      aoFechar={props.aoFechar}
      rodape={
        executar.isSuccess ? (
          <Botao onClick={props.aoFechar}>Fechar</Botao>
        ) : (
          <>
            <Botao data-fechar onClick={props.aoFechar}>
              Cancelar
            </Botao>
            <Botao
              variante={modo === 'liberar' ? 'primario' : 'perigo'}
              carregando={executar.isPending}
              onClick={() => {
                setTentou(true);
                if (validacao.success) executar.mutate();
              }}
            >
              {modo === 'liberar' ? 'Liberar acesso' : 'Revogar acesso'}
            </Botao>
          </>
        )
      }
    >
      {executar.isSuccess ? (
        <Alerta tom="sucesso">
          {modo === 'liberar' ? 'Acesso liberado.' : 'Acesso revogado.'} A ação ficou registrada na auditoria.
        </Alerta>
      ) : (
        <>
          <dl className={s.dl}>
            <dt>Aluno</dt>
            <dd>{usuario.nome}</dd>
            <dt>E-mail</dt>
            <dd>{usuario.email}</dd>
            <dt>CPF</dt>
            <dd className={s.mono}>{cpfMascarado(usuario.cpfOculto)}</dd>
          </dl>
          <p>
            {modo === 'liberar'
              ? 'Use só em casos excepcionais (ex.: Pix pago e webhook perdido, conferido no Asaas). Não existe acesso gratuito.'
              : 'O aluno perde o acesso ao conteúdo imediatamente.'}
          </p>
          <CampoArea
            rotulo="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            erro={tentou ? erroMotivo : undefined}
            ajuda="Obrigatório (mínimo de 10 caracteres). Fica na auditoria."
          />
          {executar.isError ? <Alerta tom="erro">{mensagemDeErro(executar.error)}</Alerta> : null}
        </>
      )}
    </Modal>
  );
}

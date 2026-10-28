/**
 * Ações sensíveis do /super (D13), reaproveitadas por várias telas:
 * - `AcaoConfirmada`: folha (celular) ou modal (desktop) com motivo obrigatório e, quando a
 *   rota pede, a reconfirmação com senha ou código do app;
 * - `AprovarManual`: registro de pagamento recebido por fora (preço vigente do 1º concurso, D23),
 *   com forma, data, observação, referência, comprovante e a confirmação da senha.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { diaSP, formatarReais, FORMAS_PAGAMENTO_MANUAL, type FormaPagamentoManual } from '@fuse/shared';
import { PREFIXO_API, ROTAS, type AprovarManualResposta, type Reconfirmacao, type RespostaDe } from '@fuse/shared/api';
import { api, camposDoErro, ErroAdminApi, mensagemDeErro, MENSAGEM_SEM_CONEXAO } from '../admin/api';
import { Alerta, Botao, CampoArea, CampoSelecao, CampoTexto, estilos as a } from '../admin/componentes/ui';
import { Folha, useReconfirmacao } from './componentes';
import { NOMES_FORMA_PAGAMENTO_MANUAL } from './util';

/** Motivo: mínimo de 5 caracteres (MotivoObrigatorio). */
export const motivoValido = (m: string, minimo = 5) => m.trim().length >= minimo;

/**
 * Ação com motivo e (opcional) reconfirmação. `executar` recebe o motivo e a confirmação;
 * ao terminar com sucesso, mostra `sucesso` e invalida o cache do /super.
 */
export function AcaoConfirmada(props: {
  titulo: string;
  aberta: boolean;
  aoFechar: () => void;
  rotuloConfirmar: string;
  perigo?: boolean;
  /** Pede senha ou código do app (rotas com `confirmacao`). */
  reconfirmar?: boolean;
  /** Motivo obrigatório (padrão: sim). */
  pedirMotivo?: boolean;
  rotuloMotivo?: string;
  /** Tamanho mínimo do motivo (padrão 5; liberar/revogar acesso pede 10). */
  minMotivo?: number;
  children?: ReactNode;
  /** Campos extras precisam estar válidos para confirmar. */
  podeConfirmar?: boolean;
  executar: (motivo: string, confirmacao: Reconfirmacao | null) => Promise<unknown>;
  sucesso: ReactNode | ((r: unknown) => ReactNode);
}) {
  const [motivo, setMotivo] = useState('');
  const recon = useReconfirmacao();
  const qc = useQueryClient();
  const pedirMotivo = props.pedirMotivo ?? true;
  const acao = useMutation({
    mutationFn: () => props.executar(motivo.trim(), recon.confirmacao),
    onSuccess: () => {
      recon.limpar();
      void qc.invalidateQueries({ queryKey: ['super'] });
    },
  });
  const fechar = () => {
    acao.reset();
    setMotivo('');
    recon.limpar();
    props.aoFechar();
  };
  const pronto =
    (!pedirMotivo || motivoValido(motivo, props.minMotivo)) && (!props.reconfirmar || !!recon.confirmacao) && (props.podeConfirmar ?? true);
  const erroMotivo = camposDoErro(acao.error).motivo;

  return (
    <Folha
      titulo={props.titulo}
      aberta={props.aberta}
      aoFechar={fechar}
      cheia={props.reconfirmar ?? false}
      rodape={
        acao.isSuccess ? (
          <Botao variante="primario" onClick={fechar}>
            Fechar
          </Botao>
        ) : (
          <>
            <Botao data-fechar onClick={fechar}>
              Cancelar
            </Botao>
            <Botao
              variante={props.perigo ? 'perigo' : 'primario'}
              disabled={!pronto}
              carregando={acao.isPending}
              onClick={() => acao.mutate()}
            >
              {props.rotuloConfirmar}
            </Botao>
          </>
        )
      }
    >
      {acao.isSuccess ? (
        <Alerta tom="sucesso">{typeof props.sucesso === 'function' ? props.sucesso(acao.data) : props.sucesso}</Alerta>
      ) : (
        <div className={a.formulario}>
          {props.children}
          {pedirMotivo ? (
            <CampoArea
              rotulo={props.rotuloMotivo ?? 'Motivo (fica na auditoria)'}
              rows={3}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              erro={erroMotivo}
              ajuda={`Pelo menos ${props.minMotivo ?? 5} caracteres.`}
            />
          ) : null}
          {props.reconfirmar ? recon.campo : null}
          {acao.isError && !erroMotivo ? <Alerta tom="erro">{mensagemDeErro(acao.error)}</Alerta> : null}
        </div>
      )}
    </Folha>
  );
}

/* ------------------------------------------------------- comprovante */

/** POST /super/comprovantes (multipart, campo "arquivo"). */
export async function enviarComprovante(arquivo: File): Promise<RespostaDe<'superComprovanteEnviar'>> {
  const dados = new FormData();
  dados.append('arquivo', arquivo);
  let res: Response;
  try {
    res = await fetch(`${PREFIXO_API}${ROTAS.superComprovanteEnviar.caminho}`, {
      method: 'POST',
      body: dados,
      credentials: 'include',
    });
  } catch {
    throw new ErroAdminApi(MENSAGEM_SEM_CONEXAO, 0, 'sem_conexao');
  }
  if (!res.ok) {
    let erro = 'Não foi possível enviar o comprovante.';
    try {
      const c = (await res.json()) as { erro?: string };
      if (c.erro) erro = c.erro;
    } catch {
      /* corpo vazio */
    }
    throw new ErroAdminApi(erro, res.status);
  }
  return (await res.json()) as RespostaDe<'superComprovanteEnviar'>;
}

/* ------------------------------------------------------ aprovação manual */

const OPCOES_FORMA = FORMAS_PAGAMENTO_MANUAL.map((f) => ({ valor: f, rotulo: NOMES_FORMA_PAGAMENTO_MANUAL[f] }));
const OPCOES_ASAAS = [
  { valor: 'receber_em_dinheiro', rotulo: 'Marcar como recebida em dinheiro no Asaas' },
  { valor: 'cancelar', rotulo: 'Cancelar a cobrança no Asaas' },
  { valor: 'nenhuma', rotulo: 'Não mexer no Asaas' },
];

export interface AlunoParaAprovar {
  id: string;
  nome: string;
  email: string;
  /** Tem um Pix pendente no Asaas (mostra a escolha do que fazer com ele). */
  pixPendente?: boolean;
}

export function AprovarManual({
  aluno,
  precoCentavos,
  aberta,
  aoFechar,
}: {
  aluno: AlunoParaAprovar;
  precoCentavos?: number | undefined;
  aberta: boolean;
  aoFechar: () => void;
}) {
  const qc = useQueryClient();
  const recon = useReconfirmacao();
  const [forma, setForma] = useState<FormaPagamentoManual>('transferencia');
  const [recebidoEm, setRecebidoEm] = useState(() => diaSP(new Date()));
  const [observacao, setObservacao] = useState('');
  const [referencia, setReferencia] = useState('');
  const [acaoAsaas, setAcaoAsaas] = useState<'receber_em_dinheiro' | 'cancelar' | 'nenhuma'>('receber_em_dinheiro');
  const [comprovante, setComprovante] = useState<{ arquivo: string; nome: string } | null>(null);
  const upload = useMutation({
    mutationFn: (f: File) => enviarComprovante(f),
    onSuccess: (r, f) => setComprovante({ arquivo: r.arquivo, nome: f.name }),
  });
  const aprovar = useMutation({
    mutationFn: () =>
      api('superAprovarManual', {
        params: { id: aluno.id },
        corpo: {
          forma,
          recebidoEm,
          observacao: observacao.trim(),
          ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
          ...(comprovante ? { comprovante: comprovante.arquivo } : {}),
          acaoAsaas: aluno.pixPendente ? acaoAsaas : 'nenhuma',
          confirmacao: recon.confirmacao ?? {},
        },
      }),
    onSuccess: () => {
      recon.limpar();
      void qc.invalidateQueries({ queryKey: ['super'] });
    },
  });
  const fechar = () => {
    aprovar.reset();
    upload.reset();
    recon.limpar();
    setObservacao('');
    setReferencia('');
    setComprovante(null);
    aoFechar();
  };
  const campos = camposDoErro(aprovar.error);
  const pronto = motivoValido(observacao) && !!recon.confirmacao && !!recebidoEm && !upload.isPending;
  const r: AprovarManualResposta | undefined = aprovar.data;

  return (
    <Folha
      titulo="Aprovar pagamento manual"
      aberta={aberta}
      aoFechar={fechar}
      cheia
      larga
      rodape={
        aprovar.isSuccess ? (
          <Botao variante="primario" onClick={fechar}>
            Fechar
          </Botao>
        ) : (
          <>
            <Botao data-fechar onClick={fechar}>
              Cancelar
            </Botao>
            <Botao variante="primario" disabled={!pronto} carregando={aprovar.isPending} onClick={() => aprovar.mutate()}>
              Aprovar e liberar acesso
            </Botao>
          </>
        )
      }
    >
      {r ? (
        <div className={a.formulario}>
          <Alerta tom="sucesso">
            {r.jaAprovado
              ? 'Este aluno já tinha um pagamento aprovado. Nada foi duplicado.'
              : 'Pagamento manual registrado e acesso liberado.'}
          </Alerta>
          {r.asaas.acao !== 'nenhuma' ? <Alerta tom={r.asaas.ok ? 'info' : 'aviso'}>Asaas: {r.asaas.mensagem}</Alerta> : null}
        </div>
      ) : (
        <div className={a.formulario}>
          <Alerta tom="info">
            Use só para pagamento recebido por fora (transferência, dinheiro, Pix direto). O valor é sempre{' '}
            {precoCentavos ? formatarReais(precoCentavos) : 'o preço vigente do 1º concurso'} e não existe acesso gratuito.
          </Alerta>
          <dl className={a.dl}>
            <dt>Aluno</dt>
            <dd>
              {aluno.nome} · {aluno.email}
            </dd>
          </dl>
          <CampoSelecao rotulo="Forma do pagamento" value={forma} opcoes={OPCOES_FORMA} onChange={(e) => setForma(e.target.value as FormaPagamentoManual)} />
          <CampoTexto
            rotulo="Recebido em"
            type="date"
            value={recebidoEm}
            max={diaSP(new Date())}
            onChange={(e) => setRecebidoEm(e.target.value)}
            erro={campos.recebidoEm}
          />
          <CampoArea
            rotulo="Observação (motivo, fica na auditoria)"
            rows={3}
            maxLength={500}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            erro={campos.observacao}
            ajuda="Pelo menos 5 caracteres. Ex.: transferência recebida no Banco X, conferida no extrato."
          />
          <CampoTexto
            rotulo="Referência (opcional)"
            maxLength={120}
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            ajuda="Id da transação, número do recibo…"
          />
          <div className={a.campo}>
            <label className={a.rotulo} htmlFor="comprovante-manual">
              Comprovante (opcional)
            </label>
            <input
              id="comprovante-manual"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
              }}
            />
            <span className={a.ajuda}>
              {upload.isPending
                ? 'Enviando…'
                : comprovante
                  ? `Anexado: ${comprovante.nome}`
                  : 'Imagem (PNG, JPG, WEBP) ou PDF de até 5 MB.'}
            </span>
            {upload.isError ? (
              <span className={a.erroCampo} role="alert">
                {mensagemDeErro(upload.error)}
              </span>
            ) : null}
          </div>
          {aluno.pixPendente ? (
            <CampoSelecao
              rotulo="Cobrança Pix pendente no Asaas"
              value={acaoAsaas}
              opcoes={OPCOES_ASAAS}
              onChange={(e) => setAcaoAsaas(e.target.value as typeof acaoAsaas)}
            />
          ) : null}
          {recon.campo}
          {aprovar.isError && !campos.observacao && !campos.recebidoEm ? (
            <Alerta tom="erro">{mensagemDeErro(aprovar.error)}</Alerta>
          ) : null}
        </div>
      )}
    </Folha>
  );
}

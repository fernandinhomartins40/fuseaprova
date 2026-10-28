/**
 * /super/precos (D23): o superadmin muda os preços e cria cupons de desconto. O Asaas não guarda
 * preço: cada Pix é criado pela API com o valor daqui. Ao salvar, os Pix pendentes com o valor
 * antigo são cancelados no Asaas e o aluno gera outro, já com o valor novo.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { DESCONTO_MAXIMO_PERCENTUAL, formatarReais, reaisParaCentavos, type TipoCupom } from '@fuse/shared';
import type { CupomItem, CupomSalvarEntrada } from '@fuse/shared/api';
import { api, camposDoErro, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, Cartao, CampoArea, CampoSelecao, CampoTexto, Consulta, Marcar, Modal, Selo, Tabela, Vazio, estilos as a } from '../../admin/componentes/ui';
import { dataHora } from '../../admin/util';
import { BotaoAtualizar, CartaoLinha, Cartoes, Kpi, Pagina, estilosSuper as s, useCelular, useReconfirmacao } from '../componentes';
import { caminho } from '../util';

/** 19700 → "197,00" (para o campo). */
const paraCampo = (centavos: number | null) => (centavos === null ? '' : (centavos / 100).toFixed(2).replace('.', ','));

function Precos() {
  const consulta = useQuery({ queryKey: ['super', 'precos'], queryFn: () => api('superPrecos') });
  const [campos, setCampos] = useState<{ cheio: string; adicional: string; de: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const recon = useReconfirmacao();
  useEffect(() => {
    if (consulta.data && !campos) {
      const v = consulta.data.valores;
      setCampos({ cheio: paraCampo(v.precoCentavos), adicional: paraCampo(v.precoAdicionalCentavos), de: paraCampo(v.precoDeCentavos) });
    }
  }, [consulta.data, campos]);
  const salvar = useMutation({
    mutationFn: () =>
      api('superPrecosSalvar', {
        corpo: {
          precoCentavos: reaisParaCentavos(campos!.cheio) ?? Number.NaN,
          precoAdicionalCentavos: reaisParaCentavos(campos!.adicional) ?? Number.NaN,
          precoDeCentavos: campos!.de.trim() ? (reaisParaCentavos(campos!.de) ?? Number.NaN) : null,
          motivo: motivo.trim(),
          confirmacao: recon.confirmacao ?? {},
        },
      }),
    onSuccess: () => {
      setMotivo('');
      recon.limpar();
      void consulta.refetch();
    },
  });
  const erros = camposDoErro(salvar.error);
  const invalido = (t: string) => (t.trim() && reaisParaCentavos(t) === null ? 'Use um valor como 197,00.' : undefined);
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Preços</h2>
      <Consulta consulta={consulta}>
        {(d) => (
          <>
            <section className={s.kpis} aria-label="Preços vigentes">
              <Kpi rotulo="1º concurso" valor={formatarReais(d.valores.precoCentavos)} detalhe={d.valores.precoDeCentavos ? `de ${formatarReais(d.valores.precoDeCentavos)}` : 'sem preço riscado'} />
              <Kpi rotulo="Concurso adicional" valor={formatarReais(d.valores.precoAdicionalCentavos)} detalhe="para quem já pagou um" />
              <Kpi rotulo="Pix pendentes" valor={d.pixPendentes} detalhe="refeitos se o valor mudar" />
            </section>
            {campos ? (
              <form
                className={a.formulario}
                aria-label="Preços"
                onSubmit={(e) => {
                  e.preventDefault();
                  salvar.mutate();
                }}
              >
                <p className={a.suave}>
                  O Asaas não guarda preço: cada Pix é criado com o valor daqui. Ao salvar, os Pix ainda não pagos com o valor antigo são
                  cancelados no Asaas e o aluno gera outro com o valor novo. A landing e a tela de pagamento mudam na hora.
                  {d.atualizadoEm
                    ? ` Última alteração ${dataHora(d.atualizadoEm)} por ${d.atualizadoPor?.nome ?? '—'}.`
                    : ` Ainda valem os do .env (${formatarReais(d.padrao.precoCentavos)} e ${formatarReais(d.padrao.precoAdicionalCentavos)}).`}
                </p>
                <CampoTexto rotulo="Preço do 1º concurso (R$)" inputMode="decimal" value={campos.cheio} onChange={(e) => setCampos({ ...campos, cheio: e.target.value })} erro={invalido(campos.cheio) ?? erros.precoCentavos} />
                <CampoTexto
                  rotulo="Preço de cada concurso adicional (R$)"
                  inputMode="decimal"
                  value={campos.adicional}
                  onChange={(e) => setCampos({ ...campos, adicional: e.target.value })}
                  erro={invalido(campos.adicional) ?? erros.precoAdicionalCentavos}
                  ajuda="Para quem já pagou outro concurso."
                />
                <CampoTexto
                  rotulo='Preço "de", riscado (R$, opcional)'
                  inputMode="decimal"
                  value={campos.de}
                  onChange={(e) => setCampos({ ...campos, de: e.target.value })}
                  erro={invalido(campos.de) ?? erros.precoDeCentavos}
                  ajuda="Aparece riscado na landing e no pagamento. Deixe vazio para não mostrar."
                />
                <CampoArea rotulo="Motivo da alteração (fica na auditoria)" rows={2} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} erro={erros.motivo} />
                {recon.campo}
                {salvar.isError && !Object.keys(erros).length ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
                {salvar.isSuccess ? (
                  <Alerta tom="sucesso">
                    Preços salvos.{' '}
                    {salvar.data.cobrancasCanceladas
                      ? `${salvar.data.cobrancasCanceladas} Pix com o valor antigo foram cancelados no Asaas.`
                      : 'Nenhum Pix pendente precisou ser refeito.'}
                  </Alerta>
                ) : null}
                <div className={a.acoes}>
                  <Botao type="submit" variante="primario" disabled={motivo.trim().length < 5 || !recon.confirmacao} carregando={salvar.isPending}>
                    Salvar preços
                  </Botao>
                </div>
              </form>
            ) : null}
          </>
        )}
      </Consulta>
    </Cartao>
  );
}

/* ------------------------------------------------------------------ cupons */

interface FormCupom {
  codigo: string;
  descricao: string;
  tipo: TipoCupom;
  valor: string;
  /** AAAA-MM-DD (vale até o fim do dia, horário de Brasília). */
  validoAte: string;
  limiteUsos: string;
  concursoId: string;
  ativo: boolean;
  motivo: string;
}

const VAZIO: FormCupom = { codigo: '', descricao: '', tipo: 'percentual', valor: '', validoAte: '', limiteUsos: '', concursoId: '', ativo: true, motivo: '' };

function formDe(c: CupomItem): FormCupom {
  return {
    codigo: c.codigo,
    descricao: c.descricao,
    tipo: c.tipo,
    valor: c.tipo === 'percentual' ? String(c.valor) : paraCampo(c.valor),
    validoAte: c.validoAte ? new Date(c.validoAte).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) : '',
    limiteUsos: c.limiteUsos ? String(c.limiteUsos) : '',
    concursoId: c.concursoId ?? '',
    ativo: c.ativo,
    motivo: '',
  };
}

function entradaDe(f: FormCupom, confirmacao: CupomSalvarEntrada['confirmacao']): CupomSalvarEntrada {
  const valor = f.tipo === 'percentual' ? Number(f.valor.replace(',', '.')) : (reaisParaCentavos(f.valor) ?? Number.NaN);
  return {
    codigo: f.codigo,
    descricao: f.descricao.trim(),
    tipo: f.tipo,
    valor,
    validoAte: f.validoAte ? `${f.validoAte}T23:59:59-03:00` : null,
    limiteUsos: f.limiteUsos.trim() ? Number(f.limiteUsos) : null,
    concursoId: f.concursoId || null,
    ativo: f.ativo,
    motivo: f.motivo.trim(),
    confirmacao,
  };
}

export function descontoCupom(c: Pick<CupomItem, 'tipo' | 'valor'>): string {
  return c.tipo === 'percentual' ? `${c.valor}%` : formatarReais(c.valor);
}

function situacao(c: CupomItem): { tom: 'sucesso' | 'neutro' | 'aviso'; texto: string } {
  if (!c.ativo) return { tom: 'neutro', texto: 'Desativado' };
  if (c.validoAte && new Date(c.validoAte).getTime() <= Date.now()) return { tom: 'aviso', texto: 'Expirado' };
  if (c.limiteUsos !== null && c.usos >= c.limiteUsos) return { tom: 'aviso', texto: 'Esgotado' };
  return { tom: 'sucesso', texto: 'Ativo' };
}

function EditorCupom({ cupom, aoFechar }: { cupom: CupomItem | null; aoFechar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<FormCupom>(cupom ? formDe(cupom) : VAZIO);
  // S-12: criar ou editar cupom pede a mesma reconfirmação do preço.
  const recon = useReconfirmacao();
  const concursos = useQuery({ queryKey: ['super', 'concursos'], queryFn: () => api('adminConcursosListar') });
  const salvar = useMutation({
    mutationFn: () =>
      cupom
        ? api('superCupomAtualizar', { params: { id: cupom.id }, corpo: entradaDe(f, recon.confirmacao ?? {}) })
        : api('superCupomCriar', { corpo: entradaDe(f, recon.confirmacao ?? {}) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['super', 'cupons'] });
      void qc.invalidateQueries({ queryKey: ['super', 'precos'] });
    },
  });
  const erros = camposDoErro(salvar.error);
  const feito = salvar.isSuccess;
  return (
    <Modal
      titulo={cupom ? `Cupom ${cupom.codigo}` : 'Novo cupom'}
      aberto
      aoFechar={aoFechar}
      rodape={
        feito ? (
          <Botao variante="primario" onClick={aoFechar}>
            Fechar
          </Botao>
        ) : (
          <>
            <Botao onClick={aoFechar}>Cancelar</Botao>
            <Botao type="submit" form="form-cupom" variante="primario" disabled={f.motivo.trim().length < 5 || !f.codigo.trim() || !f.valor.trim()} carregando={salvar.isPending}>
              {cupom ? 'Salvar cupom' : 'Criar cupom'}
            </Botao>
          </>
        )
      }
    >
      {feito ? (
        <Alerta tom="sucesso">
          Cupom {salvar.data.cupom.codigo} salvo.
          {salvar.data.cobrancasCanceladas ? ` ${salvar.data.cobrancasCanceladas} Pix feitos com o valor antigo foram cancelados no Asaas.` : ''}
        </Alerta>
      ) : (
        <form
          id="form-cupom"
          className={a.formulario}
          aria-label={cupom ? `Editar cupom ${cupom.codigo}` : 'Novo cupom'}
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <CampoTexto
            rotulo="Código"
            value={f.codigo}
            maxLength={30}
            autoComplete="off"
            onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase().replace(/\s+/g, '') })}
            erro={erros.codigo}
            ajuda="O que o aluno digita no pagamento. Letras, números, - ou _."
          />
          <CampoSelecao
            rotulo="Tipo de desconto"
            value={f.tipo}
            opcoes={[
              { valor: 'percentual', rotulo: 'Percentual (%)' },
              { valor: 'fixo', rotulo: 'Valor fixo (R$)' },
            ]}
            onChange={(e) => setF({ ...f, tipo: e.target.value as TipoCupom, valor: '' })}
          />
          <CampoTexto
            rotulo={f.tipo === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
            inputMode="decimal"
            value={f.valor}
            onChange={(e) => setF({ ...f, valor: e.target.value })}
            erro={erros.valor}
            ajuda={f.tipo === 'percentual' ? `De 1% a ${DESCONTO_MAXIMO_PERCENTUAL}%. O Pix nunca fica abaixo de R$ 5,00.` : 'O Pix nunca fica abaixo de R$ 5,00.'}
          />
          <CampoTexto rotulo="Válido até (opcional)" type="date" value={f.validoAte} onChange={(e) => setF({ ...f, validoAte: e.target.value })} erro={erros.validoAte} ajuda="Vale até 23:59 deste dia (horário de Brasília)." />
          <CampoTexto rotulo="Limite de usos (opcional)" inputMode="numeric" value={f.limiteUsos} onChange={(e) => setF({ ...f, limiteUsos: e.target.value.replace(/\D/g, '') })} erro={erros.limiteUsos} ajuda="Pagamentos confirmados com o cupom." />
          <CampoSelecao
            rotulo="Concurso"
            value={f.concursoId}
            opcoes={[{ valor: '', rotulo: 'Qualquer concurso' }, ...(concursos.data?.itens ?? []).map((c) => ({ valor: c.id, rotulo: c.nome }))]}
            onChange={(e) => setF({ ...f, concursoId: e.target.value })}
            erro={erros.concursoId}
          />
          <CampoTexto rotulo="Descrição interna (opcional)" maxLength={200} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
          <Marcar rotulo="Cupom ativo" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} />
          <CampoArea rotulo="Motivo (fica na auditoria)" rows={2} maxLength={500} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} erro={erros.motivo} />
          {recon.campo}
          {salvar.isError && !Object.keys(erros).length ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
        </form>
      )}
    </Modal>
  );
}

function Cupons() {
  const celular = useCelular();
  const consulta = useQuery({ queryKey: ['super', 'cupons'], queryFn: () => api('superCupons') });
  const [editando, setEditando] = useState<CupomItem | 'novo' | null>(null);
  const usos = (c: CupomItem) => `${c.usos}${c.limiteUsos !== null ? ` de ${c.limiteUsos}` : ''}`;
  return (
    <Cartao>
      <div className={a.acoes}>
        <h2 className={a.secaoTitulo}>Cupons de desconto</h2>
        <Botao variante="primario" onClick={() => setEditando('novo')}>
          Novo cupom
        </Botao>
      </div>
      <Consulta consulta={consulta}>
        {(d) =>
          !d.itens.length ? (
            <Vazio>Nenhum cupom ainda. O aluno digita o código na tela de pagamento.</Vazio>
          ) : celular ? (
            <Cartoes rotulo="Cupons">
              {d.itens.map((c) => (
                <CartaoLinha
                  key={c.id}
                  titulo={c.codigo}
                  sub={`${descontoCupom(c)} · ${usos(c)} uso(s) · ${c.validoAte ? `até ${dataHora(c.validoAte)}` : 'sem prazo'}`}
                  extra={
                    <div className={a.acoes}>
                      <Selo tom={situacao(c).tom}>{situacao(c).texto}</Selo>
                      <Botao onClick={() => setEditando(c)}>Editar</Botao>
                    </div>
                  }
                />
              ))}
            </Cartoes>
          ) : (
            <Tabela rotulo="Cupons">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Desconto</th>
                  <th>Concurso</th>
                  <th>Validade</th>
                  <th className={a.direita}>Usos</th>
                  <th className={a.direita}>Pix pendentes</th>
                  <th>Situação</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.itens.map((c) => (
                  <tr key={c.id}>
                    <td className={a.mono}>{c.codigo}</td>
                    <td>{descontoCupom(c)}</td>
                    <td>{c.concursoNome ?? 'Qualquer'}</td>
                    <td>{c.validoAte ? dataHora(c.validoAte) : 'Sem prazo'}</td>
                    <td className={a.direita}>{usos(c)}</td>
                    <td className={a.direita}>{c.pendentes}</td>
                    <td>
                      <Selo tom={situacao(c).tom}>{situacao(c).texto}</Selo>
                    </td>
                    <td>
                      <Botao onClick={() => setEditando(c)}>Editar</Botao>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )
        }
      </Consulta>
      {editando ? <EditorCupom cupom={editando === 'novo' ? null : editando} aoFechar={() => setEditando(null)} /> : null}
    </Cartao>
  );
}

export default function PrecosCupons() {
  const qc = useQueryClient();
  return (
    <Pagina
      titulo="Preços e cupons"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Preços e cupons' }]}
      acoes={<BotaoAtualizar aoClicar={() => void qc.invalidateQueries({ queryKey: ['super'] })} />}
    >
      <Precos />
      <Cupons />
    </Pagina>
  );
}

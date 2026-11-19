import { lazy, Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TEXTO_EDITAL_SAIU } from '@fuse/shared';
import { chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES, useConcurso, useMe } from '../api/consultas';
import { Botao3D, Capi, Modal, NavInferior } from '../ui';
import { EH_APP } from '../nativo/plataforma';
import { rotaInicial } from './rotaInicial';
import s from './LayoutAbas.module.css';

/** D32: fora do build do app, que não pode citar pagamento (mesmo padrão das telas de venda). */
const AvisosConta = EH_APP ? () => null : lazy(() => import('./AvisosConta'));

/** Abas com a navegação inferior e o modal "O edital saiu! Confirme seu cargo". */
export function LayoutAbas() {
  const me = useMe();
  const equipe = me.data && me.data.papel !== 'aluno' ? me.data : null;
  return (
    <>
      {equipe ? (
        <div className={s.faixaEquipe} role="note">
          <span>Você está vendo o app como aluno.</span>
          <a href={rotaInicial({ papel: equipe.papel, acesso: equipe.acesso })}>
            Voltar ao painel {equipe.papel === 'superadmin' ? 'superadmin' : 'admin'}
          </a>
        </div>
      ) : null}
      <Suspense fallback={null}>
        <AvisosConta />
      </Suspense>
      <Outlet />
      <NavInferior revisoesPendentes={me.data?.revisoesPendentes ?? 0} />
      {me.data?.confirmarCargoEdital ? (
        <ModalEdital cargoAtual={me.data.cargo?.id ?? null} />
      ) : null}
    </>
  );
}

/** D45: com dezenas de cargos no edital, a lista do modal vem agrupada por nível. */
const NIVEIS_DO_MODAL: { titulo: string; escolaridades: readonly (string | null)[] }[] = [
  { titulo: 'Nível superior', escolaridades: ['superior'] },
  { titulo: 'Nível médio e técnico', escolaridades: ['medio', 'tecnico'] },
  { titulo: 'Nível fundamental', escolaridades: ['fundamental'] },
  { titulo: 'Outros cargos', escolaridades: [null] },
];

export function ModalEdital({ cargoAtual }: { cargoAtual: string | null }) {
  const concurso = useConcurso();
  const qc = useQueryClient();
  const cargos = (concurso.data?.cargos ?? []).filter((c) => !c.generico);
  const grupos = NIVEIS_DO_MODAL.map((n) => ({
    titulo: n.titulo,
    itens: cargos.filter((c) => n.escolaridades.includes(c.escolaridade ?? null)),
  })).filter((g) => g.itens.length > 0);
  const [marcado, setEscolhido] = useState<string | null>(null);
  const escolhido = marcado ?? (cargos.some((c) => c.id === cargoAtual) ? cargoAtual : null);
  const salvar = useMutation({
    mutationFn: (cargoId: string) => chamar('meAtualizar', { corpo: { cargoId } }),
    onSuccess: (me) => {
      qc.setQueryData(CHAVES.me, me);
      void qc.invalidateQueries({ queryKey: CHAVES.trilha });
    },
  });
  return (
    <Modal
      aberto
      semFechar
      titulo={TEXTO_EDITAL_SAIU}
      onFechar={() => undefined}
      topo={<Capi pose="celebrando" tamanho={130} carregamento="eager" />}
      descricao="Escolha o seu cargo no edital. A trilha e os simulados passam a seguir o conteúdo dele, sem custo extra."
      rodape={
        <Botao3D
          disabled={!escolhido}
          carregando={salvar.isPending}
          onClick={() => escolhido && salvar.mutate(escolhido)}
        >
          CONFIRMAR CARGO
        </Botao3D>
      }
    >
      <div role="radiogroup" aria-label="Cargos do edital" className={s.lista}>
        {concurso.isPending ? <p className={s.vazio}>Carregando os cargos…</p> : null}
        {grupos.map((g) => (
          <div key={g.titulo} className={s.grupo}>
            {grupos.length > 1 ? <p className={s.grupoTitulo}>{g.titulo}</p> : null}
            {g.itens.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={escolhido === c.id}
                className={[s.cargo, escolhido === c.id ? s.marcado : ''].join(' ')}
                onClick={() => setEscolhido(c.id)}
              >
                <span className={s.nome}>{c.nome}</span>
                {c.vagas != null ? <span className={s.vagas}>{c.vagas} vagas</span> : null}
              </button>
            ))}
          </div>
        ))}
      </div>
      {salvar.isError ? (
        <p role="alert" className={s.erro}>
          {mensagemDeErro(salvar.error)}
        </p>
      ) : null}
    </Modal>
  );
}

import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { CHAVES, useRedacaoPainel } from '../../api/consultas';
import { Botao3D, CabecalhoVoltar, Carregando, ErroTela, Pagina } from '../../ui';
import { Proposta } from './Proposta';
import s from './Redacao.module.css';

/** D49: a proposta de um tema e o botão para começar (ou continuar o rascunho). */
export default function RedacaoTema() {
  const { temaId = '' } = useParams();
  const painel = useRedacaoPainel();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const tema = painel.data?.temas.find((t) => t.id === temaId);
  const rascunho = painel.data?.redacoes.find((r) => r.temaId === temaId && r.status === 'rascunho');

  const comecar = useMutation({
    mutationFn: () => chamar('redacaoCriar', { corpo: { temaId, texto: '' } }),
    onSuccess: (r) => {
      qc.setQueryData(CHAVES.redacaoItem(r.id), r);
      void qc.invalidateQueries({ queryKey: CHAVES.redacao, exact: true });
      navegar(`/redacao/${r.id}`, { replace: true });
    },
  });

  return (
    <Pagina rotulo="Tema de redação" comRodapeFixo>
      <CabecalhoVoltar para="/redacao?aba=temas" titulo="Tema" />
      {painel.isPending ? (
        <Carregando />
      ) : painel.isError ? (
        <ErroTela mensagem={mensagemDeErro(painel.error)} onTentar={() => painel.refetch()} />
      ) : !tema ? (
        <ErroTela mensagem="Tema não encontrado." />
      ) : (
        <>
          <Proposta tema={tema} />
          <p className={s.nota}>
            Dica: antes de escrever, liste cada item que o comando pede. Cada um precisa aparecer no seu texto.
          </p>
          {comecar.isError ? (
            <p className={s.erro} role="alert">
              {mensagemDeErro(comecar.error)}
            </p>
          ) : null}
          <div className={s.rodape}>
            {rascunho ? (
              <Botao3D onClick={() => navegar(`/redacao/${rascunho.id}`)}>CONTINUAR RASCUNHO</Botao3D>
            ) : null}
            <Botao3D
              variante={rascunho ? 'secundario' : 'primario'}
              carregando={comecar.isPending}
              onClick={() => comecar.mutate()}
            >
              {rascunho ? 'COMEÇAR OUTRA' : 'COMEÇAR A REDAÇÃO'}
            </Botao3D>
          </div>
        </>
      )}
    </Pagina>
  );
}

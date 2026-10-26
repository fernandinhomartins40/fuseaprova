import { useNavigate } from 'react-router-dom';
import { formatarDominio, TEXTO_REVISAO_VAZIA, textoQuestoesParaHoje } from '@fuse/shared';
import { mensagemDeErro } from '../api/cliente';
import { useMe, useRevisao } from '../api/consultas';
import {
  BarraProgresso,
  Botao3D,
  CabecalhoApp,
  Capi,
  Carregando,
  ErroTela,
  IconeTraco,
  Imagem,
  LinhaLista,
  Pagina,
  TituloSecao,
} from '../ui';
import { COR_DISCIPLINA, ICONE_DISCIPLINA, NOME_CURTO_DISCIPLINA, plural } from './comum';
import s from './Revisar.module.css';

/** 10 Revisar (`/revisar`): hero com PRATICAR ERROS, pendentes por disciplina e a regra. */
export default function Revisar() {
  const me = useMe();
  const r = useRevisao();
  const navegar = useNavigate();

  return (
    <Pagina comNav rotulo="Revisar">
      <CabecalhoApp nome={me.data?.nome} id={me.data?.id} />
      <h1 className={s.titulo}>Revisar</h1>
      {r.isPending ? (
        <Carregando />
      ) : r.isError ? (
        <ErroTela mensagem={mensagemDeErro(r.error)} onTentar={() => r.refetch()} />
      ) : r.data.pendentes === 0 ? (
        <section className={s.vazio}>
          <Capi pose="explicando" tamanho={220} descrever />
          <p className={s.vazioTexto}>{TEXTO_REVISAO_VAZIA}</p>
          <Botao3D onClick={() => navegar('/aprender')}>IR PARA A TRILHA</Botao3D>
        </section>
      ) : (
        <section className={s.heroi} aria-labelledby="rev-titulo">
          <div className={s.heroiTexto}>
            <h2 id="rev-titulo" className={s.heroiTitulo}>
              {textoQuestoesParaHoje(r.data.pendentes)}
            </h2>
            <p className={s.heroiSub}>
              Transforme seus erros em aprendizado.
            </p>
            <Botao3D
              variante="claro"
              bloco={false}
              onClick={() => navegar('/revisar/praticar')}
              iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
            >
              PRATICAR ERROS
            </Botao3D>
          </div>
          <Imagem
            nome="mascote-explicando"
            tamanho={170}
            className={s.heroiCapi}
            carregamento="eager"
          />
        </section>
      )}

      {r.data ? (
        <>
          <TituloSecao>Por disciplina</TituloSecao>
          <ul className={s.lista}>
            {r.data.porDisciplina.map((d) => (
              <li key={d.slug}>
                <LinhaLista
                  icone={<Imagem nome={ICONE_DISCIPLINA[d.slug]} tamanho={34} />}
                  fundoIcone={d.slug}
                  titulo={NOME_CURTO_DISCIPLINA[d.slug]}
                  subtitulo={
                    d.pendentes > 0
                      ? `${plural(d.pendentes, 'questão', 'questões')} para revisar`
                      : 'Nada pendente'
                  }
                  rotulo={`${NOME_CURTO_DISCIPLINA[d.slug]}: ${d.pendentes} pendentes, domínio ${formatarDominio(d.dominio)}`}
                  onClick={
                    d.pendentes > 0
                      ? () => navegar(`/revisar/praticar?disciplina=${d.slug}`)
                      : undefined
                  }
                  direita={
                    d.pendentes > 0 ? (
                      <span className={s.selo} aria-hidden="true">
                        {d.pendentes}
                      </span>
                    ) : null
                  }
                >
                  <span className={s.dominio}>
                    <BarraProgresso
                      valor={d.dominio ?? 0}
                      rotulo={`Domínio em ${d.nome}`}
                      cor={COR_DISCIPLINA[d.slug]}
                      fina
                    />
                    <span className={s.dominioTexto}>{formatarDominio(d.dominio)}</span>
                  </span>
                </LinhaLista>
              </li>
            ))}
          </ul>
          <section className={s.regra}>
            <Imagem nome="icone-relogio" tamanho={40} />
            <div>
              <p className={s.regraTitulo}>Revisão no tempo certo</p>
              <p className={s.regraTexto}>{r.data.regra}</p>
            </div>
          </section>
        </>
      ) : null}
    </Pagina>
  );
}

import { useNavigate } from 'react-router-dom';
import { mensagemDeErro } from '../api/cliente';
import { useEstatisticas, useMe } from '../api/consultas';
import {
  Avatar,
  BarraProgresso,
  CabecalhoApp,
  CartaoEstatistica,
  Carregando,
  Chip,
  ErroTela,
  IconeTraco,
  Imagem,
  Pagina,
  TituloSecao,
} from '../ui';
import {
  COR_DISCIPLINA,
  formatarNumero,
  ICONE_DISCIPLINA,
  NOME_CURTO_DISCIPLINA,
  plural,
} from './comum';
import { EH_APP } from '../nativo/plataforma';
import s from './Perfil.module.css';

/** 13 Perfil (`/perfil`): avatar, estatísticas, domínio, conquistas e cartão do edital. */
export default function Perfil() {
  const me = useMe();
  const est = useEstatisticas();
  const navegar = useNavigate();
  const u = me.data;

  const engrenagem = (
    <button
      type="button"
      className={s.engrenagem}
      aria-label="Configurações"
      onClick={() => navegar('/configuracoes')}
    >
      <Imagem nome="icone-configuracoes" tamanho={34} carregamento="eager" />
    </button>
  );

  if (!u) return <Carregando />;
  return (
    <Pagina comNav rotulo="Perfil">
      <CabecalhoApp direita={engrenagem} />
      <section className={s.identidade}>
        <Avatar
          nome={u.nome}
          id={u.id}
          iniciaisProntas={u.avatar.iniciais}
          cor={u.avatar.cor}
          tamanho={92}
        />
        <div className={s.idTextos}>
          <h1 className={s.nome}>{u.nomeExibicao}</h1>
          <p className={s.cargo}>
            {est.data?.cargo?.nome ?? u.cargo?.nome ?? 'Cargo não escolhido'}
          </p>
          <p className={s.orgao}>{est.data?.orgao ?? u.concurso?.nome ?? ''}</p>
          <Chip
            variante="marca"
            icone={<Imagem nome="icone-coroa" tamanho={20} />}
            className={s.selo}
          >
            {/* App nativo: sem citar o pagamento feito fora da loja (D20). */}
            {EH_APP
              ? 'Acesso completo'
              : (est.data?.seloAcesso ?? 'Acesso completo · pago via Pix')}
          </Chip>
        </div>
      </section>

      {est.isPending ? (
        <Carregando />
      ) : est.isError ? (
        <ErroTela mensagem={mensagemDeErro(est.error)} onTentar={() => est.refetch()} />
      ) : (
        <>
          <div className={s.grade}>
            <CartaoEstatistica
              icone="icone-calendario"
              valor={plural(est.data.ofensiva, 'dia', 'dias')}
              legenda="de ofensiva"
            />
            <CartaoEstatistica
              icone="icone-progresso"
              valor={`${formatarNumero(est.data.xpTotal)} XP`}
              legenda="pontos totais"
            />
            <CartaoEstatistica
              icone="icone-simulados"
              valor={formatarNumero(est.data.questoesFeitas)}
              legenda="questões"
            />
            <CartaoEstatistica
              icone="icone-alvo"
              valor={est.data.precisao == null ? '—' : `${est.data.precisao}%`}
              legenda="de acertos"
            />
          </div>

          <section className={s.cartao} aria-labelledby="dom-titulo">
            <h2 id="dom-titulo" className={s.cartaoTitulo}>
              Evolução por disciplina
            </h2>
            <ul className={s.dominio}>
              {est.data.dominio.map((d) => (
                <li key={d.slug} className={s.domLinha}>
                  <span className={s.domIcone} data-fundo={d.slug}>
                    <Imagem nome={ICONE_DISCIPLINA[d.slug]} tamanho={30} />
                  </span>
                  <span className={s.domCorpo}>
                    <span className={s.domNome}>{NOME_CURTO_DISCIPLINA[d.slug]}</span>
                    <BarraProgresso
                      valor={d.valor ?? 0}
                      rotulo={`Domínio em ${d.nome}`}
                      cor={COR_DISCIPLINA[d.slug]}
                      fina
                    />
                  </span>
                  <span className={s.domValor}>{d.texto}</span>
                </li>
              ))}
            </ul>
          </section>

          <TituloSecao>Conquistas</TituloSecao>
          <ul className={s.conquistas}>
            {est.data.conquistas.map((c) => (
              <li key={c.codigo} className={[s.conquista, c.obtida ? s.obtida : ''].join(' ')}>
                <Imagem nome={c.obtida ? 'icone-medalha' : 'icone-cadeado'} tamanho={40} />
                <span className={s.conqTitulo}>{c.titulo}</span>
                <span className="sr-only">
                  {c.obtida ? 'conquistada' : 'ainda não conquistada'}. {c.descricao}
                </span>
              </li>
            ))}
          </ul>

          <button type="button" className={s.edital} onClick={() => navegar('/concurso')}>
            <span className={s.editalIcone}>
              <Imagem nome="icone-portugues" tamanho={36} />
            </span>
            <span className={s.editalTextos}>
              <span className={s.editalTitulo}>Sua preparação acompanha o edital</span>
              <span className={s.editalStatus}>Edital: {est.data.edital.texto}</span>
              {est.data.edital.diasParaProva != null && est.data.edital.diasParaProva >= 0 ? (
                <span className={s.editalDias}>
                  Faltam {plural(est.data.edital.diasParaProva, 'dia', 'dias')} para a prova
                </span>
              ) : null}
              <span className={s.editalAviso}>{est.data.avisoEdital}</span>
            </span>
            <IconeTraco nome="chevron" tamanho={22} />
          </button>
        </>
      )}
    </Pagina>
  );
}

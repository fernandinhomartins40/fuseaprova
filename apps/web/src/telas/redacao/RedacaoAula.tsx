import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LETRAS, type Letra } from '@fuse/shared';
import type { AulaRedacao, AvaliacaoTrecho, PassoAulaRedacao } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { CHAVES, useMe, useRedacaoPainel } from '../../api/consultas';
import {
  BarraProgresso,
  Botao3D,
  CabecalhoVoltar,
  Capi,
  Carregando,
  CartaoEstatistica,
  Confete,
  Confirmacao,
  ErroTela,
  FolhaFeedback,
  GrupoAlternativas,
  IconeTraco,
  Imagem,
  Markdown,
  Pagina,
} from '../../ui';
import { somAcerto, somErro } from '../licao/sons';
import l from '../licao/Licao.module.css';
import s from './Redacao.module.css';

type Exercicio = Exclude<PassoAulaRedacao, { tipo: 'explica' } | { tipo: 'escrever' }>;
type Escrever = Extract<PassoAulaRedacao, { tipo: 'escrever' }>;
interface Resultado {
  acertou: boolean;
  explicacao: string;
}

/** Embaralha sem deixar na ordem certa (senão o exercício de ordenar já viria resolvido). */
export function embaralhar(n: number, semente: number): number[] {
  const v = Array.from({ length: n }, (_, i) => i);
  let x = semente || 1;
  for (let i = n - 1; i > 0; i--) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const j = x % (i + 1);
    [v[i], v[j]] = [v[j]!, v[i]!];
  }
  return v.every((k, i) => k === i) ? [...v.slice(1), v[0]!] : v;
}

function respostaCerta(p: Exercicio): string {
  if (p.tipo === 'escolha') return `${LETRAS[p.correta]}) ${p.alternativas[p.correta]}`;
  if (p.tipo === 'lacuna') return p.opcoes[p.correta]!;
  return p.itens.map((t, i) => `${i + 1}. ${t}`).join('\n');
}

/**
 * D49: aula de redação em formato de lição. A Capi explica em pílulas e o aluno responde
 * (alternativa, completar a lacuna, pôr em ordem), com a folha de acerto/erro do app. Errou: o
 * exercício volta no fim da aula. A correção é local; o XP sai do servidor ao concluir.
 */
export default function RedacaoAula() {
  const { id = '' } = useParams();
  const painel = useRedacaoPainel();
  const aulas = painel.data?.aulas ?? [];
  const i = aulas.findIndex((a) => a.id === id);
  const aula = aulas[i];

  if (painel.isPending) return <Carregando />;
  if (painel.isError)
    return (
      <Pagina rotulo="Aula de redação">
        <CabecalhoVoltar para="/redacao" titulo="Redação" />
        <ErroTela mensagem={mensagemDeErro(painel.error)} onTentar={() => painel.refetch()} />
      </Pagina>
    );
  if (!aula)
    return (
      <Pagina rotulo="Aula de redação">
        <CabecalhoVoltar para="/redacao" titulo="Redação" />
        <ErroTela mensagem="Aula não encontrada." />
      </Pagina>
    );
  return <Aula key={aula.id} aula={aula} proxima={aulas[i + 1] ?? null} />;
}

function Aula({ aula, proxima }: { aula: AulaRedacao; proxima: AulaRedacao | null }) {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const sons = me.data?.sons ?? true;
  const passos = aula.passos;
  const totalExercicios = passos.filter((p) => p.tipo !== 'explica' && p.tipo !== 'escrever').length;

  const [fila, setFila] = useState(() => passos.map((_, k) => k));
  const [pos, setPos] = useState(0);
  const [feitos, setFeitos] = useState(0);
  const [errados, setErrados] = useState<Set<number>>(() => new Set());
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [sairAberto, setSairAberto] = useState(false);
  const [fim, setFim] = useState<{ xp: number | null; erro: string | null } | null>(null);
  // resposta em andamento: letra (escolha), índice (lacuna) ou a ordem montada (ordenar)
  const [letra, setLetra] = useState<Letra | null>(null);
  const [opcao, setOpcao] = useState<number | null>(null);
  const [montados, setMontados] = useState<number[]>([]);
  // exercício de escrever: o texto e a avaliação da IA (ou o erro, que não trava a aula)
  const [texto, setTexto] = useState('');
  const [avaliando, setAvaliando] = useState(false);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoTrecho | { erro: string } | null>(null);

  const indice = fila[pos];
  const passo = indice === undefined ? null : passos[indice]!;
  const ordemBanco = useMemo(
    () => (passo?.tipo === 'ordenar' ? embaralhar(passo.itens.length, (indice ?? 0) * 31 + pos + 7) : []),
    [passo, indice, pos],
  );

  async function concluir(perfeita: boolean) {
    setFim({ xp: null, erro: null });
    try {
      const r = await chamar('redacaoAulaConcluir', { params: { id: aula.id }, corpo: { perfeita } });
      setFim({ xp: r.xpGanho, erro: null });
      void qc.invalidateQueries({ queryKey: CHAVES.redacao, exact: true });
      void qc.invalidateQueries({ queryKey: CHAVES.me });
    } catch (e) {
      setFim({ xp: 0, erro: mensagemDeErro(e) });
    }
  }

  function avancar(acertou: boolean) {
    const k = indice!;
    const novaFila = acertou ? fila : [...fila, k];
    if (acertou) setFeitos((n) => n + 1);
    setResultado(null);
    setLetra(null);
    setOpcao(null);
    setMontados([]);
    setTexto('');
    setAvaliacao(null);
    if (pos + 1 >= novaFila.length) {
      void concluir(errados.size === 0);
      return;
    }
    setFila(novaFila);
    setPos(pos + 1);
  }

  async function avaliar() {
    setAvaliando(true);
    try {
      const r = await chamar('redacaoTrechoAvaliar', {
        params: { id: aula.id, passo: String(indice) },
        corpo: { texto },
      });
      if (r.nivel === 'boa') somAcerto(sons);
      setAvaliacao(r);
    } catch (e) {
      setAvaliacao({ erro: mensagemDeErro(e) });
    } finally {
      setAvaliando(false);
    }
  }

  function verificar() {
    if (!passo || passo.tipo === 'explica' || passo.tipo === 'escrever') return;
    const acertou =
      passo.tipo === 'escolha'
        ? letra === LETRAS[passo.correta]
        : passo.tipo === 'lacuna'
          ? opcao === passo.correta
          : montados.every((m, k) => m === k);
    if (acertou) somAcerto(sons);
    else {
      somErro(sons);
      setErrados((e) => new Set(e).add(indice!));
    }
    setResultado({
      acertou,
      explicacao: acertou ? passo.explicacao : `**Resposta certa:**\n\n${respostaCerta(passo)}\n\n${passo.explicacao}`,
    });
  }

  if (fim) {
    const precisao = Math.round(((totalExercicios - errados.size) / Math.max(1, totalExercicios)) * 100);
    return (
      <Pagina className={l.fim} rotulo="Aula concluída">
        <Confete />
        <Capi pose="celebrando" tamanho={220} pular className={l.fimCapi} carregamento="eager" />
        <h1 className={l.fimTitulo} role="status">
          Aula concluída!
        </h1>
        <p className={l.fimSub}>{aula.titulo}</p>
        <div className={l.fimCartoes}>
          <CartaoEstatistica
            vertical
            icone="icone-xp"
            valor={fim.xp === null ? '…' : `${fim.xp} XP`}
            legenda="XP GANHO"
          />
          <CartaoEstatistica vertical icone="icone-alvo" valor={`${precisao}%`} legenda="PRECISÃO" />
        </div>
        {fim.erro ? <p className={s.erro}>{fim.erro}</p> : null}
        {fim.xp === 0 && !fim.erro ? <p className={s.nota}>Você já tinha concluído esta aula: o XP vem só na primeira vez.</p> : null}
        <div className={l.fimAcoes}>
          <Botao3D
            autoFocus
            onClick={() => navegar(proxima ? `/redacao/aula/${proxima.id}` : '/redacao?aba=temas', { replace: true })}
            iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
          >
            {proxima ? 'PRÓXIMA AULA' : 'FAZER O SIMULADO DE REDAÇÃO'}
          </Botao3D>
          <Botao3D variante="secundario" onClick={() => navegar(`/redacao/aula/${aula.id}/resumo`)}>
            VER O RESUMO DA AULA
          </Botao3D>
          <Botao3D variante="secundario" onClick={() => navegar('/redacao', { replace: true })}>
            VOLTAR PARA A TRILHA
          </Botao3D>
        </div>
      </Pagina>
    );
  }
  if (!passo) return <Carregando />;

  const topo = (
    <header className={l.topo}>
      <button type="button" className={l.fechar} aria-label="Sair da aula" onClick={() => setSairAberto(true)}>
        <IconeTraco nome="fechar" tamanho={26} espessura={2.6} />
      </button>
      <div className={l.progresso}>
        <span className={l.progressoTexto}>{aula.titulo}</span>
        <BarraProgresso
          valor={(feitos + (resultado?.acertou ? 1 : 0)) / Math.max(1, passos.length)}
          rotulo="Progresso da aula"
          fina
        />
      </div>
      <span className={l.espacoDireita} />
    </header>
  );
  const sair = (
    <Confirmacao
      aberto={sairAberto}
      titulo="Quer mesmo sair?"
      texto="O progresso desta aula não fica salvo."
      textoCancelar="CONTINUAR A AULA"
      textoConfirmar="SAIR"
      onCancelar={() => setSairAberto(false)}
      onConfirmar={() => navegar('/redacao', { replace: true })}
      topo={<Capi pose="incentivando" tamanho={110} />}
    />
  );

  if (passo.tipo === 'explica') {
    return (
      <Pagina comRodapeFixo className={l.pagina} rotulo="Aula de redação">
        {topo}
        <section className={l.dicaLicao} aria-labelledby="passo-titulo">
          <Capi pose="explicando" tamanho={130} carregamento="eager" className={l.dicaCapi} />
          <p className={l.dicaRotulo}>
            <Imagem nome="icone-dica" tamanho={22} /> A Capi explica
          </p>
          <h1 id="passo-titulo" className={l.dicaTitulo}>
            {passo.titulo}
          </h1>
          <div className={[l.dicaTexto, s.explicaTexto].join(' ')}>
            <Markdown texto={passo.texto} />
          </div>
          {passo.exemplo ? (
            <p className={l.dicaExemplo}>
              <strong>Macete: </strong>
              {passo.exemplo}
            </p>
          ) : null}
        </section>
        <div className={l.rodape}>
          <Botao3D autoFocus onClick={() => avancar(true)}>
            ENTENDI, CONTINUAR
          </Botao3D>
        </div>
        {sair}
      </Pagina>
    );
  }

  if (passo.tipo === 'escrever') {
    return (
      <Pagina comRodapeFixo className={l.pagina} rotulo="Aula de redação">
        {topo}
        <EscreverTrecho
          passo={passo}
          texto={texto}
          onTexto={setTexto}
          bloqueado={!!avaliacao || avaliando}
        />
        {!avaliacao ? (
          <div className={l.rodape}>
            <Botao3D
              disabled={texto.trim().length < passo.minimo}
              carregando={avaliando}
              onClick={() => void avaliar()}
              iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
            >
              AVALIAR MINHA RESPOSTA
            </Botao3D>
          </div>
        ) : (
          <FolhaFeedback
            tipo={'erro' in avaliacao || avaliacao.nivel !== 'boa' ? 'erro' : 'acerto'}
            titulo={
              'erro' in avaliacao
                ? 'Compare com o exemplo'
                : avaliacao.nivel === 'boa'
                  ? 'Ótima resposta!'
                  : avaliacao.nivel === 'quase'
                    ? 'Quase lá!'
                    : 'Vamos refazer?'
            }
            explicacao={<RetornoTrecho passo={passo} avaliacao={avaliacao} />}
            textoBotao="CONTINUAR"
            onContinuar={() => avancar(true)}
            rodape={
              <button type="button" className={s.reescrever} onClick={() => setAvaliacao(null)}>
                <IconeTraco nome="lapis" tamanho={16} /> Reescrever a minha resposta
              </button>
            }
          />
        )}
        {sair}
      </Pagina>
    );
  }

  const pronto =
    passo.tipo === 'escolha' ? letra !== null : passo.tipo === 'lacuna' ? opcao !== null : montados.length === passo.itens.length;
  const pergunta = passo.tipo === 'lacuna' ? 'Complete a frase' : passo.pergunta;

  return (
    <Pagina comRodapeFixo className={l.pagina} rotulo="Aula de redação">
      {topo}
      {passo.tipo === 'escolha' && passo.apoio ? (
        <div className={l.apoio} tabIndex={0} role="region" aria-label="Texto para analisar">
          <Markdown texto={passo.apoio} />
        </div>
      ) : null}
      <div className={l.enunciado}>
        <Imagem nome="mascote-explicando" tamanho={84} className={l.enunciadoCapi} carregamento="eager" />
        <div className={l.balao} id="pergunta">
          <Markdown texto={pergunta} />
        </div>
      </div>

      {passo.tipo === 'escolha' ? (
        <GrupoAlternativas
          alternativas={passo.alternativas.map((texto, k) => ({ letra: LETRAS[k]!, texto }))}
          selecionada={letra}
          correcao={resultado ? { gabarito: LETRAS[passo.correta]!, marcada: letra! } : null}
          onSelecionar={(x) => !resultado && setLetra(x)}
          onConfirmar={resultado ? () => avancar(resultado.acertou) : verificar}
          atalhosGlobais={!sairAberto}
          rotulo="Alternativas"
        />
      ) : passo.tipo === 'lacuna' ? (
        <Lacuna passo={passo} opcao={opcao} resultado={resultado} onEscolher={(k) => !resultado && setOpcao(k)} />
      ) : (
        <Ordenar
          passo={passo}
          banco={ordemBanco}
          montados={montados}
          resultado={resultado}
          onMudar={(m) => !resultado && setMontados(m)}
        />
      )}

      {!resultado ? (
        <div className={l.rodape}>
          <Botao3D disabled={!pronto} onClick={verificar} iconeDireita={<IconeTraco nome="seta" tamanho={20} />}>
            VERIFICAR
          </Botao3D>
        </div>
      ) : (
        <FolhaFeedback
          tipo={resultado.acertou ? 'acerto' : 'erro'}
          titulo={resultado.acertou ? 'Mandou bem!' : 'Quase! Olha a resposta'}
          explicacao={<Markdown texto={resultado.explicacao} />}
          textoBotao={resultado.acertou ? 'CONTINUAR' : 'ENTENDI'}
          onContinuar={() => avancar(resultado.acertou)}
          aviso={resultado.acertou ? null : <p className={s.nota}>Esta pergunta volta no fim da aula.</p>}
        />
      )}
      {sair}
    </Pagina>
  );
}

function estadoOpcao(certo: boolean, marcado: boolean, resultado: Resultado | null): string {
  if (!resultado) return marcado ? s.opcaoMarcada! : '';
  if (certo) return s.opcaoCerta!;
  return marcado ? s.opcaoErrada! : '';
}

function Lacuna({
  passo,
  opcao,
  resultado,
  onEscolher,
}: {
  passo: Extract<PassoAulaRedacao, { tipo: 'lacuna' }>;
  opcao: number | null;
  resultado: Resultado | null;
  onEscolher: (k: number) => void;
}) {
  const [antes, depois = ''] = passo.frase.split('___');
  return (
    <>
      <p className={s.lacunaFrase} aria-live="polite">
        {antes}
        <span className={[s.vaga, opcao !== null ? s.vagaCheia : ''].join(' ')}>
          {opcao !== null ? passo.opcoes[opcao] : ' '}
        </span>
        {depois}
      </p>
      <div className={s.opcoes} role="group" aria-label="Opções para a lacuna">
        {passo.opcoes.map((t, k) => (
          <button
            key={t}
            type="button"
            aria-pressed={opcao === k}
            disabled={!!resultado}
            className={[s.opcao, estadoOpcao(k === passo.correta, opcao === k, resultado)].join(' ')}
            onClick={() => onEscolher(k)}
          >
            {t}
          </button>
        ))}
      </div>
    </>
  );
}

function Ordenar({
  passo,
  banco,
  montados,
  resultado,
  onMudar,
}: {
  passo: Extract<PassoAulaRedacao, { tipo: 'ordenar' }>;
  banco: number[];
  montados: number[];
  resultado: Resultado | null;
  onMudar: (m: number[]) => void;
}) {
  return (
    <>
      <p className={s.nota}>Toque nos blocos na ordem certa. Toque de novo para tirar.</p>
      <ol className={s.ordem} aria-label="Sua ordem">
        {passo.itens.map((_, posicao) => {
          const k = montados[posicao];
          return (
            <li key={posicao} className={s.ordemLinha}>
              <span className={s.ordemNumero}>{posicao + 1}</span>
              {k === undefined ? (
                <span className={s.ordemVazio} />
              ) : (
                <button
                  type="button"
                  disabled={!!resultado}
                  className={[s.opcao, s.ordemItem, resultado ? (k === posicao ? s.opcaoCerta : s.opcaoErrada) : s.opcaoMarcada].join(' ')}
                  onClick={() => onMudar(montados.filter((m) => m !== k))}
                >
                  {passo.itens[k]}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div className={s.opcoes} role="group" aria-label="Blocos para ordenar">
        {banco
          .filter((k) => !montados.includes(k))
          .map((k) => (
            <button
              key={k}
              type="button"
              disabled={!!resultado}
              className={[s.opcao, s.ordemItem].join(' ')}
              onClick={() => onMudar([...montados, k])}
            >
              {passo.itens[k]}
            </button>
          ))}
      </div>
    </>
  );
}

function EscreverTrecho({
  passo,
  texto,
  onTexto,
  bloqueado,
}: {
  passo: Escrever;
  texto: string;
  onTexto: (t: string) => void;
  bloqueado: boolean;
}) {
  const n = texto.trim().length;
  return (
    <>
      {passo.apoio ? (
        <div className={l.apoio} tabIndex={0} role="region" aria-label="Tema">
          <Markdown texto={passo.apoio} />
        </div>
      ) : null}
      <div className={l.enunciado}>
        <Imagem nome="mascote-explicando" tamanho={84} className={l.enunciadoCapi} carregamento="eager" />
        <div className={l.balao}>
          <strong>{passo.titulo}</strong>
        </div>
      </div>
      <div className={s.tarefa}>
        <Markdown texto={passo.tarefa} />
      </div>
      <details className={s.criterios}>
        <summary>O que a banca quer ver nesta parte</summary>
        <ul>
          {passo.criterios.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
      <label className={s.folhaRotulo} htmlFor="trecho">
        Sua resposta
      </label>
      <textarea
        id="trecho"
        className={[s.folha, s.folhaTrecho].join(' ')}
        value={texto}
        maxLength={passo.maximo}
        readOnly={bloqueado}
        onChange={(e) => onTexto(e.target.value)}
        placeholder="Escreva aqui, como faria na folha da prova."
      />
      <p className={s.nota}>
        {n < passo.minimo ? `Escreva pelo menos ${passo.minimo} caracteres (${n} até agora).` : `${n} caracteres.`}
      </p>
    </>
  );
}

function RetornoTrecho({ passo, avaliacao }: { passo: Escrever; avaliacao: AvaliacaoTrecho | { erro: string } }) {
  return (
    <div className={s.retorno}>
      {'erro' in avaliacao ? (
        <p>{avaliacao.erro}</p>
      ) : (
        <>
          <p>{avaliacao.comentario}</p>
          <ul className={s.checklist} aria-label="Critérios da técnica">
            {avaliacao.criterios.map((c) => (
              <li key={c.criterio} className={c.ok ? s.checkOk : s.checkFalta}>
                <span aria-hidden="true">{c.ok ? '✓' : '✗'}</span> {c.criterio}
                <span className="sr-only">{c.ok ? ' (cumpriu)' : ' (faltou)'}</span>
              </li>
            ))}
          </ul>
          {avaliacao.sugestao ? (
            <>
              <h3>Como a sua resposta ficaria melhor</h3>
              <p className={s.textoFinal}>{avaliacao.sugestao}</p>
            </>
          ) : null}
        </>
      )}
      <h3>Exemplo de resposta</h3>
      <p className={s.textoFinal}>{passo.modelo}</p>
    </div>
  );
}

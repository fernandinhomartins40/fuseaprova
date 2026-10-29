import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AREAS_CARGO,
  LETRAS,
  NOMES_AREA,
  pendenciasParaPublicar,
  textoChipOrigem,
  type AreaCargo,
  type Letra,
  type OrigemQuestao,
  type StatusQuestao,
} from '@fuse/shared';
import type { QuestaoAdmin, QuestaoEntrada } from '@fuse/shared/api';
import { api, camposDoErro, enviarImagem, mensagemDeErro } from '../api';
import { useAssuntos, useDisciplinas } from '../consultas';
import { PreviaPergunta } from '../componentes/PreviaPergunta';
import {
  Alerta,
  Botao,
  Cabecalho,
  CampoArea,
  CampoSelecao,
  CampoTexto,
  Carregando,
  Cartao,
  ErroCaixa,
  estilos as s,
  Marcar,
  opcoesDe,
  Selo,
} from '../componentes/ui';
import {
  BASE_ADMIN,
  dataHora,
  NOMES_DIFICULDADE,
  NOMES_ORIGEM,
  NOMES_STATUS_QUESTAO,
  TOM_STATUS_QUESTAO,
} from '../util';
import e from './EditorQuestao.module.css';

export interface FormQuestao {
  provaOrigemId: string | null;
  numeroOrigem: string;
  origem: OrigemQuestao;
  disciplinaId: string;
  assuntoId: string;
  areas: AreaCargo[];
  dificuldade: number;
  textoApoio: string;
  enunciado: string;
  alternativas: { letra: Letra; texto: string }[];
  gabarito: Letra | '';
  dica: string;
  explicacao: string;
  dicaBolso: string;
  status: StatusQuestao;
  anuladaMotivo: string;
  revisada: boolean;
}

export const FORM_VAZIO: FormQuestao = {
  provaOrigemId: null,
  numeroOrigem: '',
  origem: 'autoral',
  disciplinaId: '',
  assuntoId: '',
  areas: [],
  dificuldade: 2,
  textoApoio: '',
  enunciado: '',
  alternativas: LETRAS.map((letra) => ({ letra, texto: '' })),
  gabarito: '',
  dica: '',
  explicacao: '',
  dicaBolso: '',
  status: 'rascunho',
  anuladaMotivo: '',
  revisada: false,
};

export function formDaQuestao(q: QuestaoAdmin): FormQuestao {
  return {
    provaOrigemId: q.provaOrigemId,
    numeroOrigem: q.numeroOrigem ? String(q.numeroOrigem) : '',
    origem: q.origem,
    disciplinaId: q.disciplinaId,
    assuntoId: q.assuntoId,
    areas: [...q.areas],
    dificuldade: q.dificuldade,
    textoApoio: q.textoApoio ?? '',
    enunciado: q.enunciado,
    alternativas: q.alternativas.map((a) => ({ ...a })),
    gabarito: q.gabarito ?? '',
    dica: q.dica ?? '',
    explicacao: q.explicacao ?? '',
    dicaBolso: q.dicaBolso ?? '',
    status: q.status,
    anuladaMotivo: q.anuladaMotivo ?? '',
    revisada: false,
  };
}

export function corpoDoForm(f: FormQuestao): QuestaoEntrada {
  return {
    provaOrigemId: f.origem === 'fau_real' ? f.provaOrigemId : null,
    numeroOrigem: f.origem === 'fau_real' && f.numeroOrigem ? Number(f.numeroOrigem) : null,
    origem: f.origem,
    disciplinaId: f.disciplinaId,
    assuntoId: f.assuntoId,
    areas: f.areas,
    dificuldade: f.dificuldade,
    textoApoio: f.textoApoio,
    enunciado: f.enunciado,
    alternativas: f.alternativas,
    gabarito: (f.gabarito || undefined) as Letra,
    dica: f.dica,
    explicacao: f.explicacao,
    dicaBolso: f.dicaBolso,
    status: f.status,
    anuladaMotivo: f.anuladaMotivo,
    revisada: f.revisada,
  };
}

/**
 * PRD 7.4: nenhuma questão é publicada sem dica, explicação e revisão humana.
 * A dica pode vir do assunto quando a questão não tem a própria.
 */
export function pendenciasDoForm(
  f: FormQuestao,
  revisadoPor: string | null,
  dicaDoAssunto: string | null,
): string[] {
  return pendenciasParaPublicar({
    enunciado: f.enunciado,
    alternativas: f.alternativas,
    gabarito: f.gabarito,
    explicacao: f.explicacao,
    dicaBolso: f.dicaBolso,
    dica: f.dica.trim() ? f.dica : dicaDoAssunto,
    revisadoPor: f.revisada ? 'revisada-agora' : revisadoPor,
  });
}

/** Erros de preenchimento verificados antes de enviar (mensagens em português). */
export function errosLocais(f: FormQuestao): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.disciplinaId) e.disciplinaId = 'Escolha a disciplina.';
  if (!f.assuntoId) e.assuntoId = 'Escolha o assunto.';
  if (!f.enunciado.trim()) e.enunciado = 'Informe o enunciado.';
  if (f.alternativas.some((a) => !a.texto.trim())) e.alternativas = 'Preencha as 5 alternativas.';
  if (!f.gabarito) e.gabarito = 'Marque o gabarito.';
  if (f.origem === 'fau_real' && !f.provaOrigemId) {
    e.provaOrigemId = 'Questão real da FAU precisa da prova de origem.';
  }
  if (f.status === 'anulada' && !f.anuladaMotivo.trim()) {
    e.anuladaMotivo = 'Informe o motivo da anulação.';
  }
  return e;
}

export default function EditorQuestao() {
  const { id } = useParams();
  const nova = !id || id === 'nova';
  const consulta = useQuery({
    queryKey: ['admin', 'questoes', 'item', id],
    queryFn: () => api('adminQuestaoObter', { params: { id: id as string } }),
    enabled: !nova,
  });

  if (nova) return <FormularioQuestao questao={null} />;
  if (consulta.isPending) return <Carregando />;
  if (consulta.isError || !consulta.data) {
    return (
      <>
        <Cabecalho titulo="Editar questão" />
        <ErroCaixa erro={consulta.error} tentar={() => void consulta.refetch()} />
      </>
    );
  }
  return <FormularioQuestao key={consulta.data.id} questao={consulta.data} />;
}

function FormularioQuestao({ questao }: { questao: QuestaoAdmin | null }) {
  const [f, setF] = useState<FormQuestao>(() => (questao ? formDaQuestao(questao) : FORM_VAZIO));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [bloqueio, setBloqueio] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscaProva, setBuscaProva] = useState('');
  const navegar = useNavigate();
  const qc = useQueryClient();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const disciplinas = useDisciplinas();
  const assuntos = useAssuntos();
  const assuntosDaDisciplina = useMemo(
    () => (assuntos.data?.itens ?? []).filter((a) => a.disciplinaId === f.disciplinaId),
    [assuntos.data, f.disciplinaId],
  );
  const assunto = assuntos.data?.itens.find((a) => a.id === f.assuntoId) ?? null;
  const disciplina = disciplinas.data?.itens.find((d) => d.id === f.disciplinaId) ?? null;

  const provaAtual = useQuery({
    queryKey: ['admin', 'provas', 'item', f.provaOrigemId],
    queryFn: () => api('adminProvaObter', { params: { id: f.provaOrigemId as string } }),
    enabled: f.origem === 'fau_real' && !!f.provaOrigemId,
  });
  const provasBusca = useQuery({
    queryKey: ['admin', 'provas', 'busca', buscaProva],
    queryFn: () => api('adminProvasListar', { query: { q: buscaProva || undefined, porPagina: 30 } }),
    enabled: f.origem === 'fau_real',
  });

  const pendencias = pendenciasDoForm(f, questao?.revisadoPor ?? null, assunto?.dicaTexto ?? null);

  const salvar = useMutation({
    mutationFn: (corpo: QuestaoEntrada) =>
      questao
        ? api('adminQuestaoAtualizar', { params: { id: questao.id }, corpo })
        : api('adminQuestaoCriar', { corpo }),
    onSuccess: (q) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'questoes'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'painel'] });
      if (!questao) {
        navegar(`${BASE_ADMIN}/questoes/${q.id}`, { replace: true });
      } else {
        qc.setQueryData(['admin', 'questoes', 'item', q.id], q);
      }
    },
    onError: (err) => {
      const c = { ...camposDoErro(err) };
      for (const [k, v] of Object.entries(c)) {
        if (k.startsWith('alternativas.') && !c.alternativas) c.alternativas = v;
      }
      setErros(c);
    },
  });

  function campo<K extends keyof FormQuestao>(k: K, v: FormQuestao[K]) {
    setF((atual) => ({ ...atual, [k]: v }));
    setBloqueio([]);
  }

  function alternativa(i: number, texto: string) {
    setF((atual) => ({
      ...atual,
      alternativas: atual.alternativas.map((a, j) => (j === i ? { ...a, texto } : a)),
    }));
  }

  function alternarArea(a: AreaCargo) {
    campo('areas', f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a]);
  }

  async function aoEnviarImagem(arquivo: File | undefined) {
    if (!arquivo) return;
    try {
      const r = await enviarImagem(arquivo);
      const alt = arquivo.name.replace(/\.[a-z0-9]+$/i, '');
      campo('enunciado', `${f.enunciado.trimEnd()}\n\n![${alt}](${r.url})`.trimStart());
      setAviso('Imagem enviada e inserida no enunciado.');
    } catch (err) {
      setAviso(mensagemDeErro(err));
    } finally {
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  }

  function aoSalvar(ev: FormEvent) {
    ev.preventDefault();
    setAviso(null);
    const locais = errosLocais(f);
    setErros(locais);
    if (Object.keys(locais).length > 0) return;
    if (f.status === 'publicada' && pendencias.length > 0) {
      setBloqueio(pendencias);
      return;
    }
    setBloqueio([]);
    salvar.mutate(corpoDoForm(f));
  }

  const opDisciplinas = (disciplinas.data?.itens ?? []).map((d) => ({ valor: d.id, rotulo: d.nome }));
  const opProvas = (provasBusca.data?.itens ?? []).map((p) => ({
    valor: p.id,
    rotulo: [p.orgao, p.ano, p.cargo].filter(Boolean).join(' · '),
  }));
  if (provaAtual.data && !opProvas.some((o) => o.valor === provaAtual.data.id)) {
    opProvas.unshift({
      valor: provaAtual.data.id,
      rotulo: [provaAtual.data.orgao, provaAtual.data.ano, provaAtual.data.cargo].filter(Boolean).join(' · '),
    });
  }

  const chip = textoChipOrigem({
    origem: f.origem,
    orgao: provaAtual.data?.orgao ?? null,
    ano: provaAtual.data?.ano ?? null,
  });

  return (
    <>
      <Cabecalho
        titulo={questao ? 'Editar questão' : 'Nova questão'}
        subtitulo={
          questao ? (
            <>
              <Selo tom={TOM_STATUS_QUESTAO[questao.status]}>{NOMES_STATUS_QUESTAO[questao.status]}</Selo>{' '}
              Versão {questao.versao} · atualizada em {dataHora(questao.atualizadoEm)}
              {questao.revisadoPor ? ' · revisada' : ' · sem revisão humana'}
              {questao.reportsAbertos > 0 ? (
                <>
                  {' · '}
                  <Link className={s.link} to={`${BASE_ADMIN}/reports?questaoId=${questao.id}`}>
                    {questao.reportsAbertos} reports abertos
                  </Link>
                </>
              ) : null}
            </>
          ) : (
            'Toda questão nova começa em rascunho.'
          )
        }
        acoes={
          <Link className={`${s.botao} ${s.secundario}`} to={`${BASE_ADMIN}/questoes`}>
            Voltar à lista
          </Link>
        }
      />

      <div className={e.layout}>
        <form className={s.formulario} onSubmit={aoSalvar} aria-label="Editor de questão" noValidate>
          {salvar.isSuccess ? <Alerta tom="sucesso">Questão salva (versão {salvar.data.versao}).</Alerta> : null}
          {salvar.isError ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
          {aviso ? <Alerta tom="info">{aviso}</Alerta> : null}
          {bloqueio.length > 0 ? (
            <Alerta tom="erro">
              Não dá para publicar ainda. Falta:
              <ul>
                {bloqueio.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Alerta>
          ) : null}

          <Cartao>
            <div className={s.linha}>
              <CampoSelecao
                rotulo="Origem"
                value={f.origem}
                opcoes={opcoesDe(NOMES_ORIGEM)}
                onChange={(ev) => campo('origem', ev.target.value as OrigemQuestao)}
                erro={erros.origem}
              />
              <CampoSelecao
                rotulo="Status"
                value={f.status}
                opcoes={opcoesDe(NOMES_STATUS_QUESTAO)}
                onChange={(ev) => campo('status', ev.target.value as StatusQuestao)}
                erro={erros.status}
              />
              <CampoSelecao
                rotulo="Dificuldade"
                value={String(f.dificuldade)}
                opcoes={opcoesDe(NOMES_DIFICULDADE as Record<string, string>)}
                onChange={(ev) => campo('dificuldade', Number(ev.target.value))}
              />
            </div>
            {f.status === 'anulada' ? (
              <CampoTexto
                rotulo="Motivo da anulação"
                value={f.anuladaMotivo}
                onChange={(ev) => campo('anuladaMotivo', ev.target.value)}
                erro={erros.anuladaMotivo}
              />
            ) : null}
            {f.origem === 'fau_real' ? (
              <div className={s.linha}>
                <CampoTexto
                  rotulo="Buscar prova de origem"
                  type="search"
                  value={buscaProva}
                  onChange={(ev) => setBuscaProva(ev.target.value)}
                  placeholder="Órgão, cargo ou ano"
                />
                <CampoSelecao
                  rotulo="Prova de origem"
                  vazio="Escolha a prova"
                  value={f.provaOrigemId ?? ''}
                  opcoes={opProvas}
                  onChange={(ev) => campo('provaOrigemId', ev.target.value || null)}
                  erro={erros.provaOrigemId}
                />
                <CampoTexto
                  rotulo="Número na prova"
                  type="number"
                  min={1}
                  value={f.numeroOrigem}
                  onChange={(ev) => campo('numeroOrigem', ev.target.value)}
                  erro={erros.numeroOrigem}
                />
              </div>
            ) : (
              <p className={s.suave}>
                Questão autoral: aparece como “Questão Fuse Aprova” e nunca é atribuída a
                uma prova real.
              </p>
            )}
          </Cartao>

          <Cartao>
            <div className={s.linha}>
              <CampoSelecao
                rotulo="Disciplina"
                vazio="Escolha"
                value={f.disciplinaId}
                opcoes={opDisciplinas}
                onChange={(ev) => {
                  setF((atual) => ({ ...atual, disciplinaId: ev.target.value, assuntoId: '' }));
                }}
                erro={erros.disciplinaId}
              />
              <CampoSelecao
                rotulo="Assunto"
                vazio={f.disciplinaId ? 'Escolha' : 'Escolha a disciplina antes'}
                value={f.assuntoId}
                opcoes={assuntosDaDisciplina.map((a) => ({ valor: a.id, rotulo: a.nome }))}
                onChange={(ev) => campo('assuntoId', ev.target.value)}
                erro={erros.assuntoId}
              />
            </div>
            <fieldset className={e.areas}>
              <legend className={s.rotulo}>Áreas de cargo</legend>
              {AREAS_CARGO.map((a) => (
                <Marcar
                  key={a}
                  rotulo={NOMES_AREA[a]}
                  checked={f.areas.includes(a)}
                  onChange={() => alternarArea(a)}
                />
              ))}
            </fieldset>
          </Cartao>

          <Cartao>
            <CampoArea
              rotulo="Texto de apoio (opcional)"
              rows={4}
              value={f.textoApoio}
              onChange={(ev) => campo('textoApoio', ev.target.value)}
              ajuda="Texto base para interpretação. Aceita markdown simples."
            />
            <CampoArea
              rotulo="Enunciado"
              rows={5}
              value={f.enunciado}
              onChange={(ev) => campo('enunciado', ev.target.value)}
              erro={erros.enunciado}
              ajuda="Markdown simples: **negrito**, *itálico*, listas com “- ” e imagem ![descrição](url)."
            />
            <div className={s.acoes}>
              <label className={`${s.botao} ${s.secundario} ${s.pequeno}`}>
                Inserir imagem
                <input
                  ref={arquivoRef}
                  className={e.arquivo}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(ev) => void aoEnviarImagem(ev.target.files?.[0])}
                />
              </label>
            </div>

            <fieldset className={e.alternativas}>
              <legend className={s.rotulo}>Alternativas e gabarito</legend>
              {erros.alternativas ? <span className={s.erroCampo}>{erros.alternativas}</span> : null}
              {f.alternativas.map((a, i) => (
                <div key={a.letra} className={e.alternativa}>
                  <label className={e.gabarito} title={`Marcar ${a.letra} como gabarito`}>
                    <input
                      type="radio"
                      name="gabarito"
                      value={a.letra}
                      checked={f.gabarito === a.letra}
                      onChange={() => campo('gabarito', a.letra)}
                      aria-label={`Gabarito ${a.letra}`}
                    />
                    <span>{a.letra}</span>
                  </label>
                  <input
                    className={s.entrada}
                    aria-label={`Alternativa ${a.letra}`}
                    value={a.texto}
                    onChange={(ev) => alternativa(i, ev.target.value)}
                  />
                </div>
              ))}
              {erros.gabarito ? <span className={s.erroCampo}>{erros.gabarito}</span> : null}
            </fieldset>
          </Cartao>

          <Cartao>
            <CampoArea
              rotulo="Dica"
              rows={2}
              value={f.dica}
              onChange={(ev) => campo('dica', ev.target.value)}
              ajuda={
                assunto?.dicaTexto
                  ? `Sem dica própria, vale a do assunto: “${assunto.dicaTexto.slice(0, 120)}”`
                  : 'Aparece no botão DICA (custa 5 gemas).'
              }
            />
            <CampoArea
              rotulo="Explicação"
              rows={4}
              value={f.explicacao}
              onChange={(ev) => campo('explicacao', ev.target.value)}
              ajuda="Aparece no feedback depois da resposta. Se o gabarito foi alterado nos recursos, cite aqui."
            />
            <CampoArea
              rotulo="Dica de bolso"
              rows={2}
              value={f.dicaBolso}
              onChange={(ev) => campo('dicaBolso', ev.target.value)}
            />
            <Marcar
              rotulo={
                questao?.revisadoPor
                  ? 'Revisão humana já registrada. Marque para registrar uma nova revisão sua.'
                  : 'Revisei esta questão (enunciado, alternativas, gabarito e explicação).'
              }
              checked={f.revisada}
              onChange={(ev) => campo('revisada', ev.target.checked)}
            />
          </Cartao>

          <div className={e.rodape}>
            <div>
              {pendencias.length === 0 ? (
                <Selo tom="sucesso">Pronta para publicar</Selo>
              ) : (
                <details className={s.detalhes}>
                  <summary>
                    {pendencias.length} {pendencias.length === 1 ? 'pendência' : 'pendências'} para publicar
                  </summary>
                  <ul className={s.lista}>
                    {pendencias.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <Botao type="submit" variante="primario" carregando={salvar.isPending}>
              {questao ? 'Salvar' : 'Criar questão'}
            </Botao>
          </div>
        </form>

        <aside className={e.previa} aria-label="Pré-visualização">
          <h2 className={s.secaoTitulo}>Pré-visualização</h2>
          <PreviaPergunta
            dados={{
              origem: f.origem,
              chipOrigem: chip,
              disciplina: disciplina?.nome ?? 'Disciplina',
              assunto: assunto?.nome ?? null,
              textoApoio: f.textoApoio.trim() ? f.textoApoio : null,
              enunciado: f.enunciado,
              alternativas: f.alternativas,
              gabarito: f.gabarito || null,
              explicacao: f.explicacao,
              dicaBolso: f.dicaBolso,
              dica: f.dica.trim() ? f.dica : (assunto?.dicaTexto ?? null),
            }}
          />
        </aside>
      </div>
    </>
  );
}

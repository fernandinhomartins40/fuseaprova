import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { STATUS_CONCURSO } from '@fuse/shared';
import type {
  ConcursoAdmin,
  ConcursoClonarEntrada,
  ConcursoEntrada,
  ProvaOrigemAdmin,
  ProvaOrigemEntrada,
  ProvasQuery,
} from '@fuse/shared/api';
import { api, camposDoErro, mensagemDeErro } from '../api';
import { chaves, useConcursos } from '../consultas';
import { EditorLinks, type LinkForm } from '../componentes/EditorLinks';
import {
  Alerta,
  Botao,
  Cabecalho,
  CampoArea,
  CampoSelecao,
  CampoTexto,
  Cartao,
  Consulta,
  estilos as s,
  Marcar,
  Modal,
  Paginacao,
  Selo,
  Tabela,
  TituloSecao,
} from '../componentes/ui';
import { dia, NOMES_STATUS_CONCURSO_CURTO } from '../util';

type Aba = 'concursos' | 'provas' | 'retirada';

export default function Concursos() {
  const [aba, setAba] = useState<Aba>('concursos');
  return (
    <>
      <Cabecalho
        titulo="Concursos e provas"
        subtitulo="Concurso de Palmital, provas de origem da FAU e seus links."
      />
      <div role="tablist" aria-label="Seções" className={s.acoes}>
        {(
          [
            ['concursos', 'Concursos'],
            ['provas', 'Provas de origem'],
            ['retirada', 'Retirada rápida'],
          ] as const
        ).map(([a, rotulo]) => (
          <Botao
            key={a}
            role="tab"
            aria-selected={aba === a}
            variante={aba === a ? 'primario' : 'secundario'}
            onClick={() => setAba(a)}
          >
            {rotulo}
          </Botao>
        ))}
      </div>
      <div role="tabpanel">
        {aba === 'concursos' ? <AbaConcursos /> : null}
        {aba === 'provas' ? <AbaProvas /> : null}
        {aba === 'retirada' ? <AbaRetirada /> : null}
      </div>
    </>
  );
}

/* ------------------------------------------------------------- concursos */

interface FormConcurso {
  nome: string;
  slug: string;
  banca: string;
  orgao: string;
  municipio: string;
  uf: string;
  ano: string;
  status: ConcursoAdmin['status'];
  dataProva: string;
  links: LinkForm[];
  ativo: boolean;
}

const CONCURSO_VAZIO: FormConcurso = {
  nome: '',
  slug: '',
  banca: 'FAU-Unicentro',
  orgao: '',
  municipio: '',
  uf: 'PR',
  ano: String(new Date().getFullYear()),
  status: 'aguardando_edital',
  dataProva: '',
  links: [],
  ativo: true,
};

function AbaConcursos() {
  const consulta = useConcursos();
  const [editando, setEditando] = useState<ConcursoAdmin | 'novo' | null>(null);
  const [clonando, setClonando] = useState<ConcursoAdmin | null>(null);
  return (
    <>
      <div className={s.cabecalho}>
        <TituloSecao>Concursos</TituloSecao>
        <Botao variante="primario" onClick={() => setEditando('novo')}>
          Novo concurso
        </Botao>
      </div>
      <p className={s.suave}>
        Cada concurso é um acesso separado para o aluno (R$ 397 o primeiro, R$ 197 cada adicional).
        Para abrir um concurso novo da FAU, use <strong>Criar a partir deste</strong>: a trilha e os
        cargos genéricos são copiados, o concurso entra <strong>inativo</strong> e só aparece para
        os alunos quando você marcar <strong>Concurso ativo</strong> em Editar.
      </p>
      <Consulta
        consulta={consulta}
        vazio={(d) => d.itens.length === 0}
        textoVazio="Nenhum concurso cadastrado."
      >
        {(d) => (
          <Tabela rotulo="Concursos">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Órgão</th>
                <th>Status</th>
                <th>Data da prova</th>
                <th>Links</th>
                <th>Versão</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {d.itens.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nome}</strong>
                    <div className={s.suave}>
                      {c.banca} · {c.slug}
                    </div>
                  </td>
                  <td>
                    {c.orgao}
                    <div className={s.suave}>
                      {c.municipio}-{c.uf} · {c.ano}
                    </div>
                  </td>
                  <td>
                    <Selo tom={c.status === 'edital_publicado' ? 'sucesso' : 'info'}>
                      {NOMES_STATUS_CONCURSO_CURTO[c.status]}
                    </Selo>
                    {!c.ativo ? <Selo tom="erro">Inativo</Selo> : null}
                  </td>
                  <td>{dia(c.dataProva)}</td>
                  <td>{c.links.length}</td>
                  <td>{c.versaoConteudo}</td>
                  <td>
                    <Botao pequeno onClick={() => setEditando(c)}>
                      Editar
                    </Botao>{' '}
                    <Botao pequeno onClick={() => setClonando(c)}>
                      Criar a partir deste
                    </Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Consulta>
      {editando ? (
        <ModalConcurso
          concurso={editando === 'novo' ? null : editando}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
      {clonando ? <ModalClonar modelo={clonando} aoFechar={() => setClonando(null)} /> : null}
    </>
  );
}

/** Cria um concurso novo com a trilha e os cargos genéricos de um concurso modelo (D21). */
function ModalClonar({ modelo, aoFechar }: { modelo: ConcursoAdmin; aoFechar: () => void }) {
  const [f, setF] = useState({
    nome: '',
    slug: '',
    banca: modelo.banca,
    orgao: '',
    municipio: '',
    uf: modelo.uf,
    ano: String(new Date().getFullYear()),
    dataProva: '',
  });
  const qc = useQueryClient();
  const clonar = useMutation({
    mutationFn: (corpo: ConcursoClonarEntrada) =>
      api('adminConcursoClonar', { params: { id: modelo.id }, corpo }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chaves.concursos }),
  });
  const erros = camposDoErro(clonar.error);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((a) => ({ ...a, [k]: v }));
  function enviar(e: FormEvent) {
    e.preventDefault();
    clonar.mutate({
      nome: f.nome,
      slug: f.slug,
      banca: f.banca,
      orgao: f.orgao,
      municipio: f.municipio,
      uf: f.uf,
      ano: Number(f.ano),
      dataProva: f.dataProva || null,
    });
  }
  const feito = clonar.data;
  return (
    <Modal titulo={`Criar a partir de: ${modelo.nome}`} aberto aoFechar={aoFechar} largo>
      {feito ? (
        <div className={s.formulario}>
          <Alerta tom="sucesso">
            Concurso criado, <strong>inativo</strong>: {feito.unidades} unidades, {feito.secoes}{' '}
            seções, {feito.licoes} lições e {feito.cargos} cargos genéricos copiados. Cadastre o
            edital na tela Edital e marque <strong>Concurso ativo</strong> em Editar quando quiser
            vender.
          </Alerta>
          <div className={s.modalRodape}>
            <Botao variante="primario" onClick={aoFechar}>
              Fechar
            </Botao>
          </div>
        </div>
      ) : (
        <form className={s.formulario} onSubmit={enviar} noValidate>
          {clonar.isError ? <Alerta tom="erro">{mensagemDeErro(clonar.error)}</Alerta> : null}
          <div className={s.linha}>
            <CampoTexto
              rotulo="Nome"
              value={f.nome}
              onChange={(e) => set('nome', e.target.value)}
              erro={erros.nome}
            />
            <CampoTexto
              rotulo="Slug"
              value={f.slug}
              onChange={(e) => set('slug', e.target.value)}
              erro={erros.slug}
              ajuda="Só letras minúsculas, números e hífen. Ex.: siqueira-campos-2026."
            />
            <CampoTexto
              rotulo="Banca"
              value={f.banca}
              onChange={(e) => set('banca', e.target.value)}
              erro={erros.banca}
            />
          </div>
          <div className={s.linha}>
            <CampoTexto
              rotulo="Órgão"
              value={f.orgao}
              onChange={(e) => set('orgao', e.target.value)}
              erro={erros.orgao}
            />
            <CampoTexto
              rotulo="Município"
              value={f.municipio}
              onChange={(e) => set('municipio', e.target.value)}
              erro={erros.municipio}
            />
            <CampoTexto
              rotulo="UF"
              maxLength={2}
              value={f.uf}
              onChange={(e) => set('uf', e.target.value)}
              erro={erros.uf}
            />
            <CampoTexto
              rotulo="Ano"
              type="number"
              value={f.ano}
              onChange={(e) => set('ano', e.target.value)}
              erro={erros.ano}
            />
          </div>
          <CampoTexto
            rotulo="Data da prova"
            type="date"
            value={f.dataProva}
            onChange={(e) => set('dataProva', e.target.value)}
            erro={erros.dataProva}
          />
          <div className={s.modalRodape}>
            <Botao data-fechar onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="primario" carregando={clonar.isPending}>
              Criar concurso
            </Botao>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ModalConcurso({
  concurso,
  aoFechar,
}: {
  concurso: ConcursoAdmin | null;
  aoFechar: () => void;
}) {
  const [f, setF] = useState<FormConcurso>(() =>
    concurso
      ? {
          nome: concurso.nome,
          slug: concurso.slug,
          banca: concurso.banca,
          orgao: concurso.orgao,
          municipio: concurso.municipio,
          uf: concurso.uf,
          ano: String(concurso.ano),
          status: concurso.status,
          dataProva: concurso.dataProva ?? '',
          links: concurso.links.map((l) => ({ ...l })),
          ativo: concurso.ativo,
        }
      : CONCURSO_VAZIO,
  );
  const qc = useQueryClient();
  const salvar = useMutation({
    mutationFn: (corpo: ConcursoEntrada) =>
      concurso
        ? api('adminConcursoAtualizar', { params: { id: concurso.id }, corpo })
        : api('adminConcursoCriar', { corpo }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.concursos });
      aoFechar();
    },
  });
  const erros = camposDoErro(salvar.error);
  const set = <K extends keyof FormConcurso>(k: K, v: FormConcurso[K]) =>
    setF((a) => ({ ...a, [k]: v }));

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate({
      nome: f.nome,
      slug: f.slug,
      banca: f.banca,
      orgao: f.orgao,
      municipio: f.municipio,
      uf: f.uf,
      ano: Number(f.ano),
      status: f.status,
      dataProva: f.dataProva || null,
      links: f.links.filter((l) => l.titulo.trim() || l.url.trim()),
      ativo: f.ativo,
    });
  }

  return (
    <Modal titulo={concurso ? 'Editar concurso' : 'Novo concurso'} aberto aoFechar={aoFechar} largo>
      <form className={s.formulario} onSubmit={enviar} noValidate>
        {salvar.isError ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
        <div className={s.linha}>
          <CampoTexto
            rotulo="Nome"
            value={f.nome}
            onChange={(e) => set('nome', e.target.value)}
            erro={erros.nome}
          />
          <CampoTexto
            rotulo="Slug"
            value={f.slug}
            onChange={(e) => set('slug', e.target.value)}
            erro={erros.slug}
          />
          <CampoTexto
            rotulo="Banca"
            value={f.banca}
            onChange={(e) => set('banca', e.target.value)}
            erro={erros.banca}
          />
        </div>
        <div className={s.linha}>
          <CampoTexto
            rotulo="Órgão"
            value={f.orgao}
            onChange={(e) => set('orgao', e.target.value)}
            erro={erros.orgao}
          />
          <CampoTexto
            rotulo="Município"
            value={f.municipio}
            onChange={(e) => set('municipio', e.target.value)}
            erro={erros.municipio}
          />
          <CampoTexto
            rotulo="UF"
            maxLength={2}
            value={f.uf}
            onChange={(e) => set('uf', e.target.value)}
            erro={erros.uf}
          />
          <CampoTexto
            rotulo="Ano"
            type="number"
            value={f.ano}
            onChange={(e) => set('ano', e.target.value)}
            erro={erros.ano}
          />
        </div>
        <div className={s.linha}>
          <CampoSelecao
            rotulo="Status"
            value={f.status}
            opcoes={STATUS_CONCURSO.map((st) => ({
              valor: st,
              rotulo: NOMES_STATUS_CONCURSO_CURTO[st],
            }))}
            onChange={(e) => set('status', e.target.value as FormConcurso['status'])}
            erro={erros.status}
            ajuda="Para publicar o edital (modo edital), use a tela Edital."
          />
          <CampoTexto
            rotulo="Data da prova"
            type="date"
            value={f.dataProva}
            onChange={(e) => set('dataProva', e.target.value)}
            erro={erros.dataProva}
          />
        </div>
        <EditorLinks links={f.links} aoMudar={(l) => set('links', l)} erros={erros} />
        <Marcar
          rotulo="Concurso ativo"
          checked={f.ativo}
          onChange={(e) => set('ativo', e.target.checked)}
        />
        <div className={s.modalRodape}>
          <Botao data-fechar onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- provas */

function AbaProvas() {
  const [filtros, setFiltros] = useState<ProvasQuery>({ pagina: 1, porPagina: 25 });
  const [editando, setEditando] = useState<ProvaOrigemAdmin | 'nova' | null>(null);
  const [retirando, setRetirando] = useState<ProvaOrigemAdmin | null>(null);
  const consulta = useQuery({
    queryKey: ['admin', 'provas', 'lista', filtros],
    queryFn: () => api('adminProvasListar', { query: filtros }),
    placeholderData: keepPreviousData,
  });
  const mudar = (k: keyof ProvasQuery, v: string) =>
    setFiltros((f) => ({ ...f, pagina: 1, [k]: v || undefined }));

  return (
    <>
      <div className={s.cabecalho}>
        <TituloSecao>Provas de origem</TituloSecao>
        <Botao variante="primario" onClick={() => setEditando('nova')}>
          Nova prova
        </Botao>
      </div>
      <form
        className={s.filtros}
        role="search"
        aria-label="Filtros de provas"
        onSubmit={(e) => e.preventDefault()}
      >
        <CampoTexto
          rotulo="Buscar"
          type="search"
          value={filtros.q ?? ''}
          onChange={(e) => mudar('q', e.target.value)}
        />
        <CampoTexto
          rotulo="Banca"
          value={filtros.banca ?? ''}
          onChange={(e) => mudar('banca', e.target.value)}
        />
        <CampoTexto
          rotulo="UF"
          maxLength={2}
          value={filtros.uf ?? ''}
          onChange={(e) => mudar('uf', e.target.value.toUpperCase())}
        />
        <CampoTexto
          rotulo="Ano"
          type="number"
          value={filtros.ano ?? ''}
          onChange={(e) => mudar('ano', e.target.value)}
        />
        <CampoSelecao
          rotulo="Status"
          vazio="Todos"
          value={filtros.status ?? ''}
          opcoes={[
            { valor: 'ativa', rotulo: 'Ativa' },
            { valor: 'retirada', rotulo: 'Retirada' },
          ]}
          onChange={(e) => mudar('status', e.target.value)}
        />
        <Marcar
          rotulo="Só relevantes para Palmital"
          checked={filtros.relevanciaPalmital === 'true'}
          onChange={(e) => mudar('relevanciaPalmital', e.target.checked ? 'true' : '')}
        />
      </form>
      <Consulta
        consulta={consulta}
        vazio={(d) => d.itens.length === 0}
        textoVazio="Nenhuma prova com esses filtros."
      >
        {(d) => (
          <>
            <Tabela rotulo="Provas de origem">
              <thead>
                <tr>
                  <th>Prova</th>
                  <th>Local</th>
                  <th>Data</th>
                  <th>Links</th>
                  <th>Questões</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.itens.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nome ?? p.orgao}</strong>
                      <div className={s.suave}>
                        {p.banca}
                        {p.cargo ? ` · ${p.cargo}` : ''}
                        {p.nivel ? ` · ${p.nivel}` : ''}
                      </div>
                      {p.relevanciaPalmital ? (
                        <Selo tom="destaque">Relevante p/ Palmital</Selo>
                      ) : null}
                    </td>
                    <td>
                      {p.orgao}
                      <div className={s.suave}>
                        {[p.municipio, p.uf].filter(Boolean).join('-') || '—'}
                      </div>
                    </td>
                    <td>{p.dataProva ? dia(p.dataProva) : (p.ano ?? '—')}</td>
                    <td>
                      <LinksProva p={p} />
                    </td>
                    <td>{p.totalQuestoes}</td>
                    <td>
                      <Selo tom={p.status === 'ativa' ? 'sucesso' : 'erro'}>
                        {p.status === 'ativa' ? 'Ativa' : 'Retirada'}
                      </Selo>
                    </td>
                    <td>
                      <div className={s.acoes}>
                        <Botao pequeno onClick={() => setEditando(p)}>
                          Editar
                        </Botao>
                        {p.status === 'ativa' ? (
                          <Botao pequeno variante="perigo" onClick={() => setRetirando(p)}>
                            Retirar
                          </Botao>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
            <Paginacao
              pagina={d.pagina}
              porPagina={d.porPagina}
              total={d.total}
              aoMudar={(pagina) => setFiltros((f) => ({ ...f, pagina }))}
            />
          </>
        )}
      </Consulta>
      {editando ? (
        <ModalProva
          prova={editando === 'nova' ? null : editando}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
      {retirando ? <ModalRetirada prova={retirando} aoFechar={() => setRetirando(null)} /> : null}
    </>
  );
}

function LinksProva({ p }: { p: ProvaOrigemAdmin }) {
  const links = [
    ['Página', p.urlPagina],
    ['Caderno', p.urlCaderno],
    ['Gabarito', p.urlGabarito],
    ['Recursos', p.urlRecursos],
  ].filter((l): l is [string, string] => !!l[1]);
  if (!links.length) return <span className={s.suave}>—</span>;
  return (
    <span className={s.acoes}>
      {links.map(([t, u]) => (
        <a key={t} className={s.link} href={u} target="_blank" rel="noopener noreferrer">
          {t}
        </a>
      ))}
    </span>
  );
}

type FormProva = Record<
  | 'banca'
  | 'nome'
  | 'tipo'
  | 'orgao'
  | 'municipio'
  | 'uf'
  | 'ano'
  | 'dataProva'
  | 'cargo'
  | 'nivel'
  | 'urlPagina'
  | 'urlCaderno'
  | 'urlGabarito'
  | 'urlRecursos'
  | 'slugFau',
  string
> & { relevanciaPalmital: boolean; status: 'ativa' | 'retirada' };

function ModalProva({ prova, aoFechar }: { prova: ProvaOrigemAdmin | null; aoFechar: () => void }) {
  const [f, setF] = useState<FormProva>(() => ({
    banca: prova?.banca ?? 'FAU-Unicentro',
    nome: prova?.nome ?? '',
    tipo: prova?.tipo ?? '',
    orgao: prova?.orgao ?? '',
    municipio: prova?.municipio ?? '',
    uf: prova?.uf ?? '',
    ano: prova?.ano ? String(prova.ano) : '',
    dataProva: prova?.dataProva ?? '',
    cargo: prova?.cargo ?? '',
    nivel: prova?.nivel ?? '',
    urlPagina: prova?.urlPagina ?? '',
    urlCaderno: prova?.urlCaderno ?? '',
    urlGabarito: prova?.urlGabarito ?? '',
    urlRecursos: prova?.urlRecursos ?? '',
    slugFau: prova?.slugFau ?? '',
    relevanciaPalmital: prova?.relevanciaPalmital ?? false,
    status: prova?.status ?? 'ativa',
  }));
  const qc = useQueryClient();
  const salvar = useMutation({
    mutationFn: (corpo: ProvaOrigemEntrada) =>
      prova
        ? api('adminProvaAtualizar', { params: { id: prova.id }, corpo })
        : api('adminProvaCriar', { corpo }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'provas'] });
      aoFechar();
    },
  });
  const erros = camposDoErro(salvar.error);
  const set = (k: keyof FormProva, v: string) => setF((a) => ({ ...a, [k]: v }));
  const texto = (
    k: keyof FormProva,
    rotulo: string,
    extra: { type?: string; maxLength?: number } = {},
  ) => (
    <CampoTexto
      rotulo={rotulo}
      value={String(f[k])}
      onChange={(e) => set(k, e.target.value)}
      erro={erros[k]}
      {...extra}
    />
  );

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate({
      banca: f.banca,
      nome: f.nome,
      tipo: f.tipo,
      orgao: f.orgao,
      municipio: f.municipio,
      uf: f.uf ? f.uf.toUpperCase() : null,
      ano: f.ano ? Number(f.ano) : null,
      dataProva: f.dataProva || null,
      cargo: f.cargo,
      nivel: f.nivel,
      urlPagina: f.urlPagina,
      urlCaderno: f.urlCaderno,
      urlGabarito: f.urlGabarito,
      urlRecursos: f.urlRecursos,
      slugFau: f.slugFau,
      relevanciaPalmital: f.relevanciaPalmital,
      status: f.status,
    });
  }

  return (
    <Modal
      titulo={prova ? 'Editar prova de origem' : 'Nova prova de origem'}
      aberto
      aoFechar={aoFechar}
      largo
    >
      <form className={s.formulario} onSubmit={enviar} noValidate>
        {salvar.isError ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
        <div className={s.linha}>
          {texto('banca', 'Banca')}
          {texto('nome', 'Nome do certame')}
          {texto('tipo', 'Tipo (concurso, PSS…)')}
        </div>
        <div className={s.linha}>
          {texto('orgao', 'Órgão')}
          {texto('municipio', 'Município')}
          {texto('uf', 'UF', { maxLength: 2 })}
        </div>
        <div className={s.linha}>
          {texto('ano', 'Ano', { type: 'number' })}
          {texto('dataProva', 'Data da prova', { type: 'date' })}
          {texto('cargo', 'Cargo')}
          {texto('nivel', 'Nível')}
        </div>
        <div className={s.linha}>
          {texto('urlPagina', 'Link da página do certame', { type: 'url' })}
          {texto('urlCaderno', 'Link do caderno', { type: 'url' })}
        </div>
        <div className={s.linha}>
          {texto('urlGabarito', 'Link do gabarito definitivo', { type: 'url' })}
          {texto('urlRecursos', 'Link das respostas aos recursos', { type: 'url' })}
        </div>
        <div className={s.linha}>
          {texto('slugFau', 'Slug na FAU')}
          <CampoSelecao
            rotulo="Status"
            value={f.status}
            opcoes={[
              { valor: 'ativa', rotulo: 'Ativa' },
              { valor: 'retirada', rotulo: 'Retirada' },
            ]}
            onChange={(e) => setF((a) => ({ ...a, status: e.target.value as FormProva['status'] }))}
          />
        </div>
        <Marcar
          rotulo="Relevante para Palmital (Paraná, 2022 em diante)"
          checked={f.relevanciaPalmital}
          onChange={(e) => setF((a) => ({ ...a, relevanciaPalmital: e.target.checked }))}
        />
        <div className={s.modalRodape}>
          <Botao data-fechar onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------- retirada rápida */

function ModalRetirada({ prova, aoFechar }: { prova: ProvaOrigemAdmin; aoFechar: () => void }) {
  const [motivo, setMotivo] = useState('');
  const qc = useQueryClient();
  const retirar = useMutation({
    mutationFn: async () => {
      const r = await api('adminQuestoesRetirarOrigem', {
        corpo: { provaOrigemId: prova.id, motivo },
      });
      await api('adminProvaAtualizar', { params: { id: prova.id }, corpo: { status: 'retirada' } });
      return r;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'provas'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'questoes'] });
    },
  });
  return (
    <Modal
      titulo="Retirar a prova inteira?"
      aberto
      aoFechar={aoFechar}
      rodape={
        retirar.isSuccess ? (
          <Botao onClick={aoFechar}>Fechar</Botao>
        ) : (
          <>
            <Botao data-fechar onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              disabled={motivo.trim().length < 3}
              carregando={retirar.isPending}
              onClick={() => retirar.mutate()}
            >
              Retirar prova
            </Botao>
          </>
        )
      }
    >
      {retirar.isSuccess ? (
        <Alerta tom="sucesso">
          {retirar.data.questoesRetiradas} questões retiradas. Elas somem do app no próximo
          carregamento.
        </Alerta>
      ) : (
        <>
          <p>
            Todas as questões de <strong>{prova.nome ?? prova.orgao}</strong>
            {prova.ano ? ` (${prova.ano})` : ''} passam para <strong>retirada</strong> e somem do
            app do aluno no próximo carregamento, inclusive offline.
          </p>
          <CampoArea
            rotulo="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            ajuda="Fica na auditoria."
          />
          {retirar.isError ? <Alerta tom="erro">{mensagemDeErro(retirar.error)}</Alerta> : null}
        </>
      )}
    </Modal>
  );
}

function AbaRetirada() {
  const [banca, setBanca] = useState('FAU-Unicentro');
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const qc = useQueryClient();
  const retirar = useMutation({
    mutationFn: () => api('adminQuestoesRetirarOrigem', { corpo: { banca, motivo } }),
    onSuccess: () => {
      setConfirmar(false);
      void qc.invalidateQueries({ queryKey: ['admin', 'questoes'] });
    },
  });
  return (
    <>
      <TituloSecao>Retirar toda a origem fau_real de uma banca</TituloSecao>
      <Cartao>
        <p>
          Use em caso de pedido da banca ou problema de direitos: todas as questões{' '}
          <strong>fau_real</strong> da banca passam para <strong>retirada</strong>. As questões
          autorais não mudam. Para retirar uma prova só, use o botão Retirar na aba Provas de
          origem.
        </p>
        <div className={s.formulario}>
          <div className={s.linha}>
            <CampoTexto rotulo="Banca" value={banca} onChange={(e) => setBanca(e.target.value)} />
          </div>
          <CampoArea
            rotulo="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            ajuda="Fica na auditoria."
          />
          <div>
            <Botao
              variante="perigo"
              disabled={!banca.trim() || motivo.trim().length < 3}
              onClick={() => {
                retirar.reset();
                setConfirmar(true);
              }}
            >
              Retirar todas as questões da banca
            </Botao>
          </div>
          {retirar.isSuccess ? (
            <Alerta tom="sucesso">{retirar.data.questoesRetiradas} questões retiradas.</Alerta>
          ) : null}
        </div>
      </Cartao>
      <Modal
        titulo={`Retirar todas as questões da ${banca}?`}
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        rodape={
          <>
            <Botao data-fechar onClick={() => setConfirmar(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              carregando={retirar.isPending}
              onClick={() => retirar.mutate()}
            >
              Sim, retirar tudo
            </Botao>
          </>
        }
      >
        <p>
          Essa ação tira do ar todas as questões reais dessa banca. Para voltar, será preciso
          republicar uma a uma ou em lote.
        </p>
        {retirar.isError ? <Alerta tom="erro">{mensagemDeErro(retirar.error)}</Alerta> : null}
      </Modal>
    </>
  );
}

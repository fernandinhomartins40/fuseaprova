/**
 * Layout do painel único (D13 + D24). O menu é filtrado pelo papel: o superadmin vê tudo
 * (negócio e Conteúdo); o admin vê só o grupo Conteúdo. A gestão de conteúdo é a seção
 * /super/conteudo/*, no mesmo layout, sem recarregar a página.
 * - desktop (≥ 1024 px): sidebar fixa de 248 px, recolhível para 72 px (preferência no
 *   localStorage), com a marca, os grupos e, no rodapé, o usuário, o status do 2FA e Sair;
 * - tablet (768–1023 px): sidebar só com ícones, rótulo em tooltip;
 * - celular (< 768 px): barra superior fixa (título, voltar), navegação inferior fixa e
 *   "Mais" (folha com o resto e Sair).
 * Em /super/2fa o layout é "fechado" (S-19): só a marca e Sair, em qualquer largura.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { iniciais, type Papel } from '@fuse/shared';
import { api } from '../admin/api';
import { ContextoTopoPainel, type TopoPainel } from '../admin/componentes/topo';
import { juntarClasses } from '../admin/util';
import { ContextoLayout, Folha, type CtxLayout } from './componentes';
import { Icone, type NomeIcone } from './icones';
import { preferencia, useFaixa } from './midia';
import s from './super.module.css';
import { caminho } from './util';

interface ItemMenu {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  fim?: boolean;
}

interface GrupoMenu {
  grupo: string;
  itens: ItemMenu[];
}

/** D24: a seção Conteúdo (as telas de gestão de conteúdo). */
export const GRUPO_CONTEUDO: GrupoMenu = {
  grupo: 'Conteúdo',
  itens: [
    { para: 'conteudo', rotulo: 'Resumo do conteúdo', icone: 'conteudo', fim: true },
    { para: 'conteudo/concursos', rotulo: 'Concursos e provas', icone: 'concursos' },
    { para: 'conteudo/questoes', rotulo: 'Questões', icone: 'questoes' },
    { para: 'conteudo/importacao', rotulo: 'Importação', icone: 'importacao' },
    { para: 'conteudo/trilhas', rotulo: 'Trilhas', icone: 'trilhas' },
    { para: 'conteudo/edital', rotulo: 'Edital', icone: 'edital' },
    { para: 'conteudo/reports', rotulo: 'Erros relatados', icone: 'reports' },
  ],
};

/** Menu completo do superadmin. */
export const MENU: GrupoMenu[] = [
  { grupo: 'Visão geral', itens: [{ para: '', rotulo: 'Visão geral', icone: 'visao', fim: true }] },
  {
    grupo: 'Pagamentos',
    itens: [
      { para: 'pagamentos', rotulo: 'Pagamentos', icone: 'pagamentos' },
      { para: 'precos', rotulo: 'Preços e cupons', icone: 'pagamentos' },
      { para: 'webhooks', rotulo: 'Webhooks', icone: 'webhooks' },
    ],
  },
  { grupo: 'Conta Asaas', itens: [{ para: 'asaas', rotulo: 'Conta Asaas', icone: 'asaas' }] },
  { grupo: 'Usuários', itens: [{ para: 'usuarios', rotulo: 'Usuários', icone: 'usuarios' }] },
  { grupo: 'Equipe', itens: [{ para: 'equipe', rotulo: 'Equipe', icone: 'equipe' }] },
  { grupo: 'Comunicação', itens: [{ para: 'comunicacao', rotulo: 'Comunicação', icone: 'comunicacao' }] },
  GRUPO_CONTEUDO,
  {
    grupo: 'Sistema',
    itens: [
      { para: 'sistema', rotulo: 'Sistema', icone: 'sistema' },
      { para: 'auditoria', rotulo: 'Auditoria', icone: 'auditoria' },
    ],
  },
];

/** O menu de cada papel (a API também recusa: esconder no menu não basta). */
export function menuDoPapel(papel: Papel): GrupoMenu[] {
  return papel === 'superadmin' ? MENU : [GRUPO_CONTEUDO];
}

const item = (para: string): ItemMenu => GRUPO_CONTEUDO.itens.find((i) => i.para === para)!;

interface NavCelular {
  baixo: ItemMenu[];
  mais: { titulo?: string; itens: ItemMenu[] }[];
}

const NAV_CELULAR: Record<'superadmin' | 'admin', NavCelular> = {
  superadmin: {
    baixo: [
      { para: '', rotulo: 'Visão geral', icone: 'visao', fim: true },
      { para: 'pagamentos', rotulo: 'Pagamentos', icone: 'pagamentos' },
      { para: 'usuarios', rotulo: 'Usuários', icone: 'usuarios' },
      { para: 'asaas', rotulo: 'Asaas', icone: 'asaas' },
    ],
    mais: [
      {
        itens: [
          { para: 'precos', rotulo: 'Preços e cupons', icone: 'pagamentos' },
          { para: 'equipe', rotulo: 'Equipe', icone: 'equipe' },
          { para: 'comunicacao', rotulo: 'Comunicação', icone: 'comunicacao' },
          { para: 'webhooks', rotulo: 'Webhooks', icone: 'webhooks' },
          { para: 'sistema', rotulo: 'Sistema', icone: 'sistema' },
          { para: 'auditoria', rotulo: 'Auditoria', icone: 'auditoria' },
        ],
      },
      { titulo: 'Conteúdo', itens: GRUPO_CONTEUDO.itens },
    ],
  },
  admin: {
    baixo: [
      { ...item('conteudo/questoes') },
      { ...item('conteudo/importacao') },
      { ...item('conteudo/trilhas') },
      { ...item('conteudo/reports'), rotulo: 'Erros' },
    ],
    mais: [{ itens: [item('conteudo'), item('conteudo/concursos'), item('conteudo/edital')] }],
  },
};

const CHAVE_RECOLHIDA = 'fuse.super.lateralRecolhida';

function Rodape({ recolhida, papel }: { recolhida: boolean; papel: Papel }) {
  const ehSuper = papel === 'superadmin';
  const me = useQuery({ queryKey: ['super', 'me'], queryFn: () => api('meObter'), staleTime: 60_000 });
  const status = useQuery({ queryKey: ['super', '2fa'], queryFn: () => api('super2faStatus'), staleTime: 60_000, enabled: ehSuper });
  const nome = me.data?.nome ?? '…';
  const ok = status.data?.verificadoNestaSessao;
  const detalhe = ehSuper ? (ok ? '2FA ativo nesta sessão' : '2FA pendente') : 'Equipe de conteúdo';
  return (
    <div className={s.quem} title={recolhida ? `${nome} · ${detalhe}` : undefined}>
      <span className={s.avatar} aria-hidden="true">
        {iniciais(nome)}
      </span>
      <span className={s.rodapeTexto}>
        {nome}
        <small>{detalhe}</small>
      </span>
    </div>
  );
}

function Marca({ papel }: { papel: Papel }) {
  return (
    <div className={s.marca}>
      <span className={s.marcaIcone} aria-hidden="true">
        F
      </span>
      <span className={s.textoMarca}>
        Fuse Aprova
        <br />
        <span className={s.seloSuper}>{papel === 'superadmin' ? 'Superadmin' : 'Conteúdo'}</span>
      </span>
    </div>
  );
}

export function Layout({
  children,
  sair,
  atualizarSessao,
  papel = 'superadmin',
}: {
  children: ReactNode;
  sair: () => void;
  atualizarSessao?: () => Promise<void> | void;
  papel?: Papel;
}) {
  const faixa = useFaixa();
  const [recolhida, setRecolhida] = useState(() => preferencia.ler(CHAVE_RECOLHIDA) === '1');
  const [topo, setTopo] = useState<{ titulo: string; voltar?: string | undefined }>({ titulo: 'Painel' });
  const [mais, setMais] = useState(false);
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const ehSuper = papel === 'superadmin';
  const nomeMenu = ehSuper ? 'superadmin' : 'painel de conteúdo';

  const definirTopo = useCallback<CtxLayout['definirTopo']>((t) => setTopo({ titulo: t.titulo, voltar: t.voltar }), []);
  const ctx = useMemo<CtxLayout>(
    () => ({ faixa, definirTopo, atualizarSessao: atualizarSessao ?? (() => undefined), sair }),
    [faixa, definirTopo, atualizarSessao, sair],
  );
  const topoPainel = useMemo<TopoPainel>(() => ({ definirTopo, celular: faixa === 'mobile' }), [definirTopo, faixa]);
  const alternar = () => {
    setRecolhida((r) => {
      preferencia.gravar(CHAVE_RECOLHIDA, r ? '0' : '1');
      return !r;
    });
  };
  const prover = (conteudo: ReactNode) => (
    <ContextoLayout.Provider value={ctx}>
      <ContextoTopoPainel.Provider value={topoPainel}>{conteudo}</ContextoTopoPainel.Provider>
    </ContextoLayout.Provider>
  );

  // S-19: no 2FA, nada de menu (os links voltariam ao 2FA pela guarda); só a marca e Sair.
  if (pathname.startsWith(caminho('2fa'))) {
    return prover(
      <div className={juntarClasses(s.raiz, s.mobile)} data-painel-admin="" data-layout={faixa}>
        <header className={s.barraTopo}>
          <span className={s.marcaIcone} aria-hidden="true" style={{ width: 32, height: 32, margin: '0 6px' }}>
            F
          </span>
          <h1>{topo.titulo}</h1>
          <button type="button" className={s.botaoIcone} aria-label="Sair" onClick={sair} style={{ marginLeft: 'auto' }}>
            <Icone nome="sair" />
          </button>
        </header>
        <main className={s.conteudo} id="conteudo-super">
          {children}
        </main>
      </div>,
    );
  }

  if (faixa === 'mobile') {
    const nav = NAV_CELULAR[ehSuper ? 'superadmin' : 'admin'];
    const ativo = (i: ItemMenu) => (i.fim ? pathname === caminho(i.para) : pathname.startsWith(caminho(i.para)));
    const maisAtivo = nav.mais.some((g) => g.itens.some(ativo));
    return prover(
      <div className={juntarClasses(s.raiz, s.mobile)} data-painel-admin="" data-layout="mobile">
        <header className={s.barraTopo}>
          {topo.voltar ? (
            <button type="button" className={s.botaoIcone} aria-label="Voltar" onClick={() => navegar(topo.voltar!)}>
              <Icone nome="voltar" />
            </button>
          ) : (
            <span className={s.marcaIcone} aria-hidden="true" style={{ width: 32, height: 32, margin: '0 6px' }}>
              F
            </span>
          )}
          <h1>{topo.titulo}</h1>
        </header>
        <main className={s.conteudo} id="conteudo-super">
          {children}
        </main>
        <nav className={s.navBaixo} aria-label={`Navegação do ${nomeMenu}`}>
          {nav.baixo.map((i) => (
            <NavLink key={i.para} to={caminho(i.para)} end={i.fim ?? false} className={({ isActive }) => juntarClasses(s.navItem, isActive && s.navAtivo)}>
              <Icone nome={i.icone} />
              <span>{i.rotulo}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className={juntarClasses(s.navItem, maisAtivo && s.navAtivo)}
            aria-haspopup="dialog"
            aria-expanded={mais}
            aria-current={maisAtivo ? 'page' : undefined}
            onClick={() => setMais(true)}
          >
            <Icone nome="mais" />
            <span>Mais</span>
          </button>
        </nav>
        <Folha titulo="Mais opções" aberta={mais} aoFechar={() => setMais(false)}>
          {nav.mais.map((g) => (
            <div key={g.titulo ?? 'principal'} role="group" aria-label={g.titulo ?? 'Mais opções'}>
              {g.titulo ? <div className={s.grupoMais}>{g.titulo}</div> : null}
              <ul className={s.listaMais}>
                {g.itens.map((i) => (
                  <li key={i.para}>
                    <Link to={caminho(i.para)} onClick={() => setMais(false)} aria-current={ativo(i) ? 'page' : undefined}>
                      <Icone nome={i.icone} /> {i.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <ul className={s.listaMais}>
            <li>
              <button type="button" onClick={sair}>
                <Icone nome="sair" /> Sair
              </button>
            </li>
          </ul>
        </Folha>
      </div>,
    );
  }

  const soIcones = faixa === 'tablet' || recolhida;
  return prover(
    <div
      className={juntarClasses(s.raiz, faixa === 'tablet' ? s.tablet : s.desktop, faixa === 'desktop' && recolhida && s.recolhida)}
      data-painel-admin=""
      data-layout={faixa}
    >
      <nav className={s.lateral} aria-label={`Menu do ${nomeMenu}`}>
        <Marca papel={papel} />
        {menuDoPapel(papel).map((g) => (
          <div key={g.grupo} role="group" aria-label={g.grupo}>
            {g.itens.length > 1 || g.itens[0]!.rotulo !== g.grupo ? <div className={s.grupo}>{g.grupo}</div> : null}
            {g.itens.map((i) => (
              <NavLink
                key={i.para}
                to={caminho(i.para)}
                end={i.fim ?? false}
                data-dica={soIcones ? i.rotulo : undefined}
                aria-label={soIcones ? i.rotulo : undefined}
                className={({ isActive }) => juntarClasses(s.item, isActive && s.ativo)}
              >
                <Icone nome={i.icone} />
                <span className={s.rotulo}>{i.rotulo}</span>
              </NavLink>
            ))}
          </div>
        ))}
        <div className={s.rodapeLateral}>
          <Rodape recolhida={soIcones} papel={papel} />
          <button type="button" className={s.item} onClick={sair} data-dica={soIcones ? 'Sair' : undefined} aria-label={soIcones ? 'Sair' : undefined}>
            <Icone nome="sair" />
            <span className={s.rotulo}>Sair</span>
          </button>
          {faixa === 'desktop' ? (
            <button
              type="button"
              className={s.item}
              onClick={alternar}
              aria-pressed={recolhida}
              aria-label={recolhida ? 'Expandir o menu' : 'Recolher o menu'}
              data-dica={recolhida ? 'Expandir o menu' : undefined}
            >
              <Icone nome={recolhida ? 'expandir' : 'recolher'} />
              <span className={s.rotulo}>Recolher</span>
            </button>
          ) : null}
        </div>
      </nav>
      <div className={s.area}>
        <main className={s.conteudo} id="conteudo-super">
          {children}
        </main>
      </div>
    </div>,
  );
}

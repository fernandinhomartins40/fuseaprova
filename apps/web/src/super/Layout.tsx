/**
 * Layout do /super (D13):
 * - desktop (≥ 1024 px): sidebar fixa de 248 px, recolhível para 72 px (preferência no
 *   localStorage), com a marca, os grupos, o link para o /admin e, no rodapé, o usuário, o
 *   status do 2FA e Sair;
 * - tablet (768–1023 px): sidebar só com ícones, rótulo em tooltip;
 * - celular (< 768 px): barra superior fixa (título, voltar, ações), navegação inferior fixa
 *   com Visão geral, Pagamentos, Usuários, Asaas e "Mais" (folha com o resto e Sair).
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { iniciais } from '@fuse/shared';
import { api } from '../admin/api';
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

export const MENU: { grupo: string; itens: ItemMenu[] }[] = [
  { grupo: 'Visão geral', itens: [{ para: '', rotulo: 'Visão geral', icone: 'visao', fim: true }] },
  {
    grupo: 'Pagamentos',
    itens: [
      { para: 'pagamentos', rotulo: 'Pagamentos', icone: 'pagamentos' },
      { para: 'webhooks', rotulo: 'Webhooks', icone: 'webhooks' },
    ],
  },
  { grupo: 'Conta Asaas', itens: [{ para: 'asaas', rotulo: 'Conta Asaas', icone: 'asaas' }] },
  { grupo: 'Usuários', itens: [{ para: 'usuarios', rotulo: 'Usuários', icone: 'usuarios' }] },
  { grupo: 'Equipe', itens: [{ para: 'equipe', rotulo: 'Equipe', icone: 'equipe' }] },
  { grupo: 'Comunicação', itens: [{ para: 'comunicacao', rotulo: 'Comunicação', icone: 'comunicacao' }] },
  {
    grupo: 'Sistema',
    itens: [
      { para: 'sistema', rotulo: 'Sistema', icone: 'sistema' },
      { para: 'auditoria', rotulo: 'Auditoria', icone: 'auditoria' },
    ],
  },
];

const NAV_BAIXO: ItemMenu[] = [
  { para: '', rotulo: 'Visão geral', icone: 'visao', fim: true },
  { para: 'pagamentos', rotulo: 'Pagamentos', icone: 'pagamentos' },
  { para: 'usuarios', rotulo: 'Usuários', icone: 'usuarios' },
  { para: 'asaas', rotulo: 'Asaas', icone: 'asaas' },
];

const MAIS: ItemMenu[] = [
  { para: 'equipe', rotulo: 'Equipe', icone: 'equipe' },
  { para: 'comunicacao', rotulo: 'Comunicação', icone: 'comunicacao' },
  { para: 'webhooks', rotulo: 'Webhooks', icone: 'webhooks' },
  { para: 'sistema', rotulo: 'Sistema', icone: 'sistema' },
  { para: 'auditoria', rotulo: 'Auditoria', icone: 'auditoria' },
];

const CHAVE_RECOLHIDA = 'fuse.super.lateralRecolhida';

function Rodape({ recolhida }: { recolhida: boolean }) {
  const me = useQuery({ queryKey: ['super', 'me'], queryFn: () => api('meObter'), staleTime: 60_000 });
  const status = useQuery({ queryKey: ['super', '2fa'], queryFn: () => api('super2faStatus'), staleTime: 60_000 });
  const nome = me.data?.nome ?? '…';
  const ok = status.data?.verificadoNestaSessao;
  return (
    <div className={s.quem} title={recolhida ? `${nome} · 2FA ${ok ? 'ativo' : 'pendente'}` : undefined}>
      <span className={s.avatar} aria-hidden="true">
        {iniciais(nome)}
      </span>
      <span className={s.rodapeTexto}>
        {nome}
        <small>{ok ? '2FA ativo nesta sessão' : '2FA pendente'}</small>
      </span>
    </div>
  );
}

export function Layout({ children, sair, atualizarSessao }: { children: ReactNode; sair: () => void; atualizarSessao?: () => Promise<void> | void }) {
  const faixa = useFaixa();
  const [recolhida, setRecolhida] = useState(() => preferencia.ler(CHAVE_RECOLHIDA) === '1');
  const [topo, setTopo] = useState<{ titulo: string; voltar?: string | undefined }>({ titulo: 'Superadmin' });
  const [mais, setMais] = useState(false);
  const navegar = useNavigate();
  const { pathname } = useLocation();

  const definirTopo = useCallback<CtxLayout['definirTopo']>((t) => setTopo({ titulo: t.titulo, voltar: t.voltar }), []);
  const ctx = useMemo<CtxLayout>(
    () => ({ faixa, definirTopo, atualizarSessao: atualizarSessao ?? (() => undefined), sair }),
    [faixa, definirTopo, atualizarSessao, sair],
  );
  const alternar = () => {
    setRecolhida((r) => {
      preferencia.gravar(CHAVE_RECOLHIDA, r ? '0' : '1');
      return !r;
    });
  };
  const na2fa = pathname.startsWith(caminho('2fa'));

  if (faixa === 'mobile') {
    const maisAtivo = MAIS.some((i) => pathname.startsWith(caminho(i.para)));
    return (
      <ContextoLayout.Provider value={ctx}>
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
          {na2fa ? null : (
            <nav className={s.navBaixo} aria-label="Navegação do superadmin">
              {NAV_BAIXO.map((i) => (
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
          )}
          <Folha titulo="Mais opções" aberta={mais} aoFechar={() => setMais(false)}>
            <ul className={s.listaMais}>
              {MAIS.map((i) => (
                <li key={i.para}>
                  <Link to={caminho(i.para)} onClick={() => setMais(false)} aria-current={pathname.startsWith(caminho(i.para)) ? 'page' : undefined}>
                    <Icone nome={i.icone} /> {i.rotulo}
                  </Link>
                </li>
              ))}
              <li>
                <a href="/admin">
                  <Icone nome="admin" /> Painel de conteúdo (/admin)
                </a>
              </li>
              <li>
                <button type="button" onClick={sair}>
                  <Icone nome="sair" /> Sair
                </button>
              </li>
            </ul>
          </Folha>
        </div>
      </ContextoLayout.Provider>
    );
  }

  const soIcones = faixa === 'tablet' || recolhida;
  return (
    <ContextoLayout.Provider value={ctx}>
      <div
        className={juntarClasses(s.raiz, faixa === 'tablet' ? s.tablet : s.desktop, faixa === 'desktop' && recolhida && s.recolhida)}
        data-painel-admin=""
        data-layout={faixa}
      >
        <nav className={s.lateral} aria-label="Menu do superadmin">
          <div className={s.marca}>
            <span className={s.marcaIcone} aria-hidden="true">
              F
            </span>
            <span className={s.textoMarca}>
              Fuse Aprova
              <br />
              <span className={s.seloSuper}>Superadmin</span>
            </span>
          </div>
          {MENU.map((g) => (
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
          <a className={s.item} href="/admin" data-dica={soIcones ? 'Painel de conteúdo (/admin)' : undefined} aria-label={soIcones ? 'Painel de conteúdo (/admin)' : undefined}>
            <Icone nome="admin" />
            <span className={s.rotulo}>Conteúdo (/admin)</span>
          </a>
          <div className={s.rodapeLateral}>
            <Rodape recolhida={soIcones} />
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
      </div>
    </ContextoLayout.Provider>
  );
}


import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useMe } from '../../api/consultas';
import { BASE_ADMIN, juntarClasses } from '../util';
import s from './Layout.module.css';

interface ItemMenu {
  para: string;
  rotulo: string;
  fim?: boolean;
}

const MENU: { grupo: string; itens: ItemMenu[] }[] = [
  { grupo: 'Visão geral', itens: [{ para: '', rotulo: 'Painel', fim: true }] },
  {
    grupo: 'Conteúdo',
    itens: [
      { para: 'concursos', rotulo: 'Concursos e provas' },
      { para: 'questoes', rotulo: 'Questões' },
      { para: 'importacao', rotulo: 'Importação' },
      { para: 'trilhas', rotulo: 'Trilhas' },
      { para: 'edital', rotulo: 'Edital' },
    ],
  },
  {
    grupo: 'Operação',
    itens: [
      { para: 'reports', rotulo: 'Reports' },
    ],
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const me = useMe({ semRedirecionar: true });
  return (
    <div className={s.raiz} data-painel-admin="">
      <nav className={s.lateral} aria-label="Menu do painel admin">
        <div className={s.marca}>
          <span className={s.marcaIcone} aria-hidden="true">
            F
          </span>
          <span>
            Fuse Aprova
            <small>Painel admin</small>
          </span>
        </div>
        {MENU.map((g) => (
          <div key={g.grupo}>
            <div className={s.grupo}>{g.grupo}</div>
            {g.itens.map((i) => (
              <NavLink
                key={i.para}
                to={i.para ? `${BASE_ADMIN}/${i.para}` : BASE_ADMIN}
                end={i.fim ?? false}
                className={({ isActive }) => juntarClasses(s.link, isActive && s.ativo)}
              >
                {i.rotulo}
              </NavLink>
            ))}
          </div>
        ))}
        <div className={s.rodapeLateral}>
          {me.data?.papel === 'superadmin' ? <a href="/super">Voltar ao painel superadmin</a> : null}
          <a href="/aprender">Ver o app como aluno</a>
        </div>
      </nav>
      <main className={s.conteudo}>{children}</main>
    </div>
  );
}

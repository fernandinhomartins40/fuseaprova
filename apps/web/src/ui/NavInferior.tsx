import { NavLink } from 'react-router-dom';
import { Imagem } from './Imagem';
import type { NomeAsset } from '../assets/gerados';
import s from './NavInferior.module.css';

const ITENS: { para: string; rotulo: string; icone: NomeAsset }[] = [
  { para: '/aprender', rotulo: 'Início', icone: 'nav-inicio' },
  { para: '/revisar', rotulo: 'Revisar', icone: 'nav-revisao' },
  { para: '/simulado', rotulo: 'Simulados', icone: 'nav-simulados' },
  { para: '/liga', rotulo: 'Liga', icone: 'nav-liga' },
  { para: '/perfil', rotulo: 'Perfil', icone: 'nav-perfil' },
];

/** Navegação inferior: Início · Revisar · Simulados · Liga · Perfil, com selo de revisões. */
export function NavInferior({ revisoesPendentes = 0 }: { revisoesPendentes?: number }) {
  return (
    <nav className={s.nav} aria-label="Navegação principal">
      <ul className={s.lista}>
        {ITENS.map((i) => (
          <li key={i.para}>
            <NavLink
              to={i.para}
              className={({ isActive }) => [s.item, isActive ? s.ativo : ''].join(' ')}
            >
              <span className={s.caixa}>
                <span className={s.icone}>
                  <Imagem nome={i.icone} tamanho={30} carregamento="eager" />
                </span>
                {i.para === '/revisar' && revisoesPendentes > 0 ? (
                  <span className={s.selo}>
                    {revisoesPendentes > 99 ? '99+' : revisoesPendentes}
                    <span className="sr-only"> revisões pendentes</span>
                  </span>
                ) : null}
              </span>
              <span className={s.rotulo}>{i.rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

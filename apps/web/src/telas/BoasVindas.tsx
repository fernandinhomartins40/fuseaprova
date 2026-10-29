import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RODAPE_LEGAL } from '@fuse/shared';
import { rotaInicial } from '../app/rotaInicial';
import { useMe } from '../api/consultas';
import { EH_APP } from '../nativo/plataforma';
import { Botao3D, Capi, Chip, IconeTraco, Imagem } from '../ui';
import s from './BoasVindas.module.css';

/** 01 Boas-vindas (`/`). Com sessão: aluno com acesso → Trilha; sem acesso → Pagamento; equipe → seu painel. */
export default function BoasVindas() {
  const navegar = useNavigate();
  const me = useMe({ semRedirecionar: true });

  useEffect(() => {
    if (!me.data) return;
    navegar(rotaInicial(me.data), { replace: true });
  }, [me.data, navegar]);

  return (
    <main className={s.tela}>
      <div className={s.fundo} aria-hidden="true" />
      <header className={s.logo}>
        <Imagem nome="logo-completa" tamanho={190} alt="Fuse Aprova" carregamento="eager" />
      </header>
      <div className={s.heroi}>
        <Imagem nome="elemento-faisca" tamanho={40} className={s.faisca} carregamento="eager" />
        <Capi pose="boas-vindas" tamanho={300} carregamento="eager" className={s.capi} />
        <p className={s.balao}>Bora passar?</p>
      </div>
      <section className={s.conteudo}>
        <h1 className={s.titulo}>
          Estude para concursos com{' '}
          <span className={s.destaque}>questões de provas anteriores.</span>
        </h1>
        <p className={s.subtitulo}>Questões reais explicadas. Prática diária, no seu ritmo.</p>
        <ul className={s.chips} aria-label="O que o app oferece">
          <li>
            <Chip grande>Lições curtas</Chip>
          </li>
          <li>
            <Chip grande>Simulados</Chip>
          </li>
          <li>
            <Chip grande>Estudo offline</Chip>
          </li>
        </ul>
        <div className={s.acoes}>
          {EH_APP ? (
            // App nativo: só entra quem já tem conta (D20).
            <Botao3D
              onClick={() => navegar('/entrar')}
              iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
            >
              Entrar
            </Botao3D>
          ) : (
            <>
              <Botao3D
                onClick={() => navegar('/cadastro')}
                iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
              >
                Começar agora
              </Botao3D>
              <Botao3D variante="secundario" onClick={() => navegar('/entrar')}>
                Já tenho conta
              </Botao3D>
            </>
          )}
        </div>
        <p className={s.legal}>{RODAPE_LEGAL}</p>
      </section>
    </main>
  );
}

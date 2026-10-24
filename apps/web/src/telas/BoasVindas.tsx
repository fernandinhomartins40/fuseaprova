import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RODAPE_LEGAL } from '@fuse/shared';
import { useMe } from '../api/consultas';
import { Botao3D, Capi, Chip, IconeTraco, Imagem } from '../ui';
import s from './BoasVindas.module.css';

/** 01 Boas-vindas (`/`). Com sessão: acesso → Trilha; sem acesso → Pagamento. */
export default function BoasVindas() {
  const navegar = useNavigate();
  const me = useMe({ semRedirecionar: true });

  useEffect(() => {
    if (!me.data) return;
    navegar(me.data.acesso ? '/aprender' : '/pagamento', { replace: true });
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
          Treine para o concurso da Prefeitura de Palmital com as{' '}
          <span className={s.destaque}>provas da FAU.</span>
        </h1>
        <p className={s.subtitulo}>Questões reais explicadas. Prática diária, no seu ritmo.</p>
        <ul className={s.chips} aria-label="Sobre o concurso">
          <li>
            <Chip grande icone={<Imagem nome="icone-localizacao" tamanho={22} />}>
              Palmital · PR
            </Chip>
          </li>
          <li>
            <Chip grande>Banca FAU-Unicentro</Chip>
          </li>
          <li>
            <Chip grande>2026/27</Chip>
          </li>
        </ul>
        <div className={s.acoes}>
          <Botao3D
            onClick={() => navegar('/cadastro')}
            iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
          >
            Começar agora
          </Botao3D>
          <Botao3D variante="secundario" onClick={() => navegar('/entrar')}>
            Já tenho conta
          </Botao3D>
        </div>
        <p className={s.legal}>{RODAPE_LEGAL}</p>
      </section>
    </main>
  );
}

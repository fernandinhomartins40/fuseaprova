import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { NOMES_AREA, type AreaCargo, type MetaDiaria } from '@fuse/shared';
import { OPCOES_META_DIARIA } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES, useConcurso, useMe } from '../api/consultas';
import { ativarPush, pushSuportado } from '../app/push';
import {
  Botao3D,
  CabecalhoVoltar,
  Capi,
  Carregando,
  ErroTela,
  IconeTraco,
  Imagem,
  Pagina,
} from '../ui';
import type { NomeAsset } from '../assets/gerados';
import s from './Onboarding.module.css';

const ICONE_AREA: Record<AreaCargo, NomeAsset> = {
  administrativo: 'icone-especificos',
  saude_medio: 'icone-alvo',
  saude_superior: 'icone-medalha',
  educacao: 'icone-portugues',
  operacional: 'icone-localizacao',
  servicos_gerais: 'icone-configuracoes',
  social_juridico: 'icone-gerais',
};

/** ✏️ Escolha do cargo (`/onboarding`): cargo → meta diária → lembrete (Web Push). */
export default function Onboarding() {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const concurso = useConcurso();
  const [passo, setPasso] = useState(1);
  const [cargoId, setCargoId] = useState<string | null>(me.data?.cargo?.id ?? null);
  const [meta, setMeta] = useState<MetaDiaria>((me.data?.metaDiaria as MetaDiaria) ?? 1);
  const [hora, setHora] = useState(me.data?.lembreteHora ?? '19:00');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoPush, setAvisoPush] = useState<string | null>(null);

  async function concluir(lembrete: boolean) {
    if (!cargoId) return;
    setSalvando(true);
    setErro(null);
    let notificacoes = false;
    if (lembrete) {
      const r = await ativarPush();
      notificacoes = r === 'ativado';
      if (r === 'negado')
        setAvisoPush(
          'As notificações foram bloqueadas no navegador. Você pode ativar depois em Configurações.',
        );
    }
    try {
      const novo = await chamar('meAtualizar', {
        corpo: {
          cargoId,
          metaDiaria: meta,
          lembreteHora: lembrete ? hora : null,
          notificacoes,
          onboardingConcluido: true,
        },
      });
      qc.setQueryData(CHAVES.me, novo);
      void qc.invalidateQueries({ queryKey: CHAVES.trilha });
      navegar('/aprender', { replace: true });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (concurso.isPending) return <Carregando />;
  if (concurso.isError)
    return (
      <ErroTela mensagem={mensagemDeErro(concurso.error)} onTentar={() => concurso.refetch()} />
    );

  const c = concurso.data;
  const cargosPorArea = c.areas
    .map((a) => ({
      ...a,
      cargos: c.cargos.filter((x) => x.area === a.area && (c.modoEdital ? !x.generico : true)),
    }))
    .filter((a) => a.cargos.length > 0);

  return (
    <Pagina comRodapeFixo>
      <CabecalhoVoltar
        semVoltar={passo === 1}
        aoVoltar={() => setPasso((p) => Math.max(1, p - 1))}
        titulo={`Passo ${passo} de 3`}
      />
      {passo === 1 ? (
        <section aria-labelledby="titulo-cargo">
          <h1 id="titulo-cargo" className={s.titulo}>
            Qual cargo você quer?
          </h1>
          <p className={s.sub}>
            Sua trilha mistura o conteúdo comum com o específico da área. Dá para trocar depois no
            Perfil.
          </p>
          <div role="radiogroup" aria-labelledby="titulo-cargo" className={s.areas}>
            {cargosPorArea.map((a) => (
              <div key={a.area} className={s.area}>
                <h2 className={s.areaTitulo}>{a.nome || NOMES_AREA[a.area]}</h2>
                {a.cargos.map((cg) => (
                  <button
                    key={cg.id}
                    type="button"
                    role="radio"
                    aria-checked={cargoId === cg.id}
                    className={[s.cartao, cargoId === cg.id ? s.marcado : ''].join(' ')}
                    onClick={() => setCargoId(cg.id)}
                  >
                    <span className={s.icone}>
                      <Imagem nome={ICONE_AREA[a.area]} tamanho={40} />
                    </span>
                    <span className={s.cartaoTextos}>
                      <span className={s.cartaoTitulo}>{cg.nome}</span>
                      <span className={s.cartaoSub}>
                        {cg.generico
                          ? a.exemplos.join(', ')
                          : cg.vagas != null
                            ? `${cg.vagas} vagas`
                            : NOMES_AREA[a.area]}
                      </span>
                    </span>
                    {cargoId === cg.id ? (
                      <span className={s.ok} aria-hidden="true">
                        <IconeTraco nome="check" tamanho={16} espessura={3.4} />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : passo === 2 ? (
        <section aria-labelledby="titulo-meta">
          <h1 id="titulo-meta" className={s.titulo}>
            Quanto tempo por dia?
          </h1>
          <p className={s.sub}>
            Essa é a sua meta diária. Pouco todo dia vale mais que muito de vez em quando.
          </p>
          <Capi pose="constancia" tamanho={150} className={s.capiMeio} />
          <div role="radiogroup" aria-labelledby="titulo-meta" className={s.opcoes}>
            {OPCOES_META_DIARIA.map((o) => (
              <button
                key={o.valor}
                type="button"
                role="radio"
                aria-checked={meta === o.valor}
                className={[s.cartao, meta === o.valor ? s.marcado : ''].join(' ')}
                onClick={() => setMeta(o.valor)}
              >
                <span className={s.cartaoTitulo}>{o.texto}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section aria-labelledby="titulo-lembrete">
          <h1 id="titulo-lembrete" className={s.titulo}>
            Quer um lembrete?
          </h1>
          <p className={s.sub}>
            Mandamos no máximo 1 aviso por dia, só se a meta ainda não foi cumprida.
          </p>
          <Capi
            pose="explicando"
            tamanho={140}
            className={s.capiMeio}
            fala="A Capi te chama na hora certa. 5 minutinhos e a ofensiva continua!"
          />
          <label className={s.hora}>
            <span>Horário do lembrete</span>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} step={300} />
          </label>
          {!pushSuportado() ? (
            <p className={s.nota}>
              Este navegador não aceita notificações. Instale o app na tela inicial para receber
              lembretes.
            </p>
          ) : null}
          {avisoPush ? (
            <p className={s.nota} role="status">
              {avisoPush}
            </p>
          ) : null}
        </section>
      )}

      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}

      <div className={s.rodape}>
        {passo < 3 ? (
          <Botao3D
            disabled={passo === 1 && !cargoId}
            onClick={() => setPasso((p) => p + 1)}
            iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
          >
            Continuar
          </Botao3D>
        ) : (
          <>
            <Botao3D carregando={salvando} onClick={() => void concluir(true)}>
              Ativar lembrete
            </Botao3D>
            <Botao3D variante="secundario" disabled={salvando} onClick={() => void concluir(false)}>
              Agora não
            </Botao3D>
          </>
        )}
      </div>
    </Pagina>
  );
}

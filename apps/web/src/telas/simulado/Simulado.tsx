import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatarCronometro, formatarDiaMes, diaSP } from '@fuse/shared';
import { NOTA_SIMULADO_LEGISLACAO, type Distribuicao } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { CHAVES, useConcurso, useMe, useSimulados } from '../../api/consultas';
import {
  Botao3D,
  CabecalhoApp,
  Capi,
  Carregando,
  ErroTela,
  IconeTraco,
  Imagem,
  Pagina,
  TituloSecao,
} from '../../ui';
import s from './Simulado.module.css';

const PADRAO: Distribuicao = { portugues: 5, matematica: 5, gerais: 5, especificos: 25 };

function duracaoCurta(ms: number): string {
  const min = Math.round(ms / 60_000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

/** 11 Simulado (`/simulado`): hero roxo, seletor de cargo, COMEÇAR SIMULADO e "Seus simulados". */
export default function Simulado() {
  const me = useMe();
  const concurso = useConcurso();
  const lista = useSimulados();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const [cargoId, setCargoId] = useState<string | null>(null);

  const cargos = (concurso.data?.cargos ?? []).filter((c) =>
    concurso.data?.modoEdital ? !c.generico : true,
  );
  const escolhido = cargoId ?? me.data?.cargo?.id ?? cargos[0]?.id ?? null;
  const cargo = cargos.find((c) => c.id === escolhido);
  const dist = cargo?.distribuicao ?? PADRAO;
  const totalQ = dist.portugues + dist.matematica + dist.gerais + dist.especificos;

  const criar = useMutation({
    mutationFn: (id: string) => chamar('simuladoCriar', { corpo: { cargoId: id } }),
    onSuccess: (sim) => {
      qc.setQueryData(CHAVES.simulado(sim.id), sim);
      void qc.invalidateQueries({ queryKey: CHAVES.simulados });
      navegar(`/simulado/${sim.id}`);
    },
  });

  const emAndamento = lista.data?.emAndamento ?? null;

  return (
    <Pagina comNav rotulo="Simulados">
      <CabecalhoApp nome={me.data?.nome} id={me.data?.id} />
      <h1 className={s.titulo}>Simulados</h1>

      <section className={s.heroi} aria-labelledby="sim-hero">
        <p className={s.heroiRotulo}>PROVA COMPLETA NO PADRÃO FAU</p>
        <h2 id="sim-hero" className={s.heroiTitulo}>
          {totalQ} questões · 4h · mínimo 50%
        </h2>
        <ul className={s.blocos} aria-label="Distribuição das questões">
          <li>
            <strong>{dist.portugues}</strong>
            <span>PORTUGUÊS</span>
          </li>
          <li>
            <strong>{dist.matematica}</strong>
            <span>MAT/RL</span>
          </li>
          <li>
            <strong>{dist.gerais}</strong>
            <span>C. GERAIS</span>
          </li>
          <li className={s.blocoGrande}>
            <strong>{dist.especificos}</strong>
            <span>ESPECÍFICOS</span>
          </li>
        </ul>
        <p className={s.heroiNota}>{NOTA_SIMULADO_LEGISLACAO}</p>
        <Imagem nome="icone-simulados" tamanho={64} className={s.heroiIcone} />
      </section>

      {emAndamento ? (
        <section className={s.andamento}>
          <div>
            <p className={s.andamentoTitulo}>Simulado em andamento</p>
            <p className={s.andamentoSub}>
              {emAndamento.cargo.nome} · tempo restante{' '}
              {formatarCronometro(new Date(emAndamento.terminaEm).getTime() - Date.now())}
            </p>
          </div>
          <Botao3D
            variante="roxo"
            compacto
            bloco={false}
            onClick={() => navegar(`/simulado/${emAndamento.id}`)}
          >
            CONTINUAR
          </Botao3D>
        </section>
      ) : null}

      <label className={s.cargo}>
        <span className={s.cargoRotulo}>Cargo</span>
        <span className={s.selectCaixa}>
          <select
            value={escolhido ?? ''}
            onChange={(e) => setCargoId(e.target.value)}
            disabled={concurso.isPending}
          >
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <IconeTraco nome="chevronBaixo" tamanho={22} className={s.selectSeta} />
        </span>
      </label>

      {criar.isError ? (
        <p className={s.erro} role="alert">
          {mensagemDeErro(criar.error)}
        </p>
      ) : null}
      <Botao3D
        variante="roxo"
        disabled={!escolhido || !!emAndamento}
        carregando={criar.isPending}
        onClick={() => escolhido && criar.mutate(escolhido)}
      >
        COMEÇAR SIMULADO
      </Botao3D>

      <TituloSecao>Seus simulados</TituloSecao>
      {lista.isPending ? (
        <Carregando />
      ) : lista.isError ? (
        <ErroTela mensagem={mensagemDeErro(lista.error)} onTentar={() => lista.refetch()} />
      ) : lista.data.itens.length === 0 ? (
        <Capi
          pose="estudando"
          tamanho={110}
          fala="Seu primeiro simulado mostra onde focar. Reserve 4 horas e bora!"
        />
      ) : (
        <ul className={s.historico}>
          {lista.data.itens.map((it, i) => (
            <li key={it.id}>
              <button
                type="button"
                className={s.item}
                onClick={() => navegar(`/simulado/${it.id}`)}
              >
                <span className={[s.pct, it.aprovado ? s.pctOk : s.pctBaixo].join(' ')}>
                  {Math.round(it.percentual)}%
                </span>
                <span className={s.itemTextos}>
                  <span className={s.itemTitulo}>
                    Simulado {lista.data.itens.length - i} · {it.cargo.nome}
                  </span>
                  <span className={s.itemSub}>
                    {formatarDiaMes(diaSP(new Date(it.entregueEm)))} · {it.acertos} de{' '}
                    {it.totalQuestoes} · {duracaoCurta(it.tempoGastoMs)}
                  </span>
                </span>
                <span className={[s.selo, it.aprovado ? s.seloOk : s.seloBaixo].join(' ')}>
                  {it.aprovado ? 'APROVADO' : 'ABAIXO'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Pagina>
  );
}

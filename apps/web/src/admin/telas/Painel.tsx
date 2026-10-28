import { useQuery } from '@tanstack/react-query';
import { METAS_PAINEL, type PainelResposta } from '@fuse/shared/api';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Cabecalho, Consulta, estilos as s, TituloSecao } from '../componentes/ui';
import { TITULO_RAIZ_CONTEUDO } from '../componentes/topo';
import { BASE_ADMIN, dataHora, juntarClasses, NOMES_STATUS_QUESTAO, numero } from '../util';

type ChaveMetrica = keyof PainelResposta['metricas'];

const METRICAS: { chave: ChaveMetrica; rotulo: string; formato: (v: number) => string; meta: string }[] = [
  { chave: 'licoesPorAlunoSemana', rotulo: 'Lições por aluno por semana', formato: (v) => numero(v, 1), meta: '≥ 5' },
  { chave: 'melhoraAcertoPp', rotulo: 'Melhora de acerto (1ª → 5ª tentativa)', formato: (v) => `${v >= 0 ? '+' : ''}${numero(v, 1)} pp`, meta: '≥ +20 pp' },
];

export function atingiuMeta(chave: ChaveMetrica, valor: number): boolean {
  const m = METAS_PAINEL[chave];
  return m.sentido === 'min' ? valor >= m.meta : valor <= m.meta;
}

export default function Painel() {
  const consulta = useQuery({ queryKey: ['admin', 'painel'], queryFn: () => api('adminPainel') });

  return (
    <>
      <Cabecalho titulo={TITULO_RAIZ_CONTEUDO} subtitulo="Conteúdo pendente e aprendizagem." />
      <Consulta consulta={consulta}>
        {(p) => (
          <>
            <div className={s.grade}>
              <Link to={`${BASE_ADMIN}/reports`} className={juntarClasses(s.estat, p.reportsAbertos > 0 && s.estatRuim)}>
                <div className={s.estatRotulo}>Erros relatados abertos</div>
                <div className={s.estatValor}>{numero(p.reportsAbertos)}</div>
                <div className={s.estatDetalhe}>abrir a fila</div>
              </Link>
              <Link to={`${BASE_ADMIN}/questoes?status=rascunho`} className={s.estat}>
                <div className={s.estatRotulo}>Questões em rascunho</div>
                <div className={s.estatValor}>{numero(p.questoesRascunho)}</div>
                <div className={s.estatDetalhe}>aguardando revisão</div>
              </Link>
            </div>

            <TituloSecao>Aprendizagem</TituloSecao>
            <div className={s.grade}>
              {METRICAS.map((m) => {
                const v = p.metricas[m.chave];
                const classe =
                  v === null ? s.estatSemDado : atingiuMeta(m.chave, v) ? s.estatOk : s.estatRuim;
                return (
                  <div key={m.chave} className={juntarClasses(s.estat, classe)} data-testid={`metrica-${m.chave}`}>
                    <div className={s.estatRotulo}>{m.rotulo}</div>
                    <div className={s.estatValor}>{v === null ? '—' : m.formato(v)}</div>
                    <div className={s.estatDetalhe}>
                      Meta {m.meta} ·{' '}
                      {v === null ? 'sem dados ainda' : atingiuMeta(m.chave, v) ? 'meta atingida' : 'abaixo da meta'}
                    </div>
                  </div>
                );
              })}
            </div>

            <TituloSecao>Questões por status</TituloSecao>
            <div className={s.grade}>
              {Object.entries(NOMES_STATUS_QUESTAO).map(([status, nome]) => (
                <Link key={status} to={`${BASE_ADMIN}/questoes?status=${status}`} className={s.estat}>
                  <div className={s.estatRotulo}>{nome}</div>
                  <div className={s.estatValor}>
                    {numero(p.questoesPorStatus[status as keyof typeof p.questoesPorStatus] ?? 0)}
                  </div>
                </Link>
              ))}
            </div>
            <p className={s.suave}>Atualizado em {dataHora(p.geradoEm)}. Calculado por SQL sobre as tabelas do próprio app.</p>
          </>
        )}
      </Consulta>
    </>
  );
}

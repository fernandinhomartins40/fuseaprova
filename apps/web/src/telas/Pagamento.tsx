import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AVISO_EDITAL,
  formatarCronometro,
  formatarReais,
  RODAPE_LEGAL,
  TEXTO_PIX_ERRO,
  TEXTO_PIX_EXPIRADO,
  TEXTO_PIX_STATUS,
} from '@fuse/shared';
import {
  INTERVALO_STATUS_MS,
  type MeusConcursosResposta,
  type PixResposta,
} from '@fuse/shared/api';
import { chamar, ErroApi } from '../api/cliente';
import { CHAVES, useConfigPublica, useMe, useMeusConcursos } from '../api/consultas';
import { sair } from '../app/sair';
import { apagarPacote, limparCachesApi } from '../offline/pacote';
import {
  Botao3D,
  CabecalhoVoltar,
  Campo,
  Capi,
  Confete,
  IconeTraco,
  Imagem,
  Pagina,
  useToast,
} from '../ui';
import s from './Pagamento.module.css';

const BENEFICIOS = [
  'Todas as provas FAU',
  'Questões comentadas',
  'Simulados ilimitados',
  'Até o dia da prova',
];

type Estado = 'gerando' | 'aguardando' | 'expirado' | 'erro' | 'pago';

/**
 * 03 Pagamento Pix (`/pagamento`), etapa 2 de 2. O acesso libera sozinho (polling de 4 s).
 * `?concurso=<id>` paga um concurso ADICIONAL de quem já é aluno (D21): preço com desconto e,
 * depois de pago, o concurso novo vira o ativo.
 */
export default function Pagamento() {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const [params] = useSearchParams();
  const concursoPedido = params.get('concurso') ?? undefined;
  // Quem ainda não pagou e há mais de um concurso aberto escolhe para qual vai pagar.
  const lista = useMeusConcursos(!concursoPedido && !!me.data && !me.data.acesso);
  const [escolhido, setEscolhido] = useState(false);
  const total = lista.data ? lista.data.seguidos.length + lista.data.disponiveis.length : 0;
  const precisaEscolher = !concursoPedido && !escolhido && total > 1;
  const [pix, setPix] = useState<PixResposta | null>(null);
  const [estado, setEstado] = useState<Estado>('gerando');
  const [erro, setErro] = useState<string>(TEXTO_PIX_ERRO);
  const [restante, setRestante] = useState(0);
  const pedido = useRef(false);
  const config = useConfigPublica();
  // D23: cupom de desconto (conferido no servidor ao gerar o Pix).
  const [cupomAberto, setCupomAberto] = useState(false);
  const [cupomTexto, setCupomTexto] = useState('');
  const [cupomErro, setCupomErro] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const cupom = useRef<string | undefined>(undefined);

  // Quem já tem acesso não fica aqui.
  useEffect(() => {
    if (!concursoPedido && me.data?.acesso && estado !== 'pago') {
      navegar(me.data.onboardingConcluido ? '/aprender' : '/onboarding', { replace: true });
    }
  }, [concursoPedido, me.data, estado, navegar]);

  const gerar = useCallback(async () => {
    setEstado('gerando');
    try {
      const r = await chamar('pagamentoPix', { corpo: { concursoId: concursoPedido, cupom: cupom.current } });
      setPix(r);
      setEstado(
        r.status === 'pago'
          ? 'pago'
          : new Date(r.expiraEm).getTime() <= Date.now()
            ? 'expirado'
            : 'aguardando',
      );
    } catch (e) {
      // Pagou no último segundo do Pix: o servidor já liberou o acesso (auditoria PIE R2-04).
      if (e instanceof ErroApi && e.codigo === 'conflito') {
        setEstado('pago');
        void qc.invalidateQueries({ queryKey: CHAVES.me });
        return;
      }
      setErro(
        e instanceof ErroApi && e.codigo !== 'interno' && e.codigo !== 'pix_indisponivel'
          ? e.message
          : TEXTO_PIX_ERRO,
      );
      setEstado('erro');
    }
  }, [qc, concursoPedido]);

  useEffect(() => {
    if (pedido.current || (!concursoPedido && me.data?.acesso)) return;
    if (!me.data) return;
    // Espera saber se há mais de um concurso para o aluno escolher antes de gerar o Pix.
    if (!concursoPedido && (lista.isPending || precisaEscolher)) return;
    pedido.current = true;
    void gerar();
  }, [gerar, me.data, concursoPedido, lista.isPending, precisaEscolher]);

  // Polling do status a cada 4 s.
  const status = useQuery({
    queryKey: CHAVES.pagamentoStatus(concursoPedido),
    queryFn: () => chamar('pagamentoStatus', { query: { concursoId: concursoPedido } }),
    enabled: estado === 'aguardando',
    refetchInterval: INTERVALO_STATUS_MS,
    refetchIntervalInBackground: true,
  });
  useEffect(() => {
    const d = status.data;
    if (!d) return;
    if (d.acesso || d.status === 'pago') {
      setEstado('pago');
      void qc.invalidateQueries({ queryKey: CHAVES.me });
      void qc.invalidateQueries({ queryKey: CHAVES.meusConcursos });
    } else if (d.expirado) {
      setEstado('expirado');
    }
  }, [status.data, qc]);

  // Concurso adicional pago: ativa o concurso novo (o pacote offline e os caches eram do outro).
  const concluirAdicional = useCallback(async () => {
    try {
      await chamar('meuConcursoAtivar', { params: { id: concursoPedido! } });
      await Promise.allSettled([apagarPacote(), limparCachesApi()]);
      await qc.invalidateQueries();
      navegar('/aprender', { replace: true });
    } catch (e) {
      toast(e instanceof ErroApi ? e.message : 'Não deu para trocar de concurso agora.', 'erro');
      navegar('/meus-concursos', { replace: true });
    }
  }, [concursoPedido, qc, navegar, toast]);

  // Celebração e depois a escolha do cargo (1º concurso) ou a troca para o concurso novo.
  useEffect(() => {
    if (estado !== 'pago') return;
    const id = window.setTimeout(
      () => (concursoPedido ? void concluirAdicional() : navegar('/onboarding', { replace: true })),
      2800,
    );
    return () => window.clearTimeout(id);
  }, [estado, navegar, concursoPedido, concluirAdicional]);

  // Contagem regressiva até expirar.
  useEffect(() => {
    if (!pix || estado !== 'aguardando') return;
    const tic = () => {
      const ms = new Date(pix.expiraEm).getTime() - Date.now();
      setRestante(Math.max(0, ms));
      if (ms <= 0) setEstado('expirado');
    };
    tic();
    const id = window.setInterval(tic, 1000);
    return () => window.clearInterval(id);
  }, [pix, estado]);

  async function aplicarCupom(codigo: string | undefined) {
    setCupomErro(null);
    setAplicando(true);
    try {
      // Confere antes: cupom inválido não troca o Pix que já está na tela.
      if (codigo) await chamar('pagamentoCupom', { corpo: { codigo, concursoId: concursoPedido } });
      cupom.current = codigo;
      await gerar();
      if (!codigo) setCupomTexto('');
    } catch (e) {
      setCupomErro(
        e instanceof ErroApi ? (e.campos.cupom ?? e.campos.codigo ?? e.message) : 'Não deu para conferir o cupom agora.',
      );
    } finally {
      setAplicando(false);
    }
  }

  async function copiar() {
    if (!pix) return;
    let copiado = true;
    try {
      await navigator.clipboard.writeText(pix.payload);
    } catch {
      const campo = document.getElementById('pix-copia-cola') as HTMLInputElement | null;
      campo?.select();
      copiado = document.execCommand?.('copy') ?? false;
    }
    // Sem "copiado" falso (auditoria PIE R2-15): o código fica selecionado para copiar à mão.
    if (copiado) toast('Código copiado', 'sucesso');
    else toast('Não deu para copiar. Toque no código e copie manualmente.', 'erro');
  }

  // Preço riscado: o valor antes do cupom ou, sem cupom, o preço "de" da campanha (1º concurso).
  const precoRiscado =
    pix?.valorOriginalCentavos ??
    (!concursoPedido && config.data?.precoDeCentavos && (!pix || pix.valorCentavos === config.data.precoCentavos)
      ? config.data.precoDeCentavos
      : null);

  if (estado === 'pago') {
    return (
      <Pagina className={s.celebracao}>
        <Confete />
        <Capi pose="celebrando" tamanho={260} pular descrever carregamento="eager" />
        <h1 className={s.tituloPago} role="status">
          Pagamento confirmado!
        </h1>
        <p className={s.textoPago}>
          {concursoPedido
            ? 'O concurso foi liberado. Vamos abrir a sua trilha.'
            : 'Seu acesso está liberado. Agora escolha o seu cargo.'}
        </p>
        <Botao3D
          onClick={() =>
            concursoPedido ? void concluirAdicional() : navegar('/onboarding', { replace: true })
          }
        >
          Continuar
        </Botao3D>
      </Pagina>
    );
  }

  return (
    <Pagina>
      {concursoPedido ? (
        <CabecalhoVoltar para="/meus-concursos" titulo="Liberar concurso" />
      ) : (
        <CabecalhoVoltar semVoltar etapa={{ atual: 2, total: 2 }} />
      )}
      {precisaEscolher && lista.data ? (
        <EscolherConcurso
          lista={lista.data}
          onEscolhido={() => {
            setEscolhido(true);
            void qc.invalidateQueries({ queryKey: CHAVES.me });
          }}
        />
      ) : null}
      <h1 className={s.titulo}>
        {concursoPedido ? 'Libere este concurso' : 'Comece sua preparação'}
      </h1>
      <p className={s.subtitulo}>
        {pix
          ? `Acesso ao ${pix.concursoNome}. Finalize o pagamento e tenha acesso imediato.`
          : 'Finalize o pagamento e tenha acesso imediato a todo o conteúdo.'}
      </p>

      <section className={s.oferta} aria-label="Acesso completo">
        <div className={s.ofertaTopo}>
          <span className={s.coroa}>
            <Imagem nome="icone-coroa" tamanho={40} carregamento="eager" />
          </span>
          <div>
            <p className={s.rotulo}>ACESSO COMPLETO</p>
            {precoRiscado ? <p className={s.precoDe}>de {formatarReais(precoRiscado).replace(',00', '')}</p> : null}
            <p className={s.preco}>
              {pix
                ? formatarReais(pix.valorCentavos).replace(',00', '')
                : !concursoPedido && config.data
                  ? formatarReais(config.data.precoCentavos).replace(',00', '')
                  : 'R$ …'}
            </p>
            <p className={s.precoSub}>à vista no Pix · pagamento único</p>
          </div>
        </div>
        <ul className={s.beneficios}>
          {BENEFICIOS.map((b) => (
            <li key={b}>
              <span className={s.check} aria-hidden="true">
                <IconeTraco nome="check" tamanho={14} espessura={3.4} />
              </span>
              {b}
            </li>
          ))}
        </ul>
        {pix?.cupom ? (
          <p className={s.cupomAplicado}>
            <span>
              Cupom <strong>{pix.cupom}</strong> aplicado
            </span>
            <button type="button" className={s.linkBotao} disabled={aplicando} onClick={() => void aplicarCupom(undefined)}>
              Remover
            </button>
          </p>
        ) : cupomAberto ? (
          <form
            className={s.cupom}
            onSubmit={(e) => {
              e.preventDefault();
              if (cupomTexto.trim()) void aplicarCupom(cupomTexto.trim());
            }}
          >
            <Campo
              rotulo="Cupom de desconto"
              valor={cupomTexto}
              onValor={(v) => setCupomTexto(v.toUpperCase())}
              erro={cupomErro}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={30}
            />
            <Botao3D type="submit" variante="azul" compacto bloco={false} disabled={!cupomTexto.trim() || aplicando}>
              {aplicando ? 'APLICANDO…' : 'APLICAR'}
            </Botao3D>
          </form>
        ) : (
          <button type="button" className={`${s.linkBotao} ${s.cupomAbrir}`} onClick={() => setCupomAberto(true)}>
            Tem um cupom de desconto?
          </button>
        )}
      </section>

      {estado === 'erro' ? (
        <section className={s.caixaErro} role="alert">
          <Capi pose="incentivando" tamanho={110} fala={erro} />
          <Botao3D onClick={() => void gerar()}>TENTAR DE NOVO</Botao3D>
        </section>
      ) : estado === 'expirado' ? (
        <section className={s.caixaErro} role="alert">
          <p className={s.expirado}>
            <Imagem nome="icone-relogio" tamanho={32} />
            {TEXTO_PIX_EXPIRADO}
          </p>
          <Botao3D onClick={() => void gerar()}>GERAR NOVO PIX</Botao3D>
        </section>
      ) : (
        <>
          <section className={s.qr} aria-label="QR Code Pix" aria-busy={estado === 'gerando'}>
            {pix ? (
              <img
                className={s.qrImagem}
                src={`data:image/png;base64,${pix.imagem}`}
                width={140}
                height={140}
                alt={`QR Code do Pix de ${formatarReais(pix.valorCentavos)}`}
              />
            ) : (
              <div className={s.qrVazio} aria-hidden="true" />
            )}
            <div className={s.qrTexto}>
              <p>Escaneie no app do seu banco e faça o pagamento via Pix.</p>
              {pix ? (
                <p className={s.expira} aria-live="off">
                  <IconeTraco nome="relogio" tamanho={18} />
                  Expira em {formatarCronometro(restante)}
                </p>
              ) : (
                <p className={s.gerando}>Gerando o Pix…</p>
              )}
            </div>
          </section>

          <div className={s.copia}>
            <label htmlFor="pix-copia-cola" className={s.copiaRotulo}>
              Pix copia e cola
            </label>
            <div className={s.copiaLinha}>
              <input
                id="pix-copia-cola"
                className={s.copiaCampo}
                readOnly
                value={pix?.payload ?? ''}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Botao3D
                variante="azul"
                compacto
                bloco={false}
                onClick={copiar}
                disabled={!pix}
                iconeEsquerda={<IconeTraco nome="copiar" tamanho={18} />}
              >
                COPIAR
              </Botao3D>
            </div>
          </div>

          <section className={s.status} role="status">
            <span className={s.giro} aria-hidden="true" />
            <div>
              <p className={s.statusTitulo}>{TEXTO_PIX_STATUS.split('… ')[0]}…</p>
              <p className={s.statusTexto}>{TEXTO_PIX_STATUS.split('… ')[1]}</p>
            </div>
          </section>
        </>
      )}

      <p className={s.aviso}>{AVISO_EDITAL}</p>
      <p className={s.legal}>{RODAPE_LEGAL}</p>
      <p className={s.sair}>
        <Link to="/termos">Termos de uso</Link> ·{' '}
        <button
          type="button"
          className={s.linkBotao}
          onClick={async () => {
            await sair(qc);
            navegar('/', { replace: true });
          }}
        >
          Sair da conta
        </button>
      </p>
    </Pagina>
  );
}

/** 1ª compra com mais de um concurso aberto: o aluno escolhe qual vai pagar (D21). */
function EscolherConcurso({
  lista,
  onEscolhido,
}: {
  lista: MeusConcursosResposta;
  onEscolhido: () => void;
}) {
  const toast = useToast();
  const [enviando, setEnviando] = useState<string | null>(null);
  const todos = [...lista.seguidos, ...lista.disponiveis];
  async function escolher(id: string) {
    setEnviando(id);
    try {
      await chamar('meuConcursoSeguir', { corpo: { concursoId: id } });
      onEscolhido();
    } catch (e) {
      toast(e instanceof ErroApi ? e.message : 'Não deu para escolher o concurso.', 'erro');
    } finally {
      setEnviando(null);
    }
  }
  return (
    <section className={s.escolha} aria-label="Escolha do concurso">
      <h2 className={s.escolhaTitulo}>Para qual concurso você vai estudar?</h2>
      <p className={s.escolhaTexto}>
        Cada concurso tem o seu acesso. Depois você pode adicionar outros com desconto.
      </p>
      <ul className={s.escolhaLista}>
        {todos.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={s.escolhaItem}
              disabled={enviando !== null}
              aria-busy={enviando === c.id}
              onClick={() => void escolher(c.id)}
            >
              <span className={s.escolhaNome}>{c.orgao}</span>
              <span className={s.escolhaMeta}>
                {c.municipio} · {c.uf}
                {c.dataProva ? ` · prova ${c.dataProva.split('-').reverse().join('/')}` : ''}
              </span>
              <span className={s.escolhaPreco}>{formatarReais(c.precoCentavos)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

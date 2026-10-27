import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { INTERVALO_STATUS_MS, type PixResposta } from '@fuse/shared/api';
import { chamar, ErroApi } from '../api/cliente';
import { CHAVES, useMe } from '../api/consultas';
import { sair } from '../app/sair';
import {
  Botao3D,
  CabecalhoVoltar,
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

/** 03 Pagamento Pix (`/pagamento`), etapa 2 de 2. O acesso libera sozinho (polling de 4 s). */
export default function Pagamento() {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const [pix, setPix] = useState<PixResposta | null>(null);
  const [estado, setEstado] = useState<Estado>('gerando');
  const [erro, setErro] = useState<string>(TEXTO_PIX_ERRO);
  const [restante, setRestante] = useState(0);
  const pedido = useRef(false);

  // Quem já tem acesso não fica aqui.
  useEffect(() => {
    if (me.data?.acesso && estado !== 'pago') {
      navegar(me.data.onboardingConcluido ? '/aprender' : '/onboarding', { replace: true });
    }
  }, [me.data, estado, navegar]);

  const gerar = useCallback(async () => {
    setEstado('gerando');
    try {
      const r = await chamar('pagamentoPix');
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
  }, [qc]);

  useEffect(() => {
    if (pedido.current || me.data?.acesso) return;
    if (!me.data) return;
    pedido.current = true;
    void gerar();
  }, [gerar, me.data]);

  // Polling do status a cada 4 s.
  const status = useQuery({
    queryKey: CHAVES.pagamentoStatus,
    queryFn: () => chamar('pagamentoStatus'),
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
    } else if (d.expirado) {
      setEstado('expirado');
    }
  }, [status.data, qc]);

  // Celebração e depois a escolha do cargo.
  useEffect(() => {
    if (estado !== 'pago') return;
    const id = window.setTimeout(() => navegar('/onboarding', { replace: true }), 2800);
    return () => window.clearTimeout(id);
  }, [estado, navegar]);

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

  if (estado === 'pago') {
    return (
      <Pagina className={s.celebracao}>
        <Confete />
        <Capi pose="celebrando" tamanho={260} pular descrever carregamento="eager" />
        <h1 className={s.tituloPago} role="status">
          Pagamento confirmado!
        </h1>
        <p className={s.textoPago}>Seu acesso está liberado. Agora escolha o seu cargo.</p>
        <Botao3D onClick={() => navegar('/onboarding', { replace: true })}>Continuar</Botao3D>
      </Pagina>
    );
  }

  return (
    <Pagina>
      <CabecalhoVoltar semVoltar etapa={{ atual: 2, total: 2 }} />
      <h1 className={s.titulo}>Comece sua preparação</h1>
      <p className={s.subtitulo}>Finalize o pagamento e tenha acesso imediato a todo o conteúdo.</p>

      <section className={s.oferta} aria-label="Acesso completo">
        <div className={s.ofertaTopo}>
          <span className={s.coroa}>
            <Imagem nome="icone-coroa" tamanho={40} carregamento="eager" />
          </span>
          <div>
            <p className={s.rotulo}>ACESSO COMPLETO</p>
            <p className={s.preco}>
              {formatarReais(pix?.valorCentavos ?? 39700).replace(',00', '')}
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
                alt="QR Code do Pix de R$ 397,00"
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

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  formatarCronometro,
  formatarReais,
  RODAPE_LEGAL,
  TEXTO_PIX_ERRO,
  TEXTO_PIX_EXPIRADO,
} from '@fuse/shared';
import {
  caminhoDownloadApostila,
  INTERVALO_STATUS_MS,
  nomeDownloadApostila,
  PRECO_APOSTILAS_CENTAVOS,
  TOTAL_QUESTOES_APOSTILAS,
  VOLUMES_APOSTILA,
  type ApostilasPixResposta,
  type MeResposta,
} from '@fuse/shared/api';
import { chamar, ErroApi } from '../../api/cliente';
import { useMe } from '../../api/consultas';
import { sair } from '../../app/sair';
import { Botao3D, Capi, Carregando, Confete, IconeTraco, Imagem, useToast } from '../../ui';
import { FormularioCadastro } from '../FormularioCadastro';
import { FormularioLogin } from '../FormularioLogin';
import a from '../Auth.module.css';
import p from '../Pagamento.module.css';
import s from './Apostilas.module.css';

const PRECO = formatarReais(PRECO_APOSTILAS_CENTAVOS).replace(',00', '');
const TOTAL = TOTAL_QUESTOES_APOSTILAS.toLocaleString('pt-BR');
const CHAVE_STATUS = ['apostilas', 'status'] as const;

const EM_CADA_QUESTAO = [
  {
    titulo: 'Entenda o tema',
    texto: 'Mini-aula com explicação simples, exemplos, macete e a pegadinha mais comum.',
  },
  {
    titulo: 'A questão como caiu',
    texto: 'Enunciado e alternativas, com a prova de origem e a dificuldade.',
  },
  {
    titulo: 'Resposta comentada',
    texto: 'O gabarito, por que a certa está certa e onde as outras erram.',
  },
  { titulo: 'Leve para a prova', texto: 'A frase curta para revisar na véspera.' },
];

const FAQ = [
  {
    p: 'Como eu recebo as apostilas?',
    r: 'Você cria a conta, paga o Pix e os 4 PDFs são liberados nesta mesma página assim que o pagamento cair. É só tocar em baixar.',
  },
  {
    p: 'O pagamento é mensal?',
    r: `Não. São ${PRECO} no Pix, pagamento único. Você pode baixar as apostilas quantas vezes precisar, entrando com a sua conta.`,
  },
  {
    p: 'Posso imprimir?',
    r: 'Sim. Os PDFs são coloridos, em A4, com sumário, gabarito rápido no fim e uma questão comentada atrás da outra.',
  },
  {
    p: 'Preciso de outra conta?',
    r: 'Não. É a mesma conta do app Fuse Aprova: se você já tem cadastro, é só entrar.',
  },
];

/**
 * D34: página da campanha das apostilas (`/apostilas`). Pública: quem não tem conta se cadastra
 * aqui mesmo e continua na página; o Pix de R$ 47 só é gerado no toque (como D32) e, pago, os 4
 * PDFs ficam para baixar.
 */
export default function Apostilas() {
  const me = useMe({ semRedirecionar: true });

  return (
    <main className={s.pagina} data-pagina-larga>
      <header className={s.topo}>
        <Link to="/" className={s.marca} aria-label="Fuse Aprova, página inicial">
          <Imagem nome="logo-completa" tamanho={150} alt="Fuse Aprova" carregamento="eager" />
        </Link>
      </header>

      <div className={s.grade}>
        <div className={s.colunaVenda}>
          <Venda />
        </div>
        <aside id="comprar" className={s.colunaCompra} aria-label="Comprar as apostilas">
          <div className={s.caixaCompra}>
            {me.isPending ? (
              <Carregando />
            ) : me.data ? (
              me.data.papel === 'aluno' ? (
                <Compra me={me.data} />
              ) : (
                <SoAluno />
              )
            ) : (
              <Conta />
            )}
          </div>
        </aside>
      </div>

      <section className={s.faq} aria-labelledby="faq-titulo">
        <h2 id="faq-titulo" className={s.secaoTitulo}>
          Perguntas frequentes
        </h2>
        <dl>
          {FAQ.map((f) => (
            <div key={f.p} className={s.faqItem}>
              <dt>{f.p}</dt>
              <dd>{f.r}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className={s.rodape}>
        <p>{RODAPE_LEGAL}</p>
        <p>
          <Link to="/termos">Termos de uso</Link> ·{' '}
          <Link to="/privacidade">Política de privacidade</Link>
        </p>
      </footer>
    </main>
  );
}

function Venda() {
  return (
    <>
      <section className={s.heroi}>
        <p className={s.selo}>Apostilas em PDF para baixar e imprimir</p>
        <h1 className={s.titulo}>
          4 apostilas · <span className={s.destaque}>{TOTAL} questões comentadas</span> da banca FAU
        </h1>
        <p className={s.subtitulo}>
          Questões de provas de prefeituras da FAU, cada uma com mini-aula, resposta comentada e a
          dica para levar para a prova.
        </p>
        <div className={s.precoLinha}>
          <p className={s.preco}>{PRECO}</p>
          <p className={s.precoSub}>no Pix · pagamento único</p>
        </div>
        <a className={s.comprarAgora} href="#comprar">
          Quero as apostilas
        </a>
      </section>

      <section aria-labelledby="volumes-titulo">
        <h2 id="volumes-titulo" className={s.secaoTitulo}>
          Os 4 volumes
        </h2>
        <ul className={s.volumes}>
          {VOLUMES_APOSTILA.map((v) => (
            <li
              key={v.volume}
              className={s.volume}
              style={{ '--cor-volume': v.cor } as CSSProperties}
            >
              <p className={s.volumeNum}>Volume {v.volume}</p>
              <h3 className={s.volumeTitulo}>{v.titulo}</h3>
              <p className={s.volumeSub}>{v.subtitulo}</p>
              <p className={s.volumeMeta}>
                {v.questoes.toLocaleString('pt-BR')} questões · {v.paginas.toLocaleString('pt-BR')}{' '}
                páginas
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cada-titulo">
        <h2 id="cada-titulo" className={s.secaoTitulo}>
          O que vem em cada questão
        </h2>
        <ul className={s.itens}>
          {EM_CADA_QUESTAO.map((i) => (
            <li key={i.titulo}>
              <span className={s.check} aria-hidden="true">
                <IconeTraco nome="check" tamanho={14} espessura={3.4} />
              </span>
              <span>
                <strong>{i.titulo}:</strong> {i.texto}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** Sem login: cria a conta ou entra, e continua nesta página. */
function Conta() {
  const [modo, setModo] = useState<'cadastro' | 'login'>('cadastro');
  return (
    <>
      <h2 className={s.compraTitulo}>
        {modo === 'cadastro' ? 'Crie sua conta para comprar' : 'Entre na sua conta'}
      </h2>
      <div className={s.abas} role="group" aria-label="Tenho ou não tenho conta">
        <button
          type="button"
          className={s.aba}
          aria-pressed={modo === 'cadastro'}
          onClick={() => setModo('cadastro')}
        >
          Criar conta
        </button>
        <button
          type="button"
          className={s.aba}
          aria-pressed={modo === 'login'}
          onClick={() => setModo('login')}
        >
          Já tenho conta
        </button>
      </div>
      {modo === 'cadastro' ? (
        <FormularioCadastro
          textoBotao="Criar conta e continuar"
          aoConcluir={() => undefined}
          aoPedirLogin={() => setModo('login')}
          rodape={
            <p className={a.rodape}>
              Já tem conta?{' '}
              <button type="button" className={a.linkBotao} onClick={() => setModo('login')}>
                Entrar
              </button>
            </p>
          }
        />
      ) : (
        <FormularioLogin
          aoConcluir={() => undefined}
          rodape={
            <p className={a.rodape}>
              Ainda não tem conta?{' '}
              <button type="button" className={a.linkBotao} onClick={() => setModo('cadastro')}>
                Criar conta
              </button>
            </p>
          }
        />
      )}
    </>
  );
}

function SoAluno() {
  const qc = useQueryClient();
  return (
    <div className={s.aviso} role="status">
      <p>
        As apostilas são compradas com uma conta de aluno. Saia e entre com a sua conta de aluno.
      </p>
      <Botao3D variante="secundario" onClick={() => void sair(qc)}>
        Sair da conta
      </Botao3D>
    </div>
  );
}

type Estado = 'inicial' | 'gerando' | 'aguardando' | 'expirado' | 'erro';

/** Logado como aluno: Pix no toque e, pago, os downloads. */
function Compra({ me }: { me: MeResposta }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [pix, setPix] = useState<ApostilasPixResposta | null>(null);
  const [estado, setEstado] = useState<Estado>('inicial');
  const [erro, setErro] = useState<string>(TEXTO_PIX_ERRO);
  const [restante, setRestante] = useState(0);
  const [acabouDePagar, setAcabouDePagar] = useState(false);

  const status = useQuery({
    queryKey: CHAVE_STATUS,
    queryFn: ({ signal }) => chamar('apostilasStatus', { signal }),
    staleTime: 0,
    refetchInterval: estado === 'aguardando' ? INTERVALO_STATUS_MS : false,
    refetchIntervalInBackground: true,
  });
  const comprado = !!status.data?.comprado;

  useEffect(() => {
    const d = status.data;
    if (!d || estado !== 'aguardando') return;
    if (d.comprado) setAcabouDePagar(true);
    else if (d.expirado) setEstado('expirado');
  }, [status.data, estado]);

  const gerar = useCallback(async () => {
    setEstado('gerando');
    try {
      const r = await chamar('apostilasPix');
      setPix(r);
      if (r.status === 'pago') {
        setAcabouDePagar(true);
        await qc.invalidateQueries({ queryKey: CHAVE_STATUS });
        return;
      }
      setEstado(new Date(r.expiraEm).getTime() <= Date.now() ? 'expirado' : 'aguardando');
    } catch (e) {
      // Já liberadas (pagou em outra aba ou no último segundo): mostra os downloads.
      if (e instanceof ErroApi && e.codigo === 'conflito') {
        await qc.invalidateQueries({ queryKey: CHAVE_STATUS });
        setEstado('inicial');
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
    if (copiado) toast('Código copiado', 'sucesso');
    else toast('Não deu para copiar. Toque no código e copie manualmente.', 'erro');
  }

  const conta = (
    <p className={s.logado}>
      Conta: <strong>{me.nome}</strong> ·{' '}
      <button type="button" className={a.linkBotao} onClick={() => void sair(qc)}>
        Sair
      </button>
    </p>
  );

  if (status.isPending) return <Carregando />;
  if (status.isError) {
    return (
      <div className={p.caixaErro} role="alert">
        <p>Não deu para conferir a sua compra agora.</p>
        <Botao3D onClick={() => void status.refetch()}>TENTAR DE NOVO</Botao3D>
      </div>
    );
  }

  if (comprado) {
    return (
      <>
        {acabouDePagar ? <Confete /> : null}
        <Capi pose="celebrando" tamanho={110} carregamento="eager" />
        <h2 className={s.compraTitulo} role="status">
          Suas apostilas estão liberadas
        </h2>
        <p className={s.compraTexto}>
          Cada arquivo tem mais de mil páginas (cerca de 45 MB). No celular, o download pode demorar
          um pouco: prefira o Wi-Fi.
        </p>
        <ul className={s.downloads}>
          {VOLUMES_APOSTILA.map((v) => (
            <li key={v.volume}>
              <a
                className={s.download}
                href={caminhoDownloadApostila(v.volume)}
                download={nomeDownloadApostila(v.volume)}
                style={{ '--cor-volume': v.cor } as CSSProperties}
              >
                <IconeTraco nome="baixar" tamanho={22} />
                <span className={s.downloadTexto}>
                  <span className={s.downloadTitulo}>
                    Baixar volume {v.volume}: {v.titulo}
                  </span>
                  <span className={s.downloadMeta}>
                    PDF · {v.paginas.toLocaleString('pt-BR')} páginas · cerca de 45 MB
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Link to="/aprender" className={s.estudarApp}>
          Estudar no app Fuse Aprova
        </Link>
        {conta}
      </>
    );
  }

  return (
    <>
      <h2 className={s.compraTitulo}>Garanta as 4 apostilas</h2>
      <p className={s.compraPreco}>
        <strong>{PRECO}</strong> no Pix · pagamento único
      </p>
      {estado === 'erro' ? (
        <section className={p.caixaErro} role="alert">
          <p>{erro}</p>
          <Botao3D onClick={() => void gerar()}>TENTAR DE NOVO</Botao3D>
        </section>
      ) : estado === 'expirado' ? (
        <section className={p.caixaErro} role="alert">
          <p className={p.expirado}>
            <Imagem nome="icone-relogio" tamanho={32} />
            {TEXTO_PIX_EXPIRADO}
          </p>
          <Botao3D onClick={() => void gerar()}>GERAR NOVO PIX</Botao3D>
        </section>
      ) : estado === 'inicial' ? (
        <section className={s.gerar}>
          <p>O código Pix é criado quando você tocar no botão.</p>
          <Botao3D onClick={() => void gerar()}>Gerar Pix de {PRECO}</Botao3D>
        </section>
      ) : (
        <>
          <section className={p.qr} aria-label="QR Code Pix" aria-busy={estado === 'gerando'}>
            {pix ? (
              <img
                className={p.qrImagem}
                src={`data:image/png;base64,${pix.imagem}`}
                width={140}
                height={140}
                alt={`QR Code do Pix de ${formatarReais(pix.valorCentavos)}`}
              />
            ) : (
              <div className={p.qrVazio} aria-hidden="true" />
            )}
            <div className={p.qrTexto}>
              <p>Escaneie no app do seu banco e faça o pagamento via Pix.</p>
              {pix ? (
                <p className={p.expira} aria-live="off">
                  <IconeTraco nome="relogio" tamanho={18} />
                  Expira em {formatarCronometro(restante)}
                </p>
              ) : (
                <p className={p.gerando}>Gerando o Pix…</p>
              )}
            </div>
          </section>

          <div className={p.copia}>
            <label htmlFor="pix-copia-cola" className={p.copiaRotulo}>
              Pix copia e cola
            </label>
            <div className={p.copiaLinha}>
              <input
                id="pix-copia-cola"
                className={p.copiaCampo}
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

          <section className={p.status} role="status">
            <span className={p.giro} aria-hidden="true" />
            <div>
              <p className={p.statusTitulo}>Aguardando pagamento…</p>
              <p className={p.statusTexto}>As apostilas são liberadas aqui assim que o Pix cair.</p>
            </div>
          </section>
        </>
      )}
      {conta}
    </>
  );
}

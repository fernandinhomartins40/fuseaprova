import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chamar } from '../api/cliente';
import { useMe } from '../api/consultas';
import { Botao3D, Modal } from '../ui';
import {
  abrirLoja,
  aoTocarLembrete,
  aoVoltarAoApp,
  cancelarLembretes,
  iniciarApp,
  sincronizarLembretes,
  temAtualizacao,
} from './nativo';
import { EVENTO_REAGENDAR_LEMBRETES } from './notificacoes';

function sincronizar(): void {
  void sincronizarLembretes(() => chamar('meLembretes', { semRedirecionar: true })).catch(
    () => undefined,
  );
}

/** Registra um listener assíncrono do Capacitor e o remove ao desmontar. */
function useListener(registrar: () => Promise<() => void>): void {
  const reg = useRef(registrar);
  reg.current = registrar;
  useEffect(() => {
    let remover: (() => void) | null = null;
    let ativo = true;
    void reg
      .current()
      .then((r) => (ativo ? (remover = r) : r()))
      .catch(() => undefined);
    return () => {
      ativo = false;
      remover?.();
    };
  }, []);
}

/**
 * Liga os recursos do app nativo (só no build `app`): splash, botão voltar, toque na notificação
 * e o reagendamento dos lembretes (D30): ao abrir, ao voltar ao app, quando o perfil muda
 * (horário, notificações, meta, ofensiva, revisões — o que inclui concluir uma sessão, que
 * atualiza o /me) e quando a permissão é concedida.
 */
export default function RecursosNativos() {
  const navegar = useNavigate();
  const navegarRef = useRef(navegar);
  navegarRef.current = navegar;
  const local = useLocation();
  const me = useMe({ semRedirecionar: true });
  const u = me.data;
  /** Tela pedida pelo toque, reaplicada depois do login/redirecionamento inicial. */
  const pendente = useRef<string | null>(null);

  useEffect(() => {
    void iniciarApp();
  }, []);

  // D42: confere a loja ao abrir e ao voltar ao app. "Agora não" vale até o app ser fechado.
  const [atualizacao, setAtualizacao] = useState(false);
  const dispensou = useRef(false);
  const conferirLoja = () => {
    if (!dispensou.current) void temAtualizacao().then(setAtualizacao);
  };
  const dispensar = () => {
    dispensou.current = true;
    setAtualizacao(false);
  };
  useEffect(conferirLoja, []);
  useListener(() => aoVoltarAoApp(conferirLoja));

  // Registrado logo na montagem: o toque que abriu o app fechado fica guardado pelo plugin até
  // este listener existir, então nenhum toque se perde.
  useListener(() =>
    aoTocarLembrete((rota) => {
      pendente.current = rota;
      navegarRef.current(rota);
    }),
  );

  // Com o app abrindo pelo toque, a tela inicial (/ → rotaInicial) ou o login podem trocar a
  // rota depois do toque. Assim que o aluno estiver logado com acesso, garante a tela pedida.
  const atual = local.pathname + local.search;
  const comAcesso = Boolean(u?.acesso);
  useEffect(() => {
    const p = pendente.current;
    if (!p || !comAcesso) return;
    if (atual === p) {
      pendente.current = null;
      return;
    }
    const t = window.setTimeout(() => {
      if (pendente.current === p) {
        pendente.current = null;
        navegarRef.current(p, { replace: true });
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [atual, comAcesso]);

  const logado = Boolean(u);
  // Muda o que entra no plano → reagenda (inclui concluir lição/revisão, que atualiza o /me).
  const chave = u
    ? [
        u.notificacoes,
        u.lembreteHora,
        u.metaHoje.feitas,
        u.ofensiva,
        u.ofensivaHojeContou,
        u.revisoesPendentes,
        u.concurso?.id ?? '',
      ].join('|')
    : '';
  useEffect(() => {
    if (!logado) return;
    if (comAcesso) sincronizar();
    else void cancelarLembretes();
  }, [logado, comAcesso, chave]);

  // Voltar ao app e pedidos explícitos (permissão concedida) também reagendam.
  const podeSincronizar = useRef(false);
  podeSincronizar.current = logado && comAcesso;
  useListener(() =>
    aoVoltarAoApp(() => {
      if (podeSincronizar.current) sincronizar();
    }),
  );
  useEffect(() => {
    const talvez = () => {
      if (podeSincronizar.current) sincronizar();
    };
    window.addEventListener(EVENTO_REAGENDAR_LEMBRETES, talvez);
    return () => window.removeEventListener(EVENTO_REAGENDAR_LEMBRETES, talvez);
  }, []);

  return (
    <Modal
      aberto={atualizacao}
      titulo="Tem versão nova do app"
      descricao="Atualize para receber as novidades e as melhorias do Fuse Aprova."
      onFechar={dispensar}
      formato="folha"
      rodape={
        <>
          <Botao3D data-autofoco onClick={abrirLoja}>
            ATUALIZAR
          </Botao3D>
          <Botao3D variante="secundario" onClick={dispensar}>
            AGORA NÃO
          </Botao3D>
        </>
      }
    />
  );
}

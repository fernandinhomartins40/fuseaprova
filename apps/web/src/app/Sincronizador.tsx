import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CHAVES, useMe } from '../api/consultas';
import { sincronizar, contarPendentes } from '../offline/fila';
import { baixarPacote, conferirVersao } from '../offline/pacote';
import { IconeTraco, useToast } from '../ui';
import s from './Sincronizador.module.css';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * Mantém o modo offline em dia:
 * - envia a fila de respostas offline (POST /sync/tentativas) ao abrir, ao voltar a conexão
 *   e a cada minuto enquanto houver pendências;
 * - confere a versao_conteudo de GET /me e, se mudou, descarta pacote e caches e baixa de novo;
 * - mostra a faixa "Você está offline".
 */
export function Sincronizador() {
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const [pendentes, setPendentes] = useState(0);
  const baixando = useRef(false);
  const usuarioId = me.data?.acesso ? me.data.id : null;
  const versao = me.data?.versaoConteudo;

  // Sync da fila
  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    async function rodar() {
      try {
        const n = await contarPendentes(usuarioId!);
        if (vivo) setPendentes(n);
        if (n === 0 || !navigator.onLine) return;
        const r = await sincronizar(usuarioId!);
        if (!r || !vivo) return;
        setPendentes(await contarPendentes(usuarioId!));
        await Promise.all([
          qc.invalidateQueries({ queryKey: CHAVES.me }),
          qc.invalidateQueries({ queryKey: CHAVES.trilha }),
          qc.invalidateQueries({ queryKey: CHAVES.revisao }),
          qc.invalidateQueries({ queryKey: CHAVES.estatisticas }),
          qc.invalidateQueries({ queryKey: CHAVES.liga }),
        ]);
        if (r.aceitas.length > 0) {
          toast(
            r.xpGanho > 0
              ? `Respostas offline sincronizadas: +${r.xpGanho} XP`
              : 'Respostas offline sincronizadas',
            'sucesso',
          );
        }
      } catch {
        /* tenta de novo depois */
      }
    }
    void rodar();
    const id = window.setInterval(rodar, 60_000);
    window.addEventListener('online', rodar);
    return () => {
      vivo = false;
      window.clearInterval(id);
      window.removeEventListener('online', rodar);
    };
  }, [usuarioId, qc, toast]);

  // Pacote offline e versão do conteúdo
  useEffect(() => {
    if (!usuarioId || versao === undefined || !online || baixando.current) return;
    baixando.current = true;
    (async () => {
      try {
        const mudou = await conferirVersao(usuarioId, versao);
        if (mudou) {
          await qc.invalidateQueries({ queryKey: CHAVES.trilha });
          await qc.invalidateQueries({ queryKey: CHAVES.concurso });
          await baixarPacote(usuarioId);
        }
      } catch {
        /* sem pacote por enquanto; a próxima abertura tenta de novo */
      } finally {
        baixando.current = false;
      }
    })();
  }, [usuarioId, versao, online, qc]);

  if (online) return null;
  return (
    <div className={s.faixa} role="status">
      <IconeTraco nome="wifiOff" tamanho={18} />
      <span>
        Você está offline.{' '}
        {pendentes > 0
          ? `${pendentes} ${pendentes === 1 ? 'resposta será enviada' : 'respostas serão enviadas'} quando a conexão voltar.`
          : 'Dá para fazer as próximas lições e a revisão salvas.'}
      </span>
    </div>
  );
}

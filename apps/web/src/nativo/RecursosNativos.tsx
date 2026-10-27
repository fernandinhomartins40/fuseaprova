import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../api/consultas';
import { agendarLembretes, aoTocarLembrete, cancelarLembretes, iniciarApp } from './nativo';

/**
 * Liga os recursos do app nativo (só no build `app`): splash, botão voltar, toque no
 * lembrete e o reagendamento do lembrete diário quando o perfil muda (horário, notificações
 * ligadas, meta cumprida hoje, ofensiva).
 */
export default function RecursosNativos() {
  const navegar = useNavigate();
  const me = useMe({ semRedirecionar: true });
  const u = me.data;

  useEffect(() => {
    void iniciarApp();
    void aoTocarLembrete((url) => navegar(url));
  }, [navegar]);

  const ligado = Boolean(u?.acesso && u.notificacoes && u.lembreteHora);
  const hora = u?.lembreteHora ?? null;
  const ofensiva = u?.ofensiva ?? 0;
  const cumprida = u?.metaHoje.cumprida ?? false;
  const logado = Boolean(u);
  useEffect(() => {
    if (!logado) return;
    if (ligado && hora)
      void agendarLembretes({ hora, ofensiva, metaCumpridaHoje: cumprida }).catch(() => undefined);
    else void cancelarLembretes();
  }, [logado, ligado, hora, ofensiva, cumprida]);

  return null;
}

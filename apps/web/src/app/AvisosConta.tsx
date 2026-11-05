import { useState } from 'react';
import { useMe } from '../api/consultas';
import { IconeTraco } from '../ui';
import s from './LayoutAbas.module.css';

const LINK_PLAY =
  'https://play.google.com/store/apps/details?id=br.com.fuseaprova.app&pcampaignid=web_share';
const CHAVE_APP_FECHADO = 'fuse.banner-app-fechado';

function appFechado(): boolean {
  try {
    return localStorage.getItem(CHAVE_APP_FECHADO) === '1';
  } catch {
    return false;
  }
}

/**
 * Avisos da conta, só no site (o app nativo não carrega este arquivo, porque não pode citar
 * pagamento): para quem pagou no Android, o convite para baixar o app.
 */
export default function AvisosConta() {
  const me = useMe();
  const [fechado, setFechado] = useState(appFechado);
  const u = me.data;
  if (!u || u.papel !== 'aluno') return null;

  if (u.acessoPago && !fechado && /Android/i.test(navigator.userAgent)) {
    return (
      <div className={s.bannerApp} role="note">
        <p>
          <strong>Baixe o app no Google Play</strong>
          <span>Entre com o mesmo e-mail e a mesma senha.</span>
        </p>
        <a href={LINK_PLAY} target="_blank" rel="noopener noreferrer">
          Baixar
        </a>
        <button
          type="button"
          aria-label="Fechar o convite para baixar o app"
          onClick={() => {
            setFechado(true);
            try {
              localStorage.setItem(CHAVE_APP_FECHADO, '1');
            } catch {
              // Sem armazenamento, o convite volta na próxima visita.
            }
          }}
        >
          <IconeTraco nome="fechar" tamanho={18} />
        </button>
      </div>
    );
  }
  return null;
}

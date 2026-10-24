import { useEffect, useState } from 'react';
import { formatarDuracao, TITULO_SEM_VIDAS, textoSemVidas } from '@fuse/shared';
import { Botao3D, Capi, IconeCheio, Pagina } from '../../ui';
import s from './Licao.module.css';

/** ✏️ Sem vidas: Capi, "Suas vidas acabaram", PRATICAR ERROS PARA RECUPERAR e ESPERAR. */
export function SemVidas({
  proximaVidaEm,
  onPraticar,
  onEsperar,
}: {
  proximaVidaEm: string | null;
  onPraticar: () => void;
  onEsperar: () => void;
}) {
  const calc = () =>
    proximaVidaEm ? Math.max(0, new Date(proximaVidaEm).getTime() - Date.now()) : 4 * 3600_000;
  const [ms, setMs] = useState(calc);
  useEffect(() => {
    const id = window.setInterval(() => setMs(calc()), 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proximaVidaEm]);

  return (
    <Pagina className={s.semVidas}>
      <div className={s.coracoes} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={s.coracaoVazio}>
            <IconeCheio nome="coracao" tamanho={30} />
          </span>
        ))}
      </div>
      <Capi pose="incentivando" tamanho={220} carregamento="eager" />
      <h1 className={s.semVidasTitulo}>{TITULO_SEM_VIDAS}</h1>
      <p className={s.semVidasTexto} role="status">
        {textoSemVidas(ms)}
      </p>
      <div className={s.semVidasAcoes}>
        <Botao3D onClick={onPraticar} autoFocus>
          PRATICAR ERROS PARA RECUPERAR
        </Botao3D>
        <Botao3D variante="secundario" onClick={onEsperar}>
          ESPERAR ({formatarDuracao(ms)})
        </Botao3D>
      </div>
    </Pagina>
  );
}

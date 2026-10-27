import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CHAVES, useMe } from '../api/consultas';
import { sair } from '../app/sair';
import { Botao3D, Capi, Pagina, useToast } from '../ui';
import { CONTATO_SUPORTE } from './suporte';

/**
 * App nativo (`/acesso`): conta sem acesso ativo. O app não vende nem indica onde comprar
 * (regras da Play Store e da App Store para conteúdo digital; DECISOES D20). Só permite
 * conferir de novo, falar com o suporte ou sair.
 */
export default function AcessoApp() {
  const me = useMe();
  const qc = useQueryClient();
  const navegar = useNavigate();
  const toast = useToast();
  const [conferindo, setConferindo] = useState(false);

  async function conferir() {
    setConferindo(true);
    try {
      const r = await me.refetch();
      if (r.data?.acesso) {
        navegar(r.data.onboardingConcluido ? '/aprender' : '/onboarding', { replace: true });
      } else {
        toast('Seu acesso ainda não está ativo.', 'info');
      }
    } finally {
      setConferindo(false);
    }
  }

  return (
    <Pagina>
      <div
        style={{
          display: 'grid',
          gap: 16,
          justifyItems: 'center',
          textAlign: 'center',
          paddingTop: 48,
        }}
      >
        <Capi pose="explicando" tamanho={200} carregamento="eager" />
        <h1>Seu acesso ainda não está ativo</h1>
        <p>
          Esta conta ({me.data?.email ?? 'sua conta'}) ainda não tem acesso ao conteúdo. Assim que o
          acesso for ativado, é só tocar em “Conferir de novo”.
        </p>
        <Botao3D carregando={conferindo} onClick={() => void conferir()}>
          Conferir de novo
        </Botao3D>
        <a href={CONTATO_SUPORTE.url} target="_blank" rel="noopener noreferrer">
          Falar com o suporte
        </a>
        <Botao3D
          variante="secundario"
          onClick={async () => {
            await sair(qc);
            void qc.invalidateQueries({ queryKey: CHAVES.me });
            navegar('/entrar', { replace: true });
          }}
        >
          Entrar com outra conta
        </Botao3D>
      </div>
    </Pagina>
  );
}

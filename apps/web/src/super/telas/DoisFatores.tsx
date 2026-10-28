/**
 * /super/2fa (D13): configurar o app autenticador (QR gerado no servidor + códigos de
 * recuperação mostrados uma vez) ou digitar o código para liberar a sessão.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, camposDoErro, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, Cartao, CampoTexto, Consulta, estilos as a } from '../../admin/componentes/ui';
import { voltarSeguro } from '../../app/areaPainel';
import { Pagina, estilosSuper as s, useLayout } from '../componentes';
import { caminho } from '../util';

function Codigos({ codigos, aoContinuar }: { codigos: string[]; aoContinuar: () => void }) {
  const [guardei, setGuardei] = useState(false);
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Guarde os códigos de recuperação</h2>
      <p>Cada código vale uma vez, se você perder o celular. Eles não aparecem de novo.</p>
      <div className={s.codigos} data-testid="codigos-recuperacao">
        {codigos.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <label className={a.marcar} style={{ marginTop: 14 }}>
        <input type="checkbox" checked={guardei} onChange={(e) => setGuardei(e.target.checked)} />
        <span>Guardei os códigos num lugar seguro</span>
      </label>
      <div className={a.acoes} style={{ marginTop: 12 }}>
        <Botao variante="primario" disabled={!guardei} onClick={aoContinuar}>
          Ir para o painel
        </Botao>
      </div>
    </Cartao>
  );
}

export default function DoisFatores() {
  const qc = useQueryClient();
  const { atualizarSessao, sair } = useLayout();
  const navegar = useNavigate();
  // S-19: depois do 2FA, volta para onde a pessoa estava quando a verificação venceu.
  const [params] = useSearchParams();
  const destino = voltarSeguro(params.get('voltar')) ?? caminho();
  const status = useQuery({ queryKey: ['super', '2fa'], queryFn: () => api('super2faStatus') });
  const [codigo, setCodigo] = useState('');
  const [recuperacao, setRecuperacao] = useState(false);
  const [codigos, setCodigos] = useState<string[] | null>(null);
  const concluir = () => {
    // Espera o /me novo (sem 2FA pendente) antes de sair daqui: senão a guarda devolve para /super/2fa.
    void (async () => {
      await atualizarSessao();
      void qc.invalidateQueries({ queryKey: ['super'] });
      navegar(destino, { replace: true });
    })();
  };
  const iniciar = useMutation({ mutationFn: () => api('super2faIniciar') });
  const ativar = useMutation({
    mutationFn: () => api('super2faAtivar', { corpo: { codigo } }),
    onSuccess: (r) => {
      setCodigos(r.codigos);
      void qc.invalidateQueries({ queryKey: ['super', '2fa'] });
    },
  });
  const verificar = useMutation({
    mutationFn: () => api('super2faVerificar', { corpo: recuperacao ? { codigoRecuperacao: codigo } : { codigo } }),
    onSuccess: concluir,
  });

  return (
    <Pagina titulo="Verificação em duas etapas" subtitulo="O painel superadmin exige um app autenticador (Google Authenticator, Authy, 1Password, Aegis…).">
      <div className={s.centro}>
        <Consulta consulta={status}>
          {(st) => {
            if (codigos) return <Codigos codigos={codigos} aoContinuar={concluir} />;
            if (!st.configurado) {
              return (
                <Cartao>
                  <h2 className={a.secaoTitulo}>Configure o app autenticador</h2>
                  {!iniciar.data ? (
                    <>
                      <p>Este é o seu primeiro acesso como superadmin. Gere o QR code e leia-o no app do celular.</p>
                      <p className={a.suave}>
                        Não tem app autenticador? Instale o Google Authenticator, o Authy ou o 1Password no celular antes de continuar.
                      </p>
                      {iniciar.isError ? <Alerta tom="erro">{mensagemDeErro(iniciar.error)}</Alerta> : null}
                      <Botao variante="primario" carregando={iniciar.isPending} onClick={() => iniciar.mutate()}>
                        Gerar QR code
                      </Botao>
                    </>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        ativar.mutate();
                      }}
                    >
                      <ol>
                        <li>No app autenticador, toque em adicionar conta e leia o QR code.</li>
                        <li>Sem câmera? Digite a chave abaixo.</li>
                        <li>Digite o código de 6 dígitos que aparece no app.</li>
                      </ol>
                      {/* SVG gerado pela própria API (sem serviço externo). */}
                      <div className={s.qr} role="img" aria-label="QR code do app autenticador" dangerouslySetInnerHTML={{ __html: iniciar.data.qrSvg }} />
                      <p>
                        Chave: <code data-testid="chave-manual">{iniciar.data.chaveManual}</code>
                        <br />
                        <span className={a.suave}>
                          {iniciar.data.emissor} · {iniciar.data.conta}
                        </span>
                      </p>
                      <CampoTexto
                        rotulo="Código de 6 dígitos"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        erro={camposDoErro(ativar.error).codigo ?? (ativar.isError ? mensagemDeErro(ativar.error) : undefined)}
                      />
                      <Botao type="submit" variante="primario" carregando={ativar.isPending}>
                        Ativar
                      </Botao>
                    </form>
                  )}
                </Cartao>
              );
            }
            if (st.verificadoNestaSessao) {
              return (
                <Cartao>
                  <Alerta tom="sucesso">A verificação em duas etapas está ativa nesta sessão.</Alerta>
                  <p>Códigos de recuperação restantes: {st.codigosRecuperacaoRestantes}.</p>
                  <Botao variante="primario" onClick={concluir}>
                    Ir para o painel
                  </Botao>
                </Cartao>
              );
            }
            return (
              <Cartao>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    verificar.mutate();
                  }}
                >
                  <h2 className={a.secaoTitulo}>{recuperacao ? 'Use um código de recuperação' : 'Digite o código do app'}</h2>
                  <CampoTexto
                    rotulo={recuperacao ? 'Código de recuperação' : 'Código de 6 dígitos'}
                    inputMode={recuperacao ? 'text' : 'numeric'}
                    autoComplete="one-time-code"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    erro={verificar.isError ? mensagemDeErro(verificar.error) : undefined}
                  />
                  <div className={a.acoes}>
                    <Botao type="submit" variante="primario" carregando={verificar.isPending}>
                      Confirmar
                    </Botao>
                    <Botao
                      variante="fantasma"
                      onClick={() => {
                        setRecuperacao((r) => !r);
                        setCodigo('');
                      }}
                    >
                      {recuperacao ? 'Usar o app' : 'Perdi o celular'}
                    </Botao>
                    <Botao variante="fantasma" onClick={sair}>
                      Sair
                    </Botao>
                  </div>
                </form>
              </Cartao>
            );
          }}
        </Consulta>
      </div>
    </Pagina>
  );
}

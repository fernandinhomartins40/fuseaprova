/**
 * /super/equipe (D13): admins e superadmins, com o status do 2FA, convites pendentes e o
 * convite de um novo membro (link para definir a senha, válido por 72 h).
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../admin/api';
import { CampoSelecao, CampoTexto, Consulta, Selo, Tabela, Botao, estilos as a } from '../../admin/componentes/ui';
import { dataHora } from '../../admin/util';
import { AcaoConfirmada } from '../acoes';
import { BotaoAtualizar, CartaoLinha, Cartoes, Pagina, useCelular } from '../componentes';
import { caminho, NOMES_PAPEL, tomPapel } from '../util';
import type { MembroEquipe } from '@fuse/shared/api';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** S-25 (R2-14): o motivo de o botão do convite estar desabilitado, em vez do silêncio. */
export function problemaConvite(novo: { nome: string; email: string }): { nome?: string; email?: string } {
  const r: { nome?: string; email?: string } = {};
  if (novo.nome.trim() && !novo.nome.trim().includes(' ')) r.nome = 'Informe nome e sobrenome.';
  if (novo.email.trim() && !EMAIL_VALIDO.test(novo.email.trim())) r.email = 'Informe um e-mail válido.';
  return r;
}

function SelosMembro({ m }: { m: MembroEquipe }) {
  return (
    <span className={a.acoes} style={{ gap: 4 }}>
      <Selo tom={tomPapel(m.papel)}>{NOMES_PAPEL[m.papel]}</Selo>
      {m.convitePendente ? <Selo tom="aviso">Convite pendente</Selo> : null}
      {m.papel === 'superadmin' ? m.doisFatores ? <Selo tom="sucesso">2FA ativo</Selo> : <Selo tom="erro">Sem 2FA</Selo> : null}
      {m.bloqueado ? <Selo tom="erro">Bloqueado</Selo> : null}
    </span>
  );
}

export default function Equipe() {
  const celular = useCelular();
  const consulta = useQuery({ queryKey: ['super', 'equipe'], queryFn: () => api('superEquipe') });
  const [convidar, setConvidar] = useState(false);
  const [novo, setNovo] = useState<{ nome: string; email: string; papel: 'admin' | 'superadmin' }>({ nome: '', email: '', papel: 'admin' });

  return (
    <Pagina
      titulo="Equipe"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Equipe' }]}
      subtitulo="Quem administra o Fuse Aprova. Para mudar o papel de alguém, abra a ficha do usuário."
      acoes={
        <>
          <BotaoAtualizar aoClicar={() => void consulta.refetch()} carregando={consulta.isFetching} />
          <Botao
            variante="primario"
            onClick={() => {
              setNovo({ nome: '', email: '', papel: 'admin' });
              setConvidar(true);
            }}
          >
            Convidar membro
          </Botao>
        </>
      }
    >
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Ninguém na equipe.">
        {(d) =>
          celular ? (
            <Cartoes rotulo="Equipe">
              {d.itens.map((m) => (
                <CartaoLinha
                  key={m.id}
                  para={caminho(`usuarios/${m.id}`)}
                  titulo={m.nome}
                  sub={m.email}
                  extra={
                    <div style={{ marginTop: 4 }}>
                      <SelosMembro m={m} />
                    </div>
                  }
                />
              ))}
            </Cartoes>
          ) : (
            <Tabela rotulo="Equipe">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Situação</th>
                  <th>2FA desde</th>
                  <th>Último acesso</th>
                  <th>Na equipe desde</th>
                </tr>
              </thead>
              <tbody>
                {d.itens.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link className={a.link} to={caminho(`usuarios/${m.id}`)}>
                        {m.nome}
                      </Link>
                      <div className={a.suave}>{m.email}</div>
                    </td>
                    <td>
                      <SelosMembro m={m} />
                    </td>
                    <td>{dataHora(m.doisFatoresAtivadoEm)}</td>
                    <td>{dataHora(m.ultimoAcessoEm)}</td>
                    <td>{dataHora(m.criadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )
        }
      </Consulta>
      <AcaoConfirmada
        titulo="Convidar para a equipe"
        aberta={convidar}
        aoFechar={() => {
          setConvidar(false);
          void consulta.refetch();
        }}
        rotuloConfirmar="Enviar convite"
        reconfirmar
        podeConfirmar={novo.nome.trim().includes(' ') && EMAIL_VALIDO.test(novo.email.trim())}
        executar={(motivo, confirmacao) => api('superEquipeConvidar', { corpo: { ...novo, motivo, confirmacao: confirmacao ?? {} } })}
        sucesso={(r) => `Convite enviado para ${(r as { email: string }).email}. O link vale 72 horas.`}
      >
        <CampoTexto
          rotulo="Nome completo"
          value={novo.nome}
          ajuda="Nome e sobrenome."
          erro={problemaConvite(novo).nome}
          onChange={(e) => setNovo((x) => ({ ...x, nome: e.target.value }))}
        />
        <CampoTexto
          rotulo="E-mail"
          type="email"
          value={novo.email}
          erro={problemaConvite(novo).email}
          onChange={(e) => setNovo((x) => ({ ...x, email: e.target.value }))}
        />
        <CampoSelecao
          rotulo="Papel"
          value={novo.papel}
          opcoes={[
            { valor: 'admin', rotulo: 'Admin (conteúdo)' },
            { valor: 'superadmin', rotulo: 'Superadmin (tudo, com 2FA)' },
          ]}
          onChange={(e) => setNovo((x) => ({ ...x, papel: e.target.value as 'admin' | 'superadmin' }))}
        />
      </AcaoConfirmada>
    </Pagina>
  );
}

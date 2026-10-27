import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GEMAS, PROTETORES_MAX, nomeComSobrenomeAbreviado } from '@fuse/shared';
import {
  AlterarSenhaEntrada,
  MENSAGENS_CADASTRO,
  ExcluirContaEntrada,
  OPCOES_META_DIARIA,
  type MeAtualizarEntrada,
} from '@fuse/shared/api';
import { camposDoErro, chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES, useConcurso, useMe } from '../api/consultas';
import { ativarPush, desativarPush } from '../app/push';
import { limparLocal, sair } from '../app/sair';
import { EH_APP } from '../nativo/plataforma';
import { contarPendentes, sincronizar } from '../offline/fila';
import {
  Botao3D,
  CabecalhoVoltar,
  Campo,
  CamposNovaSenha,
  Carregando,
  IconeCheio,
  IconeTraco,
  Modal,
  Pagina,
  useToast,
} from '../ui';
import { errosPorCampo } from './formulario';
import { CONTATO_SUPORTE } from './suporte';
import s from './Configuracoes.module.css';

function Interruptor({
  ligado,
  onMudar,
  rotulo,
  desabilitado,
}: {
  ligado: boolean;
  onMudar: (v: boolean) => void;
  rotulo: string;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      className={[s.switch, ligado ? s.switchOn : ''].join(' ')}
      onClick={() => onMudar(!ligado)}
    >
      <span className={s.bolinha} />
    </button>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={s.grupo} aria-label={titulo}>
      <h2 className={s.grupoTitulo}>{titulo}</h2>
      <div className={s.grupoCorpo}>{children}</div>
    </section>
  );
}

/** ✏️ Configurações: cargo, meta, lembrete e notificações, sons, nome na liga, senha, LGPD, links e sair. */
export default function Configuracoes() {
  const me = useMe();
  const concurso = useConcurso();
  const qc = useQueryClient();
  const toast = useToast();
  const navegar = useNavigate();
  const [apelido, setApelido] = useState<string | null>(null);
  const [erroApelido, setErroApelido] = useState<string | null>(null);
  const [senhaAberta, setSenhaAberta] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [baixando, setBaixando] = useState(false);
  /** Respostas offline ainda não enviadas: sair as apaga, então pede confirmação. */
  const [pendentesAoSair, setPendentesAoSair] = useState(0);
  const [saindo, setSaindo] = useState(false);

  const atualizar = useMutation({
    mutationFn: (corpo: MeAtualizarEntrada) => chamar('meAtualizar', { corpo }),
    onSuccess: (novo, corpo) => {
      qc.setQueryData(CHAVES.me, novo);
      if ('cargoId' in corpo) void qc.invalidateQueries({ queryKey: CHAVES.trilha });
      toast('Preferências salvas', 'sucesso');
    },
    onError: (e) => {
      const c = camposDoErro(e);
      if (c.apelidoLiga) setErroApelido(c.apelidoLiga);
      else toast(mensagemDeErro(e), 'erro');
    },
  });

  const protetor = useMutation({
    mutationFn: () => chamar('meComprarProtetor'),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: CHAVES.me });
      toast(`Protetor comprado! Você tem ${r.protetores}.`, 'sucesso');
    },
    onError: (e) => toast(mensagemDeErro(e), 'erro'),
  });

  if (!me.data) return <Carregando />;
  const u = me.data;
  const cargos = (concurso.data?.cargos ?? []).filter((c) =>
    concurso.data?.modoEdital ? !c.generico : true,
  );
  const usandoApelido = apelido !== null ? true : u.apelidoLiga !== null;
  const valorApelido = apelido ?? u.apelidoLiga ?? '';

  async function mudarNotificacoes(v: boolean) {
    if (v) {
      const r = await ativarPush();
      if (r !== 'ativado') {
        toast(
          r === 'negado'
            ? EH_APP
              ? 'As notificações estão bloqueadas nos ajustes do aparelho.'
              : 'As notificações estão bloqueadas no navegador.'
            : 'Não foi possível ativar as notificações neste aparelho.',
          'erro',
        );
        return;
      }
    } else {
      await desativarPush();
    }
    atualizar.mutate({
      notificacoes: v,
      ...(v && !u.lembreteHora ? { lembreteHora: '19:00' } : {}),
    });
  }

  async function baixarDados() {
    setBaixando(true);
    try {
      const dados = await chamar('meExportar');
      const nome = `fuse-aprova-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      if (EH_APP) {
        // WebView não baixa blob: grava no aparelho e abre o compartilhamento do sistema.
        await (
          await import('../nativo/nativo')
        ).compartilharArquivo(nome, JSON.stringify(dados, null, 2));
        return;
      }
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Arquivo com seus dados baixado', 'sucesso');
    } catch (e) {
      toast(mensagemDeErro(e), 'erro');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Pagina>
      <CabecalhoVoltar para="/perfil" titulo="Configurações" />

      <Grupo titulo="Estudo">
        <label className={s.campo}>
          <span className={s.rotulo}>Cargo</span>
          <select
            className={s.select}
            value={u.cargo?.id ?? ''}
            onChange={(e) => e.target.value && atualizar.mutate({ cargoId: e.target.value })}
          >
            {!u.cargo ? <option value="">Escolha um cargo</option> : null}
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <div className={s.campo}>
          <span className={s.rotulo} id="meta-rotulo">
            Meta diária
          </span>
          <div role="radiogroup" aria-labelledby="meta-rotulo" className={s.opcoes}>
            {OPCOES_META_DIARIA.map((o) => (
              <button
                key={o.valor}
                type="button"
                role="radio"
                aria-checked={u.metaDiaria === o.valor}
                className={[s.opcao, u.metaDiaria === o.valor ? s.opcaoOn : ''].join(' ')}
                onClick={() => atualizar.mutate({ metaDiaria: o.valor })}
              >
                {o.texto}
              </button>
            ))}
          </div>
        </div>
      </Grupo>

      <Grupo titulo="Lembrete e notificações">
        <div className={s.linha}>
          <span>Notificações do lembrete</span>
          <Interruptor
            ligado={u.notificacoes}
            rotulo="Notificações do lembrete"
            onMudar={(v) => void mudarNotificacoes(v)}
          />
        </div>
        <label className={s.linha}>
          <span>Horário do lembrete</span>
          <input
            type="time"
            className={s.hora}
            step={300}
            defaultValue={u.lembreteHora ?? '19:00'}
            onBlur={(e) =>
              e.target.value &&
              e.target.value !== u.lembreteHora &&
              atualizar.mutate({ lembreteHora: e.target.value })
            }
          />
        </label>
        <div className={s.linha}>
          <span>Sons e vibração</span>
          <Interruptor
            ligado={u.sons}
            rotulo="Sons e vibração"
            onMudar={(v) => atualizar.mutate({ sons: v })}
          />
        </div>
      </Grupo>

      <Grupo titulo="Como você aparece na liga">
        <div role="radiogroup" aria-label="Nome na liga" className={s.opcoes}>
          <button
            type="button"
            role="radio"
            aria-checked={!usandoApelido}
            className={[s.opcao, !usandoApelido ? s.opcaoOn : ''].join(' ')}
            onClick={() => {
              setApelido(null);
              if (u.apelidoLiga !== null) atualizar.mutate({ apelidoLiga: null });
            }}
          >
            Nome: {nomeComSobrenomeAbreviado(u.nome).split(' ').slice(0, 2).join(' ')}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={usandoApelido}
            className={[s.opcao, usandoApelido ? s.opcaoOn : ''].join(' ')}
            onClick={() => setApelido(valorApelido)}
          >
            Apelido
          </button>
        </div>
        {usandoApelido ? (
          <div className={s.apelido}>
            <Campo
              rotulo="Apelido"
              valor={valorApelido}
              onValor={(v) => {
                setApelido(v);
                setErroApelido(null);
              }}
              erro={erroApelido}
              maxLength={20}
            />
            <Botao3D
              compacto
              onClick={() => atualizar.mutate({ apelidoLiga: valorApelido.trim() })}
              carregando={atualizar.isPending}
            >
              SALVAR APELIDO
            </Botao3D>
          </div>
        ) : null}
      </Grupo>

      <Grupo titulo="Protetor de ofensiva">
        <div className={s.linha}>
          <span className={s.protetor}>
            <IconeCheio nome="escudo" tamanho={22} /> {u.protetores} de {PROTETORES_MAX} guardados ·
            você tem {u.gemas} gemas
          </span>
        </div>
        <Botao3D
          variante="azul"
          compacto
          disabled={u.protetores >= PROTETORES_MAX || u.gemas < GEMAS.CUSTO_PROTETOR}
          carregando={protetor.isPending}
          onClick={() => protetor.mutate()}
        >
          COMPRAR PROTETOR (−{GEMAS.CUSTO_PROTETOR} GEMAS)
        </Botao3D>
      </Grupo>

      <Grupo titulo="Conta">
        <button type="button" className={s.item} onClick={() => setSenhaAberta(true)}>
          <span>Alterar senha</span>
          <IconeTraco nome="chevron" tamanho={20} />
        </button>
        <button
          type="button"
          className={s.item}
          onClick={() => void baixarDados()}
          disabled={baixando}
        >
          <span>{baixando ? 'Preparando…' : 'Baixar meus dados (JSON)'}</span>
          <IconeTraco nome="baixar" tamanho={20} />
        </button>
        <button
          type="button"
          className={[s.item, s.perigo].join(' ')}
          onClick={() => setExcluirAberto(true)}
        >
          <span>Excluir conta</span>
          <IconeTraco nome="lixeira" tamanho={20} />
        </button>
      </Grupo>

      <Grupo titulo="Ajuda">
        <Link className={s.item} to="/termos">
          <span>Termos de uso</span>
          <IconeTraco nome="chevron" tamanho={20} />
        </Link>
        <Link className={s.item} to="/privacidade">
          <span>Política de privacidade</span>
          <IconeTraco nome="chevron" tamanho={20} />
        </Link>
        <a className={s.item} href={CONTATO_SUPORTE.url} target="_blank" rel="noopener noreferrer">
          <span>Suporte · {CONTATO_SUPORTE.texto}</span>
          <IconeTraco nome="link" tamanho={20} />
        </a>
      </Grupo>

      <Botao3D
        variante="secundario"
        iconeEsquerda={<IconeTraco nome="sair" tamanho={20} />}
        carregando={saindo}
        onClick={async () => {
          setSaindo(true);
          try {
            // Tenta enviar a fila offline antes; o que não subir é perdido ao sair (R2-06).
            // No máximo 8 s esperando a rede (V2-09): depois, decide com o que ficou pendente.
            if (navigator.onLine)
              await Promise.race([
                sincronizar(u.id).catch(() => null),
                new Promise((ok) => window.setTimeout(ok, 8000)),
              ]);
            const n = await contarPendentes(u.id).catch(() => 0);
            if (n > 0) {
              setPendentesAoSair(n);
              return;
            }
            await sair(qc);
            navegar('/', { replace: true });
          } finally {
            setSaindo(false);
          }
        }}
      >
        SAIR
      </Botao3D>

      <Modal
        aberto={pendentesAoSair > 0}
        titulo="Respostas ainda não enviadas"
        onFechar={() => setPendentesAoSair(0)}
        formato="folha"
        descricao={`Você tem ${pendentesAoSair} ${pendentesAoSair === 1 ? 'resposta feita' : 'respostas feitas'} sem internet que ainda não ${pendentesAoSair === 1 ? 'foi enviada' : 'foram enviadas'}. Se sair agora, elas não contam para o seu progresso. Conecte-se e espere a sincronização para não perder nada.`}
        rodape={
          <>
            <Botao3D variante="secundario" onClick={() => setPendentesAoSair(0)}>
              FICAR E SINCRONIZAR
            </Botao3D>
            <Botao3D
              variante="perigo"
              onClick={async () => {
                setPendentesAoSair(0);
                await sair(qc);
                navegar('/', { replace: true });
              }}
            >
              SAIR MESMO ASSIM
            </Botao3D>
          </>
        }
      />

      <AlterarSenha aberto={senhaAberta} onFechar={() => setSenhaAberta(false)} />
      <ExcluirConta
        aberto={excluirAberto}
        onFechar={() => setExcluirAberto(false)}
        onExcluida={async () => {
          await limparLocal(qc);
          navegar('/', { replace: true });
        }}
      />
    </Pagina>
  );
}

function AlterarSenha({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ senhaAtual: '', novaSenha: '' });
  const [confirma, setConfirma] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  async function enviar() {
    const r = AlterarSenhaEntrada.safeParse(v);
    const novos = r.success ? {} : errosPorCampo(r.error);
    if (!novos.novaSenha && confirma !== v.novaSenha) {
      novos.confirma = confirma
        ? MENSAGENS_CADASTRO.senhasDiferentes
        : MENSAGENS_CADASTRO.confirmarSenha;
    }
    if (Object.keys(novos).length) return setErros(novos);
    setEnviando(true);
    try {
      await chamar('meSenha', { corpo: v });
      toast('Senha alterada. As outras sessões foram encerradas.', 'sucesso');
      setV({ senhaAtual: '', novaSenha: '' });
      setConfirma('');
      setErros({});
      onFechar();
    } catch (e) {
      const c = camposDoErro(e);
      setErros(Object.keys(c).length ? c : { senhaAtual: mensagemDeErro(e) });
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal
      aberto={aberto}
      titulo="Alterar senha"
      onFechar={onFechar}
      formato="folha"
      rodape={
        <Botao3D carregando={enviando} onClick={() => void enviar()}>
          SALVAR NOVA SENHA
        </Botao3D>
      }
    >
      <div className={s.form}>
        <Campo
          rotulo="Senha atual"
          valor={v.senhaAtual}
          onValor={(x) => setV((a) => ({ ...a, senhaAtual: x }))}
          erro={erros.senhaAtual}
          senha
          autoComplete="current-password"
        />
        <CamposNovaSenha
          rotuloSenha="Nova senha"
          rotuloConfirma="Repita a nova senha"
          senha={v.novaSenha}
          confirma={confirma}
          onSenha={(x) => setV((a) => ({ ...a, novaSenha: x }))}
          onConfirma={setConfirma}
          erroSenha={erros.novaSenha}
          erroConfirma={erros.confirma}
        />
      </div>
    </Modal>
  );
}

function ExcluirConta({
  aberto,
  onFechar,
  onExcluida,
}: {
  aberto: boolean;
  onFechar: () => void;
  onExcluida: () => Promise<void>;
}) {
  const [v, setV] = useState({ senha: '', confirmacao: '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  async function enviar() {
    const r = ExcluirContaEntrada.safeParse(v);
    if (!r.success) return setErros(errosPorCampo(r.error));
    setEnviando(true);
    try {
      await chamar('meExcluir', { corpo: { senha: v.senha, confirmacao: 'EXCLUIR' } });
      await onExcluida();
    } catch (e) {
      const c = camposDoErro(e);
      setErros(Object.keys(c).length ? c : { senha: mensagemDeErro(e) });
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal
      aberto={aberto}
      titulo="Excluir conta"
      onFechar={onFechar}
      formato="folha"
      descricao="Seu perfil será anonimizado e você perde o acesso. O registro do pedido fica guardado por obrigação fiscal. Isso não pode ser desfeito."
      rodape={
        <>
          <Botao3D variante="perigo" carregando={enviando} onClick={() => void enviar()}>
            EXCLUIR MINHA CONTA
          </Botao3D>
          <Botao3D variante="secundario" onClick={onFechar}>
            CANCELAR
          </Botao3D>
        </>
      }
    >
      <div className={s.form}>
        <Campo
          rotulo="Sua senha"
          valor={v.senha}
          onValor={(x) => setV((a) => ({ ...a, senha: x }))}
          erro={erros.senha}
          senha
          autoComplete="current-password"
        />
        <Campo
          rotulo="Digite EXCLUIR para confirmar"
          valor={v.confirmacao}
          onValor={(x) => setV((a) => ({ ...a, confirmacao: x }))}
          erro={erros.confirmacao}
          autoCapitalize="characters"
        />
      </div>
    </Modal>
  );
}

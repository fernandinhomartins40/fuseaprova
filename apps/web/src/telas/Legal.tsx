import { AVISO_EDITAL, RODAPE_LEGAL } from '@fuse/shared';
import { VERSAO_TERMOS_ATUAL } from '@fuse/shared/api';
import { CabecalhoVoltar, Pagina } from '../ui';
import { CONTATO_SUPORTE } from './suporte';
import s from './Legal.module.css';

/** Termos de uso (PRD 11): tudo o que a seção exige, em linguagem simples. */
export function Termos() {
  return (
    <Pagina>
      <CabecalhoVoltar titulo="Termos de uso" />
      <article className={s.texto}>
        <h1>Termos de uso do Fuse Aprova</h1>
        <p className={s.versao}>Versão {VERSAO_TERMOS_ATUAL}</p>

        <h2>1. O que você está comprando</h2>
        <p>
          O Fuse Aprova é um <strong>produto digital de acesso único</strong>: um app de estudo para
          o concurso da Prefeitura Municipal de Palmital-PR 2026/27. O pagamento é de R$ 397,00, à
          vista e só por Pix. Não há mensalidade, renovação automática, período de teste nem acesso
          gratuito.
        </p>

        <h2>2. Por quanto tempo vale</h2>
        <p>
          O acesso vale{' '}
          <strong>
            até a homologação do concurso de Palmital ou por 24 meses, o que vier primeiro
          </strong>
          , contados da confirmação do pagamento.
        </p>
        <p>{AVISO_EDITAL}</p>

        <h2>3. Direito de arrependimento</h2>
        <p>
          Por ser uma compra pela internet, você pode desistir em até <strong>7 dias</strong> depois
          do pagamento (Código de Defesa do Consumidor, art. 49) e receber o valor integral de
          volta. O reembolso encerra o acesso. Para pedir, fale com o suporte (
          {CONTATO_SUPORTE.texto}).
        </p>

        <h2>4. Questões reais e fontes</h2>
        <p>
          O app usa{' '}
          <strong>questões reais de provas da FAU-Unicentro, sempre com a fonte citada</strong>{' '}
          (banca, órgão, ano e cargo), e questões autorais marcadas como “Questão Fuse Aprova ·
          estilo FAU”. O titular de qualquer conteúdo pode pedir a <strong>remoção</strong> pelo
          suporte, e ela é feita rapidamente.
        </p>

        <h2>5. Sem garantia de aprovação</h2>
        <p>
          O Fuse Aprova ajuda você a treinar, mas <strong>não garante aprovação</strong> em concurso
          nenhum. O resultado depende da prova, da concorrência e do seu estudo.
        </p>

        <h2>6. Sem vínculo com a banca ou a Prefeitura</h2>
        <p>
          <strong>{RODAPE_LEGAL}</strong> O produto não é afiliado, patrocinado nem endossado por
          elas.
        </p>

        <h2>7. Sua conta</h2>
        <p>
          A conta é pessoal. Não compartilhe sua senha. Podemos encerrar contas usadas para copiar
          ou revender o conteúdo. Você pode baixar seus dados ou excluir a conta a qualquer momento
          em Perfil › Configurações.
        </p>

        <h2>8. Contato</h2>
        <p>Suporte: {CONTATO_SUPORTE.texto}.</p>
      </article>
    </Pagina>
  );
}

/** Política de privacidade (LGPD, PRD 8.8). */
export function Privacidade() {
  return (
    <Pagina>
      <CabecalhoVoltar titulo="Privacidade" />
      <article className={s.texto}>
        <h1>Política de privacidade</h1>
        <p className={s.versao}>Versão {VERSAO_TERMOS_ATUAL}</p>

        <h2>Quais dados guardamos</h2>
        <p>
          Nome, e-mail, celular e CPF (o CPF é usado <strong>só na cobrança Pix</strong>); suas
          respostas, XP, ofensiva e simulados; e, se você permitir, a inscrição de notificações do
          navegador.
        </p>

        <h2>Para que usamos</h2>
        <p>
          Para liberar seu acesso, montar sua trilha e revisão, calcular sua liga e enviar e-mails
          de recibo e de recuperação de senha. Não vendemos dados e não usamos ferramentas de
          análise ou publicidade de terceiros.
        </p>

        <h2>Com quem compartilhamos</h2>
        <p>
          Só com o Asaas, que processa o Pix (nome, CPF, e-mail e celular). Na liga, os outros
          alunos veem apenas seu primeiro nome com a inicial do sobrenome, ou o apelido que você
          escolher.
        </p>

        <h2>Onde ficam</h2>
        <p>
          Em servidor próprio, com conexão protegida (HTTPS). Senhas são guardadas com hash. CPF
          aparece mascarado nos registros internos.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Em Perfil › Configurações você pode <strong>baixar seus dados</strong> (arquivo JSON) e{' '}
          <strong>excluir a conta</strong>. Na exclusão, o perfil é anonimizado e só o registro do
          pedido é mantido, por obrigação fiscal. Dúvidas: {CONTATO_SUPORTE.texto}.
        </p>
      </article>
    </Pagina>
  );
}

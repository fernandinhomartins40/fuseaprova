import { Link } from 'react-router-dom';
import { AVISO_EDITAL, EMPRESA, formatarReais, RODAPE_LEGAL } from '@fuse/shared';
import { useConfigPublica } from '../api/consultas';
import { VERSAO_TERMOS_ATUAL } from '@fuse/shared/api';
import { CabecalhoVoltar, Pagina } from '../ui';
import { EH_APP } from '../nativo/plataforma';
import { CONTATO_SUPORTE, EMAIL_PRIVACIDADE } from './suporte';
import s from './Legal.module.css';

/** Bloco com a identificação da empresa (CDC; Decreto 7.962/2013, art. 2º; LGPD, art. 9º). */
function Empresa() {
  return (
    <p className={s.empresa}>
      <strong>{EMPRESA.razaoSocial}</strong>
      <br />
      CNPJ {EMPRESA.cnpj}
      <br />
      {EMPRESA.endereco}
      <br />
      Atendimento: {CONTATO_SUPORTE.texto} · Privacidade: {EMAIL_PRIVACIDADE}
    </p>
  );
}

/**
 * Termos de uso (PRD 11, D26): contrato de consumo do Fuse Aprova, conforme o CDC (Lei 8.078/1990),
 * o Decreto 7.962/2013 (comércio eletrônico), o Marco Civil (Lei 12.965/2014) e a LGPD.
 */
export function Termos() {
  // D23: os preços são os vigentes (o superadmin muda pelo painel).
  const precos = useConfigPublica().data;
  return (
    <Pagina>
      <CabecalhoVoltar titulo="Termos de uso" />
      <article className={s.texto}>
        <h1>Termos de uso do Fuse Aprova</h1>
        <p className={s.versao}>Versão {VERSAO_TERMOS_ATUAL}</p>

        <h2>1. Quem somos</h2>
        <p>
          O Fuse Aprova é oferecido pela empresa abaixo, que é a fornecedora do serviço e a
          responsável por estes termos:
        </p>
        <Empresa />
        <p>
          Ao criar a conta e marcar que leu e aceita, você celebra com a {EMPRESA.razaoSocial} um
          contrato de prestação de serviço digital, regido por estes termos, pela{' '}
          <Link to="/privacidade">Política de privacidade</Link> e pelo Código de Defesa do
          Consumidor. Leia com calma: se não concordar, não use o serviço.
        </p>

        <h2>2. O que é o serviço</h2>
        <p>
          O Fuse Aprova é um <strong>app de estudo para concursos</strong>, com trilhas
          de lições, questões comentadas, revisão espaçada, simulados, liga semanal e estudo
          offline. Ele funciona no navegador (site e PWA) e no app para Android e iPhone.{' '}
          <strong>Cada concurso é um acesso separado</strong>, pessoal e intransferível.
        </p>

        <h2>3. Quem pode usar</h2>
        <ul>
          <li>Maiores de 18 anos, com capacidade civil plena.</li>
          <li>
            Entre 16 e 18 anos, só com a autorização e a assistência de pai, mãe ou responsável
            legal, que responde pela contratação.
          </li>
          <li>O serviço não é destinado a menores de 16 anos.</li>
        </ul>

        <h2>4. Sua conta</h2>
        <ul>
          <li>
            Informe dados verdadeiros e atualizados (nome, e-mail, celular e CPF). O CPF é exigido
            para emitir a cobrança Pix.
          </li>
          <li>
            A conta é <strong>pessoal</strong>. Não compartilhe a senha nem o acesso. Você responde
            pelo que for feito com a sua conta até nos avisar de uso indevido.
          </li>
          <li>
            Você pode baixar os seus dados ou excluir a conta a qualquer momento, em Perfil ›
            Configurações (veja <Link to="/excluir-conta">Como excluir sua conta</Link>).
          </li>
        </ul>

        <h2>5. Preço e pagamento</h2>
        {EH_APP ? (
          // App nativo: sem preço nem meio de pagamento (regras das lojas, D20).
          <p>
            O app é usado com uma conta que já tem acesso. Não há mensalidade, renovação
            automática, período de teste nem acesso gratuito.
          </p>
        ) : (
          <>
            <p>
              {precos ? (
                <>
                  Hoje o primeiro concurso custa {formatarReais(precos.precoCentavos)} e cada
                  concurso adicional custa {formatarReais(precos.precoAdicionalCentavos)}.{' '}
                </>
              ) : null}
              <strong>Vale o valor mostrado na tela de pagamento no momento da compra</strong>, já
              com o cupom de desconto, se houver. O pagamento é à vista e só por Pix, processado pelo
              Asaas (instituição de pagamento). O acesso é liberado automaticamente quando o Asaas
              confirma o pagamento. Não há mensalidade, renovação automática, período de teste nem
              acesso gratuito.
            </p>
            <p>
              <strong>Cupons:</strong> um por compra, com validade, limite de usos e concurso
              definidos na criação. Não são trocados por dinheiro nem acumulados. O desconto só é
              garantido quando o Pix gerado com o cupom é pago dentro do prazo do Pix. Mudanças de
              preço ou de cupom não alteram compras já pagas.
            </p>
          </>
        )}

        <h2>6. Por quanto tempo vale o acesso</h2>
        <p>
          O acesso a cada concurso vale{' '}
          <strong>
            até a homologação do concurso contratado ou por 24 meses, o que vier primeiro
          </strong>
          , contados da confirmação do pagamento daquele concurso.
        </p>
        <p>{AVISO_EDITAL}</p>

        <h2>7. Direito de arrependimento e reembolso</h2>
        <p>
          Por ser uma compra pela internet, você pode desistir em até <strong>7 dias</strong>{' '}
          corridos depois do pagamento, sem dar motivo, e receber o{' '}
          <strong>valor integral</strong> de volta (CDC, art. 49). Peça pelo atendimento (
          {CONTATO_SUPORTE.texto}). A devolução é feita pelo mesmo meio (Pix), em regra em até 7
          dias, e encerra o acesso ao concurso reembolsado. Depois desse prazo, o reembolso é
          analisado caso a caso, sem prejuízo dos seus direitos em caso de falha do serviço.
        </p>

        <h2>8. Licença de uso e conteúdo</h2>
        <p>
          Você recebe uma <strong>licença pessoal, não exclusiva e intransferível</strong> para usar
          o conteúdo durante a validade do acesso. Os textos, as explicações, as trilhas, o design,
          a mascote Capi e o software pertencem à {EMPRESA.razaoSocial} ou aos seus licenciantes e
          são protegidos pela Lei de Direitos Autorais (Lei 9.610/1998) e pela Lei do Software (Lei
          9.609/1998).
        </p>
        <p>
          O app usa <strong>questões de provas anteriores, que são públicas</strong>, e questões
          autorais marcadas como “Questão Fuse Aprova”. O titular de qualquer conteúdo pode pedir a <strong>remoção</strong> pelo
          atendimento, e ela é feita rapidamente.
        </p>

        <h2>9. O que não é permitido</h2>
        <ul>
          <li>compartilhar, vender, alugar ou emprestar a conta ou o acesso;</li>
          <li>copiar, gravar, baixar em massa, republicar ou revender o conteúdo;</li>
          <li>usar robôs, scripts ou raspagem de dados;</li>
          <li>tentar burlar o pagamento, as travas de acesso ou a segurança do sistema;</li>
          <li>fazer engenharia reversa do app, salvo o que a lei permitir;</li>
          <li>usar apelidos ou relatos de erro ofensivos, discriminatórios ou ilegais.</li>
        </ul>
        <p>
          Nesses casos, podemos suspender ou encerrar a conta, depois de avisar pelo e-mail
          cadastrado sempre que possível, e tomar as medidas legais cabíveis.
        </p>

        <h2>10. Sem garantia de aprovação</h2>
        <p>
          O Fuse Aprova ajuda você a treinar, mas <strong>não garante aprovação</strong> em concurso
          nenhum. O resultado depende da prova, da concorrência e do seu estudo. As informações
          sobre editais e datas são de apoio: confira sempre o edital oficial, publicado pelo órgão
          responsável no site dele e no Diário Oficial.
        </p>

        <h2>11. Sem vínculo com órgãos públicos ou bancas</h2>
        <p>
          <strong>{RODAPE_LEGAL}</strong> O produto não é afiliado, patrocinado nem endossado por
          nenhum órgão público nem pelas bancas organizadoras dos concursos.
        </p>

        <h2>12. Funcionamento do serviço</h2>
        <p>
          Trabalhamos para manter o serviço disponível o tempo todo, mas podem ocorrer pausas para
          manutenção, atualização ou por falhas de terceiros (internet, hospedagem, lojas de apps).
          XP, gemas, vidas, ofensiva e a liga são recursos de motivação, sem valor em dinheiro, e
          podem ser ajustados para corrigir erros ou abusos. Respondemos pelos danos causados por
          falha do serviço nos termos do CDC.
        </p>

        <h2>13. Mudanças nestes termos</h2>
        <p>
          Podemos atualizar estes termos para acompanhar o produto ou a lei. Mudanças relevantes
          são avisadas pelo e-mail cadastrado e no app com pelo menos 15 dias de antecedência, e
          nunca alteram o preço nem o prazo de uma compra já paga. Se não concordar, você pode
          excluir a conta; dentro dos 7 dias do pagamento, vale o direito de arrependimento.
        </p>

        <h2>14. Atendimento, lei e foro</h2>
        <p>
          Atendimento: {CONTATO_SUPORTE.texto}. Respondemos em até 5 dias úteis (Decreto
          7.962/2013, art. 4º). Estes termos seguem a lei brasileira. Como consumidor, você pode
          propor ação no foro do seu domicílio (CDC, art. 101, I); nas demais situações, fica eleito
          o foro de {EMPRESA.foro}.
        </p>
      </article>
    </Pagina>
  );
}

/**
 * Política de privacidade (LGPD, Lei 13.709/2018; PRD 8.8; D26). Descreve o que o sistema faz de
 * fato: se mudar a coleta, o compartilhamento ou um prazo de guarda, atualize aqui e a versão.
 */
export function Privacidade() {
  return (
    <Pagina>
      <CabecalhoVoltar titulo="Privacidade" />
      <article className={s.texto}>
        <h1>Política de privacidade</h1>
        <p className={s.versao}>Versão {VERSAO_TERMOS_ATUAL}</p>
        <p>
          Esta política explica, em linguagem simples, quais dados pessoais o Fuse Aprova trata,
          para quê, com quem, por quanto tempo e como você exerce os seus direitos, conforme a Lei
          Geral de Proteção de Dados (LGPD, Lei 13.709/2018) e o Marco Civil da Internet (Lei
          12.965/2014).
        </p>

        <h2>1. Quem é o controlador dos seus dados</h2>
        <p>Quem decide sobre o tratamento dos seus dados é:</p>
        <Empresa />

        <h2>2. Encarregado pelo tratamento de dados (DPO)</h2>
        <p>
          O encarregado é <strong>{EMPRESA.encarregado}</strong>. Fale com ele pelo e-mail{' '}
          <strong>{EMAIL_PRIVACIDADE}</strong> para qualquer assunto sobre os seus dados, inclusive
          para exercer os seus direitos.
        </p>

        <h2>3. Quais dados tratamos</h2>
        <h3>Que você nos informa</h3>
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, e-mail, celular, CPF e senha (guardada só como hash,
            que não permite recuperar a senha original).
          </li>
          <li>
            <strong>Perfil e preferências:</strong> concurso e cargo escolhidos, apelido na liga,
            horário de lembrete, sons e consentimentos.
          </li>
          <li>
            <strong>Relatos de erro</strong> em questões e mensagens enviadas ao atendimento.
          </li>
        </ul>
        <h3>Que surgem do uso</h3>
        <ul>
          <li>
            <strong>Estudo:</strong> respostas, acertos, XP, ofensiva, vidas, gemas, revisões,
            simulados, conquistas e posição na liga.
          </li>
          <li>
            <strong>Pagamento:</strong> pedidos, valor, cupom, status do Pix e identificadores da
            cobrança no Asaas. <strong>Não recebemos dados bancários</strong>: o Pix é pago no app
            do seu banco.
          </li>
          <li>
            <strong>Registros de acesso:</strong> data, hora, endereço IP, porta de origem e
            navegador de cada login, cadastro e troca de senha, exigidos pelo Marco Civil da
            Internet (art. 15).
          </li>
          <li>
            <strong>Notificações:</strong> se você permitir, o endereço técnico de inscrição de
            notificações do navegador ou do aparelho.
          </li>
        </ul>
        <p>
          <strong>Não tratamos dados pessoais sensíveis</strong> (saúde, religião, biometria etc.)
          e não usamos ferramentas de análise, publicidade, rastreamento ou redes de anúncios de
          terceiros.
        </p>

        <h2>4. Para que usamos e com qual base legal</h2>
        <ul>
          <li>
            <strong>
              Criar e manter a conta, liberar o acesso, montar trilhas, revisões, simulados e a
              liga, e enviar e-mails de recibo e de recuperação de senha:
            </strong>{' '}
            execução do contrato (LGPD, art. 7º, V).
          </li>
          <li>
            <strong>Emitir a cobrança Pix e guardar os registros do pagamento:</strong> execução do
            contrato e cumprimento de obrigação legal e fiscal (art. 7º, II e V).
          </li>
          <li>
            <strong>Guardar os registros de acesso por 6 meses:</strong> obrigação legal (Marco
            Civil, art. 15; LGPD, art. 7º, II).
          </li>
          <li>
            <strong>
              Segurança, prevenção a fraudes, limite de tentativas e auditoria das ações da equipe:
            </strong>{' '}
            legítimo interesse e proteção do próprio titular (art. 7º, IX, e art. 10), sempre no
            mínimo necessário.
          </li>
          <li>
            <strong>Lembretes de estudo e comunicações por e-mail ou notificação:</strong>{' '}
            consentimento (art. 7º, I), que você pode retirar a qualquer momento em Configurações
            ou nas permissões do aparelho.
          </li>
          <li>
            <strong>Defesa em processos e reclamações:</strong> exercício regular de direitos (art.
            7º, VI).
          </li>
        </ul>
        <p>
          Estatísticas do conteúdo (por exemplo, quantos acertam uma questão) usam dados
          agregados ou anonimizados, que não identificam você.
        </p>

        <h2>5. Com quem compartilhamos</h2>
        <p>Só com quem precisa dos dados para o serviço funcionar (operadores):</p>
        <ul>
          <li>
            <strong>Asaas</strong> (instituição de pagamento): nome, CPF, e-mail e celular, para
            emitir e conciliar o Pix.
          </li>
          <li>
            <strong>Provedor de hospedagem</strong> do servidor onde o sistema e o banco de dados
            rodam.
          </li>
          <li>
            <strong>Provedor de envio de e-mails</strong>: nome, e-mail e o conteúdo da mensagem.
          </li>
          <li>
            <strong>Serviços de notificação</strong> do navegador ou do aparelho (Google, Apple ou
            Mozilla), só se você ativar as notificações.
          </li>
        </ul>
        <p>
          Também compartilhamos quando a lei ou uma ordem judicial exigir. Na liga, os outros
          alunos veem só o seu primeiro nome com a inicial do sobrenome, ou o apelido que você
          escolher. <strong>Não vendemos nem alugamos dados pessoais.</strong>
        </p>

        <h2>6. Transferência internacional</h2>
        <p>
          Alguns operadores (hospedagem, e-mail e serviços de notificação) podem manter servidores
          fora do Brasil. Nesses casos, a transferência segue o art. 33 da LGPD, com operadores que
          oferecem garantias contratuais de proteção de dados compatíveis com a lei brasileira.
        </p>

        <h2>7. Por quanto tempo guardamos</h2>
        <ul>
          <li>
            <strong>Conta e histórico de estudo:</strong> enquanto a conta existir. Na exclusão, os
            dados que identificam você são apagados ou anonimizados na hora.
          </li>
          <li>
            <strong>Registros de acesso (IP, porta, data e hora):</strong> 6 meses, e então são
            apagados automaticamente.
          </li>
          <li>
            <strong>Pedidos e pagamentos:</strong> pelo prazo da legislação fiscal e do Código de
            Defesa do Consumidor, de no mínimo 5 anos, sem nome, e-mail, CPF nem celular depois da
            exclusão da conta.
          </li>
          <li>
            <strong>Auditoria das ações da equipe e avisos de pagamento do Asaas:</strong> 5 anos, e
            então são apagados automaticamente.
          </li>
          <li>
            <strong>Sessões e links de troca de senha:</strong> até expirarem.
          </li>
          <li>
            <strong>Cópias de segurança:</strong> até 8 semanas, quando são substituídas.
          </li>
        </ul>

        <h2>8. Como protegemos</h2>
        <p>
          Conexão sempre criptografada (HTTPS), senhas com hash forte, sessão em cookie protegido,
          verificação em duas etapas para a administração, limite de tentativas de login, acesso
          interno restrito por papel e registrado em auditoria, CPF mascarado nas telas internas e
          cópias de segurança diárias. Nenhum sistema é 100% invulnerável, mas adotamos as medidas
          técnicas e administrativas adequadas (LGPD, art. 46).
        </p>

        <h2>9. Seus direitos</h2>
        <p>Pela LGPD (art. 18), você pode, a qualquer momento e sem custo:</p>
        <ul>
          <li>confirmar se tratamos os seus dados e acessá-los;</li>
          <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários;</li>
          <li>receber os seus dados em formato estruturado (portabilidade);</li>
          <li>eliminar os dados tratados com consentimento e revogar o consentimento;</li>
          <li>saber com quem compartilhamos os seus dados;</li>
          <li>pedir a revisão de decisões tomadas só por meios automatizados.</li>
        </ul>
        <p>
          <strong>Pelo próprio app:</strong> em Perfil › Configurações você baixa os seus dados
          (arquivo JSON, inclusive os registros de acesso) e exclui a conta (veja{' '}
          <Link to="/excluir-conta">Como excluir sua conta</Link>).{' '}
          <strong>Pelo encarregado:</strong> escreva para {EMAIL_PRIVACIDADE} a partir do e-mail da
          conta. Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de
          Proteção de Dados (ANPD), em gov.br/anpd.
        </p>

        <h2>10. Cookies e armazenamento no aparelho</h2>
        <p>
          Usamos <strong>só um cookie essencial</strong>, o da sessão (para manter você
          conectado), e o armazenamento local do navegador ou do app para preferências e para o
          estudo offline. Não usamos cookies de publicidade nem de rastreamento. As fontes e os
          ícones vêm do nosso próprio servidor.
        </p>

        <h2>11. Crianças e adolescentes</h2>
        <p>
          O serviço não é destinado a menores de 16 anos. Entre 16 e 18 anos, o uso depende da
          autorização do responsável legal, e os dados são tratados no melhor interesse do
          adolescente (LGPD, art. 14). Se identificarmos conta de menor de 16 anos, ela será
          encerrada.
        </p>

        <h2>12. Incidentes de segurança</h2>
        <p>
          Se ocorrer um incidente que possa trazer risco ou dano relevante a você, comunicaremos a
          ANPD e os titulares afetados, com o que aconteceu, os dados envolvidos e as medidas
          tomadas (LGPD, art. 48).
        </p>

        <h2>13. Mudanças nesta política</h2>
        <p>
          Quando esta política mudar de forma relevante, avisaremos pelo e-mail cadastrado e no app
          antes de a mudança valer. A versão e a data ficam no topo da página.
        </p>
      </article>
    </Pagina>
  );
}

/**
 * Como excluir a conta e os dados (`/excluir-conta`): página pública exigida pela Play Store e
 * pela App Store. Descreve o passo a passo, o que é apagado e o que fica (ver servicos/lgpd.ts).
 */
export function ExclusaoDeConta() {
  return (
    <Pagina>
      <CabecalhoVoltar titulo="Excluir conta" />
      <article className={s.texto}>
        <h1>Como excluir sua conta do Fuse Aprova</h1>
        <p>
          Esta página vale para o app <strong>Fuse Aprova</strong> (Android e iPhone) e para o site
          fuseaprova.com.br.
        </p>

        <h2>Passo a passo</h2>
        <ol>
          <li>Abra o Fuse Aprova (app ou site) e entre na sua conta.</li>
          <li>
            Toque em <strong>Perfil</strong> e, depois, na engrenagem de{' '}
            <strong>Configurações</strong>.
          </li>
          <li>
            Role até o fim e toque em <strong>Excluir conta</strong>.
          </li>
          <li>
            Digite a sua senha e a palavra <strong>EXCLUIR</strong> e confirme.
          </li>
        </ol>
        <p>
          Antes de excluir, você pode tocar em <strong>Baixar meus dados</strong>, na mesma tela,
          para guardar uma cópia do seu perfil e do seu histórico de estudo.
        </p>
        <p>
          Sem acesso ao app ou esqueceu a senha? Peça a exclusão pelo contato{' '}
          {CONTATO_SUPORTE.texto}, a partir do e-mail cadastrado na conta.
        </p>

        <h2>O que é apagado</h2>
        <p>Na hora da exclusão, o seu perfil é anonimizado e estes dados são removidos:</p>
        <ul>
          <li>nome, e-mail, CPF e celular;</li>
          <li>senha e dados do segundo fator de autenticação, se houver;</li>
          <li>apelido na liga e a sua posição nela;</li>
          <li>horário de lembrete e inscrições de notificação;</li>
          <li>sessões abertas em todos os aparelhos (você é desconectado);</li>
          <li>o vínculo com o seu cadastro no serviço de pagamento (Asaas).</li>
        </ul>

        <h2>O que é mantido</h2>
        <ul>
          <li>
            <strong>Registro do pedido e do pagamento</strong>, sem seus dados pessoais, pelo prazo
            exigido pela legislação fiscal, por obrigação legal.
          </li>
          <li>
            <strong>Registros de acesso</strong> (data, hora, IP e porta) por 6 meses, por
            obrigação do Marco Civil da Internet (art. 15), e depois apagados automaticamente.
          </li>
          <li>
            <strong>Histórico de respostas e simulados</strong>, sem nome, e-mail nem qualquer dado
            que identifique você, apenas para estatísticas do conteúdo.
          </li>
          <li>
            <strong>Cópias de segurança</strong> do servidor: podem conter os dados por até 8
            semanas, quando são apagadas automaticamente.
          </li>
        </ul>

        <h2>Depois de excluir</h2>
        <p>
          A exclusão <strong>não pode ser desfeita</strong> e o acesso ao conteúdo é encerrado. Se
          você pagou há menos de 7 dias, veja o direito de arrependimento nos{' '}
          <Link to="/termos">Termos de uso</Link>. Mais sobre os seus dados na{' '}
          <Link to="/privacidade">Política de privacidade</Link>.
        </p>
      </article>
    </Pagina>
  );
}

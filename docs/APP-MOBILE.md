# App nativo do aluno (Android e iOS)

Guia do dono para gerar, testar e publicar o app do Fuse Aprova. A primeira loja é a Play Store; a App Store vem depois. As decisões estão em [DECISOES.md, D20](DECISOES.md).

## 1. Como o app é feito

| Parte | Onde | O que faz |
|---|---|---|
| Telas | `apps/web` (o mesmo React do site) | `pnpm --filter @fuse/web build:app` gera `apps/web/dist-app`: só o painel do aluno |
| Casca nativa | `apps/mobile` (Capacitor 8) | Projetos `android/` e `ios/`, plugins nativos e `capacitor.config.ts` |
| Recursos nativos | `apps/web/src/nativo/` | Splash, botão voltar do Android, lembrete local, imagens com sessão, exportação de dados |
| Imagens do app | `apps/mobile/assets/` → `pnpm --filter @fuse/mobile assets` | Ícones, notificação e splash nos tamanhos de cada plataforma |

**O que o app tem:**
- entrar, recuperar a senha e o onboarding;
- trilha, lição, revisão, simulado, liga, perfil e configurações;
- estudo offline;
- lembrete diário;
- baixar os dados e excluir a conta.

**O que o app não tem:** cadastro, pagamento, preço ou link de compra, `/admin` e `/super`. Quem ainda não pagou vê "Seu acesso ainda não está ativo". **A venda continua só no site**, para cumprir as regras das lojas (D20).

- **Identificador nas duas lojas:** `br.com.fuseaprova.app`.
- **API:** `https://www.fuseaprova.com.br`. Não mudou nada no servidor.

## 2. Rodar no computador

Requisitos:
- **Android:** Android Studio com SDK 36 e **JDK 21**.
- **iOS:** um Mac com Xcode 16 ou mais novo.

```bash
pnpm install
pnpm --filter @fuse/mobile sync          # build web (modo app) + copia para android/ e ios/
pnpm --filter @fuse/mobile android:abrir # abre no Android Studio → Run no celular/emulador
pnpm --filter @fuse/mobile ios:abrir     # (no Mac) abre no Xcode → Run no simulador
```

Para testar contra outra API, por exemplo uma de homologação, use `VITE_API_URL=https://... pnpm --filter @fuse/mobile sync`.

**Depois de trocar as imagens em `apps/mobile/assets/`**, rode:
- `pnpm --filter @fuse/mobile assets`;
- depois, `sync` de novo.

## 3. Play Store (primeiro)

### 3.1 Uma vez só: chave de upload

Gere a keystore no seu computador e **guarde-a no cofre de senhas**. Sem ela, você não publica atualizações (a Play App Signing ajuda a recuperar, mas dá trabalho).

```bash
keytool -genkeypair -v -keystore fuse-upload.jks -alias fuse-upload \
  -keyalg RSA -keysize 2048 -validity 10000
# Base64 para o secret do GitHub (Linux/macOS: base64 -w0; Windows PowerShell abaixo)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("fuse-upload.jks")) | Set-Clipboard
```

No GitHub, em Settings → Secrets and variables → Actions, crie:

| Secret | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | o conteúdo copiado acima |
| `ANDROID_KEYSTORE_PASSWORD` | a senha da keystore |
| `ANDROID_KEY_ALIAS` | `fuse-upload` |
| `ANDROID_KEY_PASSWORD` | a senha da chave |

### 3.2 Gerar o AAB

1. No GitHub, abra Actions → **App Android** → Run workflow e informe a versão (por exemplo, `1.0.0`).
2. O artefato traz:
   - `app-release.aab`, que vai para a Play Store;
   - `app-debug.apk`, para instalar direto num celular de teste.
3. O `versionCode` é o número da execução, então ele sempre cresce.

### 3.3 Play Console

1. **Criar o app:**
   - nome **Fuse Aprova**;
   - idioma português (Brasil);
   - app, gratuito (o download é gratuito; o acesso é vendido fora do app).
2. **Play App Signing:** aceite. O Google guarda a chave de assinatura; a sua keystore é só a de upload.
3. **Conteúdo do app**, as declarações:
   - **Política de privacidade:** `https://www.fuseaprova.com.br/privacidade`.
   - **Acesso ao app:** "Todas ou algumas funcionalidades são restritas". Informe uma **conta de demonstração com acesso pago liberado** (e-mail e senha) para a revisão do Google.
   - **Anúncios:** não.
   - **Classificação de conteúdo:** questionário; categoria Educação, sem conteúdo sensível.
   - **Público-alvo:** 18 anos ou mais (concurso público).
   - **Segurança dos dados:**
     - coleta nome, e-mail, número de telefone e "outros IDs pessoais" (CPF), além de "atividade no app" (respostas e progresso);
     - finalidade: funcionalidade do app e gerenciamento da conta;
     - não compartilha com terceiros para publicidade;
     - dados criptografados em trânsito (HTTPS);
     - o usuário pode pedir a exclusão.
   - **Exclusão de conta:** no app, em Perfil › Configurações › Excluir conta. Link web: `https://www.fuseaprova.com.br/privacidade` (seção "Seus direitos").
   - **App financeiro, saúde, governo:** não. É um app educacional. Não diga que é um app do governo nem da banca.
4. **Ficha da loja:** textos e imagens (seção 6).
5. **Testes:**
   - publique primeiro em **Teste interno** e instale pelo link;
   - depois, em **Teste fechado**.
   - Contas pessoais novas no Google Play precisam de um teste fechado com 12 testadores por 14 dias antes da produção.
6. **Produção:** envie para revisão.

## 4. O que conferir no celular antes de publicar

- Entrar com uma conta paga. A trilha abre, e a lição corrige e conclui.
- Ativar o modo avião no meio dos estudos: a lição do pacote offline funciona e, ao voltar a internet, sincroniza.
- Entrar com uma conta **sem** pagamento: aparece "Seu acesso ainda não está ativo", sem preço e sem link de compra.
- Em Configurações, ligar o lembrete: o sistema pede a permissão. Com o horário daqui a 2 minutos, a notificação chega e o toque abre a trilha.
- Baixar meus dados: abre o compartilhamento com o arquivo JSON.
- O botão voltar do Android volta entre telas e, na trilha, minimiza o app.
- Imagens das questões com figura aparecem.

## 5. App Store (depois)

1. **Apple Developer Program:** inscrição anual da Apple.
2. **Certificates, IDs & Profiles:** App ID `br.com.fuseaprova.app`.
3. **App Store Connect:** novo app; nome **Fuse Aprova**; idioma principal português (Brasil); SKU `fuseaprova-ios`.
4. **No Mac:**
   - `pnpm --filter @fuse/mobile sync:ios`;
   - depois, `pnpm --filter @fuse/mobile ios:abrir`.
5. **No Xcode**, alvo App → Signing & Capabilities:
   - selecione o seu Team;
   - deixe "Automatically manage signing".
6. **Versão** (General): Version `1.0.0` e Build `1`. O Build cresce a cada envio.
7. **Enviar:** Product → Archive → Distribute App → App Store Connect.
8. **No App Store Connect:**
   - **Privacidade do app:** os mesmos dados da Play Store; sem rastreamento.
   - **Informações para revisão:** conta de demonstração com acesso pago. Na nota ao revisor, explique: "O acesso é adquirido no site; o app não vende conteúdo (aplicativo de leitura/consulta da conta existente)".
   - **Exportação de criptografia:** já declarada no `Info.plist` (`ITSAppUsesNonExemptEncryption = false`, só HTTPS).
   - **Capturas de tela:** só de iPhone, porque o app é só para iPhone (seção 6).
9. **Revisão:** primeiro pelo **TestFlight**, depois para a loja.

**Para conferir que o projeto compila no macOS sem assinatura:** GitHub Actions → **App iOS** → Run workflow.

## 6. Imagens: dimensões exatas

### 6.1 Imagens do app

Ficam em `apps/mobile/assets/`. Depois de trocá-las, rode `pnpm --filter @fuse/mobile assets`.

| Arquivo | Tamanho | Regras |
|---|---|---|
| `icone.png` | 1024×1024 | Opaco (sem transparência), arte de ponta a ponta, **sem cantos arredondados** (a loja e o sistema arredondam). Usado no iOS e no Android antigo |
| `icone-frente.png` | 1024×1024 | Fundo transparente; a arte dentro do **círculo central de 676 px** (66%). Camada da frente do ícone adaptativo do Android |
| `icone-fundo.png` | 1024×1024 | Opaco; fundo liso ou com textura discreta, sem a marca. Camada de fundo do ícone adaptativo |
| `icone-monocromatico.png` | 1024×1024 | Fundo transparente; a mesma silhueta da frente **toda branca** (#FFFFFF), no mesmo enquadramento. Ícone temático do Android 13+ |
| `notificacao.png` | 96×96 | Fundo transparente; silhueta **100% branca**, sem cores nem degradê, com margem de 4 px. Ícone da barra de status do Android |
| `splash-icone.png` | 1024×1024 | Fundo transparente; a marca dentro do **círculo central de 676 px**. O app compõe sobre o creme `#FAF8F2` |

Hoje essas fontes são **provisórias**, geradas do símbolo da capivara com `assets -- --provisorios`.

### 6.2 Imagens da loja

Não entram no app.

| Loja | Item | Tamanho | Formato |
|---|---|---|---|
| Play Store | Ícone do app | 512×512 | PNG 32 bits, até 1 MB (sem cantos arredondados; o Google arredonda) |
| Play Store | Gráfico de recursos | 1024×500 | PNG 24 bits **sem transparência** ou JPEG |
| Play Store | Capturas de celular | 1080×1920 (9:16), de 4 a 8 imagens | PNG 24 bits sem transparência ou JPEG, até 8 MB cada |
| App Store | Capturas iPhone 6,9" | 1320×2868, de 3 a 10 imagens | PNG ou JPEG, RGB, **sem transparência** |
| App Store | Capturas iPhone 6,5" (opcional) | 1284×2778 | Idem |
| App Store | Ícone | sai do build (`icone.png` 1024×1024) | — |

**As capturas precisam mostrar o app de verdade.** Use as telas de `apps/mobile/loja/telas/` (o app atual, 1170×2532), geradas por `pnpm --filter @fuse/web capturas:loja` com a API simulada (`dev:mock --port 5181` em outro terminal). **Não use `design/png/`**: é o design original, anterior às mudanças do app (vidas, layout da trilha, navegação). Pode emoldurar com fundo da marca e título curto, mas não invente telas nem funções.

**Textos da ficha (sugestão):**
**Não cite banca nem prefeitura pelo nome** ([D27](DECISOES.md)). Em 29/10/2026 a Play recusou o app por "declarações enganosas" porque a descrição citava a FAU e as prefeituras sem link para as fontes oficiais. **Não cite preço nem onde comprar.**

- **Título (até 30 caracteres):** "Fuse Aprova: Estudo Concursos".
- **Descrição curta (até 80):** "Estude para concursos com lições curtas, questões explicadas e simulados."
- **Descrição completa:**

```
O Fuse Aprova é um app de estudos para concursos. Estude um pouco por dia, no seu ritmo, e acompanhe a sua evolução.

O que você encontra no app:
• Trilha de estudo: lições curtas, passo a passo, organizadas por disciplina.
• Questões explicadas: cada resposta vem com a explicação do porquê, para você aprender com os erros.
• Revisão inteligente: as questões que você errou voltam no momento certo para fixar o conteúdo.
• Simulado cronometrado, com nota por disciplina.
• Liga semanal: estude junto com outros alunos e suba de nível.
• Ofensiva e lembrete diário: crie o hábito de estudar todo dia.
• Estudo offline: baixe as próximas lições e estude sem internet.

Como funciona:
Para usar o app, é preciso ter uma conta Fuse Aprova com acesso ativo. O app não tem cadastro nem pagamento: ele serve para quem já tem conta.

Aviso importante:
O Fuse Aprova é um produto privado e independente. O app NÃO representa nenhuma entidade governamental, órgão público ou banca organizadora, e não tem vínculo com eles. As informações oficiais sobre qualquer concurso (edital, inscrições, datas e resultados) são publicadas somente pelo órgão responsável, no site oficial dele e no Diário Oficial. Consulte sempre essas fontes. O app ajuda você a treinar, mas não garante aprovação.

Dúvidas? Fale com o nosso suporte pelo contato informado nesta página.
```

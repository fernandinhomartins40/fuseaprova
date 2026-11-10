# App nativo do aluno (Android e iOS)

Guia do dono para gerar, testar e publicar o app do Fuse Aprova. A Play Store já está no ar; a App Store é publicada pelo GitHub Actions, sem Mac (seção 5). As decisões estão em [DECISOES.md, D20](DECISOES.md).

## 1. Como o app é feito

| Parte | Onde | O que faz |
|---|---|---|
| Telas | `apps/web` (o mesmo React do site) | `pnpm --filter @fuse/web build:app` gera `apps/web/dist-app`: só o painel do aluno |
| Casca nativa | `apps/mobile` (Capacitor 8) | Projetos `android/` e `ios/`, plugins nativos e `capacitor.config.ts` |
| Recursos nativos | `apps/web/src/nativo/` | Splash, botão voltar do Android, lembretes locais personalizados (D30), agenda (.ics), imagens com sessão, exportação de dados |
| Imagens do app | `apps/mobile/assets/` → `pnpm --filter @fuse/mobile assets` | Ícones, notificação e splash nos tamanhos de cada plataforma |

**O que o app tem:**
- entrar, recuperar a senha e o onboarding;
- trilha, lição, revisão, simulado, liga, perfil e configurações;
- estudo offline;
- lembretes personalizados (notificações locais) e "Adicionar à minha agenda";
- baixar os dados e excluir a conta.

**O que o app não tem:** cadastro, pagamento, preço ou link de compra, `/admin` e `/super`. Quem não pagou vê "Seu acesso ainda não está ativo" (D35, sem teste grátis). **A venda continua só no site**, para cumprir as regras das lojas (D20, D32). Nenhum texto do app pode citar Pix, preço nem site de compra.

- **Identificador nas duas lojas:** `br.com.fuseaprova.app`.
- **API:** `https://www.fuseaprova.com.br`. Não mudou nada no servidor.

### 1.1 Lembretes e notificações (D30)

- **Só notificações locais**, agendadas no aparelho. Sem Firebase/FCM, sem APNs remoto e sem push do servidor para o app.
- **De onde vem o conteúdo:** `GET /me/lembretes` devolve o plano dos próximos 7 dias (texto, horário e tela de cada aviso), calculado no servidor a partir do progresso. O app cancela os pendentes e agenda os novos ao abrir, ao voltar ao app, ao concluir uma sessão (o `/me` muda), ao mudar horário ou opt-in em Configurações e quando a permissão é concedida. Sem internet, os já agendados continuam valendo.
- **Toda notificação abre uma tela:** `extra.rota` (lista fechada em `packages/shared/src/lembretes.ts`); rota inválida abre a trilha.
- **Android:** canal `lembrete-diario` (importância alta), ícone `ic_stat_fuse` (`res/drawable-*`), agendamento **inexato** com `allowWhileIdle` (`isExactNotification: false`); o manifesto remove `SCHEDULE_EXACT_ALARM` e `USE_EXACT_ALARM`. `POST_NOTIFICATIONS` (Android 13+) e `RECEIVE_BOOT_COMPLETED` vêm do plugin. O aviso pode chegar alguns minutos depois do horário (o Android agrupa alarmes inexatos para poupar bateria).
- **iOS:** a permissão de notificação é pedida pelo sistema no toque em "Ativar lembrete" (onboarding) ou no interruptor de Configurações. Notificação local não precisa de texto de uso no `Info.plist` nem de capability de Push.
- **Permissão:** nunca é pedida sozinha na abertura do app; antes do pedido a tela explica para que serve. Se a conta tem o lembrete ligado e o aparelho ainda não permitiu, Configurações mostra "Falta permitir as notificações neste aparelho" com o botão **Permitir**.
- **Agenda:** "Adicionar à minha agenda" gera um `.ics` (estudo diário no horário do lembrete, até a véspera da prova, e o dia da prova) e abre o compartilhamento do sistema; "Google Agenda" abre o modelo do Google. Sem permissão de calendário.

## 2. Rodar no computador

Requisitos:
- **Android:** Android Studio com SDK 36 e **JDK 21**.
- **iOS:** um Mac com Xcode 26 só para rodar no simulador local; para a loja, o build é no GitHub Actions (seção 5).

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
4. Depois que a versão é publicada, o app avisa sozinho quem está em versão anterior (D42), a partir da 1.2.2.

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
- Entrar com uma conta sem pagamento: aparece "Seu acesso ainda não está ativo".
- Entrar com uma conta **sem** pagamento e com o teste vencido: aparece "Seu acesso ainda não está ativo", sem preço e sem link de compra.
- Em Configurações, ligar o lembrete: a tela explica e o sistema pede a permissão. Com o horário daqui a 5 minutos, a notificação chega (no Android pode atrasar alguns minutos, porque o alarme é inexato) e o toque abre a tela do aviso (revisão, reforço do tema, trilha…), com o app fechado, em segundo plano ou aberto.
- Desligar o lembrete em Configurações: em "Ajustes › Notificações" do aparelho não sobra nada pendente do Fuse.
- Reiniciar o celular: os lembretes agendados continuam (Android: `RECEIVE_BOOT_COMPLETED` do plugin).
- Conta com lembrete ligado na web, app recém-instalado: Configurações mostra **Permitir**; ao tocar, os lembretes são agendados.
- "Adicionar à minha agenda": abre o compartilhamento com o arquivo `.ics`; escolher a agenda cria o evento diário.
- Baixar meus dados: abre o compartilhamento com o arquivo JSON.
- O botão voltar do Android volta entre telas e, na trilha, minimiza o app.
- Imagens das questões com figura aparecem.

## 5. App Store (sem Mac: build e envio pelo GitHub Actions)

O Xcode só é necessário para **compilar e assinar**; o resto (criar o app, preencher a ficha, TestFlight, enviar para revisão) é no site do App Store Connect. Quem compila é o macOS do GitHub (`macos-26`, Xcode 26, exigido pela Apple desde 28/04/2026), com a assinatura automática pela chave de API: não há certificado `.p12` nem perfil para gerar à mão.

1. **Apple Developer Program** ativo.
2. **App Store Connect → Apps → +  → Novo app:** plataforma iOS; nome **Fuse Aprova**; idioma principal **Português (Brasil)**; ID do pacote **br.com.fuseaprova.app** (se não aparecer na lista, registre em developer.apple.com → Certificates, IDs & Profiles → Identifiers → +, App IDs, "Explicit", sem capabilities extras); SKU `fuseaprova-ios`; acesso total.
3. **Chave de API:** App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → **+**; nome `GitHub Actions`; acesso **Admin** (com papel menor o Xcode não consegue criar o certificado de distribuição na nuvem). Baixe o `AuthKey_XXXX.p8` (só baixa uma vez) e anote o **Key ID** e o **Issuer ID**.
4. **Team ID:** developer.apple.com → Account → Membership details.
5. **Secrets do GitHub** (Settings → Secrets and variables → Actions): `APPSTORE_API_KEY_ID`, `APPSTORE_API_ISSUER_ID`, `APPLE_TEAM_ID` e `APPSTORE_API_KEY_P8` (o texto inteiro do `.p8`, com as linhas BEGIN/END). Pelo terminal: `gh secret set APPSTORE_API_KEY_P8 < AuthKey_XXXX.p8`. Depois guarde o `.p8` num lugar seguro fora do repositório.
6. **GitHub → Actions → App iOS → Run workflow**, com a versão (ex. `1.0.0`). O build é o número da execução e cresce sozinho. Sem os secrets, o workflow só compila para o simulador.
7. Em 10 a 30 minutos o build aparece em **TestFlight**. Teste interno: TestFlight → Internal Testing → adicione o seu Apple ID e instale pelo app TestFlight no iPhone.
8. **Ficha da loja e revisão** (App Store Connect):
   - **Privacidade do app:** lista na seção 7.2; sem rastreamento.
   - **Informações para revisão:** conta de demonstração com acesso pago. Nota ao revisor: "O acesso é adquirido no site; o app não vende conteúdo nem indica onde comprar. Ele só dá acesso à conta já existente (diretriz 3.1.3(f))."
   - **Exportação de criptografia:** já declarada no `Info.plist` (`ITSAppUsesNonExemptEncryption = false`, só HTTPS).
   - **Capturas de tela:** só de iPhone (o app é só para iPhone), em `apps/mobile/loja/appstore/` (6,9" e 6,5").
   - Escolha o build e **Adicionar para revisão**.

Se o envio falhar com erro de certificado ("No signing certificate" / "maximum number of certificates"): developer.apple.com → Certificates, revogue certificados "Apple Development" antigos criados pelo CI e rode de novo.

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

## 7. Lista de verificação de privacidade das lojas

### 7.1 Google Play: Segurança dos dados (Data safety)

- [ ] **Coleta dados?** Sim. **Compartilha com terceiros?** Não (os operadores, como hospedagem e e-mail, processam em nome do Fuse e não contam como compartilhamento).
- [ ] **Dados coletados** (todos obrigatórios para a conta, ligados ao usuário, finalidade "Funcionalidade do app" e "Gerenciamento da conta"):
  - Informações pessoais: nome, endereço de e-mail, número de telefone, outros IDs (CPF);
  - Atividade no app: interações no app (respostas, progresso, XP, ofensiva) e outro conteúdo gerado pelo usuário (relatos de erro, anotações);
  - Informações financeiras: **não** pelo app (o Pix é no site; o app não tem pagamento).
- [ ] **Não coletados:** localização, contatos, agenda/calendário, fotos, arquivos, áudio, saúde, identificador de publicidade, dados do dispositivo para análise.
- [ ] **Notificações:** são locais. O conteúdo é calculado no servidor a partir do progresso (já declarado em "Atividade no app"); nenhum token de push é coletado no app.
- [ ] **Criptografia em trânsito:** sim (HTTPS). **Exclusão de conta:** sim, no app (Configurações › Excluir conta) e pela web.
- [ ] **Permissões do AAB** (conferir no Play Console › Pacote › Permissões): `INTERNET`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`. **Não** pode aparecer `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `READ_CALENDAR`/`WRITE_CALENDAR` nem `AD_ID`. Se aparecer `AD_ID`, declare "não usa ID de publicidade" e remova a permissão.
- [ ] **Declaração de alarme exato:** não se aplica (o app não pede alarme exato).
- [ ] **Política de privacidade** publicada em `https://www.fuseaprova.com.br/privacidade`, com a seção "Lembretes e notificações".

### 7.2 Apple App Store: Privacidade do app (App Privacy)

- [ ] **Rastreamento:** não. O app não usa IDFA nem App Tracking Transparency, e não há SDK de terceiros de análise ou anúncios.
- [ ] **Dados ligados ao usuário, finalidade "Funcionalidade do app":** Informações de contato (nome, e-mail, telefone), Identificadores (ID do usuário), Uso (interações com o produto), Conteúdo do usuário (outros: relatos e anotações). Nenhum é usado para rastreamento.
- [ ] **Não coletados:** localização, contatos, calendário, fotos, saúde, financeiro (o pagamento é fora do app), diagnóstico de terceiros.
- [ ] **`PrivacyInfo.xcprivacy`** no alvo App (`apps/mobile/ios/App/App/PrivacyInfo.xcprivacy`, já no projeto Xcode): `NSPrivacyTracking = false`; dados coletados como acima; Required Reason APIs: data de arquivo (`C617.1`, arquivos do próprio app no cache: `.ics` e exportação LGPD) e UserDefaults (`CA92.1`, preferências do próprio app). Ao adicionar plugin novo, confira se ele traz o próprio manifesto e se usa outra API da lista da Apple.
- [ ] **Info.plist:** nenhum texto de uso é exigido (notificação local, compartilhamento e cache não pedem). Se um dia entrar acesso direto ao calendário, câmera ou fotos, adicione o `NS…UsageDescription` correspondente em português.
- [ ] **Capabilities:** sem Push Notifications e sem Background Modes (notificação local não precisa).
- [ ] **Notificações (diretriz 4.5.4):** não são obrigatórias para usar o app, não têm publicidade e o aluno desliga em Configurações.
- [ ] **Exclusão de conta (diretriz 5.1.1(v)):** em Configurações › Excluir conta.
- [ ] **Nota ao revisor:** explicar que o acesso é adquirido no site e que os lembretes são locais (aparecem no horário escolhido em Configurações; para testar, ponha o horário para daqui a 5 minutos).

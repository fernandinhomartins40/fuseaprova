# CLAUDE.md: Fuse Aprova

Você vai implementar o **Fuse Aprova** inteiro, do zero, neste repositório. Leia este arquivo inteiro antes de começar.

## Documentos de referência (fonte da verdade)
1. `docs/PRD.md`: o que construir, com as regras exatas, o modelo de dados, a API e os critérios de aceite.
2. `docs/DESIGN-SYSTEM.md`: como o app deve parecer.
3. `design/png/*.png`: as 13 telas finais, em 1170×2532 (3× de 390×844).
4. `design/html/*.html`: as mesmas telas em HTML estático. Use-as para copiar medidas, cores, SVGs de ícones e textos. **São referência, não código de produção.** Reescreva tudo em componentes React.
5. `design/tokens.css`, `design/fonts/` e `design/mascote/*.svg`: os assets que vão para o app.
6. `dados/`: o catálogo dos 246 certames FAU (`catalogo_fau.json` e `.csv`) e as listas brutas. Servem para semear `provas_origem` e alimentar o coletor.

Se o PRD e o design divergirem, **o PRD vale para o comportamento e o design vale para a aparência**.

## Regras inegociáveis
- **Sem fases e sem MVP reduzido.** Implemente tudo o que o PRD descreve.
- **Sem acesso gratuito.** Toda rota de conteúdo passa pela guarda `exigirAcesso`, que responde 402 sem pagamento.
- **R$ 397 só no Pix via Asaas**, que é o único serviço externo.
- **Nada de Supabase, Firebase, Vercel, Clerk, Auth0, Sentry SaaS, Google Analytics, Google Fonts ou CDN.** Tudo roda na VPS com Docker Compose. As fontes e os ícones ficam no próprio bundle.
- **Não copie a identidade do Duolingo** (coruja, nome, sons, ilustrações). Use a Capi e os tokens do kit.
- **Português do Brasil** em toda a interface, nas mensagens de erro e nos e-mails.
- **Fuso America/Sao_Paulo** em toda regra de "dia" e "semana".
- **O servidor é a fonte da verdade** de acesso, XP, vidas, gemas, ofensiva, revisão e liga. O cliente só exibe.
- **O coletor não contorna captcha nem login** e respeita o rate limit e o robots.txt.

## Estrutura esperada
```
.
├─ apps/
│  ├─ web/        React + Vite + PWA (aluno e /admin)
│  ├─ api/        Fastify
│  └─ worker/     jobs agendados
├─ packages/
│  ├─ db/         Drizzle: schema, migrações, seed
│  ├─ shared/     Zod, regras de jogo puras e testadas
│  └─ crawler/    coletor FAU e PCI e importador de PDF
├─ infra/
│  ├─ docker-compose.yml
│  ├─ Caddyfile
│  └─ backup/     scripts de pg_dump e restore
├─ docs/  design/  dados/   (deste kit)
├─ .env.example
├─ turbo.json  pnpm-workspace.yaml  tsconfig.base.json
└─ CLAUDE.md
```

## Ordem de implementação
Esta é uma sequência de trabalho. O produto só é entregue com tudo pronto.

1. Monta o esqueleto do monorepo: Turborepo, pnpm, TypeScript estrito, ESLint, Prettier e Vitest.
2. Escreve `packages/shared`, com as regras puras de XP, vidas, gemas, ofensiva, revisão espaçada, liga, nota do simulado, CPF e datas em São Paulo. Os testes cobrem 100% das linhas antes de seguir.
3. Cria `packages/db`, com o schema completo da seção 9 do PRD, as migrações e um seed com:
   - o concurso de Palmital;
   - as disciplinas;
   - os certames de `dados/catalogo_fau.json` em `provas_origem`;
   - pelo menos 2 unidades completas (Português e uma de específico administrativo) com questões **autorais de exemplo marcadas `rascunho`**, para desenvolvimento.
4. Implementa `apps/api`: autenticação, guardas, pagamento Asaas com webhook e status, conteúdo, sessões de estudo, revisão, simulado, liga, perfil, sync offline, push, LGPD e admin.
5. Implementa `apps/worker`, com todos os jobs da seção 8.7.
6. Implementa `apps/web`:
   - os componentes do Design System, isolados em `src/ui/`: Botão3D, Alternativa, FolhaFeedback, BarraProgresso, NoTrilha, BannerUnidade, NavInferior, Chip, Campo, CartaoEstatistica e Capi;
   - as 13 telas desenhadas;
   - as telas ✏️ do PRD;
   - a PWA e o modo offline;
   - o painel admin.
7. Implementa `packages/crawler`, com todos os comandos e o importador de PDF para `rascunho`.
8. Cria a infra: docker-compose, Caddyfile, backup e restore, e um `docs/DEPLOY.md` com o passo a passo na VPS (Ubuntu 24.04).
9. Testes fim a fim com Playwright:
   - cadastro e Pix no sandbox, com o webhook simulado;
   - uma lição completa;
   - revisão;
   - simulado;
   - comparação visual das 13 telas com `design/png`.
10. Percorre a lista de critérios de aceite do PRD (seção 12) e marca cada item com a evidência (teste ou comando).

## Convenções
- O código fica em inglês **ou** português, desde que seja consistente. Prefira português para o domínio (`questao`, `licao`, `ofensiva`), como no PRD.
- Toda entrada da API é validada com Zod a partir de `packages/shared`, e o mesmo schema é usado no front.
- Erros da API seguem o formato `{ erro: string, codigo?: string }`, com mensagem pronta para o usuário.
- Commits pequenos, no estilo `feat(api): webhook Asaas idempotente`.
- Nunca grave segredo no repositório. Tudo vai para o `.env`, e o `.env.example` fica documentado.

## Variáveis de ambiente (mínimo)
```
DATABASE_URL=postgres://fuse:***@postgres:5432/fuse
APP_URL=https://app.seudominio.com.br
SESSION_SECRET=
ASAAS_API_KEY=
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=
PRICE_CENTS=39700
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= SMTP_FROM=
VAPID_PUBLIC_KEY= VAPID_PRIVATE_KEY= VAPID_SUBJECT=mailto:
ARQUIVOS_DIR=/srv/fuse/arquivos
TZ=America/Sao_Paulo
```

## Quando houver dúvida
- **Comportamento:** siga o PRD. Se o PRD não cobrir, escolha a opção mais simples que respeite as regras inegociáveis e registre a decisão em `docs/DECISOES.md`.
- **Visual:** copie o padrão da tela desenhada mais parecida.
- **Asaas:** confira em https://docs.asaas.com antes de codar, porque endpoints e campos podem ter mudado.
- **Questões de exemplo no seed:** são autorais e ficam marcadas `rascunho`. **Nunca invente uma questão e atribua a uma prova real da FAU.**

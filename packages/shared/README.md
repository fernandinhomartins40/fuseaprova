# @fuse/shared

Regras puras do Fuse Aprova (sem I/O) e os contratos Zod da API. Usado pela API, pelo worker, pelo coletor e pela PWA. Cobertura de linhas: 100% (`pnpm --filter @fuse/shared test --coverage`).

```ts
import { xpDaSessao, perderVida, registrarDiaDeEstudo } from '@fuse/shared';
import { ROTAS, CadastroEntrada, erroApi, type MeResposta } from '@fuse/shared/api';
```

## Módulos (`@fuse/shared`)

| Módulo | O que tem |
|---|---|
| `dominio` | Enums do domínio (`STATUS_QUESTAO`, `AREAS_CARGO`, `DIVISOES`…) e nomes para a interface. O schema do banco importa daqui. |
| `datas` | Datas em America/Sao_Paulo só com Intl: `diaSP`, `inicioDoDiaSP`, `meiaNoiteSP`, `semanaSP` (segunda-feira), `fimSemanaSP`, `somarDias`, `diferencaDias`, `formatarDataBR`. |
| `xp` | PRD 6.1: `xpDaSessao` (4/5 = 45, 5/5 = 65), `xpDoSimulado`, `xpDaResposta`, `calcularCombo`. |
| `vidas` | PRD 6.2: `normalizarVidas` (recarga de 4 h e reset à meia-noite), `perderVida`, `ganharVida`, `vidasAposResposta`. |
| `gemas` | PRD 6.3: `GEMAS`, `gastarDica`, `comprarProtetor`, `gemasPorOfensiva`. |
| `ofensiva` | PRD 6.4: `diaContaParaOfensiva`, `verificarOfensiva` (job 00:05, protetores), `registrarDiaDeEstudo` (marcos 7/30/100). |
| `revisao` | PRD 6.5: `revisaoAposErro`, `revisaoAposAcerto` (1/3/7/15 dias), `aplicarRespostaNaRevisao`, `filtrarPendentes`. |
| `dominio-estudo` | PRD 6.6: `dominioDoAssunto` (últimas 30, mínimo 5), `dominioDaDisciplina`, `formatarDominio`. |
| `liga` | PRD 6.7: `ordenarRanking` (empate por `alcancadoEm`), `fecharGrupo` (3 sobem/3 descem, ≤10 sem rebaixamento), `zonasDoGrupo`, `escolherGrupo`, `nomeNaLiga`. |
| `conquistas` | PRD 6.8: `CONQUISTAS`, `novasConquistas`. |
| `simulado` | PRD 1.2: `calcularNota` (2,0/2,8, ≥50%), `montarSimulado` (5/5/5/25 ou edital), `terminoDoSimulado`. |
| `licao` | `montarLicao` (novas + 1 revisão vencida), `sortearNovas`, `montarDesafio`, `montarRevisao`, `estadoDaTrilha`, `intercalarSecoes`. |
| `cpf`, `celular`, `validacao` | Validação, máscara e ocultação (`***.456.789-**`); pendências para publicar questão; prazo de arrependimento. |
| `copy`, `formatacao` | Textos do PRD 11 (aviso do edital, rodapé legal, títulos de acerto/erro, sem vidas), reais, durações, iniciais, cor do avatar. |
| `cifra` | Gabarito cifrado do pacote offline (AES-GCM via Web Crypto). |
| `aleatorio` | `criarRng(semente)`, `embaralhar`, `escolher` (sorteios reproduzíveis nos testes). |

## Contratos da API (`@fuse/shared/api`)

Todo endpoint está em `ROTAS` (`src/api/rotas.ts`) com `metodo`, `caminho` (sem o prefixo `/api`), `guarda` (`nenhuma`, `login`, `acesso`, `admin`, `webhook`), `params`, `query`, `corpo`, `resposta` e `limite`. Tipos: `RespostaDe<'trilha'>`, `CorpoDe<'authCadastro'>`, `QueryDe<'adminQuestoesListar'>`. Erros: `{ erro, codigo?, campos? }` (`ErroApi`, `erroApi`, `erroDeValidacao`, `CODIGOS_ERRO`).

| Grupo | Rotas |
|---|---|
| Auth | `POST /auth/cadastro` · `/auth/login` · `/auth/sair` · `/auth/recuperar` · `/auth/redefinir` |
| Me | `GET /me` · `PATCH /me` · `POST /me/senha` · `GET /me/exportar` · `DELETE /me` · `POST /me/protetores` |
| Pagamento | `POST /pagamento/pix` · `GET /pagamento/status` · `POST /webhooks/asaas` |
| Conteúdo | `GET /concurso` · `GET /trilha` · `GET /guia/:unidadeId` |
| Estudo | `POST /licoes/:id/iniciar` · `POST /licoes/:id/abrir-bau` · `POST /sessoes/:id/responder` · `/dica` · `/concluir` · `GET /revisao` · `POST /revisao/iniciar` · `POST /questoes/:id/report` |
| Offline | `GET /offline/pacote` · `POST /sync/tentativas` |
| Simulado | `POST /simulados` · `GET /simulados` · `GET /simulados/:id` · `PUT /simulados/:id/resposta` · `POST /simulados/:id/entregar` |
| Liga, perfil, push | `GET /liga` · `POST /liga/resultado/visto` · `GET /perfil/estatisticas` · `GET /push/chave` · `POST /push/inscrever` · `DELETE /push` |
| Admin | `/admin/painel` · `concursos` · `cargos` · `provas` · `questoes` (filtros, `lote`, `retirar-origem`, `previa`) · `uploads` · `disciplinas` · `assuntos` · `trilhas` (+ `ordem`) · `unidades` · `secoes` · `licoes` · `edital` (+ `publicar`) · `importacoes` · `pedidos/:id/reembolso` · `reports` · `usuarios` (+ `revogar-sessoes`, `liberar-acesso`, `revogar-acesso`) · `auditoria` |

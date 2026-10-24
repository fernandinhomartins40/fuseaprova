/**
 * API de teste do E2E: a API real (`criarApp`) sobre um banco PGlite NOVO em memória
 * (migrações + seed com as autorais publicadas, SEED_DEV_PUBLICAR), Asaas falso (sem rede),
 * e-mail em memória, relógio controlável e sorteio com semente.
 *
 *   pnpm --filter @fuse/e2e servidor      (o Playwright sobe sozinho; veja playwright.config.ts)
 *
 * Rotas de controle só deste servidor, fora de /api (o proxy do Vite não as expõe):
 *   GET  /__e2e/agora                         → { agora }
 *   POST /__e2e/relogio { definir?, avancarMs? }
 *   POST /__e2e/semente { semente }           → reinicia o sorteio (rng)
 *   GET  /__e2e/pagamento?email=              → { pedidoId, paymentId } do último pedido
 *   GET  /__e2e/gabarito?enunciado=           → { id, gabarito } da questão com esse enunciado
 *   POST /__e2e/admin { email, senha, nome }  → cria um admin (como a CLI admin:criar)
 *   GET  /__e2e/emails                        → assuntos e destinatários enviados
 *   POST /__e2e/vidas { email, vidas }         → ajusta as vidas (cenário "sem vidas")
 * O pagamento é confirmado pelo webhook REAL (POST /api/webhooks/asaas) com o token de teste.
 */
import { desc, eq } from 'drizzle-orm';
import {
  configTeste,
  criarApp,
  criarAsaasFalso,
  criarMailerMemoria,
  gerarHashSenha,
} from '@fuse/api';
import { schema } from '@fuse/db';
import { criarBancoTeste } from '@fuse/db/teste';
import { criarRng } from '@fuse/shared';

process.env.TZ = 'America/Sao_Paulo';

const PORTA = Number(process.env.E2E_API_PORTA ?? 3100);
const INICIO = process.env.E2E_INICIO ?? '2026-10-20T09:00:00-03:00';
export const TOKEN_WEBHOOK_E2E = 'token-webhook-e2e';

/** Relógio que anda junto com o tempo real a partir de um instante definido pelo teste. */
let base = new Date(INICIO).getTime();
let referenciaReal = Date.now();
const relogio = {
  agora: () => new Date(base + (Date.now() - referenciaReal)),
  definir(d: Date | string) {
    base = new Date(d).getTime();
    referenciaReal = Date.now();
  },
  avancar(ms: number) {
    base += ms;
  },
};

const banco = await criarBancoTeste({ seed: { publicarAutorais: true } });
const asaas = criarAsaasFalso({ relogio: relogio.agora });
const mailer = criarMailerMemoria();
const config = configTeste({
  appUrl: process.env.E2E_APP_URL ?? 'http://localhost:4173',
  cookieSeguro: false,
  asaas: {
    apiKey: 'chave-e2e',
    baseUrl: 'http://asaas.invalido/v3',
    webhookToken: TOKEN_WEBHOOK_E2E,
  },
});
const app = await criarApp({
  db: banco.db,
  config,
  asaas,
  mailer,
  relogio,
  rng: criarRng('e2e'),
  rateLimit: false,
  logger: { level: process.env.E2E_LOG ?? 'warn' },
});

const db = banco.db;

app.get('/__e2e/agora', async () => ({ agora: relogio.agora().toISOString() }));

app.post<{ Body: { definir?: string; avancarMs?: number } }>('/__e2e/relogio', async (req) => {
  const b = req.body ?? {};
  if (b.definir) relogio.definir(b.definir);
  if (b.avancarMs) relogio.avancar(b.avancarMs);
  return { agora: relogio.agora().toISOString() };
});

app.post<{ Body: { semente: string } }>('/__e2e/semente', async (req) => {
  app.deps.rng = criarRng(req.body?.semente ?? 'e2e');
  return { ok: true };
});

app.get<{ Querystring: { email: string } }>('/__e2e/pagamento', async (req, reply) => {
  const [u] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.email, req.query.email));
  if (!u) return reply.status(404).send({ erro: 'usuário não encontrado' });
  const [p] = await db
    .select()
    .from(schema.pedidos)
    .where(eq(schema.pedidos.usuarioId, u.id))
    .orderBy(desc(schema.pedidos.criadoEm))
    .limit(1);
  if (!p) return reply.status(404).send({ erro: 'pedido não encontrado' });
  return { pedidoId: p.id, paymentId: p.asaasPaymentId, status: p.status };
});

app.get<{ Querystring: { enunciado: string } }>('/__e2e/gabarito', async (req, reply) => {
  const qs = await db
    .select({
      id: schema.questoes.id,
      gabarito: schema.questoes.gabarito,
      explicacao: schema.questoes.explicacao,
    })
    .from(schema.questoes)
    .where(eq(schema.questoes.enunciado, req.query.enunciado));
  if (qs.length !== 1) return reply.status(404).send({ erro: `encontradas ${qs.length} questões` });
  return qs[0];
});

app.post<{ Body: { email: string; senha: string; nome: string } }>('/__e2e/admin', async (req) => {
  const { email, senha, nome } = req.body;
  await db
    .insert(schema.usuarios)
    .values({ nome, email, senhaHash: await gerarHashSenha(senha), papel: 'admin', acesso: true })
    .onConflictDoNothing();
  return { ok: true };
});

app.post<{ Body: { email: string; vidas: number } }>('/__e2e/vidas', async (req) => {
  await db
    .update(schema.usuarios)
    .set({ vidas: req.body.vidas, vidasAtualizadoEm: relogio.agora() })
    .where(eq(schema.usuarios.email, req.body.email));
  return { ok: true };
});

app.get('/__e2e/emails', async () =>
  mailer.enviados.map((m) => ({ para: m.para, assunto: m.assunto })),
);

const encerrar = async () => {
  await app.close();
  await banco.fechar();
  process.exit(0);
};
process.on('SIGTERM', () => void encerrar());
process.on('SIGINT', () => void encerrar());

await app.listen({ host: '127.0.0.1', port: PORTA });
console.info(`API E2E em http://127.0.0.1:${PORTA} (relógio: ${relogio.agora().toISOString()})`);

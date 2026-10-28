-- Lote 2 da auditoria do painel (S-09, S-16, S-17, S-22). Só aditiva.
-- pg_trgm (contrib, extensão confiável no Postgres 16) para as buscas ilike '%…%' do /super.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TYPE "public"."status_comunicacao" ADD VALUE 'pausada';--> statement-breakpoint
CREATE TABLE "erros_api" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rota" text NOT NULL,
	"metodo" text NOT NULL,
	"status" smallint NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estado_sistema" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "limites_contagem" (
	"chave" text PRIMARY KEY NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	"janela_fim" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comunicacoes" ADD COLUMN "chave_idempotencia" uuid;--> statement-breakpoint
ALTER TABLE "comunicacoes" ADD COLUMN "pausada_motivo" text;--> statement-breakpoint
ALTER TABLE "comunicacoes" ADD COLUMN "pausada_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comunicacoes_envios" ADD COLUMN "tentativas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comunicacoes_envios" ADD COLUMN "proxima_tentativa_em" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "erros_api_criado_idx" ON "erros_api" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "limites_contagem_fim_idx" ON "limites_contagem" USING btree ("janela_fim");--> statement-breakpoint
CREATE INDEX "auditoria_alvo_trgm_idx" ON "auditoria" USING gin ("alvo" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "pedidos_estornado_em_idx" ON "pedidos" USING btree ("estornado_em");--> statement-breakpoint
CREATE INDEX "tentativas_respondida_usuario_idx" ON "tentativas" USING btree ("respondida_em","usuario_id");--> statement-breakpoint
CREATE INDEX "tentativas_usuario_respondida_idx" ON "tentativas" USING btree ("usuario_id","respondida_em" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "usuarios_criado_idx" ON "usuarios" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "usuarios_nome_trgm_idx" ON "usuarios" USING gin ("nome" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "usuarios_email_trgm_idx" ON "usuarios" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "webhook_eventos_payment_idx" ON "webhook_eventos" USING btree (("corpo" -> 'payment' ->> 'id'));--> statement-breakpoint
ALTER TABLE "comunicacoes" ADD CONSTRAINT "comunicacoes_chave_idempotencia_unique" UNIQUE("chave_idempotencia");
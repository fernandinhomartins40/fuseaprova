CREATE TYPE "public"."canal_comunicacao" AS ENUM('email', 'push');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento_manual" AS ENUM('transferencia', 'dinheiro', 'pix_direto', 'outro');--> statement-breakpoint
CREATE TYPE "public"."metodo_pedido" AS ENUM('asaas', 'manual');--> statement-breakpoint
CREATE TYPE "public"."segmento_comunicacao" AS ENUM('todos', 'pagos', 'inativos', 'sem_pagamento');--> statement-breakpoint
CREATE TYPE "public"."status_comunicacao" AS ENUM('na_fila', 'enviando', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."status_envio_comunicacao" AS ENUM('pendente', 'enviado', 'falhou', 'ignorado');--> statement-breakpoint
ALTER TYPE "public"."papel" ADD VALUE 'superadmin';--> statement-breakpoint
CREATE TABLE "codigos_recuperacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comunicacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canal" "canal_comunicacao" NOT NULL,
	"segmento" "segmento_comunicacao" NOT NULL,
	"dias_inativo" integer,
	"assunto" text NOT NULL,
	"mensagem" text NOT NULL,
	"link" text,
	"status" "status_comunicacao" DEFAULT 'na_fila' NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"iniciado_em" timestamp with time zone,
	"concluido_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comunicacoes_envios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comunicacao_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"status" "status_envio_comunicacao" DEFAULT 'pendente' NOT NULL,
	"enviado_em" timestamp with time zone,
	"erro" text,
	CONSTRAINT "comunicacoes_envios_unico" UNIQUE("comunicacao_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "jobs_execucoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"iniciado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"terminado_em" timestamp with time zone,
	"ok" boolean,
	"resultado" jsonb,
	"erro" text
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD COLUMN "ip" text;--> statement-breakpoint
ALTER TABLE "auditoria" ADD COLUMN "motivo" text;--> statement-breakpoint
ALTER TABLE "auditoria" ADD COLUMN "antes" jsonb;--> statement-breakpoint
ALTER TABLE "auditoria" ADD COLUMN "depois" jsonb;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "metodo" "metodo_pedido" DEFAULT 'asaas' NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "valor_liquido_centavos" integer;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "cancelado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "conciliado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "manual_forma" "forma_pagamento_manual";--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "manual_recebido_em" date;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "manual_observacao" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "manual_referencia" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "manual_comprovante" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "aprovado_por" uuid;--> statement-breakpoint
ALTER TABLE "sessoes" ADD COLUMN "dois_fatores_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "marketing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "bloqueado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "bloqueio_motivo" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "totp_segredo" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "totp_ativado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "totp_ultimo_passo" integer;--> statement-breakpoint
ALTER TABLE "webhook_eventos" ADD COLUMN "tentativas" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_eventos" ADD COLUMN "resultado" text;--> statement-breakpoint
ALTER TABLE "webhook_eventos" ADD COLUMN "ultima_tentativa_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "codigos_recuperacao" ADD CONSTRAINT "codigos_recuperacao_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comunicacoes" ADD CONSTRAINT "comunicacoes_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comunicacoes_envios" ADD CONSTRAINT "comunicacoes_envios_comunicacao_id_comunicacoes_id_fk" FOREIGN KEY ("comunicacao_id") REFERENCES "public"."comunicacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comunicacoes_envios" ADD CONSTRAINT "comunicacoes_envios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_atualizado_por_usuarios_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigos_recuperacao_usuario_idx" ON "codigos_recuperacao" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "comunicacoes_status_idx" ON "comunicacoes" USING btree ("status","criado_em");--> statement-breakpoint
CREATE INDEX "comunicacoes_envios_status_idx" ON "comunicacoes_envios" USING btree ("comunicacao_id","status");--> statement-breakpoint
CREATE INDEX "comunicacoes_envios_usuario_idx" ON "comunicacoes_envios" USING btree ("usuario_id","enviado_em");--> statement-breakpoint
CREATE INDEX "jobs_execucoes_job_idx" ON "jobs_execucoes" USING btree ("job","iniciado_em");--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_aprovado_por_usuarios_id_fk" FOREIGN KEY ("aprovado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_alvo_idx" ON "auditoria" USING btree ("alvo");--> statement-breakpoint
CREATE INDEX "pedidos_criado_em_idx" ON "pedidos" USING btree ("criado_em");
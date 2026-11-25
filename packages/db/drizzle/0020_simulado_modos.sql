ALTER TABLE "simulados" ADD COLUMN "modo" text DEFAULT 'prova' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulados" ADD COLUMN "situacao" text;--> statement-breakpoint
ALTER TABLE "simulados" ADD COLUMN "recompensa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "simulados" ADD COLUMN "ms_usados" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulados" ADD COLUMN "ultimo_sinal_em" timestamp with time zone;--> statement-breakpoint
-- Simulados já fechados continuam como estavam: corrigidos e com a recompensa que já receberam (D48).
UPDATE "simulados" SET "situacao" = 'corrigido', "recompensa" = true WHERE "entregue_em" IS NOT NULL;

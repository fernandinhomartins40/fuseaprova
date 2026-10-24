CREATE TYPE "public"."situacao_certame" AS ENUM('aberto', 'andamento', 'encerrado');--> statement-breakpoint
ALTER TABLE "questoes" ALTER COLUMN "gabarito" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "importacoes" ADD COLUMN "arquivo_preliminar" text;--> statement-breakpoint
ALTER TABLE "importacoes" ADD COLUMN "cargo" text;--> statement-breakpoint
ALTER TABLE "provas_origem" ADD COLUMN "situacao_certame" "situacao_certame";--> statement-breakpoint
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_gabarito_ck" CHECK ("questoes"."gabarito" is not null or "questoes"."status" = 'anulada');
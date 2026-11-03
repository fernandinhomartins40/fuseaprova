CREATE TYPE "public"."produto_pedido" AS ENUM('concurso', 'apostilas');--> statement-breakpoint
CREATE TABLE "apostilas_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"volume" smallint NOT NULL,
	"ip" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "produto" "produto_pedido" DEFAULT 'concurso' NOT NULL;--> statement-breakpoint
ALTER TABLE "apostilas_downloads" ADD CONSTRAINT "apostilas_downloads_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apostilas_downloads_usuario_idx" ON "apostilas_downloads" USING btree ("usuario_id","criado_em");
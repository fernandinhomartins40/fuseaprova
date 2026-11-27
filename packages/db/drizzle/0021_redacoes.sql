CREATE TABLE "redacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tema_id" text NOT NULL,
	"texto" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"linhas" integer DEFAULT 0 NOT NULL,
	"nota" integer,
	"correcao" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"corrigido_em" timestamp with time zone,
	CONSTRAINT "redacoes_texto_ck" CHECK (char_length("redacoes"."texto") <= 4000)
);
--> statement-breakpoint
ALTER TABLE "redacoes" ADD CONSTRAINT "redacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "redacoes_usuario_atualizado_idx" ON "redacoes" USING btree ("usuario_id","atualizado_em");--> statement-breakpoint
CREATE INDEX "redacoes_usuario_corrigido_idx" ON "redacoes" USING btree ("usuario_id","corrigido_em");
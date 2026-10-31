CREATE TABLE "anotacoes" (
	"usuario_id" uuid NOT NULL,
	"concurso_id" uuid NOT NULL,
	"questao_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anotacoes_usuario_id_concurso_id_questao_id_pk" PRIMARY KEY("usuario_id","concurso_id","questao_id"),
	CONSTRAINT "anotacoes_texto_ck" CHECK (char_length("anotacoes"."texto") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "questoes" ADD COLUMN "aula" jsonb;--> statement-breakpoint
ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_concurso_id_concursos_id_fk" FOREIGN KEY ("concurso_id") REFERENCES "public"."concursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_questao_id_questoes_id_fk" FOREIGN KEY ("questao_id") REFERENCES "public"."questoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anotacoes_usuario_concurso_atualizado_idx" ON "anotacoes" USING btree ("usuario_id","concurso_id","atualizado_em");
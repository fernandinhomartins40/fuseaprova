CREATE TABLE "redacao_aulas" (
	"usuario_id" uuid NOT NULL,
	"aula_id" text NOT NULL,
	"perfeita" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redacao_aulas_usuario_id_aula_id_pk" PRIMARY KEY("usuario_id","aula_id")
);
--> statement-breakpoint
ALTER TABLE "redacao_aulas" ADD CONSTRAINT "redacao_aulas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
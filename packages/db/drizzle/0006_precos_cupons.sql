CREATE TYPE "public"."tipo_cupom" AS ENUM('percentual', 'fixo');--> statement-breakpoint
CREATE TABLE "cupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"tipo" "tipo_cupom" NOT NULL,
	"valor" integer NOT NULL,
	"valido_ate" timestamp with time zone,
	"limite_usos" integer,
	"concurso_id" uuid,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cupons_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "cupom_id" uuid;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "valor_original_centavos" integer;--> statement-breakpoint
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_concurso_id_concursos_id_fk" FOREIGN KEY ("concurso_id") REFERENCES "public"."concursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cupom_id_cupons_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."cupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pedidos_cupom_idx" ON "pedidos" USING btree ("cupom_id");
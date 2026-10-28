CREATE TABLE "registros_acesso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"evento" text NOT NULL,
	"ip" text NOT NULL,
	"porta" integer,
	"user_agent" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registros_acesso" ADD CONSTRAINT "registros_acesso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registros_acesso_criado_idx" ON "registros_acesso" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "registros_acesso_usuario_idx" ON "registros_acesso" USING btree ("usuario_id","criado_em");
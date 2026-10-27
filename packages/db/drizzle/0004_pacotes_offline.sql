CREATE TABLE "pacotes_offline" (
	"id" uuid PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"gerado_em" timestamp with time zone NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pacotes_offline" ADD CONSTRAINT "pacotes_offline_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pacotes_offline_usuario_idx" ON "pacotes_offline" USING btree ("usuario_id");
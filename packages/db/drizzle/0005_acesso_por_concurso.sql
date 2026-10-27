CREATE TABLE "usuarios_concursos" (
	"usuario_id" uuid NOT NULL,
	"concurso_id" uuid NOT NULL,
	"cargo_id" uuid,
	"area" "area_cargo",
	"acesso" boolean DEFAULT false NOT NULL,
	"acesso_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_concursos_usuario_id_concurso_id_pk" PRIMARY KEY("usuario_id","concurso_id")
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "concurso_id" uuid;--> statement-breakpoint
ALTER TABLE "usuarios_concursos" ADD CONSTRAINT "usuarios_concursos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_concursos" ADD CONSTRAINT "usuarios_concursos_concurso_id_concursos_id_fk" FOREIGN KEY ("concurso_id") REFERENCES "public"."concursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_concursos" ADD CONSTRAINT "usuarios_concursos_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usuarios_concursos_concurso_idx" ON "usuarios_concursos" USING btree ("concurso_id");--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_concurso_id_concursos_id_fk" FOREIGN KEY ("concurso_id") REFERENCES "public"."concursos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- D21: o acesso passa a ser por concurso. Nada muda para quem já é aluno: quem tinha acesso fica
-- com o concurso que já usava (ou o mais antigo, se nunca escolheu) liberado, e todo pedido
-- antigo passa a ser desse concurso.
UPDATE "usuarios" SET "concurso_id" = (SELECT "id" FROM "concursos" ORDER BY "criado_em" LIMIT 1)
  WHERE "concurso_id" IS NULL AND "acesso" = true;
--> statement-breakpoint
INSERT INTO "usuarios_concursos" ("usuario_id", "concurso_id", "cargo_id", "area", "acesso", "acesso_em")
SELECT "id", "concurso_id", "cargo_id", "area", "acesso", CASE WHEN "acesso" THEN now() END
  FROM "usuarios" WHERE "concurso_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "pedidos" p SET "concurso_id" = COALESCE(
  (SELECT u."concurso_id" FROM "usuarios" u WHERE u."id" = p."usuario_id"),
  (SELECT "id" FROM "concursos" ORDER BY "criado_em" LIMIT 1)
) WHERE p."concurso_id" IS NULL;

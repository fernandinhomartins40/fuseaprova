CREATE TABLE "testes_usados" (
	"hash" text PRIMARY KEY NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concursos" ADD COLUMN "homologado_em" date;--> statement-breakpoint
-- D33: a validade é conferida por concurso, então todo aluno com acesso precisa de uma linha
-- liberada. Quem só tinha o acesso geral entra com a data desta migração, sem perder nada.
INSERT INTO "usuarios_concursos" ("usuario_id", "concurso_id", "cargo_id", "area", "acesso", "acesso_em")
SELECT u."id", u."concurso_id", u."cargo_id", u."area", true, now()
  FROM "usuarios" u
  WHERE u."papel" = 'aluno' AND u."acesso" = true AND u."concurso_id" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "usuarios_concursos" uc WHERE uc."usuario_id" = u."id" AND uc."acesso" = true)
ON CONFLICT ("usuario_id", "concurso_id") DO UPDATE SET "acesso" = true, "acesso_em" = now();

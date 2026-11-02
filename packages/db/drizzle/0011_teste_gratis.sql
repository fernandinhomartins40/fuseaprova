ALTER TABLE "usuarios" ADD COLUMN "teste_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "teste_pendente" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "teste_aviso_vespera_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "teste_aviso_fim_em" timestamp with time zone;--> statement-breakpoint
-- D32: quem se cadastrou e nunca pagou ganha os 3 dias, contados da próxima visita. Fica de fora
-- quem já pagou, inclusive quem foi estornado: o teste não pode reabrir um acesso devolvido.
UPDATE "usuarios" u SET "teste_pendente" = true
  WHERE u."papel" = 'aluno' AND u."acesso" = false AND u."excluido_em" IS NULL AND u."bloqueado_em" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "pedidos" p WHERE p."usuario_id" = u."id" AND p."status" IN ('pago', 'estornado'));

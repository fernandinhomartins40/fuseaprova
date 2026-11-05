-- D39: o teste de 24 h passa a valer de novo, mas só quando o superadmin libera. Os prazos do
-- teste de 3 dias antigo (D32, retirado em D35) não podem voltar a liberar o estudo.
UPDATE "usuarios" SET "teste_ate" = NULL, "teste_pendente" = false WHERE "acesso" = false AND ("teste_ate" IS NOT NULL OR "teste_pendente" = true);

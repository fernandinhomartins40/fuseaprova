-- D41: versões mais leves das duas primeiras videoaulas (720×1280, 24 fps, CRF 30). Slug novo para nenhum cache ficar com o arquivo antigo.
UPDATE "questoes" SET "videoaula" = 'proparoxitonas-v2' WHERE "videoaula" = 'proparoxitonas';--> statement-breakpoint
UPDATE "questoes" SET "videoaula" = 'aumento-e-desconto-v2' WHERE "videoaula" = 'aumento-e-desconto';

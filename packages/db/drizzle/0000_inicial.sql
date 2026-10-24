CREATE TYPE "public"."area_cargo" AS ENUM('administrativo', 'saude_medio', 'saude_superior', 'educacao', 'operacional', 'servicos_gerais', 'social_juridico');--> statement-breakpoint
CREATE TYPE "public"."divisao" AS ENUM('bronze', 'prata', 'ouro', 'safira', 'diamante');--> statement-breakpoint
CREATE TYPE "public"."escolaridade" AS ENUM('fundamental', 'medio', 'tecnico', 'superior');--> statement-breakpoint
CREATE TYPE "public"."fonte_coleta" AS ENUM('fau', 'pci', 'manual');--> statement-breakpoint
CREATE TYPE "public"."letra" AS ENUM('A', 'B', 'C', 'D', 'E');--> statement-breakpoint
CREATE TYPE "public"."origem_questao" AS ENUM('fau_real', 'autoral');--> statement-breakpoint
CREATE TYPE "public"."papel" AS ENUM('aluno', 'admin');--> statement-breakpoint
CREATE TYPE "public"."resultado_liga" AS ENUM('subiu', 'ficou', 'desceu');--> statement-breakpoint
CREATE TYPE "public"."slug_disciplina" AS ENUM('portugues', 'matematica', 'gerais', 'especificos');--> statement-breakpoint
CREATE TYPE "public"."status_concurso" AS ENUM('aguardando_edital', 'edital_publicado', 'prova_realizada', 'homologado');--> statement-breakpoint
CREATE TYPE "public"."status_importacao" AS ENUM('baixado', 'extraido', 'confrontado', 'concluido', 'erro');--> statement-breakpoint
CREATE TYPE "public"."status_pedido" AS ENUM('pendente', 'pago', 'vencido', 'estornado');--> statement-breakpoint
CREATE TYPE "public"."status_prova_origem" AS ENUM('ativa', 'retirada');--> statement-breakpoint
CREATE TYPE "public"."status_questao" AS ENUM('rascunho', 'revisao', 'publicada', 'anulada', 'retirada');--> statement-breakpoint
CREATE TYPE "public"."status_report" AS ENUM('aberto', 'resolvido', 'descartado');--> statement-breakpoint
CREATE TYPE "public"."status_revisao" AS ENUM('ativa', 'dominada');--> statement-breakpoint
CREATE TYPE "public"."tipo_arquivo_coleta" AS ENUM('edital', 'caderno', 'gabarito', 'recursos', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_licao" AS ENUM('normal', 'bau', 'desafio');--> statement-breakpoint
CREATE TYPE "public"."tipo_report" AS ENUM('gabarito_errado', 'enunciado_com_erro', 'explicacao_confusa', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_sessao_estudo" AS ENUM('licao', 'revisao', 'desafio', 'simulado');--> statement-breakpoint
CREATE TYPE "public"."tipo_xp_evento" AS ENUM('acerto', 'licao_concluida', 'licao_perfeita', 'desafio_aprovado', 'simulado_acerto', 'simulado_aprovado');--> statement-breakpoint
CREATE TABLE "arquivos_coletados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"fonte" "fonte_coleta" NOT NULL,
	"tipo" "tipo_arquivo_coleta" DEFAULT 'outro' NOT NULL,
	"prova_origem_id" uuid,
	"caminho" text,
	"hash_sha256" text,
	"bytes" integer,
	"baixado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "arquivos_coletados_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "assuntos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disciplina_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"dica_titulo" text,
	"dica_texto" text,
	"dica_exemplo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assuntos_disciplina_slug_uq" UNIQUE("disciplina_id","slug")
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"acao" text NOT NULL,
	"alvo" text,
	"detalhes" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concurso_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"area" "area_cargo" NOT NULL,
	"escolaridade" "escolaridade",
	"vagas" integer,
	"distribuicao" jsonb DEFAULT '{"portugues":5,"matematica":5,"gerais":5,"especificos":25}'::jsonb NOT NULL,
	"generico" boolean DEFAULT true NOT NULL,
	"conteudo_programatico" text,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cargos_concurso_nome_uq" UNIQUE("concurso_id","nome")
);
--> statement-breakpoint
CREATE TABLE "concursos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"banca" text NOT NULL,
	"orgao" text NOT NULL,
	"municipio" text NOT NULL,
	"uf" varchar(2) NOT NULL,
	"ano" integer NOT NULL,
	"status" "status_concurso" DEFAULT 'aguardando_edital' NOT NULL,
	"data_prova" date,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"versao_conteudo" integer DEFAULT 1 NOT NULL,
	"edital_publicado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concursos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "conquistas_usuario" (
	"usuario_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"obtida_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conquistas_usuario_usuario_id_codigo_pk" PRIMARY KEY("usuario_id","codigo")
);
--> statement-breakpoint
CREATE TABLE "disciplinas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" "slug_disciplina" NOT NULL,
	"nome" text NOT NULL,
	"cor" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "disciplinas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "importacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prova_origem_id" uuid,
	"arquivo_caderno" text,
	"arquivo_gabarito" text,
	"hash_caderno" text,
	"status" "status_importacao" DEFAULT 'baixado' NOT NULL,
	"questoes_extraidas" integer DEFAULT 0 NOT NULL,
	"divergencias" integer DEFAULT 0 NOT NULL,
	"confronto" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"log" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secao_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"tipo" "tipo_licao" DEFAULT 'normal' NOT NULL,
	"tamanho" smallint DEFAULT 5 NOT NULL,
	"titulo" text,
	"dica_titulo" text,
	"dica_texto" text,
	"dica_exemplo" text,
	CONSTRAINT "licoes_tamanho_ck" CHECK ("licoes"."tamanho" in (5, 10))
);
--> statement-breakpoint
CREATE TABLE "ligas_grupos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"semana" date NOT NULL,
	"divisao" "divisao" NOT NULL,
	"concurso_id" uuid NOT NULL,
	"fechado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ligas_membros" (
	"grupo_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"semana" date NOT NULL,
	"xp_semana" integer DEFAULT 0 NOT NULL,
	"alcancado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"resultado" "resultado_liga",
	"posicao_final" integer,
	"resultado_visto_em" timestamp with time zone,
	CONSTRAINT "ligas_membros_grupo_id_usuario_id_pk" PRIMARY KEY("grupo_id","usuario_id"),
	CONSTRAINT "ligas_membros_usuario_semana_uq" UNIQUE("usuario_id","semana")
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"asaas_customer_id" text,
	"asaas_payment_id" text,
	"valor_centavos" integer NOT NULL,
	"status" "status_pedido" DEFAULT 'pendente' NOT NULL,
	"pix_payload" text,
	"pix_imagem" text,
	"pix_expira_em" timestamp with time zone,
	"pago_em" timestamp with time zone,
	"reembolso_solicitado_em" timestamp with time zone,
	"estornado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_asaas_payment_id_unique" UNIQUE("asaas_payment_id")
);
--> statement-breakpoint
CREATE TABLE "progresso_licoes" (
	"usuario_id" uuid NOT NULL,
	"licao_id" uuid NOT NULL,
	"vezes" integer DEFAULT 0 NOT NULL,
	"melhor_precisao" smallint,
	"concluida_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progresso_licoes_usuario_id_licao_id_pk" PRIMARY KEY("usuario_id","licao_id")
);
--> statement-breakpoint
CREATE TABLE "provas_origem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"banca" text DEFAULT 'FAU-Unicentro' NOT NULL,
	"nome" text,
	"tipo" text,
	"orgao" text NOT NULL,
	"municipio" text,
	"uf" varchar(2),
	"ano" integer,
	"data_prova" date,
	"cargo" text,
	"nivel" text,
	"regime" text,
	"url_pagina" text,
	"url_caderno" text,
	"url_gabarito" text,
	"url_recursos" text,
	"hash_pdf" text,
	"slug_fau" text,
	"relevancia_palmital" boolean DEFAULT false NOT NULL,
	"fonte" "fonte_coleta" DEFAULT 'fau' NOT NULL,
	"status" "status_prova_origem" DEFAULT 'ativa' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_inscricoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_inscricoes_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "questoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prova_origem_id" uuid,
	"numero_origem" integer,
	"origem" "origem_questao" NOT NULL,
	"disciplina_id" uuid NOT NULL,
	"assunto_id" uuid NOT NULL,
	"areas" text[] DEFAULT '{}'::text[] NOT NULL,
	"dificuldade" smallint DEFAULT 2 NOT NULL,
	"texto_apoio" text,
	"enunciado" text NOT NULL,
	"alternativas" jsonb NOT NULL,
	"gabarito" "letra" NOT NULL,
	"dica" text,
	"explicacao" text,
	"dica_bolso" text,
	"status" "status_questao" DEFAULT 'rascunho' NOT NULL,
	"anulada_motivo" text,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_por" uuid,
	"revisado_por" uuid,
	"publicado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questoes_dificuldade_ck" CHECK ("questoes"."dificuldade" between 1 and 3),
	CONSTRAINT "questoes_origem_prova_ck" CHECK (("questoes"."origem" = 'autoral' and "questoes"."prova_origem_id" is null) or ("questoes"."origem" = 'fau_real' and "questoes"."prova_origem_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "redefinicoes_senha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redefinicoes_senha_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"questao_id" uuid NOT NULL,
	"tipo" "tipo_report" NOT NULL,
	"texto" text,
	"status" "status_report" DEFAULT 'aberto' NOT NULL,
	"resolvido_por" uuid,
	"nota" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvido_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "revisoes" (
	"usuario_id" uuid NOT NULL,
	"questao_id" uuid NOT NULL,
	"etapa" smallint DEFAULT 0 NOT NULL,
	"vence_em" timestamp with time zone NOT NULL,
	"status" "status_revisao" DEFAULT 'ativa' NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revisoes_usuario_id_questao_id_pk" PRIMARY KEY("usuario_id","questao_id"),
	CONSTRAINT "revisoes_etapa_ck" CHECK ("revisoes"."etapa" between 0 and 4)
);
--> statement-breakpoint
CREATE TABLE "secoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unidade_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"titulo" text NOT NULL,
	"assunto_id" uuid NOT NULL,
	"no_edital" boolean
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"ip" text,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_uso_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessoes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessoes_estudo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_sessao_estudo" NOT NULL,
	"licao_id" uuid,
	"questoes" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"sessao_origem_id" uuid,
	"id_cliente" uuid,
	"iniciada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"concluida_em" timestamp with time zone,
	"xp_ganho" integer DEFAULT 0 NOT NULL,
	"acertos" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "sessoes_estudo_usuario_id_cliente_uq" UNIQUE("usuario_id","id_cliente")
);
--> statement-breakpoint
CREATE TABLE "simulados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"cargo_id" uuid NOT NULL,
	"questoes" uuid[] NOT NULL,
	"distribuicao" jsonb DEFAULT '{"portugues":5,"matematica":5,"gerais":5,"especificos":25}'::jsonb NOT NULL,
	"respostas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"iniciado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"termina_em" timestamp with time zone NOT NULL,
	"entregue_em" timestamp with time zone,
	"entrega_automatica" boolean DEFAULT false NOT NULL,
	"pontos" numeric(5, 1),
	"acertos_por_bloco" jsonb,
	"xp_ganho" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentativas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_cliente" uuid,
	"usuario_id" uuid NOT NULL,
	"questao_id" uuid NOT NULL,
	"sessao_estudo_id" uuid,
	"resposta" "letra" NOT NULL,
	"acertou" boolean NOT NULL,
	"usou_dica" boolean DEFAULT false NOT NULL,
	"tempo_ms" integer DEFAULT 0 NOT NULL,
	"respondida_em" timestamp with time zone DEFAULT now() NOT NULL,
	"offline" boolean DEFAULT false NOT NULL,
	CONSTRAINT "tentativas_usuario_id_cliente_uq" UNIQUE("usuario_id","id_cliente")
);
--> statement-breakpoint
CREATE TABLE "unidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concurso_id" uuid NOT NULL,
	"area" "area_cargo",
	"ordem" integer NOT NULL,
	"titulo" text NOT NULL,
	"disciplina_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"cpf" varchar(11),
	"celular" varchar(11),
	"senha_hash" text,
	"papel" "papel" DEFAULT 'aluno' NOT NULL,
	"acesso" boolean DEFAULT false NOT NULL,
	"concurso_id" uuid,
	"cargo_id" uuid,
	"area" "area_cargo",
	"meta_diaria" smallint DEFAULT 1 NOT NULL,
	"lembrete_hora" varchar(5),
	"notificacoes" boolean DEFAULT true NOT NULL,
	"apelido_liga" text,
	"sons" boolean DEFAULT true NOT NULL,
	"xp_total" integer DEFAULT 0 NOT NULL,
	"gemas" integer DEFAULT 0 NOT NULL,
	"vidas" smallint DEFAULT 5 NOT NULL,
	"vidas_atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ofensiva" integer DEFAULT 0 NOT NULL,
	"ofensiva_recorde" integer DEFAULT 0 NOT NULL,
	"ultimo_dia_estudo" date,
	"protetores" smallint DEFAULT 0 NOT NULL,
	"divisao" "divisao" DEFAULT 'bronze' NOT NULL,
	"asaas_customer_id" text,
	"onboarding_concluido_em" timestamp with time zone,
	"ultimo_push_em" timestamp with time zone,
	"aceite_termos_em" timestamp with time zone,
	"versao_termos" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"excluido_em" timestamp with time zone,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "usuarios_meta_diaria_ck" CHECK ("usuarios"."meta_diaria" between 1 and 3),
	CONSTRAINT "usuarios_vidas_ck" CHECK ("usuarios"."vidas" between 0 and 5),
	CONSTRAINT "usuarios_protetores_ck" CHECK ("usuarios"."protetores" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "webhook_eventos" (
	"id" text PRIMARY KEY NOT NULL,
	"evento" text NOT NULL,
	"corpo" jsonb NOT NULL,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"processado_em" timestamp with time zone,
	"erro" text
);
--> statement-breakpoint
CREATE TABLE "xp_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_xp_evento" NOT NULL,
	"valor" integer NOT NULL,
	"sessao_estudo_id" uuid,
	"simulado_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"semana" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arquivos_coletados" ADD CONSTRAINT "arquivos_coletados_prova_origem_id_provas_origem_id_fk" FOREIGN KEY ("prova_origem_id") REFERENCES "public"."provas_origem"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assuntos" ADD CONSTRAINT "assuntos_disciplina_id_disciplinas_id_fk" FOREIGN KEY ("disciplina_id") REFERENCES "public"."disciplinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_admin_id_usuarios_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_concurso_id_concursos_id_fk" FOREIGN KEY ("concurso_id") REFERENCES "public"."concursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conquistas_usuario" ADD CONSTRAINT "conquistas_usuario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_prova_origem_id_provas_origem_id_fk" FOREIGN KEY ("prova_origem_id") REFERENCES "public"."provas_origem"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licoes" ADD CONSTRAINT "licoes_secao_id_secoes_id_fk" FOREIGN KEY ("secao_id") REFERENCES "public"."secoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ligas_grupos" ADD CONSTRAINT "ligas_grupos_concurso_id_concursos_id_fk" FOREIGN KEY ("concurso_id") REFERENCES "public"."concursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ligas_membros" ADD CONSTRAINT "ligas_membros_grupo_id_ligas_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."ligas_grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ligas_membros" ADD CONSTRAINT "ligas_membros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progresso_licoes" ADD CONSTRAINT "progresso_licoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progresso_licoes" ADD CONSTRAINT "progresso_licoes_licao_id_licoes_id_fk" FOREIGN KEY ("licao_id") REFERENCES "public"."licoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_inscricoes" ADD CONSTRAINT "push_inscricoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_prova_origem_id_provas_origem_id_fk" FOREIGN KEY ("prova_origem_id") REFERENCES "public"."provas_origem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_disciplina_id_disciplinas_id_fk" FOREIGN KEY ("disciplina_id") REFERENCES "public"."disciplinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_assunto_id_assuntos_id_fk" FOREIGN KEY ("assunto_id") REFERENCES "public"."assuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redefinicoes_senha" ADD CONSTRAINT "redefinicoes_senha_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_questao_id_questoes_id_fk" FOREIGN KEY ("questao_id") REFERENCES "public"."questoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolvido_por_usuarios_id_fk" FOREIGN KEY ("resolvido_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_questao_id_questoes_id_fk" FOREIGN KEY ("questao_id") REFERENCES "public"."questoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secoes" ADD CONSTRAINT "secoes_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secoes" ADD CONSTRAINT "secoes_assunto_id_assuntos_id_fk" FOREIGN KEY ("assunto_id") REFERENCES "public"."assuntos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes_estudo" ADD CONSTRAINT "sessoes_estudo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes_estudo" ADD CONSTRAINT "sessoes_estudo_licao_id_licoes_id_fk" FOREIGN KEY ("licao_id") REFERENCES "public"."licoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulados" ADD CONSTRAINT "simulados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulados" ADD CONSTRAINT "simulados_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentativas" ADD CONSTRAINT "tentativas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentativas" ADD CONSTRAINT "tentativas_questao_id_questoes_id_fk" FOREIGN KEY ("questao_id") REFERENCES "public"."questoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentativas" ADD CONSTRAINT "tentativas_sessao_estudo_id_sessoes_estudo_id_fk" FOREIGN KEY ("sessao_estudo_id") REFERENCES "public"."sessoes_estudo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_concurso_id_concursos_id_fk" FOREIGN KEY ("concurso_id") REFERENCES "public"."concursos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_disciplina_id_disciplinas_id_fk" FOREIGN KEY ("disciplina_id") REFERENCES "public"."disciplinas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_concurso_id_concursos_id_fk" FOREIGN KEY ("concurso_id") REFERENCES "public"."concursos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_eventos" ADD CONSTRAINT "xp_eventos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_eventos" ADD CONSTRAINT "xp_eventos_sessao_estudo_id_sessoes_estudo_id_fk" FOREIGN KEY ("sessao_estudo_id") REFERENCES "public"."sessoes_estudo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_eventos" ADD CONSTRAINT "xp_eventos_simulado_id_simulados_id_fk" FOREIGN KEY ("simulado_id") REFERENCES "public"."simulados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arquivos_coletados_hash_idx" ON "arquivos_coletados" USING btree ("hash_sha256");--> statement-breakpoint
CREATE INDEX "auditoria_criado_idx" ON "auditoria" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "auditoria_acao_idx" ON "auditoria" USING btree ("acao");--> statement-breakpoint
CREATE INDEX "importacoes_status_idx" ON "importacoes" USING btree ("status","criado_em");--> statement-breakpoint
CREATE INDEX "licoes_secao_ordem_idx" ON "licoes" USING btree ("secao_id","ordem");--> statement-breakpoint
CREATE INDEX "ligas_grupos_semana_idx" ON "ligas_grupos" USING btree ("semana","concurso_id","divisao");--> statement-breakpoint
CREATE INDEX "ligas_membros_ranking_idx" ON "ligas_membros" USING btree ("grupo_id","xp_semana" DESC NULLS LAST,"alcancado_em");--> statement-breakpoint
CREATE INDEX "pedidos_usuario_status_idx" ON "pedidos" USING btree ("usuario_id","status");--> statement-breakpoint
CREATE INDEX "pedidos_status_expira_idx" ON "pedidos" USING btree ("status","pix_expira_em");--> statement-breakpoint
CREATE INDEX "pedidos_pago_em_idx" ON "pedidos" USING btree ("pago_em");--> statement-breakpoint
CREATE INDEX "provas_origem_slug_fau_idx" ON "provas_origem" USING btree ("slug_fau");--> statement-breakpoint
CREATE INDEX "provas_origem_banca_status_idx" ON "provas_origem" USING btree ("banca","status");--> statement-breakpoint
CREATE INDEX "push_inscricoes_usuario_idx" ON "push_inscricoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "questoes_status_assunto_idx" ON "questoes" USING btree ("status","assunto_id");--> statement-breakpoint
CREATE INDEX "questoes_areas_gin_idx" ON "questoes" USING gin ("areas");--> statement-breakpoint
CREATE UNIQUE INDEX "questoes_prova_numero_uq" ON "questoes" USING btree ("prova_origem_id","numero_origem");--> statement-breakpoint
CREATE INDEX "redefinicoes_usuario_idx" ON "redefinicoes_senha" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "reports_questao_status_idx" ON "reports" USING btree ("questao_id","status");--> statement-breakpoint
CREATE INDEX "reports_status_criado_idx" ON "reports" USING btree ("status","criado_em");--> statement-breakpoint
CREATE INDEX "revisoes_usuario_vence_ativa_idx" ON "revisoes" USING btree ("usuario_id","vence_em") WHERE "revisoes"."status" = 'ativa';--> statement-breakpoint
CREATE INDEX "secoes_unidade_ordem_idx" ON "secoes" USING btree ("unidade_id","ordem");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "sessoes_expira_idx" ON "sessoes" USING btree ("expira_em");--> statement-breakpoint
CREATE INDEX "sessoes_estudo_usuario_iniciada_idx" ON "sessoes_estudo" USING btree ("usuario_id","iniciada_em");--> statement-breakpoint
CREATE INDEX "simulados_usuario_iniciado_idx" ON "simulados" USING btree ("usuario_id","iniciado_em");--> statement-breakpoint
CREATE INDEX "simulados_abertos_idx" ON "simulados" USING btree ("termina_em") WHERE "simulados"."entregue_em" is null;--> statement-breakpoint
CREATE INDEX "tentativas_usuario_questao_respondida_idx" ON "tentativas" USING btree ("usuario_id","questao_id","respondida_em" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tentativas_sessao_idx" ON "tentativas" USING btree ("sessao_estudo_id");--> statement-breakpoint
CREATE INDEX "unidades_concurso_area_ordem_idx" ON "unidades" USING btree ("concurso_id","area","ordem");--> statement-breakpoint
CREATE INDEX "usuarios_lembrete_idx" ON "usuarios" USING btree ("lembrete_hora") WHERE "usuarios"."notificacoes" = true;--> statement-breakpoint
CREATE INDEX "xp_eventos_usuario_semana_idx" ON "xp_eventos" USING btree ("usuario_id","semana");
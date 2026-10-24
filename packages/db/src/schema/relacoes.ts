/**
 * Relações para a API relacional do Drizzle (`db.query.*.findMany({ with })`).
 */
import { relations } from 'drizzle-orm';
import {
  assuntos,
  cargos,
  concursos,
  conquistasUsuario,
  disciplinas,
  ligasGrupos,
  ligasMembros,
  licoes,
  pedidos,
  progressoLicoes,
  provasOrigem,
  questoes,
  reports,
  revisoes,
  secoes,
  sessoes,
  sessoesEstudo,
  simulados,
  tentativas,
  unidades,
  usuarios,
} from './tabelas.js';

export const concursosRelacoes = relations(concursos, ({ many }) => ({
  cargos: many(cargos),
  unidades: many(unidades),
}));

export const cargosRelacoes = relations(cargos, ({ one }) => ({
  concurso: one(concursos, { fields: [cargos.concursoId], references: [concursos.id] }),
}));

export const disciplinasRelacoes = relations(disciplinas, ({ many }) => ({
  assuntos: many(assuntos),
}));

export const assuntosRelacoes = relations(assuntos, ({ one, many }) => ({
  disciplina: one(disciplinas, { fields: [assuntos.disciplinaId], references: [disciplinas.id] }),
  questoes: many(questoes),
}));

export const provasOrigemRelacoes = relations(provasOrigem, ({ many }) => ({
  questoes: many(questoes),
}));

export const questoesRelacoes = relations(questoes, ({ one, many }) => ({
  provaOrigem: one(provasOrigem, {
    fields: [questoes.provaOrigemId],
    references: [provasOrigem.id],
  }),
  disciplina: one(disciplinas, { fields: [questoes.disciplinaId], references: [disciplinas.id] }),
  assunto: one(assuntos, { fields: [questoes.assuntoId], references: [assuntos.id] }),
  reports: many(reports),
}));

export const unidadesRelacoes = relations(unidades, ({ one, many }) => ({
  concurso: one(concursos, { fields: [unidades.concursoId], references: [concursos.id] }),
  disciplina: one(disciplinas, { fields: [unidades.disciplinaId], references: [disciplinas.id] }),
  secoes: many(secoes),
}));

export const secoesRelacoes = relations(secoes, ({ one, many }) => ({
  unidade: one(unidades, { fields: [secoes.unidadeId], references: [unidades.id] }),
  assunto: one(assuntos, { fields: [secoes.assuntoId], references: [assuntos.id] }),
  licoes: many(licoes),
}));

export const licoesRelacoes = relations(licoes, ({ one }) => ({
  secao: one(secoes, { fields: [licoes.secaoId], references: [secoes.id] }),
}));

export const usuariosRelacoes = relations(usuarios, ({ one, many }) => ({
  concurso: one(concursos, { fields: [usuarios.concursoId], references: [concursos.id] }),
  cargo: one(cargos, { fields: [usuarios.cargoId], references: [cargos.id] }),
  sessoes: many(sessoes),
  pedidos: many(pedidos),
  conquistas: many(conquistasUsuario),
  progresso: many(progressoLicoes),
}));

export const sessoesRelacoes = relations(sessoes, ({ one }) => ({
  usuario: one(usuarios, { fields: [sessoes.usuarioId], references: [usuarios.id] }),
}));

export const pedidosRelacoes = relations(pedidos, ({ one }) => ({
  usuario: one(usuarios, { fields: [pedidos.usuarioId], references: [usuarios.id] }),
}));

export const progressoLicoesRelacoes = relations(progressoLicoes, ({ one }) => ({
  usuario: one(usuarios, { fields: [progressoLicoes.usuarioId], references: [usuarios.id] }),
  licao: one(licoes, { fields: [progressoLicoes.licaoId], references: [licoes.id] }),
}));

export const sessoesEstudoRelacoes = relations(sessoesEstudo, ({ one, many }) => ({
  usuario: one(usuarios, { fields: [sessoesEstudo.usuarioId], references: [usuarios.id] }),
  licao: one(licoes, { fields: [sessoesEstudo.licaoId], references: [licoes.id] }),
  tentativas: many(tentativas),
}));

export const tentativasRelacoes = relations(tentativas, ({ one }) => ({
  usuario: one(usuarios, { fields: [tentativas.usuarioId], references: [usuarios.id] }),
  questao: one(questoes, { fields: [tentativas.questaoId], references: [questoes.id] }),
  sessaoEstudo: one(sessoesEstudo, {
    fields: [tentativas.sessaoEstudoId],
    references: [sessoesEstudo.id],
  }),
}));

export const revisoesRelacoes = relations(revisoes, ({ one }) => ({
  usuario: one(usuarios, { fields: [revisoes.usuarioId], references: [usuarios.id] }),
  questao: one(questoes, { fields: [revisoes.questaoId], references: [questoes.id] }),
}));

export const simuladosRelacoes = relations(simulados, ({ one }) => ({
  usuario: one(usuarios, { fields: [simulados.usuarioId], references: [usuarios.id] }),
  cargo: one(cargos, { fields: [simulados.cargoId], references: [cargos.id] }),
}));

export const ligasGruposRelacoes = relations(ligasGrupos, ({ one, many }) => ({
  concurso: one(concursos, { fields: [ligasGrupos.concursoId], references: [concursos.id] }),
  membros: many(ligasMembros),
}));

export const ligasMembrosRelacoes = relations(ligasMembros, ({ one }) => ({
  grupo: one(ligasGrupos, { fields: [ligasMembros.grupoId], references: [ligasGrupos.id] }),
  usuario: one(usuarios, { fields: [ligasMembros.usuarioId], references: [usuarios.id] }),
}));

export const conquistasUsuarioRelacoes = relations(conquistasUsuario, ({ one }) => ({
  usuario: one(usuarios, { fields: [conquistasUsuario.usuarioId], references: [usuarios.id] }),
}));

export const reportsRelacoes = relations(reports, ({ one }) => ({
  questao: one(questoes, { fields: [reports.questaoId], references: [questoes.id] }),
  usuario: one(usuarios, { fields: [reports.usuarioId], references: [usuarios.id] }),
}));

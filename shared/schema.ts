import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const empresas = pgTable("empresas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  setor: text("setor").notNull(),
  tamanho: text("tamanho").notNull(),
  descricao: text("descricao"),
  website: text("website"),
  cnpj: text("cnpj"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmpresaSchema = createInsertSchema(empresas).omit({
  id: true,
  createdAt: true,
});
export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresas.$inferSelect;

export const usuarios = pgTable("usuarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUsuarioSchema = createInsertSchema(usuarios).omit({
  id: true,
  createdAt: true,
});
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuarios.$inferSelect;

export const fatoresPestel = pgTable("fatores_pestel", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  impacto: text("impacto").notNull(),
  evidencia: text("evidencia").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFatorPestelSchema = createInsertSchema(fatoresPestel).omit({
  id: true,
  createdAt: true,
});
export type InsertFatorPestel = z.infer<typeof insertFatorPestelSchema>;
export type FatorPestel = typeof fatoresPestel.$inferSelect;

export const analiseSwot = pgTable("analise_swot", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  impacto: text("impacto").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnaliseSwotSchema = createInsertSchema(analiseSwot).omit({
  id: true,
  createdAt: true,
});
export type InsertAnaliseSwot = z.infer<typeof insertAnaliseSwotSchema>;
export type AnaliseSwot = typeof analiseSwot.$inferSelect;

export const objetivos = pgTable("objetivos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prazo: text("prazo").notNull(),
  perspectiva: text("perspectiva").notNull().default("Financeira"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertObjetivoSchema = createInsertSchema(objetivos).omit({
  id: true,
  createdAt: true,
});
export type InsertObjetivo = z.infer<typeof insertObjetivoSchema>;
export type Objetivo = typeof objetivos.$inferSelect;

export const resultadosChave = pgTable("resultados_chave", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objetivoId: varchar("objetivo_id").notNull().references(() => objetivos.id, { onDelete: "cascade" }),
  metrica: text("metrica").notNull(),
  valorInicial: decimal("valor_inicial", { precision: 10, scale: 2 }).notNull(),
  valorAlvo: decimal("valor_alvo", { precision: 10, scale: 2 }).notNull(),
  valorAtual: decimal("valor_atual", { precision: 10, scale: 2 }).notNull(),
  owner: text("owner").notNull(),
  prazo: text("prazo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResultadoChaveSchema = createInsertSchema(resultadosChave).omit({
  id: true,
  createdAt: true,
});
export type InsertResultadoChave = z.infer<typeof insertResultadoChaveSchema>;
export type ResultadoChave = typeof resultadosChave.$inferSelect;

export const indicadores = pgTable("indicadores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  perspectiva: text("perspectiva").notNull(),
  nome: text("nome").notNull(),
  meta: text("meta").notNull(),
  atual: text("atual").notNull(),
  status: text("status").notNull(),
  owner: text("owner").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIndicadorSchema = createInsertSchema(indicadores).omit({
  id: true,
  createdAt: true,
});
export type InsertIndicador = z.infer<typeof insertIndicadorSchema>;
export type Indicador = typeof indicadores.$inferSelect;

export const cincoForcas = pgTable("cinco_forcas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  forca: text("forca").notNull(),
  descricao: text("descricao").notNull(),
  intensidade: text("intensidade").notNull(),
  impacto: text("impacto").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCincoForcasSchema = createInsertSchema(cincoForcas).omit({
  id: true,
  createdAt: true,
});
export type InsertCincoForcas = z.infer<typeof insertCincoForcasSchema>;
export type CincoForcas = typeof cincoForcas.$inferSelect;

export const modeloNegocio = pgTable("modelo_negocio", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  bloco: text("bloco").notNull(),
  descricao: text("descricao").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertModeloNegocioSchema = createInsertSchema(modeloNegocio).omit({
  id: true,
  createdAt: true,
});
export type InsertModeloNegocio = z.infer<typeof insertModeloNegocioSchema>;
export type ModeloNegocio = typeof modeloNegocio.$inferSelect;

export const estrategias = pgTable("estrategias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  prioridade: text("prioridade").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEstrategiaSchema = createInsertSchema(estrategias).omit({
  id: true,
  createdAt: true,
});
export type InsertEstrategia = z.infer<typeof insertEstrategiaSchema>;
export type Estrategia = typeof estrategias.$inferSelect;

export const oportunidadesCrescimento = pgTable("oportunidades_crescimento", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  potencial: text("potencial").notNull(),
  risco: text("risco").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOportunidadeCrescimentoSchema = createInsertSchema(oportunidadesCrescimento).omit({
  id: true,
  createdAt: true,
});
export type InsertOportunidadeCrescimento = z.infer<typeof insertOportunidadeCrescimentoSchema>;
export type OportunidadeCrescimento = typeof oportunidadesCrescimento.$inferSelect;

export const iniciativas = pgTable("iniciativas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  status: text("status").notNull(),
  prioridade: text("prioridade").notNull(),
  prazo: text("prazo").notNull(),
  responsavel: text("responsavel").notNull(),
  impacto: text("impacto").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIniciativaSchema = createInsertSchema(iniciativas).omit({
  id: true,
  createdAt: true,
});
export type InsertIniciativa = z.infer<typeof insertIniciativaSchema>;
export type Iniciativa = typeof iniciativas.$inferSelect;

export const rituais = pgTable("rituais", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  dataUltimo: timestamp("data_ultimo"),
  dataProximo: timestamp("data_proximo").notNull(),
  notas: text("notas"),
  decisoes: text("decisoes"),
  checklist: text("checklist"),
  completado: text("completado").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRitualSchema = createInsertSchema(rituais).omit({
  id: true,
  createdAt: true,
});
export type InsertRitual = z.infer<typeof insertRitualSchema>;
export type Ritual = typeof rituais.$inferSelect;

export const eventos = pgTable("eventos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  participantes: text("participantes"),
  decisoes: text("decisoes"),
  anexos: text("anexos"),
  dataEvento: timestamp("data_evento").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventoSchema = createInsertSchema(eventos).omit({
  id: true,
  createdAt: true,
});
export type InsertEvento = z.infer<typeof insertEventoSchema>;
export type Evento = typeof eventos.$inferSelect;


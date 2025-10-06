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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmpresaSchema = createInsertSchema(empresas).omit({
  id: true,
  createdAt: true,
});
export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresas.$inferSelect;

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

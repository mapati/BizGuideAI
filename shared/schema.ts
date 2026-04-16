import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
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
  logoUrl: text("logo_url"),
  // Campos de contexto estratégico para IA
  modeloNegocio: text("modelo_negocio"),
  areaAtuacao: text("area_atuacao"),
  publicoAlvo: text("publico_alvo"),
  principaisProdutos: text("principais_produtos"),
  concorrentesConhecidos: text("concorrentes_conhecidos"),
  diferenciaisCompetitivos: text("diferenciais_competitivos"),
  anoFundacao: integer("ano_fundacao"),
  // Documento estratégico (PDF analisado por IA)
  documentoNome: text("documento_nome"),
  documentoTamanhoKb: integer("documento_tamanho_kb"),
  documentoInterpretacao: text("documento_interpretacao"),
  documentoAnalisadoEm: timestamp("documento_analisado_em"),
  planoStatus: text("plano_status").notNull().default("trial"),
  planoTipo: text("plano_tipo"),
  trialStartedAt: timestamp("trial_started_at").defaultNow(),
  planoAtivadoEm: timestamp("plano_ativado_em"),
  mpSubscriptionId: text("mp_subscription_id"),
  mpSubscriptionStatus: text("mp_subscription_status"),
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
  isAdmin: boolean("is_admin").notNull().default(false),
  role: text("role").notNull().default("admin"),
  emailVerificado: boolean("email_verificado").notNull().default(false),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUsuarioSchema = createInsertSchema(usuarios).omit({
  id: true,
  createdAt: true,
});
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuarios.$inferSelect;

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

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
  responsavelId: varchar("responsavel_id").references(() => usuarios.id, { onDelete: "set null" }),
  encerrado: boolean("encerrado").default(false),
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
  responsavelId: varchar("responsavel_id").references(() => usuarios.id, { onDelete: "set null" }),
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
  benchmarkSetorial: text("benchmark_setorial"),
  benchmarkAtualizadoEm: timestamp("benchmark_atualizado_em"),
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

export const retrospectivas = pgTable("retrospectivas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objetivoId: varchar("objetivo_id").notNull().references(() => objetivos.id, { onDelete: "cascade" }),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  conquistas: text("conquistas").notNull().default(""),
  falhas: text("falhas").notNull().default(""),
  aprendizados: text("aprendizados").notNull().default(""),
  ajustes: text("ajustes").notNull().default(""),
  periodoInicio: text("periodo_inicio"),
  periodoFim: text("periodo_fim"),
  registradoPor: text("registrado_por"),
  criadaEm: timestamp("criada_em").defaultNow().notNull(),
});
export const insertRetrospectivaSchema = createInsertSchema(retrospectivas).omit({ id: true, criadaEm: true });
export type InsertRetrospectiva = z.infer<typeof insertRetrospectivaSchema>;
export type Retrospectiva = typeof retrospectivas.$inferSelect;

export const cenarios = pgTable("cenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull().default(""),
  descricao: text("descricao").notNull().default(""),
  premissas: text("premissas").notNull().default("[]"),
  respostaEstrategica: text("resposta_estrategica").notNull().default(""),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});
export const insertCenarioSchema = createInsertSchema(cenarios).omit({ id: true, criadoEm: true });
export type InsertCenario = z.infer<typeof insertCenarioSchema>;
export type Cenario = typeof cenarios.$inferSelect;

export const riscos = pgTable("riscos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  descricao: text("descricao").notNull(),
  categoria: text("categoria").notNull().default("estrategico"),
  probabilidade: integer("probabilidade").notNull().default(3),
  impacto: integer("impacto").notNull().default(3),
  status: text("status").notNull().default("identificado"),
  planoMitigacao: text("plano_mitigacao").notNull().default(""),
  responsavelId: varchar("responsavel_id").references(() => usuarios.id, { onDelete: "set null" }),
  origemSwotId: varchar("origem_swot_id").references(() => analiseSwot.id, { onDelete: "set null" }),
  origemPestelId: varchar("origem_pestel_id").references(() => fatoresPestel.id, { onDelete: "set null" }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});
export const insertRiscoSchema = createInsertSchema(riscos).omit({ id: true, criadoEm: true });
export type InsertRisco = z.infer<typeof insertRiscoSchema>;
export type Risco = typeof riscos.$inferSelect;

export const bscRelacoes = pgTable("bsc_relacoes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  origemId: varchar("origem_id").notNull().references(() => objetivos.id, { onDelete: "cascade" }),
  destinoId: varchar("destino_id").notNull().references(() => objetivos.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});
export const insertBscRelacaoSchema = createInsertSchema(bscRelacoes).omit({ id: true, criadoEm: true });
export type InsertBscRelacao = z.infer<typeof insertBscRelacaoSchema>;
export type BscRelacao = typeof bscRelacoes.$inferSelect;

export const compartilhamentos = pgTable("compartilhamentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  tipo: text("tipo").notNull().default("completo"),
  criadoPor: text("criado_por"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  ativo: boolean("ativo").notNull().default(true),
});
export const insertCompartilhamentoSchema = createInsertSchema(compartilhamentos).omit({ id: true, criadoEm: true });
export type InsertCompartilhamento = z.infer<typeof insertCompartilhamentoSchema>;
export type Compartilhamento = typeof compartilhamentos.$inferSelect;

export const configuracoesNotificacao = pgTable("configuracoes_notificacao", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  tipoAlerta: text("tipo_alerta").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  frequencia: text("frequencia").notNull().default("imediato"),
  ultimoEnvio: timestamp("ultimo_envio"),
});
export const insertConfiguracaoNotificacaoSchema = createInsertSchema(configuracoesNotificacao).omit({ id: true });
export type InsertConfiguracaoNotificacao = z.infer<typeof insertConfiguracaoNotificacaoSchema>;
export type ConfiguracaoNotificacao = typeof configuracoesNotificacao.$inferSelect;

export const kpiLeituras = pgTable("kpi_leituras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  indicadorId: varchar("indicador_id").notNull().references(() => indicadores.id, { onDelete: "cascade" }),
  valor: text("valor").notNull(),
  nota: text("nota"),
  registradoEm: timestamp("registrado_em").defaultNow().notNull(),
  registradoPor: text("registrado_por"),
});

export const insertKpiLeituraSchema = createInsertSchema(kpiLeituras).omit({
  id: true,
  registradoEm: true,
});
export type InsertKpiLeitura = z.infer<typeof insertKpiLeituraSchema>;
export type KpiLeitura = typeof kpiLeituras.$inferSelect;

export const faturas = pgTable("faturas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  descricao: text("descricao").notNull(),
  status: text("status").notNull().default("pendente"),
  dataVencimento: timestamp("data_vencimento").notNull(),
  dataPagamento: timestamp("data_pagamento"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFaturaSchema = createInsertSchema(faturas).omit({
  id: true,
  createdAt: true,
});
export type InsertFatura = z.infer<typeof insertFaturaSchema>;
export type Fatura = typeof faturas.$inferSelect;

export const configuracoesIa = pgTable("configuracoes_ia", {
  id: integer("id").primaryKey().default(1),
  modeloPadrao: text("modelo_padrao").notNull().default("gpt-4.1-mini"),
  modeloRelatorios: text("modelo_relatorios").notNull().default("gpt-4.1"),
  modeloBusca: text("modelo_busca").notNull().default("gpt-4o-mini-search-preview"),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

export type ConfiguracaoIa = typeof configuracoesIa.$inferSelect;


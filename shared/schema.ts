import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, serial, date, jsonb, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  planoTipo: text("plano_tipo").default("start"),
  trialStartedAt: timestamp("trial_started_at").defaultNow(),
  planoAtivadoEm: timestamp("plano_ativado_em"),
  mpSubscriptionId: text("mp_subscription_id"),
  mpSubscriptionStatus: text("mp_subscription_status"),
  proprietarioUsuarioId: varchar("proprietario_usuario_id"),
  // Dados do responsável legal pela empresa
  nomeResponsavel: text("nome_responsavel"),
  emailResponsavel: text("email_responsavel"),
  telefoneResponsavel: text("telefone_responsavel"),
  // Aceite dos Termos de Uso
  termoAceitoEm: timestamp("termo_aceito_em"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmpresaSchema = createInsertSchema(empresas).omit({
  id: true,
  createdAt: true,
});
export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresas.$inferSelect;

export const PLAN_LIMITS = {
  start: {
    maxUsuarios: 1,
    aiTier: "economy" as const,
    features: ["swot", "pestel", "bmc", "okr", "kpis", "relatorios"] as string[],
  },
  pro: {
    maxUsuarios: Infinity,
    aiTier: "premium" as const,
    features: ["all"] as string[],
  },
  enterprise: {
    maxUsuarios: Infinity,
    aiTier: "max" as const,
    features: ["all"] as string[],
  },
} as const;

export const usuarios = pgTable("usuarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  role: text("role").notNull().default("admin"),
  fotoUrl: text("foto_url"),
  emailVerificado: boolean("email_verificado").notNull().default(false),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  introBoasVindasDismissed: boolean("intro_boas_vindas_dismissed").notNull().default(false),
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
  estrategiaId: varchar("estrategia_id").references(() => estrategias.id, { onDelete: "set null" }),
  iniciativaId: varchar("iniciativa_id").references((): AnyPgColumn => iniciativas.id, { onDelete: "set null" }),
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
  // Task #208 — Indicador (KPI) que esta meta busca melhorar (opcional, aditivo).
  indicadorFonteId: varchar("indicador_fonte_id").references((): any => indicadores.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

export const insertResultadoChaveSchema = createInsertSchema(resultadosChave).omit({
  id: true,
  createdAt: true,
  atualizadoEm: true,
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
  responsavelId: varchar("responsavel_id").references(() => usuarios.id, { onDelete: "set null" }),
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
  status: text("status").notNull().default("planejada"),
  swotOrigemIds: text("swot_origem_ids").array(),
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
  estrategiaId: varchar("estrategia_id").references(() => estrategias.id, { onDelete: "set null" }),
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
  responsavelId: varchar("responsavel_id").references(() => usuarios.id, { onDelete: "set null" }),
  impacto: text("impacto").notNull(),
  estrategiaId: varchar("estrategia_id").references(() => estrategias.id, { onDelete: "set null" }),
  oportunidadeId: varchar("oportunidade_id").references(() => oportunidadesCrescimento.id, { onDelete: "set null" }),
  // Task #208 — Indicador (KPI) que esta iniciativa busca melhorar (opcional, aditivo).
  indicadorFonteId: varchar("indicador_fonte_id").references(() => indicadores.id, { onDelete: "set null" }),
  // Task #207 — Nota e timestamp registrados quando a iniciativa é encerrada
  // (concluída/pausada/cancelada) pelo agente. Aditivo, sem mexer em IDs.
  notaEncerramento: text("nota_encerramento"),
  encerradaEm: timestamp("encerrada_em"),
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

// Task #174 — Histórico de envios de alertas por (usuário, tipo, alvo) para deduplicação
export const notificacaoEnvios = pgTable("notificacao_envios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  tipoAlerta: text("tipo_alerta").notNull(),
  alvoId: text("alvo_id").notNull().default(""),
  enviadoEm: timestamp("enviado_em").defaultNow().notNull(),
});
export type NotificacaoEnvio = typeof notificacaoEnvios.$inferSelect;

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

export const mpPlanos = pgTable("mp_planos", {
  tipo: varchar("tipo").primaryKey(),
  mpPlanId: text("mp_plan_id").notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});
export type MpPlano = typeof mpPlanos.$inferSelect;

export const pagamentoEventos = pgTable("pagamento_eventos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").references(() => empresas.id, { onDelete: "set null" }),
  tipo: text("tipo").notNull(),
  acao: text("acao"),
  mpResourceId: text("mp_resource_id"),
  status: text("status"),
  statusDetail: text("status_detail"),
  payload: text("payload").notNull().default(""),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});
export type PagamentoEvento = typeof pagamentoEventos.$inferSelect;
export const insertPagamentoEventoSchema = createInsertSchema(pagamentoEventos).omit({ id: true, criadoEm: true });
export type InsertPagamentoEvento = z.infer<typeof insertPagamentoEventoSchema>;

export const configuracoesIa = pgTable("configuracoes_ia", {
  id: integer("id").primaryKey().default(1),
  modeloPadrao: text("modelo_padrao").notNull().default("gpt-4.1-mini"),
  modeloRelatorios: text("modelo_relatorios").notNull().default("gpt-4.1"),
  modeloBusca: text("modelo_busca").notNull().default("gpt-4o"),
  modeloPadraoStart: text("modelo_padrao_start").notNull().default("gpt-4.1-mini"),
  modeloRelatoriosStart: text("modelo_relatorios_start").notNull().default("gpt-4.1-mini"),
  modeloBuscaStart: text("modelo_busca_start").notNull().default("gpt-4o-mini"),
  modeloPadraoProEnt: text("modelo_padrao_pro_ent").notNull().default("gpt-4.1-mini"),
  modeloRelatoriosProEnt: text("modelo_relatorios_pro_ent").notNull().default("gpt-4.1"),
  modeloBuscaProEnt: text("modelo_busca_pro_ent").notNull().default("gpt-4o"),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

export type ConfiguracaoIa = typeof configuracoesIa.$inferSelect;

export const contextoMacro = pgTable("contexto_macro", {
  categoria: varchar("categoria").primaryKey(),
  titulo: text("titulo").notNull(),
  textoAtivo: text("texto_ativo"),
  linksAtivos: text("links_ativos"),
  rascunho: text("rascunho"),
  ativo: boolean("ativo").notNull().default(false),
  ultimaAtualizacao: timestamp("ultima_atualizacao"),
  agendadorAtivo: boolean("agendador_ativo").notNull().default(false),
  agendadorFrequencia: text("agendador_frequencia"),
  proximoAgendamento: timestamp("proximo_agendamento"),
  alertaDias: integer("alerta_dias").notNull().default(7),
  queryBusca: text("query_busca"),
});
export type ContextoMacro = typeof contextoMacro.$inferSelect;

export const contextoMacroLogs = pgTable("contexto_macro_logs", {
  id: serial("id").primaryKey(),
  categoria: varchar("categoria").notNull(),
  executadoEm: timestamp("executado_em").notNull().defaultNow(),
  modo: text("modo").notNull(),
  resultado: text("resultado").notNull(),
  mensagem: text("mensagem").notNull(),
});
export const insertContextoMacroLogSchema = createInsertSchema(contextoMacroLogs).omit({ id: true });
export type InsertContextoMacroLog = z.infer<typeof insertContextoMacroLogSchema>;
export type ContextoMacroLog = typeof contextoMacroLogs.$inferSelect;

export const diagnosticoIaSalvo = pgTable("diagnostico_ia_salvo", {
  empresaId: varchar("empresa_id").primaryKey().references(() => empresas.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  geradoEm: timestamp("gerado_em").defaultNow().notNull(),
});
export type DiagnosticoIASalvo = typeof diagnosticoIaSalvo.$inferSelect;

// Daily counter for Serper.dev web search calls. Keyed by UTC date (YYYY-MM-DD). Aggregated monthly for usage display.
export const googleSearchUsage = pgTable("google_search_usage", {
  date: varchar("date").primaryKey(), // YYYY-MM-DD UTC
  count: integer("count").notNull().default(0),
});

// Task #164 — Preços dos planos exibidos na landing page (chave: 'start' | 'pro')
export const precosLandingPlanos = pgTable("precos_landing_planos", {
  plano: varchar("plano").primaryKey(),
  precoCentavos: integer("preco_centavos").notNull(),
  promocaoAtiva: boolean("promocao_ativa").notNull().default(false),
  precoPromocionalCentavos: integer("preco_promocional_centavos"),
  promocaoFimEm: timestamp("promocao_fim_em"),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});
export const insertPrecoLandingPlanoSchema = createInsertSchema(precosLandingPlanos).omit({ atualizadoEm: true });
export type InsertPrecoLandingPlano = z.infer<typeof insertPrecoLandingPlanoSchema>;
export type PrecoLandingPlano = typeof precosLandingPlanos.$inferSelect;

// Dados fiscais da empresa responsável pelo sistema (singleton, sempre id=1)
export const configSistema = pgTable("config_sistema", {
  id: integer("id").primaryKey().default(1),
  razaoSocial: text("razao_social").notNull().default(""),
  cnpj: text("cnpj").notNull().default(""),
  endereco: text("endereco").notNull().default(""),
  cidade: text("cidade").notNull().default(""),
  estado: text("estado").notNull().default(""),
  cep: text("cep").notNull().default(""),
  email: text("email").notNull().default(""),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  githubAutoPushEnabled: boolean("github_auto_push_enabled").notNull().default(false),
  githubAutoPushFrequencia: text("github_auto_push_frequencia").notNull().default("diario"),
});
export type ConfigSistema = typeof configSistema.$inferSelect;

// Task #182 — Briefing diário gerado por IA (uma entrada por empresa por dia)
export const briefingDiario = pgTable("briefing_diario", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  data: date("data").notNull(), // DATE (America/Sao_Paulo)
  conteudo: jsonb("conteudo").notNull(), // BriefingConteudo estruturado
  fonte: text("fonte").notNull().default("ia"), // 'ia' | 'regra'
  geradoEm: timestamp("gerado_em").defaultNow().notNull(),
});
export type BriefingDiario = typeof briefingDiario.$inferSelect;

export const briefingDiarioLogs = pgTable("briefing_diario_logs", {
  id: serial("id").primaryKey(),
  empresaId: varchar("empresa_id").notNull(),
  data: date("data").notNull(),
  executadoEm: timestamp("executado_em").notNull().defaultNow(),
  fonte: text("fonte").notNull(), // 'ia' | 'regra' | 'pulado'
  duracaoMs: integer("duracao_ms").notNull().default(0),
  resultado: text("resultado").notNull(), // 'sucesso' | 'erro' | 'pulado'
  mensagem: text("mensagem").notNull().default(""),
});
export type BriefingDiarioLog = typeof briefingDiarioLogs.$inferSelect;
export const insertBriefingDiarioLogSchema = createInsertSchema(briefingDiarioLogs).omit({ id: true });
export type InsertBriefingDiarioLog = z.infer<typeof insertBriefingDiarioLogSchema>;

// Esquema do conteúdo (validação Zod do que a IA retorna / o que persistimos)
export const briefingAcaoSchema = z.object({
  label: z.string().min(1).max(80),
  tipo: z.enum(["criar", "editar", "abrir", "dispensar"]),
  rota: z.string().optional(),
  params: z.record(z.string(), z.string()).optional(),
});
export type BriefingAcao = z.infer<typeof briefingAcaoSchema>;

export const briefingConteudoSchema = z.object({
  corpo: z.string().min(1),
  prioridade: z.object({
    titulo: z.string().min(1),
    tom: z.enum(["positivo", "neutro", "atencao", "critico"]).default("atencao"),
  }),
  acoes: z.array(briefingAcaoSchema).max(3).default([]),
  observacoes: z.array(z.string()).max(2).default([]),
  // Task #188 — IDs das propostas HITL geradas a partir das ações `criar`/`editar`.
  // Persistidos junto com o briefing para garantir idempotência: GETs subsequentes
  // ressuscitam as propostas existentes em vez de criar duplicatas.
  propostaIds: z.array(z.string()).optional(),
});
export type BriefingConteudo = z.infer<typeof briefingConteudoSchema>;

// Task #188 — Log de propostas (tool calls) do Assistente Estratégico
// Cada chamada de ferramenta proposta pelo modelo é persistida aqui antes de
// ser executada (HITL). O frontend mostra o preview e o usuário decide.
export const assistenteAcaoLog = pgTable("assistente_acao_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  usuarioId: varchar("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  ferramenta: text("ferramenta").notNull(),
  parametros: jsonb("parametros").notNull(),
  preview: jsonb("preview").notNull(),
  // Status conforme contrato HITL: proposta|confirmada|ajustada|ignorada|falhou
  status: text("status").notNull().default("proposta"),
  // Entidade resultante (preenchida após confirmação bem-sucedida).
  entidadeTipo: text("entidade_tipo"), // iniciativa|objetivo|resultado_chave|indicador|kpi_leitura|navegacao
  entidadeId: text("entidade_id"),
  resultado: jsonb("resultado"),
  origem: text("origem").notNull().default("chat"), // chat|briefing
  mensagemErro: text("mensagem_erro"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  resolvidoEm: timestamp("resolvido_em"),
});

export const propostaStatusEnum = z.enum(["proposta", "confirmada", "ajustada", "ignorada", "falhou"]);
export type PropostaStatus = z.infer<typeof propostaStatusEnum>;
export type AssistenteAcaoLog = typeof assistenteAcaoLog.$inferSelect;
export const insertAssistenteAcaoLogSchema = createInsertSchema(assistenteAcaoLog).omit({
  id: true,
  criadoEm: true,
  resolvidoEm: true,
});
export type InsertAssistenteAcaoLog = z.infer<typeof insertAssistenteAcaoLogSchema>;

// Preview enviado ao frontend (depois do apply opcional)
export const propostaPreviewSchema = z.object({
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(600),
  campos: z.array(z.object({
    label: z.string(),
    valor: z.string(),
  })).default([]),
  ctaConfirmar: z.string().default("Confirmar"),
  ctaIgnorar: z.string().default("Ignorar"),
  ctaAjustar: z.string().default("Ajustar"),
});
export type PropostaPreview = z.infer<typeof propostaPreviewSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Task #189 — Plano agêntico (loop multi-passo do Assistente Estratégico)
// O agente quebra metas maiores em uma sequência de passos, e cada passo é
// confirmado individualmente pelo usuário (HITL obrigatório). Após cada
// confirmação o backend pode reabrir o tool calling e propor o próximo passo.
// ─────────────────────────────────────────────────────────────────────────────
export const planoAgentico = pgTable("plano_agentico", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  usuarioId: varchar("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  titulo: text("titulo").notNull(),
  objetivo: text("objetivo").notNull(),
  // ativo | concluido | cancelado
  status: text("status").notNull().default("ativo"),
  origem: text("origem").notNull().default("chat"), // chat|briefing
  totalPassos: integer("total_passos").notNull().default(0),
  passoAtual: integer("passo_atual").notNull().default(1),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  finalizadoEm: timestamp("finalizado_em"),
}, (t) => ({
  // Task #190 — garante atomicamente que só exista 1 plano "ativo" por
  // (empresa, usuário). nullsNotDistinct cobre planos compartilhados
  // (usuarioId IS NULL), tratando NULL como valor único.
  unicoPlanoAtivoPorUsuario: uniqueIndex("plano_agentico_unico_ativo_idx")
    .on(t.empresaId, sql`coalesce(${t.usuarioId}, '')`)
    .where(sql`${t.status} = 'ativo'`),
}));

export const planoAgenticoStatusEnum = z.enum(["ativo", "concluido", "cancelado"]);
export type PlanoAgenticoStatus = z.infer<typeof planoAgenticoStatusEnum>;
export type PlanoAgentico = typeof planoAgentico.$inferSelect;
export const insertPlanoAgenticoSchema = createInsertSchema(planoAgentico).omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
  finalizadoEm: true,
});
export type InsertPlanoAgentico = z.infer<typeof insertPlanoAgenticoSchema>;

export const planoAgenticoPasso = pgTable("plano_agentico_passo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planoId: varchar("plano_id").notNull().references(() => planoAgentico.id, { onDelete: "cascade" }),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull().default(""),
  // pendente | em_andamento | concluido | pulado
  status: text("status").notNull().default("pendente"),
  // ID da proposta HITL gerada para este passo (preenchido quando o agente
  // realmente cria a tool call). Permite rastrear passo↔proposta.
  propostaId: varchar("proposta_id"),
  resultadoResumo: text("resultado_resumo"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  resolvidoEm: timestamp("resolvido_em"),
});

export const planoAgenticoPassoStatusEnum = z.enum(["pendente", "em_andamento", "concluido", "pulado", "falhou"]);
export type PlanoAgenticoPassoStatus = z.infer<typeof planoAgenticoPassoStatusEnum>;
export type PlanoAgenticoPasso = typeof planoAgenticoPasso.$inferSelect;
export const insertPlanoAgenticoPassoSchema = createInsertSchema(planoAgenticoPasso).omit({
  id: true,
  criadoEm: true,
  resolvidoEm: true,
});
export type InsertPlanoAgenticoPasso = z.infer<typeof insertPlanoAgenticoPassoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Task #221 — Memória persistente do Assistente (conversas + mensagens + fatos)
// Conversas agrupam mensagens contínuas; mensagens guardam o histórico real
// (não só refletido pelo frontend); memória persiste fatos extraídos por IA.
// ─────────────────────────────────────────────────────────────────────────────
export const assistenteConversas = pgTable("assistente_conversas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  usuarioId: varchar("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  titulo: text("titulo").notNull().default(""),
  criadaEm: timestamp("criada_em").defaultNow().notNull(),
  ultimaInteracaoEm: timestamp("ultima_interacao_em").defaultNow().notNull(),
  encerradaEm: timestamp("encerrada_em"),
});
export type AssistenteConversa = typeof assistenteConversas.$inferSelect;
export const insertAssistenteConversaSchema = createInsertSchema(assistenteConversas).omit({
  id: true,
  criadaEm: true,
  ultimaInteracaoEm: true,
  encerradaEm: true,
});
export type InsertAssistenteConversa = z.infer<typeof insertAssistenteConversaSchema>;

export const assistenteMensagens = pgTable("assistente_mensagens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversaId: varchar("conversa_id").notNull().references(() => assistenteConversas.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  propostas: jsonb("propostas"),
  criadaEm: timestamp("criada_em").defaultNow().notNull(),
});
export type AssistenteMensagem = typeof assistenteMensagens.$inferSelect;
export const insertAssistenteMensagemSchema = createInsertSchema(assistenteMensagens).omit({
  id: true,
  criadaEm: true,
});
export type InsertAssistenteMensagem = z.infer<typeof insertAssistenteMensagemSchema>;

export const memoriaCategoriaEnum = z.enum(["decisao", "hipotese", "restricao", "prioridade", "contexto"]);
export type MemoriaCategoria = z.infer<typeof memoriaCategoriaEnum>;

export const assistenteMemoria = pgTable("assistente_memoria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  fato: text("fato").notNull(),
  categoria: text("categoria").notNull().default("contexto"),
  fonteMensagemId: varchar("fonte_mensagem_id").references(() => assistenteMensagens.id, { onDelete: "set null" }),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});
export type AssistenteMemoria = typeof assistenteMemoria.$inferSelect;
export const insertAssistenteMemoriaSchema = createInsertSchema(assistenteMemoria).omit({
  id: true,
  criadoEm: true,
});
export type InsertAssistenteMemoria = z.infer<typeof insertAssistenteMemoriaSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// AI Generation Params (shared across /api/ai/gerar-* endpoints)
// Used by the reusable <AIGenerationModal> on the client.
// All fields are optional; endpoints fall back to current defaults when absent.
// ─────────────────────────────────────────────────────────────────────────────
export const aiGenerationParamsSchema = z.object({
  quantidade: z.number().int().min(1).max(10).optional(),
  foco: z.array(z.string()).optional(),
  focoSecundario: z.array(z.string()).optional(),
  instrucaoAdicional: z.string().max(2000).optional(),
  fontesContexto: z.array(z.string()).optional(),
  origemId: z.string().optional(),
});
export type AIGenerationParams = z.infer<typeof aiGenerationParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Task #233 — Rituais de gestão (pautas, atas, decisões, revisões agendadas)
// O assistente passa de reativo a participante ativo dos rituais semanais/
// mensais/trimestrais. Cada artefato é persistido para consulta posterior.
// ─────────────────────────────────────────────────────────────────────────────
export const tipoRitoEnum = z.enum(["semanal", "mensal", "trimestral"]);
export type TipoRito = z.infer<typeof tipoRitoEnum>;

export const reuniaoPautas = pgTable("reuniao_pautas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  geradaEm: timestamp("gerada_em").defaultNow().notNull(),
  dataAlvo: text("data_alvo").notNull(),
  conteudo: jsonb("conteudo").notNull(),
  ataId: varchar("ata_id"),
});
export const insertReuniaoPautaSchema = createInsertSchema(reuniaoPautas).omit({ id: true, geradaEm: true });
export type InsertReuniaoPauta = z.infer<typeof insertReuniaoPautaSchema>;
export type ReuniaoPauta = typeof reuniaoPautas.$inferSelect;

export const reuniaoAtas = pgTable("reuniao_atas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  pautaId: varchar("pauta_id").references(() => reuniaoPautas.id, { onDelete: "set null" }),
  registradaEm: timestamp("registrada_em").defaultNow().notNull(),
  decisoes: jsonb("decisoes").notNull().default(sql`'[]'::jsonb`),
  encaminhamentos: jsonb("encaminhamentos").notNull().default(sql`'[]'::jsonb`),
});
export const insertReuniaoAtaSchema = createInsertSchema(reuniaoAtas).omit({ id: true, registradaEm: true });
export type InsertReuniaoAta = z.infer<typeof insertReuniaoAtaSchema>;
export type ReuniaoAta = typeof reuniaoAtas.$inferSelect;

export const decisoesEstrategicas = pgTable("decisoes_estrategicas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  contexto: text("contexto").notNull().default(""),
  alternativas: jsonb("alternativas").notNull().default(sql`'[]'::jsonb`),
  escolha: text("escolha").notNull(),
  justificativa: text("justificativa").notNull().default(""),
  registradaEm: timestamp("registrada_em").defaultNow().notNull(),
  registradaPorUsuarioId: varchar("registrada_por_usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  ataId: varchar("ata_id").references(() => reuniaoAtas.id, { onDelete: "set null" }),
});
export const insertDecisaoEstrategicaSchema = createInsertSchema(decisoesEstrategicas).omit({ id: true, registradaEm: true });
export type InsertDecisaoEstrategica = z.infer<typeof insertDecisaoEstrategicaSchema>;
export type DecisaoEstrategica = typeof decisoesEstrategicas.$inferSelect;

export const revisoesAgendadas = pgTable("revisoes_agendadas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().references(() => empresas.id, { onDelete: "cascade" }),
  escopo: text("escopo").notNull(),
  escopoId: varchar("escopo_id"),
  dataAlvo: text("data_alvo").notNull(),
  foco: text("foco").notNull().default(""),
  status: text("status").notNull().default("pendente"),
  criadaEm: timestamp("criada_em").defaultNow().notNull(),
  concluidaEm: timestamp("concluida_em"),
});
export const insertRevisaoAgendadaSchema = createInsertSchema(revisoesAgendadas).omit({ id: true, criadaEm: true, concluidaEm: true });
export type InsertRevisaoAgendada = z.infer<typeof insertRevisaoAgendadaSchema>;
export type RevisaoAgendada = typeof revisoesAgendadas.$inferSelect;

export const revisaoStatusEnum = z.enum(["pendente", "concluida", "cancelada"]);
export type RevisaoStatus = z.infer<typeof revisaoStatusEnum>;

// Conteúdo estruturado da pauta (JSONB) — usado pelo helper montarConteudoPauta.
export const conteudoPautaSchema = z.object({
  resumo: z.string().default(""),
  kpisCriticos: z.array(z.object({
    id: z.string(),
    nome: z.string(),
    atual: z.string(),
    meta: z.string(),
    status: z.string(),
  })).default([]),
  krsProximosPrazo: z.array(z.object({
    id: z.string(),
    metrica: z.string(),
    objetivo: z.string(),
    pctAtingido: z.number().nullable(),
    prazo: z.string(),
  })).default([]),
  iniciativasARevisar: z.array(z.object({
    id: z.string(),
    titulo: z.string(),
    status: z.string(),
    prazo: z.string(),
    diasEmAtraso: z.number().nullable(),
  })).default([]),
  decisoesPendentes: z.array(z.object({
    tipo: z.string(),
    descricao: z.string(),
    referenciaId: z.string().optional(),
  })).default([]),
  lacunasDoScore: z.array(z.object({
    titulo: z.string(),
    severidade: z.string(),
    rota: z.string(),
  })).default([]),
});
export type ConteudoPauta = z.infer<typeof conteudoPautaSchema>;


import { db } from "./db";
import { 
  empresas, 
  usuarios,
  emailVerificationTokens,
  passwordResetTokens,
  fatoresPestel, 
  analiseSwot, 
  objetivos, 
  resultadosChave, 
  indicadores,
  kpiLeituras,
  retrospectivas,
  cenarios,
  riscos,
  bscRelacoes,
  compartilhamentos,
  configuracoesNotificacao,
  cincoForcas,
  modeloNegocio,
  estrategias,
  oportunidadesCrescimento,
  iniciativas,
  rituais,
  eventos,
  faturas,
  configuracoesIa,
  pagamentoEventos,
  mpPlanos,
  type PagamentoEvento,
  type InsertPagamentoEvento,
  type Empresa,
  type InsertEmpresa,
  type Usuario,
  type InsertUsuario,
  type EmailVerificationToken,
  type PasswordResetToken,
  type FatorPestel,
  type InsertFatorPestel,
  type AnaliseSwot,
  type InsertAnaliseSwot,
  type Objetivo,
  type InsertObjetivo,
  type ResultadoChave,
  type InsertResultadoChave,
  type Indicador,
  type InsertIndicador,
  type KpiLeitura,
  type InsertKpiLeitura,
  type Retrospectiva,
  type InsertRetrospectiva,
  type Cenario,
  type InsertCenario,
  type Risco,
  type InsertRisco,
  type BscRelacao,
  type InsertBscRelacao,
  type Compartilhamento,
  type InsertCompartilhamento,
  type ConfiguracaoNotificacao,
  type InsertConfiguracaoNotificacao,
  type CincoForcas,
  type InsertCincoForcas,
  type ModeloNegocio,
  type InsertModeloNegocio,
  type Estrategia,
  type InsertEstrategia,
  type OportunidadeCrescimento,
  type InsertOportunidadeCrescimento,
  type Iniciativa,
  type InsertIniciativa,
  type Ritual,
  type InsertRitual,
  type Evento,
  type InsertEvento,
  type Fatura,
  type InsertFatura,
  contextoMacro,
  type ContextoMacro,
  contextoMacroLogs,
  type ContextoMacroLog,
  type InsertContextoMacroLog,
} from "@shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

export interface IStorage {
  getEmpresa(id: string): Promise<Empresa | undefined>;
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  updateEmpresa(id: string, empresa: Partial<InsertEmpresa>): Promise<Empresa>;
  deleteEmpresa(id: string): Promise<void>;

  createUsuario(usuario: InsertUsuario): Promise<Usuario>;
  getUsuarioByEmail(email: string): Promise<Usuario | undefined>;
  getUsuarioById(id: string): Promise<Usuario | undefined>;
  getUsuariosByEmpresaId(empresaId: string): Promise<Usuario[]>;
  countUsuariosByEmpresa(empresaId: string): Promise<number>;
  updateUsuarioSenha(id: string, senhaHash: string): Promise<void>;
  updateUsuario(id: string, data: Partial<Pick<Usuario, "isAdmin" | "role" | "nome">>): Promise<Usuario>;
  deleteUsuario(id: string, empresaId: string): Promise<void>;
  updateEmpresaPlano(id: string, data: Partial<Pick<Empresa, "planoStatus" | "planoAtivadoEm" | "planoTipo" | "mpSubscriptionId" | "mpSubscriptionStatus">>): Promise<Empresa>;
  setEmpresaProprietario(empresaId: string, usuarioId: string): Promise<void>;
  getEmpresaByMpSubscriptionId(subscriptionId: string): Promise<Empresa | undefined>;
  createPagamentoEvento(evento: InsertPagamentoEvento): Promise<PagamentoEvento>;
  getPagamentoEventosByEmpresa(empresaId: string, limit?: number): Promise<PagamentoEvento[]>;
  getMpPlanoId(tipo: string): Promise<string | undefined>;
  saveMpPlanoId(tipo: string, mpPlanId: string): Promise<void>;
  
  getFatoresPestel(empresaId: string): Promise<FatorPestel[]>;
  createFatorPestel(fator: InsertFatorPestel): Promise<FatorPestel>;
  updateFatorPestel(id: string, empresaId: string, fator: Partial<InsertFatorPestel>): Promise<FatorPestel>;
  deleteFatorPestel(id: string, empresaId: string): Promise<void>;
  
  getAnaliseSwot(empresaId: string): Promise<AnaliseSwot[]>;
  createAnaliseSwot(analise: InsertAnaliseSwot): Promise<AnaliseSwot>;
  updateAnaliseSwot(id: string, empresaId: string, analise: Partial<InsertAnaliseSwot>): Promise<AnaliseSwot>;
  deleteAnaliseSwot(id: string, empresaId: string): Promise<void>;
  
  getObjetivos(empresaId: string): Promise<Objetivo[]>;
  createObjetivo(objetivo: InsertObjetivo): Promise<Objetivo>;
  updateObjetivo(id: string, empresaId: string, objetivo: Partial<InsertObjetivo>): Promise<Objetivo>;
  deleteObjetivo(id: string, empresaId: string): Promise<void>;
  
  getResultadosChave(objetivoId: string, empresaId: string): Promise<ResultadoChave[]>;
  createResultadoChave(resultado: InsertResultadoChave, empresaId: string): Promise<ResultadoChave>;
  updateResultadoChave(id: string, empresaId: string, resultado: Partial<InsertResultadoChave>): Promise<ResultadoChave>;
  deleteResultadoChave(id: string, empresaId: string): Promise<void>;
  
  getIndicadores(empresaId: string): Promise<Indicador[]>;
  getIndicador(id: string): Promise<Indicador | null>;
  createIndicador(indicador: InsertIndicador): Promise<Indicador>;
  updateIndicador(id: string, empresaId: string, indicador: Partial<InsertIndicador>): Promise<Indicador>;
  updateIndicadorBenchmark(id: string, benchmark: string): Promise<void>;
  deleteIndicador(id: string, empresaId: string): Promise<void>;

  getLeituras(indicadorId: string): Promise<KpiLeitura[]>;
  createLeitura(leitura: InsertKpiLeitura): Promise<KpiLeitura>;
  deleteLeitura(id: string): Promise<void>;

  getRetrospectivas(empresaId: string): Promise<Retrospectiva[]>;
  getRetrospectivasByObjetivo(objetivoId: string): Promise<Retrospectiva[]>;
  createRetrospectiva(retro: InsertRetrospectiva): Promise<Retrospectiva>;
  deleteRetrospectiva(id: string, empresaId: string): Promise<void>;

  getCenarios(empresaId: string): Promise<Cenario[]>;
  createCenario(cenario: InsertCenario): Promise<Cenario>;
  updateCenario(id: string, empresaId: string, cenario: Partial<InsertCenario>): Promise<Cenario>;
  deleteCenario(id: string, empresaId: string): Promise<void>;

  getRiscos(empresaId: string): Promise<Risco[]>;
  createRisco(risco: InsertRisco): Promise<Risco>;
  updateRisco(id: string, empresaId: string, risco: Partial<InsertRisco>): Promise<Risco>;
  deleteRisco(id: string, empresaId: string): Promise<void>;

  getBscRelacoes(empresaId: string): Promise<BscRelacao[]>;
  createBscRelacao(relacao: InsertBscRelacao): Promise<BscRelacao>;
  deleteBscRelacao(id: string, empresaId: string): Promise<void>;

  getCompartilhamentos(empresaId: string): Promise<Compartilhamento[]>;
  createCompartilhamento(comp: InsertCompartilhamento): Promise<Compartilhamento>;
  getCompartilhamentoByToken(token: string): Promise<Compartilhamento | undefined>;
  deleteCompartilhamento(id: string, empresaId: string): Promise<void>;

  getConfiguracoesNotificacao(usuarioId: string): Promise<ConfiguracaoNotificacao[]>;
  upsertConfiguracaoNotificacao(conf: InsertConfiguracaoNotificacao): Promise<ConfiguracaoNotificacao>;
  getAllConfiguracoesNotificacaoAtivas(): Promise<ConfiguracaoNotificacao[]>;
  updateUltimoEnvio(id: string): Promise<void>;

  getCincoForcas(empresaId: string): Promise<CincoForcas[]>;
  createCincoForcas(forca: InsertCincoForcas): Promise<CincoForcas>;
  updateCincoForcas(id: string, empresaId: string, forca: Partial<InsertCincoForcas>): Promise<CincoForcas>;
  deleteCincoForcas(id: string, empresaId: string): Promise<void>;
  
  getModeloNegocio(empresaId: string): Promise<ModeloNegocio[]>;
  createModeloNegocio(bloco: InsertModeloNegocio): Promise<ModeloNegocio>;
  updateModeloNegocio(id: string, empresaId: string, bloco: Partial<InsertModeloNegocio>): Promise<ModeloNegocio>;
  deleteModeloNegocio(id: string, empresaId: string): Promise<void>;
  
  getEstrategias(empresaId: string): Promise<Estrategia[]>;
  createEstrategia(estrategia: InsertEstrategia): Promise<Estrategia>;
  updateEstrategia(id: string, empresaId: string, estrategia: Partial<InsertEstrategia>): Promise<Estrategia>;
  deleteEstrategia(id: string, empresaId: string): Promise<void>;
  
  getOportunidadesCrescimento(empresaId: string): Promise<OportunidadeCrescimento[]>;
  createOportunidadeCrescimento(oportunidade: InsertOportunidadeCrescimento): Promise<OportunidadeCrescimento>;
  updateOportunidadeCrescimento(id: string, empresaId: string, oportunidade: Partial<InsertOportunidadeCrescimento>): Promise<OportunidadeCrescimento>;
  deleteOportunidadeCrescimento(id: string, empresaId: string): Promise<void>;
  
  getIniciativas(empresaId: string): Promise<Iniciativa[]>;
  createIniciativa(iniciativa: InsertIniciativa): Promise<Iniciativa>;
  updateIniciativa(id: string, empresaId: string, iniciativa: Partial<InsertIniciativa>): Promise<Iniciativa>;
  deleteIniciativa(id: string, empresaId: string): Promise<void>;
  
  getRituais(empresaId: string): Promise<Ritual[]>;
  createRitual(ritual: InsertRitual): Promise<Ritual>;
  updateRitual(id: string, empresaId: string, ritual: Partial<InsertRitual>): Promise<Ritual>;
  deleteRitual(id: string, empresaId: string): Promise<void>;
  
  getEventos(empresaId: string): Promise<Evento[]>;
  createEvento(evento: InsertEvento): Promise<Evento>;
  updateEvento(id: string, empresaId: string, evento: Partial<InsertEvento>): Promise<Evento>;
  deleteEvento(id: string, empresaId: string): Promise<void>;

  getAllUsuarios(): Promise<(Usuario & { empresa: Empresa | undefined })[]>;
  getAllEmpresas(): Promise<(Empresa & { totalUsuarios: number })[]>;
  getEmpresasComContagem(): Promise<(Empresa & { totalUsuarios: number })[]>;
  getAllFaturas(): Promise<(Fatura & { empresa: Empresa | undefined })[]>;
  createFatura(fatura: InsertFatura): Promise<Fatura>;
  updateFatura(id: string, data: Partial<Pick<Fatura, "status" | "dataPagamento">>): Promise<Fatura>;

  updateUsuarioEmailVerificado(id: string, emailVerificado: boolean): Promise<void>;
  updateUsuarioLoginAttempts(id: string, attempts: number, lockedUntil?: Date | null): Promise<void>;
  updateUsuarioPreferencias(id: string, data: { introBoasVindasDismissed?: boolean }): Promise<void>;

  createEmailVerificationToken(usuarioId: string, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenUsed(id: string): Promise<void>;
  getLastVerificationTokenByUserId(usuarioId: string): Promise<EmailVerificationToken | undefined>;

  createPasswordResetToken(usuarioId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;

  getConfiguracoesIA(): Promise<{ modeloPadrao: string; modeloRelatorios: string; modeloBusca: string }>;
  upsertConfiguracoesIA(config: { modeloPadrao?: string; modeloRelatorios?: string; modeloBusca?: string }): Promise<{ modeloPadrao: string; modeloRelatorios: string; modeloBusca: string }>;

  getContextoMacroAll(): Promise<ContextoMacro[]>;
  getContextoMacroAtivos(): Promise<ContextoMacro[]>;
  getContextoMacroByCategoria(categoria: string): Promise<ContextoMacro | undefined>;
  updateContextoMacro(categoria: string, data: Partial<Omit<ContextoMacro, "categoria">>): Promise<ContextoMacro>;
  addContextoMacroLog(log: InsertContextoMacroLog): Promise<void>;
  getContextoMacroLogs(categoria: string): Promise<ContextoMacroLog[]>;
}

function omitTenantFields<T extends Record<string, unknown>>(data: T): Omit<T, "empresaId" | "objetivoId"> {
  const result = { ...data };
  delete (result as Record<string, unknown>)["empresaId"];
  delete (result as Record<string, unknown>)["objetivoId"];
  return result as Omit<T, "empresaId" | "objetivoId">;
}

export class DbStorage implements IStorage {
  async getEmpresa(id: string): Promise<Empresa | undefined> {
    const result = await db.select().from(empresas).where(eq(empresas.id, id)).limit(1);
    return result[0];
  }

  async createEmpresa(empresa: InsertEmpresa): Promise<Empresa> {
    const result = await db.insert(empresas).values(empresa).returning();
    return result[0];
  }

  async updateEmpresa(id: string, empresa: Partial<InsertEmpresa>): Promise<Empresa> {
    const result = await db.update(empresas).set(omitTenantFields(empresa)).where(eq(empresas.id, id)).returning();
    return result[0];
  }

  async deleteEmpresa(id: string): Promise<void> {
    await db.delete(empresas).where(eq(empresas.id, id));
  }

  async createUsuario(usuario: InsertUsuario): Promise<Usuario> {
    const result = await db.insert(usuarios).values(usuario).returning();
    return result[0];
  }

  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
    const result = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
    return result[0];
  }

  async getUsuarioById(id: string): Promise<Usuario | undefined> {
    const result = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
    return result[0];
  }

  async updateUsuarioSenha(id: string, senhaHash: string): Promise<void> {
    await db.update(usuarios).set({ senha: senhaHash }).where(eq(usuarios.id, id));
  }

  async getUsuariosByEmpresaId(empresaId: string): Promise<Usuario[]> {
    return db.select().from(usuarios).where(eq(usuarios.empresaId, empresaId)).orderBy(usuarios.createdAt);
  }

  async updateUsuario(id: string, data: Partial<Pick<Usuario, "isAdmin" | "role" | "nome">>): Promise<Usuario> {
    const result = await db.update(usuarios).set(data).where(eq(usuarios.id, id)).returning();
    if (!result[0]) throw new Error("Usuário não encontrado");
    return result[0];
  }

  async deleteUsuario(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(usuarios)
      .where(and(eq(usuarios.id, id), eq(usuarios.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Usuário não encontrado");
  }

  async countUsuariosByEmpresa(empresaId: string): Promise<number> {
    const result = await db.select().from(usuarios).where(eq(usuarios.empresaId, empresaId));
    return result.length;
  }

  async updateEmpresaPlano(id: string, data: Partial<Pick<Empresa, "planoStatus" | "planoAtivadoEm" | "planoTipo" | "mpSubscriptionId" | "mpSubscriptionStatus">>): Promise<Empresa> {
    const result = await db.update(empresas).set(data).where(eq(empresas.id, id)).returning();
    if (!result[0]) throw new Error("Empresa não encontrada");
    return result[0];
  }

  async setEmpresaProprietario(empresaId: string, usuarioId: string): Promise<void> {
    await db.update(empresas).set({ proprietarioUsuarioId: usuarioId }).where(eq(empresas.id, empresaId));
  }

  async getEmpresaByMpSubscriptionId(subscriptionId: string): Promise<Empresa | undefined> {
    const result = await db.select().from(empresas).where(eq(empresas.mpSubscriptionId, subscriptionId)).limit(1);
    return result[0];
  }

  async createPagamentoEvento(evento: InsertPagamentoEvento): Promise<PagamentoEvento> {
    const result = await db.insert(pagamentoEventos).values(evento).returning();
    return result[0];
  }

  async getPagamentoEventosByEmpresa(empresaId: string, limit: number = 50): Promise<PagamentoEvento[]> {
    return db.select().from(pagamentoEventos)
      .where(eq(pagamentoEventos.empresaId, empresaId))
      .orderBy(desc(pagamentoEventos.criadoEm))
      .limit(limit);
  }

  async getMpPlanoId(tipo: string): Promise<string | undefined> {
    const r = await db.select().from(mpPlanos).where(eq(mpPlanos.tipo, tipo)).limit(1);
    return r[0]?.mpPlanId;
  }

  async saveMpPlanoId(tipo: string, mpPlanId: string): Promise<void> {
    await db
      .insert(mpPlanos)
      .values({ tipo, mpPlanId })
      .onConflictDoUpdate({
        target: mpPlanos.tipo,
        set: { mpPlanId, atualizadoEm: new Date() },
      });
  }

  async getFatoresPestel(empresaId: string): Promise<FatorPestel[]> {
    return db.select().from(fatoresPestel).where(eq(fatoresPestel.empresaId, empresaId));
  }

  async createFatorPestel(fator: InsertFatorPestel): Promise<FatorPestel> {
    const result = await db.insert(fatoresPestel).values(fator).returning();
    return result[0];
  }

  async updateFatorPestel(id: string, empresaId: string, fator: Partial<InsertFatorPestel>): Promise<FatorPestel> {
    const result = await db.update(fatoresPestel).set(omitTenantFields(fator))
      .where(and(eq(fatoresPestel.id, id), eq(fatoresPestel.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteFatorPestel(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(fatoresPestel)
      .where(and(eq(fatoresPestel.id, id), eq(fatoresPestel.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getAnaliseSwot(empresaId: string): Promise<AnaliseSwot[]> {
    return db.select().from(analiseSwot).where(eq(analiseSwot.empresaId, empresaId));
  }

  async createAnaliseSwot(analise: InsertAnaliseSwot): Promise<AnaliseSwot> {
    const result = await db.insert(analiseSwot).values(analise).returning();
    return result[0];
  }

  async updateAnaliseSwot(id: string, empresaId: string, analise: Partial<InsertAnaliseSwot>): Promise<AnaliseSwot> {
    const result = await db.update(analiseSwot).set(omitTenantFields(analise))
      .where(and(eq(analiseSwot.id, id), eq(analiseSwot.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteAnaliseSwot(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(analiseSwot)
      .where(and(eq(analiseSwot.id, id), eq(analiseSwot.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getObjetivos(empresaId: string): Promise<Objetivo[]> {
    return db.select().from(objetivos).where(eq(objetivos.empresaId, empresaId));
  }

  async createObjetivo(objetivo: InsertObjetivo): Promise<Objetivo> {
    const result = await db.insert(objetivos).values(objetivo).returning();
    return result[0];
  }

  async updateObjetivo(id: string, empresaId: string, objetivo: Partial<InsertObjetivo>): Promise<Objetivo> {
    const result = await db.update(objetivos).set(omitTenantFields(objetivo))
      .where(and(eq(objetivos.id, id), eq(objetivos.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteObjetivo(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(objetivos)
      .where(and(eq(objetivos.id, id), eq(objetivos.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getResultadosChave(objetivoId: string, empresaId: string): Promise<ResultadoChave[]> {
    const result = await db
      .select({ resultadosChave })
      .from(resultadosChave)
      .innerJoin(objetivos, eq(resultadosChave.objetivoId, objetivos.id))
      .where(and(eq(resultadosChave.objetivoId, objetivoId), eq(objetivos.empresaId, empresaId)));
    return result.map(r => r.resultadosChave);
  }

  async createResultadoChave(resultado: InsertResultadoChave, empresaId: string): Promise<ResultadoChave> {
    const objetivo = await db.select().from(objetivos)
      .where(and(eq(objetivos.id, resultado.objetivoId), eq(objetivos.empresaId, empresaId)))
      .limit(1);
    if (!objetivo[0]) throw new Error("Objetivo não encontrado ou acesso negado");
    const result = await db.insert(resultadosChave).values(resultado).returning();
    return result[0];
  }

  async updateResultadoChave(id: string, empresaId: string, resultado: Partial<InsertResultadoChave>): Promise<ResultadoChave> {
    const existing = await db
      .select({ resultadosChave })
      .from(resultadosChave)
      .innerJoin(objetivos, eq(resultadosChave.objetivoId, objetivos.id))
      .where(and(eq(resultadosChave.id, id), eq(objetivos.empresaId, empresaId)))
      .limit(1);
    if (!existing[0]) throw new Error("Recurso não encontrado ou acesso negado");
    const updated = await db.update(resultadosChave).set(omitTenantFields(resultado)).where(eq(resultadosChave.id, id)).returning();
    return updated[0];
  }

  async deleteResultadoChave(id: string, empresaId: string): Promise<void> {
    const existing = await db
      .select({ resultadosChave })
      .from(resultadosChave)
      .innerJoin(objetivos, eq(resultadosChave.objetivoId, objetivos.id))
      .where(and(eq(resultadosChave.id, id), eq(objetivos.empresaId, empresaId)))
      .limit(1);
    if (!existing[0]) throw new Error("Recurso não encontrado ou acesso negado");
    await db.delete(resultadosChave).where(eq(resultadosChave.id, id));
  }

  async getIndicadores(empresaId: string): Promise<Indicador[]> {
    return db.select().from(indicadores).where(eq(indicadores.empresaId, empresaId));
  }

  async getIndicador(id: string): Promise<Indicador | null> {
    const result = await db.select().from(indicadores).where(eq(indicadores.id, id));
    return result[0] ?? null;
  }

  async createIndicador(indicador: InsertIndicador): Promise<Indicador> {
    const result = await db.insert(indicadores).values(indicador).returning();
    return result[0];
  }

  async updateIndicador(id: string, empresaId: string, indicador: Partial<InsertIndicador>): Promise<Indicador> {
    const result = await db.update(indicadores).set(omitTenantFields(indicador))
      .where(and(eq(indicadores.id, id), eq(indicadores.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async updateIndicadorBenchmark(id: string, benchmark: string): Promise<void> {
    await db.update(indicadores).set({ benchmarkSetorial: benchmark, benchmarkAtualizadoEm: new Date() }).where(eq(indicadores.id, id));
  }

  async deleteIndicador(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(indicadores)
      .where(and(eq(indicadores.id, id), eq(indicadores.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getLeituras(indicadorId: string): Promise<KpiLeitura[]> {
    return db.select().from(kpiLeituras)
      .where(eq(kpiLeituras.indicadorId, indicadorId))
      .orderBy(desc(kpiLeituras.registradoEm));
  }

  async createLeitura(leitura: InsertKpiLeitura): Promise<KpiLeitura> {
    const result = await db.insert(kpiLeituras).values(leitura).returning();
    return result[0];
  }

  async deleteLeitura(id: string): Promise<void> {
    await db.delete(kpiLeituras).where(eq(kpiLeituras.id, id));
  }

  async getRetrospectivas(empresaId: string): Promise<Retrospectiva[]> {
    return db.select().from(retrospectivas).where(eq(retrospectivas.empresaId, empresaId)).orderBy(desc(retrospectivas.criadaEm));
  }
  async getRetrospectivasByObjetivo(objetivoId: string): Promise<Retrospectiva[]> {
    return db.select().from(retrospectivas).where(eq(retrospectivas.objetivoId, objetivoId)).orderBy(desc(retrospectivas.criadaEm));
  }
  async createRetrospectiva(retro: InsertRetrospectiva): Promise<Retrospectiva> {
    const result = await db.insert(retrospectivas).values(retro).returning();
    return result[0];
  }
  async deleteRetrospectiva(id: string, empresaId: string): Promise<void> {
    await db.delete(retrospectivas).where(and(eq(retrospectivas.id, id), eq(retrospectivas.empresaId, empresaId)));
  }

  async getCenarios(empresaId: string): Promise<Cenario[]> {
    return db.select().from(cenarios).where(eq(cenarios.empresaId, empresaId)).orderBy(cenarios.tipo);
  }
  async createCenario(cenario: InsertCenario): Promise<Cenario> {
    const result = await db.insert(cenarios).values(cenario).returning();
    return result[0];
  }
  async updateCenario(id: string, empresaId: string, cenario: Partial<InsertCenario>): Promise<Cenario> {
    const result = await db.update(cenarios).set(omitTenantFields(cenario))
      .where(and(eq(cenarios.id, id), eq(cenarios.empresaId, empresaId))).returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }
  async deleteCenario(id: string, empresaId: string): Promise<void> {
    await db.delete(cenarios).where(and(eq(cenarios.id, id), eq(cenarios.empresaId, empresaId)));
  }

  async getRiscos(empresaId: string): Promise<Risco[]> {
    return db.select().from(riscos).where(eq(riscos.empresaId, empresaId)).orderBy(desc(riscos.criadoEm));
  }
  async createRisco(risco: InsertRisco): Promise<Risco> {
    const result = await db.insert(riscos).values(risco).returning();
    return result[0];
  }
  async updateRisco(id: string, empresaId: string, risco: Partial<InsertRisco>): Promise<Risco> {
    const result = await db.update(riscos).set(omitTenantFields(risco))
      .where(and(eq(riscos.id, id), eq(riscos.empresaId, empresaId))).returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }
  async deleteRisco(id: string, empresaId: string): Promise<void> {
    await db.delete(riscos).where(and(eq(riscos.id, id), eq(riscos.empresaId, empresaId)));
  }

  async getBscRelacoes(empresaId: string): Promise<BscRelacao[]> {
    return db.select().from(bscRelacoes).where(eq(bscRelacoes.empresaId, empresaId));
  }
  async createBscRelacao(relacao: InsertBscRelacao): Promise<BscRelacao> {
    const result = await db.insert(bscRelacoes).values(relacao).returning();
    return result[0];
  }
  async deleteBscRelacao(id: string, empresaId: string): Promise<void> {
    await db.delete(bscRelacoes).where(and(eq(bscRelacoes.id, id), eq(bscRelacoes.empresaId, empresaId)));
  }

  async getCompartilhamentos(empresaId: string): Promise<Compartilhamento[]> {
    return db.select().from(compartilhamentos).where(eq(compartilhamentos.empresaId, empresaId)).orderBy(desc(compartilhamentos.criadoEm));
  }
  async createCompartilhamento(comp: InsertCompartilhamento): Promise<Compartilhamento> {
    const crypto = await import("crypto");
    const token = crypto.randomBytes(16).toString("hex");
    const result = await db.insert(compartilhamentos).values({ ...comp, token }).returning();
    return result[0];
  }
  async getCompartilhamentoByToken(token: string): Promise<Compartilhamento | undefined> {
    const result = await db.select().from(compartilhamentos).where(and(eq(compartilhamentos.token, token), eq(compartilhamentos.ativo, true)));
    return result[0];
  }
  async deleteCompartilhamento(id: string, empresaId: string): Promise<void> {
    await db.delete(compartilhamentos).where(and(eq(compartilhamentos.id, id), eq(compartilhamentos.empresaId, empresaId)));
  }

  async getConfiguracoesNotificacao(usuarioId: string): Promise<ConfiguracaoNotificacao[]> {
    return db.select().from(configuracoesNotificacao).where(eq(configuracoesNotificacao.usuarioId, usuarioId));
  }
  async upsertConfiguracaoNotificacao(conf: InsertConfiguracaoNotificacao): Promise<ConfiguracaoNotificacao> {
    const result = await db.insert(configuracoesNotificacao).values(conf)
      .onConflictDoUpdate({ target: [configuracoesNotificacao.usuarioId, configuracoesNotificacao.tipoAlerta], set: { ativo: conf.ativo, frequencia: conf.frequencia } })
      .returning();
    return result[0];
  }
  async getAllConfiguracoesNotificacaoAtivas(): Promise<ConfiguracaoNotificacao[]> {
    return db.select().from(configuracoesNotificacao).where(eq(configuracoesNotificacao.ativo, true));
  }
  async updateUltimoEnvio(id: string): Promise<void> {
    await db.update(configuracoesNotificacao).set({ ultimoEnvio: new Date() }).where(eq(configuracoesNotificacao.id, id));
  }

  async getCincoForcas(empresaId: string): Promise<CincoForcas[]> {
    return db.select().from(cincoForcas).where(eq(cincoForcas.empresaId, empresaId));
  }

  async createCincoForcas(forca: InsertCincoForcas): Promise<CincoForcas> {
    const result = await db.insert(cincoForcas).values(forca).returning();
    return result[0];
  }

  async updateCincoForcas(id: string, empresaId: string, forca: Partial<InsertCincoForcas>): Promise<CincoForcas> {
    const result = await db.update(cincoForcas).set(omitTenantFields(forca))
      .where(and(eq(cincoForcas.id, id), eq(cincoForcas.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteCincoForcas(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(cincoForcas)
      .where(and(eq(cincoForcas.id, id), eq(cincoForcas.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getModeloNegocio(empresaId: string): Promise<ModeloNegocio[]> {
    return db.select().from(modeloNegocio).where(eq(modeloNegocio.empresaId, empresaId));
  }

  async createModeloNegocio(bloco: InsertModeloNegocio): Promise<ModeloNegocio> {
    const result = await db.insert(modeloNegocio).values(bloco).returning();
    return result[0];
  }

  async updateModeloNegocio(id: string, empresaId: string, bloco: Partial<InsertModeloNegocio>): Promise<ModeloNegocio> {
    const result = await db.update(modeloNegocio).set(omitTenantFields(bloco))
      .where(and(eq(modeloNegocio.id, id), eq(modeloNegocio.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteModeloNegocio(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(modeloNegocio)
      .where(and(eq(modeloNegocio.id, id), eq(modeloNegocio.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getEstrategias(empresaId: string): Promise<Estrategia[]> {
    return db.select().from(estrategias).where(eq(estrategias.empresaId, empresaId));
  }

  async createEstrategia(estrategia: InsertEstrategia): Promise<Estrategia> {
    const result = await db.insert(estrategias).values(estrategia).returning();
    return result[0];
  }

  async updateEstrategia(id: string, empresaId: string, estrategia: Partial<InsertEstrategia>): Promise<Estrategia> {
    const result = await db.update(estrategias).set(omitTenantFields(estrategia))
      .where(and(eq(estrategias.id, id), eq(estrategias.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteEstrategia(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(estrategias)
      .where(and(eq(estrategias.id, id), eq(estrategias.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getOportunidadesCrescimento(empresaId: string): Promise<OportunidadeCrescimento[]> {
    return db.select().from(oportunidadesCrescimento).where(eq(oportunidadesCrescimento.empresaId, empresaId));
  }

  async createOportunidadeCrescimento(oportunidade: InsertOportunidadeCrescimento): Promise<OportunidadeCrescimento> {
    const result = await db.insert(oportunidadesCrescimento).values(oportunidade).returning();
    return result[0];
  }

  async updateOportunidadeCrescimento(id: string, empresaId: string, oportunidade: Partial<InsertOportunidadeCrescimento>): Promise<OportunidadeCrescimento> {
    const result = await db.update(oportunidadesCrescimento).set(omitTenantFields(oportunidade))
      .where(and(eq(oportunidadesCrescimento.id, id), eq(oportunidadesCrescimento.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteOportunidadeCrescimento(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(oportunidadesCrescimento)
      .where(and(eq(oportunidadesCrescimento.id, id), eq(oportunidadesCrescimento.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getIniciativas(empresaId: string): Promise<Iniciativa[]> {
    return db.select().from(iniciativas).where(eq(iniciativas.empresaId, empresaId));
  }

  async createIniciativa(iniciativa: InsertIniciativa): Promise<Iniciativa> {
    const result = await db.insert(iniciativas).values(iniciativa).returning();
    return result[0];
  }

  async updateIniciativa(id: string, empresaId: string, iniciativa: Partial<InsertIniciativa>): Promise<Iniciativa> {
    const result = await db.update(iniciativas).set(omitTenantFields(iniciativa))
      .where(and(eq(iniciativas.id, id), eq(iniciativas.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteIniciativa(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(iniciativas)
      .where(and(eq(iniciativas.id, id), eq(iniciativas.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getRituais(empresaId: string): Promise<Ritual[]> {
    return db.select().from(rituais).where(eq(rituais.empresaId, empresaId));
  }

  async createRitual(ritual: InsertRitual): Promise<Ritual> {
    const result = await db.insert(rituais).values(ritual).returning();
    return result[0];
  }

  async updateRitual(id: string, empresaId: string, ritual: Partial<InsertRitual>): Promise<Ritual> {
    const result = await db.update(rituais).set(omitTenantFields(ritual))
      .where(and(eq(rituais.id, id), eq(rituais.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteRitual(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(rituais)
      .where(and(eq(rituais.id, id), eq(rituais.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getEventos(empresaId: string): Promise<Evento[]> {
    return db.select().from(eventos).where(eq(eventos.empresaId, empresaId));
  }

  async createEvento(evento: InsertEvento): Promise<Evento> {
    const result = await db.insert(eventos).values(evento).returning();
    return result[0];
  }

  async updateEvento(id: string, empresaId: string, evento: Partial<InsertEvento>): Promise<Evento> {
    const result = await db.update(eventos).set(omitTenantFields(evento))
      .where(and(eq(eventos.id, id), eq(eventos.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
    return result[0];
  }

  async deleteEvento(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(eventos)
      .where(and(eq(eventos.id, id), eq(eventos.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
  }

  async getAllUsuarios(): Promise<(Usuario & { empresa: Empresa | undefined })[]> {
    const result = await db
      .select({ usuario: usuarios, empresa: empresas })
      .from(usuarios)
      .leftJoin(empresas, eq(usuarios.empresaId, empresas.id))
      .orderBy(usuarios.createdAt);
    return result.map(r => ({ ...r.usuario, empresa: r.empresa ?? undefined }));
  }

  async getAllEmpresas(): Promise<(Empresa & { totalUsuarios: number })[]> {
    const allEmpresas = await db.select().from(empresas).orderBy(empresas.createdAt);
    const allUsuarios = await db.select().from(usuarios);
    return allEmpresas.map(e => ({
      ...e,
      totalUsuarios: allUsuarios.filter(u => u.empresaId === e.id).length,
    }));
  }

  async getEmpresasComContagem(): Promise<(Empresa & { totalUsuarios: number })[]> {
    return this.getAllEmpresas();
  }

  async getAllFaturas(): Promise<(Fatura & { empresa: Empresa | undefined })[]> {
    const result = await db
      .select({ fatura: faturas, empresa: empresas })
      .from(faturas)
      .leftJoin(empresas, eq(faturas.empresaId, empresas.id))
      .orderBy(faturas.createdAt);
    return result.map(r => ({ ...r.fatura, empresa: r.empresa ?? undefined }));
  }

  async createFatura(fatura: InsertFatura): Promise<Fatura> {
    const result = await db.insert(faturas).values(fatura).returning();
    return result[0];
  }

  async updateFatura(id: string, data: Partial<Pick<Fatura, "status" | "dataPagamento">>): Promise<Fatura> {
    const result = await db.update(faturas).set(data).where(eq(faturas.id, id)).returning();
    if (!result[0]) throw new Error("Fatura não encontrada");
    return result[0];
  }

  async updateUsuarioEmailVerificado(id: string, emailVerificado: boolean): Promise<void> {
    await db.update(usuarios).set({ emailVerificado }).where(eq(usuarios.id, id));
  }

  async updateUsuarioLoginAttempts(id: string, attempts: number, lockedUntil?: Date | null): Promise<void> {
    await db.update(usuarios).set({
      loginAttempts: attempts,
      ...(lockedUntil !== undefined ? { lockedUntil } : {}),
    }).where(eq(usuarios.id, id));
  }

  async updateUsuarioPreferencias(id: string, data: { introBoasVindasDismissed?: boolean }): Promise<void> {
    await db.update(usuarios).set(data).where(eq(usuarios.id, id));
  }

  async createEmailVerificationToken(usuarioId: string, token: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const result = await db.insert(emailVerificationTokens).values({ usuarioId, token, expiresAt }).returning();
    return result[0];
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const result = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token)).limit(1);
    return result[0];
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    await db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, id));
  }

  async getLastVerificationTokenByUserId(usuarioId: string): Promise<EmailVerificationToken | undefined> {
    const result = await db.select().from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.usuarioId, usuarioId))
      .orderBy(desc(emailVerificationTokens.createdAt))
      .limit(1);
    return result[0];
  }

  async createPasswordResetToken(usuarioId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const result = await db.insert(passwordResetTokens).values({ usuarioId, token, expiresAt }).returning();
    return result[0];
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
    return result[0];
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  async getConfiguracoesIA(): Promise<{ modeloPadrao: string; modeloRelatorios: string; modeloBusca: string }> {
    const result = await db.select().from(configuracoesIa).where(eq(configuracoesIa.id, 1)).limit(1);
    if (result[0]) {
      return { modeloPadrao: result[0].modeloPadrao, modeloRelatorios: result[0].modeloRelatorios, modeloBusca: result[0].modeloBusca };
    }
    return { modeloPadrao: "gpt-4.1-mini", modeloRelatorios: "gpt-4.1", modeloBusca: "gpt-4o-mini-search-preview" };
  }

  async upsertConfiguracoesIA(config: { modeloPadrao?: string; modeloRelatorios?: string; modeloBusca?: string }): Promise<{ modeloPadrao: string; modeloRelatorios: string; modeloBusca: string }> {
    const defaults = await this.getConfiguracoesIA();
    const merged = {
      modeloPadrao: config.modeloPadrao ?? defaults.modeloPadrao,
      modeloRelatorios: config.modeloRelatorios ?? defaults.modeloRelatorios,
      modeloBusca: config.modeloBusca ?? defaults.modeloBusca,
    };
    await db.insert(configuracoesIa)
      .values({ id: 1, ...merged, atualizadoEm: new Date() })
      .onConflictDoUpdate({ target: configuracoesIa.id, set: { ...merged, atualizadoEm: new Date() } });
    return merged;
  }

  async getContextoMacroAll(): Promise<ContextoMacro[]> {
    return db.select().from(contextoMacro);
  }

  async getContextoMacroAtivos(): Promise<ContextoMacro[]> {
    return db.select().from(contextoMacro).where(eq(contextoMacro.ativo, true));
  }

  async getContextoMacroByCategoria(categoria: string): Promise<ContextoMacro | undefined> {
    const result = await db.select().from(contextoMacro).where(eq(contextoMacro.categoria, categoria)).limit(1);
    return result[0];
  }

  async updateContextoMacro(categoria: string, data: Partial<Omit<ContextoMacro, "categoria">>): Promise<ContextoMacro> {
    const result = await db.update(contextoMacro).set(data).where(eq(contextoMacro.categoria, categoria)).returning();
    return result[0];
  }

  async addContextoMacroLog(log: InsertContextoMacroLog): Promise<void> {
    await db.insert(contextoMacroLogs).values(log);
    // Atomic rolling buffer: delete any entries beyond the 10 most recent.
    // Ordering by (executado_em DESC, id DESC) is deterministic even on timestamp ties.
    await db.execute(sql`
      DELETE FROM contexto_macro_logs
      WHERE categoria = ${log.categoria}
        AND id NOT IN (
          SELECT id FROM contexto_macro_logs
          WHERE categoria = ${log.categoria}
          ORDER BY executado_em DESC, id DESC
          LIMIT 10
        )
    `);
  }

  async getContextoMacroLogs(categoria: string): Promise<ContextoMacroLog[]> {
    return db
      .select()
      .from(contextoMacroLogs)
      .where(eq(contextoMacroLogs.categoria, categoria))
      .orderBy(desc(contextoMacroLogs.executadoEm), desc(contextoMacroLogs.id))
      .limit(10);
  }

}

export const storage = new DbStorage();

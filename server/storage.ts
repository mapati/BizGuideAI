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
  notificacaoEnvios,
  type NotificacaoEnvio,
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
  configSistema,
  precosLandingPlanos,
  type PrecoLandingPlano,
  type ConfigSistema,
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
  krCheckins,
  type KrCheckin,
  type InsertKrCheckin,
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
  diagnosticoIaSalvo,
  type DiagnosticoIASalvo,
  type ContextoMacroLog,
  type InsertContextoMacroLog,
  googleSearchUsage,
  briefingDiario,
  briefingDiarioLogs,
  type BriefingDiario,
  type InsertBriefingDiarioLog,
  assistenteAcaoLog,
  type AssistenteAcaoLog,
  type InsertAssistenteAcaoLog,
  planoAgentico,
  type PlanoAgentico,
  type InsertPlanoAgentico,
  planoAgenticoPasso,
  type PlanoAgenticoPasso,
  type InsertPlanoAgenticoPasso,
  assistenteConversas,
  type AssistenteConversa,
  type InsertAssistenteConversa,
  assistenteMensagens,
  type AssistenteMensagem,
  type InsertAssistenteMensagem,
  assistenteMemoria,
  type AssistenteMemoria,
  type InsertAssistenteMemoria,
  reuniaoPautas,
  type ReuniaoPauta,
  type InsertReuniaoPauta,
  reuniaoAtas,
  type ReuniaoAta,
  type InsertReuniaoAta,
  decisoesEstrategicas,
  type DecisaoEstrategica,
  type InsertDecisaoEstrategica,
  revisoesAgendadas,
  type RevisaoAgendada,
  type InsertRevisaoAgendada,
  bizzyResumosCiclo,
  type BizzyResumoCiclo,
  type InsertBizzyResumoCiclo,
} from "@shared/schema";
import { eq, ne, and, or, desc, inArray, sql, lt, isNull } from "drizzle-orm";

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
  getResultadoChaveById(id: string, empresaId: string): Promise<ResultadoChave | undefined>;
  createResultadoChave(resultado: InsertResultadoChave, empresaId: string): Promise<ResultadoChave>;
  updateResultadoChave(id: string, empresaId: string, resultado: Partial<InsertResultadoChave>): Promise<ResultadoChave>;
  deleteResultadoChave(id: string, empresaId: string): Promise<void>;
  // Task #257 — Histórico de check-ins de KR (camada tática de execução do BSC).
  getKrCheckins(krId: string, empresaId: string): Promise<KrCheckin[]>;
  createKrCheckin(checkin: InsertKrCheckin): Promise<KrCheckin>;
  
  getIndicadores(empresaId: string): Promise<Indicador[]>;
  getIndicadoresAcompanhamento(empresaId: string): Promise<Indicador[]>;
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
  getRisco(id: string): Promise<Risco | undefined>;
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
  getUltimoEnvioAlvo(usuarioId: string, tipoAlerta: string, alvoId: string): Promise<Date | null>;
  registrarEnvio(usuarioId: string, tipoAlerta: string, alvoId: string): Promise<void>;

  getCincoForcas(empresaId: string): Promise<CincoForcas[]>;
  createCincoForcas(forca: InsertCincoForcas): Promise<CincoForcas>;
  updateCincoForcas(id: string, empresaId: string, forca: Partial<InsertCincoForcas>): Promise<CincoForcas>;
  deleteCincoForcas(id: string, empresaId: string): Promise<void>;
  
  getModeloNegocio(empresaId: string): Promise<ModeloNegocio[]>;
  createModeloNegocio(bloco: InsertModeloNegocio): Promise<ModeloNegocio>;
  updateModeloNegocio(id: string, empresaId: string, bloco: Partial<InsertModeloNegocio>): Promise<ModeloNegocio>;
  deleteModeloNegocio(id: string, empresaId: string): Promise<void>;
  
  getEstrategias(empresaId: string): Promise<Estrategia[]>;
  getEstrategia(id: string): Promise<Estrategia | undefined>;
  createEstrategia(estrategia: InsertEstrategia): Promise<Estrategia>;
  updateEstrategia(id: string, empresaId: string, estrategia: Partial<InsertEstrategia>): Promise<Estrategia>;
  deleteEstrategia(id: string, empresaId: string): Promise<void>;
  getEstrategiaContadores(estrategiaId: string, empresaId: string): Promise<{ iniciativas: number; okrs: number }>;
  getEstrategiaVinculados(estrategiaId: string, empresaId: string): Promise<{
    iniciativas: Array<{ id: string; titulo: string; status: string; prioridade: string; progresso: number }>;
    okrs: Array<{ id: string; titulo: string; perspectiva: string; encerrado: boolean; progresso: number }>;
  }>;
  
  getOportunidadesCrescimento(empresaId: string): Promise<OportunidadeCrescimento[]>;
  getOportunidadeCrescimento(id: string): Promise<OportunidadeCrescimento | undefined>;
  createOportunidadeCrescimento(oportunidade: InsertOportunidadeCrescimento): Promise<OportunidadeCrescimento>;
  updateOportunidadeCrescimento(id: string, empresaId: string, oportunidade: Partial<InsertOportunidadeCrescimento>): Promise<OportunidadeCrescimento>;
  deleteOportunidadeCrescimento(id: string, empresaId: string): Promise<void>;
  
  getIniciativas(empresaId: string): Promise<Iniciativa[]>;
  getIniciativa(id: string): Promise<Iniciativa | undefined>;
  createIniciativa(iniciativa: InsertIniciativa): Promise<Iniciativa>;
  updateIniciativa(id: string, empresaId: string, iniciativa: Partial<InsertIniciativa>): Promise<Iniciativa>;
  deleteIniciativa(id: string, empresaId: string): Promise<void>;
  // Task #288 — Ciclo de Aprendizado: repriorização em lote.
  repriorizarIniciativas(empresaId: string, idsOrdenados: string[]): Promise<Iniciativa[]>;
  repriorizarEstrategias(empresaId: string, idsOrdenados: string[]): Promise<Estrategia[]>;
  arquivarObjetivo(id: string, empresaId: string, motivo: string): Promise<Objetivo>;
  // Task #231 — quebra atômica de iniciativa em filhas; encerra a mãe.
  dividirIniciativa(
    iniciativaId: string,
    empresaId: string,
    filhas: Array<Partial<InsertIniciativa> & { titulo: string; descricao: string; prazo: string }>,
    notaEncerramento: string,
  ): Promise<{ mae: Iniciativa; filhas: Iniciativa[] }>;
  
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

  getConfiguracoesIA(): Promise<{ modeloPadrao: string; modeloRelatorios: string; modeloBusca: string; modeloPadraoStart: string; modeloRelatoriosStart: string; modeloBuscaStart: string; modeloPadraoProEnt: string; modeloRelatoriosProEnt: string; modeloBuscaProEnt: string }>;
  upsertConfiguracoesIA(config: { modeloPadrao?: string; modeloRelatorios?: string; modeloBusca?: string; modeloPadraoStart?: string; modeloRelatoriosStart?: string; modeloBuscaStart?: string; modeloPadraoProEnt?: string; modeloRelatoriosProEnt?: string; modeloBuscaProEnt?: string }): Promise<{ modeloPadrao: string; modeloRelatorios: string; modeloBusca: string; modeloPadraoStart: string; modeloRelatoriosStart: string; modeloBuscaStart: string; modeloPadraoProEnt: string; modeloRelatoriosProEnt: string; modeloBuscaProEnt: string }>;

  getContextoMacroAll(): Promise<ContextoMacro[]>;
  getContextoMacroAtivos(): Promise<ContextoMacro[]>;
  getContextoMacroByCategoria(categoria: string): Promise<ContextoMacro | undefined>;
  updateContextoMacro(categoria: string, data: Partial<Omit<ContextoMacro, "categoria">>): Promise<ContextoMacro>;
  addContextoMacroLog(log: InsertContextoMacroLog): Promise<void>;
  getContextoMacroLogs(categoria: string): Promise<ContextoMacroLog[]>;
  incrementSearchUsage(): Promise<void>;
  getSearchUsageThisMonth(): Promise<number>;

  getDiagnosticoIASalvo(empresaId: string): Promise<DiagnosticoIASalvo | null>;
  saveDiagnosticoIASalvo(empresaId: string, payload: string): Promise<void>;

  getPrecosLandingPlanos(): Promise<PrecoLandingPlano[]>;
  upsertPrecoLandingPlano(plano: string, data: Partial<Omit<PrecoLandingPlano, "plano" | "atualizadoEm">>): Promise<PrecoLandingPlano>;

  resetDadosEmpresa(empresaId: string, grupo: ResetGrupo): Promise<{ tabelas: string[] }>;

  // Task #182 — Briefing diário
  getBriefingDiario(empresaId: string, data: string): Promise<BriefingDiario | undefined>;
  upsertBriefingDiario(empresaId: string, data: string, conteudo: unknown, fonte: "ia" | "regra"): Promise<BriefingDiario>;
  purgeBriefingsAntigos(diasMantidos: number): Promise<number>;
  addBriefingDiarioLog(log: InsertBriefingDiarioLog): Promise<void>;

  // Task #188 — Propostas (tool calls) do Assistente
  createPropostaLog(input: InsertAssistenteAcaoLog): Promise<AssistenteAcaoLog>;
  getPropostaLog(id: string): Promise<AssistenteAcaoLog | undefined>;
  updatePropostaLog(id: string, patch: Partial<Pick<AssistenteAcaoLog, "status" | "resultado" | "mensagemErro" | "parametros" | "preview" | "resolvidoEm" | "entidadeTipo" | "entidadeId">>): Promise<AssistenteAcaoLog>;
  listPropostasByEmpresa(empresaId: string, limite?: number): Promise<AssistenteAcaoLog[]>;
  // Reserva atômica usada pelo endpoint /confirmar para evitar duplo clique.
  claimPropostaPendente(id: string, empresaId: string): Promise<AssistenteAcaoLog | null>;
  // Hidratação idempotente do briefing (carrega propostas já persistidas).
  listPropostasByIds(ids: string[]): Promise<AssistenteAcaoLog[]>;

  // Task #189 — Planos agênticos (loop multi-passo)
  createPlanoAgentico(plano: InsertPlanoAgentico, passos: Array<Omit<InsertPlanoAgenticoPasso, "planoId" | "empresaId">>): Promise<{ plano: PlanoAgentico; passos: PlanoAgenticoPasso[] }>;
  getPlanoAgentico(id: string): Promise<PlanoAgentico | undefined>;
  getPlanoAgenticoComPassos(id: string): Promise<{ plano: PlanoAgentico; passos: PlanoAgenticoPasso[] } | undefined>;
  listPlanosAgenticosByEmpresa(empresaId: string, opts?: { status?: string; limite?: number }): Promise<PlanoAgentico[]>;
  getPlanoAtivoEmpresaUsuario(empresaId: string, usuarioId: string | null): Promise<PlanoAgentico | undefined>;
  // Task #199 — plano ativo da empresa que NÃO é do par (empresa, usuário corrente).
  // Cobre planos compartilhados (usuarioId === null) e planos pertencentes a
  // outro membro do time. Retorna o plano + nome do dono (null se compartilhado).
  getPlanoAtivoEmpresaDeOutros(empresaId: string, usuarioId: string | null): Promise<{ plano: PlanoAgentico; donoNome: string | null; donoId: string | null } | undefined>;
  updatePlanoAgentico(id: string, patch: Partial<Pick<PlanoAgentico, "status" | "passoAtual" | "finalizadoEm" | "totalPassos">>): Promise<PlanoAgentico>;
  updatePlanoAgenticoPasso(id: string, patch: Partial<Pick<PlanoAgenticoPasso, "status" | "propostaId" | "resultadoResumo" | "resolvidoEm">>): Promise<PlanoAgenticoPasso>;
  getPassoByPropostaId(propostaId: string): Promise<PlanoAgenticoPasso | undefined>;
  getPassoByPlanoOrdem(planoId: string, ordem: number): Promise<PlanoAgenticoPasso | undefined>;
  listPassosByPlano(planoId: string): Promise<PlanoAgenticoPasso[]>;

  // Task #221 — Memória persistente do Assistente
  criarConversa(input: InsertAssistenteConversa): Promise<AssistenteConversa>;
  getConversa(id: string): Promise<AssistenteConversa | undefined>;
  getConversaAtiva(empresaId: string, usuarioId: string | null, janelaHoras?: number): Promise<AssistenteConversa | undefined>;
  encerrarConversa(id: string): Promise<void>;
  appendMensagem(input: InsertAssistenteMensagem): Promise<AssistenteMensagem>;
  getMensagens(conversaId: string, limit?: number): Promise<AssistenteMensagem[]>;
  countMensagensUsuario(conversaId: string): Promise<number>;
  upsertMemoria(empresaId: string, fato: string, categoria: string, fonteMensagemId: string | null): Promise<AssistenteMemoria>;
  getMemoriaAtiva(empresaId: string, limit?: number): Promise<AssistenteMemoria[]>;
  getMemoriaTodas(empresaId: string, limit?: number): Promise<AssistenteMemoria[]>;
  getMemoriaById(id: string, empresaId: string): Promise<AssistenteMemoria | undefined>;
  setMemoriaAtivo(id: string, empresaId: string, ativo: boolean): Promise<AssistenteMemoria | undefined>;
  getMensagemById(id: string): Promise<AssistenteMensagem | undefined>;

  // Task #233 — Rituais de gestão
  createReuniaoPauta(data: InsertReuniaoPauta): Promise<ReuniaoPauta>;
  getReuniaoPauta(id: string, empresaId: string): Promise<ReuniaoPauta | undefined>;
  getReuniaoPautas(empresaId: string, limit?: number): Promise<ReuniaoPauta[]>;
  setReuniaoPautaAta(pautaId: string, empresaId: string, ataId: string | null): Promise<void>;
  createReuniaoAta(data: InsertReuniaoAta): Promise<ReuniaoAta>;
  getReuniaoAta(id: string, empresaId: string): Promise<ReuniaoAta | undefined>;
  getReuniaoAtas(empresaId: string, limit?: number): Promise<ReuniaoAta[]>;
  createDecisaoEstrategica(data: InsertDecisaoEstrategica): Promise<DecisaoEstrategica>;
  getDecisoesEstrategicas(empresaId: string, limit?: number): Promise<DecisaoEstrategica[]>;
  updateDecisaoEstrategica(id: string, empresaId: string, patch: Partial<InsertDecisaoEstrategica>): Promise<DecisaoEstrategica>;
  deleteDecisaoEstrategica(id: string, empresaId: string): Promise<void>;
  createRevisaoAgendada(data: InsertRevisaoAgendada): Promise<RevisaoAgendada>;
  getRevisoesAgendadas(empresaId: string, opts?: { status?: string; limit?: number }): Promise<RevisaoAgendada[]>;
  getRevisoesPendentesAteData(empresaId: string, dataIso: string): Promise<RevisaoAgendada[]>;
  updateRevisaoAgendada(id: string, empresaId: string, patch: Partial<InsertRevisaoAgendada> & { status?: string; concluidaEm?: Date | null }): Promise<RevisaoAgendada>;
  deleteRevisaoAgendada(id: string, empresaId: string): Promise<void>;

  // Task #289 — Resumos de ciclo (memória de longo prazo do Bizzy).
  // Imutáveis: nunca atualizar/excluir; novas versões são novas linhas.
  createResumoCiclo(data: InsertBizzyResumoCiclo): Promise<BizzyResumoCiclo>;
  getResumoCicloById(id: string, empresaId: string): Promise<BizzyResumoCiclo | undefined>;
  listResumosCicloByEmpresa(empresaId: string, limit?: number): Promise<BizzyResumoCiclo[]>;
  listResumosCicloByReferencia(empresaId: string, tipo: string, referenciaId: string | null, periodo?: string): Promise<BizzyResumoCiclo[]>;
  getProximaVersaoResumoCiclo(empresaId: string, tipo: string, referenciaId: string | null, periodo: string): Promise<number>;
}

export type ResetGrupo = "diagnostico" | "mapa" | "plano-acao" | "execucao" | "tudo";

function omitTenantFields<T extends Record<string, unknown>>(data: T): Omit<T, "empresaId" | "objetivoId"> {
  const result = { ...data };
  delete (result as Record<string, unknown>)["empresaId"];
  delete (result as Record<string, unknown>)["objetivoId"];
  return result as Omit<T, "empresaId" | "objetivoId">;
}

// Task #190 — sinaliza colisão do índice único parcial de plano agêntico
// ativo, para que a camada do agente apresente uma mensagem clara ao usuário.
export class PlanoAtivoJaExisteError extends Error {
  code = "PLANO_ATIVO_JA_EXISTE" as const;
  constructor(message = "Já existe um plano agêntico ativo para este usuário.") {
    super(message);
    this.name = "PlanoAtivoJaExisteError";
  }
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

  async updateUsuario(id: string, data: Partial<Pick<Usuario, "isAdmin" | "role" | "nome" | "fotoUrl">>): Promise<Usuario> {
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
    // Task #289 — quando o objetivo é encerrado, dispara um resumo de ciclo
    // (memória de longo prazo do Bizzy) em background. Falhas não bloqueiam.
    if (objetivo.encerrado === true) {
      import("./bizzy-resumos")
        .then(({ gerarResumoCiclo }) =>
          gerarResumoCiclo({
            empresaId,
            tipo: "objetivo",
            referenciaId: id,
            geradoPor: "hook_objetivo_encerrado",
          }),
        )
        .catch((err) => {
          console.warn("[RESUMO_CICLO] Hook objetivo encerrado falhou:", err?.message ?? err);
        });
    }
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

  async getResultadoChaveById(id: string, empresaId: string): Promise<ResultadoChave | undefined> {
    const result = await db
      .select({ resultadosChave })
      .from(resultadosChave)
      .innerJoin(objetivos, eq(resultadosChave.objetivoId, objetivos.id))
      .where(and(eq(resultadosChave.id, id), eq(objetivos.empresaId, empresaId)))
      .limit(1);
    return result[0]?.resultadosChave;
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
    const updated = await db.update(resultadosChave).set({ ...omitTenantFields(resultado), atualizadoEm: new Date() }).where(eq(resultadosChave.id, id)).returning();
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

  // Task #257 — Histórico de check-ins de KR
  async getKrCheckins(krId: string, empresaId: string): Promise<KrCheckin[]> {
    return db
      .select()
      .from(krCheckins)
      .where(and(eq(krCheckins.krId, krId), eq(krCheckins.empresaId, empresaId)))
      .orderBy(desc(krCheckins.createdAt));
  }

  async createKrCheckin(checkin: InsertKrCheckin): Promise<KrCheckin> {
    const result = await db.insert(krCheckins).values(checkin).returning();
    return result[0];
  }

  async getIndicadores(empresaId: string): Promise<Indicador[]> {
    return db.select().from(indicadores).where(eq(indicadores.empresaId, empresaId));
  }

  // Task #216 — Apenas indicadores de acompanhamento (BSC), excluindo
  // perspectiva "diagnostico". Use este helper em qualquer fluxo de
  // acompanhamento pós-planejamento (assistente, briefing, alertas, resumo
  // semanal, prompts que pedem para "atacar KPIs"). Para fluxos de
  // construção do planejamento (gerar diagnóstico, primeira jornada),
  // continue usando getIndicadores.
  async getIndicadoresAcompanhamento(empresaId: string): Promise<Indicador[]> {
    return db
      .select()
      .from(indicadores)
      .where(and(eq(indicadores.empresaId, empresaId), ne(indicadores.perspectiva, "diagnostico")));
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
    // Task #289 — após uma retrospectiva, dispara um resumo de ciclo do
    // objetivo associado em background (não bloqueia a resposta da rota).
    if (result[0]?.objetivoId && result[0]?.empresaId) {
      const empresaId = result[0].empresaId;
      const objetivoId = result[0].objetivoId;
      import("./bizzy-resumos")
        .then(({ gerarResumoCiclo }) =>
          gerarResumoCiclo({
            empresaId,
            tipo: "objetivo",
            referenciaId: objetivoId,
            geradoPor: "hook_retrospectiva",
          }),
        )
        .catch((err) => {
          console.warn("[RESUMO_CICLO] Hook retrospectiva falhou:", err?.message ?? err);
        });
    }
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
  async getRisco(id: string): Promise<Risco | undefined> {
    const result = await db.select().from(riscos).where(eq(riscos.id, id)).limit(1);
    return result[0];
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
  async getUltimoEnvioAlvo(usuarioId: string, tipoAlerta: string, alvoId: string): Promise<Date | null> {
    const r = await db.select().from(notificacaoEnvios)
      .where(and(
        eq(notificacaoEnvios.usuarioId, usuarioId),
        eq(notificacaoEnvios.tipoAlerta, tipoAlerta),
        eq(notificacaoEnvios.alvoId, alvoId),
      ))
      .orderBy(desc(notificacaoEnvios.enviadoEm))
      .limit(1);
    return r[0]?.enviadoEm ?? null;
  }
  async registrarEnvio(usuarioId: string, tipoAlerta: string, alvoId: string): Promise<void> {
    await db.insert(notificacaoEnvios).values({ usuarioId, tipoAlerta, alvoId });
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

  async getEstrategia(id: string): Promise<Estrategia | undefined> {
    const result = await db.select().from(estrategias).where(eq(estrategias.id, id));
    return result[0];
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

  async getEstrategiaContadores(estrategiaId: string, empresaId: string): Promise<{ iniciativas: number; okrs: number }> {
    const [iniciativasCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(iniciativas)
      .where(and(eq(iniciativas.estrategiaId, estrategiaId), eq(iniciativas.empresaId, empresaId)));
    const [okrsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(objetivos)
      .where(and(eq(objetivos.estrategiaId, estrategiaId), eq(objetivos.empresaId, empresaId)));
    return {
      iniciativas: iniciativasCount?.count ?? 0,
      okrs: okrsCount?.count ?? 0,
    };
  }

  async getEstrategiaVinculados(estrategiaId: string, empresaId: string): Promise<{
    iniciativas: Array<{ id: string; titulo: string; status: string; prioridade: string; progresso: number }>;
    okrs: Array<{ id: string; titulo: string; perspectiva: string; encerrado: boolean; progresso: number }>;
  }> {
    const statusProgresso: Record<string, number> = {
      planejada: 0,
      em_andamento: 50,
      concluida: 100,
      cancelada: 0,
    };

    const iniciativasRows = await db
      .select({ id: iniciativas.id, titulo: iniciativas.titulo, status: iniciativas.status, prioridade: iniciativas.prioridade })
      .from(iniciativas)
      .where(and(eq(iniciativas.estrategiaId, estrategiaId), eq(iniciativas.empresaId, empresaId)));

    const okrsRows = await db
      .select({ id: objetivos.id, titulo: objetivos.titulo, perspectiva: objetivos.perspectiva, encerrado: objetivos.encerrado })
      .from(objetivos)
      .where(and(eq(objetivos.estrategiaId, estrategiaId), eq(objetivos.empresaId, empresaId)));

    const okrIds = okrsRows.map(o => o.id);
    let krsRows: Array<{ objetivoId: string; valorInicial: string; valorAlvo: string; valorAtual: string }> = [];
    if (okrIds.length > 0) {
      krsRows = await db
        .select({ objetivoId: resultadosChave.objetivoId, valorInicial: resultadosChave.valorInicial, valorAlvo: resultadosChave.valorAlvo, valorAtual: resultadosChave.valorAtual })
        .from(resultadosChave)
        .where(inArray(resultadosChave.objetivoId, okrIds));
    }

    const okrsComProgresso = okrsRows.map(okr => {
      const krs = krsRows.filter(kr => kr.objetivoId === okr.id);
      let progresso = 0;
      if (okr.encerrado) {
        progresso = 100;
      } else if (krs.length > 0) {
        const soma = krs.reduce((acc, kr) => {
          const ini = parseFloat(kr.valorInicial);
          const alvo = parseFloat(kr.valorAlvo);
          const atual = parseFloat(kr.valorAtual);
          if (alvo === ini) return acc + (atual >= alvo ? 100 : 0);
          return acc + Math.min(100, Math.max(0, Math.round(((atual - ini) / (alvo - ini)) * 100)));
        }, 0);
        progresso = Math.round(soma / krs.length);
      }
      return { ...okr, encerrado: okr.encerrado ?? false, progresso };
    });

    return {
      iniciativas: iniciativasRows.map(ini => ({
        ...ini,
        progresso: statusProgresso[ini.status] ?? 0,
      })),
      okrs: okrsComProgresso,
    };
  }

  async getOportunidadesCrescimento(empresaId: string): Promise<OportunidadeCrescimento[]> {
    return db.select().from(oportunidadesCrescimento).where(eq(oportunidadesCrescimento.empresaId, empresaId));
  }

  async getOportunidadeCrescimento(id: string): Promise<OportunidadeCrescimento | undefined> {
    const r = await db.select().from(oportunidadesCrescimento).where(eq(oportunidadesCrescimento.id, id)).limit(1);
    return r[0];
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

  async getIniciativa(id: string): Promise<Iniciativa | undefined> {
    const r = await db.select().from(iniciativas).where(eq(iniciativas.id, id)).limit(1);
    return r[0];
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

  async dividirIniciativa(
    iniciativaId: string,
    empresaId: string,
    filhas: Array<Partial<InsertIniciativa> & { titulo: string; descricao: string; prazo: string }>,
    notaEncerramento: string,
  ): Promise<{ mae: Iniciativa; filhas: Iniciativa[] }> {
    return await db.transaction(async (tx) => {
      const maeRows = await tx.select().from(iniciativas)
        .where(and(eq(iniciativas.id, iniciativaId), eq(iniciativas.empresaId, empresaId)))
        .limit(1);
      const mae = maeRows[0];
      if (!mae) throw new Error("Iniciativa não encontrada nesta empresa.");
      const statusAtual = (mae.status ?? "").toLowerCase();
      if (mae.encerradaEm || ["concluida", "concluída", "cancelada", "encerrada"].includes(statusAtual)) {
        throw new Error("Iniciativa já está encerrada e não pode ser dividida.");
      }
      const novasInsert = filhas.map((f) => ({
        empresaId,
        titulo: f.titulo,
        descricao: f.descricao,
        prazo: f.prazo,
        // Task #268 — propaga prazo calendarizado quando a tool informar.
        prazoData: f.prazoData ?? null,
        status: f.status ?? "planejada",
        prioridade: f.prioridade ?? mae.prioridade ?? "média",
        responsavel: f.responsavel ?? mae.responsavel ?? "",
        responsavelId: f.responsavelId ?? mae.responsavelId ?? null,
        impacto: f.impacto ?? mae.impacto ?? "",
        estrategiaId: f.estrategiaId ?? mae.estrategiaId ?? null,
        oportunidadeId: f.oportunidadeId ?? mae.oportunidadeId ?? null,
        indicadorFonteId: f.indicadorFonteId ?? mae.indicadorFonteId ?? null,
      })) as InsertIniciativa[];
      const inseridas = await tx.insert(iniciativas).values(novasInsert).returning();
      const maeAtualizada = await tx.update(iniciativas)
        .set({
          status: "cancelada",
          notaEncerramento,
          encerradaEm: new Date(),
        })
        .where(and(eq(iniciativas.id, iniciativaId), eq(iniciativas.empresaId, empresaId)))
        .returning();
      if (!maeAtualizada[0]) throw new Error("Falha ao encerrar iniciativa-mãe.");
      return { mae: maeAtualizada[0], filhas: inseridas };
    });
  }

  // Task #288 — Repriorização em lote: aplica `ordem` (1-based, na ordem do array)
  // a cada iniciativa pertencente à empresa. IDs ausentes são ignorados; IDs
  // duplicados ou de outra empresa lançam erro antes de qualquer escrita.
  async repriorizarIniciativas(empresaId: string, idsOrdenados: string[]): Promise<Iniciativa[]> {
    if (!Array.isArray(idsOrdenados) || idsOrdenados.length === 0) return [];
    const setIds = new Set(idsOrdenados);
    if (setIds.size !== idsOrdenados.length) {
      throw new Error("Lista de IDs contém duplicatas — repriorização abortada.");
    }
    return await db.transaction(async (tx) => {
      const linhas = await tx.select({ id: iniciativas.id }).from(iniciativas)
        .where(and(eq(iniciativas.empresaId, empresaId), inArray(iniciativas.id, idsOrdenados)));
      const validos = new Set(linhas.map((l) => l.id));
      const faltantes = idsOrdenados.filter((id) => !validos.has(id));
      if (faltantes.length > 0) {
        throw new Error(`Iniciativa(s) não pertencem a esta empresa: ${faltantes.join(", ")}`);
      }
      const atualizadas: Iniciativa[] = [];
      for (let i = 0; i < idsOrdenados.length; i++) {
        const [row] = await tx.update(iniciativas)
          .set({ ordem: i + 1 })
          .where(and(eq(iniciativas.id, idsOrdenados[i]), eq(iniciativas.empresaId, empresaId)))
          .returning();
        if (row) atualizadas.push(row);
      }
      return atualizadas;
    });
  }

  async repriorizarEstrategias(empresaId: string, idsOrdenados: string[]): Promise<Estrategia[]> {
    if (!Array.isArray(idsOrdenados) || idsOrdenados.length === 0) return [];
    const setIds = new Set(idsOrdenados);
    if (setIds.size !== idsOrdenados.length) {
      throw new Error("Lista de IDs contém duplicatas — repriorização abortada.");
    }
    return await db.transaction(async (tx) => {
      const linhas = await tx.select({ id: estrategias.id }).from(estrategias)
        .where(and(eq(estrategias.empresaId, empresaId), inArray(estrategias.id, idsOrdenados)));
      const validos = new Set(linhas.map((l) => l.id));
      const faltantes = idsOrdenados.filter((id) => !validos.has(id));
      if (faltantes.length > 0) {
        throw new Error(`Estratégia(s) não pertencem a esta empresa: ${faltantes.join(", ")}`);
      }
      const atualizadas: Estrategia[] = [];
      for (let i = 0; i < idsOrdenados.length; i++) {
        const [row] = await tx.update(estrategias)
          .set({ ordem: i + 1 })
          .where(and(eq(estrategias.id, idsOrdenados[i]), eq(estrategias.empresaId, empresaId)))
          .returning();
        if (row) atualizadas.push(row);
      }
      return atualizadas;
    });
  }

  // Task #288 — Arquivamento de objetivo: marca `encerrado=true`. O motivo
  // fica registrado no proposta_log (parametros + resultado) — não há
  // campo dedicado na tabela. Tools chamadoras podem optar por anexar o
  // motivo à descrição se o usuário quiser persistência longa.
  async arquivarObjetivo(id: string, empresaId: string, motivo: string): Promise<Objetivo> {
    const motivoLimpo = (motivo ?? "").trim();
    const data = new Date().toISOString().slice(0, 10);
    return await db.transaction(async (tx) => {
      const [obj] = await tx.select().from(objetivos)
        .where(and(eq(objetivos.id, id), eq(objetivos.empresaId, empresaId)))
        .limit(1);
      if (!obj) throw new Error("Objetivo não encontrado nesta empresa.");
      if (obj.encerrado) throw new Error("Objetivo já está arquivado.");
      const novaDescricao = motivoLimpo
        ? `${obj.descricao ? obj.descricao + "\n\n" : ""}[Arquivado em ${data}] ${motivoLimpo}`
        : obj.descricao ?? "";
      const [updated] = await tx.update(objetivos)
        .set({ encerrado: true, descricao: novaDescricao })
        .where(and(eq(objetivos.id, id), eq(objetivos.empresaId, empresaId)))
        .returning();
      if (!updated) throw new Error("Falha ao arquivar objetivo.");
      return updated;
    });
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

  async getConfiguracoesIA(): Promise<{ modeloPadrao: string; modeloRelatorios: string; modeloBusca: string; modeloPadraoStart: string; modeloRelatoriosStart: string; modeloBuscaStart: string; modeloPadraoProEnt: string; modeloRelatoriosProEnt: string; modeloBuscaProEnt: string }> {
    const result = await db.select().from(configuracoesIa).where(eq(configuracoesIa.id, 1)).limit(1);
    if (!result[0]) {
      // The startup migration seeds this row — if it's missing the DB setup failed
      throw new Error("configuracoes_ia row (id=1) not found — verify startup migration ran");
    }
    return {
      modeloPadrao:          result[0].modeloPadrao,
      modeloRelatorios:      result[0].modeloRelatorios,
      modeloBusca:           result[0].modeloBusca,
      modeloPadraoStart:     result[0].modeloPadraoStart,
      modeloRelatoriosStart: result[0].modeloRelatoriosStart,
      modeloBuscaStart:      result[0].modeloBuscaStart,
      modeloPadraoProEnt:    result[0].modeloPadraoProEnt,
      modeloRelatoriosProEnt:result[0].modeloRelatoriosProEnt,
      modeloBuscaProEnt:     result[0].modeloBuscaProEnt,
    };
  }

  async upsertConfiguracoesIA(config: { modeloPadrao?: string; modeloRelatorios?: string; modeloBusca?: string; modeloPadraoStart?: string; modeloRelatoriosStart?: string; modeloBuscaStart?: string; modeloPadraoProEnt?: string; modeloRelatoriosProEnt?: string; modeloBuscaProEnt?: string }): Promise<{ modeloPadrao: string; modeloRelatorios: string; modeloBusca: string; modeloPadraoStart: string; modeloRelatoriosStart: string; modeloBuscaStart: string; modeloPadraoProEnt: string; modeloRelatoriosProEnt: string; modeloBuscaProEnt: string }> {
    const defaults = await this.getConfiguracoesIA();
    const merged = {
      modeloPadrao:           config.modeloPadrao           ?? defaults.modeloPadrao,
      modeloRelatorios:       config.modeloRelatorios       ?? defaults.modeloRelatorios,
      modeloBusca:            config.modeloBusca            ?? defaults.modeloBusca,
      modeloPadraoStart:      config.modeloPadraoStart      ?? defaults.modeloPadraoStart,
      modeloRelatoriosStart:  config.modeloRelatoriosStart  ?? defaults.modeloRelatoriosStart,
      modeloBuscaStart:       config.modeloBuscaStart       ?? defaults.modeloBuscaStart,
      modeloPadraoProEnt:     config.modeloPadraoProEnt     ?? defaults.modeloPadraoProEnt,
      modeloRelatoriosProEnt: config.modeloRelatoriosProEnt ?? defaults.modeloRelatoriosProEnt,
      modeloBuscaProEnt:      config.modeloBuscaProEnt      ?? defaults.modeloBuscaProEnt,
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

  async incrementSearchUsage(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    await db
      .insert(googleSearchUsage)
      .values({ date: today, count: 1 })
      .onConflictDoUpdate({
        target: googleSearchUsage.date,
        set: { count: sql`${googleSearchUsage.count} + 1` },
      });
  }

  async getSearchUsageThisMonth(): Promise<number> {
    const now = new Date();
    const month = now.toISOString().slice(0, 7); // YYYY-MM UTC
    const rows = await db
      .select()
      .from(googleSearchUsage)
      .where(sql`${googleSearchUsage.date} LIKE ${month + "-%"}`);
    return rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  }

  async getDiagnosticoIASalvo(empresaId: string): Promise<DiagnosticoIASalvo | null> {
    const rows = await db.select().from(diagnosticoIaSalvo).where(eq(diagnosticoIaSalvo.empresaId, empresaId)).limit(1);
    return rows[0] ?? null;
  }

  async saveDiagnosticoIASalvo(empresaId: string, payload: string): Promise<void> {
    await db
      .insert(diagnosticoIaSalvo)
      .values({ empresaId, payload, geradoEm: new Date() })
      .onConflictDoUpdate({
        target: diagnosticoIaSalvo.empresaId,
        set: { payload, geradoEm: new Date() },
      });
  }

  async getConfigSistema(): Promise<ConfigSistema | null> {
    const rows = await db.select().from(configSistema).where(eq(configSistema.id, 1)).limit(1);
    return rows[0] ?? null;
  }

  async getPrecosLandingPlanos(): Promise<PrecoLandingPlano[]> {
    return db.select().from(precosLandingPlanos);
  }

  async upsertPrecoLandingPlano(
    plano: string,
    data: Partial<Omit<PrecoLandingPlano, "plano" | "atualizadoEm">>,
  ): Promise<PrecoLandingPlano> {
    const setData: Record<string, unknown> = { ...data, atualizadoEm: new Date() };
    await db
      .insert(precosLandingPlanos)
      .values({
        plano,
        precoCentavos: data.precoCentavos ?? 0,
        promocaoAtiva: data.promocaoAtiva ?? false,
        precoPromocionalCentavos: data.precoPromocionalCentavos ?? null,
        promocaoFimEm: data.promocaoFimEm ?? null,
      } as any)
      .onConflictDoUpdate({
        target: precosLandingPlanos.plano,
        set: setData as any,
      });
    const rows = await db.select().from(precosLandingPlanos).where(eq(precosLandingPlanos.plano, plano)).limit(1);
    return rows[0]!;
  }

  async resetDadosEmpresa(empresaId: string, grupo: ResetGrupo): Promise<{ tabelas: string[] }> {
    const tabelas: string[] = [];

    // Execução atômica via transação: tudo ou nada — evita estado parcialmente apagado.
    await db.transaction(async (tx) => {
      const wipeDiagnostico = async () => {
        await tx.delete(indicadores).where(and(eq(indicadores.empresaId, empresaId), eq(indicadores.perspectiva, "diagnostico")));
        await tx.delete(diagnosticoIaSalvo).where(eq(diagnosticoIaSalvo.empresaId, empresaId));
        tabelas.push("indicadores_diagnostico", "diagnostico_ia_salvo");
      };

      const wipeMapa = async () => {
        await tx.delete(modeloNegocio).where(eq(modeloNegocio.empresaId, empresaId));
        await tx.delete(fatoresPestel).where(eq(fatoresPestel.empresaId, empresaId));
        await tx.delete(cincoForcas).where(eq(cincoForcas.empresaId, empresaId));
        await tx.delete(analiseSwot).where(eq(analiseSwot.empresaId, empresaId));
        tabelas.push("modelo_negocio", "fatores_pestel", "cinco_forcas", "analise_swot");
      };

      const wipePlanoAcao = async () => {
        await tx.delete(iniciativas).where(eq(iniciativas.empresaId, empresaId));
        await tx.delete(oportunidadesCrescimento).where(eq(oportunidadesCrescimento.empresaId, empresaId));
        await tx.delete(estrategias).where(eq(estrategias.empresaId, empresaId));
        tabelas.push("iniciativas", "oportunidades_crescimento", "estrategias");
      };

      const wipeExecucao = async () => {
        await tx.delete(retrospectivas).where(eq(retrospectivas.empresaId, empresaId));
        // resultados_chave cascateiam ao apagar objetivos (FK onDelete: cascade)
        await tx.delete(objetivos).where(eq(objetivos.empresaId, empresaId));
        const indicadoresBsc = await tx.select({ id: indicadores.id }).from(indicadores)
          .where(and(eq(indicadores.empresaId, empresaId), sql`${indicadores.perspectiva} <> 'diagnostico'`));
        const ids = indicadoresBsc.map((i) => i.id);
        if (ids.length > 0) {
          await tx.delete(kpiLeituras).where(inArray(kpiLeituras.indicadorId, ids));
        }
        await tx.delete(indicadores).where(and(eq(indicadores.empresaId, empresaId), sql`${indicadores.perspectiva} <> 'diagnostico'`));
        await tx.delete(bscRelacoes).where(eq(bscRelacoes.empresaId, empresaId));
        await tx.delete(rituais).where(eq(rituais.empresaId, empresaId));
        await tx.delete(eventos).where(eq(eventos.empresaId, empresaId));
        await tx.delete(riscos).where(eq(riscos.empresaId, empresaId));
        await tx.delete(cenarios).where(eq(cenarios.empresaId, empresaId));
        tabelas.push(
          "retrospectivas",
          "resultados_chave",
          "objetivos",
          "kpi_leituras",
          "indicadores_bsc",
          "bsc_relacoes",
          "rituais",
          "eventos",
          "riscos",
          "cenarios",
        );
      };

      if (grupo === "diagnostico") await wipeDiagnostico();
      else if (grupo === "mapa") await wipeMapa();
      else if (grupo === "plano-acao") await wipePlanoAcao();
      else if (grupo === "execucao") await wipeExecucao();
      else if (grupo === "tudo") {
        // Ordem: execução → plano-ação → mapa → diagnóstico.
        await wipeExecucao();
        await wipePlanoAcao();
        await wipeMapa();
        await wipeDiagnostico();
      } else {
        throw new Error("Grupo de reset inválido");
      }
    });

    return { tabelas };
  }

  async upsertConfigSistema(data: Partial<Omit<ConfigSistema, "id" | "atualizadoEm">>): Promise<ConfigSistema> {
    await db
      .insert(configSistema)
      .values({ id: 1, ...data as any, atualizadoEm: new Date() })
      .onConflictDoUpdate({
        target: configSistema.id,
        set: { ...data, atualizadoEm: new Date() },
      });
    const rows = await db.select().from(configSistema).where(eq(configSistema.id, 1)).limit(1);
    return rows[0]!;
  }

  // ── Task #182 — Briefing diário ──
  async getBriefingDiario(empresaId: string, data: string): Promise<BriefingDiario | undefined> {
    const rows = await db
      .select()
      .from(briefingDiario)
      .where(and(eq(briefingDiario.empresaId, empresaId), eq(briefingDiario.data, data)))
      .limit(1);
    return rows[0];
  }

  async upsertBriefingDiario(
    empresaId: string,
    data: string,
    conteudo: unknown,
    fonte: "ia" | "regra"
  ): Promise<BriefingDiario> {
    // Upsert atômico via ON CONFLICT no índice único (empresa_id, data) —
    // evita corrida quando o endpoint on-demand e o scheduler diário rodam
    // ao mesmo tempo para a mesma empresa.
    const inserted = await db
      .insert(briefingDiario)
      .values({ empresaId, data, conteudo: conteudo as object, fonte })
      .onConflictDoUpdate({
        target: [briefingDiario.empresaId, briefingDiario.data],
        set: { conteudo: conteudo as object, fonte, geradoEm: new Date() },
      })
      .returning();
    return inserted[0]!;
  }

  async purgeBriefingsAntigos(diasMantidos: number): Promise<number> {
    const limite = new Date(Date.now() - diasMantidos * 24 * 60 * 60 * 1000);
    const removed = await db
      .delete(briefingDiario)
      .where(lt(briefingDiario.geradoEm, limite))
      .returning({ id: briefingDiario.id });
    await db
      .delete(briefingDiarioLogs)
      .where(lt(briefingDiarioLogs.executadoEm, limite));
    return removed.length;
  }

  async addBriefingDiarioLog(log: InsertBriefingDiarioLog): Promise<void> {
    await db.insert(briefingDiarioLogs).values(log);
  }

  // ───── Task #188 — Propostas do Assistente ─────
  async createPropostaLog(input: InsertAssistenteAcaoLog): Promise<AssistenteAcaoLog> {
    const [row] = await db.insert(assistenteAcaoLog).values(input).returning();
    return row;
  }

  async getPropostaLog(id: string): Promise<AssistenteAcaoLog | undefined> {
    const [row] = await db.select().from(assistenteAcaoLog).where(eq(assistenteAcaoLog.id, id)).limit(1);
    return row;
  }

  async updatePropostaLog(
    id: string,
    patch: Partial<Pick<AssistenteAcaoLog, "status" | "resultado" | "mensagemErro" | "parametros" | "preview" | "resolvidoEm" | "entidadeTipo" | "entidadeId">>
  ): Promise<AssistenteAcaoLog> {
    const [row] = await db.update(assistenteAcaoLog).set(patch).where(eq(assistenteAcaoLog.id, id)).returning();
    return row;
  }

  async listPropostasByEmpresa(empresaId: string, limite = 50): Promise<AssistenteAcaoLog[]> {
    return db
      .select()
      .from(assistenteAcaoLog)
      .where(eq(assistenteAcaoLog.empresaId, empresaId))
      .orderBy(desc(assistenteAcaoLog.criadoEm))
      .limit(limite);
  }

  // Reserva atomicamente uma proposta `proposta` para execução: vira `confirmada`.
  // Em caso de falha do apply o caller transiciona explicitamente para `falhou`.
  // Retorna a linha se conseguiu reservar; null se já estava em outro estado
  // (evita corrida em duplo-clique no botão Confirmar).
  async claimPropostaPendente(id: string, empresaId: string): Promise<AssistenteAcaoLog | null> {
    const [row] = await db
      .update(assistenteAcaoLog)
      .set({ status: "confirmada" })
      .where(
        and(
          eq(assistenteAcaoLog.id, id),
          eq(assistenteAcaoLog.empresaId, empresaId),
          eq(assistenteAcaoLog.status, "proposta")
        )
      )
      .returning();
    return row ?? null;
  }

  async listPropostasByIds(ids: string[]): Promise<AssistenteAcaoLog[]> {
    if (ids.length === 0) return [];
    return db.select().from(assistenteAcaoLog).where(inArray(assistenteAcaoLog.id, ids));
  }

  // ─── Task #189 — Planos agênticos ───
  async createPlanoAgentico(
    plano: InsertPlanoAgentico,
    passos: Array<Omit<InsertPlanoAgenticoPasso, "planoId" | "empresaId">>,
  ): Promise<{ plano: PlanoAgentico; passos: PlanoAgenticoPasso[] }> {
    // Atomicidade: INSERT do plano + INSERT dos passos numa única transação,
    // eliminando na origem o cenário "count(passos) != totalPassos" que o
    // self-healing (Task #194) só conseguia detectar 15 min depois.
    // O avanço de passo (avancarPlanoAgenticoPorProposta) continua sem
    // transação porque envolve chamada LLM no meio — o self-healing segue
    // sendo a rede de proteção daquele caminho.
    try {
      const resultado = await db.transaction(async (tx) => {
        const [planoRow] = await tx
          .insert(planoAgentico)
          .values({ ...plano, totalPassos: passos.length })
          .returning();
        const inseridos: PlanoAgenticoPasso[] = [];
        for (const p of passos) {
          const [row] = await tx
            .insert(planoAgenticoPasso)
            .values({ ...p, planoId: planoRow.id, empresaId: planoRow.empresaId })
            .returning();
          inseridos.push(row);
        }
        return { plano: planoRow, passos: inseridos };
      });
      console.info("[PLANO-AGENTICO]", {
        acao: "criar_plano_sucesso",
        planoId: resultado.plano.id,
        empresaId: resultado.plano.empresaId,
        usuarioId: resultado.plano.usuarioId ?? null,
        totalPassosEsperado: passos.length,
        totalPassosPersistidos: resultado.passos.length,
      });
      return resultado;
    } catch (err: any) {
      // Task #190 — colisão com índice único parcial (status='ativo').
      // Pode ocorrer em concorrência: dois pedidos tentam criar plano ativo
      // ao mesmo tempo para o mesmo (empresa, usuário).
      if (err?.code === "23505" && String(err?.constraint ?? "").includes("plano_agentico_unico_ativo")) {
        console.warn("[PLANO-AGENTICO]", {
          acao: "criar_plano_falha_duplicado",
          empresaId: plano.empresaId,
          usuarioId: plano.usuarioId ?? null,
          totalPassosEsperado: passos.length,
        });
        throw new PlanoAtivoJaExisteError();
      }
      console.error("[PLANO-AGENTICO]", {
        acao: "criar_plano_falha",
        empresaId: plano.empresaId,
        usuarioId: plano.usuarioId ?? null,
        totalPassosEsperado: passos.length,
        erro: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async getPlanoAgentico(id: string): Promise<PlanoAgentico | undefined> {
    const [row] = await db.select().from(planoAgentico).where(eq(planoAgentico.id, id)).limit(1);
    return row;
  }

  async getPlanoAgenticoComPassos(id: string) {
    const plano = await this.getPlanoAgentico(id);
    if (!plano) return undefined;
    const passos = await this.listPassosByPlano(id);
    return { plano, passos };
  }

  async listPlanosAgenticosByEmpresa(empresaId: string, opts: { status?: string; limite?: number } = {}) {
    const limite = opts.limite ?? 50;
    const where = opts.status
      ? and(eq(planoAgentico.empresaId, empresaId), eq(planoAgentico.status, opts.status))
      : eq(planoAgentico.empresaId, empresaId);
    return db.select().from(planoAgentico).where(where).orderBy(desc(planoAgentico.criadoEm)).limit(limite);
  }

  async getPlanoAtivoEmpresaUsuario(empresaId: string, usuarioId: string | null): Promise<PlanoAgentico | undefined> {
    // Plano ativo é visível para o usuário se for dele ou compartilhado
    // (usuarioId IS NULL). Quando usuarioId não é informado, retorna apenas
    // os planos compartilhados da empresa.
    const cond = usuarioId
      ? and(
          eq(planoAgentico.empresaId, empresaId),
          eq(planoAgentico.status, "ativo"),
          or(isNull(planoAgentico.usuarioId), eq(planoAgentico.usuarioId, usuarioId)),
        )
      : and(
          eq(planoAgentico.empresaId, empresaId),
          eq(planoAgentico.status, "ativo"),
          isNull(planoAgentico.usuarioId),
        );
    const [row] = await db.select().from(planoAgentico).where(cond).orderBy(desc(planoAgentico.criadoEm)).limit(1);
    return row;
  }

  async getPlanoAtivoEmpresaDeOutros(
    empresaId: string,
    usuarioId: string | null,
  ): Promise<{ plano: PlanoAgentico; donoNome: string | null; donoId: string | null } | undefined> {
    // Plano ativo da empresa cujo dono NÃO seja o usuário corrente.
    // Inclui compartilhados (usuarioId IS NULL) — nesse caso donoNome é null.
    // Quando usuarioId é null (sessão sem usuário), considera "outros" = qualquer
    // plano com dono específico (não compartilhado).
    const cond = usuarioId
      ? and(
          eq(planoAgentico.empresaId, empresaId),
          eq(planoAgentico.status, "ativo"),
          or(
            isNull(planoAgentico.usuarioId),
            sql`${planoAgentico.usuarioId} <> ${usuarioId}`,
          ),
        )
      : and(
          eq(planoAgentico.empresaId, empresaId),
          eq(planoAgentico.status, "ativo"),
          sql`${planoAgentico.usuarioId} IS NOT NULL`,
        );
    const rows = await db
      .select({
        plano: planoAgentico,
        donoNome: usuarios.nome,
      })
      .from(planoAgentico)
      .leftJoin(usuarios, eq(usuarios.id, planoAgentico.usuarioId))
      .where(cond)
      .orderBy(desc(planoAgentico.criadoEm))
      .limit(1);
    if (rows.length === 0) return undefined;
    const row = rows[0];
    return {
      plano: row.plano,
      donoNome: row.plano.usuarioId ? row.donoNome ?? null : null,
      donoId: row.plano.usuarioId ?? null,
    };
  }

  async updatePlanoAgentico(
    id: string,
    patch: Partial<Pick<PlanoAgentico, "status" | "passoAtual" | "finalizadoEm" | "totalPassos">>,
  ): Promise<PlanoAgentico> {
    const [row] = await db
      .update(planoAgentico)
      .set({ ...patch, atualizadoEm: new Date() })
      .where(eq(planoAgentico.id, id))
      .returning();
    return row;
  }

  async updatePlanoAgenticoPasso(
    id: string,
    patch: Partial<Pick<PlanoAgenticoPasso, "status" | "propostaId" | "resultadoResumo" | "resolvidoEm">>,
  ): Promise<PlanoAgenticoPasso> {
    const [row] = await db.update(planoAgenticoPasso).set(patch).where(eq(planoAgenticoPasso.id, id)).returning();
    return row;
  }

  async getPassoByPropostaId(propostaId: string): Promise<PlanoAgenticoPasso | undefined> {
    const [row] = await db
      .select()
      .from(planoAgenticoPasso)
      .where(eq(planoAgenticoPasso.propostaId, propostaId))
      .limit(1);
    return row;
  }

  async getPassoByPlanoOrdem(planoId: string, ordem: number): Promise<PlanoAgenticoPasso | undefined> {
    const [row] = await db
      .select()
      .from(planoAgenticoPasso)
      .where(and(eq(planoAgenticoPasso.planoId, planoId), eq(planoAgenticoPasso.ordem, ordem)))
      .limit(1);
    return row;
  }

  async listPassosByPlano(planoId: string): Promise<PlanoAgenticoPasso[]> {
    return db
      .select()
      .from(planoAgenticoPasso)
      .where(eq(planoAgenticoPasso.planoId, planoId))
      .orderBy(planoAgenticoPasso.ordem);
  }

  // ── Task #221 — Memória persistente do Assistente ──
  async criarConversa(input: InsertAssistenteConversa): Promise<AssistenteConversa> {
    const [row] = await db.insert(assistenteConversas).values(input).returning();
    return row;
  }

  async getConversa(id: string): Promise<AssistenteConversa | undefined> {
    const [row] = await db.select().from(assistenteConversas).where(eq(assistenteConversas.id, id)).limit(1);
    return row;
  }

  async getConversaAtiva(
    empresaId: string,
    usuarioId: string | null,
    janelaHoras: number = 12,
  ): Promise<AssistenteConversa | undefined> {
    const cutoff = new Date(Date.now() - janelaHoras * 60 * 60 * 1000);
    const cond = and(
      eq(assistenteConversas.empresaId, empresaId),
      isNull(assistenteConversas.encerradaEm),
      sql`${assistenteConversas.ultimaInteracaoEm} >= ${cutoff}`,
      usuarioId
        ? or(isNull(assistenteConversas.usuarioId), eq(assistenteConversas.usuarioId, usuarioId))
        : isNull(assistenteConversas.usuarioId),
    );
    const [row] = await db
      .select()
      .from(assistenteConversas)
      .where(cond)
      .orderBy(desc(assistenteConversas.ultimaInteracaoEm))
      .limit(1);
    return row;
  }

  async encerrarConversa(id: string): Promise<void> {
    await db
      .update(assistenteConversas)
      .set({ encerradaEm: new Date() })
      .where(eq(assistenteConversas.id, id));
  }

  async appendMensagem(input: InsertAssistenteMensagem): Promise<AssistenteMensagem> {
    const [row] = await db.insert(assistenteMensagens).values(input).returning();
    await db
      .update(assistenteConversas)
      .set({ ultimaInteracaoEm: new Date() })
      .where(eq(assistenteConversas.id, input.conversaId));
    return row;
  }

  async getMensagens(conversaId: string, limit: number = 30): Promise<AssistenteMensagem[]> {
    const rows = await db
      .select()
      .from(assistenteMensagens)
      .where(eq(assistenteMensagens.conversaId, conversaId))
      .orderBy(desc(assistenteMensagens.criadaEm))
      .limit(limit);
    return rows.reverse();
  }

  async countMensagensUsuario(conversaId: string): Promise<number> {
    const rows = await db
      .select({ id: assistenteMensagens.id })
      .from(assistenteMensagens)
      .where(and(eq(assistenteMensagens.conversaId, conversaId), eq(assistenteMensagens.role, "user")));
    return rows.length;
  }

  async getMensagemById(id: string): Promise<AssistenteMensagem | undefined> {
    const [row] = await db.select().from(assistenteMensagens).where(eq(assistenteMensagens.id, id)).limit(1);
    return row;
  }

  async upsertMemoria(
    empresaId: string,
    fato: string,
    categoria: string,
    fonteMensagemId: string | null,
  ): Promise<AssistenteMemoria> {
    const [row] = await db
      .insert(assistenteMemoria)
      .values({ empresaId, fato, categoria, fonteMensagemId })
      .returning();
    return row;
  }

  async getMemoriaAtiva(empresaId: string, limit: number = 20): Promise<AssistenteMemoria[]> {
    return db
      .select()
      .from(assistenteMemoria)
      .where(and(eq(assistenteMemoria.empresaId, empresaId), eq(assistenteMemoria.ativo, true)))
      .orderBy(desc(assistenteMemoria.criadoEm))
      .limit(limit);
  }

  async getMemoriaTodas(empresaId: string, limit: number = 100): Promise<AssistenteMemoria[]> {
    return db
      .select()
      .from(assistenteMemoria)
      .where(eq(assistenteMemoria.empresaId, empresaId))
      .orderBy(desc(assistenteMemoria.criadoEm))
      .limit(limit);
  }

  async getMemoriaById(id: string, empresaId: string): Promise<AssistenteMemoria | undefined> {
    const [row] = await db
      .select()
      .from(assistenteMemoria)
      .where(and(eq(assistenteMemoria.id, id), eq(assistenteMemoria.empresaId, empresaId)))
      .limit(1);
    return row;
  }

  async setMemoriaAtivo(
    id: string,
    empresaId: string,
    ativo: boolean,
  ): Promise<AssistenteMemoria | undefined> {
    const [row] = await db
      .update(assistenteMemoria)
      .set({ ativo })
      .where(and(eq(assistenteMemoria.id, id), eq(assistenteMemoria.empresaId, empresaId)))
      .returning();
    return row;
  }

  // ── Task #233 — Rituais de gestão ──────────────────────────────────
  async createReuniaoPauta(data: InsertReuniaoPauta): Promise<ReuniaoPauta> {
    const [row] = await db.insert(reuniaoPautas).values(data).returning();
    return row;
  }
  async getReuniaoPauta(id: string, empresaId: string): Promise<ReuniaoPauta | undefined> {
    const [row] = await db.select().from(reuniaoPautas)
      .where(and(eq(reuniaoPautas.id, id), eq(reuniaoPautas.empresaId, empresaId))).limit(1);
    return row;
  }
  async getReuniaoPautas(empresaId: string, limit = 50): Promise<ReuniaoPauta[]> {
    return db.select().from(reuniaoPautas)
      .where(eq(reuniaoPautas.empresaId, empresaId))
      .orderBy(desc(reuniaoPautas.geradaEm))
      .limit(limit);
  }
  async setReuniaoPautaAta(pautaId: string, empresaId: string, ataId: string | null): Promise<void> {
    await db.update(reuniaoPautas).set({ ataId })
      .where(and(eq(reuniaoPautas.id, pautaId), eq(reuniaoPautas.empresaId, empresaId)));
  }
  async createReuniaoAta(data: InsertReuniaoAta): Promise<ReuniaoAta> {
    const [row] = await db.insert(reuniaoAtas).values(data).returning();
    return row;
  }
  async getReuniaoAta(id: string, empresaId: string): Promise<ReuniaoAta | undefined> {
    const [row] = await db.select().from(reuniaoAtas)
      .where(and(eq(reuniaoAtas.id, id), eq(reuniaoAtas.empresaId, empresaId))).limit(1);
    return row;
  }
  async getReuniaoAtas(empresaId: string, limit = 50): Promise<ReuniaoAta[]> {
    return db.select().from(reuniaoAtas)
      .where(eq(reuniaoAtas.empresaId, empresaId))
      .orderBy(desc(reuniaoAtas.registradaEm))
      .limit(limit);
  }
  async createDecisaoEstrategica(data: InsertDecisaoEstrategica): Promise<DecisaoEstrategica> {
    const [row] = await db.insert(decisoesEstrategicas).values(data).returning();
    return row;
  }
  async getDecisoesEstrategicas(empresaId: string, limit = 100): Promise<DecisaoEstrategica[]> {
    return db.select().from(decisoesEstrategicas)
      .where(eq(decisoesEstrategicas.empresaId, empresaId))
      .orderBy(desc(decisoesEstrategicas.registradaEm))
      .limit(limit);
  }
  async updateDecisaoEstrategica(
    id: string,
    empresaId: string,
    patch: Partial<InsertDecisaoEstrategica>,
  ): Promise<DecisaoEstrategica> {
    const [row] = await db.update(decisoesEstrategicas)
      .set(omitTenantFields(patch as Record<string, unknown>) as any)
      .where(and(eq(decisoesEstrategicas.id, id), eq(decisoesEstrategicas.empresaId, empresaId)))
      .returning();
    if (!row) throw new Error("Decisão não encontrada ou acesso negado");
    return row;
  }
  async deleteDecisaoEstrategica(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(decisoesEstrategicas)
      .where(and(eq(decisoesEstrategicas.id, id), eq(decisoesEstrategicas.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Decisão não encontrada ou acesso negado");
  }
  async createRevisaoAgendada(data: InsertRevisaoAgendada): Promise<RevisaoAgendada> {
    const [row] = await db.insert(revisoesAgendadas).values(data).returning();
    return row;
  }
  async getRevisoesAgendadas(empresaId: string, opts: { status?: string; limit?: number } = {}): Promise<RevisaoAgendada[]> {
    const where = opts.status
      ? and(eq(revisoesAgendadas.empresaId, empresaId), eq(revisoesAgendadas.status, opts.status))
      : eq(revisoesAgendadas.empresaId, empresaId);
    return db.select().from(revisoesAgendadas).where(where)
      .orderBy(desc(revisoesAgendadas.dataAlvo))
      .limit(opts.limit ?? 100);
  }
  async getRevisoesPendentesAteData(empresaId: string, dataIso: string): Promise<RevisaoAgendada[]> {
    return db.select().from(revisoesAgendadas)
      .where(and(
        eq(revisoesAgendadas.empresaId, empresaId),
        eq(revisoesAgendadas.status, "pendente"),
        sql`${revisoesAgendadas.dataAlvo} <= ${dataIso}`,
      ))
      .orderBy(revisoesAgendadas.dataAlvo);
  }
  async updateRevisaoAgendada(
    id: string,
    empresaId: string,
    patch: Partial<InsertRevisaoAgendada> & { status?: string; concluidaEm?: Date | null },
  ): Promise<RevisaoAgendada> {
    const [row] = await db.update(revisoesAgendadas).set(omitTenantFields(patch as Record<string, unknown>) as any)
      .where(and(eq(revisoesAgendadas.id, id), eq(revisoesAgendadas.empresaId, empresaId)))
      .returning();
    if (!row) throw new Error("Revisão não encontrada ou acesso negado");
    return row;
  }
  async deleteRevisaoAgendada(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(revisoesAgendadas)
      .where(and(eq(revisoesAgendadas.id, id), eq(revisoesAgendadas.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Revisão não encontrada ou acesso negado");
  }

  // ───── Task #289 — Resumos de ciclo (memória de longo prazo) ─────
  async createResumoCiclo(data: InsertBizzyResumoCiclo): Promise<BizzyResumoCiclo> {
    const [row] = await db.insert(bizzyResumosCiclo).values(data).returning();
    return row;
  }
  async getResumoCicloById(id: string, empresaId: string): Promise<BizzyResumoCiclo | undefined> {
    const [row] = await db.select().from(bizzyResumosCiclo)
      .where(and(eq(bizzyResumosCiclo.id, id), eq(bizzyResumosCiclo.empresaId, empresaId)))
      .limit(1);
    return row;
  }
  async listResumosCicloByEmpresa(empresaId: string, limit = 20): Promise<BizzyResumoCiclo[]> {
    return db.select().from(bizzyResumosCiclo)
      .where(eq(bizzyResumosCiclo.empresaId, empresaId))
      .orderBy(desc(bizzyResumosCiclo.criadoEm))
      .limit(limit);
  }
  async listResumosCicloByReferencia(
    empresaId: string,
    tipo: string,
    referenciaId: string | null,
    periodo?: string,
  ): Promise<BizzyResumoCiclo[]> {
    const conds = [
      eq(bizzyResumosCiclo.empresaId, empresaId),
      eq(bizzyResumosCiclo.tipo, tipo),
      referenciaId == null ? isNull(bizzyResumosCiclo.referenciaId) : eq(bizzyResumosCiclo.referenciaId, referenciaId),
    ];
    if (periodo) conds.push(eq(bizzyResumosCiclo.periodo, periodo));
    return db.select().from(bizzyResumosCiclo)
      .where(and(...conds))
      .orderBy(desc(bizzyResumosCiclo.versao), desc(bizzyResumosCiclo.criadoEm));
  }
  async getProximaVersaoResumoCiclo(
    empresaId: string,
    tipo: string,
    referenciaId: string | null,
    periodo: string,
  ): Promise<number> {
    const existentes = await this.listResumosCicloByReferencia(empresaId, tipo, referenciaId, periodo);
    if (existentes.length === 0) return 1;
    return Math.max(...existentes.map((r) => r.versao ?? 1)) + 1;
  }
}

export const storage = new DbStorage();

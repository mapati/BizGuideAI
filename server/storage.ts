import { db } from "./db";
import { 
  empresas, 
  usuarios,
  fatoresPestel, 
  analiseSwot, 
  objetivos, 
  resultadosChave, 
  indicadores,
  cincoForcas,
  modeloNegocio,
  estrategias,
  oportunidadesCrescimento,
  iniciativas,
  rituais,
  eventos,
  type Empresa,
  type InsertEmpresa,
  type Usuario,
  type InsertUsuario,
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
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getEmpresa(id: string): Promise<Empresa | undefined>;
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  updateEmpresa(id: string, empresa: Partial<InsertEmpresa>): Promise<Empresa>;

  createUsuario(usuario: InsertUsuario): Promise<Usuario>;
  getUsuarioByEmail(email: string): Promise<Usuario | undefined>;
  getUsuarioById(id: string): Promise<Usuario | undefined>;
  updateUsuarioSenha(id: string, senhaHash: string): Promise<void>;
  
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
  createIndicador(indicador: InsertIndicador): Promise<Indicador>;
  updateIndicador(id: string, empresaId: string, indicador: Partial<InsertIndicador>): Promise<Indicador>;
  deleteIndicador(id: string, empresaId: string): Promise<void>;
  
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

  async deleteIndicador(id: string, empresaId: string): Promise<void> {
    const result = await db.delete(indicadores)
      .where(and(eq(indicadores.id, id), eq(indicadores.empresaId, empresaId)))
      .returning();
    if (!result[0]) throw new Error("Recurso não encontrado ou acesso negado");
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

  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
    const result = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
    return result[0];
  }

  async getUsuarioById(id: string): Promise<Usuario | undefined> {
    const result = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
    return result[0];
  }

  async createUsuario(usuario: InsertUsuario): Promise<Usuario> {
    const result = await db.insert(usuarios).values(usuario).returning();
    return result[0];
  }
}

export const storage = new DbStorage();

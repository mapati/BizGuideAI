import { db } from "./db";
import { 
  empresas, 
  fatoresPestel, 
  analiseSwot, 
  objetivos, 
  resultadosChave, 
  indicadores,
  cincoForcas,
  modeloNegocio,
  type Empresa,
  type InsertEmpresa,
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
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getEmpresa(): Promise<Empresa | undefined>;
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  updateEmpresa(id: string, empresa: Partial<InsertEmpresa>): Promise<Empresa>;
  
  getFatoresPestel(empresaId: string): Promise<FatorPestel[]>;
  createFatorPestel(fator: InsertFatorPestel): Promise<FatorPestel>;
  updateFatorPestel(id: string, fator: Partial<InsertFatorPestel>): Promise<FatorPestel>;
  deleteFatorPestel(id: string): Promise<void>;
  
  getAnaliseSwot(empresaId: string): Promise<AnaliseSwot[]>;
  createAnaliseSwot(analise: InsertAnaliseSwot): Promise<AnaliseSwot>;
  updateAnaliseSwot(id: string, analise: Partial<InsertAnaliseSwot>): Promise<AnaliseSwot>;
  deleteAnaliseSwot(id: string): Promise<void>;
  
  getObjetivos(empresaId: string): Promise<Objetivo[]>;
  createObjetivo(objetivo: InsertObjetivo): Promise<Objetivo>;
  deleteObjetivo(id: string): Promise<void>;
  
  getResultadosChave(objetivoId: string): Promise<ResultadoChave[]>;
  createResultadoChave(resultado: InsertResultadoChave): Promise<ResultadoChave>;
  updateResultadoChave(id: string, resultado: Partial<InsertResultadoChave>): Promise<ResultadoChave>;
  deleteResultadoChave(id: string): Promise<void>;
  
  getIndicadores(empresaId: string): Promise<Indicador[]>;
  createIndicador(indicador: InsertIndicador): Promise<Indicador>;
  updateIndicador(id: string, indicador: Partial<InsertIndicador>): Promise<Indicador>;
  deleteIndicador(id: string): Promise<void>;
  
  getCincoForcas(empresaId: string): Promise<CincoForcas[]>;
  createCincoForcas(forca: InsertCincoForcas): Promise<CincoForcas>;
  updateCincoForcas(id: string, forca: Partial<InsertCincoForcas>): Promise<CincoForcas>;
  deleteCincoForcas(id: string): Promise<void>;
  
  getModeloNegocio(empresaId: string): Promise<ModeloNegocio[]>;
  createModeloNegocio(bloco: InsertModeloNegocio): Promise<ModeloNegocio>;
  updateModeloNegocio(id: string, bloco: Partial<InsertModeloNegocio>): Promise<ModeloNegocio>;
  deleteModeloNegocio(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getEmpresa(): Promise<Empresa | undefined> {
    const result = await db.select().from(empresas).limit(1);
    return result[0];
  }

  async createEmpresa(empresa: InsertEmpresa): Promise<Empresa> {
    const result = await db.insert(empresas).values(empresa).returning();
    return result[0];
  }

  async updateEmpresa(id: string, empresa: Partial<InsertEmpresa>): Promise<Empresa> {
    const result = await db.update(empresas).set(empresa).where(eq(empresas.id, id)).returning();
    return result[0];
  }

  async getFatoresPestel(empresaId: string): Promise<FatorPestel[]> {
    return db.select().from(fatoresPestel).where(eq(fatoresPestel.empresaId, empresaId));
  }

  async createFatorPestel(fator: InsertFatorPestel): Promise<FatorPestel> {
    const result = await db.insert(fatoresPestel).values(fator).returning();
    return result[0];
  }

  async updateFatorPestel(id: string, fator: Partial<InsertFatorPestel>): Promise<FatorPestel> {
    const result = await db.update(fatoresPestel).set(fator).where(eq(fatoresPestel.id, id)).returning();
    return result[0];
  }

  async deleteFatorPestel(id: string): Promise<void> {
    await db.delete(fatoresPestel).where(eq(fatoresPestel.id, id));
  }

  async getAnaliseSwot(empresaId: string): Promise<AnaliseSwot[]> {
    return db.select().from(analiseSwot).where(eq(analiseSwot.empresaId, empresaId));
  }

  async createAnaliseSwot(analise: InsertAnaliseSwot): Promise<AnaliseSwot> {
    const result = await db.insert(analiseSwot).values(analise).returning();
    return result[0];
  }

  async updateAnaliseSwot(id: string, analise: Partial<InsertAnaliseSwot>): Promise<AnaliseSwot> {
    const result = await db.update(analiseSwot).set(analise).where(eq(analiseSwot.id, id)).returning();
    return result[0];
  }

  async deleteAnaliseSwot(id: string): Promise<void> {
    await db.delete(analiseSwot).where(eq(analiseSwot.id, id));
  }

  async getObjetivos(empresaId: string): Promise<Objetivo[]> {
    return db.select().from(objetivos).where(eq(objetivos.empresaId, empresaId));
  }

  async createObjetivo(objetivo: InsertObjetivo): Promise<Objetivo> {
    const result = await db.insert(objetivos).values(objetivo).returning();
    return result[0];
  }

  async deleteObjetivo(id: string): Promise<void> {
    await db.delete(objetivos).where(eq(objetivos.id, id));
  }

  async getResultadosChave(objetivoId: string): Promise<ResultadoChave[]> {
    return db.select().from(resultadosChave).where(eq(resultadosChave.objetivoId, objetivoId));
  }

  async createResultadoChave(resultado: InsertResultadoChave): Promise<ResultadoChave> {
    const result = await db.insert(resultadosChave).values(resultado).returning();
    return result[0];
  }

  async updateResultadoChave(id: string, resultado: Partial<InsertResultadoChave>): Promise<ResultadoChave> {
    const result = await db.update(resultadosChave).set(resultado).where(eq(resultadosChave.id, id)).returning();
    return result[0];
  }

  async deleteResultadoChave(id: string): Promise<void> {
    await db.delete(resultadosChave).where(eq(resultadosChave.id, id));
  }

  async getIndicadores(empresaId: string): Promise<Indicador[]> {
    return db.select().from(indicadores).where(eq(indicadores.empresaId, empresaId));
  }

  async createIndicador(indicador: InsertIndicador): Promise<Indicador> {
    const result = await db.insert(indicadores).values(indicador).returning();
    return result[0];
  }

  async updateIndicador(id: string, indicador: Partial<InsertIndicador>): Promise<Indicador> {
    const result = await db.update(indicadores).set(indicador).where(eq(indicadores.id, id)).returning();
    return result[0];
  }

  async deleteIndicador(id: string): Promise<void> {
    await db.delete(indicadores).where(eq(indicadores.id, id));
  }

  async getCincoForcas(empresaId: string): Promise<CincoForcas[]> {
    return db.select().from(cincoForcas).where(eq(cincoForcas.empresaId, empresaId));
  }

  async createCincoForcas(forca: InsertCincoForcas): Promise<CincoForcas> {
    const result = await db.insert(cincoForcas).values(forca).returning();
    return result[0];
  }

  async updateCincoForcas(id: string, forca: Partial<InsertCincoForcas>): Promise<CincoForcas> {
    const result = await db.update(cincoForcas).set(forca).where(eq(cincoForcas.id, id)).returning();
    return result[0];
  }

  async deleteCincoForcas(id: string): Promise<void> {
    await db.delete(cincoForcas).where(eq(cincoForcas.id, id));
  }

  async getModeloNegocio(empresaId: string): Promise<ModeloNegocio[]> {
    return db.select().from(modeloNegocio).where(eq(modeloNegocio.empresaId, empresaId));
  }

  async createModeloNegocio(bloco: InsertModeloNegocio): Promise<ModeloNegocio> {
    const result = await db.insert(modeloNegocio).values(bloco).returning();
    return result[0];
  }

  async updateModeloNegocio(id: string, bloco: Partial<InsertModeloNegocio>): Promise<ModeloNegocio> {
    const result = await db.update(modeloNegocio).set(bloco).where(eq(modeloNegocio.id, id)).returning();
    return result[0];
  }

  async deleteModeloNegocio(id: string): Promise<void> {
    await db.delete(modeloNegocio).where(eq(modeloNegocio.id, id));
  }
}

export const storage = new DbStorage();

import { db } from "./db";
import {
  empresas,
  indicadores,
  fatoresPestel,
  cincoForcas,
  modeloNegocio,
  analiseSwot,
  estrategias,
  oportunidadesCrescimento,
  iniciativas,
  objetivos,
  rituais,
  eventos,
} from "@shared/schema";
import { eq, and, sql, type SQL } from "drizzle-orm";
import type { PgTable, AnyPgColumn } from "drizzle-orm/pg-core";

const PERFIL_COMPLETO_RELEASE_DATE = new Date("2026-04-18T00:00:00.000Z");

type TabelaComEmpresa = PgTable & { empresaId: AnyPgColumn };

async function count(table: TabelaComEmpresa, empresaId: string, extraWhere?: SQL): Promise<number> {
  const where = extraWhere
    ? and(eq(table.empresaId, empresaId), extraWhere)
    : eq(table.empresaId, empresaId);
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(table)
    .where(where);
  return r?.c ?? 0;
}

export async function isJornadaConcluida(empresaId: string): Promise<boolean> {
  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, empresaId)).limit(1);
  if (!empresa) return false;

  const isLegacyCompany = empresa.createdAt
    ? new Date(empresa.createdAt) < PERFIL_COMPLETO_RELEASE_DATE
    : false;

  const perfilBaseCompleto = !!(empresa.nome && empresa.setor && empresa.tamanho && empresa.descricao);
  const perfilEstendidoCompleto = !!(
    perfilBaseCompleto &&
    empresa.cnpj &&
    empresa.endereco &&
    empresa.cidade &&
    empresa.estado &&
    empresa.cep &&
    empresa.nomeResponsavel &&
    empresa.emailResponsavel &&
    empresa.termoAceitoEm
  );
  const perfilCompleto = isLegacyCompany ? perfilBaseCompleto : perfilEstendidoCompleto;
  if (!perfilCompleto) return false;

  const [
    diagCount,
    bscCount,
    bmcCount,
    pestelCount,
    forcasCount,
    swotCount,
    estCount,
    oporCount,
    iniCount,
    objCount,
    rituaisRows,
    eventosCount,
  ] = await Promise.all([
    count(indicadores, empresaId, eq(indicadores.perspectiva, "diagnostico")),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(indicadores)
      .where(and(eq(indicadores.empresaId, empresaId), sql`${indicadores.perspectiva} <> 'diagnostico'`))
      .then((r) => r[0]?.c ?? 0),
    count(modeloNegocio, empresaId),
    count(fatoresPestel, empresaId),
    count(cincoForcas, empresaId),
    count(analiseSwot, empresaId),
    count(estrategias, empresaId),
    count(oportunidadesCrescimento, empresaId),
    count(iniciativas, empresaId),
    count(objetivos, empresaId),
    db.select().from(rituais).where(eq(rituais.empresaId, empresaId)),
    count(eventos, empresaId),
  ]);

  if (diagCount < 3) return false;
  if (bmcCount < 5) return false;
  if (pestelCount < 6) return false;
  if (forcasCount < 3) return false;
  if (swotCount < 4) return false;
  if (estCount < 1) return false;
  if (oporCount < 1) return false;
  if (iniCount < 1) return false;
  if (objCount < 1) return false;
  if (bscCount < 1) return false;

  const acompanhamentoConcluido = (() => {
    const ritualConcluido = rituaisRows.some((r) => {
      if (r.completado === "true") return true;
      try {
        const cl = typeof r.checklist === "string" ? JSON.parse(r.checklist) : r.checklist;
        return Array.isArray(cl) && cl.some((c: { done?: unknown }) => c.done === true || String(c.done) === "true");
      } catch {
        return false;
      }
    });
    return ritualConcluido || eventosCount > 0;
  })();

  return acompanhamentoConcluido;
}

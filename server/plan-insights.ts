// Task #219 — Enriquecimento de contexto para o Assistente e o Briefing.
//
// Constrói, a partir do que já existe no banco (kpi_leituras + relações
// indicadorFonteId em iniciativas/KRs), uma camada de "tendência + causalidade
// narrativa" para cada KPI crítico. Não tenta inferência estatística rigorosa;
// o objetivo é apenas levar até o LLM os fatos bem listados (série recente,
// classificação determinística da tendência, itens vinculados que atacam o
// indicador) para que ele consiga conectar os pontos sem inventar relações.

import { storage } from "./storage";
import type { Indicador, Iniciativa, ResultadoChave, Objetivo } from "@shared/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Quantos pontos da série de leituras incluímos no contexto (cap p/ não estourar prompt). */
export const MAX_PONTOS_SERIE = 6;
/** Quantos itens vinculados (iniciativas/KRs) listamos por KPI crítico. */
export const MAX_VINCULOS_POR_KPI = 3;

export type TendenciaKpi = "subindo" | "estavel" | "caindo" | "sem_dados";

export interface PontoSerie {
  data: string; // YYYY-MM-DD
  valor: number;
}

export interface KpiTendencia {
  ultimasLeituras: PontoSerie[];
  tendencia: TendenciaKpi;
  /** Variação relativa ponta-a-ponta (último vs primeiro da janela). null se sem_dados. */
  deltaPercentual: number | null;
}

export interface IniciativaVinculadaResumo {
  id: string;
  titulo: string;
  status: string;
  prazo: string | null;
  diasEmAtraso: number | null; // null se em dia / sem prazo
  diasDesdeEncerramento: number | null;
  notaEncerramento: string | null;
}

export interface KrVinculadoResumo {
  id: string;
  metrica: string;
  valorAtual: number | null;
  valorAlvo: number | null;
  pctAtingido: number | null;
  diasDesdeAtualizacao: number | null;
}

export interface RelacoesIndicador {
  iniciativasVinculadas: IniciativaVinculadaResumo[];
  krsVinculados: KrVinculadoResumo[];
}

/* ------------------------------------------------------------------ */
/* Tendência por indicador                                            */
/* ------------------------------------------------------------------ */

function fmtData(d: Date): string {
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Classificação determinística com banda morta (±2%) sobre a variação relativa. */
function classificarTendencia(serie: PontoSerie[]): { tendencia: TendenciaKpi; deltaPercentual: number | null } {
  if (serie.length < 2) return { tendencia: "sem_dados", deltaPercentual: null };
  const primeiro = serie[0].valor;
  const ultimo = serie[serie.length - 1].valor;
  if (!Number.isFinite(primeiro) || !Number.isFinite(ultimo)) {
    return { tendencia: "sem_dados", deltaPercentual: null };
  }
  const ref = Math.max(Math.abs(primeiro), 1e-9);
  const delta = (ultimo - primeiro) / ref;
  const banda = 0.02;
  let tendencia: TendenciaKpi;
  if (delta > banda) tendencia = "subindo";
  else if (delta < -banda) tendencia = "caindo";
  else tendencia = "estavel";
  return { tendencia, deltaPercentual: delta };
}

/** Lê as leituras do indicador, devolve até MAX_PONTOS_SERIE pontos em ordem cronológica + tendência. */
export async function getKpiTendencia(indicadorId: string): Promise<KpiTendencia> {
  let leituras: Awaited<ReturnType<typeof storage.getLeituras>> = [];
  try {
    leituras = await storage.getLeituras(indicadorId);
  } catch {
    return { ultimasLeituras: [], tendencia: "sem_dados", deltaPercentual: null };
  }
  // getLeituras já ordena DESC por registradoEm; pegamos as MAX mais recentes
  // e invertemos para ficar cronológico (antigo → recente).
  const recentesDesc = leituras.slice(0, MAX_PONTOS_SERIE);
  const cronologico: PontoSerie[] = recentesDesc
    .slice()
    .reverse()
    .map((l) => ({
      data: fmtData(new Date(l.registradoEm)),
      valor: Number(l.valor),
    }))
    .filter((p) => Number.isFinite(p.valor));

  const { tendencia, deltaPercentual } = classificarTendencia(cronologico);
  return { ultimasLeituras: cronologico, tendencia, deltaPercentual };
}

/* ------------------------------------------------------------------ */
/* Relações via indicadorFonteId                                      */
/* ------------------------------------------------------------------ */

function diasEntre(antesIso: Date | string | null | undefined, agora = Date.now()): number | null {
  if (!antesIso) return null;
  const ts = new Date(antesIso).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.floor((agora - ts) / DAY_MS);
}

function parsePrazoLocal(prazo: string | null | undefined): Date | null {
  if (!prazo) return null;
  const d = new Date(prazo);
  if (!isNaN(d.getTime())) return d;
  const m = String(prazo).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const dt = new Date(`${m[3]}-${m[2]}-${m[1]}`);
    if (!isNaN(dt.getTime())) return dt;
  }
  return null;
}

function resumirIniciativa(ini: Iniciativa): IniciativaVinculadaResumo {
  const prazoDt = parsePrazoLocal(ini.prazo);
  const agora = Date.now();
  let diasEmAtraso: number | null = null;
  if (prazoDt && ini.status !== "concluida" && ini.status !== "pausada") {
    const fim = new Date(prazoDt);
    fim.setHours(23, 59, 59, 999);
    if (fim.getTime() < agora) {
      diasEmAtraso = Math.floor((agora - fim.getTime()) / DAY_MS);
    }
  }
  return {
    id: ini.id,
    titulo: ini.titulo,
    status: ini.status,
    prazo: ini.prazo ?? null,
    diasEmAtraso,
    diasDesdeEncerramento: diasEntre(ini.encerradaEm),
    notaEncerramento: ini.notaEncerramento ?? null,
  };
}

function resumirKr(kr: ResultadoChave): KrVinculadoResumo {
  const valorAtual = kr.valorAtual != null ? Number(kr.valorAtual) : null;
  const valorAlvo = kr.valorAlvo != null ? Number(kr.valorAlvo) : null;
  let pct: number | null = null;
  if (valorAtual != null && valorAlvo != null && Number.isFinite(valorAtual) && Number.isFinite(valorAlvo) && valorAlvo !== 0) {
    pct = valorAtual / valorAlvo;
  }
  return {
    id: kr.id,
    metrica: kr.metrica,
    valorAtual: Number.isFinite(valorAtual ?? NaN) ? valorAtual : null,
    valorAlvo: Number.isFinite(valorAlvo ?? NaN) ? valorAlvo : null,
    pctAtingido: pct,
    diasDesdeAtualizacao: diasEntre(kr.atualizadoEm ?? kr.createdAt),
  };
}

/**
 * Dado o universo (em memória) de iniciativas + KRs da empresa, retorna os que
 * "atacam" o indicador via indicadorFonteId. O caller é responsável por
 * carregar as listas (evitando N+1 e centralizando o tenant scope).
 */
export function getRelacoesIndicador(
  indicadorId: string,
  iniciativas: Iniciativa[],
  krs: ResultadoChave[],
  opts: { maxItens?: number } = {},
): RelacoesIndicador {
  const max = opts.maxItens ?? MAX_VINCULOS_POR_KPI;

  const inisAtacando = iniciativas
    .filter((i) => i.indicadorFonteId === indicadorId)
    .map(resumirIniciativa);
  // Prioriza atrasadas / encerradas há pouco (mais informativo p/ narrativa).
  inisAtacando.sort((a, b) => {
    const aw = (a.diasEmAtraso ?? -1) * 1000 + (a.diasDesdeEncerramento != null && a.diasDesdeEncerramento <= 14 ? 1 : 0);
    const bw = (b.diasEmAtraso ?? -1) * 1000 + (b.diasDesdeEncerramento != null && b.diasDesdeEncerramento <= 14 ? 1 : 0);
    return bw - aw;
  });

  const krsAtacando = krs
    .filter((k) => k.indicadorFonteId === indicadorId)
    .map(resumirKr);
  // Prioriza KRs com mais dias parados / menor % atingido.
  krsAtacando.sort((a, b) => {
    const aw = (a.diasDesdeAtualizacao ?? 0) - (a.pctAtingido ?? 0) * 10;
    const bw = (b.diasDesdeAtualizacao ?? 0) - (b.pctAtingido ?? 0) * 10;
    return bw - aw;
  });

  return {
    iniciativasVinculadas: inisAtacando.slice(0, max),
    krsVinculados: krsAtacando.slice(0, max),
  };
}

/** Helper inverso: dada uma iniciativa, devolve o nome do KPI atacado (se houver). */
export function getKpiAtacadoPorIniciativa(
  ini: Iniciativa,
  indicadores: Indicador[],
): { id: string; nome: string } | null {
  if (!ini.indicadorFonteId) return null;
  const ind = indicadores.find((i) => i.id === ini.indicadorFonteId);
  if (!ind) return null;
  return { id: ind.id, nome: ind.nome };
}

/* ------------------------------------------------------------------ */
/* Renderização compacta para prompt                                  */
/* ------------------------------------------------------------------ */

function fmtPct(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${(p * 100).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Renderiza tendência + leituras em uma linha curta para o prompt. */
export function renderTendenciaLinha(t: KpiTendencia): string {
  if (t.tendencia === "sem_dados" || t.ultimasLeituras.length === 0) {
    return `tendência: sem leituras suficientes`;
  }
  const pontos = t.ultimasLeituras
    .map((p) => `${p.data}=${fmtNum(p.valor)}`)
    .join(" → ");
  return `últimos ${t.ultimasLeituras.length}: ${pontos} | tendência: ${t.tendencia} (${fmtPct(t.deltaPercentual)})`;
}

/** Renderiza vínculos em linhas curtas, prefixadas. Vazio se não há nada. */
export function renderRelacoesLinhas(rel: RelacoesIndicador, prefixo = "    "): string[] {
  const out: string[] = [];
  for (const ini of rel.iniciativasVinculadas) {
    const partes: string[] = [`iniciativa "${ini.titulo}" [${ini.status}]`];
    if (ini.diasEmAtraso != null) partes.push(`atrasada há ${ini.diasEmAtraso}d`);
    if (ini.diasDesdeEncerramento != null && ini.diasDesdeEncerramento <= 30) {
      partes.push(`encerrada há ${ini.diasDesdeEncerramento}d`);
      if (ini.notaEncerramento) partes.push(`nota: "${ini.notaEncerramento.slice(0, 80)}"`);
    }
    out.push(`${prefixo}↳ ${partes.join(" — ")}`);
  }
  for (const kr of rel.krsVinculados) {
    const partes: string[] = [`KR "${kr.metrica}"`];
    if (kr.valorAtual != null && kr.valorAlvo != null) {
      const pctTxt = kr.pctAtingido != null ? ` (${(kr.pctAtingido * 100).toFixed(0)}%)` : "";
      partes.push(`${fmtNum(kr.valorAtual)}/${fmtNum(kr.valorAlvo)}${pctTxt}`);
    }
    if (kr.diasDesdeAtualizacao != null) partes.push(`última atualização há ${kr.diasDesdeAtualizacao}d`);
    out.push(`${prefixo}↳ ${partes.join(" — ")}`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Carregamento agregado (usado pelo route do assistente)              */
/* ------------------------------------------------------------------ */

/**
 * Carrega, em uma única chamada, o universo de KRs da empresa (com objetivos)
 * para reaproveitar nas relações. Caller deve filtrar por encerrado se desejar.
 */
export async function carregarKrsDaEmpresa(empresaId: string): Promise<{ kr: ResultadoChave; objetivo: Objetivo }[]> {
  const objetivos = await storage.getObjetivos(empresaId);
  const all = await Promise.all(
    objetivos.map(async (o) => {
      const krs = await storage.getResultadosChave(o.id, empresaId);
      return krs.map((kr) => ({ kr, objetivo: o }));
    }),
  );
  return all.flat();
}

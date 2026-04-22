// Task #219 — Enriquecimento de contexto para o Assistente e o Briefing.
//
// Constrói, a partir do que já existe no banco (kpi_leituras + relações
// indicadorFonteId em iniciativas/KRs), uma camada de "tendência + causalidade
// narrativa" para cada KPI crítico. Não tenta inferência estatística rigorosa;
// o objetivo é apenas levar até o LLM os fatos bem listados (série recente,
// classificação determinística da tendência, itens vinculados que atacam o
// indicador) para que ele consiga conectar os pontos sem inventar relações.

import { storage } from "./storage";
import type { Indicador, Iniciativa, ResultadoChave, Objetivo, ConteudoPauta } from "@shared/schema";
import { computePlanQuality } from "./plan-quality";

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

/* ------------------------------------------------------------------ */
/* Task #230 — Projeção simples de KR e comparação de períodos        */
/* ------------------------------------------------------------------ */

export interface ProjecaoKr {
  valorInicial: number | null;
  valorAtual: number | null;
  valorAlvo: number | null;
  prazo: string | null;
  diasRestantes: number | null;
  diasDecorridos: number | null;
  ritmoPorDia: number | null;
  valorProjetadoNoPrazo: number | null;
  pctProjetadoVsAlvo: number | null;
  numAtualizacoes: number;
  confianca: "alta" | "baixa";
  observacao: string;
}

/**
 * Conta quantas propostas confirmadas de "atualizar_progresso_kr" e
 * "atualizar_kr" existiram para o KR informado. Usado pela projeção para
 * estimar a confiança (≥3 atualizações registradas → alta).
 *
 * Não há tabela dedicada de histórico de KR — usamos o log de propostas
 * (`assistente_acao_log`) como proxy do nº de atualizações concretas.
 */
export async function contarAtualizacoesKr(
  empresaId: string,
  krId: string,
): Promise<number> {
  const propostas = await storage.listPropostasByEmpresa(empresaId, 500);
  let n = 0;
  for (const p of propostas) {
    if (p.status !== "confirmada") continue;
    if (p.ferramenta !== "atualizar_progresso_kr" && p.ferramenta !== "atualizar_kr") continue;
    const params = p.parametros as Record<string, unknown> | null;
    const krRef = params && (params.krId ?? params.id);
    if (typeof krRef === "string" && krRef === krId) n++;
  }
  return n;
}

/**
 * Extrapolação linear simples a partir do ritmo médio observado entre
 * `valorInicial` (criação) e `valorAtual` (última atualização). Sem ML —
 * só taxa média × tempo restante.
 *
 * `numAtualizacoes` é o nº de updates registrados no log de propostas
 * (calculável via `contarAtualizacoesKr`). A confiança fica "alta" quando
 * houver ≥3 atualizações registradas E movimento mensurável; "baixa" caso
 * contrário (sem dados suficientes para confiar na extrapolação).
 */
export function projetarValorKr(
  kr: ResultadoChave,
  numAtualizacoes = 0,
  agora = Date.now(),
): ProjecaoKr {
  const valorInicial = kr.valorInicial != null ? Number(kr.valorInicial) : null;
  const valorAtual = kr.valorAtual != null ? Number(kr.valorAtual) : null;
  const valorAlvo = kr.valorAlvo != null ? Number(kr.valorAlvo) : null;
  const prazo = kr.prazo ?? null;
  const prazoDt = parsePrazoLocal(prazo);
  const criadoTs = new Date(kr.createdAt).getTime();
  const atualizadoTs = new Date(kr.atualizadoEm ?? kr.createdAt).getTime();

  const diasDecorridos = Number.isFinite(criadoTs) && Number.isFinite(atualizadoTs)
    ? Math.max(0, Math.floor((atualizadoTs - criadoTs) / DAY_MS))
    : null;
  let diasRestantes: number | null = null;
  if (prazoDt) {
    const fim = new Date(prazoDt);
    fim.setHours(23, 59, 59, 999);
    diasRestantes = Math.ceil((fim.getTime() - agora) / DAY_MS);
  }

  let ritmoPorDia: number | null = null;
  if (
    valorInicial != null &&
    valorAtual != null &&
    Number.isFinite(valorInicial) &&
    Number.isFinite(valorAtual) &&
    diasDecorridos != null &&
    diasDecorridos > 0
  ) {
    ritmoPorDia = (valorAtual - valorInicial) / diasDecorridos;
  }

  let valorProjetadoNoPrazo: number | null = null;
  if (valorAtual != null && ritmoPorDia != null && diasRestantes != null) {
    const dias = Math.max(0, diasRestantes);
    valorProjetadoNoPrazo = valorAtual + ritmoPorDia * dias;
  }

  let pctProjetadoVsAlvo: number | null = null;
  if (valorProjetadoNoPrazo != null && valorAlvo != null && valorAlvo !== 0) {
    pctProjetadoVsAlvo = valorProjetadoNoPrazo / valorAlvo;
  }

  const movimentou = valorInicial != null && valorAtual != null && valorAtual !== valorInicial;
  const confianca: "alta" | "baixa" = numAtualizacoes >= 3 && movimentou ? "alta" : "baixa";

  let observacao = "";
  if (ritmoPorDia == null) {
    observacao = "Sem progresso mensurável desde a criação — projeção indisponível.";
  } else if (diasRestantes == null) {
    observacao = "KR sem prazo definido — projeção sem horizonte para extrapolar.";
  } else if (diasRestantes <= 0) {
    observacao = "Prazo já expirou — comparando o valor atual com o alvo.";
  } else if (confianca === "baixa") {
    observacao = `Apenas ${numAtualizacoes} atualização(ões) registrada(s) — são necessárias ≥3 para confiança alta.`;
  } else {
    observacao = `Extrapolação linear baseada no ritmo médio observado em ${numAtualizacoes} atualizações registradas.`;
  }

  return {
    valorInicial: Number.isFinite(valorInicial ?? NaN) ? valorInicial : null,
    valorAtual: Number.isFinite(valorAtual ?? NaN) ? valorAtual : null,
    valorAlvo: Number.isFinite(valorAlvo ?? NaN) ? valorAlvo : null,
    prazo,
    diasRestantes,
    diasDecorridos,
    ritmoPorDia,
    valorProjetadoNoPrazo,
    pctProjetadoVsAlvo,
    numAtualizacoes,
    confianca,
    observacao,
  };
}

export interface PeriodoIso {
  inicio: string; // YYYY-MM-DD
  fim: string;
}

export type EscopoComparacao = "kpis" | "iniciativas" | "okrs" | "tudo";

export interface ComparacaoKpisResultado {
  totalAvaliados: number;
  melhoraram: number;
  pioraram: number;
  estaveis: number;
  semDados: number;
  top: Array<{ id: string; nome: string; valorA: number | null; valorB: number | null; deltaPct: number | null }>;
}

export interface ComparacaoIniciativasResultado {
  criadasA: number;
  criadasB: number;
  concluidasA: number;
  concluidasB: number;
  atrasadasNoPeriodoA: number;
  atrasadasNoPeriodoB: number;
  top: Array<{ id: string; titulo: string; movimento: "criada" | "concluida" | "atrasada"; periodo: "A" | "B"; data: string | null }>;
}

export interface ComparacaoOkrsResultado {
  okrsCriadosA: number;
  okrsCriadosB: number;
  mediaPctKrAtualA: number | null;
  mediaPctKrAtualB: number | null;
  top: Array<{ id: string; titulo: string; pctMedio: number | null; periodo: "A" | "B" }>;
}

export interface ComparacaoPeriodosResultado {
  escopo: EscopoComparacao;
  periodoA: PeriodoIso;
  periodoB: PeriodoIso;
  kpis?: ComparacaoKpisResultado;
  iniciativas?: ComparacaoIniciativasResultado;
  okrs?: ComparacaoOkrsResultado;
}

function parsePeriodoLimits(p: PeriodoIso): { inicio: number; fim: number } | null {
  const ini = new Date(p.inicio);
  const fim = new Date(p.fim);
  if (isNaN(ini.getTime()) || isNaN(fim.getTime())) return null;
  fim.setHours(23, 59, 59, 999);
  return { inicio: ini.getTime(), fim: fim.getTime() };
}

async function compararKpis(
  empresaId: string,
  A: { inicio: number; fim: number },
  B: { inicio: number; fim: number },
): Promise<ComparacaoKpisResultado> {
  const indicadores = await storage.getIndicadoresAcompanhamento(empresaId);
  let melhoraram = 0;
  let pioraram = 0;
  let estaveis = 0;
  let semDados = 0;
  const movimentos: Array<{ id: string; nome: string; valorA: number | null; valorB: number | null; deltaPct: number | null }> = [];
  for (const ind of indicadores) {
    const leituras = await storage.getLeituras(ind.id);
    const leiturasA = leituras.filter((l) => {
      const t = new Date(l.registradoEm).getTime();
      return t >= A.inicio && t <= A.fim;
    });
    const leiturasB = leituras.filter((l) => {
      const t = new Date(l.registradoEm).getTime();
      return t >= B.inicio && t <= B.fim;
    });
    // mais recente de cada janela (getLeituras já vem DESC por registradoEm)
    const ultA = leiturasA[0] ? Number(leiturasA[0].valor) : null;
    const ultB = leiturasB[0] ? Number(leiturasB[0].valor) : null;
    if (ultA == null || ultB == null || !Number.isFinite(ultA) || !Number.isFinite(ultB)) {
      semDados++;
      continue;
    }
    const ref = Math.max(Math.abs(ultA), 1e-9);
    const delta = (ultB - ultA) / ref;
    if (delta > 0.02) melhoraram++;
    else if (delta < -0.02) pioraram++;
    else estaveis++;
    movimentos.push({ id: ind.id, nome: ind.nome, valorA: ultA, valorB: ultB, deltaPct: delta });
  }
  movimentos.sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0));
  return {
    totalAvaliados: indicadores.length,
    melhoraram,
    pioraram,
    estaveis,
    semDados,
    top: movimentos.slice(0, 5),
  };
}

async function compararIniciativas(
  empresaId: string,
  A: { inicio: number; fim: number },
  B: { inicio: number; fim: number },
): Promise<ComparacaoIniciativasResultado> {
  const inis = await storage.getIniciativas(empresaId);
  const inPeriod = (ts: number, p: { inicio: number; fim: number }) => ts >= p.inicio && ts <= p.fim;
  let criadasA = 0;
  let criadasB = 0;
  let concluidasA = 0;
  let concluidasB = 0;
  let atrasadasA = 0;
  let atrasadasB = 0;
  const movsTop: Array<{ id: string; titulo: string; movimento: "criada" | "concluida" | "atrasada"; periodo: "A" | "B"; data: string | null }> = [];
  for (const i of inis) {
    const criadoTs = new Date(i.createdAt).getTime();
    const criadoIso = new Date(i.createdAt).toISOString();
    if (inPeriod(criadoTs, A)) {
      criadasA++;
      movsTop.push({ id: i.id, titulo: i.titulo, movimento: "criada", periodo: "A", data: criadoIso });
    }
    if (inPeriod(criadoTs, B)) {
      criadasB++;
      movsTop.push({ id: i.id, titulo: i.titulo, movimento: "criada", periodo: "B", data: criadoIso });
    }
    if (i.encerradaEm) {
      const encTs = new Date(i.encerradaEm).getTime();
      const encIso = i.encerradaEm.toISOString();
      if (i.status === "concluida") {
        if (inPeriod(encTs, A)) {
          concluidasA++;
          movsTop.push({ id: i.id, titulo: i.titulo, movimento: "concluida", periodo: "A", data: encIso });
        }
        if (inPeriod(encTs, B)) {
          concluidasB++;
          movsTop.push({ id: i.id, titulo: i.titulo, movimento: "concluida", periodo: "B", data: encIso });
        }
      }
    }
    // "atrasada no período X" = prazo cai dentro do período X e não foi concluída até o fim do período
    const prazoDt = parsePrazoLocal(i.prazo);
    if (prazoDt) {
      const prazoTs = new Date(prazoDt);
      prazoTs.setHours(23, 59, 59, 999);
      const finalizadaAteFim = (fim: number) =>
        i.encerradaEm != null && new Date(i.encerradaEm).getTime() <= fim;
      if (inPeriod(prazoTs.getTime(), A) && !finalizadaAteFim(A.fim)) {
        atrasadasA++;
        movsTop.push({ id: i.id, titulo: i.titulo, movimento: "atrasada", periodo: "A", data: i.prazo ?? null });
      }
      if (inPeriod(prazoTs.getTime(), B) && !finalizadaAteFim(B.fim)) {
        atrasadasB++;
        movsTop.push({ id: i.id, titulo: i.titulo, movimento: "atrasada", periodo: "B", data: i.prazo ?? null });
      }
    }
  }
  // Prioriza B (período "atual"), depois conclusões, depois criações, depois atrasos.
  const ordemMov = { concluida: 0, atrasada: 1, criada: 2 } as const;
  movsTop.sort((a, b) => {
    if (a.periodo !== b.periodo) return a.periodo === "B" ? -1 : 1;
    return ordemMov[a.movimento] - ordemMov[b.movimento];
  });
  return {
    criadasA,
    criadasB,
    concluidasA,
    concluidasB,
    atrasadasNoPeriodoA: atrasadasA,
    atrasadasNoPeriodoB: atrasadasB,
    top: movsTop.slice(0, 5),
  };
}

async function compararOkrs(
  empresaId: string,
  A: { inicio: number; fim: number },
  B: { inicio: number; fim: number },
): Promise<ComparacaoOkrsResultado> {
  const objetivos = await storage.getObjetivos(empresaId);
  const inPeriod = (ts: number, p: { inicio: number; fim: number }) => ts >= p.inicio && ts <= p.fim;
  let okrsA = 0;
  let okrsB = 0;
  const pctA: number[] = [];
  const pctB: number[] = [];
  const top: Array<{ id: string; titulo: string; pctMedio: number | null; periodo: "A" | "B" }> = [];
  for (const o of objetivos) {
    const criadoTs = new Date(o.createdAt).getTime();
    const krs = await storage.getResultadosChave(o.id, empresaId);
    const pcts = krs
      .map((k) => {
        const va = k.valorAtual != null ? Number(k.valorAtual) : null;
        const vl = k.valorAlvo != null ? Number(k.valorAlvo) : null;
        if (va == null || vl == null || !Number.isFinite(va) || !Number.isFinite(vl) || vl === 0) return null;
        return va / vl;
      })
      .filter((p): p is number => p != null);
    const pctMedio = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
    if (inPeriod(criadoTs, A)) {
      okrsA++;
      if (pctMedio != null) pctA.push(pctMedio);
      top.push({ id: o.id, titulo: o.titulo, pctMedio, periodo: "A" });
    }
    if (inPeriod(criadoTs, B)) {
      okrsB++;
      if (pctMedio != null) pctB.push(pctMedio);
      top.push({ id: o.id, titulo: o.titulo, pctMedio, periodo: "B" });
    }
  }
  const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  top.sort((a, b) => (b.pctMedio ?? -1) - (a.pctMedio ?? -1));
  return {
    okrsCriadosA: okrsA,
    okrsCriadosB: okrsB,
    mediaPctKrAtualA: media(pctA),
    mediaPctKrAtualB: media(pctB),
    top: top.slice(0, 5),
  };
}

export async function comparePeriodos(
  empresaId: string,
  escopo: EscopoComparacao,
  periodoA: PeriodoIso,
  periodoB: PeriodoIso,
): Promise<{ ok: true; resultado: ComparacaoPeriodosResultado } | { ok: false; mensagem: string }> {
  const A = parsePeriodoLimits(periodoA);
  const B = parsePeriodoLimits(periodoB);
  if (!A || !B) return { ok: false, mensagem: "Períodos inválidos. Use datas ISO YYYY-MM-DD." };
  if (A.inicio > A.fim) return { ok: false, mensagem: `periodoA inválido: inicio (${periodoA.inicio}) é posterior a fim (${periodoA.fim}).` };
  if (B.inicio > B.fim) return { ok: false, mensagem: `periodoB inválido: inicio (${periodoB.inicio}) é posterior a fim (${periodoB.fim}).` };
  const out: ComparacaoPeriodosResultado = { escopo, periodoA, periodoB };
  if (escopo === "kpis" || escopo === "tudo") out.kpis = await compararKpis(empresaId, A, B);
  if (escopo === "iniciativas" || escopo === "tudo") out.iniciativas = await compararIniciativas(empresaId, A, B);
  if (escopo === "okrs" || escopo === "tudo") out.okrs = await compararOkrs(empresaId, A, B);
  return { ok: true, resultado: out };
}
/* ------------------------------------------------------------------ */
/* Task #233 — Conteúdo determinístico para a pauta de uma reunião    */
/* Reaproveita as relações de KPI/KR/iniciativa para listar focos.    */
/* ------------------------------------------------------------------ */

export async function montarConteudoPauta(
  empresaId: string,
  tipo: "semanal" | "mensal" | "trimestral",
): Promise<ConteudoPauta> {
  const [indicadores, iniciativas, krsComObj, qualidade] = await Promise.all([
    storage.getIndicadores(empresaId),
    storage.getIniciativas(empresaId),
    carregarKrsDaEmpresa(empresaId),
    computePlanQuality(empresaId).catch(() => null),
  ]);

  const krs = krsComObj.map((x) => x.kr);

  // KPIs críticos: status vermelho ou amarelo (top 5).
  const kpisCriticos = indicadores
    .filter((i) => {
      const s = String(i.status ?? "").toLowerCase();
      return s.includes("verm") || s.includes("amare") || s === "vermelho" || s === "amarelo";
    })
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      nome: i.nome,
      atual: i.atual != null ? String(i.atual) : "—",
      meta: i.meta != null ? String(i.meta) : "—",
      status: String(i.status ?? "—"),
    }));

  // KRs próximos do prazo / atrasados / com baixo % atingido.
  const hoje = Date.now();
  const krsProximosPrazo = krsComObj
    .map(({ kr, objetivo }) => {
      const va = kr.valorAtual != null ? Number(kr.valorAtual) : null;
      const vt = kr.valorAlvo != null ? Number(kr.valorAlvo) : null;
      const pct = va != null && vt != null && vt !== 0 ? va / vt : null;
      return {
        id: kr.id,
        metrica: kr.metrica,
        objetivo: objetivo.titulo,
        pctAtingido: pct,
        prazo: (kr as any).prazo ?? "",
        prazoTs: (() => {
          const p = (kr as any).prazo;
          if (!p) return Number.POSITIVE_INFINITY;
          const t = new Date(p).getTime();
          return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
        })(),
      };
    })
    .filter((k) => (k.pctAtingido == null || k.pctAtingido < 0.9) && k.prazoTs < hoje + 90 * DAY_MS)
    .sort((a, b) => a.prazoTs - b.prazoTs)
    .slice(0, 5)
    .map(({ prazoTs, ...rest }) => rest);

  // Iniciativas em atraso ou com prazo curto.
  const iniciativasARevisar = iniciativas
    .map((i) => {
      const dt = i.prazo ? new Date(i.prazo) : null;
      const ts = dt && !isNaN(dt.getTime()) ? dt.getTime() : Number.POSITIVE_INFINITY;
      const ativa = i.status !== "concluida" && i.status !== "pausada";
      const diasEmAtraso = ativa && ts < hoje ? Math.floor((hoje - ts) / DAY_MS) : null;
      return {
        id: i.id,
        titulo: i.titulo,
        status: i.status,
        prazo: i.prazo ?? "",
        diasEmAtraso,
        _ts: ts,
        _ativa: ativa,
      };
    })
    .filter((i) => i._ativa && (i.diasEmAtraso != null || i._ts < hoje + 30 * DAY_MS))
    .sort((a, b) => (b.diasEmAtraso ?? -1) - (a.diasEmAtraso ?? -1))
    .slice(0, 6)
    .map(({ _ts, _ativa, ...rest }) => rest);

  // Decisões pendentes: iniciativas sem KPI/estratégia.
  // Nota: KR sem indicador-fonte NÃO é mais tratado como pendência. KR e KPI
  // são camadas independentes (alcance do ciclo vs. performance contínua); o
  // vínculo via indicadorFonteId é rastreabilidade voluntária, não defeito.
  const decisoesPendentes: ConteudoPauta["decisoesPendentes"] = [];
  if (tipo !== "semanal") {
    iniciativas
      .filter((i) => !i.indicadorFonteId && i.status !== "concluida" && i.status !== "pausada")
      .slice(0, 3)
      .forEach((i) => {
        decisoesPendentes.push({
          tipo: "iniciativa_sem_kpi",
          descricao: `Vincular KPI à iniciativa "${i.titulo}"`,
          referenciaId: i.id,
        });
      });
  }

  // Lacunas do plan-quality (top 3 críticas).
  const lacunasDoScore = (qualidade?.lacunas ?? [])
    .filter((l) => l.severidade === "alta")
    .slice(0, 3)
    .map((l) => ({ titulo: l.titulo, severidade: l.severidade, rota: l.rota }));

  const horizonte = tipo === "semanal" ? "semana" : tipo === "mensal" ? "mês" : "trimestre";
  const resumoPartes: string[] = [];
  if (kpisCriticos.length) resumoPartes.push(`${kpisCriticos.length} KPI(s) críticos`);
  if (iniciativasARevisar.length) resumoPartes.push(`${iniciativasARevisar.length} iniciativa(s) em revisão`);
  if (krsProximosPrazo.length) resumoPartes.push(`${krsProximosPrazo.length} meta(s) com prazo curto`);
  if (qualidade) resumoPartes.push(`score do plano: ${qualidade.score}`);
  const resumo = `Pauta da ${tipo === "semanal" ? "reunião semanal" : tipo === "mensal" ? "revisão mensal" : "revisão trimestral"} — foco do ${horizonte}: ${resumoPartes.join(", ") || "sem alertas no momento"}.`;

  return {
    resumo,
    kpisCriticos,
    krsProximosPrazo,
    iniciativasARevisar,
    decisoesPendentes,
    lacunasDoScore,
  };
}

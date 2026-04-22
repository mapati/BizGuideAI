// Task #289 — Gerador determinístico de resumos de ciclo (memória de longo
// prazo do Bizzy). NÃO usa LLM: lê dados estruturados do storage e produz um
// JSON imutável com conquistas, atrasos, decisões, KPIs movidos e lições.
// Cada chamada cria UMA nova linha em `bizzy_resumos_ciclo`. Linhas antigas
// nunca são editadas; se um mesmo (empresa,tipo,referencia,periodo) é
// re-resumido, a `versao` é incrementada.

import { storage } from "./storage";
import type {
  BizzyResumoCiclo,
  ConteudoResumoCiclo,
  Indicador,
  Iniciativa,
  Objetivo,
  ResultadoChave,
} from "@shared/schema";

export type GerarResumoTipo = "trimestre" | "objetivo" | "estrategia" | "iniciativa";

export type GerarResumoOpts = {
  empresaId: string;
  tipo: GerarResumoTipo;
  referenciaId?: string | null;
  periodo?: string; // ex.: "2026-Q1". Se omitido para tipo=trimestre, calcula o trimestre atual.
  geradoPor?: string;
};

const MAX_LIST_ITENS = 8;

function trimestreAtual(now = new Date()): { periodo: string; inicio: Date; fim: Date } {
  const ano = now.getUTCFullYear();
  const mes = now.getUTCMonth(); // 0-indexed
  const q = Math.floor(mes / 3) + 1;
  const inicio = new Date(Date.UTC(ano, (q - 1) * 3, 1));
  const fim = new Date(Date.UTC(ano, q * 3, 0, 23, 59, 59));
  return { periodo: `${ano}-Q${q}`, inicio, fim };
}

function intervaloDoPeriodo(periodo: string): { inicio: Date; fim: Date } | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(periodo);
  if (!m) return null;
  const ano = Number(m[1]);
  const q = Number(m[2]);
  const inicio = new Date(Date.UTC(ano, (q - 1) * 3, 1));
  const fim = new Date(Date.UTC(ano, q * 3, 0, 23, 59, 59));
  return { inicio, fim };
}

function dentroDoIntervalo(d: Date | null | undefined, inicio: Date, fim: Date): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= inicio.getTime() && t <= fim.getTime();
}

function dedupTrunc(itens: string[], max = MAX_LIST_ITENS): string[] {
  const set = new Set<string>();
  for (const i of itens) {
    const v = i.trim();
    if (v.length > 0) set.add(v);
    if (set.size >= max) break;
  }
  return Array.from(set);
}

// Lê o vetor estruturado de um conteúdo de resumo. Tolera linhas antigas que
// possam ter sido geradas antes de uma evolução do schema.
export function lerConteudoResumo(row: BizzyResumoCiclo): ConteudoResumoCiclo {
  const c = (row.conteudo ?? {}) as Partial<ConteudoResumoCiclo>;
  return {
    resumoCurto: c.resumoCurto ?? "",
    conquistas: c.conquistas ?? [],
    atrasos: c.atrasos ?? [],
    licoes: c.licoes ?? [],
    decisoes: c.decisoes ?? [],
    kpisMovidos: c.kpisMovidos ?? [],
    iniciativasConcluidas: c.iniciativasConcluidas ?? [],
    iniciativasArquivadas: c.iniciativasArquivadas ?? [],
    okrsEncerrados: c.okrsEncerrados ?? [],
    retrospectivasIds: c.retrospectivasIds ?? [],
  };
}

async function montarConteudoTrimestre(
  empresaId: string,
  inicio: Date,
  fim: Date,
): Promise<ConteudoResumoCiclo> {
  const [iniciativas, objetivos, indicadores, decisoes, retros] = await Promise.all([
    storage.getIniciativas(empresaId),
    storage.getObjetivos(empresaId),
    storage.getIndicadores(empresaId),
    storage.getDecisoesEstrategicas(empresaId, 200),
    storage.getRetrospectivas(empresaId),
  ]);

  const iniciativasConcluidas: ConteudoResumoCiclo["iniciativasConcluidas"] = [];
  const iniciativasArquivadas: ConteudoResumoCiclo["iniciativasArquivadas"] = [];
  const conquistas: string[] = [];
  const atrasos: string[] = [];

  for (const i of iniciativas) {
    if (dentroDoIntervalo(i.encerradaEm ?? null, inicio, fim)) {
      const status = (i.status ?? "").toLowerCase();
      if (status === "concluida" || status === "concluída") {
        iniciativasConcluidas.push({ id: i.id, titulo: i.titulo, nota: i.notaEncerramento ?? "" });
        conquistas.push(`Iniciativa concluída: ${i.titulo}`);
      } else {
        iniciativasArquivadas.push({ id: i.id, titulo: i.titulo, motivo: i.notaEncerramento ?? status });
      }
    }
    if (i.prazoData && new Date(i.prazoData).getTime() < fim.getTime()) {
      const status = (i.status ?? "").toLowerCase();
      if (status !== "concluida" && status !== "concluída" && status !== "cancelada") {
        atrasos.push(`Iniciativa atrasada: ${i.titulo} (prazo ${i.prazoData})`);
      }
    }
  }

  const okrsEncerrados: ConteudoResumoCiclo["okrsEncerrados"] = [];
  for (const o of objetivos) {
    if (!o.encerrado) continue;
    const krs = await storage.getResultadosChave(o.id, empresaId);
    const pct = pctMedioKrs(krs);
    okrsEncerrados.push({ id: o.id, titulo: o.titulo, pctMedio: pct });
    conquistas.push(`Objetivo encerrado: ${o.titulo}${pct != null ? ` (${pct}% médio)` : ""}`);
  }

  const kpisMovidos = await calcularKpisMovidos(indicadores, inicio, fim);

  const decisoesPeriodo = decisoes
    .filter((d) => dentroDoIntervalo(d.registradaEm ?? null, inicio, fim))
    .slice(0, MAX_LIST_ITENS)
    .map((d) => ({ titulo: d.titulo, escolha: d.escolha ?? "" }));

  const retrosPeriodo = retros.filter((r) => dentroDoIntervalo(r.criadaEm ?? null, inicio, fim));
  const licoes: string[] = [];
  for (const r of retrosPeriodo) {
    if (r.aprendizados) licoes.push(r.aprendizados);
    if (r.ajustes) licoes.push(`Ajuste: ${r.ajustes}`);
  }

  const resumoCurto = `Ciclo ${inicio.toISOString().slice(0, 10)} → ${fim.toISOString().slice(0, 10)}: `
    + `${iniciativasConcluidas.length} iniciativas concluídas, `
    + `${okrsEncerrados.length} objetivos encerrados, `
    + `${kpisMovidos.length} KPIs movidos, `
    + `${decisoesPeriodo.length} decisões.`;

  return {
    resumoCurto,
    conquistas: dedupTrunc(conquistas),
    atrasos: dedupTrunc(atrasos),
    licoes: dedupTrunc(licoes),
    decisoes: decisoesPeriodo,
    kpisMovidos,
    iniciativasConcluidas: iniciativasConcluidas.slice(0, MAX_LIST_ITENS),
    iniciativasArquivadas: iniciativasArquivadas.slice(0, MAX_LIST_ITENS),
    okrsEncerrados: okrsEncerrados.slice(0, MAX_LIST_ITENS),
    retrospectivasIds: retrosPeriodo.map((r) => r.id),
  };
}

function pctMedioKrs(krs: ResultadoChave[]): number | null {
  if (krs.length === 0) return null;
  let soma = 0;
  let n = 0;
  for (const kr of krs) {
    const ini = Number(kr.valorInicial);
    const alvo = Number(kr.valorAlvo);
    const atual = Number(kr.valorAtual);
    if (!Number.isFinite(ini) || !Number.isFinite(alvo) || !Number.isFinite(atual)) continue;
    if (alvo === ini) continue;
    const pct = ((atual - ini) / (alvo - ini)) * 100;
    soma += Math.max(0, Math.min(150, pct));
    n += 1;
  }
  if (n === 0) return null;
  return Math.round(soma / n);
}

async function calcularKpisMovidos(
  indicadores: Indicador[],
  inicio: Date,
  fim: Date,
): Promise<ConteudoResumoCiclo["kpisMovidos"]> {
  const out: ConteudoResumoCiclo["kpisMovidos"] = [];
  for (const ind of indicadores) {
    const leituras = await storage.getLeituras(ind.id);
    const noPeriodo = leituras.filter((l) => dentroDoIntervalo(l.registradoEm ?? null, inicio, fim));
    if (noPeriodo.length === 0) continue;
    const ordenadas = [...noPeriodo].sort(
      (a, b) => (a.registradoEm?.getTime() ?? 0) - (b.registradoEm?.getTime() ?? 0),
    );
    const de = ordenadas[0]?.valor ?? null;
    const para = ordenadas[ordenadas.length - 1]?.valor ?? null;
    if (de === para) continue;
    out.push({
      id: ind.id,
      nome: ind.nome,
      de,
      para,
      statusFinal: ind.status ?? "",
    });
    if (out.length >= MAX_LIST_ITENS) break;
  }
  return out;
}

async function montarConteudoObjetivo(
  empresaId: string,
  objetivoId: string,
): Promise<{ conteudo: ConteudoResumoCiclo; periodo: string }> {
  const objetivos = await storage.getObjetivos(empresaId);
  const obj = objetivos.find((o) => o.id === objetivoId);
  if (!obj) throw new Error("Objetivo não encontrado");
  const krs = await storage.getResultadosChave(obj.id, empresaId);
  const pct = pctMedioKrs(krs);
  const retros = (await storage.getRetrospectivasByObjetivo(obj.id))
    .filter((r) => r.empresaId === empresaId);

  const conquistas: string[] = [];
  const atrasos: string[] = [];
  const licoes: string[] = [];

  for (const kr of krs) {
    const ini = Number(kr.valorInicial);
    const alvo = Number(kr.valorAlvo);
    const atual = Number(kr.valorAtual);
    if (Number.isFinite(ini) && Number.isFinite(alvo) && Number.isFinite(atual) && alvo !== ini) {
      const p = Math.round(((atual - ini) / (alvo - ini)) * 100);
      if (p >= 100) conquistas.push(`KR atingido: ${kr.metrica} (${p}%)`);
      else if (p < 50) atrasos.push(`KR abaixo do esperado: ${kr.metrica} (${p}%)`);
    }
    if (kr.confiancaAtual === "vermelho") {
      atrasos.push(`KR em risco no encerramento: ${kr.metrica}`);
    }
  }
  for (const r of retros) {
    if (r.conquistas) conquistas.push(r.conquistas);
    if (r.falhas) atrasos.push(r.falhas);
    if (r.aprendizados) licoes.push(r.aprendizados);
    if (r.ajustes) licoes.push(`Ajuste: ${r.ajustes}`);
  }

  const periodo = `Objetivo: ${obj.titulo.slice(0, 60)}`;
  const resumoCurto = `Encerramento de objetivo "${obj.titulo}" — `
    + `${krs.length} KRs, ${pct != null ? `${pct}% médio` : "sem progresso aferido"}.`;

  return {
    periodo,
    conteudo: {
      resumoCurto,
      conquistas: dedupTrunc(conquistas),
      atrasos: dedupTrunc(atrasos),
      licoes: dedupTrunc(licoes),
      decisoes: [],
      kpisMovidos: [],
      iniciativasConcluidas: [],
      iniciativasArquivadas: [],
      okrsEncerrados: [{ id: obj.id, titulo: obj.titulo, pctMedio: pct }],
      retrospectivasIds: retros.map((r) => r.id),
    },
  };
}

async function montarConteudoEstrategia(
  empresaId: string,
  estrategiaId: string,
): Promise<{ conteudo: ConteudoResumoCiclo; periodo: string }> {
  const est = await storage.getEstrategia(estrategiaId);
  if (!est || est.empresaId !== empresaId) throw new Error("Estratégia não encontrada");
  const vinc = await storage.getEstrategiaVinculados(estrategiaId, empresaId);

  const conquistas: string[] = [];
  const atrasos: string[] = [];
  for (const i of vinc.iniciativas) {
    if (i.status === "concluida" || i.status === "concluída") {
      conquistas.push(`Iniciativa concluída: ${i.titulo}`);
    } else if (i.progresso < 50) {
      atrasos.push(`Iniciativa em atraso: ${i.titulo} (${i.progresso}%)`);
    }
  }
  for (const o of vinc.okrs) {
    if (o.encerrado) conquistas.push(`Objetivo encerrado: ${o.titulo} (${o.progresso}%)`);
  }

  const periodo = `Estratégia: ${est.titulo.slice(0, 60)}`;
  const resumoCurto = `Estratégia "${est.titulo}" — `
    + `${vinc.iniciativas.length} iniciativas, ${vinc.okrs.length} objetivos vinculados.`;

  return {
    periodo,
    conteudo: {
      resumoCurto,
      conquistas: dedupTrunc(conquistas),
      atrasos: dedupTrunc(atrasos),
      licoes: [],
      decisoes: [],
      kpisMovidos: [],
      iniciativasConcluidas: [],
      iniciativasArquivadas: [],
      okrsEncerrados: [],
      retrospectivasIds: [],
    },
  };
}

async function montarConteudoIniciativa(
  empresaId: string,
  iniciativaId: string,
): Promise<{ conteudo: ConteudoResumoCiclo; periodo: string }> {
  const it = await storage.getIniciativa(iniciativaId);
  if (!it || it.empresaId !== empresaId) throw new Error("Iniciativa não encontrada");
  const status = (it.status ?? "").toLowerCase();
  const conquistas: string[] = [];
  const atrasos: string[] = [];
  if (status === "concluida" || status === "concluída") {
    conquistas.push(`Concluída: ${it.titulo}`);
  } else {
    atrasos.push(`Encerrada sem conclusão (${it.status}): ${it.titulo}`);
  }
  const periodo = `Iniciativa: ${it.titulo.slice(0, 60)}`;
  const resumoCurto = `Iniciativa "${it.titulo}" encerrada com status ${it.status}.`;
  return {
    periodo,
    conteudo: {
      resumoCurto,
      conquistas,
      atrasos,
      licoes: it.notaEncerramento ? [it.notaEncerramento] : [],
      decisoes: [],
      kpisMovidos: [],
      iniciativasConcluidas: status.startsWith("conclu")
        ? [{ id: it.id, titulo: it.titulo, nota: it.notaEncerramento ?? "" }]
        : [],
      iniciativasArquivadas: !status.startsWith("conclu")
        ? [{ id: it.id, titulo: it.titulo, motivo: it.notaEncerramento ?? it.status }]
        : [],
      okrsEncerrados: [],
      retrospectivasIds: [],
    },
  };
}

/** Gera (ou regera, com nova versão) um resumo de ciclo. Determinístico,
 *  sem LLM. Sempre cria uma nova linha imutável.
 */
export async function gerarResumoCiclo(opts: GerarResumoOpts): Promise<BizzyResumoCiclo> {
  const { empresaId, tipo, referenciaId = null, geradoPor = "auto" } = opts;
  let conteudo: ConteudoResumoCiclo;
  let periodo: string;

  if (tipo === "trimestre") {
    const intervalo = opts.periodo
      ? intervaloDoPeriodo(opts.periodo)
      : null;
    const ti = intervalo ?? trimestreAtual();
    periodo = opts.periodo ?? trimestreAtual().periodo;
    conteudo = await montarConteudoTrimestre(empresaId, ti.inicio, ti.fim);
  } else if (tipo === "objetivo") {
    if (!referenciaId) throw new Error("referenciaId obrigatório para tipo=objetivo");
    const r = await montarConteudoObjetivo(empresaId, referenciaId);
    conteudo = r.conteudo;
    periodo = opts.periodo ?? r.periodo;
  } else if (tipo === "estrategia") {
    if (!referenciaId) throw new Error("referenciaId obrigatório para tipo=estrategia");
    const r = await montarConteudoEstrategia(empresaId, referenciaId);
    conteudo = r.conteudo;
    periodo = opts.periodo ?? r.periodo;
  } else {
    if (!referenciaId) throw new Error("referenciaId obrigatório para tipo=iniciativa");
    const r = await montarConteudoIniciativa(empresaId, referenciaId);
    conteudo = r.conteudo;
    periodo = opts.periodo ?? r.periodo;
  }

  const versao = await storage.getProximaVersaoResumoCiclo(empresaId, tipo, referenciaId, periodo);
  return storage.createResumoCiclo({
    empresaId,
    tipo,
    referenciaId,
    periodo,
    versao,
    conteudo: conteudo as unknown,
    imutavel: true,
    geradoPor,
  } as never);
}

// ─── Renderização para o prompt do Bizzy ────────────────────────────────────
// Formata os 3 resumos mais recentes em ≤800 tokens (~3200 chars). Se
// estourar, descarta primeiro: decisoes → kpisMovidos → iniciativas →
// okrsEncerrados, mantendo conquistas + atrasos + lições intactos.

const MAX_CHARS_HISTORICO = 3200;

function renderResumo(row: BizzyResumoCiclo, modo: "completo" | "essencial"): string {
  const c = lerConteudoResumo(row);
  const linhas: string[] = [];
  const dataIso = (row.criadoEm ?? new Date()).toISOString().slice(0, 10);
  linhas.push(`### ${row.tipo.toUpperCase()} • ${row.periodo} (v${row.versao}, ${dataIso})`);
  if (c.resumoCurto) linhas.push(c.resumoCurto);
  if (c.conquistas.length > 0) linhas.push(`Conquistas: ${c.conquistas.slice(0, 5).join("; ")}`);
  if (c.atrasos.length > 0) linhas.push(`Atrasos: ${c.atrasos.slice(0, 5).join("; ")}`);
  if (c.licoes.length > 0) linhas.push(`Lições: ${c.licoes.slice(0, 5).join("; ")}`);
  if (modo === "completo") {
    if (c.decisoes.length > 0) {
      linhas.push(`Decisões: ${c.decisoes.slice(0, 4).map((d) => `${d.titulo}→${d.escolha}`).join("; ")}`);
    }
    if (c.kpisMovidos.length > 0) {
      linhas.push(`KPIs: ${c.kpisMovidos.slice(0, 4).map((k) => `${k.nome} ${k.de ?? "?"}→${k.para ?? "?"}`).join("; ")}`);
    }
    if (c.okrsEncerrados.length > 0) {
      linhas.push(`Objetivos encerrados: ${c.okrsEncerrados.slice(0, 4).map((o) => `${o.titulo}${o.pctMedio != null ? ` (${o.pctMedio}%)` : ""}`).join("; ")}`);
    }
  }
  return linhas.join("\n");
}

/** Constrói o bloco textual de "HISTÓRICO DE CICLOS" injetado no system
 *  prompt do Bizzy. Pega os 3 resumos mais recentes da empresa e aplica
 *  truncamento progressivo até caber em ~800 tokens.
 */
export async function buildHistoricoContextoIA(empresaId: string): Promise<string> {
  const recentes = await storage.listResumosCicloByEmpresa(empresaId, 3);
  if (recentes.length === 0) return "";

  const completo = recentes.map((r) => renderResumo(r, "completo")).join("\n\n");
  if (completo.length <= MAX_CHARS_HISTORICO) return completo;

  // Fallback: mantém só os pilares (conquistas + atrasos + lições).
  const essencial = recentes.map((r) => renderResumo(r, "essencial")).join("\n\n");
  if (essencial.length <= MAX_CHARS_HISTORICO) return essencial;

  // Último recurso: corta no limite, com aviso.
  return essencial.slice(0, MAX_CHARS_HISTORICO - 60) + "\n…(histórico truncado por limite de tokens)";
}

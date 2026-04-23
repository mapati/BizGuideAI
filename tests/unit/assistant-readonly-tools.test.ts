// Task #306 — Cobertura unitária das demais ferramentas read-only do
// Assistente, complementando a Task #291 (que cobriu apenas as 5 tools de
// diagnóstico ativo). As ferramentas exercitadas aqui são determinísticas e
// críticas para a confiança do usuário no Bizzy:
//   - analisar_indicador
//   - projetar_kr
//   - simular_impacto
//   - comparar_periodos
//   - consultar_historico_estrategia
//   - consultar_resumo_ciclo
//
// Estratégia de mock segue o padrão da Task #291: stub de `./storage`,
// `./ai-helpers` e `./bizzy-resumos`. `./plan-insights` roda real, dando
// cobertura indireta de getKpiTendencia, projetarValorKr, comparePeriodos
// etc. O dispatcher público `executarFerramentaReadonly` é o ponto de
// entrada exercitado (assim valida-se também o schema Zod de cada tool).

import { describe, it, expect, beforeEach, vi } from "vitest";

const EMPRESA = "empresa-teste-306";

// ---------- Fake storage ----------
type Row = Record<string, unknown>;

interface FakeData {
  indicadores: Row[];
  iniciativas: Row[];
  objetivos: Row[];
  estrategias: Row[];
  resultadosChavePorObjetivo: Map<string, Row[]>;
  leiturasPorIndicador: Map<string, Row[]>;
  propostas: Row[];
  resumosCiclo: Row[];
}

const data: FakeData = {
  indicadores: [],
  iniciativas: [],
  objetivos: [],
  estrategias: [],
  resultadosChavePorObjetivo: new Map(),
  leiturasPorIndicador: new Map(),
  propostas: [],
  resumosCiclo: [],
};

function resetData() {
  data.indicadores = [];
  data.iniciativas = [];
  data.objetivos = [];
  data.estrategias = [];
  data.resultadosChavePorObjetivo = new Map();
  data.leiturasPorIndicador = new Map();
  data.propostas = [];
  data.resumosCiclo = [];
}

vi.mock("../../server/storage", () => {
  return {
    PlanoAtivoJaExisteError: class extends Error {},
    storage: {
      getIndicador: async (id: string) => data.indicadores.find((i) => i.id === id) ?? null,
      getIndicadores: async (_e: string) => data.indicadores,
      getIndicadoresAcompanhamento: async (_e: string) =>
        data.indicadores.filter((i) => String(i.perspectiva ?? "").toLowerCase() !== "diagnostico"),
      getLeituras: async (id: string) => data.leiturasPorIndicador.get(id) ?? [],
      getIniciativa: async (id: string) => data.iniciativas.find((i) => i.id === id) ?? null,
      getIniciativas: async (_e: string) => data.iniciativas,
      getObjetivos: async (_e: string) => data.objetivos,
      getResultadosChave: async (objetivoId: string, _e: string) =>
        data.resultadosChavePorObjetivo.get(objetivoId) ?? [],
      getResultadoChaveById: async (id: string, _e: string) => {
        for (const krs of data.resultadosChavePorObjetivo.values()) {
          const found = krs.find((k) => k.id === id);
          if (found) return found;
        }
        return undefined;
      },
      getEstrategias: async (_e: string) => data.estrategias,
      listPropostasByEmpresa: async (_e: string, _l: number) => data.propostas,
      listResumosCicloByEmpresa: async (_e: string, limit?: number) =>
        data.resumosCiclo.slice(0, limit ?? 20),
      getResumoCicloById: async (id: string, e: string) =>
        data.resumosCiclo.find((r) => r.id === id && r.empresaId === e),
    },
  };
});

vi.mock("../../server/ai-helpers", () => ({
  openai: { chat: { completions: { create: async () => ({}) } } },
  getModelForPlan: () => "gpt-4o-mini",
}));

vi.mock("../../server/bizzy-resumos", () => ({
  gerarResumoCiclo: async () => null,
  // Versão fiel à implementação real: lê `row.conteudo` e aplica defaults.
  lerConteudoResumo: (row: { conteudo?: Record<string, unknown> }) => {
    const c = (row?.conteudo ?? {}) as Record<string, unknown>;
    const arr = (k: string) => (Array.isArray(c[k]) ? (c[k] as unknown[]) : []);
    return {
      resumoCurto: typeof c.resumoCurto === "string" ? c.resumoCurto : "",
      conquistas: arr("conquistas"),
      atrasos: arr("atrasos"),
      licoes: arr("licoes"),
      decisoes: arr("decisoes"),
      kpisMovidos: arr("kpisMovidos"),
      iniciativasConcluidas: arr("iniciativasConcluidas"),
      iniciativasArquivadas: arr("iniciativasArquivadas"),
      okrsEncerrados: arr("okrsEncerrados"),
      retrospectivasIds: arr("retrospectivasIds"),
    };
  },
}));

const { executarFerramentaReadonly } = await import("../../server/assistant-tools");

// ---------- Tipos parciais do contrato de cada tool ----------
interface IndicadorAnaliseResp {
  indicador: {
    id: string;
    nome: string;
    valorAtual: number | null;
    meta: number | null;
    pctAtingido: number | null;
    status: "Verde" | "Amarelo" | "Vermelho" | "Sem dados";
  };
  serie: { data: string; valor: number }[];
  tendencia: "subindo" | "caindo" | "estavel" | "sem_dados";
  deltaPercentual: number | null;
  vinculos: {
    iniciativasVinculadas: { id: string }[];
    krsVinculados: { id: string }[];
  };
  instrucao?: string;
}

interface ProjetarKrResp {
  kr: { id: string; metrica: string; objetivoId: string };
  valorInicial: number | null;
  valorAtual: number | null;
  valorAlvo: number | null;
  valorProjetadoNoPrazo: number | null;
  pctProjetadoVsAlvo: number | null;
  numAtualizacoes: number;
  confianca: "alta" | "baixa";
}

interface SimularImpactoResp {
  iniciativa: { id: string; titulo: string };
  mudanca: { tipo: string; valor?: number };
  novoPrazo: string | null;
  impactos: Array<{
    tipo: string;
    id: string;
    nome?: string;
    metrica?: string;
    nota: string;
    outrosAtacantesIniciativas?: number;
    outrosAtacantesKrs?: number;
  }>;
  totaisPorTipo: Record<string, number>;
  truncado: boolean;
  aviso: string | null;
}

interface CompararPeriodosResp {
  escopo: "kpis" | "iniciativas" | "okrs" | "tudo";
  kpis?: {
    totalAvaliados: number;
    melhoraram: number;
    pioraram: number;
    estaveis: number;
    semDados: number;
    top: { id: string; nome: string; deltaPct: number | null }[];
  };
  iniciativas?: {
    criadasA: number;
    criadasB: number;
    concluidasA: number;
    concluidasB: number;
    atrasadasNoPeriodoA: number;
    atrasadasNoPeriodoB: number;
    top: { id: string; movimento: string; periodo: "A" | "B" }[];
  };
  okrs?: {
    okrsCriadosA: number;
    okrsCriadosB: number;
    mediaPctKrAtualA: number | null;
    mediaPctKrAtualB: number | null;
  };
}

interface HistoricoResp {
  total: number;
  resumos: Array<{
    id: string;
    tipo: string;
    periodo: string;
    versao: number;
    conquistas: unknown[];
    atrasos: unknown[];
    licoes: unknown[];
  }>;
  instrucao?: string;
}

interface ResumoCicloResp {
  id: string;
  tipo: string;
  periodo: string;
  conteudo: {
    resumoCurto: string;
    conquistas: unknown[];
    decisoes: unknown[];
  };
}

type ReadonlyResp = Awaited<ReturnType<typeof executarFerramentaReadonly>>;
function unwrap<T>(r: ReadonlyResp): T {
  if (!r.ok) throw new Error(`tool falhou: ${r.mensagem}`);
  return r.dados as unknown as T;
}
function expectFail(r: ReadonlyResp): string {
  if (r.ok) throw new Error("Esperava falha, mas tool devolveu ok");
  return r.mensagem;
}

// ---------- Fixtures ----------
const HOJE = Date.now();
const DIA = 24 * 60 * 60 * 1000;
const ago = (dias: number) => new Date(HOJE - dias * DIA);
const isoDia = (dias: number) => {
  const d = new Date(HOJE - dias * DIA);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const futuroIso = (dias: number) => {
  const d = new Date(HOJE + dias * DIA);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

function novoObjetivo(over: Partial<Row> = {}): Row {
  return {
    id: `obj-${Math.random().toString(36).slice(2, 10)}`,
    empresaId: EMPRESA,
    titulo: "Objetivo X",
    descricao: null,
    prazo: "Q4 2026",
    prazoData: null,
    perspectiva: "Financeira",
    responsavelId: null,
    estrategiaId: null,
    iniciativaId: null,
    encerrado: false,
    createdAt: ago(120),
    ...over,
  };
}

function novoKr(objetivoId: string, over: Partial<Row> = {}): Row {
  return {
    id: `kr-${Math.random().toString(36).slice(2, 10)}`,
    objetivoId,
    metrica: "Métrica X",
    valorInicial: "0",
    valorAlvo: "100",
    valorAtual: "20",
    owner: "Time",
    prazo: futuroIso(60),
    prazoData: futuroIso(60),
    responsavelId: null,
    indicadorFonteId: null,
    confiancaAtual: null,
    ultimoCheckinEm: null,
    ultimoCheckinComentario: null,
    createdAt: ago(60),
    atualizadoEm: ago(10),
    ...over,
  };
}

function novoIndicador(over: Partial<Row> = {}): Row {
  return {
    id: `ind-${Math.random().toString(36).slice(2, 10)}`,
    empresaId: EMPRESA,
    perspectiva: "Financeira",
    nome: "Indicador X",
    meta: "100",
    atual: "80",
    status: "verde",
    owner: "Time",
    responsavelId: null,
    benchmarkSetorial: null,
    benchmarkAtualizadoEm: null,
    createdAt: ago(120),
    ...over,
  };
}

function novaIniciativa(over: Partial<Row> = {}): Row {
  return {
    id: `ini-${Math.random().toString(36).slice(2, 10)}`,
    empresaId: EMPRESA,
    titulo: "Iniciativa X",
    descricao: "desc",
    status: "em_andamento",
    prioridade: "média",
    prazo: futuroIso(30),
    prazoData: futuroIso(30),
    responsavel: "Alguém",
    responsavelId: null,
    impacto: "",
    estrategiaId: null,
    oportunidadeId: null,
    objetivoOriginadorId: null,
    porque: null,
    onde: null,
    como: null,
    quanto: null,
    indicadorFonteId: null,
    notaEncerramento: null,
    encerradaEm: null,
    ordem: null,
    createdAt: ago(40),
    ...over,
  };
}

beforeEach(() => {
  resetData();
});

// ---------- analisar_indicador ----------
describe("analisar_indicador", () => {
  it("retorna erro descritivo quando indicador não existe nesta empresa", async () => {
    const r = await executarFerramentaReadonly(
      "analisar_indicador",
      { indicadorId: "ind-fantasma-1234" },
      { empresaId: EMPRESA },
    );
    expect(expectFail(r)).toMatch(/Indicador não encontrado/i);
  });

  it("sem leituras: tendência 'sem_dados' + instrução explícita para a IA", async () => {
    const ind = novoIndicador({ id: "ind-sem-leitura-1", nome: "NPS", meta: "70", atual: "40" });
    data.indicadores.push(ind);
    const r = await executarFerramentaReadonly(
      "analisar_indicador",
      { indicadorId: ind.id as string },
      { empresaId: EMPRESA },
    );
    const d = unwrap<IndicadorAnaliseResp>(r);
    expect(d.tendencia).toBe("sem_dados");
    expect(d.serie).toEqual([]);
    expect(d.indicador.valorAtual).toBe(40);
    expect(d.indicador.meta).toBe(70);
    expect(d.indicador.status).toBe("Vermelho");
    expect(d.instrucao).toMatch(/sem leituras/i);
  });

  it("com leituras + iniciativa vinculada: monta série, status e vínculos", async () => {
    const ind = novoIndicador({ id: "ind-churn-12345", nome: "Churn", meta: "10", atual: "8" });
    data.indicadores.push(ind);
    // Série crescente (do mais antigo ao mais novo) — a tool reordena DESC e
    // depois inverte para entregar cronológico ao prompt.
    data.leiturasPorIndicador.set(ind.id as string, [
      { id: "l3", indicadorId: ind.id, valor: "8", registradoEm: ago(5) },
      { id: "l2", indicadorId: ind.id, valor: "9", registradoEm: ago(20) },
      { id: "l1", indicadorId: ind.id, valor: "12", registradoEm: ago(60) },
    ]);
    data.iniciativas.push(
      novaIniciativa({
        id: "ini-vinc-12345",
        titulo: "Atacar churn",
        indicadorFonteId: ind.id,
      }),
    );

    const r = await executarFerramentaReadonly(
      "analisar_indicador",
      { indicadorId: ind.id as string },
      { empresaId: EMPRESA },
    );
    const d = unwrap<IndicadorAnaliseResp>(r);
    expect(d.serie).toHaveLength(3);
    // valorAtual=8, meta=10 → 8/10=0.8 → status Amarelo (>=80%)
    expect(d.indicador.status).toBe("Amarelo");
    expect(d.indicador.pctAtingido).toBeCloseTo(0.8, 5);
    expect(d.tendencia).not.toBe("sem_dados");
    expect(d.vinculos.iniciativasVinculadas.map((i) => i.id)).toContain("ini-vinc-12345");
  });
});

// ---------- projetar_kr ----------
describe("projetar_kr", () => {
  it("KR inexistente: retorna mensagem 'não encontrado'", async () => {
    const r = await executarFerramentaReadonly(
      "projetar_kr",
      { krId: "kr-inexistente-1" },
      { empresaId: EMPRESA },
    );
    expect(expectFail(r)).toMatch(/KR não encontrado/i);
  });

  it("KR sem progresso (valorInicial == valorAtual): projeção sem ritmo, confiança baixa", async () => {
    const obj = novoObjetivo({ id: "obj-proj-1-aaaa" });
    data.objetivos.push(obj);
    const kr = novoKr(obj.id as string, {
      id: "kr-parado-aaaa1",
      valorInicial: "0",
      valorAtual: "0",
      valorAlvo: "100",
    });
    data.resultadosChavePorObjetivo.set(obj.id as string, [kr]);

    const r = await executarFerramentaReadonly(
      "projetar_kr",
      { krId: kr.id as string },
      { empresaId: EMPRESA },
    );
    const d = unwrap<ProjetarKrResp>(r);
    expect(d.kr.id).toBe("kr-parado-aaaa1");
    expect(d.numAtualizacoes).toBe(0);
    expect(d.confianca).toBe("baixa");
  });

  it("KR com ritmo positivo + ≥3 atualizações registradas: confiança alta", async () => {
    const obj = novoObjetivo({ id: "obj-proj-2-aaaa" });
    data.objetivos.push(obj);
    const kr = novoKr(obj.id as string, {
      id: "kr-andando-aaaa1",
      valorInicial: "0",
      valorAtual: "50",
      valorAlvo: "100",
      createdAt: ago(60),
      atualizadoEm: ago(1),
    });
    data.resultadosChavePorObjetivo.set(obj.id as string, [kr]);
    // Log de propostas confirmadas — vira `numAtualizacoes` via
    // contarAtualizacoesKr (proxy histórico do KR).
    for (let i = 0; i < 3; i++) {
      data.propostas.push({
        id: `p-${i}`,
        empresaId: EMPRESA,
        ferramenta: "atualizar_progresso_kr",
        status: "confirmada",
        parametros: { krId: kr.id },
      });
    }
    const r = await executarFerramentaReadonly(
      "projetar_kr",
      { krId: kr.id as string },
      { empresaId: EMPRESA },
    );
    const d = unwrap<ProjetarKrResp>(r);
    expect(d.numAtualizacoes).toBe(3);
    expect(d.valorProjetadoNoPrazo).not.toBeNull();
    expect(d.confianca).toBe("alta");
  });
});

// ---------- simular_impacto ----------
describe("simular_impacto", () => {
  it("iniciativa inexistente: retorna mensagem clara", async () => {
    const r = await executarFerramentaReadonly(
      "simular_impacto",
      { iniciativaId: "ini-fantasma-12345", mudanca: { tipo: "cancelar" } },
      { empresaId: EMPRESA },
    );
    expect(expectFail(r)).toMatch(/Iniciativa não encontrada/i);
  });

  it("iniciativa sem KPI nem estratégia: retorna aviso de 'nenhum vínculo'", async () => {
    data.iniciativas.push(novaIniciativa({ id: "ini-solta-12345" }));
    const r = await executarFerramentaReadonly(
      "simular_impacto",
      { iniciativaId: "ini-solta-12345", mudanca: { tipo: "cancelar" } },
      { empresaId: EMPRESA },
    );
    const d = unwrap<SimularImpactoResp>(r);
    expect(d.impactos).toEqual([]);
    expect(d.aviso).toMatch(/Nenhum vínculo/i);
    expect(d.novoPrazo).toBeNull();
  });

  it("cancelar iniciativa que era única atacante de um KPI: nota 'fica órfão'", async () => {
    const ind = novoIndicador({ id: "ind-orfao-12345", nome: "NPS" });
    data.indicadores.push(ind);
    data.iniciativas.push(
      novaIniciativa({
        id: "ini-unica-12345",
        titulo: "Única",
        indicadorFonteId: ind.id,
      }),
    );
    const r = await executarFerramentaReadonly(
      "simular_impacto",
      { iniciativaId: "ini-unica-12345", mudanca: { tipo: "cancelar" } },
      { empresaId: EMPRESA },
    );
    const d = unwrap<SimularImpactoResp>(r);
    const kpiImpacto = d.impactos.find((i) => i.tipo === "kpi");
    expect(kpiImpacto).toBeDefined();
    expect(kpiImpacto!.outrosAtacantesIniciativas).toBe(0);
    expect(kpiImpacto!.outrosAtacantesKrs).toBe(0);
    expect(kpiImpacto!.nota).toMatch(/órfão|orfao|NENHUM/i);
  });

  it("adiar_dias: calcula novoPrazo a partir do prazo da iniciativa", async () => {
    const prazoOrig = "2026-06-15";
    data.iniciativas.push(
      novaIniciativa({ id: "ini-adia-12345", prazo: prazoOrig, prazoData: prazoOrig }),
    );
    const r = await executarFerramentaReadonly(
      "simular_impacto",
      { iniciativaId: "ini-adia-12345", mudanca: { tipo: "adiar_dias", valor: 30 } },
      { empresaId: EMPRESA },
    );
    const d = unwrap<SimularImpactoResp>(r);
    expect(d.novoPrazo).toBe("2026-07-15");
  });
});

// ---------- comparar_periodos ----------
describe("comparar_periodos", () => {
  it("rejeita quando período tem inicio > fim", async () => {
    const r = await executarFerramentaReadonly(
      "comparar_periodos",
      {
        escopo: "kpis",
        periodoA: { inicio: "2026-04-30", fim: "2026-04-01" },
        periodoB: { inicio: "2026-05-01", fim: "2026-05-31" },
      },
      { empresaId: EMPRESA },
    );
    expect(expectFail(r)).toMatch(/periodoA inválido|inválido/i);
  });

  it("kpis: classifica melhorou/piorou pela última leitura de cada janela", async () => {
    const indSobe = novoIndicador({ id: "ind-sobe-1234", nome: "Receita" });
    const indDesce = novoIndicador({ id: "ind-desce-12", nome: "Custo" });
    const indSemDados = novoIndicador({ id: "ind-vazio-12", nome: "Vazio" });
    data.indicadores.push(indSobe, indDesce, indSemDados);
    // janelas: A = [60..40d], B = [20..1d]
    data.leiturasPorIndicador.set(indSobe.id as string, [
      // DESC por registradoEm
      { valor: "120", registradoEm: ago(5) },
      { valor: "100", registradoEm: ago(50) },
    ]);
    data.leiturasPorIndicador.set(indDesce.id as string, [
      { valor: "50", registradoEm: ago(5) },
      { valor: "100", registradoEm: ago(50) },
    ]);
    data.leiturasPorIndicador.set(indSemDados.id as string, []);

    const r = await executarFerramentaReadonly(
      "comparar_periodos",
      {
        escopo: "kpis",
        periodoA: { inicio: isoDia(60), fim: isoDia(40) },
        periodoB: { inicio: isoDia(20), fim: isoDia(1) },
      },
      { empresaId: EMPRESA },
    );
    const d = unwrap<CompararPeriodosResp>(r);
    expect(d.kpis!.totalAvaliados).toBe(3);
    expect(d.kpis!.melhoraram).toBe(1);
    expect(d.kpis!.pioraram).toBe(1);
    expect(d.kpis!.semDados).toBe(1);
    expect(d.kpis!.top[0].nome).toMatch(/Receita|Custo/);
  });

  it("iniciativas: conta criadas em A vs B; janelas vazias devolvem zeros", async () => {
    data.iniciativas.push(
      novaIniciativa({ id: "ini-a-12345", createdAt: ago(50) }),
      novaIniciativa({ id: "ini-b-12345", createdAt: ago(5) }),
    );
    const r = await executarFerramentaReadonly(
      "comparar_periodos",
      {
        escopo: "iniciativas",
        periodoA: { inicio: isoDia(60), fim: isoDia(40) },
        periodoB: { inicio: isoDia(20), fim: isoDia(1) },
      },
      { empresaId: EMPRESA },
    );
    const d = unwrap<CompararPeriodosResp>(r);
    expect(d.iniciativas!.criadasA).toBe(1);
    expect(d.iniciativas!.criadasB).toBe(1);

    // Mesma cascata, mas janelas no futuro → ambas vazias.
    const vazio = await executarFerramentaReadonly(
      "comparar_periodos",
      {
        escopo: "iniciativas",
        periodoA: { inicio: futuroIso(100), fim: futuroIso(120) },
        periodoB: { inicio: futuroIso(130), fim: futuroIso(150) },
      },
      { empresaId: EMPRESA },
    );
    const dv = unwrap<CompararPeriodosResp>(vazio);
    expect(dv.iniciativas!.criadasA).toBe(0);
    expect(dv.iniciativas!.criadasB).toBe(0);
  });

  it("escopo='tudo' devolve as três seções juntas", async () => {
    const r = await executarFerramentaReadonly(
      "comparar_periodos",
      {
        escopo: "tudo",
        periodoA: { inicio: isoDia(60), fim: isoDia(40) },
        periodoB: { inicio: isoDia(20), fim: isoDia(1) },
      },
      { empresaId: EMPRESA },
    );
    const d = unwrap<CompararPeriodosResp>(r);
    expect(d.kpis).toBeDefined();
    expect(d.iniciativas).toBeDefined();
    expect(d.okrs).toBeDefined();
  });
});

// ---------- consultar_historico_estrategia ----------
describe("consultar_historico_estrategia", () => {
  it("empresa sem resumos: total=0 + instrução para gerar o primeiro", async () => {
    const r = await executarFerramentaReadonly(
      "consultar_historico_estrategia",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<HistoricoResp>(r);
    expect(d.total).toBe(0);
    expect(d.resumos).toEqual([]);
    expect(d.instrucao).toMatch(/gerar_resumo_ciclo_manual/);
  });

  it("respeita filtro 'tipo' e cap 'limite'", async () => {
    for (let i = 0; i < 6; i++) {
      data.resumosCiclo.push({
        id: `res-trim-${i}`,
        empresaId: EMPRESA,
        tipo: "trimestre",
        periodo: `2025-Q${(i % 4) + 1}`,
        versao: 1,
        referenciaId: null,
        criadoEm: ago(60 + i),
        geradoPor: "auto",
        imutavel: true,
        conteudo: { resumoCurto: `R${i}`, conquistas: ["c1"], atrasos: [], licoes: [] },
      });
    }
    data.resumosCiclo.push({
      id: "res-obj-1",
      empresaId: EMPRESA,
      tipo: "objetivo",
      periodo: "Objetivo Y",
      versao: 1,
      referenciaId: "obj-y",
      criadoEm: ago(10),
      geradoPor: "auto",
      imutavel: true,
      conteudo: { resumoCurto: "fechou", conquistas: [], atrasos: [], licoes: [] },
    });

    const r = await executarFerramentaReadonly(
      "consultar_historico_estrategia",
      { tipo: "objetivo", limite: 5 },
      { empresaId: EMPRESA },
    );
    const d = unwrap<HistoricoResp>(r);
    expect(d.resumos).toHaveLength(1);
    expect(d.resumos[0].id).toBe("res-obj-1");
    expect(d.resumos[0].tipo).toBe("objetivo");

    const r2 = await executarFerramentaReadonly(
      "consultar_historico_estrategia",
      { limite: 3 },
      { empresaId: EMPRESA },
    );
    const d2 = unwrap<HistoricoResp>(r2);
    expect(d2.resumos).toHaveLength(3);
  });

  it("rejeita parâmetros inválidos (limite fora do range)", async () => {
    const r = await executarFerramentaReadonly(
      "consultar_historico_estrategia",
      { limite: 999 },
      { empresaId: EMPRESA },
    );
    expect(expectFail(r)).toMatch(/Parâmetros inválidos/i);
  });
});

// ---------- consultar_resumo_ciclo ----------
describe("consultar_resumo_ciclo", () => {
  it("resumo inexistente: mensagem clara", async () => {
    const r = await executarFerramentaReadonly(
      "consultar_resumo_ciclo",
      { resumoId: "res-fantasma-12345" },
      { empresaId: EMPRESA },
    );
    expect(expectFail(r)).toMatch(/Resumo de ciclo não encontrado/i);
  });

  it("resumo de outro tenant não vaza para esta empresa", async () => {
    data.resumosCiclo.push({
      id: "res-outro-tenant-1",
      empresaId: "outra-empresa",
      tipo: "trimestre",
      periodo: "2025-Q1",
      versao: 1,
      referenciaId: null,
      criadoEm: ago(30),
      geradoPor: "auto",
      imutavel: true,
      conteudo: { resumoCurto: "secreto" },
    });
    const r = await executarFerramentaReadonly(
      "consultar_resumo_ciclo",
      { resumoId: "res-outro-tenant-1" },
      { empresaId: EMPRESA },
    );
    expect(expectFail(r)).toMatch(/não encontrado/i);
  });

  it("devolve conteúdo completo do resumo da empresa", async () => {
    data.resumosCiclo.push({
      id: "res-meu-1234567",
      empresaId: EMPRESA,
      tipo: "trimestre",
      periodo: "2026-Q1",
      versao: 2,
      referenciaId: null,
      criadoEm: ago(10),
      geradoPor: "manual",
      imutavel: true,
      conteudo: {
        resumoCurto: "Trimestre forte",
        conquistas: ["dobrou MRR"],
        atrasos: ["churn ainda alto"],
        decisoes: ["focar enterprise"],
        licoes: [],
      },
    });
    const r = await executarFerramentaReadonly(
      "consultar_resumo_ciclo",
      { resumoId: "res-meu-1234567" },
      { empresaId: EMPRESA },
    );
    const d = unwrap<ResumoCicloResp>(r);
    expect(d.id).toBe("res-meu-1234567");
    expect(d.periodo).toBe("2026-Q1");
    expect(d.conteudo.resumoCurto).toBe("Trimestre forte");
    expect(d.conteudo.conquistas).toEqual(["dobrou MRR"]);
    expect(d.conteudo.decisoes).toEqual(["focar enterprise"]);
  });
});

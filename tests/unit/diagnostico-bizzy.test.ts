// Task #291 — Cobertura de testes para o diagnóstico ativo do Bizzy.
//
// Testa as 5 ferramentas read-only introduzidas na Task #285:
//   - analisar_gap_meta_vs_realizado (kpi/kr/objetivo)
//   - detectar_lacunas_cascata
//   - detectar_objetivos_descarrilados
//   - analisar_consistencia_estrategica
//   - sumarizar_ciclo_atual
//
// As funções helper (`runAnalisarGap`, etc.) são privadas, então o teste
// passa pelo dispatcher público `executarFerramentaReadonly` — que valida
// schema Zod + delega ao helper. Isso protege contra regressão tanto da
// validação de input quanto do contrato de saída usado pelo Assistente.
//
// Estratégia de mock: substituímos `./storage`, `./ai-helpers` e
// `./bizzy-resumos` por fakes leves. `./plan-insights` roda de verdade
// (depende só de storage), o que dá cobertura indireta extra dos
// helpers reusados (carregarKrsDaEmpresa, projetarValorKr, etc.).

import { describe, it, expect, beforeEach, vi } from "vitest";

const EMPRESA = "empresa-teste-291";

// ---------- Fake storage configurável por teste ----------
type Row = Record<string, unknown>;

interface FakeData {
  indicadores: Row[];
  iniciativas: Row[];
  objetivos: Row[];
  estrategias: Row[];
  resultadosChavePorObjetivo: Map<string, Row[]>;
  leiturasPorIndicador: Map<string, Row[]>;
  checkinsPorKr: Map<string, Row[]>;
  reuniaoAtas: Row[];
  decisoesEstrategicas: Row[];
  propostas: Row[];
}

const data: FakeData = {
  indicadores: [],
  iniciativas: [],
  objetivos: [],
  estrategias: [],
  resultadosChavePorObjetivo: new Map(),
  leiturasPorIndicador: new Map(),
  checkinsPorKr: new Map(),
  reuniaoAtas: [],
  decisoesEstrategicas: [],
  propostas: [],
};

function resetData() {
  data.indicadores = [];
  data.iniciativas = [];
  data.objetivos = [];
  data.estrategias = [];
  data.resultadosChavePorObjetivo = new Map();
  data.leiturasPorIndicador = new Map();
  data.checkinsPorKr = new Map();
  data.reuniaoAtas = [];
  data.decisoesEstrategicas = [];
  data.propostas = [];
}

vi.mock("../../server/storage", () => {
  return {
    PlanoAtivoJaExisteError: class extends Error {},
    storage: {
      getIndicador: async (id: string) => data.indicadores.find((i) => i.id === id) ?? null,
      getIndicadores: async (_e: string) => data.indicadores,
      getLeituras: async (id: string) => data.leiturasPorIndicador.get(id) ?? [],
      getIniciativa: async (id: string) => data.iniciativas.find((i) => i.id === id) ?? null,
      getIniciativas: async (_e: string) => data.iniciativas,
      getObjetivos: async (_e: string) => data.objetivos,
      getResultadosChave: async (objetivoId: string, _e: string) =>
        data.resultadosChavePorObjetivo.get(objetivoId) ?? [],
      getEstrategias: async (_e: string) => data.estrategias,
      getReuniaoAtas: async (_e: string, _l?: number) => data.reuniaoAtas,
      getDecisoesEstrategicas: async (_e: string, _l?: number) => data.decisoesEstrategicas,
      getKrCheckins: async (krId: string, _e: string) => data.checkinsPorKr.get(krId) ?? [],
      listPropostasByEmpresa: async (_e: string, _l: number) => data.propostas,
    },
  };
});

vi.mock("../../server/ai-helpers", () => ({
  openai: { chat: { completions: { create: async () => ({}) } } },
  getModelForPlan: () => "gpt-4o-mini",
}));

vi.mock("../../server/bizzy-resumos", () => ({
  gerarResumoCiclo: async () => null,
  lerConteudoResumo: () => ({
    resumoCurto: "",
    conquistas: [],
    atrasos: [],
    licoes: [],
  }),
}));

// Importa o módulo sob teste APÓS os mocks.
const { executarFerramentaReadonly } = await import("../../server/assistant-tools");

// ---------- Tipos do contrato das 5 ferramentas (subset usado nos testes) ----------
// Espelham apenas os campos asserted; o objetivo é evitar `any` mantendo o
// custo de manutenção baixo (campos ignorados são tolerados via `unknown`).

type Semaforo = "verde" | "amarelo" | "vermelho" | "sem_dados";

interface LacunasResp {
  iniciativasSemObjetivo: { id: string; titulo: string; status: string }[];
  objetivosSemKr: { id: string; titulo: string }[];
  kpisSemKrAtacando: { id: string; nome: string }[];
  kpisSemIniciativaAtacando: { id: string; nome: string }[];
  estrategiasSemIniciativa: { id: string; titulo: string }[];
  totais: {
    iniciativas: number;
    objetivos: number;
    kpis: number;
    estrategias: number;
    krs: number;
  };
  informativo: {
    krsSemIndicadorFonteTotal: number;
    krsSemIndicadorFonteAmostra: { id: string; metrica: string }[];
    observacao: string;
  };
}

interface DescarrilladoItem {
  id: string;
  titulo: string;
  totalKrs: number;
  pctMedio: number | null;
  diasSemCheckin: number | null;
  motivos: string[];
  krMaisAtrasado: { id: string; metrica: string; pct: number | null } | null;
}
interface DescarriladosResp {
  descarrilados: DescarrilladoItem[];
  criterios: { diasSemCheckinLimite: number; pctMinimoAceitavel: number };
  totalObjetivosAtivos: number;
}

interface ConsistenciaLinha {
  id: string;
  titulo: string;
  objetivosVinculados: number;
  iniciativasVinculadas: number;
  iniciativasQueTocamKpi: number;
  furos: string[];
}
interface ConsistenciaResp {
  porEstrategia: ConsistenciaLinha[];
  estrategiasComFuros: ConsistenciaLinha[];
  objetivosSemIniciativa: { id: string; titulo: string }[];
}

interface CicloItem {
  tipo: string;
  id: string;
  titulo?: string;
  metrica?: string;
}
interface AtrasoItem {
  id: string;
  titulo: string;
  prazo: string;
  diasAtraso: number | null;
}
interface CicloResp {
  cicloRotulo: string;
  pctExecutado: number;
  iniciativasConcluidasNoCiclo: number;
  iniciativasAtivasOuConcluidas: number;
  checkinsNoCiclo: number;
  topConquistas: CicloItem[];
  topAtrasos: AtrasoItem[];
}

interface GapKpiResp {
  tipo: "kpi";
  valorAtual: number | null;
  meta: number | null;
  gapAbsoluto: number | null;
  gapPct: number | null;
  status: Semaforo;
  diasSemLeitura: number | null;
  iniciativasVinculadas: number;
  causasProvaveis: string[];
}
interface GapKrResp {
  tipo: "kr";
  pctAtingido: number | null;
  diasAtePrazo: number | null;
  causasProvaveis: string[];
}
interface GapObjResp {
  tipo: "objetivo";
  totalKrs: number;
  pctMedio: number | null;
  gapPct: number | null;
  krMaisAtrasado: { id: string; metrica: string; pct: number | null } | null;
}
interface GapErroResp {
  erro: string;
}

// Dispatcher devolve {ok, dados} | {ok:false, mensagem}. Helper extrai dados
// tipados — falhar com Error é aceitável dentro de um teste.
type ReadonlyResp = Awaited<ReturnType<typeof executarFerramentaReadonly>>;
function unwrap<T>(r: ReadonlyResp): T {
  if (!r.ok) throw new Error(`tool falhou: ${r.mensagem}`);
  return r.dados as unknown as T;
}

// ---------- Helpers de fixture ----------
const HOJE = Date.now();
const DIA = 24 * 60 * 60 * 1000;
const ago = (dias: number) => new Date(HOJE - dias * DIA);

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
    prazo: "2026-12-31",
    prazoData: "2026-12-31",
    responsavelId: null,
    indicadorFonteId: null,
    confiancaAtual: null,
    ultimoCheckinEm: null,
    ultimoCheckinComentario: null,
    createdAt: ago(60),
    atualizadoEm: ago(30),
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
    prazo: "2026-12-31",
    prazoData: "2026-12-31",
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

function novaEstrategia(over: Partial<Row> = {}): Row {
  return {
    id: `est-${Math.random().toString(36).slice(2, 10)}`,
    empresaId: EMPRESA,
    tipo: "ofensiva",
    titulo: "Estratégia X",
    descricao: "...",
    prioridade: "alta",
    status: "ativa",
    swotOrigemIds: null,
    ordem: null,
    createdAt: ago(120),
    ...over,
  };
}

beforeEach(() => {
  resetData();
});

// ---------- Empresa vazia ----------
describe("Diagnóstico — empresa vazia", () => {
  it("detectar_lacunas_cascata: retorna listas vazias e totais=0", async () => {
    const r = await executarFerramentaReadonly(
      "detectar_lacunas_cascata",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<LacunasResp>(r);
    expect(d.iniciativasSemObjetivo).toEqual([]);
    expect(d.objetivosSemKr).toEqual([]);
    expect(d.kpisSemKrAtacando).toEqual([]);
    expect(d.kpisSemIniciativaAtacando).toEqual([]);
    expect(d.estrategiasSemIniciativa).toEqual([]);
    expect(d.totais).toEqual({
      iniciativas: 0,
      objetivos: 0,
      kpis: 0,
      estrategias: 0,
      krs: 0,
    });
    expect(d.informativo.krsSemIndicadorFonteTotal).toBe(0);
  });

  it("detectar_objetivos_descarrilados: lista vazia em empresa sem objetivos", async () => {
    const r = await executarFerramentaReadonly(
      "detectar_objetivos_descarrilados",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<DescarriladosResp>(r);
    expect(d.descarrilados).toEqual([]);
    expect(d.totalObjetivosAtivos).toBe(0);
    expect(d.criterios).toEqual({ diasSemCheckinLimite: 21, pctMinimoAceitavel: 30 });
  });

  it("analisar_consistencia_estrategica: tudo zerado, sem furos", async () => {
    const r = await executarFerramentaReadonly(
      "analisar_consistencia_estrategica",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<ConsistenciaResp>(r);
    expect(d.porEstrategia).toEqual([]);
    expect(d.estrategiasComFuros).toEqual([]);
    expect(d.objetivosSemIniciativa).toEqual([]);
  });

  it("sumarizar_ciclo_atual: zera contagens e devolve trimestre vigente", async () => {
    const r = await executarFerramentaReadonly(
      "sumarizar_ciclo_atual",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<CicloResp>(r);
    expect(d.pctExecutado).toBe(0);
    expect(d.iniciativasConcluidasNoCiclo).toBe(0);
    expect(d.checkinsNoCiclo).toBe(0);
    expect(d.topConquistas).toEqual([]);
    expect(d.topAtrasos).toEqual([]);
    expect(d.cicloRotulo).toMatch(/^Q[1-4]\/\d{4}$/);
  });

  it("analisar_gap (kpi inexistente): retorna erro descritivo", async () => {
    const r = await executarFerramentaReadonly(
      "analisar_gap_meta_vs_realizado",
      { tipo: "kpi", id: "id-fantasma-12345" },
      { empresaId: EMPRESA },
    );
    const d = unwrap<GapErroResp>(r);
    expect(d.erro).toMatch(/KPI não encontrado/i);
  });
});

// ---------- analisar_gap por tipo ----------
describe("analisar_gap_meta_vs_realizado", () => {
  it("kpi: detecta gap, sem leitura há muito tempo e ausência de iniciativas", async () => {
    const ind = novoIndicador({ id: "ind-nps-aaaa", nome: "NPS", meta: "70", atual: "40" });
    data.indicadores.push(ind);
    // Leituras (DESC por registradoEm). A função usa `leituras[0]` para
    // "ultimaLeituraEm", então o primeiro deve ser o mais recente.
    data.leiturasPorIndicador.set(ind.id as string, [
      { id: "l1", indicadorId: ind.id, valor: "40", registradoEm: ago(45) },
      { id: "l2", indicadorId: ind.id, valor: "50", registradoEm: ago(120) },
    ]);

    const r = await executarFerramentaReadonly(
      "analisar_gap_meta_vs_realizado",
      { tipo: "kpi", id: ind.id as string },
      { empresaId: EMPRESA },
    );
    const d = unwrap<GapKpiResp>(r);
    expect(d.tipo).toBe("kpi");
    expect(d.valorAtual).toBe(40);
    expect(d.meta).toBe(70);
    expect(d.gapAbsoluto).toBe(-30);
    expect(d.gapPct).toBe(-43);
    expect(d.diasSemLeitura ?? 0).toBeGreaterThanOrEqual(40);
    expect(d.iniciativasVinculadas).toBe(0);
    expect(d.causasProvaveis.join(" | ")).toMatch(/Sem leitura há/);
    expect(d.causasProvaveis.join(" | ")).toMatch(/Nenhuma iniciativa/);
  });

  it("kr: calcula pctAtingido, sinaliza sem check-in e prazo vencido", async () => {
    const obj = novoObjetivo({ id: "obj-1-aaaa" });
    data.objetivos.push(obj);
    const kr = novoKr(obj.id as string, {
      id: "kr-1-aaaaaa",
      valorInicial: "0",
      valorAlvo: "100",
      valorAtual: "10",
      prazo: "2024-01-01",
      prazoData: "2024-01-01",
      ultimoCheckinEm: null,
      createdAt: ago(120),
      atualizadoEm: ago(10),
    });
    data.resultadosChavePorObjetivo.set(obj.id as string, [kr]);

    const r = await executarFerramentaReadonly(
      "analisar_gap_meta_vs_realizado",
      { tipo: "kr", id: kr.id as string },
      { empresaId: EMPRESA },
    );
    const d = unwrap<GapKrResp>(r);
    expect(d.tipo).toBe("kr");
    expect(d.pctAtingido).toBe(10);
    expect(d.diasAtePrazo ?? 0).toBeLessThan(0);
    const causas = d.causasProvaveis.join(" | ");
    expect(causas).toMatch(/Progresso baixo/);
    expect(causas).toMatch(/Nenhum check-in registrado|Sem check-in/);
    expect(causas).toMatch(/Prazo vencido/);
  });

  it("objetivo: agrega KRs e devolve média + KR mais atrasado", async () => {
    const obj = novoObjetivo({ id: "obj-x-aaaa", titulo: "Objetivo Y" });
    data.objetivos.push(obj);
    const kr1 = novoKr(obj.id as string, {
      id: "kr-a-aaaaaa",
      metrica: "A",
      valorInicial: "0",
      valorAlvo: "100",
      valorAtual: "20",
    });
    const kr2 = novoKr(obj.id as string, {
      id: "kr-b-aaaaaa",
      metrica: "B",
      valorInicial: "0",
      valorAlvo: "100",
      valorAtual: "60",
    });
    data.resultadosChavePorObjetivo.set(obj.id as string, [kr1, kr2]);

    const r = await executarFerramentaReadonly(
      "analisar_gap_meta_vs_realizado",
      { tipo: "objetivo", id: obj.id as string },
      { empresaId: EMPRESA },
    );
    const d = unwrap<GapObjResp>(r);
    expect(d.totalKrs).toBe(2);
    expect(d.pctMedio).toBe(40);
    expect(d.gapPct).toBe(-60);
    expect(d.krMaisAtrasado?.id).toBe("kr-a-aaaaaa");
  });
});

// ---------- detectar_lacunas_cascata: KR sem indicador NÃO é defeito ----------
describe("detectar_lacunas_cascata — invariantes do contrato", () => {
  it("KR sem indicadorFonteId NÃO entra em lista de defeito; só em informativo", async () => {
    const obj = novoObjetivo({ id: "obj-a-aaaa" });
    data.objetivos.push(obj);
    const kr = novoKr(obj.id as string, { id: "kr-z-aaaaaa", indicadorFonteId: null });
    data.resultadosChavePorObjetivo.set(obj.id as string, [kr]);

    const r = await executarFerramentaReadonly(
      "detectar_lacunas_cascata",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<LacunasResp>(r);
    // Não pode aparecer como defeito em nenhuma das 5 categorias regulares.
    const idsDefeito: string[] = [
      ...d.iniciativasSemObjetivo,
      ...d.objetivosSemKr,
      ...d.kpisSemKrAtacando,
      ...d.kpisSemIniciativaAtacando,
      ...d.estrategiasSemIniciativa,
    ].map((x) => x.id);
    expect(idsDefeito).not.toContain("kr-z-aaaaaa");
    // Mas DEVE aparecer como informativo.
    expect(d.informativo.krsSemIndicadorFonteTotal).toBe(1);
    expect(d.informativo.krsSemIndicadorFonteAmostra[0].id).toBe("kr-z-aaaaaa");
    expect(d.informativo.observacao).toMatch(/NÃO é defeito/);
  });

  it("indicador 'diagnostico' não conta como KPI a ser atacado", async () => {
    data.indicadores.push(
      novoIndicador({ id: "ind-real", perspectiva: "Financeira" }),
      novoIndicador({ id: "ind-diag", perspectiva: "diagnostico" }),
    );
    const r = await executarFerramentaReadonly(
      "detectar_lacunas_cascata",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<LacunasResp>(r);
    expect(d.totais.kpis).toBe(1);
    expect(d.kpisSemKrAtacando.map((x) => x.id)).toEqual(["ind-real"]);
  });
});

// ---------- detectar_objetivos_descarrilados ----------
describe("detectar_objetivos_descarrilados", () => {
  it("flagga objetivo com pct médio baixo E sem check-in", async () => {
    const obj = novoObjetivo({ id: "obj-d-aaaa", titulo: "Atrasado" });
    data.objetivos.push(obj);
    const kr = novoKr(obj.id as string, {
      id: "kr-d-aaaaaa",
      valorInicial: "0",
      valorAlvo: "100",
      valorAtual: "10",
      ultimoCheckinEm: null,
    });
    data.resultadosChavePorObjetivo.set(obj.id as string, [kr]);

    const r = await executarFerramentaReadonly(
      "detectar_objetivos_descarrilados",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<DescarriladosResp>(r);
    expect(d.descarrilados).toHaveLength(1);
    expect(d.descarrilados[0].id).toBe("obj-d-aaaa");
    expect(d.descarrilados[0].motivos.join(",")).toMatch(/pct_medio_10/);
    expect(d.descarrilados[0].motivos.join(",")).toMatch(/sem_checkin/);
  });

  it("não flagga objetivo encerrado", async () => {
    const obj = novoObjetivo({ id: "obj-fechado-aaaa", encerrado: true });
    data.objetivos.push(obj);
    data.resultadosChavePorObjetivo.set(obj.id as string, [
      novoKr(obj.id as string, { valorAtual: "0" }),
    ]);
    const r = await executarFerramentaReadonly(
      "detectar_objetivos_descarrilados",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<DescarriladosResp>(r);
    expect(d.descarrilados).toEqual([]);
  });

  it("respeita overrides de diasSemCheckin e pctMinimo", async () => {
    const obj = novoObjetivo({ id: "obj-borda-aaaa" });
    data.objetivos.push(obj);
    data.resultadosChavePorObjetivo.set(obj.id as string, [
      novoKr(obj.id as string, {
        valorInicial: "0",
        valorAlvo: "100",
        valorAtual: "50",
        ultimoCheckinEm: ago(10),
      }),
    ]);
    // Limites padrão (30%/21d) — está dentro: pct=50 ≥ 30 e checkin há 10d ≤ 21
    const okR = await executarFerramentaReadonly(
      "detectar_objetivos_descarrilados",
      {},
      { empresaId: EMPRESA },
    );
    expect(unwrap<DescarriladosResp>(okR).descarrilados).toEqual([]);
    // Aperta para 80%/5d — agora deve flaggar.
    const apertadoR = await executarFerramentaReadonly(
      "detectar_objetivos_descarrilados",
      { pctMinimo: 80, diasSemCheckin: 5 },
      { empresaId: EMPRESA },
    );
    expect(unwrap<DescarriladosResp>(apertadoR).descarrilados).toHaveLength(1);
  });
});

// ---------- analisar_consistencia_estrategica ----------
describe("analisar_consistencia_estrategica", () => {
  it("identifica estratégia sem objetivo, sem iniciativa e iniciativas que não tocam KPI", async () => {
    const e = novaEstrategia({ id: "est-1-aaaa", titulo: "Crescer" });
    data.estrategias.push(e);
    data.iniciativas.push(
      novaIniciativa({ id: "ini-1-aaaa", estrategiaId: e.id, indicadorFonteId: null }),
    );
    const r = await executarFerramentaReadonly(
      "analisar_consistencia_estrategica",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<ConsistenciaResp>(r);
    expect(d.porEstrategia).toHaveLength(1);
    const linha = d.porEstrategia[0];
    expect(linha.iniciativasVinculadas).toBe(1);
    expect(linha.iniciativasQueTocamKpi).toBe(0);
    expect(linha.furos).toContain("estrategia_sem_objetivo");
    expect(linha.furos).toContain("iniciativas_nao_tocam_kpi");
    expect(d.estrategiasComFuros).toHaveLength(1);
  });
});

// ---------- sumarizar_ciclo_atual ----------
describe("sumarizar_ciclo_atual", () => {
  it("conta concluídas no ciclo e atrasos com prazo vencido", async () => {
    const ref = new Date();
    const inicioTrim = new Date(ref.getFullYear(), Math.floor(ref.getMonth() / 3) * 3, 5);
    data.iniciativas.push(
      novaIniciativa({
        id: "ini-ok-aaaa",
        status: "concluida",
        encerradaEm: inicioTrim,
        prazoData: null,
      }),
      novaIniciativa({
        id: "ini-atrasada-aaaa",
        status: "em_andamento",
        prazoData: "2020-01-01",
        prazo: "2020-01-01",
      }),
    );
    const r = await executarFerramentaReadonly(
      "sumarizar_ciclo_atual",
      {},
      { empresaId: EMPRESA },
    );
    const d = unwrap<CicloResp>(r);
    expect(d.iniciativasConcluidasNoCiclo).toBe(1);
    expect(d.topAtrasos.map((x) => x.id)).toContain("ini-atrasada-aaaa");
    expect(d.topConquistas.some((c) => c.id === "ini-ok-aaaa")).toBe(true);
  });
});

// ---------- Performance: empresa com 200 entidades ----------
describe("Performance — empresa com 200 entidades", () => {
  it("detectar_lacunas_cascata + descarrilados + consistência rodam em <500ms", async () => {
    // Distribuição: 50 estratégias, 50 objetivos, 50 iniciativas, 50 indicadores,
    // 100 KRs (2 por objetivo). Total > 200 entidades, exercendo todos os
    // helpers (carregarKrsDaEmpresa faz N+1 por objetivo).
    for (let i = 0; i < 50; i++) data.estrategias.push(novaEstrategia({ id: `est-${i}` }));
    for (let i = 0; i < 50; i++) {
      const obj = novoObjetivo({ id: `obj-${i}` });
      data.objetivos.push(obj);
      const krs: Row[] = [
        novoKr(obj.id as string, { id: `kr-${i}-a`, valorAtual: String(i % 100) }),
        novoKr(obj.id as string, {
          id: `kr-${i}-b`,
          valorAtual: String((i * 2) % 100),
          ultimoCheckinEm: ago(5),
        }),
      ];
      data.resultadosChavePorObjetivo.set(obj.id as string, krs);
    }
    for (let i = 0; i < 50; i++) data.indicadores.push(novoIndicador({ id: `ind-${i}` }));
    for (let i = 0; i < 50; i++)
      data.iniciativas.push(novaIniciativa({ id: `ini-${i}`, estrategiaId: `est-${i}` }));

    const t0 = Date.now();
    const [a, b, c] = await Promise.all([
      executarFerramentaReadonly("detectar_lacunas_cascata", {}, { empresaId: EMPRESA }),
      executarFerramentaReadonly("detectar_objetivos_descarrilados", {}, { empresaId: EMPRESA }),
      executarFerramentaReadonly("analisar_consistencia_estrategica", {}, { empresaId: EMPRESA }),
    ]);
    const dt = Date.now() - t0;

    const lacunas = unwrap<LacunasResp>(a);
    unwrap<DescarriladosResp>(b);
    unwrap<ConsistenciaResp>(c);
    expect(dt).toBeLessThan(500);
    expect(lacunas.totais.objetivos).toBe(50);
    expect(lacunas.totais.krs).toBe(100);
  });
});

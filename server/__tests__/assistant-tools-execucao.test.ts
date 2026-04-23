// Task #304 — Cobre as 14 tools HITL de execução tática (Iniciativas, OKRs/KRs
// e Indicadores) que ficaram fora da Task #297. Cada tool é testada em pelo
// menos: validação Zod (params inválidos), preview, enrichPreview quando
// existe (diff antes→depois) e apply respeitando `empresaId`. Os testes não
// dependem de OpenAI nem de banco real — `./storage`, `./ai-helpers` e
// `./bizzy-resumos` são totalmente mockados via `vi.mock`.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type {
  Iniciativa,
  Objetivo,
  ResultadoChave,
  Indicador,
  KrCheckin,
  Empresa,
} from "@shared/schema";

// ── Estado in-memory dos mocks ───────────────────────────────────────────
type Maps = {
  iniciativas: Map<string, Iniciativa>;
  objetivos: Map<string, Objetivo>;
  krs: Map<string, ResultadoChave>;
  checkins: Map<string, KrCheckin>;
  indicadores: Map<string, Indicador>;
  leituras: Array<{ indicadorId: string; valor: string; nota: string | null; registradoPor: string | null }>;
  empresas: Map<string, Empresa>;
};

const fake: Maps = {
  iniciativas: new Map(),
  objetivos: new Map(),
  krs: new Map(),
  checkins: new Map(),
  indicadores: new Map(),
  leituras: [],
  empresas: new Map(),
};

// Mock de openai (usado por revisar_qualidade_kr). Usamos vi.hoisted para que
// a referência exista quando o factory de vi.mock for içado para o topo.
const { openaiCreate } = vi.hoisted(() => ({
  openaiCreate: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            veredito: "ok",
            problemas: [],
            explicacao: "",
            sugestaoMetrica: "",
            sugestaoValorInicial: null,
            sugestaoValorAlvo: null,
            sugestaoPrazo: "",
          }),
        },
      },
    ],
  })),
}));

vi.mock("../ai-helpers", () => ({
  openai: { chat: { completions: { create: openaiCreate } } },
  getModelForPlan: () => "gpt-test",
}));

vi.mock("../bizzy-resumos", () => ({
  gerarResumoCiclo: vi.fn(),
  lerConteudoResumo: vi.fn(),
}));

vi.mock("../storage", () => {
  class PlanoAtivoJaExisteError extends Error {}

  const storage = {
    // Empresas
    getEmpresa: vi.fn(async (id: string) => fake.empresas.get(id)),

    // Iniciativas
    getIniciativa: vi.fn(async (id: string) => fake.iniciativas.get(id)),
    getIniciativas: vi.fn(async (empresaId: string) =>
      Array.from(fake.iniciativas.values()).filter((i) => i.empresaId === empresaId),
    ),
    createIniciativa: vi.fn(async (data: Partial<Iniciativa>) => {
      const row = {
        id: randomUUID(),
        createdAt: new Date(),
        responsavelId: null,
        oportunidadeId: null,
        objetivoOriginadorId: null,
        porque: null,
        onde: null,
        como: null,
        quanto: null,
        notaEncerramento: null,
        encerradaEm: null,
        ordem: null,
        prazoData: null,
        estrategiaId: null,
        indicadorFonteId: null,
        ...data,
      } as Iniciativa;
      fake.iniciativas.set(row.id, row);
      return row;
    }),
    updateIniciativa: vi.fn(
      async (id: string, empresaId: string, patch: Partial<Iniciativa>) => {
        const row = fake.iniciativas.get(id);
        if (!row || row.empresaId !== empresaId) {
          throw new Error("Iniciativa não encontrada nesta empresa.");
        }
        const updated = { ...row, ...patch } as Iniciativa;
        fake.iniciativas.set(id, updated);
        return updated;
      },
    ),
    dividirIniciativa: vi.fn(
      async (
        iniciativaId: string,
        empresaId: string,
        filhas: Array<{ titulo: string; descricao: string; prazo: string; prazoData?: string | null }>,
        notaEncerramento: string,
      ) => {
        const mae = fake.iniciativas.get(iniciativaId);
        if (!mae || mae.empresaId !== empresaId) {
          throw new Error("Iniciativa não encontrada nesta empresa.");
        }
        const updated: Iniciativa = {
          ...mae,
          status: "cancelada",
          notaEncerramento,
          encerradaEm: new Date(),
        } as Iniciativa;
        fake.iniciativas.set(iniciativaId, updated);
        const novas = filhas.map((f) => {
          const novo = {
            id: randomUUID(),
            empresaId,
            titulo: f.titulo,
            descricao: f.descricao,
            prazo: f.prazo,
            prazoData: f.prazoData ?? null,
            status: "planejada",
            prioridade: "média",
            responsavel: "",
            impacto: "",
            createdAt: new Date(),
          } as Iniciativa;
          fake.iniciativas.set(novo.id, novo);
          return novo;
        });
        return { mae: updated, filhas: novas };
      },
    ),

    // Objetivos
    getObjetivos: vi.fn(async (empresaId: string) =>
      Array.from(fake.objetivos.values()).filter((o) => o.empresaId === empresaId),
    ),
    createObjetivo: vi.fn(async (data: Partial<Objetivo>) => {
      const row = {
        id: randomUUID(),
        createdAt: new Date(),
        prazoData: null,
        responsavelId: null,
        estrategiaId: null,
        iniciativaId: null,
        encerrado: false,
        origemModoBSC: false,
        justificativaCausaEfeito: null,
        ...data,
      } as Objetivo;
      fake.objetivos.set(row.id, row);
      return row;
    }),
    updateObjetivo: vi.fn(
      async (id: string, empresaId: string, patch: Partial<Objetivo>) => {
        const row = fake.objetivos.get(id);
        if (!row || row.empresaId !== empresaId) {
          throw new Error("OKR não encontrado nesta empresa.");
        }
        const updated = { ...row, ...patch } as Objetivo;
        fake.objetivos.set(id, updated);
        return updated;
      },
    ),

    // KRs
    getResultadoChaveById: vi.fn(async (id: string, empresaId: string) => {
      const kr = fake.krs.get(id);
      if (!kr) return undefined;
      const objetivo = fake.objetivos.get(kr.objetivoId);
      if (!objetivo || objetivo.empresaId !== empresaId) return undefined;
      return kr;
    }),
    createResultadoChave: vi.fn(
      async (data: Partial<ResultadoChave>, empresaId: string) => {
        const objetivo = fake.objetivos.get(data.objetivoId!);
        if (!objetivo || objetivo.empresaId !== empresaId) {
          throw new Error("OKR não encontrado nesta empresa.");
        }
        const row = {
          id: randomUUID(),
          createdAt: new Date(),
          atualizadoEm: new Date(),
          prazoData: null,
          responsavelId: null,
          indicadorFonteId: null,
          confiancaAtual: null,
          ultimoCheckinEm: null,
          ultimoCheckinComentario: null,
          ...data,
        } as ResultadoChave;
        fake.krs.set(row.id, row);
        return row;
      },
    ),
    updateResultadoChave: vi.fn(
      async (id: string, empresaId: string, patch: Partial<ResultadoChave>) => {
        const row = fake.krs.get(id);
        if (!row) throw new Error("KR não encontrado.");
        const objetivo = fake.objetivos.get(row.objetivoId);
        if (!objetivo || objetivo.empresaId !== empresaId) {
          throw new Error("KR não encontrado nesta empresa.");
        }
        const updated = { ...row, ...patch } as ResultadoChave;
        fake.krs.set(id, updated);
        return updated;
      },
    ),
    createKrCheckin: vi.fn(async (data: Partial<KrCheckin>) => {
      const row = {
        id: randomUUID(),
        createdAt: new Date(),
        autorId: null,
        comentario: null,
        ...data,
      } as KrCheckin;
      fake.checkins.set(row.id, row);
      return row;
    }),

    // Indicadores
    getIndicador: vi.fn(async (id: string) => fake.indicadores.get(id) ?? null),
    createIndicador: vi.fn(async (data: Partial<Indicador>) => {
      const row = {
        id: randomUUID(),
        createdAt: new Date(),
        responsavelId: null,
        benchmarkSetorial: null,
        benchmarkAtualizadoEm: null,
        ...data,
      } as Indicador;
      fake.indicadores.set(row.id, row);
      return row;
    }),
    updateIndicador: vi.fn(
      async (id: string, empresaId: string, patch: Partial<Indicador>) => {
        const row = fake.indicadores.get(id);
        if (!row || row.empresaId !== empresaId) {
          throw new Error("Indicador não encontrado nesta empresa.");
        }
        const updated = { ...row, ...patch } as Indicador;
        fake.indicadores.set(id, updated);
        return updated;
      },
    ),

    // Leituras (KPI)
    createLeitura: vi.fn(async (data: { indicadorId: string; valor: string; nota: string | null; registradoPor: string | null }) => {
      fake.leituras.push(data);
      return { id: randomUUID(), ...data, createdAt: new Date() };
    }),

    // Estratégias (necessário para criar_iniciativa que valida tenant da estratégia)
    getEstrategia: vi.fn(async () => undefined),
  };

  return { storage, PlanoAtivoJaExisteError };
});

// Importes pós-mock
import { getTool } from "../assistant-tools";

const EMPRESA_A = "empresa-a";
const EMPRESA_B = "empresa-b";
const ctxA = { empresaId: EMPRESA_A };
const ctxB = { empresaId: EMPRESA_B };

beforeEach(() => {
  fake.iniciativas.clear();
  fake.objetivos.clear();
  fake.krs.clear();
  fake.checkins.clear();
  fake.indicadores.clear();
  fake.leituras.length = 0;
  fake.empresas.clear();
  openaiCreate.mockClear();
});

function tool(name: string) {
  const t = getTool(name);
  if (!t) throw new Error(`tool ${name} não registrada`);
  return t;
}
function parse(name: string, raw: unknown) {
  return tool(name).paramsSchema.parse(raw);
}

// ── Seeds helpers ────────────────────────────────────────────────────────
function seedIniciativa(empresaId: string, over: Partial<Iniciativa> = {}): Iniciativa {
  const row: Iniciativa = {
    id: randomUUID(),
    empresaId,
    titulo: "Iniciativa base",
    descricao: "Descrição base",
    status: "planejada",
    prioridade: "média",
    prazo: "Q4 2026",
    prazoData: null,
    responsavel: "Ana",
    responsavelId: null,
    impacto: "Reduzir churn",
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
    createdAt: new Date(),
  } as Iniciativa;
  const merged = { ...row, ...over } as Iniciativa;
  fake.iniciativas.set(merged.id, merged);
  return merged;
}
function seedObjetivo(empresaId: string, over: Partial<Objetivo> = {}): Objetivo {
  const row = {
    id: randomUUID(),
    empresaId,
    titulo: "Objetivo base",
    descricao: "Descrição base",
    prazo: "Q4 2026",
    prazoData: null,
    perspectiva: "Financeira",
    responsavelId: null,
    estrategiaId: null,
    iniciativaId: null,
    encerrado: false,
    origemModoBSC: false,
    justificativaCausaEfeito: null,
    createdAt: new Date(),
  } as Objetivo;
  const merged = { ...row, ...over } as Objetivo;
  fake.objetivos.set(merged.id, merged);
  return merged;
}
function seedKr(objetivoId: string, over: Partial<ResultadoChave> = {}): ResultadoChave {
  const row = {
    id: randomUUID(),
    objetivoId,
    metrica: "Reduzir churn",
    valorInicial: "10.00",
    valorAlvo: "5.00",
    valorAtual: "8.00",
    owner: "Bruno",
    prazo: "Q4 2026",
    prazoData: null,
    responsavelId: null,
    indicadorFonteId: null,
    confiancaAtual: null,
    ultimoCheckinEm: null,
    ultimoCheckinComentario: null,
    createdAt: new Date(),
    atualizadoEm: new Date(),
  } as ResultadoChave;
  const merged = { ...row, ...over } as ResultadoChave;
  fake.krs.set(merged.id, merged);
  return merged;
}
function seedIndicador(empresaId: string, over: Partial<Indicador> = {}): Indicador {
  const row = {
    id: randomUUID(),
    empresaId,
    perspectiva: "Finanças",
    nome: "MRR",
    meta: "100000",
    atual: "80000",
    status: "amarelo",
    owner: "Carla",
    responsavelId: null,
    benchmarkSetorial: null,
    benchmarkAtualizadoEm: null,
    createdAt: new Date(),
  } as Indicador;
  const merged = { ...row, ...over } as Indicador;
  fake.indicadores.set(merged.id, merged);
  return merged;
}

// ─── 1. criar_iniciativa ────────────────────────────────────────────────
describe("criar_iniciativa", () => {
  it("rejeita params inválidos (sem prazo, prazoData errado)", () => {
    expect(() =>
      parse("criar_iniciativa", { titulo: "Lançar", descricao: "ok" }),
    ).toThrow();
    expect(() =>
      parse("criar_iniciativa", {
        titulo: "Lançar",
        descricao: "Descrição ok",
        prazo: "Q4 2026",
        prazoData: "31/12/2026",
      }),
    ).toThrow();
    expect(() =>
      parse("criar_iniciativa", {
        titulo: "Lançar",
        descricao: "Descrição ok",
        prazo: "Q4 2026",
        prioridade: "urgente",
      }),
    ).toThrow();
  });

  it("preview lista prioridade, prazo e impacto", () => {
    const p = parse("criar_iniciativa", {
      titulo: "Reduzir churn",
      descricao: "Plano para reduzir churn",
      prazo: "Q4 2026",
      prazoData: "2026-12-31",
      impacto: "Salvar 10% do MRR",
    });
    const preview = tool("criar_iniciativa").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(
      expect.arrayContaining(["Prioridade", "Prazo", "Impacto esperado"]),
    );
    const prazoField = preview.campos!.find((c) => c.label === "Prazo");
    expect(prazoField?.valor).toContain("2026-12-31");
  });

  it("apply persiste com empresaId e ignora estrategiaId de outra empresa", async () => {
    const p = parse("criar_iniciativa", {
      titulo: "Crescer",
      descricao: "Expandir a base",
      prazo: "Q4 2026",
      prazoData: "2026-12-31",
      estrategiaId: "estr-fake",
      indicadorFonteId: "ind-fake",
    });
    const res = await tool("criar_iniciativa").apply(p, ctxA);
    const created = fake.iniciativas.get(res.entidadeId!);
    expect(created?.empresaId).toBe(EMPRESA_A);
    // FK de outra empresa foi descartada (storage.getEstrategia retornou undefined)
    expect(created?.estrategiaId).toBeFalsy();
    expect(created?.prazoData).toBe("2026-12-31");
  });

  // Task #333 — Defesa em profundidade contra duplicatas no apply.
  it("apply bloqueia título duplicado (similaridade ≥ 0.6) listando candidatos", async () => {
    seedIniciativa(EMPRESA_A, {
      titulo: "Promover reuniões periódicas de alinhamento e revisão dos OKRs",
      status: "em_andamento",
    });
    const p = parse("criar_iniciativa", {
      titulo:
        "Criar iniciativa para definir responsáveis e metas nas reuniões periódicas de alinhamento dos OKRs",
      descricao: "Estruturar cadência das reuniões de OKRs",
      prazo: "Q4 2026",
      prazoData: "2026-12-31",
    });
    await expect(tool("criar_iniciativa").apply(p, ctxA)).rejects.toThrow(
      /iniciativa parecida/i,
    );
  });
});

// ─── 2. atualizar_iniciativa ────────────────────────────────────────────
describe("atualizar_iniciativa", () => {
  it("rejeita id curto e prazoData inválida", () => {
    expect(() => parse("atualizar_iniciativa", { id: "x" })).toThrow();
    expect(() =>
      parse("atualizar_iniciativa", {
        id: "12345678-aaaa",
        prazoData: "amanhã",
      }),
    ).toThrow();
  });

  it("preview lista campos enviados (incluindo prazoData=null como '(limpar)')", () => {
    const p = parse("atualizar_iniciativa", {
      id: "12345678-aaaa",
      status: "em_andamento",
      prazoData: null,
    });
    const preview = tool("atualizar_iniciativa").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["ID", "Status", "Prazo (data)"]));
    const prazo = preview.campos!.find((c) => c.label === "Prazo (data)");
    expect(prazo?.valor).toMatch(/limpar/i);
  });

  it("apply rejeita iniciativa de outra empresa", async () => {
    const i = seedIniciativa(EMPRESA_B);
    const p = parse("atualizar_iniciativa", { id: i.id, status: "concluida" });
    await expect(tool("atualizar_iniciativa").apply(p, ctxA)).rejects.toThrow(
      /não encontrada/i,
    );
    expect(fake.iniciativas.get(i.id)?.status).toBe("planejada");
  });

  it("apply atualiza apenas os campos enviados (incluindo prazoData=null para limpar)", async () => {
    const i = seedIniciativa(EMPRESA_A, { prazoData: "2026-01-01", status: "planejada" });
    const p = parse("atualizar_iniciativa", {
      id: i.id,
      status: "em_andamento",
      prazoData: null,
    });
    await tool("atualizar_iniciativa").apply(p, ctxA);
    const updated = fake.iniciativas.get(i.id)!;
    expect(updated.status).toBe("em_andamento");
    expect(updated.prazoData).toBeNull();
    expect(updated.titulo).toBe("Iniciativa base");
  });

  // Task #333 — schema rejeita atualizar_iniciativa só com {id} (sem campos a alterar).
  it("schema rejeita params sem nenhum campo de mudança além do id", () => {
    expect(() =>
      parse("atualizar_iniciativa", { id: "12345678-aaaa" }),
    ).toThrow(/ao menos um campo/i);
  });

  // Task #333 — apply detecta no-op (todos os campos enviados batem com o estado atual).
  it("apply rejeita no-op quando todos os campos enviados batem com o estado atual", async () => {
    const i = seedIniciativa(EMPRESA_A, {
      titulo: "Iniciativa estável",
      status: "em_andamento",
      prioridade: "média",
      responsavel: "Ana",
    });
    const p = parse("atualizar_iniciativa", {
      id: i.id,
      status: "em_andamento", // mesmo valor
      prioridade: "média",     // mesmo valor
      responsavel: "Ana",       // mesmo valor
    });
    await expect(tool("atualizar_iniciativa").apply(p, ctxA)).rejects.toThrow(
      /nada a alterar/i,
    );
  });

  it("enrichPreview anexa valorAnterior somente em campos alterados", async () => {
    const i = seedIniciativa(EMPRESA_A, {
      titulo: "Antigo",
      prioridade: "baixa",
      status: "planejada",
    });
    const p = parse("atualizar_iniciativa", {
      id: i.id,
      titulo: "Novo",
      prioridade: "baixa", // não mudou
    });
    const t = tool("atualizar_iniciativa");
    const enriched = await t.enrichPreview!(t.preview(p), p, ctxA);
    const tit = enriched.campos!.find((c) => c.label === "Novo título");
    expect((tit as { valorAnterior?: string }).valorAnterior).toBe("Antigo");
    const prio = enriched.campos!.find((c) => c.label === "Prioridade");
    expect(prio).toBeUndefined();
  });
});

// ─── 3. encerrar_iniciativa ─────────────────────────────────────────────
describe("encerrar_iniciativa", () => {
  it("rejeita params sem nota ou status fora do enum", () => {
    expect(() => parse("encerrar_iniciativa", { id: "12345678-aaaa" })).toThrow();
    expect(() =>
      parse("encerrar_iniciativa", { id: "12345678-aaaa", nota: "" }),
    ).toThrow();
    expect(() =>
      parse("encerrar_iniciativa", {
        id: "12345678-aaaa",
        nota: "ok",
        status: "abandonada",
      }),
    ).toThrow();
  });

  it("preview lista status final legível e nota", () => {
    const p = parse("encerrar_iniciativa", {
      id: "12345678-aaaa",
      status: "pausada",
      nota: "vou retomar em Q2",
    });
    const preview = tool("encerrar_iniciativa").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(
      expect.arrayContaining(["ID", "Status final", "Nota de fechamento"]),
    );
    expect(preview.campos!.find((c) => c.label === "Status final")?.valor).toBe("Pausada");
  });

  it("apply marca status final, nota e encerradaEm respeitando empresaId", async () => {
    const i = seedIniciativa(EMPRESA_A, { status: "em_andamento" });
    const p = parse("encerrar_iniciativa", {
      id: i.id,
      status: "concluida",
      nota: "deu certo",
    });
    await tool("encerrar_iniciativa").apply(p, ctxA);
    const updated = fake.iniciativas.get(i.id)!;
    expect(updated.status).toBe("concluida");
    expect(updated.notaEncerramento).toBe("deu certo");
    expect(updated.encerradaEm).toBeInstanceOf(Date);
  });

  it("apply rejeita iniciativa de outra empresa", async () => {
    const i = seedIniciativa(EMPRESA_B);
    const p = parse("encerrar_iniciativa", {
      id: i.id,
      nota: "fechei",
    });
    await expect(tool("encerrar_iniciativa").apply(p, ctxA)).rejects.toThrow(
      /não encontrada/i,
    );
  });
});

// ─── 4. dividir_iniciativa ──────────────────────────────────────────────
describe("dividir_iniciativa", () => {
  it("rejeita menos de 2 ou mais de 5 sub-iniciativas", () => {
    const make = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        titulo: `Filha ${i}`,
        descricao: "Descrição",
        prazo: "Q4 2026",
      }));
    expect(() =>
      parse("dividir_iniciativa", { iniciativaId: "12345678-aaaa", subitens: make(1) }),
    ).toThrow();
    expect(() =>
      parse("dividir_iniciativa", { iniciativaId: "12345678-aaaa", subitens: make(6) }),
    ).toThrow();
  });

  it("preview lista uma linha por filha com prazo formatado", () => {
    const p = parse("dividir_iniciativa", {
      iniciativaId: "12345678-aaaa",
      subitens: [
        { titulo: "Filha 1", descricao: "Sub 1", prazo: "Q1 2027" },
        { titulo: "Filha 2", descricao: "Sub 2", prazo: "Q2 2027", prazoData: "2027-06-30", responsavel: "Ana" },
      ],
    });
    const preview = tool("dividir_iniciativa").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Iniciativa-mãe", "Filha 1", "Filha 2"]));
    expect(preview.campos!.find((c) => c.label === "Filha 2")?.valor).toMatch(/2027-06-30.*Ana/);
  });

  it("apply cancela mãe e cria filhas na mesma empresa", async () => {
    const mae = seedIniciativa(EMPRESA_A);
    const p = parse("dividir_iniciativa", {
      iniciativaId: mae.id,
      subitens: [
        { titulo: "Filha 1", descricao: "Sub 1", prazo: "Q1 2027" },
        { titulo: "Filha 2", descricao: "Sub 2", prazo: "Q2 2027", prazoData: "2027-06-30" },
      ],
    });
    const res = await tool("dividir_iniciativa").apply(p, ctxA);
    expect(res.entidadeId).toBe(mae.id);
    expect(fake.iniciativas.get(mae.id)?.status).toBe("cancelada");
    const filhas = Array.from(fake.iniciativas.values()).filter(
      (i) => i.id !== mae.id && i.empresaId === EMPRESA_A,
    );
    expect(filhas).toHaveLength(2);
    expect(filhas.find((f) => f.titulo === "Filha 2")?.prazoData).toBe("2027-06-30");
  });

  it("apply rejeita iniciativa-mãe de outra empresa", async () => {
    const mae = seedIniciativa(EMPRESA_B);
    const p = parse("dividir_iniciativa", {
      iniciativaId: mae.id,
      subitens: [
        { titulo: "Filha 1", descricao: "Sub 1", prazo: "Q1 2027" },
        { titulo: "Filha 2", descricao: "Sub 2", prazo: "Q2 2027" },
      ],
    });
    await expect(tool("dividir_iniciativa").apply(p, ctxA)).rejects.toThrow(
      /não encontrada/i,
    );
  });
});

// ─── 5. criar_okr ───────────────────────────────────────────────────────
describe("criar_okr", () => {
  it("rejeita perspectiva fora do enum OKR (Indicador é vocab diferente)", () => {
    expect(() =>
      parse("criar_okr", {
        objetivoTitulo: "Crescer",
        prazo: "Q4 2026",
        perspectiva: "Finanças", // perspectiva de Indicador, não de OKR
        resultadosChave: [
          { metrica: "MRR", valorInicial: 10, valorAlvo: 20, owner: "Ana", prazo: "Q4 2026" },
        ],
      }),
    ).toThrow();
  });

  it("rejeita lista de KRs vazia ou >5", () => {
    expect(() =>
      parse("criar_okr", {
        objetivoTitulo: "Crescer",
        prazo: "Q4 2026",
        resultadosChave: [],
      }),
    ).toThrow();
  });

  it("preview lista perspectiva, prazo e cada KR", () => {
    const p = parse("criar_okr", {
      objetivoTitulo: "Crescer no Sul",
      perspectiva: "Clientes",
      prazo: "Q4 2026",
      prazoData: "2026-12-31",
      resultadosChave: [
        { metrica: "NPS", valorInicial: 40, valorAlvo: 60, owner: "Bruno", prazo: "Q4 2026" },
      ],
    });
    const preview = tool("criar_okr").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Perspectiva", "Prazo", "KR 1"]));
    expect(preview.campos!.find((c) => c.label === "KR 1")?.valor).toContain("NPS");
  });

  it("apply cria objetivo + KRs vinculados na empresa", async () => {
    const p = parse("criar_okr", {
      objetivoTitulo: "Crescer no Sul",
      objetivoDescricao: "Plano de crescimento",
      perspectiva: "Financeira",
      prazo: "Q4 2026",
      prazoData: "2026-12-31",
      resultadosChave: [
        { metrica: "MRR", valorInicial: 10, valorAlvo: 20, owner: "Ana", prazo: "Q4 2026", prazoData: "2026-12-31" },
        { metrica: "NPS", valorInicial: 40, valorAlvo: 60, owner: "Bruno", prazo: "Q4 2026" },
      ],
    });
    const res = await tool("criar_okr").apply(p, ctxA);
    const obj = fake.objetivos.get(res.entidadeId!);
    expect(obj?.empresaId).toBe(EMPRESA_A);
    expect(obj?.prazoData).toBe("2026-12-31");
    const krs = Array.from(fake.krs.values()).filter((k) => k.objetivoId === obj!.id);
    expect(krs).toHaveLength(2);
    expect(krs[0].valorAtual).toBe(String(krs[0].valorInicial));
  });
});

// ─── 6. atualizar_okr ───────────────────────────────────────────────────
describe("atualizar_okr", () => {
  it("rejeita id curto e perspectiva inválida", () => {
    expect(() => parse("atualizar_okr", { objetivoId: "x" })).toThrow();
    expect(() =>
      parse("atualizar_okr", { objetivoId: "12345678-aaaa", perspectiva: "Finanças" }),
    ).toThrow();
  });

  it("apply rejeita OKR de outra empresa", async () => {
    const o = seedObjetivo(EMPRESA_B);
    const p = parse("atualizar_okr", { objetivoId: o.id, titulo: "hack" });
    await expect(tool("atualizar_okr").apply(p, ctxA)).rejects.toThrow();
  });

  it("apply atualiza somente campos enviados (prazoData=null limpa)", async () => {
    const o = seedObjetivo(EMPRESA_A, { prazoData: "2026-01-01", titulo: "Antigo" });
    const p = parse("atualizar_okr", {
      objetivoId: o.id,
      titulo: "Novo",
      prazoData: null,
    });
    await tool("atualizar_okr").apply(p, ctxA);
    const updated = fake.objetivos.get(o.id)!;
    expect(updated.titulo).toBe("Novo");
    expect(updated.prazoData).toBeNull();
  });

  it("enrichPreview mostra antes→depois", async () => {
    const o = seedObjetivo(EMPRESA_A, { titulo: "Antigo", perspectiva: "Financeira" });
    const p = parse("atualizar_okr", {
      objetivoId: o.id,
      titulo: "Novo",
      perspectiva: "Financeira", // não mudou
    });
    const t = tool("atualizar_okr");
    const enriched = await t.enrichPreview!(t.preview(p), p, ctxA);
    const tit = enriched.campos!.find((c) => c.label === "Novo título");
    expect((tit as { valorAnterior?: string }).valorAnterior).toBe("Antigo");
    expect(enriched.campos!.find((c) => c.label === "Perspectiva")).toBeUndefined();
  });
});

// ─── 7. adicionar_kr_a_okr ──────────────────────────────────────────────
describe("adicionar_kr_a_okr", () => {
  it("rejeita params inválidos", () => {
    expect(() =>
      parse("adicionar_kr_a_okr", { objetivoId: "x", metrica: "ok" }),
    ).toThrow();
  });

  it("preview lista métrica, faixa de valores e prazo", () => {
    const p = parse("adicionar_kr_a_okr", {
      objetivoId: "12345678-aaaa",
      metrica: "Receita",
      valorInicial: 100,
      valorAlvo: 200,
      owner: "Ana",
      prazo: "Q4 2026",
      prazoData: "2026-12-31",
    });
    const preview = tool("adicionar_kr_a_okr").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(
      expect.arrayContaining(["Objetivo", "Métrica", "Valor inicial → alvo", "Dono", "Prazo"]),
    );
    expect(preview.campos!.find((c) => c.label === "Valor inicial → alvo")?.valor).toBe("100 → 200");
  });

  it("apply cria KR vinculado ao objetivo", async () => {
    const o = seedObjetivo(EMPRESA_A);
    const p = parse("adicionar_kr_a_okr", {
      objetivoId: o.id,
      metrica: "Receita",
      valorInicial: 100,
      valorAlvo: 200,
      owner: "Ana",
      prazo: "Q4 2026",
      prazoData: "2026-12-31",
    });
    const res = await tool("adicionar_kr_a_okr").apply(p, ctxA);
    const kr = fake.krs.get(res.entidadeId!);
    expect(kr?.objetivoId).toBe(o.id);
    expect(kr?.valorInicial).toBe("100");
    expect(kr?.valorAtual).toBe("100");
    expect(kr?.prazoData).toBe("2026-12-31");
  });

  it("apply rejeita objetivo de outra empresa", async () => {
    const o = seedObjetivo(EMPRESA_B);
    const p = parse("adicionar_kr_a_okr", {
      objetivoId: o.id,
      metrica: "Receita",
      valorInicial: 1,
      valorAlvo: 2,
      owner: "Ana",
      prazo: "Q4 2026",
    });
    await expect(tool("adicionar_kr_a_okr").apply(p, ctxA)).rejects.toThrow();
  });
});

// ─── 8. atualizar_kr ────────────────────────────────────────────────────
describe("atualizar_kr", () => {
  it("rejeita id curto", () => {
    expect(() => parse("atualizar_kr", { resultadoChaveId: "x" })).toThrow();
  });

  it("apply atualiza valor-alvo respeitando empresaId", async () => {
    const o = seedObjetivo(EMPRESA_A);
    const kr = seedKr(o.id, { valorAlvo: "5.00" });
    const p = parse("atualizar_kr", {
      resultadoChaveId: kr.id,
      valorAlvo: 7,
    });
    await tool("atualizar_kr").apply(p, ctxA);
    expect(fake.krs.get(kr.id)?.valorAlvo).toBe("7");
  });

  it("apply rejeita KR cujo objetivo é de outra empresa", async () => {
    const o = seedObjetivo(EMPRESA_B);
    const kr = seedKr(o.id);
    const p = parse("atualizar_kr", { resultadoChaveId: kr.id, owner: "Hack" });
    await expect(tool("atualizar_kr").apply(p, ctxA)).rejects.toThrow();
  });

  it("enrichPreview filtra valor-alvo numericamente igual", async () => {
    const o = seedObjetivo(EMPRESA_A);
    const kr = seedKr(o.id, { valorAlvo: "5.00", owner: "Bruno" });
    const p = parse("atualizar_kr", {
      resultadoChaveId: kr.id,
      valorAlvo: 5, // 5 == 5.00 → não deve aparecer no diff
      owner: "Carla",
    });
    const t = tool("atualizar_kr");
    const enriched = await t.enrichPreview!(t.preview(p), p, ctxA);
    expect(enriched.campos!.find((c) => c.label === "Valor-alvo")).toBeUndefined();
    const owner = enriched.campos!.find((c) => c.label === "Dono");
    expect((owner as { valorAnterior?: string }).valorAnterior).toBe("Bruno");
  });
});

// ─── 9. atualizar_progresso_kr ──────────────────────────────────────────
describe("atualizar_progresso_kr", () => {
  it("rejeita params inválidos", () => {
    expect(() => parse("atualizar_progresso_kr", { resultadoChaveId: "x" })).toThrow();
  });

  it("preview lista KR e novo valor", () => {
    const p = parse("atualizar_progresso_kr", { resultadoChaveId: "12345678-aaaa", valorAtual: 75 });
    const preview = tool("atualizar_progresso_kr").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Resultado-chave", "Novo valor atual"]));
    expect(preview.campos!.find((c) => c.label === "Novo valor atual")?.valor).toBe("75");
  });

  it("apply atualiza valorAtual do KR na empresa correta", async () => {
    const o = seedObjetivo(EMPRESA_A);
    const kr = seedKr(o.id, { valorAtual: "8.00" });
    const p = parse("atualizar_progresso_kr", {
      resultadoChaveId: kr.id,
      valorAtual: 9,
    });
    await tool("atualizar_progresso_kr").apply(p, ctxA);
    expect(fake.krs.get(kr.id)?.valorAtual).toBe("9");
  });

  it("apply rejeita KR de outra empresa", async () => {
    const o = seedObjetivo(EMPRESA_B);
    const kr = seedKr(o.id);
    const p = parse("atualizar_progresso_kr", {
      resultadoChaveId: kr.id,
      valorAtual: 9,
    });
    await expect(tool("atualizar_progresso_kr").apply(p, ctxA)).rejects.toThrow();
  });
});

// ─── 10. registrar_checkin_kr ───────────────────────────────────────────
describe("registrar_checkin_kr", () => {
  it("rejeita confiança fora do enum", () => {
    expect(() =>
      parse("registrar_checkin_kr", {
        resultadoChaveId: "12345678-aaaa",
        valor: 5,
        confianca: "azul",
      }),
    ).toThrow();
  });

  it("preview lista KR, valor e confiança", () => {
    const p = parse("registrar_checkin_kr", {
      resultadoChaveId: "12345678-aaaa",
      valor: 7,
      confianca: "amarelo",
      comentario: "atenção",
    });
    const preview = tool("registrar_checkin_kr").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["KR", "Valor atual", "Confiança"]));
    expect(preview.campos!.find((c) => c.label === "Confiança")?.valor).toBe("amarelo");
    expect(preview.descricao).toBe("atenção");
  });

  it("apply cria check-in e atualiza cache do KR", async () => {
    const o = seedObjetivo(EMPRESA_A);
    const kr = seedKr(o.id);
    const p = parse("registrar_checkin_kr", {
      resultadoChaveId: kr.id,
      valor: 7,
      confianca: "amarelo",
      comentario: "atenção",
    });
    await tool("registrar_checkin_kr").apply(p, ctxA);
    expect(fake.checkins.size).toBe(1);
    const updated = fake.krs.get(kr.id)!;
    expect(updated.valorAtual).toBe("7");
    expect(updated.confiancaAtual).toBe("amarelo");
    expect(updated.ultimoCheckinComentario).toBe("atenção");
    expect(updated.ultimoCheckinEm).toBeInstanceOf(Date);
  });

  it("apply rejeita KR de outra empresa", async () => {
    const o = seedObjetivo(EMPRESA_B);
    const kr = seedKr(o.id);
    const p = parse("registrar_checkin_kr", {
      resultadoChaveId: kr.id,
      valor: 7,
      confianca: "verde",
    });
    await expect(tool("registrar_checkin_kr").apply(p, ctxA)).rejects.toThrow(
      /não encontrad/i,
    );
    expect(fake.checkins.size).toBe(0);
  });
});

// ─── 11. revisar_qualidade_kr ───────────────────────────────────────────
describe("revisar_qualidade_kr", () => {
  it("rejeita quando nem KR nem métrica são informados", async () => {
    const p = parse("revisar_qualidade_kr", {});
    await expect(tool("revisar_qualidade_kr").apply(p, ctxA)).rejects.toThrow(
      /resultadoChaveId|métrica/i,
    );
  });

  it("apply usa métrica do KR quando só id é fornecido", async () => {
    const o = seedObjetivo(EMPRESA_A);
    const kr = seedKr(o.id, { metrica: "Receita" });
    const p = parse("revisar_qualidade_kr", { resultadoChaveId: kr.id });
    const res = await tool("revisar_qualidade_kr").apply(p, ctxA);
    expect(openaiCreate).toHaveBeenCalledTimes(1);
    expect(res.dados).toMatchObject({ veredito: "ok" });
    expect(res.entidadeId).toBe(kr.id);
  });

  it("apply rejeita KR de outra empresa", async () => {
    const o = seedObjetivo(EMPRESA_B);
    const kr = seedKr(o.id);
    const p = parse("revisar_qualidade_kr", { resultadoChaveId: kr.id });
    await expect(tool("revisar_qualidade_kr").apply(p, ctxA)).rejects.toThrow();
  });
});

// ─── 12. vincular_kr_a_indicador ────────────────────────────────────────
describe("vincular_kr_a_indicador", () => {
  it("rejeita params inválidos", () => {
    expect(() =>
      parse("vincular_kr_a_indicador", { krId: "x", indicadorId: "12345678-aaaa" }),
    ).toThrow();
  });

  it("preview lista KR e indicador-fonte", () => {
    const p = parse("vincular_kr_a_indicador", {
      krId: "12345678-aaaa",
      indicadorId: "87654321-bbbb",
    });
    const preview = tool("vincular_kr_a_indicador").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["KR", "Indicador-fonte"]));
  });

  it("apply preenche indicadorFonteId no KR", async () => {
    const o = seedObjetivo(EMPRESA_A);
    const kr = seedKr(o.id);
    const ind = seedIndicador(EMPRESA_A);
    const p = parse("vincular_kr_a_indicador", { krId: kr.id, indicadorId: ind.id });
    await tool("vincular_kr_a_indicador").apply(p, ctxA);
    expect(fake.krs.get(kr.id)?.indicadorFonteId).toBe(ind.id);
  });

  it("apply rejeita indicador de outra empresa", async () => {
    const o = seedObjetivo(EMPRESA_A);
    const kr = seedKr(o.id);
    const ind = seedIndicador(EMPRESA_B);
    const p = parse("vincular_kr_a_indicador", { krId: kr.id, indicadorId: ind.id });
    await expect(tool("vincular_kr_a_indicador").apply(p, ctxA)).rejects.toThrow(
      /Indicador não encontrado/i,
    );
  });
});

// ─── 13. criar_indicador ────────────────────────────────────────────────
describe("criar_indicador", () => {
  it("rejeita perspectiva fora do enum de Indicador (OKR é vocab diferente)", () => {
    expect(() =>
      parse("criar_indicador", {
        nome: "MRR",
        meta: "100",
        owner: "Ana",
        perspectiva: "Financeira", // vocab de OKR
      }),
    ).toThrow();
  });

  it("rejeita params sem owner ou meta", () => {
    expect(() =>
      parse("criar_indicador", { nome: "MRR", meta: "100" }),
    ).toThrow();
    expect(() =>
      parse("criar_indicador", { nome: "MRR", owner: "Ana" }),
    ).toThrow();
  });

  it("preview lista perspectiva, meta e owner", () => {
    const p = parse("criar_indicador", {
      perspectiva: "Finanças",
      nome: "MRR",
      meta: "100k",
      atual: "80k",
      owner: "Ana",
    });
    const preview = tool("criar_indicador").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Perspectiva", "Meta", "Owner"]));
    expect(preview.titulo).toContain("MRR");
  });

  it("apply persiste com empresaId e default status='sem_dados'", async () => {
    const p = parse("criar_indicador", {
      perspectiva: "Finanças",
      nome: "MRR",
      meta: "100k",
      owner: "Ana",
    });
    const res = await tool("criar_indicador").apply(p, ctxA);
    const created = fake.indicadores.get(res.entidadeId!);
    expect(created?.empresaId).toBe(EMPRESA_A);
    expect(created?.status).toBe("sem_dados");
    expect(created?.perspectiva).toBe("Finanças");
  });
});

// ─── 14. atualizar_valor_indicador ──────────────────────────────────────
describe("atualizar_valor_indicador", () => {
  it("rejeita params inválidos", () => {
    expect(() =>
      parse("atualizar_valor_indicador", { indicadorId: "x" }),
    ).toThrow();
    expect(() =>
      parse("atualizar_valor_indicador", { indicadorId: "12345678-aaaa", valor: "" }),
    ).toThrow();
  });

  it("preview lista indicador e novo valor", () => {
    const p = parse("atualizar_valor_indicador", {
      indicadorId: "12345678-aaaa",
      valor: "95000",
      nota: "fechamento de mês",
    });
    const preview = tool("atualizar_valor_indicador").preview(p);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Indicador", "Valor"]));
    expect(preview.descricao).toBe("fechamento de mês");
  });

  it("apply cria leitura e atualiza valor atual do indicador", async () => {
    const ind = seedIndicador(EMPRESA_A, { atual: "80000" });
    const p = parse("atualizar_valor_indicador", {
      indicadorId: ind.id,
      valor: "95000",
      nota: "fechamento de mês",
    });
    await tool("atualizar_valor_indicador").apply(p, ctxA);
    expect(fake.leituras).toHaveLength(1);
    expect(fake.leituras[0].valor).toBe("95000");
    expect(fake.leituras[0].nota).toBe("fechamento de mês");
    expect(fake.indicadores.get(ind.id)?.atual).toBe("95000");
  });

  it("apply rejeita indicador de outra empresa", async () => {
    const ind = seedIndicador(EMPRESA_B);
    const p = parse("atualizar_valor_indicador", {
      indicadorId: ind.id,
      valor: "1",
    });
    await expect(tool("atualizar_valor_indicador").apply(p, ctxA)).rejects.toThrow(
      /não encontrado/i,
    );
    expect(fake.leituras).toHaveLength(0);
  });

  it("enrichPreview anexa valorAnterior quando o valor muda", async () => {
    const ind = seedIndicador(EMPRESA_A, { atual: "80000" });
    const p = parse("atualizar_valor_indicador", {
      indicadorId: ind.id,
      valor: "95000",
    });
    const t = tool("atualizar_valor_indicador");
    const enriched = await t.enrichPreview!(t.preview(p), p, ctxA);
    const valor = enriched.campos!.find((c) => c.label === "Valor");
    expect((valor as { valorAnterior?: string }).valorAnterior).toBe("80000");
  });
});

// Task #297 — Cobre as 11 tools HITL de Modelo & Estratégia (Task #287):
// criar/atualizar/arquivar Estratégia, criar/atualizar/arquivar Bloco BMC,
// criar/remover Relação BSC, criar/atualizar/arquivar Cenário.
//
// Os testes cobrem: validação Zod, preview, enrichPreview (diff antes→depois)
// e apply respeitando `empresaId`. Não dependem de OpenAI nem de banco real:
// `./storage`, `./ai-helpers` e `./bizzy-resumos` são mockados via `vi.mock`.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type {
  Estrategia,
  ModeloNegocio,
  BscRelacao,
  Cenario,
  Objetivo,
} from "@shared/schema";

// ── Mocks (devem vir antes de importar `./assistant-tools`) ─────────────

type Maps = {
  estrategias: Map<string, Estrategia>;
  blocosBmc: Map<string, ModeloNegocio>;
  bscRelacoes: Map<string, BscRelacao>;
  cenarios: Map<string, Cenario>;
  objetivos: Map<string, Objetivo>;
};

const fake: Maps = {
  estrategias: new Map(),
  blocosBmc: new Map(),
  bscRelacoes: new Map(),
  cenarios: new Map(),
  objetivos: new Map(),
};

vi.mock("../ai-helpers", () => ({
  openai: {},
  getModelForPlan: () => "gpt-test",
}));

vi.mock("../bizzy-resumos", () => ({
  gerarResumoCiclo: vi.fn(),
  lerConteudoResumo: vi.fn(),
}));

vi.mock("../storage", () => {
  class PlanoAtivoJaExisteError extends Error {}

  const storage = {
    // Estratégias
    createEstrategia: vi.fn(async (data: Omit<Estrategia, "id" | "createdAt">) => {
      const row: Estrategia = {
        id: randomUUID(),
        createdAt: new Date(),
        ordem: null,
        swotOrigemIds: null,
        ...data,
      } as Estrategia;
      fake.estrategias.set(row.id, row);
      return row;
    }),
    getEstrategia: vi.fn(async (id: string) => fake.estrategias.get(id)),
    updateEstrategia: vi.fn(
      async (id: string, empresaId: string, patch: Partial<Estrategia>) => {
        const row = fake.estrategias.get(id);
        if (!row || row.empresaId !== empresaId) {
          throw new Error("not found");
        }
        const updated = { ...row, ...patch } as Estrategia;
        fake.estrategias.set(id, updated);
        return updated;
      },
    ),

    // BMC
    getModeloNegocio: vi.fn(async (empresaId: string) =>
      Array.from(fake.blocosBmc.values()).filter((b) => b.empresaId === empresaId),
    ),
    createModeloNegocio: vi.fn(async (data: Omit<ModeloNegocio, "id" | "createdAt">) => {
      const row: ModeloNegocio = {
        id: randomUUID(),
        createdAt: new Date(),
        ...data,
      } as ModeloNegocio;
      fake.blocosBmc.set(row.id, row);
      return row;
    }),
    updateModeloNegocio: vi.fn(
      async (id: string, empresaId: string, patch: Partial<ModeloNegocio>) => {
        const row = fake.blocosBmc.get(id);
        if (!row || row.empresaId !== empresaId) throw new Error("not found");
        const updated = { ...row, ...patch } as ModeloNegocio;
        fake.blocosBmc.set(id, updated);
        return updated;
      },
    ),
    deleteModeloNegocio: vi.fn(async (id: string, empresaId: string) => {
      const row = fake.blocosBmc.get(id);
      if (row && row.empresaId === empresaId) fake.blocosBmc.delete(id);
    }),

    // BSC
    getObjetivos: vi.fn(async (empresaId: string) =>
      Array.from(fake.objetivos.values()).filter((o) => o.empresaId === empresaId),
    ),
    getBscRelacoes: vi.fn(async (empresaId: string) =>
      Array.from(fake.bscRelacoes.values()).filter((r) => r.empresaId === empresaId),
    ),
    createBscRelacao: vi.fn(async (data: Omit<BscRelacao, "id" | "criadoEm">) => {
      const row: BscRelacao = {
        id: randomUUID(),
        criadoEm: new Date(),
        ...data,
      } as BscRelacao;
      fake.bscRelacoes.set(row.id, row);
      return row;
    }),
    deleteBscRelacao: vi.fn(async (id: string, empresaId: string) => {
      const row = fake.bscRelacoes.get(id);
      if (row && row.empresaId === empresaId) fake.bscRelacoes.delete(id);
    }),

    // Cenários
    getCenarios: vi.fn(async (empresaId: string) =>
      Array.from(fake.cenarios.values()).filter((c) => c.empresaId === empresaId),
    ),
    createCenario: vi.fn(async (data: Omit<Cenario, "id" | "criadoEm">) => {
      const row: Cenario = {
        id: randomUUID(),
        criadoEm: new Date(),
        ...data,
      } as Cenario;
      fake.cenarios.set(row.id, row);
      return row;
    }),
    updateCenario: vi.fn(
      async (id: string, empresaId: string, patch: Partial<Cenario>) => {
        const row = fake.cenarios.get(id);
        if (!row || row.empresaId !== empresaId) throw new Error("not found");
        const updated = { ...row, ...patch } as Cenario;
        fake.cenarios.set(id, updated);
        return updated;
      },
    ),
    deleteCenario: vi.fn(async (id: string, empresaId: string) => {
      const row = fake.cenarios.get(id);
      if (row && row.empresaId === empresaId) fake.cenarios.delete(id);
    }),
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
  fake.estrategias.clear();
  fake.blocosBmc.clear();
  fake.bscRelacoes.clear();
  fake.cenarios.clear();
  fake.objetivos.clear();
});

// Helpers para acessar tool tipada e parsear params com o Zod da própria tool.
function tool(name: string) {
  const t = getTool(name);
  if (!t) throw new Error(`tool ${name} não registrada`);
  return t;
}
function parse(name: string, raw: unknown) {
  return tool(name).paramsSchema.parse(raw);
}

function seedEstrategia(empresaId: string, over: Partial<Estrategia> = {}): Estrategia {
  const row: Estrategia = {
    id: randomUUID(),
    empresaId,
    tipo: "FO",
    titulo: "Estratégia base",
    descricao: "Descrição base",
    prioridade: "média",
    status: "planejada",
    swotOrigemIds: null,
    ordem: null,
    createdAt: new Date(),
  };
  const merged = { ...row, ...over };
  fake.estrategias.set(merged.id, merged);
  return merged;
}
function seedBlocoBmc(empresaId: string, over: Partial<ModeloNegocio> = {}): ModeloNegocio {
  const row: ModeloNegocio = {
    id: randomUUID(),
    empresaId,
    bloco: "proposta_valor",
    descricao: "Texto antigo",
    createdAt: new Date(),
  };
  const merged = { ...row, ...over };
  fake.blocosBmc.set(merged.id, merged);
  return merged;
}
function seedObjetivo(empresaId: string, titulo: string): Objetivo {
  const o = { id: randomUUID(), empresaId, titulo } as Objetivo;
  fake.objetivos.set(o.id, o);
  return o;
}
function seedCenario(empresaId: string, over: Partial<Cenario> = {}): Cenario {
  const row: Cenario = {
    id: randomUUID(),
    empresaId,
    tipo: "base",
    titulo: "Cenário base",
    descricao: "Descrição base",
    premissas: JSON.stringify(["premissa 1"]),
    respostaEstrategica: "Resposta antiga",
    criadoEm: new Date(),
  };
  const merged = { ...row, ...over };
  fake.cenarios.set(merged.id, merged);
  return merged;
}

// ─── 1. criar_estrategia ────────────────────────────────────────────────
describe("criar_estrategia", () => {
  it("rejeita params sem título/descrição", () => {
    expect(() => parse("criar_estrategia", { titulo: "ok" })).toThrow();
    expect(() => parse("criar_estrategia", { titulo: "ab", descricao: "ab" })).toThrow();
    expect(() =>
      parse("criar_estrategia", { titulo: "Titulo", descricao: "Descricao", tipo: "XX" }),
    ).toThrow();
  });

  it("preview reflete os campos validados", () => {
    const p = parse("criar_estrategia", {
      titulo: "Fidelizar premium",
      descricao: "Plano de fidelização do segmento premium",
    });
    const preview = tool("criar_estrategia").preview(p);
    expect(preview.titulo).toContain("Fidelizar premium");
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(
      expect.arrayContaining(["Título", "Tipo", "Prioridade", "Status", "Descrição"]),
    );
  });

  it("apply persiste com empresaId do ctx", async () => {
    const p = parse("criar_estrategia", {
      titulo: "Crescer no Sul",
      descricao: "Expandir base no Sul do país",
      tipo: "FO",
      prioridade: "alta",
    });
    const res = await tool("criar_estrategia").apply(p, ctxA);
    const created = fake.estrategias.get(res.entidadeId!);
    expect(created?.empresaId).toBe(EMPRESA_A);
    expect(created?.titulo).toBe("Crescer no Sul");
    expect(res.entidadeTipo).toBe("estrategia");
  });
});

// ─── 2. atualizar_estrategia ────────────────────────────────────────────
describe("atualizar_estrategia", () => {
  it("rejeita id inválido", () => {
    expect(() => parse("atualizar_estrategia", { estrategiaId: "x" })).toThrow();
  });

  it("apply respeita empresaId (rejeita estratégia de outra empresa)", async () => {
    const e = seedEstrategia(EMPRESA_B);
    const p = parse("atualizar_estrategia", {
      estrategiaId: e.id,
      titulo: "Hackeado",
    });
    await expect(tool("atualizar_estrategia").apply(p, ctxA)).rejects.toThrow(
      /não encontrada/i,
    );
    expect(fake.estrategias.get(e.id)?.titulo).toBe("Estratégia base");
  });

  it("apply atualiza apenas os campos enviados", async () => {
    const e = seedEstrategia(EMPRESA_A, { prioridade: "baixa" });
    const p = parse("atualizar_estrategia", {
      estrategiaId: e.id,
      prioridade: "alta",
    });
    await tool("atualizar_estrategia").apply(p, ctxA);
    const updated = fake.estrategias.get(e.id)!;
    expect(updated.prioridade).toBe("alta");
    expect(updated.titulo).toBe("Estratégia base");
  });

  it("enrichPreview anexa valorAnterior só nos campos alterados", async () => {
    const e = seedEstrategia(EMPRESA_A, { titulo: "Antigo", prioridade: "baixa" });
    const p = parse("atualizar_estrategia", {
      estrategiaId: e.id,
      titulo: "Novo",
      prioridade: "baixa", // não mudou
    });
    const t = tool("atualizar_estrategia");
    const enriched = await t.enrichPreview!(t.preview(p), p, ctxA);
    const tituloField = enriched.campos!.find((c) => c.label === "Novo título");
    expect(tituloField).toBeDefined();
    expect((tituloField as { valorAnterior?: string }).valorAnterior).toBe("Antigo");
    // Campo que não mudou foi removido pelo applyDiff.
    const prioField = enriched.campos!.find((c) => c.label === "Prioridade");
    expect(prioField).toBeUndefined();
  });
});

// ─── 3. arquivar_estrategia ─────────────────────────────────────────────
describe("arquivar_estrategia", () => {
  it("rejeita estrategiaId muito curto", () => {
    expect(() => parse("arquivar_estrategia", { estrategiaId: "x" })).toThrow();
  });

  it("preview lista o ID e (quando informado) o motivo", () => {
    const p = parse("arquivar_estrategia", {
      estrategiaId: "12345678-aaaa",
      motivo: "obsoleta",
    });
    const preview = tool("arquivar_estrategia").preview(p);
    expect(preview.titulo).toMatch(/Arquivar/i);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["ID", "Motivo"]));
  });

  it("apply marca status='arquivada' respeitando empresaId", async () => {
    const e = seedEstrategia(EMPRESA_A, { status: "em_andamento" });
    const p = parse("arquivar_estrategia", { estrategiaId: e.id, motivo: "obsoleta" });
    await tool("arquivar_estrategia").apply(p, ctxA);
    expect(fake.estrategias.get(e.id)?.status).toBe("arquivada");
  });

  it("apply rejeita estratégia de outra empresa", async () => {
    const e = seedEstrategia(EMPRESA_B);
    const p = parse("arquivar_estrategia", { estrategiaId: e.id });
    await expect(tool("arquivar_estrategia").apply(p, ctxA)).rejects.toThrow(
      /não encontrada/i,
    );
    expect(fake.estrategias.get(e.id)?.status).toBe("planejada");
  });
});

// ─── 4. criar_bloco_bmc ─────────────────────────────────────────────────
describe("criar_bloco_bmc", () => {
  it("rejeita bloco fora do enum BMC", () => {
    expect(() =>
      parse("criar_bloco_bmc", { bloco: "inexistente", descricao: "abc" }),
    ).toThrow();
  });

  it("preview mostra rótulo legível do bloco", () => {
    const p = parse("criar_bloco_bmc", {
      bloco: "proposta_valor",
      descricao: "Consultoria embarcada",
    });
    const preview = tool("criar_bloco_bmc").preview(p);
    expect(preview.titulo).toMatch(/BMC/);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Bloco", "Conteúdo"]));
  });

  it("apply persiste com empresaId do ctx", async () => {
    const p = parse("criar_bloco_bmc", {
      bloco: "proposta_valor",
      descricao: "Consultoria embarcada para clientes premium.",
    });
    const res = await tool("criar_bloco_bmc").apply(p, ctxA);
    const created = fake.blocosBmc.get(res.entidadeId!);
    expect(created?.empresaId).toBe(EMPRESA_A);
    expect(created?.bloco).toBe("proposta_valor");
  });
});

// ─── 5. atualizar_bloco_bmc ─────────────────────────────────────────────
describe("atualizar_bloco_bmc", () => {
  it("rejeita params inválidos", () => {
    expect(() =>
      parse("atualizar_bloco_bmc", { blocoId: "x", descricao: "abc" }),
    ).toThrow();
    expect(() =>
      parse("atualizar_bloco_bmc", { blocoId: "12345678-aaaa", descricao: "" }),
    ).toThrow();
  });

  it("apply rejeita bloco de outra empresa", async () => {
    const b = seedBlocoBmc(EMPRESA_B);
    const p = parse("atualizar_bloco_bmc", { blocoId: b.id, descricao: "novo" });
    await expect(tool("atualizar_bloco_bmc").apply(p, ctxA)).rejects.toThrow(
      /não encontrad/i,
    );
    expect(fake.blocosBmc.get(b.id)?.descricao).toBe("Texto antigo");
  });

  it("apply atualiza descrição na empresa correta", async () => {
    const b = seedBlocoBmc(EMPRESA_A, { descricao: "antiga" });
    const p = parse("atualizar_bloco_bmc", { blocoId: b.id, descricao: "novíssima" });
    await tool("atualizar_bloco_bmc").apply(p, ctxA);
    expect(fake.blocosBmc.get(b.id)?.descricao).toBe("novíssima");
  });

  it("enrichPreview mostra antes→depois para descrição", async () => {
    const b = seedBlocoBmc(EMPRESA_A, { descricao: "Texto velho" });
    const p = parse("atualizar_bloco_bmc", { blocoId: b.id, descricao: "Texto novo" });
    const t = tool("atualizar_bloco_bmc");
    const enriched = await t.enrichPreview!(t.preview(p), p, ctxA);
    const campo = enriched.campos!.find((c) => c.label === "Nova descrição");
    expect(campo).toBeDefined();
    expect((campo as { valorAnterior?: string }).valorAnterior).toBe("Texto velho");
  });
});

// ─── 6. arquivar_bloco_bmc ──────────────────────────────────────────────
describe("arquivar_bloco_bmc", () => {
  it("rejeita blocoId muito curto", () => {
    expect(() => parse("arquivar_bloco_bmc", { blocoId: "x" })).toThrow();
  });

  it("preview lista o ID a remover", () => {
    const p = parse("arquivar_bloco_bmc", { blocoId: "12345678-aaaa" });
    const preview = tool("arquivar_bloco_bmc").preview(p);
    expect(preview.titulo).toMatch(/Arquivar/i);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["ID"]));
  });

  it("apply remove o bloco da empresa correta", async () => {
    const b = seedBlocoBmc(EMPRESA_A);
    const p = parse("arquivar_bloco_bmc", { blocoId: b.id });
    await tool("arquivar_bloco_bmc").apply(p, ctxA);
    expect(fake.blocosBmc.has(b.id)).toBe(false);
  });

  it("apply rejeita bloco de outra empresa", async () => {
    const b = seedBlocoBmc(EMPRESA_B);
    const p = parse("arquivar_bloco_bmc", { blocoId: b.id });
    await expect(tool("arquivar_bloco_bmc").apply(p, ctxA)).rejects.toThrow();
    expect(fake.blocosBmc.has(b.id)).toBe(true);
  });
});

// ─── 7. criar_relacao_bsc ───────────────────────────────────────────────
describe("criar_relacao_bsc", () => {
  it("rejeita params inválidos (IDs curtos ou tipo fora do enum)", () => {
    expect(() =>
      parse("criar_relacao_bsc", { origemId: "x", destinoId: "12345678-aaaa" }),
    ).toThrow();
    expect(() =>
      parse("criar_relacao_bsc", {
        origemId: "12345678-aaaa",
        destinoId: "12345678-bbbb",
        tipo: "absurdo",
      }),
    ).toThrow();
  });

  it("preview destaca tipo, origem e destino", () => {
    const p = parse("criar_relacao_bsc", {
      origemId: "12345678-aaaa",
      destinoId: "12345678-bbbb",
    });
    const preview = tool("criar_relacao_bsc").preview(p);
    expect(preview.titulo).toMatch(/Mapa BSC/i);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Origem", "Destino", "Tipo"]));
  });

  it("apply rejeita origem == destino", async () => {
    const o = seedObjetivo(EMPRESA_A, "NPS");
    const p = parse("criar_relacao_bsc", { origemId: o.id, destinoId: o.id });
    await expect(tool("criar_relacao_bsc").apply(p, ctxA)).rejects.toThrow(
      /não podem ser o mesmo/i,
    );
  });

  it("apply rejeita objetivos inexistentes ou de outra empresa", async () => {
    const a = seedObjetivo(EMPRESA_A, "A");
    const b = seedObjetivo(EMPRESA_B, "B");
    const p = parse("criar_relacao_bsc", { origemId: a.id, destinoId: b.id });
    await expect(tool("criar_relacao_bsc").apply(p, ctxA)).rejects.toThrow(
      /não foi encontrado/i,
    );
  });

  it("apply cria relação na empresa correta", async () => {
    const a = seedObjetivo(EMPRESA_A, "NPS");
    const b = seedObjetivo(EMPRESA_A, "Receita");
    const p = parse("criar_relacao_bsc", { origemId: a.id, destinoId: b.id });
    const res = await tool("criar_relacao_bsc").apply(p, ctxA);
    const rel = fake.bscRelacoes.get(res.entidadeId!);
    expect(rel?.empresaId).toBe(EMPRESA_A);
    expect(rel?.origemId).toBe(a.id);
    expect(rel?.destinoId).toBe(b.id);
  });

  it("apply detecta duplicidade nas duas direções", async () => {
    const a = seedObjetivo(EMPRESA_A, "NPS");
    const b = seedObjetivo(EMPRESA_A, "Receita");
    const p1 = parse("criar_relacao_bsc", { origemId: a.id, destinoId: b.id });
    await tool("criar_relacao_bsc").apply(p1, ctxA);

    // Mesma direção
    await expect(tool("criar_relacao_bsc").apply(p1, ctxA)).rejects.toThrow(/já existe/i);

    // Direção invertida
    const p2 = parse("criar_relacao_bsc", { origemId: b.id, destinoId: a.id });
    await expect(tool("criar_relacao_bsc").apply(p2, ctxA)).rejects.toThrow(/já existe/i);

    expect(fake.bscRelacoes.size).toBe(1);
  });
});

// ─── 8. remover_relacao_bsc ─────────────────────────────────────────────
describe("remover_relacao_bsc", () => {
  it("rejeita relacaoId muito curto", () => {
    expect(() => parse("remover_relacao_bsc", { relacaoId: "x" })).toThrow();
  });

  it("preview lista o ID a remover", () => {
    const p = parse("remover_relacao_bsc", { relacaoId: "12345678-aaaa" });
    const preview = tool("remover_relacao_bsc").preview(p);
    expect(preview.titulo).toMatch(/Remover/i);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["ID"]));
  });

  it("apply remove relação da empresa correta", async () => {
    const a = seedObjetivo(EMPRESA_A, "NPS");
    const b = seedObjetivo(EMPRESA_A, "Receita");
    const created = await tool("criar_relacao_bsc").apply(
      parse("criar_relacao_bsc", { origemId: a.id, destinoId: b.id }),
      ctxA,
    );
    await tool("remover_relacao_bsc").apply(
      parse("remover_relacao_bsc", { relacaoId: created.entidadeId! }),
      ctxA,
    );
    expect(fake.bscRelacoes.size).toBe(0);
  });

  it("apply rejeita relação de outra empresa", async () => {
    const fakeId = randomUUID();
    fake.bscRelacoes.set(fakeId, {
      id: fakeId,
      empresaId: EMPRESA_B,
      origemId: randomUUID(),
      destinoId: randomUUID(),
      criadoEm: new Date(),
    });
    const p = parse("remover_relacao_bsc", { relacaoId: fakeId });
    await expect(tool("remover_relacao_bsc").apply(p, ctxA)).rejects.toThrow(
      /não encontrada/i,
    );
    expect(fake.bscRelacoes.has(fakeId)).toBe(true);
  });
});

// ─── 9. criar_cenario ───────────────────────────────────────────────────
describe("criar_cenario", () => {
  it("rejeita tipo fora do enum", () => {
    expect(() => parse("criar_cenario", { tipo: "x", titulo: "abc" })).toThrow();
  });

  it("preview lista tipo/título e (quando enviadas) premissas", () => {
    const p = parse("criar_cenario", {
      tipo: "pessimista",
      titulo: "Queda 20%",
      premissas: ["queda PIB"],
    });
    const preview = tool("criar_cenario").preview(p);
    expect(preview.titulo).toMatch(/pessimista/i);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Tipo", "Título", "Premissas"]));
  });

  it("apply persiste com empresaId e serializa premissas", async () => {
    const p = parse("criar_cenario", {
      tipo: "pessimista",
      titulo: "Queda de 20% na receita",
      descricao: "Crise prolongada",
      premissas: ["queda PIB", "alta SELIC"],
      respostaEstrategica: "Cortar opex em 15%",
    });
    const res = await tool("criar_cenario").apply(p, ctxA);
    const created = fake.cenarios.get(res.entidadeId!);
    expect(created?.empresaId).toBe(EMPRESA_A);
    expect(JSON.parse(created!.premissas)).toEqual(["queda PIB", "alta SELIC"]);
  });
});

// ─── 10. atualizar_cenario ──────────────────────────────────────────────
describe("atualizar_cenario", () => {
  it("rejeita params inválidos", () => {
    expect(() => parse("atualizar_cenario", { cenarioId: "x" })).toThrow();
    expect(() =>
      parse("atualizar_cenario", { cenarioId: "12345678-aaaa", tipo: "absurdo" }),
    ).toThrow();
  });

  it("apply rejeita cenário de outra empresa", async () => {
    const c = seedCenario(EMPRESA_B);
    const p = parse("atualizar_cenario", { cenarioId: c.id, titulo: "Hack" });
    await expect(tool("atualizar_cenario").apply(p, ctxA)).rejects.toThrow();
  });

  it("apply atualiza título e serializa premissas", async () => {
    const c = seedCenario(EMPRESA_A);
    const p = parse("atualizar_cenario", {
      cenarioId: c.id,
      titulo: "Novo titulo",
      premissas: ["nova premissa"],
    });
    await tool("atualizar_cenario").apply(p, ctxA);
    const updated = fake.cenarios.get(c.id)!;
    expect(updated.titulo).toBe("Novo titulo");
    expect(JSON.parse(updated.premissas)).toEqual(["nova premissa"]);
  });

  it("enrichPreview mostra antes→depois e some campos sem mudança", async () => {
    const c = seedCenario(EMPRESA_A, {
      titulo: "Antigo",
      premissas: JSON.stringify(["A"]),
      respostaEstrategica: "Resposta antiga",
    });
    const p = parse("atualizar_cenario", {
      cenarioId: c.id,
      titulo: "Novo",
      premissas: ["B"],
      respostaEstrategica: "Resposta antiga", // sem mudança
    });
    const t = tool("atualizar_cenario");
    const enriched = await t.enrichPreview!(t.preview(p), p, ctxA);
    const titulo = enriched.campos!.find((c) => c.label === "Novo título");
    expect((titulo as { valorAnterior?: string }).valorAnterior).toBe("Antigo");
    const premissas = enriched.campos!.find((c) => c.label === "Novas premissas");
    expect((premissas as { valorAnterior?: string }).valorAnterior).toBe("A");
    const resposta = enriched.campos!.find((c) => c.label === "Resposta estratégica");
    expect(resposta).toBeUndefined();
  });
});

// ─── 11. arquivar_cenario ───────────────────────────────────────────────
describe("arquivar_cenario", () => {
  it("rejeita cenarioId muito curto", () => {
    expect(() => parse("arquivar_cenario", { cenarioId: "x" })).toThrow();
  });

  it("preview lista o ID a remover", () => {
    const p = parse("arquivar_cenario", { cenarioId: "12345678-aaaa" });
    const preview = tool("arquivar_cenario").preview(p);
    expect(preview.titulo).toMatch(/Arquivar/i);
    const labels = (preview.campos ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["ID"]));
  });

  it("apply remove o cenário da empresa correta", async () => {
    const c = seedCenario(EMPRESA_A);
    await tool("arquivar_cenario").apply(
      parse("arquivar_cenario", { cenarioId: c.id }),
      ctxA,
    );
    expect(fake.cenarios.has(c.id)).toBe(false);
  });

  it("apply rejeita cenário de outra empresa", async () => {
    const c = seedCenario(EMPRESA_B);
    await expect(
      tool("arquivar_cenario").apply(parse("arquivar_cenario", { cenarioId: c.id }), ctxA),
    ).rejects.toThrow();
    expect(fake.cenarios.has(c.id)).toBe(true);
  });
});

// Task #342 — Cobre a autocorreção do Bizzy no plano agêntico
// (`proporProximoPassoDoPlano`): quando a 1ª tool_call é rejeitada
// pela pré-validação (duplicidade ou FK inválida), o sistema faz
// uma 2ª chamada ao LLM anexando o erro como mensagem de tool e
// reemitindo a tool corrigida — sem nunca vazar UUIDs ou jargão
// técnico ao usuário, mesmo no caso em que o retry também falha.
//
// Mocks: openai (.create), storage (in-memory). registrarProposta
// e a tool `criar_iniciativa` são reais para exercitar o caminho de
// pré-validação de duplicidade da Task #333/335.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

interface FakePasso {
  id: string; planoId: string; ordem: number;
  titulo: string; descricao: string | null;
  status: "pendente" | "em_andamento" | "concluido" | "pulado";
  propostaId: string | null;
  resolvidoEm: Date | null; resultadoResumo: string | null;
  tipo?: "acao" | "link" | "mensagem";
}
interface FakePlano {
  id: string; empresaId: string; usuarioId: string | null;
  titulo: string; status: "ativo" | "concluido" | "cancelado";
  passoAtual: number; totalPassos: number;
  finalizadoEm: Date | null;
}

const fake = {
  planos: [] as FakePlano[],
  passos: [] as FakePasso[],
  propostas: [] as any[],
  iniciativas: [] as Array<{
    id: string; empresaId: string; titulo: string;
    descricao: string; status: string; prioridade: string;
    prazo: string; prazoData: Date | null; responsavel: string;
    impacto: string; indicadorFonteId: string | null;
    encerradaEm: Date | null; notaEncerramento: string | null;
    createdAt: Date;
  }>,
};

const { openaiCreate } = vi.hoisted(() => ({ openaiCreate: vi.fn() }));

vi.mock("node-cron", () => ({ default: { schedule: vi.fn() } }));
vi.mock("../email", () => ({
  sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn(),
  getEmailDiagnostics: vi.fn(() => ({})),
}));
vi.mock("../mp", () => ({
  criarAssinatura: vi.fn(), buscarAssinatura: vi.fn(),
  cancelarAssinatura: vi.fn(), buscarPagamento: vi.fn(),
  motivoLegivel: vi.fn(), validarAssinaturaWebhook: vi.fn(),
  PLANOS_MP: {},
}));
vi.mock("../notification-engine", () => ({
  runNotificationEngine: vi.fn(async () => ({})),
  detectarSinaisCriticos: vi.fn(), carregarContextoEmpresa: vi.fn(),
  montarHtmlResumoSemanal: vi.fn(),
}));
vi.mock("../briefing-engine", () => ({
  runBriefingDiarioScheduler: vi.fn(),
  gerarEPersistirBriefing: vi.fn(),
  dataDeHojeSP: vi.fn(() => "2026-04-23"),
}));
vi.mock("../github-scheduler", () => ({
  runGithubPush: vi.fn(), getPushLogs: vi.fn(() => []),
  startGithubScheduler: vi.fn(), stopGithubScheduler: vi.fn(),
  isGitRepository: vi.fn(() => false),
}));
vi.mock("../plano-agentico-healing", () => ({
  runPlanoAgenticoHealing: vi.fn(), getHealingLogs: vi.fn(() => []),
  startPlanoAgenticoHealingScheduler: vi.fn(),
}));
vi.mock("../bizzy-resumos", () => ({
  buildHistoricoContextoIA: vi.fn(async () => null),
  gerarResumoCiclo: vi.fn(), lerConteudoResumo: vi.fn(),
}));
vi.mock("../memory-extractor", () => ({
  dispararExtracaoBackground: vi.fn(),
  extrairEPersistirMemoria: vi.fn(),
}));
vi.mock("../plan-quality", () => ({
  computePlanQuality: vi.fn(async () => ({ score: 0, dimensoes: [], lacunas: [] })),
  formatPlanQualityForPrompt: vi.fn(() => ""),
}));
vi.mock("../jornada-helper", () => ({ isJornadaConcluida: vi.fn(() => true) }));

vi.mock("../ai-helpers", () => ({
  openai: { chat: { completions: { create: openaiCreate } } },
  AI_MODELS: { default: "gpt-test", basico: "gpt-test" },
  loadModelConfig: vi.fn(async () => {}),
  getModelForPlan: vi.fn(() => "gpt-test"),
  buildEmpresaContextoIA: vi.fn(() => ""),
  buildAcoesRecentesContextoIA: vi.fn(async () => ""),
  buildPlanoAtivoContextoIA: vi.fn(async () => ""),
}));

vi.mock("../storage", () => {
  class PlanoAtivoJaExisteError extends Error {}
  const findPlano = (id: string) => fake.planos.find((p) => p.id === id) ?? null;
  const findPasso = (id: string) => fake.passos.find((p) => p.id === id) ?? null;
  const findProposta = (id: string) => fake.propostas.find((p) => p.id === id) ?? null;

  const storage = {
    getUsuarioById: vi.fn(async () => ({
      id: "user-1", nome: "Admin", email: "a@a.com", isAdmin: true,
    })),
    getEmpresa: vi.fn(async () => ({
      id: "empresa-1", nome: "ACME",
      planoStatus: "ativo", planoTipo: "pro",
      createdAt: new Date(), trialStartedAt: new Date(),
    })),
    getContextoMacroByCategoria: vi.fn(async () => null),
    getConfigSistema: vi.fn(async () => null),
    getAllEmpresas: vi.fn(async () => []),

    getFatoresPestel: vi.fn(async () => []),
    getAnaliseSwot: vi.fn(async () => []),
    getCincoForcas: vi.fn(async () => []),
    getModeloNegocio: vi.fn(async () => []),
    getEstrategias: vi.fn(async () => []),
    getObjetivos: vi.fn(async () => []),
    getIndicadoresAcompanhamento: vi.fn(async () => []),
    getIniciativas: vi.fn(async () => fake.iniciativas),
    getRituais: vi.fn(async () => []),
    getRiscos: vi.fn(async () => []),
    getOportunidadesCrescimento: vi.fn(async () => []),
    getResultadosChave: vi.fn(async () => []),
    getMemoriaAtiva: vi.fn(async () => []),

    getEstrategia: vi.fn(async () => undefined),
    getIndicador: vi.fn(async () => undefined),
    getIniciativa: vi.fn(async () => undefined),
    createIniciativa: vi.fn(async (data: any) => {
      const created = {
        id: `ini-${fake.iniciativas.length + 1}`,
        empresaId: data.empresaId, titulo: data.titulo,
        descricao: data.descricao ?? "", status: data.status ?? "em_andamento",
        prioridade: data.prioridade ?? "média", prazo: data.prazo ?? "",
        prazoData: data.prazoData ?? null, responsavel: data.responsavel ?? "",
        impacto: data.impacto ?? "", indicadorFonteId: null,
        encerradaEm: null, notaEncerramento: null, createdAt: new Date(),
      };
      fake.iniciativas.push(created);
      return created;
    }),

    getPlanoAgentico: vi.fn(async (id: string) => findPlano(id)),
    getPlanoAgenticoComPassos: vi.fn(async (id: string) => {
      const plano = findPlano(id);
      if (!plano) return null;
      const passos = fake.passos
        .filter((p) => p.planoId === id)
        .sort((a, b) => a.ordem - b.ordem)
        .map((p) => ({ ...p }));
      return { plano: { ...plano }, passos };
    }),
    listPassosByPlano: vi.fn(async (id: string) =>
      fake.passos.filter((p) => p.planoId === id).sort((a, b) => a.ordem - b.ordem).map((p) => ({ ...p })),
    ),
    listPlanosAgenticosByEmpresa: vi.fn(async () => fake.planos.map((p) => ({ ...p }))),
    getPlanoAtivoEmpresaUsuario: vi.fn(async () =>
      fake.planos.find((p) => p.status === "ativo") ?? null,
    ),
    getPlanoAtivoEmpresaDeOutros: vi.fn(async () => null),
    updatePlanoAgentico: vi.fn(async (id: string, patch: Partial<FakePlano>) => {
      const p = findPlano(id);
      if (!p) throw new Error("plano não existe");
      Object.assign(p, patch);
      return { ...p };
    }),
    updatePlanoAgenticoPasso: vi.fn(async (id: string, patch: Partial<FakePasso>) => {
      const p = findPasso(id);
      if (!p) throw new Error("passo não existe");
      Object.assign(p, patch);
      return { ...p };
    }),
    getPassoByPropostaId: vi.fn(async (propostaId: string) => {
      const p = fake.passos.find((x) => x.propostaId === propostaId);
      return p ? { ...p } : null;
    }),

    getPropostaLog: vi.fn(async (id: string) => {
      const p = findProposta(id);
      return p ? { ...p } : undefined;
    }),
    claimPropostaPendente: vi.fn(async () => null),
    updatePropostaLog: vi.fn(async () => undefined),
    createPropostaLog: vi.fn(async (data: any) => {
      const log = {
        id: `log-${fake.propostas.length + 1}`,
        empresaId: data.empresaId,
        usuarioId: data.usuarioId ?? null,
        ferramenta: data.ferramenta,
        status: "proposta",
        parametros: data.parametros ?? {},
        preview: data.preview ?? null,
        resultado: null, entidadeTipo: null, entidadeId: null,
        resolvidoEm: null,
      };
      fake.propostas.push(log);
      return { ...log };
    }),

    getConversa: vi.fn(async () => undefined),
    getConversaAtiva: vi.fn(async () => undefined),
    criarConversa: vi.fn(async () => ({ id: "conv-x" })),
    appendMensagem: vi.fn(async (data: any) => ({ id: "msg-x", ...data })),
    countMensagensUsuario: vi.fn(async () => 0),
    getMensagens: vi.fn(async () => []),
  };
  return { storage, PlanoAtivoJaExisteError };
});

import { registerRoutes } from "../routes";

let server: http.Server;
let baseUrl: string;

function seedPlanoComPassoPendente(titulo: string) {
  const plano: FakePlano = {
    id: "plano-1", empresaId: "empresa-1", usuarioId: "user-1",
    titulo: "Plano de retenção", status: "ativo",
    passoAtual: 1, totalPassos: 1, finalizadoEm: null,
  };
  const passo: FakePasso = {
    id: "passo-1", planoId: plano.id, ordem: 1,
    titulo, descricao: "Passo de criação de iniciativa.",
    status: "pendente", propostaId: null,
    resolvidoEm: null, resultadoResumo: null, tipo: "acao",
  };
  fake.planos.push(plano);
  fake.passos.push(passo);
}

function seedIniciativaExistente(titulo: string) {
  fake.iniciativas.push({
    id: "ini-existente", empresaId: "empresa-1", titulo,
    descricao: "", status: "em_andamento", prioridade: "média",
    prazo: "Q4 2026", prazoData: null, responsavel: "Ana",
    impacto: "", indicadorFonteId: null,
    encerradaEm: null, notaEncerramento: null, createdAt: new Date(),
  });
}

function completionToolCall(name: string, args: Record<string, unknown>, callId = "call_1") {
  return {
    choices: [{
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: callId, type: "function",
          function: { name, arguments: JSON.stringify(args) },
        }],
      },
    }],
  };
}

beforeEach(async () => {
  fake.planos = []; fake.passos = []; fake.propostas = []; fake.iniciativas = [];
  openaiCreate.mockReset();

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = { userId: "user-1", empresaId: "empresa-1" };
    next();
  });
  await registerRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Plano agêntico — autocorreção do Bizzy (Task #342)", () => {
  // (a) 1ª tentativa cai em duplicidade; retry com título único é aceito.
  it("rejeita 1ª tool_call duplicada e cria proposta no retry", async () => {
    seedPlanoComPassoPendente("Criar iniciativa de churn");
    seedIniciativaExistente("Reduzir churn de clientes Pro");

    openaiCreate
      // 1ª chamada: título quase igual ao existente → duplicidade
      .mockResolvedValueOnce(completionToolCall("criar_iniciativa", {
        titulo: "Reduzir churn de clientes Pro Q4",
        descricao: "Plano de retenção focado em reduzir churn.",
        prioridade: "alta", prazo: "Q4 2026", prazoData: "2026-12-31",
        status: "em_andamento", responsavel: "Ana",
        impacto: "Recuperar receita recorrente",
      }, "call_dup"))
      // 2ª chamada (retry): título totalmente novo → aceito
      .mockResolvedValueOnce(completionToolCall("criar_iniciativa", {
        titulo: "Programa de fidelização premium ZX-2026",
        descricao: "Iniciativa nova de fidelização.",
        prioridade: "alta", prazo: "Q4 2026", prazoData: "2026-12-31",
        status: "em_andamento", responsavel: "Ana",
        impacto: "Aumentar LTV dos clientes Pro",
      }, "call_ok"));

    const res = await fetch(`${baseUrl}/api/ai/planos/plano-1/avancar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(openaiCreate).toHaveBeenCalledTimes(2);

    // Proposta criada no retry → log + parametros corretos.
    expect(body.continuacao.proximasPropostas).toHaveLength(1);
    expect(body.continuacao.proximasPropostas[0].ferramenta).toBe("criar_iniciativa");
    expect(body.continuacao.proximasPropostas[0].parametros.titulo).toBe(
      "Programa de fidelização premium ZX-2026",
    );

    // A 2ª chamada ao LLM precisa ter recebido a mensagem de tool com o erro
    // (mostrando que o convo de retry foi montado corretamente).
    const segundaCall = openaiCreate.mock.calls[1][0];
    const toolMsg = segundaCall.messages.find((m: any) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(toolMsg.tool_call_id).toBe("call_dup");
    expect(toolMsg.content).toContain("Já existe iniciativa parecido(a)");
    expect(segundaCall.tool_choice).toBe("required");
  });

  // (b) Retry também falha → mensagem ao usuário humanizada (sem UUIDs,
  // sem `indicadorId=`, sem `Use sempre o id REAL`, sem JSON).
  it("humaniza mensagem final quando retry também falha", async () => {
    seedPlanoComPassoPendente("Criar iniciativa de churn");
    seedIniciativaExistente("Reduzir churn de clientes Pro");

    // Ambas as chamadas insistem no título duplicado.
    openaiCreate.mockResolvedValue(completionToolCall("criar_iniciativa", {
      titulo: "Reduzir churn de clientes Pro Q4 (variação)",
      descricao: "Plano de retenção.",
      prioridade: "alta", prazo: "Q4 2026", prazoData: "2026-12-31",
      status: "em_andamento", responsavel: "Ana",
      impacto: "Recuperar receita recorrente",
    }, "call_dup"));

    const res = await fetch(`${baseUrl}/api/ai/planos/plano-1/avancar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.continuacao.proximasPropostas).toEqual([]);

    const msg = body.continuacao.mensagem as string;
    // Humanizado: sem UUIDs, sem "indicadorId=", sem "Use sempre o id REAL",
    // sem JSON e sem "Parâmetros inválidos".
    expect(msg).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
    expect(msg).not.toMatch(/indicadorId=/);
    expect(msg).not.toMatch(/iniciativaId=/);
    expect(msg).not.toMatch(/Use sempre o id REAL/);
    expect(msg).not.toMatch(/Parâmetros inválidos/);
    expect(msg).not.toMatch(/Reemita a tool/);
    expect(msg).not.toMatch(/\{[\s\S]*\}/);
    // E menciona o conceito de duplicidade em PT-BR amigável.
    expect(msg.toLowerCase()).toMatch(/iniciativa parecida|duplicidade|atualize ou arquive/);
  });
});

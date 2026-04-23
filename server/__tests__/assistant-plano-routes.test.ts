// Task #338 — Cobre o fluxo HITL do plano agêntico nos endpoints REST que
// dão sequência ao loop após a Task #334 (que só validou o chat):
//   (a) POST /api/ai/proposta/:logId/confirmar com proposta vinculada a um
//       passo "em_andamento": a tool é aplicada, o passo vira "concluido",
//       o próximo passo continua "pendente" sem propostaId herdado e o
//       campo `continuacao` da resposta vem populado.
//   (b) POST /api/ai/planos/:id/cancelar: o plano vira "cancelado" e
//       nenhum passo novo é criado (o próximo passo permanece pendente).
//
// Reaproveita o padrão de mocks de assistant-chat-route.test.ts: registramos
// um Express isolado, injetamos sessão e mockamos cron/schedulers/openai/
// storage. Aqui mantemos `registrarProposta` e a tool `criar_iniciativa`
// reais para exercitar de verdade o caminho de aplicação + persistência.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

// ── Estado mutável compartilhado entre handlers e mocks ────────────────
type FakePassoStatus = "pendente" | "em_andamento" | "concluido" | "pulado";
interface FakePasso {
  id: string;
  planoId: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  status: FakePassoStatus;
  propostaId: string | null;
  resolvidoEm: Date | null;
  resultadoResumo: string | null;
  tipo?: "acao" | "link" | "mensagem";
}
interface FakePlano {
  id: string;
  empresaId: string;
  usuarioId: string | null;
  titulo: string;
  status: "ativo" | "concluido" | "cancelado";
  passoAtual: number;
  totalPassos: number;
  finalizadoEm: Date | null;
}
interface FakePropostaLog {
  id: string;
  empresaId: string;
  usuarioId: string | null;
  ferramenta: string;
  status: "proposta" | "confirmada" | "ignorada" | "ajustada" | "falhou";
  parametros: Record<string, unknown>;
  preview: unknown;
  resultado: Record<string, unknown> | null;
  entidadeTipo: string | null;
  entidadeId: string | null;
  resolvidoEm: Date | null;
}

const fake = {
  planos: [] as FakePlano[],
  passos: [] as FakePasso[],
  propostas: [] as FakePropostaLog[],
  iniciativasCriadas: [] as Array<{ id: string; titulo: string }>,
};

const { openaiCreate } = vi.hoisted(() => ({ openaiCreate: vi.fn() }));

// ── Mocks de módulos pesados (idênticos ao chat test) ──────────────────
vi.mock("node-cron", () => ({ default: { schedule: vi.fn() } }));
vi.mock("../email", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  getEmailDiagnostics: vi.fn(() => ({})),
}));
vi.mock("../mp", () => ({
  criarAssinatura: vi.fn(),
  buscarAssinatura: vi.fn(),
  cancelarAssinatura: vi.fn(),
  buscarPagamento: vi.fn(),
  motivoLegivel: vi.fn(),
  validarAssinaturaWebhook: vi.fn(),
  PLANOS_MP: {},
}));
vi.mock("../notification-engine", () => ({
  runNotificationEngine: vi.fn(async () => ({})),
  detectarSinaisCriticos: vi.fn(),
  carregarContextoEmpresa: vi.fn(),
  montarHtmlResumoSemanal: vi.fn(),
}));
vi.mock("../briefing-engine", () => ({
  runBriefingDiarioScheduler: vi.fn(),
  gerarEPersistirBriefing: vi.fn(),
  dataDeHojeSP: vi.fn(() => "2026-04-23"),
}));
vi.mock("../github-scheduler", () => ({
  runGithubPush: vi.fn(),
  getPushLogs: vi.fn(() => []),
  startGithubScheduler: vi.fn(),
  stopGithubScheduler: vi.fn(),
  isGitRepository: vi.fn(() => false),
}));
vi.mock("../plano-agentico-healing", () => ({
  runPlanoAgenticoHealing: vi.fn(),
  getHealingLogs: vi.fn(() => []),
  startPlanoAgenticoHealingScheduler: vi.fn(),
}));
vi.mock("../bizzy-resumos", () => ({
  buildHistoricoContextoIA: vi.fn(async () => null),
  gerarResumoCiclo: vi.fn(),
  lerConteudoResumo: vi.fn(),
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
    // requireAuth + boot
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

    // contexto vazio para simplificar prompt
    getFatoresPestel: vi.fn(async () => []),
    getAnaliseSwot: vi.fn(async () => []),
    getCincoForcas: vi.fn(async () => []),
    getModeloNegocio: vi.fn(async () => []),
    getEstrategias: vi.fn(async () => []),
    getObjetivos: vi.fn(async () => []),
    getIndicadoresAcompanhamento: vi.fn(async () => []),
    getIniciativas: vi.fn(async () => []),
    getRituais: vi.fn(async () => []),
    getRiscos: vi.fn(async () => []),
    getOportunidadesCrescimento: vi.fn(async () => []),
    getResultadosChave: vi.fn(async () => []),
    getMemoriaAtiva: vi.fn(async () => []),

    // tool criar_iniciativa
    getEstrategia: vi.fn(async () => undefined),
    getIndicador: vi.fn(async () => undefined),
    createIniciativa: vi.fn(async (data: any) => {
      const created = { id: `ini-${fake.iniciativasCriadas.length + 1}`, titulo: data.titulo };
      fake.iniciativasCriadas.push(created);
      return created;
    }),

    // planos / passos
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

    // propostas
    getPropostaLog: vi.fn(async (id: string) => {
      const p = findProposta(id);
      return p ? { ...p } : undefined;
    }),
    claimPropostaPendente: vi.fn(async (id: string, empresaId: string) => {
      const p = findProposta(id);
      if (!p || p.empresaId !== empresaId || p.status !== "proposta") return null;
      p.status = "confirmada";
      return { ...p };
    }),
    updatePropostaLog: vi.fn(async (id: string, patch: Partial<FakePropostaLog>) => {
      const p = findProposta(id);
      if (!p) return undefined;
      Object.assign(p, patch);
      return { ...p };
    }),
    createPropostaLog: vi.fn(async (data: any) => {
      const log: FakePropostaLog = {
        id: `log-${fake.propostas.length + 1}`,
        empresaId: data.empresaId,
        usuarioId: data.usuarioId ?? null,
        ferramenta: data.ferramenta,
        status: "proposta",
        parametros: data.parametros ?? {},
        preview: data.preview ?? null,
        resultado: null,
        entidadeTipo: null,
        entidadeId: null,
        resolvidoEm: null,
      };
      fake.propostas.push(log);
      return { ...log };
    }),

    // conversa (não usadas aqui, mas requireAuth/registerRoutes podem tocar)
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

function seedPlanoComPassoEmAndamento() {
  const plano: FakePlano = {
    id: "plano-1",
    empresaId: "empresa-1",
    usuarioId: "user-1",
    titulo: "Plano de retenção",
    status: "ativo",
    passoAtual: 1,
    totalPassos: 2,
    finalizadoEm: null,
  };
  const proposta: FakePropostaLog = {
    id: "log-pendente-1",
    empresaId: "empresa-1",
    usuarioId: "user-1",
    ferramenta: "criar_iniciativa",
    status: "proposta",
    parametros: {
      titulo: "Reduzir churn em 20%",
      descricao: "Plano de retenção focado em reduzir churn no Q4.",
      prioridade: "alta",
      prazo: "Q4 2026",
      prazoData: "2026-12-31",
      status: "em_andamento",
      responsavel: "Ana",
      impacto: "Recuperar receita recorrente",
    },
    preview: { titulo: "Criar iniciativa: Reduzir churn em 20%" },
    resultado: null,
    entidadeTipo: null,
    entidadeId: null,
    resolvidoEm: null,
  };
  const passos: FakePasso[] = [
    {
      id: "passo-1", planoId: plano.id, ordem: 1,
      titulo: "Criar iniciativa de churn", descricao: "Registrar a iniciativa no catálogo.",
      status: "em_andamento", propostaId: proposta.id,
      resolvidoEm: null, resultadoResumo: null, tipo: "acao",
    },
    {
      id: "passo-2", planoId: plano.id, ordem: 2,
      titulo: "Definir KR de churn", descricao: "Adicionar KR para acompanhar churn.",
      status: "pendente", propostaId: null,
      resolvidoEm: null, resultadoResumo: null, tipo: "acao",
    },
  ];
  fake.planos.push(plano);
  fake.passos.push(...passos);
  fake.propostas.push(proposta);
}

beforeEach(async () => {
  fake.planos = [];
  fake.passos = [];
  fake.propostas = [];
  fake.iniciativasCriadas = [];
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

describe("Plano agêntico — endpoints REST do loop HITL", () => {
  // (a) Confirmar uma proposta vinculada a um passo aplica a tool, conclui o
  // passo atual e mantém o próximo passo pendente sem propostaId herdado.
  it("confirma proposta, conclui o passo e libera o próximo sem propostaId pendente", async () => {
    seedPlanoComPassoEmAndamento();

    // Round agêntico do próximo passo: LLM responde só com texto, sem
    // tool_calls — assim o passo 2 permanece pendente / sem propostaId,
    // que é exatamente o estado limpo que o usuário precisa ver.
    openaiCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Próximo passo sugerido: definir o KR de churn.",
            tool_calls: [],
          },
        },
      ],
    });

    const res = await fetch(`${baseUrl}/api/ai/proposta/log-pendente-1/confirmar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    // Tool aplicada de verdade.
    expect(fake.iniciativasCriadas).toHaveLength(1);
    expect(fake.iniciativasCriadas[0].titulo).toBe("Reduzir churn em 20%");

    // Proposta marcada como confirmada no log.
    const logFinal = fake.propostas.find((p) => p.id === "log-pendente-1")!;
    expect(logFinal.status).toBe("confirmada");
    expect(logFinal.entidadeTipo).toBe("iniciativa");
    expect(logFinal.entidadeId).toBeTruthy();

    // Passo 1 concluído, passo 2 ainda pendente e SEM propostaId herdado.
    const passo1 = fake.passos.find((p) => p.id === "passo-1")!;
    const passo2 = fake.passos.find((p) => p.id === "passo-2")!;
    expect(passo1.status).toBe("concluido");
    expect(passo1.resolvidoEm).toBeInstanceOf(Date);
    expect(passo2.status).toBe("pendente");
    expect(passo2.propostaId).toBeNull();

    // Continuação devolvida ao frontend descreve o próximo passo sem nenhuma
    // proposta repetida (proximasPropostas vazio neste cenário).
    expect(body.continuacao).toBeTruthy();
    expect(body.continuacao.passoConcluidoOrdem).toBe(1);
    expect(body.continuacao.finalizado).toBe(false);
    expect(body.continuacao.proximasPropostas).toEqual([]);
    expect(body.continuacao.plano.plano.passoAtual).toBe(2);

    // O LLM foi chamado exatamente uma vez (1 rodada para o próximo passo).
    expect(openaiCreate).toHaveBeenCalledTimes(1);
  });

  // (b) Cancelar plano vira "cancelado" e nenhum passo novo é criado / o
  // passo pendente segue intocado.
  it("cancela plano sem criar passo novo nem mexer nos passos pendentes", async () => {
    seedPlanoComPassoEmAndamento();

    const passosAntes = JSON.parse(JSON.stringify(fake.passos));

    const res = await fetch(`${baseUrl}/api/ai/planos/plano-1/cancelar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.plano.status).toBe("cancelado");
    expect(body.plano.finalizadoEm).toBeTruthy();

    // Nenhum passo a mais foi criado e os existentes seguem inalterados.
    expect(fake.passos).toHaveLength(passosAntes.length);
    expect(fake.passos[0].status).toBe(passosAntes[0].status);
    expect(fake.passos[0].propostaId).toBe(passosAntes[0].propostaId);
    expect(fake.passos[1].status).toBe(passosAntes[1].status);
    expect(fake.passos[1].propostaId).toBe(passosAntes[1].propostaId);

    // E o LLM nunca é tocado nesse caminho.
    expect(openaiCreate).not.toHaveBeenCalled();

    // Segunda chamada deve responder 409 (idempotência defensiva).
    const res2 = await fetch(`${baseUrl}/api/ai/planos/plano-1/cancelar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res2.status).toBe(409);
  });
});

// Task #334 — Cobre o caminho HTTP/SSE do endpoint do chat (POST
// /api/ai/assistente) com dois cenários de regressão críticos:
//   (a) trava anti-repetição: se já existe um passo `em_andamento` com
//       proposta pendente, o handler descarta tool_calls vindas do LLM e
//       devolve aviso textual em vez de criar nova proposta;
//   (b) propagação do erro de duplicidade: quando registrarProposta
//       rejeita criar_iniciativa por título quase igual a uma iniciativa
//       já existente, o erro chega no campo `resposta` do evento `final`.
//
// Mockamos OpenAI (stream com tool_calls) + storage + módulos pesados
// (cron, schedulers, email, motores). registrarProposta é o real, para
// exercitar a pré-validação de duplicata da Task #333.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

// ── Estado mutável usado pelos mocks ────────────────────────────────────
type StreamChunk = {
  choices: Array<{
    delta: {
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
};

const fakeStorage = {
  iniciativas: [] as any[],
  planoAtivo: null as any,
  passos: [] as any[],
  propostaLog: null as any,
};

const { openaiCreate } = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
}));

function makeStream(chunks: StreamChunk[]) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (i < chunks.length) return { value: chunks[i++], done: false };
          return { value: undefined, done: true };
        },
      };
    },
  };
}

// ── Mocks de módulos pesados ───────────────────────────────────────────
vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));
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
vi.mock("../jornada-helper", () => ({
  isJornadaConcluida: vi.fn(() => true),
}));

vi.mock("../ai-helpers", () => ({
  openai: { chat: { completions: { create: openaiCreate } } },
  AI_MODELS: { default: "gpt-test" },
  loadModelConfig: vi.fn(async () => {}),
  getModelForPlan: vi.fn(() => "gpt-test"),
  buildEmpresaContextoIA: vi.fn(() => ""),
  buildAcoesRecentesContextoIA: vi.fn(async () => ""),
  buildPlanoAtivoContextoIA: vi.fn(async () => ""),
}));

vi.mock("../storage", () => {
  class PlanoAtivoJaExisteError extends Error {}
  const storage = {
    // requireAuth
    getUsuarioById: vi.fn(async () => ({
      id: "user-1",
      nome: "Admin",
      email: "a@a.com",
      isAdmin: true,
    })),
    getEmpresa: vi.fn(async () => ({
      id: "empresa-1",
      nome: "ACME",
      planoStatus: "ativo",
      planoTipo: "pro",
      createdAt: new Date(),
      trialStartedAt: new Date(),
    })),

    // contexto (todas vazias para simplificar prompt)
    getFatoresPestel: vi.fn(async () => []),
    getAnaliseSwot: vi.fn(async () => []),
    getCincoForcas: vi.fn(async () => []),
    getModeloNegocio: vi.fn(async () => []),
    getEstrategias: vi.fn(async () => []),
    getObjetivos: vi.fn(async () => []),
    getIndicadoresAcompanhamento: vi.fn(async () => []),
    getIniciativas: vi.fn(async () => fakeStorage.iniciativas),
    getRituais: vi.fn(async () => []),
    getRiscos: vi.fn(async () => []),
    getOportunidadesCrescimento: vi.fn(async () => []),
    getResultadosChave: vi.fn(async () => []),
    getMemoriaAtiva: vi.fn(async () => []),

    // conversa
    getConversa: vi.fn(async () => undefined),
    getConversaAtiva: vi.fn(async () => undefined),
    criarConversa: vi.fn(async (data: any) => ({
      id: "conv-1",
      empresaId: data.empresaId,
      usuarioId: data.usuarioId,
      titulo: data.titulo,
      encerradaEm: null,
      createdAt: new Date(),
    })),
    appendMensagem: vi.fn(async (data: any) => ({
      id: `msg-${Math.random().toString(36).slice(2, 8)}`,
      ...data,
      createdAt: new Date(),
    })),
    countMensagensUsuario: vi.fn(async () => 1),
    getMensagens: vi.fn(async () => []),

    // plano agêntico
    getPlanoAtivoEmpresaUsuario: vi.fn(async () => fakeStorage.planoAtivo),
    listPassosByPlano: vi.fn(async () => fakeStorage.passos),
    getPropostaLog: vi.fn(async () => fakeStorage.propostaLog),
    getPlanoAtivoEmpresaDeOutros: vi.fn(async () => null),

    // estratégia (validada por criar_iniciativa quando estrategiaId vem nos args)
    getEstrategia: vi.fn(async () => undefined),

    // booting (IIFEs em registerRoutes)
    getContextoMacroByCategoria: vi.fn(async () => null),
    getConfigSistema: vi.fn(async () => null),
    getAllEmpresas: vi.fn(async () => []),

    // criar/atualizar log de proposta (usado pelo retry do chat na Task #342)
    claimPropostaPendente: vi.fn(async () => null),
    updatePropostaLog: vi.fn(async () => undefined),
    createPropostaLog: vi.fn(async (data: any) => ({
      id: `log-${Math.random().toString(36).slice(2, 8)}`,
      empresaId: data.empresaId,
      usuarioId: data.usuarioId ?? null,
      ferramenta: data.ferramenta,
      status: "proposta",
      parametros: data.parametros ?? {},
      preview: data.preview ?? null,
      resultado: null, entidadeTipo: null, entidadeId: null,
      resolvidoEm: null,
    })),
  };
  return { storage, PlanoAtivoJaExisteError };
});

// ── Imports pós-mock ───────────────────────────────────────────────────
import { registerRoutes } from "../routes";

let server: http.Server;
let baseUrl: string;

beforeEach(async () => {
  fakeStorage.iniciativas = [];
  fakeStorage.planoAtivo = null;
  fakeStorage.passos = [];
  fakeStorage.propostaLog = null;
  openaiCreate.mockReset();

  const app = express();
  app.use(express.json());
  // Injeta sessão antes de qualquer middleware de auth.
  app.use((req, _res, next) => {
    (req as any).session = { userId: "user-1", empresaId: "empresa-1" };
    next();
  });
  await registerRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// ── Helpers de SSE ─────────────────────────────────────────────────────
type SseEvent = { event: string; data: any };

async function postChat(pergunta: string): Promise<SseEvent[]> {
  const res = await fetch(`${baseUrl}/api/ai/assistente`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({ pergunta }),
  });
  const text = await res.text();
  if (res.status !== 200) {
    throw new Error(`status=${res.status} body=${text}`);
  }
  const events: SseEvent[] = [];
  for (const block of text.split("\n\n")) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    let event = "message";
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
    }
    if (dataLines.length === 0) continue;
    let data: any = dataLines.join("\n");
    try {
      data = JSON.parse(data);
    } catch { /* mantém string */ }
    events.push({ event, data });
  }
  return events;
}

function streamWithToolCall(
  name: string,
  args: Record<string, unknown>,
): { [Symbol.asyncIterator]: () => AsyncIterator<StreamChunk> } {
  return makeStream([
    {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call_1",
                function: { name, arguments: JSON.stringify(args) },
              },
            ],
          },
        },
      ],
    },
    {
      choices: [
        { delta: { content: "Vou propor essa ação." } },
      ],
    },
  ]);
}

// ── Testes ─────────────────────────────────────────────────────────────
describe("POST /api/ai/assistente — comportamentos críticos do chat", () => {
  // (a) Trava anti-repetição (Task #333 + #334): com proposta pendente,
  // tool_calls são descartadas e o usuário recebe aviso textual.
  it("descarta tool_calls quando há proposta pendente no passo em andamento", async () => {
    fakeStorage.planoAtivo = {
      id: "plano-1",
      empresaId: "empresa-1",
      titulo: "Plano teste",
      status: "ativo",
      passoAtual: 1,
      totalPassos: 3,
    };
    fakeStorage.passos = [
      {
        id: "passo-1",
        planoId: "plano-1",
        ordem: 1,
        titulo: "Criar iniciativa de churn",
        status: "em_andamento",
        propostaId: "log-pendente-1",
      },
    ];
    fakeStorage.propostaLog = {
      id: "log-pendente-1",
      status: "proposta",
    };

    openaiCreate.mockResolvedValue(
      streamWithToolCall("criar_iniciativa", {
        titulo: "Reduzir churn",
        descricao: "Plano para reduzir churn em 20%",
        prazo: "Q4 2026",
        prazoData: "2026-12-31",
      }),
    );

    const events = await postChat("Cria uma iniciativa pra reduzir churn");
    const final = events.find((e) => e.event === "final");
    expect(final).toBeDefined();
    expect(final!.data.propostas).toEqual([]);
    expect(final!.data.resposta).toContain("Ainda existe uma proposta aberta");
    // OpenAI foi chamada (round inicial), mas tool_call não virou proposta.
    expect(openaiCreate).toHaveBeenCalled();
  });

  // (b) Propagação do erro de duplicidade (Task #333 + #334):
  // registrarProposta rejeita criar_iniciativa por título similar e o
  // erro chega ao usuário via SSE.
  it("repassa o erro de iniciativa duplicada no campo resposta", async () => {
    fakeStorage.iniciativas = [
      {
        id: "ini-existente",
        empresaId: "empresa-1",
        titulo: "Promover reuniões periódicas de alinhamento e revisão dos OKRs",
        descricao: "",
        status: "em_andamento",
        prioridade: "média",
        prazo: "Q4 2026",
        prazoData: null,
        responsavel: "Ana",
        impacto: "",
        indicadorFonteId: null,
        encerradaEm: null,
        notaEncerramento: null,
        createdAt: new Date(),
      },
    ];

    openaiCreate.mockResolvedValue(
      streamWithToolCall("criar_iniciativa", {
        titulo:
          "Criar iniciativa para definir responsáveis e metas nas reuniões periódicas de alinhamento dos OKRs",
        descricao: "Estruturar cadência das reuniões de OKRs",
        prazo: "Q4 2026",
        prazoData: "2026-12-31",
      }),
    );

    const events = await postChat("cria essa iniciativa");
    const final = events.find((e) => e.event === "final");
    expect(final).toBeDefined();
    expect(final!.data.propostas).toEqual([]);
    expect(final!.data.resposta).toMatch(/iniciativa parecida/i);
    // O erro cita o título da iniciativa existente como candidato.
    expect(final!.data.resposta).toContain(
      "Promover reuniões periódicas de alinhamento e revisão dos OKRs",
    );
  });

  // (c) Task #342 — autocorreção do Bizzy no chat livre: 1ª tool_call é
  // rejeitada por duplicidade, 2ª chamada (não-stream) corrige o título e
  // a proposta vai para o usuário sem aviso de erro.
  it("autocorrige tool_call duplicada e cria proposta no retry", async () => {
    fakeStorage.iniciativas = [
      {
        id: "ini-existente", empresaId: "empresa-1",
        titulo: "Reduzir churn de clientes Pro",
        descricao: "", status: "em_andamento", prioridade: "média",
        prazo: "Q4 2026", prazoData: null, responsavel: "Ana",
        impacto: "", indicadorFonteId: null,
        encerradaEm: null, notaEncerramento: null, createdAt: new Date(),
      },
    ];

    openaiCreate
      // 1ª chamada (stream): título duplicado → rejeitado
      .mockResolvedValueOnce(
        streamWithToolCall("criar_iniciativa", {
          titulo: "Reduzir churn de clientes Pro Q4",
          descricao: "Plano de retenção.",
          prazo: "Q4 2026", prazoData: "2026-12-31",
          status: "em_andamento", responsavel: "Ana", impacto: "Recuperar receita",
        }),
      )
      // 2ª chamada (não-stream, retry): título totalmente novo → aceito
      .mockResolvedValueOnce({
        choices: [{
          message: {
            role: "assistant",
            content: "Corrigi e proponho a iniciativa abaixo.",
            tool_calls: [{
              id: "call_retry", type: "function",
              function: {
                name: "criar_iniciativa",
                arguments: JSON.stringify({
                  titulo: "Programa de fidelização premium ZX-2026",
                  descricao: "Iniciativa nova de fidelização.",
                  prazo: "Q4 2026", prazoData: "2026-12-31",
                  status: "em_andamento", responsavel: "Ana",
                  impacto: "Aumentar LTV dos clientes Pro",
                }),
              },
            }],
          },
        }],
      });

    const events = await postChat("cria iniciativa de retenção");
    const final = events.find((e) => e.event === "final");
    expect(final).toBeDefined();
    expect(openaiCreate).toHaveBeenCalledTimes(2);

    // Proposta criada no retry → 1 card vai para o usuário.
    expect(final!.data.propostas).toHaveLength(1);
    expect(final!.data.propostas[0].ferramenta).toBe("criar_iniciativa");
    expect(final!.data.propostas[0].parametros.titulo).toBe(
      "Programa de fidelização premium ZX-2026",
    );

    // Mensagem ao usuário NÃO carrega aviso de erro técnico (foi corrigido).
    const resposta = final!.data.resposta as string;
    expect(resposta).not.toMatch(/iniciativa parecida/i);
    expect(resposta).not.toMatch(/Use sempre o id REAL/);
    expect(resposta).not.toMatch(/Reemita a tool/);

    // E o convo de retry foi montado com o erro como mensagem de tool.
    const segundaCall = openaiCreate.mock.calls[1][0];
    // 2ª chamada é não-stream (o handler omite `stream: true`).
    expect(segundaCall.stream).not.toBe(true);
    expect(segundaCall.tool_choice).toBe("required");
    const toolMsg = segundaCall.messages.find((m: any) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(toolMsg.tool_call_id).toBe("call_1");
    expect(toolMsg.content).toContain("Já existe iniciativa parecido(a)");
  });

  // (d) Task #342 — quando o retry do chat também falha, o erro técnico
  // é humanizado antes de ser anexado à resposta SSE.
  it("humaniza mensagem final quando retry do chat também falha", async () => {
    fakeStorage.iniciativas = [
      {
        id: "ini-existente", empresaId: "empresa-1",
        titulo: "Reduzir churn de clientes Pro",
        descricao: "", status: "em_andamento", prioridade: "média",
        prazo: "Q4 2026", prazoData: null, responsavel: "Ana",
        impacto: "", indicadorFonteId: null,
        encerradaEm: null, notaEncerramento: null, createdAt: new Date(),
      },
    ];

    openaiCreate
      .mockResolvedValueOnce(
        streamWithToolCall("criar_iniciativa", {
          titulo: "Reduzir churn de clientes Pro Q4",
          descricao: "Plano.", prazo: "Q4 2026", prazoData: "2026-12-31",
          status: "em_andamento", responsavel: "Ana", impacto: "x",
        }),
      )
      .mockResolvedValueOnce({
        choices: [{
          message: {
            role: "assistant",
            // Conteúdo NÃO-vazio para garantir que mensagem técnica do erro
            // não vaza mesmo quando o assistente já textualizou algo.
            content: "Vou tentar de novo.",
            tool_calls: [{
              id: "call_retry", type: "function",
              function: {
                name: "criar_iniciativa",
                arguments: JSON.stringify({
                  titulo: "Reduzir churn de clientes Pro Q4 (variação)",
                  descricao: "Plano.", prazo: "Q4 2026", prazoData: "2026-12-31",
                  status: "em_andamento", responsavel: "Ana", impacto: "x",
                }),
              },
            }],
          },
        }],
      });

    const events = await postChat("cria iniciativa de churn");
    const final = events.find((e) => e.event === "final");
    expect(final).toBeDefined();
    expect(final!.data.propostas).toEqual([]);
    const resposta = final!.data.resposta as string;

    // Sem vazamentos técnicos no SSE final.
    expect(resposta).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
    expect(resposta).not.toMatch(/indicadorId=/);
    expect(resposta).not.toMatch(/iniciativaId=/);
    expect(resposta).not.toMatch(/Use sempre o id REAL/);
    expect(resposta).not.toMatch(/Reemita a tool/);
    expect(resposta).not.toMatch(/Parâmetros inválidos/);
    expect(resposta).not.toMatch(/\{[\s\S]*\}/);

    // E menciona o conceito de duplicidade em PT-BR amigável.
    expect(resposta.toLowerCase()).toMatch(
      /iniciativa parecida|atualize ou arquive|duplicidade/,
    );
  });
});

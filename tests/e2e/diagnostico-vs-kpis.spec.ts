// Task #217 — valida a separação entre indicadores de diagnóstico inicial
// (perspectiva: "diagnostico") e KPIs de acompanhamento (BSC) ao longo dos
// fluxos de alertas, painel pessoal, briefing diário e resumo semanal.
//
// Regras protegidas (introduzidas na task #216):
//  - /api/alertas usa storage.getIndicadoresAcompanhamento e portanto NUNCA
//    deve emitir alertas baseados em indicadores de diagnóstico.
//  - /api/meu-painel filtra apenas KPIs do BSC para o usuário.
//  - O briefing diário monta `sinais.kpisVermelhos` a partir do mesmo helper.
//  - O resumo semanal (montado por `montarHtmlResumoSemanal`) também usa o
//    mesmo `carregarContextoEmpresa` — exposto via
//    /api/meu-painel/resumo-semanal-preview para ser inspecionável neste teste
//    sem disparar e-mail real.
import { test, expect, APIRequestContext } from "@playwright/test";
import pg from "pg";
const { Client } = pg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL must be set to run this E2E test");

const random = () => Math.random().toString(36).slice(2, 10);

interface IndicadorIds {
  diag1: string;
  diag2: string;
  bsc1: string;
  bsc2: string;
}

interface AlertaResposta {
  tipo: string;
  severidade: string;
  mensagem: string;
}

interface PainelIndicador {
  id: string;
  nome: string;
  status: string;
}

interface PainelResposta {
  indicadores: PainelIndicador[];
}

interface SinalKpi {
  id: string;
  nome: string;
  perspectiva: string;
  atual: string;
  meta: string;
}

interface BriefingResposta {
  sinais?: { kpisVermelhos?: SinalKpi[] };
}

interface ResumoSemanalPreview {
  html: string;
  kpisVermelhos: Array<{ id: string; nome: string; perspectiva: string; atual: string; meta: string }>;
  kpisAmarelos: Array<{ id: string; nome: string; perspectiva: string; atual: string; meta: string }>;
  iniciativasAtrasadas: Array<{ id: string; titulo: string; prazo: string }>;
  okrsParados: Array<{ objetivoId: string; resultadoId: string; metrica: string }>;
}

interface IndicadorBruto {
  id: string;
  nome: string;
  perspectiva: string;
  status: string;
}

async function getJson<T>(req: APIRequestContext, url: string): Promise<T> {
  const r = await req.get(url);
  if (!r.ok()) throw new Error(`GET ${url} falhou: ${r.status()} ${await r.text()}`);
  return (await r.json()) as T;
}

async function registerAndActivate(req: APIRequestContext) {
  const email = `kpi-diag-${random()}-${Date.now()}@example.com`;
  const senha = "Senha1234";

  const reg = await req.post("/api/auth/register", {
    data: {
      nome: "Teste KPI Diag",
      email,
      senha,
      nomeEmpresa: `Empresa KPI Diag ${random()}`,
      setor: "Tecnologia",
      tamanho: "pequena",
      termsAccepted: true,
    },
  });
  expect([201, 202]).toContain(reg.status());

  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query(
      "UPDATE usuarios SET email_verificado = true WHERE email = $1",
      [email],
    );
  } finally {
    await client.end();
  }
  return { email, senha };
}

async function loginViaApi(req: APIRequestContext, email: string, senha: string) {
  const r = await req.post("/api/auth/login", { data: { email, senha } });
  expect(r.ok(), `login falhou: ${r.status()} ${await r.text()}`).toBeTruthy();
}

async function getMe(req: APIRequestContext): Promise<{ id: string; empresaId: string }> {
  const body = await getJson<{ usuario: { id: string; empresaId: string } }>(req, "/api/auth/me");
  return { id: body.usuario.id, empresaId: body.usuario.empresaId };
}

async function criarIndicador(
  req: APIRequestContext,
  data: {
    perspectiva: string;
    nome: string;
    meta: string;
    atual: string;
    status: string;
    owner: string;
    responsavelId: string;
  },
): Promise<string> {
  const r = await req.post("/api/indicadores", { data });
  if (!r.ok()) throw new Error(`POST /api/indicadores falhou: ${r.status()} ${await r.text()}`);
  const ind = (await r.json()) as { id: string };
  return ind.id;
}

async function patchIndicadorStatus(req: APIRequestContext, id: string, status: string) {
  const r = await req.patch(`/api/indicadores/${id}`, { data: { status } });
  if (!r.ok()) throw new Error(`PATCH /api/indicadores/${id} falhou: ${r.status()} ${await r.text()}`);
}

async function cleanup(email: string) {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query(
      "DELETE FROM empresas WHERE id IN (SELECT empresa_id FROM usuarios WHERE email = $1)",
      [email],
    );
    await client.query("DELETE FROM usuarios WHERE email = $1", [email]);
  } catch {
    /* best-effort */
  } finally {
    await client.end();
  }
}

test.describe("separação diagnóstico vs KPIs (BSC)", () => {
  let email = "";
  let senha = "";
  let userId = "";
  let ids: IndicadorIds;
  let req: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5000";
    req = await playwright.request.newContext({ baseURL });

    const cred = await registerAndActivate(req);
    email = cred.email;
    senha = cred.senha;
    await loginViaApi(req, email, senha);
    const me = await getMe(req);
    userId = me.id;

    // 2 indicadores de diagnóstico inicial em VERMELHO (não devem aparecer
    // em alertas/painel/briefing nem disparar resumo semanal).
    const diag1 = await criarIndicador(req, {
      perspectiva: "diagnostico",
      nome: "Diagnóstico Crítico A",
      meta: "100",
      atual: "10",
      status: "vermelho",
      owner: "Time",
      responsavelId: userId,
    });
    const diag2 = await criarIndicador(req, {
      perspectiva: "diagnostico",
      nome: "Diagnóstico Crítico B",
      meta: "100",
      atual: "20",
      status: "vermelho",
      owner: "Time",
      responsavelId: userId,
    });

    // 2 KPIs de acompanhamento (BSC) em VERDE — quietos.
    const bsc1 = await criarIndicador(req, {
      perspectiva: "Financeira",
      nome: "Receita Mensal",
      meta: "100",
      atual: "100",
      status: "verde",
      owner: "Time",
      responsavelId: userId,
    });
    const bsc2 = await criarIndicador(req, {
      perspectiva: "Clientes",
      nome: "NPS",
      meta: "70",
      atual: "75",
      status: "verde",
      owner: "Time",
      responsavelId: userId,
    });

    ids = { diag1, diag2, bsc1, bsc2 };
  });

  test.afterAll(async () => {
    if (req) await req.dispose();
    if (email) await cleanup(email);
  });

  test("diagnósticos vermelhos + BSC verdes: nenhum sinal crítico aparece nos fluxos de acompanhamento", async () => {
    // Sanidade: /api/indicadores enxerga TODOS os 4.
    const todos = await getJson<IndicadorBruto[]>(req, "/api/indicadores");
    const meusTodos = todos.filter((i) =>
      [ids.diag1, ids.diag2, ids.bsc1, ids.bsc2].includes(i.id),
    );
    expect(meusTodos).toHaveLength(4);

    // /api/alertas — não deve citar nenhum dos diagnósticos.
    const alertas = await getJson<AlertaResposta[]>(req, "/api/alertas");
    const nomesAlerta = alertas.map((a) => a.mensagem);
    expect(nomesAlerta.some((m) => m.includes("Diagnóstico Crítico A"))).toBe(false);
    expect(nomesAlerta.some((m) => m.includes("Diagnóstico Crítico B"))).toBe(false);
    // BSC está verde: nenhum alerta de indicador.
    expect(
      alertas.filter(
        (a) => a.tipo === "indicador_critico" || a.tipo === "indicador_atencao",
      ),
    ).toHaveLength(0);

    // /api/meu-painel — só vê os 2 KPIs BSC do usuário.
    const painel = await getJson<PainelResposta>(req, "/api/meu-painel");
    const indPainelIds = painel.indicadores.map((i) => i.id);
    expect(indPainelIds.sort()).toEqual([ids.bsc1, ids.bsc2].sort());
    expect(indPainelIds).not.toContain(ids.diag1);
    expect(indPainelIds).not.toContain(ids.diag2);

    // Briefing diário — sinais.kpisVermelhos deve estar vazio.
    const briefing = await getJson<BriefingResposta>(req, "/api/ai/briefing-proativo");
    const kpisVermelhosBriefing = (briefing.sinais?.kpisVermelhos ?? []).map((k) => k.id);
    expect(kpisVermelhosBriefing).not.toContain(ids.diag1);
    expect(kpisVermelhosBriefing).not.toContain(ids.diag2);
    expect(kpisVermelhosBriefing).toHaveLength(0);

    // Resumo semanal (preview com mesmo carregadorde contexto e
    // montarHtmlResumoSemanal usados pelo motor de notificações) — não
    // deve listar diagnósticos nem em payload nem no HTML enviado.
    const resumo = await getJson<ResumoSemanalPreview>(
      req,
      "/api/meu-painel/resumo-semanal-preview",
    );
    expect(resumo.kpisVermelhos.map((k) => k.id)).toHaveLength(0);
    expect(resumo.html).not.toContain("Diagnóstico Crítico A");
    expect(resumo.html).not.toContain("Diagnóstico Crítico B");
    // Sem nada para reportar, o template imprime a frase de "tudo dentro do
    // esperado" — comprovando que o resumo semanal NÃO escreveu nada sobre
    // diagnósticos vermelhos.
    expect(resumo.html).toContain("Tudo dentro do esperado");
  });

  test("invertido: 2 KPIs BSC vermelhos e diagnósticos verdes → o sinal volta", async () => {
    // Vira o jogo: BSC fica crítico, diagnósticos saem do vermelho.
    await patchIndicadorStatus(req, ids.bsc1, "vermelho");
    await patchIndicadorStatus(req, ids.bsc2, "vermelho");
    await patchIndicadorStatus(req, ids.diag1, "verde");
    await patchIndicadorStatus(req, ids.diag2, "verde");

    // /api/alertas — agora os 2 BSC entram como "indicador_critico" e
    // nenhum diagnóstico deve aparecer.
    const alertas = await getJson<AlertaResposta[]>(req, "/api/alertas");
    const criticos = alertas.filter((a) => a.tipo === "indicador_critico");
    expect(criticos).toHaveLength(2);
    const nomesCriticos = criticos.map((a) => a.mensagem);
    expect(nomesCriticos.some((m) => m.includes("Receita Mensal"))).toBe(true);
    expect(nomesCriticos.some((m) => m.includes("NPS"))).toBe(true);
    expect(nomesCriticos.some((m) => m.includes("Diagnóstico Crítico"))).toBe(false);

    // /api/meu-painel — KPIs do usuário continuam só sendo os 2 BSC, agora
    // marcados como vermelho.
    const painel = await getJson<PainelResposta>(req, "/api/meu-painel");
    expect(painel.indicadores.map((i) => i.id).sort()).toEqual(
      [ids.bsc1, ids.bsc2].sort(),
    );
    expect(painel.indicadores.every((i) => i.status === "vermelho")).toBe(true);

    // Briefing — sinais.kpisVermelhos passa a conter exatamente os 2 BSC.
    const briefing = await getJson<BriefingResposta>(req, "/api/ai/briefing-proativo");
    const kpisVermelhosBriefing = (briefing.sinais?.kpisVermelhos ?? [])
      .map((k) => k.id)
      .sort();
    expect(kpisVermelhosBriefing).toEqual([ids.bsc1, ids.bsc2].sort());
    expect(kpisVermelhosBriefing).not.toContain(ids.diag1);
    expect(kpisVermelhosBriefing).not.toContain(ids.diag2);

    // Resumo semanal — passa a listar os 2 BSC e nenhum diagnóstico.
    const resumo = await getJson<ResumoSemanalPreview>(
      req,
      "/api/meu-painel/resumo-semanal-preview",
    );
    expect(resumo.kpisVermelhos.map((k) => k.id).sort()).toEqual(
      [ids.bsc1, ids.bsc2].sort(),
    );
    expect(resumo.html).toContain("Receita Mensal");
    expect(resumo.html).toContain("NPS");
    expect(resumo.html).not.toContain("Diagnóstico Crítico");
    expect(resumo.html).not.toContain("Tudo dentro do esperado");
  });
});

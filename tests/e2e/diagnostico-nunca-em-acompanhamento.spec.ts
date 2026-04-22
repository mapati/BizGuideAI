// Task #249 — E2E que protege a regra "diagnóstico inicial nunca aparece
// em alertas e contadores de acompanhamento".
import { test, expect, Page } from "@playwright/test";
import pg from "pg";
const { Client } = pg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL must be set to run this E2E test");

const random = () => Math.random().toString(36).slice(2, 10);

interface Indicador { id: string; nome: string; perspectiva: string; status: string }
interface PainelResposta { indicadores: Array<{ id: string; nome: string; status: string }> }
interface AlertaResposta { tipo: string; mensagem: string }

async function registerAndActivate(page: Page) {
  const email = `diag-only-${random()}-${Date.now()}@example.com`;
  const senha = "Senha1234";

  const reg = await page.request.post("/api/auth/register", {
    data: {
      nome: "Teste Diagnostico Only",
      email,
      senha,
      nomeEmpresa: `Empresa Diag Only ${random()}`,
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

async function loginViaUI(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-senha").fill(senha);
  await page.getByTestId("button-login").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle");
}

async function criarIndicadorDiagnostico(
  page: Page,
  nome: string,
  responsavelId: string,
): Promise<string> {
  const r = await page.request.post("/api/indicadores", {
    data: {
      perspectiva: "diagnostico",
      nome,
      meta: "100",
      atual: "10",
      status: "vermelho",
      owner: "Time",
      responsavelId,
    },
  });
  expect(r.ok(), `POST /api/indicadores falhou: ${r.status()} ${await r.text()}`).toBeTruthy();
  return ((await r.json()) as { id: string }).id;
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
  } finally {
    await client.end();
  }
}

test.describe("empresa só com indicadores de diagnóstico inicial", () => {
  let email = "";
  let senha = "";
  let diagIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const cred = await registerAndActivate(page);
    email = cred.email;
    senha = cred.senha;
    await loginViaUI(page, email, senha);

    const me = await page.request.get("/api/auth/me");
    const meBody = (await me.json()) as { usuario: { id: string } };
    const userId = meBody.usuario.id;

    diagIds = [
      await criarIndicadorDiagnostico(page, "Diagnóstico Inicial Crítico A", userId),
      await criarIndicadorDiagnostico(page, "Diagnóstico Inicial Crítico B", userId),
      await criarIndicadorDiagnostico(page, "Diagnóstico Inicial Crítico C", userId),
    ];

    // Sanidade: a lista bruta enxerga os 3 diagnósticos.
    const todosResp = await page.request.get("/api/indicadores");
    const todos = (await todosResp.json()) as Indicador[];
    const meusTodos = todos.filter((i) => diagIds.includes(i.id));
    expect(meusTodos).toHaveLength(3);
    expect(meusTodos.every((i) => i.perspectiva === "diagnostico")).toBe(true);

    await ctx.close();
  });

  test.afterAll(async () => {
    if (email) await cleanup(email);
  });

  test("Home: card 'Indicadores do Negócio' mostra estado vazio", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginViaUI(page, email, senha);

    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const card = page.getByTestId("card-kpis");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText("Indicadores do Negócio");
    await expect(card).toContainText("Nenhum indicador cadastrado");
    await expect(card.getByTestId("button-criar-indicadores")).toBeVisible();

    // Nenhum contador (verde/amarelo/vermelho) renderizado.
    await expect(card.getByTestId("text-kpi-verde")).toHaveCount(0);
    await expect(card.getByTestId("text-kpi-amarelo")).toHaveCount(0);
    await expect(card.getByTestId("text-kpi-vermelho")).toHaveCount(0);
    for (const id of diagIds) {
      await expect(page.getByTestId(`item-kpi-critico-${id}`)).toHaveCount(0);
    }

    await ctx.close();
  });

  test("Rastreabilidade: camada 'Indicadores' fica vazia", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginViaUI(page, email, senha);

    await page.goto("/rastreabilidade", { waitUntil: "networkidle" });

    const camada = page.getByTestId("camada-indicadores");
    await expect(camada).toBeVisible({ timeout: 15_000 });
    await expect(camada).toContainText("0 itens");
    await expect(camada).toContainText("Nenhum item cadastrado nesta camada");
    await expect(camada).not.toContainText("Diagnóstico Inicial Crítico A");
    await expect(camada).not.toContainText("Diagnóstico Inicial Crítico B");
    await expect(camada).not.toContainText("Diagnóstico Inicial Crítico C");

    await ctx.close();
  });

  test("Backend: storage.getIndicadoresAcompanhamento ignora diagnósticos (via /api/meu-painel e /api/alertas)", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginViaUI(page, email, senha);

    const painelResp = await page.request.get("/api/meu-painel");
    expect(painelResp.ok()).toBeTruthy();
    const painel = (await painelResp.json()) as PainelResposta;
    expect(painel.indicadores).toEqual([]);

    const alertasResp = await page.request.get("/api/alertas");
    expect(alertasResp.ok()).toBeTruthy();
    const alertas = (await alertasResp.json()) as AlertaResposta[];
    const deIndicador = alertas.filter(
      (a) => a.tipo === "indicador_critico" || a.tipo === "indicador_atencao",
    );
    expect(deIndicador).toHaveLength(0);
    for (const a of alertas) {
      expect(a.mensagem).not.toContain("Diagnóstico Inicial Crítico");
    }

    await ctx.close();
  });
});

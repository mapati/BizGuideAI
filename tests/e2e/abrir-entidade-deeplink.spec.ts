import { test, expect, Page } from "@playwright/test";
import pg from "pg";
const { Client } = pg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL must be set to run this E2E test");

const random = () => Math.random().toString(36).slice(2, 10);

interface SeedIds {
  estrategiaId: string;
  oportunidadeId: string;
  iniciativaId: string;
  indicadorId: string;
  objetivoId: string;
  krId: string;
  riscoId: string;
}

async function registerAndActivate(page: Page) {
  const email = `deeplink-${random()}-${Date.now()}@example.com`;
  const senha = "Senha1234";

  const reg = await page.request.post("/api/auth/register", {
    data: {
      nome: "Teste DeepLink",
      email,
      senha,
      nomeEmpresa: `Empresa DeepLink ${random()}`,
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

async function seedAll(page: Page): Promise<SeedIds> {
  return await page.evaluate(async () => {
    const post = async (url: string, body: unknown) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`${url} -> ${r.status} ${await r.text()}`);
      return r.json();
    };
    const estrategia = await post("/api/estrategias", {
      tipo: "crescimento",
      titulo: "Estrategia DL",
      descricao: "Descricao estrategia",
      prioridade: "alta",
      status: "planejada",
    });
    const oportunidade = await post("/api/oportunidades-crescimento", {
      tipo: "penetracao_mercado",
      titulo: "Oportunidade DL",
      descricao: "Descricao oportunidade",
      potencial: "alto",
      risco: "baixo",
      estrategiaId: estrategia.id,
    });
    const iniciativa = await post("/api/iniciativas", {
      titulo: "Iniciativa DL",
      descricao: "Descricao iniciativa",
      status: "planejada",
      prioridade: "alta",
      prazo: "2026-12-31",
      responsavel: "Time",
      impacto: "Impacto teste",
      estrategiaId: estrategia.id,
    });
    const indicador = await post("/api/indicadores", {
      perspectiva: "Finanças",
      nome: "Indicador DL",
      meta: "100",
      atual: "50",
      status: "verde",
      owner: "Time",
    });
    const objetivo = await post("/api/objetivos", {
      titulo: "Objetivo DL",
      descricao: "Descricao objetivo",
      prazo: "2026-Q4",
      perspectiva: "Financeira",
      estrategiaId: estrategia.id,
    });
    const kr = await post("/api/resultados-chave", {
      objetivoId: objetivo.id,
      metrica: "Metrica KR DL",
      valorInicial: "0",
      valorAlvo: "100",
      valorAtual: "10",
      owner: "Time",
      prazo: "2026-Q4",
    });
    const risco = await post("/api/riscos", {
      descricao: "Risco DL",
      categoria: "estrategico",
      probabilidade: 3,
      impacto: 4,
      status: "identificado",
      planoMitigacao: "Plano mitigacao",
    });
    return {
      estrategiaId: estrategia.id,
      oportunidadeId: oportunidade.id,
      iniciativaId: iniciativa.id,
      indicadorId: indicador.id,
      objetivoId: objetivo.id,
      krId: kr.id,
      riscoId: risco.id,
    };
  });
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
    /* best effort */
  } finally {
    await client.end();
  }
}

async function expectQueryStringCleared(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.location.search), {
      timeout: 15_000,
    })
    .toBe("");
}

test.describe("abrir_entidade deep link flow", () => {
  let email = "";
  let senha = "";
  let ids: SeedIds;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const cred = await registerAndActivate(page);
    email = cred.email;
    senha = cred.senha;
    await loginViaUI(page, email, senha);
    ids = await seedAll(page);
    await ctx.close();
  });

  test.afterAll(async () => {
    if (email) await cleanup(email);
  });

  test("opens edit modal on all 7 target pages via ?editar deep links", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginViaUI(page, email, senha);

    // 1) Iniciativas
    await page.goto(`/iniciativas?editar=${ids.iniciativaId}`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("dialog").filter({ hasText: "Editar Iniciativa" }),
    ).toBeVisible({ timeout: 15_000 });
    await expectQueryStringCleared(page);

    // 2) Indicadores
    await page.goto(`/indicadores?editar=${ids.indicadorId}`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("dialog").filter({ hasText: "Editar Indicador" }),
    ).toBeVisible({ timeout: 15_000 });
    await expectQueryStringCleared(page);

    // 3) OKRs (objetivo)
    await page.goto(`/okrs?editar=${ids.objetivoId}`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("dialog").filter({ hasText: "Editar Objetivo" }),
    ).toBeVisible({ timeout: 15_000 });
    await expectQueryStringCleared(page);

    // 4) OKRs (KR variant: editar=KRID&tipo=kr&objetivoId=OBJID)
    await page.goto(
      `/okrs?editar=${ids.krId}&tipo=kr&objetivoId=${ids.objetivoId}`,
      { waitUntil: "networkidle" },
    );
    await expect(page.getByRole("dialog").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId(`input-edit-metrica-${ids.krId}`),
    ).toBeVisible({ timeout: 15_000 });
    await expectQueryStringCleared(page);

    // 5) Riscos
    await page.goto(`/riscos?editar=${ids.riscoId}`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("dialog").filter({ hasText: "Editar Risco" }),
    ).toBeVisible({ timeout: 15_000 });
    await expectQueryStringCleared(page);

    // 6) Oportunidades de Crescimento
    await page.goto(
      `/oportunidades-crescimento?editar=${ids.oportunidadeId}`,
      { waitUntil: "networkidle" },
    );
    await expect(page.getByTestId("dialog-oportunidade")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("dialog-oportunidade")).toContainText(
      "Editar Oportunidade",
    );
    await expectQueryStringCleared(page);

    // 7) Estratégias
    await page.goto(`/estrategias?editar=${ids.estrategiaId}`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("dialog").filter({ hasText: "Editar Estratégia" }),
    ).toBeVisible({ timeout: 15_000 });
    await expectQueryStringCleared(page);

    await ctx.close();
  });
});

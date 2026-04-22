// Task #276 — valida ponta-a-ponta a nova ordem da Jornada Estratégica
// (Apostas → Execução): Estratégias → Frentes → Objetivos → Iniciativas →
// Indicadores → Acompanhamento. Cobre:
//
//  1. Backend gate de /api/ai/gerar-iniciativas (modo MATRIZ): retorna 400
//     com a mensagem "ao menos um Objetivo (Meta)" enquanto não houver
//     objetivos cadastrados, e DEIXA DE retornar esse 400 assim que existe
//     pelo menos um objetivo (a chamada à IA pode falhar com a chave dummy
//     de testes; o que importa para a regra é o gate ANTES da IA).
//  2. Botão "Gerar com IA" em /iniciativas: começa desabilitado quando não
//     existe nenhum Objetivo e habilita após criar um.
//  3. O cartão de progresso da Jornada (renderizado pelo Guia Estratégico
//     no AssistantSidebar) lista as etapas exatamente na nova ordem e
//     marca como concluídas as etapas seedadas, na ordem certa.
import { test, expect, Page, APIRequestContext } from "@playwright/test";
import pg from "pg";
const { Client } = pg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL must be set to run this E2E test");

const random = () => Math.random().toString(36).slice(2, 10);

// Ordem canônica da nova jornada (espelha useJornadaProgresso.ts).
const ORDEM_ETAPAS = [
  "perfil",
  "diagnostico",
  "bmc",
  "pestel",
  "cinco-forcas",
  "swot",
  "estrategias",
  "oportunidades",
  "okrs",
  "iniciativas",
  "indicadores",
  "acompanhamento",
] as const;

async function registerAndActivate(req: APIRequestContext) {
  const email = `jornada-${random()}-${Date.now()}@example.com`;
  const senha = "Senha1234";
  const reg = await req.post("/api/auth/register", {
    data: {
      nome: "Teste Jornada Nova Ordem",
      email,
      senha,
      nomeEmpresa: `Empresa Jornada ${random()}`,
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

async function postJson<T>(req: APIRequestContext, url: string, body: unknown): Promise<T> {
  const r = await req.post(url, { data: body });
  if (!r.ok()) throw new Error(`POST ${url} falhou: ${r.status()} ${await r.text()}`);
  return (await r.json()) as T;
}

async function patchJson<T>(req: APIRequestContext, url: string, body: unknown): Promise<T> {
  const r = await req.patch(url, { data: body });
  if (!r.ok()) throw new Error(`PATCH ${url} falhou: ${r.status()} ${await r.text()}`);
  return (await r.json()) as T;
}

async function getMe(req: APIRequestContext) {
  const r = await req.get("/api/auth/me");
  expect(r.ok()).toBeTruthy();
  return (await r.json()) as { usuario: { id: string; empresaId: string } };
}

async function completarPerfilEstendido(req: APIRequestContext) {
  // Preenche os campos extras exigidos pelo `perfilEstendidoCompleto` em
  // useJornadaProgresso para empresas criadas após 18/04/2026.
  await patchJson(req, "/api/empresa", {
    descricao: "Empresa criada para teste E2E da nova jornada.",
    cnpj: "12.345.678/0001-99",
    endereco: "Rua dos Testes, 100",
    cidade: "São Paulo",
    estado: "SP",
    cep: "01000-000",
    nomeResponsavel: "Responsável Teste",
    emailResponsavel: `resp-${random()}@example.com`,
    telefoneResponsavel: "+55 11 99999-9999",
    termoAceitoEm: new Date().toISOString(),
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
    /* best-effort */
  } finally {
    await client.end();
  }
}

test.describe("Jornada Estratégica — nova ordem (#276)", () => {
  test("backend: /api/ai/gerar-iniciativas (matriz) bloqueia sem Objetivo e libera após criar um", async ({
    playwright,
  }) => {
    const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5000";
    const req = await playwright.request.newContext({ baseURL });
    const { email, senha } = await registerAndActivate(req);
    try {
      await loginViaApi(req, email, senha);
      const me = await getMe(req);
      const userId = me.usuario.id;

      // Sem objetivos cadastrados: o endpoint deve retornar 400 com mensagem
      // específica ANTES de tentar acionar a IA.
      const r1 = await req.post("/api/ai/gerar-iniciativas", { data: {} });
      expect(r1.status()).toBe(400);
      const body1 = (await r1.json()) as { error?: string };
      expect(body1.error ?? "").toMatch(/ao menos um Objetivo/i);

      // Cria uma Estratégia + um Objetivo vinculado a ela. O Objetivo
      // sozinho já libera o gate de geração de iniciativas em matriz.
      const estrategia = await postJson<{ id: string }>(req, "/api/estrategias", {
        tipo: "FO",
        titulo: `Estratégia Teste ${random()}`,
        descricao: "Estratégia criada pelo E2E para validar a nova jornada.",
        prioridade: "alta",
        status: "planejada",
      });

      const objetivo = await postJson<{ id: string }>(req, "/api/objetivos", {
        titulo: "Objetivo Teste E2E",
        descricao: "Objetivo criado pelo E2E para liberar a geração de iniciativas.",
        prazo: "2026-Q4",
        perspectiva: "Financeira",
        estrategiaId: estrategia.id,
        responsavelId: userId,
      });
      expect(objetivo.id).toBeTruthy();

      // Agora o gate "precisa de Objetivo" não deve mais ser aplicado.
      // A chamada à IA pode retornar 5xx por falta de chave OpenAI real,
      // mas NÃO deve mais ser o 400 específico de "ao menos um Objetivo".
      const r2 = await req.post("/api/ai/gerar-iniciativas", { data: {} });
      if (r2.status() === 400) {
        const body2 = (await r2.json()) as { error?: string };
        expect(body2.error ?? "").not.toMatch(/ao menos um Objetivo/i);
      }
    } finally {
      await req.dispose();
      await cleanup(email);
    }
  });

  test("UI: botão 'Gerar com IA' em /iniciativas começa desabilitado e habilita ao criar um Objetivo", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const { email, senha } = await registerAndActivate(page.request);
    try {
      await loginViaUI(page, email, senha);

      // Cria uma Estratégia (necessária para que /api/objetivos aceite o
      // POST sem exigir jornada concluída).
      const estrategia = await page.evaluate(async () => {
        const r = await fetch("/api/estrategias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            tipo: "FO",
            titulo: `Estratégia UI ${Math.random().toString(36).slice(2, 8)}`,
            descricao: "Estratégia para teste de gate de Iniciativas.",
            prioridade: "alta",
            status: "planejada",
          }),
        });
        if (!r.ok) throw new Error(`POST /api/estrategias -> ${r.status} ${await r.text()}`);
        return (await r.json()) as { id: string };
      });
      expect(estrategia.id).toBeTruthy();

      // Sem Objetivos: botão deve estar desabilitado.
      await page.goto("/iniciativas", { waitUntil: "networkidle" });
      const btn = page.getByTestId("button-generate-ai");
      await expect(btn).toBeVisible({ timeout: 15_000 });
      await expect(btn).toBeDisabled();
      await expect(btn).toHaveAttribute(
        "title",
        /Crie ao menos um Objetivo/i,
      );

      // Cria um Objetivo via API e recarrega a página.
      await page.evaluate(async (estrategiaId) => {
        const r = await fetch("/api/objetivos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            titulo: "Objetivo UI Gate",
            descricao: "Liberando o gate do botão 'Gerar com IA'.",
            prazo: "2026-Q4",
            perspectiva: "Financeira",
            estrategiaId,
          }),
        });
        if (!r.ok) throw new Error(`POST /api/objetivos -> ${r.status} ${await r.text()}`);
        return r.json();
      }, estrategia.id);

      await page.goto("/iniciativas", { waitUntil: "networkidle" });
      const btn2 = page.getByTestId("button-generate-ai");
      await expect(btn2).toBeVisible({ timeout: 15_000 });
      await expect(btn2).toBeEnabled();
    } finally {
      await ctx.close();
      await cleanup(email);
    }
  });

  test("UI: cartão da Jornada lista etapas na nova ordem e marca progresso à medida que dados são seedados", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const { email, senha } = await registerAndActivate(page.request);
    try {
      // Completa o perfil estendido para destravar a etapa "perfil".
      const apiCtx = page.request;
      await loginViaApi(apiCtx, email, senha);
      await completarPerfilEstendido(apiCtx);
      const me = await getMe(apiCtx);
      const userId = me.usuario.id;

      // Seed completo da cascata estratégica nas dependências mínimas para
      // marcar cada etapa como concluida (espelha as regras do hook).
      // 3 indicadores de DIAGNÓSTICO inicial.
      for (let i = 0; i < 3; i++) {
        await postJson(apiCtx, "/api/indicadores", {
          perspectiva: "diagnostico",
          nome: `Diagnóstico ${i + 1}`,
          meta: "100",
          atual: "50",
          status: "amarelo",
          owner: "Time",
          responsavelId: userId,
        });
      }
      // 5 blocos do BMC.
      for (const bloco of [
        "proposta_valor",
        "segmentos_clientes",
        "canais",
        "fontes_receita",
        "atividades_principais",
      ]) {
        await postJson(apiCtx, "/api/modelo-negocio", {
          bloco,
          descricao: `Texto do bloco ${bloco}`,
        });
      }
      // 6 fatores PESTEL (1 de cada tipo).
      for (const tipo of ["politico", "economico", "social", "tecnologico", "ambiental", "legal"]) {
        await postJson(apiCtx, "/api/fatores-pestel", {
          tipo,
          descricao: `Fator ${tipo}`,
          impacto: "médio",
          evidencia: `Evidência para ${tipo}`,
        });
      }
      // 3 forças competitivas.
      for (const forca of ["rivalidade", "novos_entrantes", "substitutos"]) {
        await postJson(apiCtx, "/api/cinco-forcas", {
          forca,
          descricao: `Análise da força ${forca}`,
          intensidade: "média",
          impacto: "médio",
        });
      }
      // 4 itens de SWOT (1 por quadrante).
      for (const tipo of ["forca", "fraqueza", "oportunidade", "ameaca"]) {
        await postJson(apiCtx, "/api/analise-swot", {
          tipo,
          descricao: `Item SWOT ${tipo}`,
          impacto: "médio",
        });
      }
      // Estratégia → Frente → Objetivo → Iniciativa → Indicador BSC.
      const estrategia = await postJson<{ id: string }>(apiCtx, "/api/estrategias", {
        tipo: "FO",
        titulo: "Estratégia da Jornada",
        descricao: "Estratégia do teste de ordem.",
        prioridade: "alta",
        status: "planejada",
      });
      await postJson(apiCtx, "/api/oportunidades-crescimento", {
        tipo: "penetracao_mercado",
        titulo: "Frente da Jornada",
        descricao: "Frente do teste de ordem.",
        potencial: "alto",
        risco: "baixo",
        estrategiaId: estrategia.id,
      });
      const objetivo = await postJson<{ id: string }>(apiCtx, "/api/objetivos", {
        titulo: "Objetivo da Jornada",
        descricao: "Objetivo do teste de ordem.",
        prazo: "2026-Q4",
        perspectiva: "Financeira",
        estrategiaId: estrategia.id,
      });
      // OBSERVAÇÃO: o restante da cascata (Iniciativas → Indicadores BSC →
      // Acompanhamento) NÃO é seedado de propósito. O Guia Estratégico só é
      // renderizado enquanto a jornada está incompleta, então deixamos as 3
      // últimas etapas pendentes para conseguir inspecionar a ordem do guia.
      // Esperado: 9 etapas concluídas (perfil + diagnostico + bmc + pestel +
      // cinco-forcas + swot + estrategias + oportunidades + okrs) de 12.

      // page.request já está autenticado (mesmo contexto): vai direto pra Home.
      await page.goto("/", { waitUntil: "networkidle" });

      // Abre o Guia Estratégico no AssistantSidebar (o chip aparece no
      // canto da tela). O Guia renderiza um `guia-etapa-{id}` por etapa,
      // exatamente na ordem retornada pelo hook useJornadaProgresso.
      // O AssistantSidebar abre por padrão quando a Jornada está incompleta.
      // Se por algum motivo estiver fechado, clica no toggle para abri-lo.
      const primeiraEtapa = page.getByTestId(`guia-etapa-${ORDEM_ETAPAS[0]}`);
      if (!(await primeiraEtapa.isVisible().catch(() => false))) {
        const toggle = page.getByTestId("button-assistant-sidebar-toggle").first();
        if (await toggle.isVisible().catch(() => false)) {
          await toggle.click();
        }
      }
      await expect(primeiraEtapa).toBeVisible({ timeout: 15_000 });

      // Coleta o id (sufixo do data-testid) de cada etapa renderizada.
      const idsRenderizados = await page
        .locator("[data-testid^='guia-etapa-']")
        .evaluateAll((nodes) =>
          nodes.map((n) => (n.getAttribute("data-testid") || "").replace("guia-etapa-", "")),
        );

      // A ordem na DOM precisa ser exatamente a ordem canônica nova
      // (Estratégias antes de Frentes; Frentes antes de Metas; Metas antes
      // de Iniciativas; Iniciativas antes de Indicadores; Indicadores antes
      // de Acompanhamento).
      expect(idsRenderizados).toEqual([...ORDEM_ETAPAS]);

      // Espera o progresso refletir as 9 etapas seedadas (perfil →
      // okrs) de 12 totais. As 3 últimas (iniciativas/indicadores/
      // acompanhamento) ficaram intencionalmente pendentes.
      await expect
        .poll(
          async () =>
            (await page.getByTestId("text-progresso").innerText().catch(() => ""))
              .replace(/\s/g, ""),
          { timeout: 15_000 },
        )
        .toMatch(/9\/12/);
    } finally {
      await ctx.close();
      await cleanup(email);
    }
  });

  // Happy-path ponta-a-ponta: exercita os endpoints REAIS de IA na nova ordem
  // (Estratégia → Frente → IA Objetivos → IA Iniciativas) e abre as telas
  // /indicadores e /ritos para confirmar que renderizam após os artefatos
  // existirem. Usa a OPENAI_API_KEY do ambiente; pula automaticamente quando
  // a chave não está disponível ou parece dummy.
  test("happy-path: cria empresa, gera Objetivos e Iniciativas pela IA e abre Indicadores/Acompanhamento", async ({
    browser,
    playwright,
  }) => {
    const apiKey = process.env.OPENAI_API_KEY ?? "";
    test.skip(
      !apiKey || apiKey.startsWith("_DUMMY") || apiKey.length < 30,
      "OPENAI_API_KEY real é necessária para este teste happy-path",
    );
    test.setTimeout(180_000);

    const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5000";
    const req = await playwright.request.newContext({ baseURL });
    const { email, senha } = await registerAndActivate(req);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      // Sessão API + sessão UI separadas (cada contexto tem seu cookie jar).
      await loginViaApi(req, email, senha);
      await completarPerfilEstendido(req);

      // Estratégia + Frente: insumos mínimos para a IA gerar Objetivos.
      const estrategia = await postJson<{ id: string }>(req, "/api/estrategias", {
        tipo: "FO",
        titulo: "Expandir presença digital",
        descricao:
          "Aproveitar reputação local para conquistar clientes em canais online.",
        prioridade: "alta",
        status: "planejada",
      });
      await postJson(req, "/api/oportunidades-crescimento", {
        tipo: "penetracao_mercado",
        titulo: "Vender no marketplace nacional",
        descricao:
          "Listar nossos produtos em marketplaces para alcançar novos estados.",
        potencial: "alto",
        risco: "medio",
        estrategiaId: estrategia.id,
      });

      // 1) IA SUGERE Objetivos a partir de Estratégias/Frentes (Task #274).
      // Os endpoints /api/ai/gerar-* RETORNAM as sugestões — a persistência
      // fica a cargo do cliente (espelha o fluxo real do AIGenerationModal).
      const respObj = await req.post("/api/ai/gerar-objetivos", {
        data: {
          foco: ["Financeira"],
          quantidade: 1,
          fontesContexto: ["estrategias", "oportunidades"],
          estrategiaId: estrategia.id,
        },
        timeout: 90_000,
      });
      expect(
        respObj.ok(),
        `gerar-objetivos falhou: ${respObj.status()} ${await respObj.text()}`,
      ).toBeTruthy();
      const sugestoesObj = (await respObj.json()) as { objetivos: Array<{ titulo: string; descricao?: string; perspectiva?: string; prazo?: string }> };
      expect(Array.isArray(sugestoesObj.objetivos)).toBeTruthy();
      expect(sugestoesObj.objetivos.length).toBeGreaterThan(0);

      // Persiste a primeira sugestão em /api/objetivos.
      const sug = sugestoesObj.objetivos[0];
      await postJson(req, "/api/objetivos", {
        titulo: sug.titulo,
        descricao: sug.descricao ?? "Objetivo gerado pela IA no E2E.",
        prazo: sug.prazo || "2026-Q4",
        perspectiva: sug.perspectiva || "Financeira",
        estrategiaId: estrategia.id,
      });

      // 2) IA SUGERE Iniciativas a partir dos Objetivos recém-criados.
      const respIni = await req.post("/api/ai/gerar-iniciativas", {
        data: { quantidade: 1 },
        timeout: 90_000,
      });
      expect(
        respIni.ok(),
        `gerar-iniciativas falhou: ${respIni.status()} ${await respIni.text()}`,
      ).toBeTruthy();
      const sugestoesIni = (await respIni.json()) as {
        iniciativas: Array<{ titulo: string; descricao?: string; status?: string; prioridade?: string; prazo?: string; responsavel?: string; impacto?: string; objetivoOriginadorId?: string; estrategiaId?: string }>;
      };
      expect(Array.isArray(sugestoesIni.iniciativas)).toBeTruthy();
      expect(sugestoesIni.iniciativas.length).toBeGreaterThan(0);

      // Persiste a primeira sugestão em /api/iniciativas (mantém o vínculo
      // com Objetivo/Estratégia que a IA propôs).
      const sugIni = sugestoesIni.iniciativas[0];
      await postJson(req, "/api/iniciativas", {
        titulo: sugIni.titulo,
        descricao: sugIni.descricao ?? "Iniciativa gerada pela IA no E2E.",
        status: sugIni.status || "planejada",
        prioridade: sugIni.prioridade || "alta",
        prazo: sugIni.prazo || "2026-Q4",
        responsavel: sugIni.responsavel || "Time",
        impacto: sugIni.impacto || "alto",
        estrategiaId: sugIni.estrategiaId || estrategia.id,
        objetivoOriginadorId: sugIni.objetivoOriginadorId,
      });

      // 3) UI: faz login e visita as telas de Indicadores e Ritos para
      // confirmar que renderizam (são as duas últimas etapas da Jornada).
      await loginViaUI(page, email, senha);

      await page.goto("/indicadores", { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/indicadores$/);
      // Sanity: alguma marca-d'água da página de Indicadores deve aparecer.
      await expect(
        page.locator("h1, h2").filter({ hasText: /Indicadores|BSC/i }).first(),
      ).toBeVisible({ timeout: 15_000 });

      await page.goto("/ritos", { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/ritos$/);
      await expect(
        page
          .locator("h1, h2")
          .filter({ hasText: /Acompanhamento|Ritos|Cadência/i })
          .first(),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await req.dispose();
      await ctx.close();
      await cleanup(email);
    }
  });
});

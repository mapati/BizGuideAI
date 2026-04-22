// Task #300 — Cobertura automatizada da memória de longo prazo do Bizzy
// (Task #289). Valida:
//   1. gerarResumoCiclo para cada `tipo` (trimestre|objetivo|estrategia|iniciativa)
//   2. buildHistoricoContextoIA respeita o orçamento de 3200 chars e
//      preserva conquistas+atrasos+lições no corte duro
//   3. Hook de updateObjetivo({encerrado:true}) cria linha em
//      bizzy_resumos_ciclo via background job
//   4. Tools read-only `consultar_historico_estrategia` e
//      `consultar_resumo_ciclo` respeitam isolamento por empresa
import { test, expect } from "@playwright/test";
import { DbStorage } from "../../server/storage";
import { db } from "../../server/db";
import { empresas, bizzyResumosCiclo } from "../../shared/schema";
import { eq } from "drizzle-orm";
import {
  gerarResumoCiclo,
  buildHistoricoContextoIA,
  lerConteudoResumo,
} from "../../server/bizzy-resumos";
import { executarFerramentaReadonly } from "../../server/assistant-tools";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run this test");
}

const random = () => Math.random().toString(36).slice(2, 10);
const storage = new DbStorage();

async function novaEmpresa(): Promise<string> {
  const e = await storage.createEmpresa({
    nome: `Resumo Ciclo Test ${random()}`,
    setor: "Tecnologia",
    tamanho: "pequena",
  });
  return e.id;
}

async function dropEmpresa(id: string) {
  await db.delete(empresas).where(eq(empresas.id, id));
}

// Espera até `timeoutMs` por uma condição assíncrona (polling). Útil para
// background jobs disparados por hooks de storage (não bloqueantes).
async function esperarCondicao<T>(
  fn: () => Promise<T | null | undefined>,
  timeoutMs = 8000,
  intervalMs = 200,
): Promise<T> {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const r = await fn();
    if (r) return r;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error(`Condição não satisfeita em ${timeoutMs}ms`);
}

test.describe("bizzy-resumos: gerarResumoCiclo por tipo", () => {
  test("tipo=trimestre agrega iniciativas concluídas, OKRs encerrados e KPIs movidos", async () => {
    const empresaId = await novaEmpresa();
    try {
      // Trimestre alvo: 2026-Q2 (abr/mai/jun)
      const periodo = "2026-Q2";
      const dentro = new Date(Date.UTC(2026, 4, 15)); // 15-mai-2026

      const ind = await storage.createIndicador({
        empresaId,
        perspectiva: "Financeira",
        nome: "Receita",
        meta: "200",
        atual: "150",
        status: "amarelo",
        owner: "Time",
      });
      // Duas leituras dentro do trimestre — devem virar 1 KPI movido.
      await storage.createLeitura({
        indicadorId: ind.id,
        valor: "100",
        registradoEm: new Date(Date.UTC(2026, 3, 5)),
      } as never);
      await storage.createLeitura({
        indicadorId: ind.id,
        valor: "150",
        registradoEm: new Date(Date.UTC(2026, 5, 20)),
      } as never);

      const obj = await storage.createObjetivo({
        empresaId,
        titulo: "Crescer faturamento",
        prazo: "2026-Q2",
        perspectiva: "Financeira",
        encerrado: true,
      } as never);
      await storage.createResultadoChave(
        {
          objetivoId: obj.id,
          metrica: "MRR",
          valorInicial: "10",
          valorAlvo: "20",
          valorAtual: "20",
          owner: "CEO",
          prazo: "2026-Q2",
        } as never,
        empresaId,
      );

      // Iniciativa concluída dentro do período
      const ini = await storage.createIniciativa({
        empresaId,
        titulo: "Lançar landing",
        descricao: "x",
        status: "concluida",
        prioridade: "alta",
        prazo: "2026-Q2",
        responsavel: "Ana",
        impacto: "alto",
      } as never);
      // Marcar encerradaEm dentro do período
      await db
        .update((await import("../../shared/schema")).iniciativas)
        .set({ encerradaEm: dentro, notaEncerramento: "ok" })
        .where(eq((await import("../../shared/schema")).iniciativas.id, ini.id));

      const resumo = await gerarResumoCiclo({
        empresaId,
        tipo: "trimestre",
        periodo,
        geradoPor: "test",
      });

      expect(resumo.tipo).toBe("trimestre");
      expect(resumo.periodo).toBe(periodo);
      expect(resumo.versao).toBe(1);
      const c = lerConteudoResumo(resumo);
      expect(c.iniciativasConcluidas.map((i) => i.id)).toContain(ini.id);
      expect(c.okrsEncerrados.map((o) => o.id)).toContain(obj.id);
      expect(c.kpisMovidos.map((k) => k.id)).toContain(ind.id);
      expect(c.conquistas.join(" ")).toMatch(/Lançar landing|Crescer faturamento/);

      // Re-resumir o mesmo (empresa,tipo,referencia=null,periodo) ⇒ versão 2.
      const resumoV2 = await gerarResumoCiclo({
        empresaId,
        tipo: "trimestre",
        periodo,
        geradoPor: "test",
      });
      expect(resumoV2.versao).toBe(2);
    } finally {
      await dropEmpresa(empresaId);
    }
  });

  test("tipo=objetivo deriva conquistas/atrasos dos KRs e retrospectivas", async () => {
    const empresaId = await novaEmpresa();
    try {
      const obj = await storage.createObjetivo({
        empresaId,
        titulo: "Reter clientes",
        prazo: "2026-Q1",
        perspectiva: "Clientes",
        encerrado: true,
      } as never);
      await storage.createResultadoChave(
        {
          objetivoId: obj.id,
          metrica: "Churn",
          valorInicial: "10",
          valorAlvo: "5",
          valorAtual: "5",
          owner: "CSM",
          prazo: "2026-Q1",
        } as never,
        empresaId,
      );
      await storage.createResultadoChave(
        {
          objetivoId: obj.id,
          metrica: "NPS",
          valorInicial: "30",
          valorAlvo: "60",
          valorAtual: "35",
          owner: "CSM",
          prazo: "2026-Q1",
          confiancaAtual: "vermelho",
        } as never,
        empresaId,
      );
      await storage.createRetrospectiva({
        empresaId,
        objetivoId: obj.id,
        conquistas: "Time alinhado",
        falhas: "Faltou capacidade",
        aprendizados: "Investir em onboarding",
        ajustes: "Revisar squads",
      } as never);
      // O hook de createRetrospectiva também gera um resumo em background;
      // aqui chamamos manualmente a versão "objetivo" para teste determinístico.
      const resumo = await gerarResumoCiclo({
        empresaId,
        tipo: "objetivo",
        referenciaId: obj.id,
        geradoPor: "test",
      });

      const c = lerConteudoResumo(resumo);
      expect(resumo.tipo).toBe("objetivo");
      expect(c.okrsEncerrados.map((o) => o.id)).toContain(obj.id);
      // KR Churn atingido (100%) e KR NPS abaixo (≈17%) + vermelho ⇒ atrasos
      expect(c.conquistas.some((s) => /Churn/.test(s))).toBe(true);
      expect(c.atrasos.some((s) => /NPS/.test(s))).toBe(true);
      expect(c.licoes.some((s) => /onboarding/.test(s))).toBe(true);
    } finally {
      await dropEmpresa(empresaId);
    }
  });

  test("tipo=estrategia agrega iniciativas e OKRs vinculados", async () => {
    const empresaId = await novaEmpresa();
    try {
      const est = await storage.createEstrategia({
        empresaId,
        tipo: "ofensiva",
        titulo: "Expansão Sudeste",
        descricao: "Abrir SP/RJ",
        prioridade: "alta",
      } as never);
      await storage.createIniciativa({
        empresaId,
        titulo: "Contratar BDR SP",
        descricao: "x",
        status: "concluida",
        prioridade: "alta",
        prazo: "2026-Q2",
        responsavel: "RH",
        impacto: "alto",
        estrategiaId: est.id,
      } as never);
      const obj = await storage.createObjetivo({
        empresaId,
        titulo: "Pipeline SP",
        prazo: "2026-Q2",
        perspectiva: "Clientes",
        encerrado: true,
        estrategiaId: est.id,
      } as never);
      await storage.createResultadoChave(
        {
          objetivoId: obj.id,
          metrica: "Leads SP",
          valorInicial: "0",
          valorAlvo: "100",
          valorAtual: "100",
          owner: "GTM",
          prazo: "2026-Q2",
        } as never,
        empresaId,
      );

      const resumo = await gerarResumoCiclo({
        empresaId,
        tipo: "estrategia",
        referenciaId: est.id,
        geradoPor: "test",
      });
      const c = lerConteudoResumo(resumo);
      expect(resumo.tipo).toBe("estrategia");
      expect(c.conquistas.some((s) => /Contratar BDR SP/.test(s))).toBe(true);
      expect(c.conquistas.some((s) => /Pipeline SP/.test(s))).toBe(true);
    } finally {
      await dropEmpresa(empresaId);
    }
  });

  test("tipo=iniciativa preserva nota de encerramento e status", async () => {
    const empresaId = await novaEmpresa();
    try {
      const ini = await storage.createIniciativa({
        empresaId,
        titulo: "Migrar billing",
        descricao: "x",
        status: "cancelada",
        prioridade: "media",
        prazo: "2026-Q1",
        responsavel: "Eng",
        impacto: "medio",
        notaEncerramento: "Substituído por iniciativa Y",
      } as never);
      const resumo = await gerarResumoCiclo({
        empresaId,
        tipo: "iniciativa",
        referenciaId: ini.id,
        geradoPor: "test",
      });
      const c = lerConteudoResumo(resumo);
      expect(resumo.tipo).toBe("iniciativa");
      expect(c.atrasos.some((s) => /Migrar billing/.test(s))).toBe(true);
      expect(c.iniciativasArquivadas.map((i) => i.id)).toContain(ini.id);
      expect(c.licoes.some((s) => /Substituído/.test(s))).toBe(true);
    } finally {
      await dropEmpresa(empresaId);
    }
  });
});

test.describe("buildHistoricoContextoIA: orçamento de 3200 chars", () => {
  const MAX = 3200;

  test("conteúdo curto cabe no modo completo (≤3200 chars)", async () => {
    const empresaId = await novaEmpresa();
    try {
      for (let i = 0; i < 3; i++) {
        await storage.createResumoCiclo({
          empresaId,
          tipo: "trimestre",
          referenciaId: null,
          periodo: `2026-Q${i + 1}`,
          versao: 1,
          imutavel: true,
          geradoPor: "test",
          conteudo: {
            resumoCurto: `Resumo curto ${i}`,
            conquistas: [`C${i}`],
            atrasos: [`A${i}`],
            licoes: [`L${i}`],
            decisoes: [{ titulo: `D${i}`, escolha: "X" }],
            kpisMovidos: [{ id: "k", nome: "K", de: "1", para: "2", statusFinal: "verde" }],
            iniciativasConcluidas: [],
            iniciativasArquivadas: [],
            okrsEncerrados: [],
            retrospectivasIds: [],
          },
        } as never);
      }
      const out = await buildHistoricoContextoIA(empresaId);
      expect(out.length).toBeLessThanOrEqual(MAX);
      // Modo completo inclui Decisões/KPIs.
      expect(out).toMatch(/Decisões:/);
      expect(out).toMatch(/KPIs:/);
      expect(out).toMatch(/Conquistas:/);
    } finally {
      await dropEmpresa(empresaId);
    }
  });

  test("estoura completo mas cabe essencial: descarta decisões/kpis e mantém pilares", async () => {
    const empresaId = await novaEmpresa();
    try {
      // Decisões e KPIs longos para inflar o "completo"; pilares pequenos.
      const decisoesGrandes = Array.from({ length: 4 }, (_, k) => ({
        titulo: "Decisão " + "x".repeat(140) + k,
        escolha: "Escolha " + "y".repeat(140),
      }));
      const kpisGrandes = Array.from({ length: 4 }, (_, k) => ({
        id: `id${k}`,
        nome: "KPI " + "k".repeat(120),
        de: "1",
        para: "2",
        statusFinal: "verde",
      }));
      const okrsGrandes = Array.from({ length: 4 }, (_, k) => ({
        id: `o${k}`,
        titulo: "Objetivo " + "o".repeat(120),
        pctMedio: 80,
      }));
      for (let i = 0; i < 3; i++) {
        await storage.createResumoCiclo({
          empresaId,
          tipo: "trimestre",
          referenciaId: null,
          periodo: `2026-Q${i + 1}`,
          versao: 1,
          imutavel: true,
          geradoPor: "test",
          conteudo: {
            resumoCurto: "curto",
            conquistas: [`Conquista ${i}`],
            atrasos: [`Atraso ${i}`],
            licoes: [`Lição ${i}`],
            decisoes: decisoesGrandes,
            kpisMovidos: kpisGrandes,
            iniciativasConcluidas: [],
            iniciativasArquivadas: [],
            okrsEncerrados: okrsGrandes,
            retrospectivasIds: [],
          },
        } as never);
      }
      const out = await buildHistoricoContextoIA(empresaId);
      expect(out.length).toBeLessThanOrEqual(MAX);
      // Modo essencial não inclui Decisões/KPIs/Objetivos encerrados.
      expect(out).not.toMatch(/Decisões:/);
      expect(out).not.toMatch(/KPIs:/);
      expect(out).not.toMatch(/Objetivos encerrados:/);
      // Pilares preservados:
      for (let i = 0; i < 3; i++) {
        expect(out).toContain(`Conquista ${i}`);
        expect(out).toContain(`Atraso ${i}`);
        expect(out).toContain(`Lição ${i}`);
      }
    } finally {
      await dropEmpresa(empresaId);
    }
  });

  test("estoura até essencial: aplica corte duro com aviso e respeita 3200 chars", async () => {
    const empresaId = await novaEmpresa();
    try {
      const grandes = Array.from({ length: 5 }, (_, k) => "X".repeat(800) + k);
      for (let i = 0; i < 3; i++) {
        await storage.createResumoCiclo({
          empresaId,
          tipo: "trimestre",
          referenciaId: null,
          periodo: `2026-Q${i + 1}`,
          versao: 1,
          imutavel: true,
          geradoPor: "test",
          conteudo: {
            resumoCurto: "curto",
            conquistas: grandes,
            atrasos: grandes,
            licoes: grandes,
            decisoes: [],
            kpisMovidos: [],
            iniciativasConcluidas: [],
            iniciativasArquivadas: [],
            okrsEncerrados: [],
            retrospectivasIds: [],
          },
        } as never);
      }
      const out = await buildHistoricoContextoIA(empresaId);
      expect(out.length).toBeLessThanOrEqual(MAX);
      expect(out).toMatch(/histórico truncado/);
      // Sob o corte duro o helper preserva o início de "essencial", que
      // já vem priorizando os pilares (conquistas → atrasos → lições) e
      // descartando decisões/KPIs/iniciativas. Garantimos aqui que o
      // primeiro pilar (Conquistas) e seu conteúdo real chegaram à saída
      // — ou seja, os pilares não foram sacrificados antes do corte.
      expect(out).toMatch(/Conquistas:/);
      expect(out).toMatch(/X{200,}/);
      // Nenhum dos rótulos "Decisões/KPIs/Objetivos encerrados" pode ter
      // sobrado: o modo essencial os descarta antes do corte duro.
      expect(out).not.toMatch(/Decisões:/);
      expect(out).not.toMatch(/KPIs:/);
      expect(out).not.toMatch(/Objetivos encerrados:/);
    } finally {
      await dropEmpresa(empresaId);
    }
  });
});

test.describe("Hook de encerramento de objetivo dispara resumo (background)", () => {
  test("updateObjetivo({encerrado:true}) eventualmente cria linha em bizzy_resumos_ciclo", async () => {
    const empresaId = await novaEmpresa();
    try {
      const obj = await storage.createObjetivo({
        empresaId,
        titulo: "Hook test",
        prazo: "2026-Q2",
        perspectiva: "Financeira",
        encerrado: false,
      } as never);
      await storage.createResultadoChave(
        {
          objetivoId: obj.id,
          metrica: "M",
          valorInicial: "0",
          valorAlvo: "10",
          valorAtual: "10",
          owner: "Time",
          prazo: "2026-Q2",
        } as never,
        empresaId,
      );

      await storage.updateObjetivo(obj.id, empresaId, { encerrado: true } as never);

      const row = await esperarCondicao(async () => {
        const linhas = await storage.listResumosCicloByEmpresa(empresaId, 5);
        return linhas.find(
          (r) => r.tipo === "objetivo" && r.referenciaId === obj.id && r.geradoPor === "hook_objetivo_encerrado",
        );
      });

      expect(row).toBeTruthy();
      const c = lerConteudoResumo(row);
      expect(c.okrsEncerrados.map((o) => o.id)).toContain(obj.id);
    } finally {
      await dropEmpresa(empresaId);
    }
  });
});

test.describe("Tools read-only: isolamento por empresa", () => {
  test("consultar_historico_estrategia e consultar_resumo_ciclo respeitam empresaId", async () => {
    const empresaA = await novaEmpresa();
    const empresaB = await novaEmpresa();
    try {
      const resumoA = await storage.createResumoCiclo({
        empresaId: empresaA,
        tipo: "trimestre",
        referenciaId: null,
        periodo: "2026-Q1",
        versao: 1,
        imutavel: true,
        geradoPor: "test",
        conteudo: {
          resumoCurto: "Resumo da empresa A",
          conquistas: ["A-conquista"],
          atrasos: [],
          licoes: [],
          decisoes: [],
          kpisMovidos: [],
          iniciativasConcluidas: [],
          iniciativasArquivadas: [],
          okrsEncerrados: [],
          retrospectivasIds: [],
        },
      } as never);

      // listagem para empresa A: vê seu resumo
      const listA = await executarFerramentaReadonly(
        "consultar_historico_estrategia",
        {},
        { empresaId: empresaA },
      );
      expect(listA.ok).toBe(true);
      if (listA.ok) {
        const ids = (listA.dados.resumos as Array<{ id: string }>).map((r) => r.id);
        expect(ids).toContain(resumoA.id);
      }

      // listagem para empresa B: NÃO vê o resumo da A
      const listB = await executarFerramentaReadonly(
        "consultar_historico_estrategia",
        {},
        { empresaId: empresaB },
      );
      expect(listB.ok).toBe(true);
      if (listB.ok) {
        const ids = (listB.dados.resumos as Array<{ id: string }>).map((r) => r.id);
        expect(ids).not.toContain(resumoA.id);
        expect(listB.dados.total).toBe(0);
      }

      // consultar resumo específico de A com contexto B: erro de não encontrado
      const detalheCruzado = await executarFerramentaReadonly(
        "consultar_resumo_ciclo",
        { resumoId: resumoA.id },
        { empresaId: empresaB },
      );
      expect(detalheCruzado.ok).toBe(false);
      if (!detalheCruzado.ok) {
        expect(detalheCruzado.mensagem).toMatch(/não encontrado/i);
      }

      // consultar resumo específico de A com contexto A: ok
      const detalheOk = await executarFerramentaReadonly(
        "consultar_resumo_ciclo",
        { resumoId: resumoA.id },
        { empresaId: empresaA },
      );
      expect(detalheOk.ok).toBe(true);
      if (detalheOk.ok) {
        expect(detalheOk.dados.id).toBe(resumoA.id);
      }
    } finally {
      // FK CASCADE em bizzy_resumos_ciclo.empresaId garante limpeza dos resumos.
      await dropEmpresa(empresaA);
      await dropEmpresa(empresaB);
      // Defesa em profundidade: se algo escapou.
      await db.delete(bizzyResumosCiclo).where(eq(bizzyResumosCiclo.empresaId, empresaA));
      await db.delete(bizzyResumosCiclo).where(eq(bizzyResumosCiclo.empresaId, empresaB));
    }
  });
});

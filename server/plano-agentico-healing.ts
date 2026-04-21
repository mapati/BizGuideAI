import cron from "node-cron";
import { storage } from "./storage";
import type { PlanoAgentico, PlanoAgenticoPasso, AssistenteAcaoLog } from "@shared/schema";

// Task #194 — Self-healing automático de planos agênticos travados.
// Detecta planos em estados inconsistentes (estrutura quebrada, passos órfãos
// presos em "em_andamento", planos abandonados) e aplica correções leves para
// destravar o loop sem precisar intervenção manual.

export type HealingAcao =
  | { tipo: "cancelar_plano_estrutural"; planoId: string; gap: string }
  | { tipo: "cancelar_plano_inativo"; planoId: string; diasInativo: number }
  | { tipo: "concluir_passo_orfão"; passoId: string; planoId: string; propostaId: string }
  | { tipo: "rollback_passo"; passoId: string; planoId: string; propostaId: string; statusProposta: string };

export interface HealingExecucaoResumo {
  executadoEm: Date;
  duracaoMs: number;
  planosVarridos: number;
  acoesAplicadas: number;
  porCategoria: {
    cancelar_plano_estrutural: number;
    cancelar_plano_inativo: number;
    concluir_passo_orfão: number;
    rollback_passo: number;
  };
  erros: string[];
}

const MAX_LOGS = 50;
const STALE_PROPOSAL_MIN = 5;
const STALE_PLAN_DAYS = 30;

const execLogs: HealingExecucaoResumo[] = [];
let activeTask: ReturnType<typeof cron.schedule> | null = null;
let rodando = false;

function categoriaInicial(): HealingExecucaoResumo["porCategoria"] {
  return {
    cancelar_plano_estrutural: 0,
    cancelar_plano_inativo: 0,
    concluir_passo_orfão: 0,
    rollback_passo: 0,
  };
}

// Pure: dado o plano + passos + propostas vinculadas, decide as ações.
// Sem efeito colateral — facilita teste e leitura.
export function detectarAcoes(input: {
  agora: Date;
  plano: PlanoAgentico;
  passos: PlanoAgenticoPasso[];
  propostasPorId: Map<string, AssistenteAcaoLog>;
}): HealingAcao[] {
  const { agora, plano, passos, propostasPorId } = input;
  const acoes: HealingAcao[] = [];

  // 1) Estrutura inconsistente: contagem de passos persistidos diverge do total declarado.
  if (passos.length !== plano.totalPassos) {
    acoes.push({
      tipo: "cancelar_plano_estrutural",
      planoId: plano.id,
      gap: `passos persistidos=${passos.length} vs totalPassos=${plano.totalPassos}`,
    });
    return acoes; // não mexe em mais nada deste plano; vai ser cancelado.
  }

  // 2) Plano abandonado há > 30 dias.
  const refTs = (plano.atualizadoEm ?? plano.criadoEm).getTime();
  const diasInativo = Math.floor((agora.getTime() - refTs) / (1000 * 60 * 60 * 24));
  if (diasInativo > STALE_PLAN_DAYS) {
    acoes.push({ tipo: "cancelar_plano_inativo", planoId: plano.id, diasInativo });
    return acoes;
  }

  // 3) Passo "em_andamento" cuja proposta vinculada já foi resolvida há > 5 min.
  for (const passo of passos) {
    if (passo.status !== "em_andamento" || !passo.propostaId) continue;
    const proposta = propostasPorId.get(passo.propostaId);
    if (!proposta) continue;
    if (proposta.status === "proposta") continue; // ainda pendente, ok.
    const resolvidoEm = proposta.resolvidoEm ?? proposta.criadoEm;
    const idadeMin = (agora.getTime() - resolvidoEm.getTime()) / (1000 * 60);
    if (idadeMin < STALE_PROPOSAL_MIN) continue;

    if (proposta.status === "confirmada") {
      acoes.push({
        tipo: "concluir_passo_orfão",
        passoId: passo.id,
        planoId: plano.id,
        propostaId: proposta.id,
      });
    } else if (
      proposta.status === "ignorada" ||
      proposta.status === "ajustada" ||
      proposta.status === "falhou"
    ) {
      acoes.push({
        tipo: "rollback_passo",
        passoId: passo.id,
        planoId: plano.id,
        propostaId: proposta.id,
        statusProposta: proposta.status,
      });
    }
  }

  return acoes;
}

async function aplicarAcao(acao: HealingAcao): Promise<void> {
  switch (acao.tipo) {
    case "cancelar_plano_estrutural": {
      await storage.updatePlanoAgentico(acao.planoId, {
        status: "cancelado",
        finalizadoEm: new Date(),
      });
      console.warn("[PLANO-AGENTICO]", {
        acao: "self_heal_cancelar_estrutural",
        planoId: acao.planoId,
        motivo: "inconsistencia_estrutural",
        gap: acao.gap,
      });
      return;
    }
    case "cancelar_plano_inativo": {
      await storage.updatePlanoAgentico(acao.planoId, {
        status: "cancelado",
        finalizadoEm: new Date(),
      });
      console.warn("[PLANO-AGENTICO]", {
        acao: "self_heal_cancelar_inativo",
        planoId: acao.planoId,
        motivo: "inativo_30d",
        diasInativo: acao.diasInativo,
      });
      return;
    }
    case "concluir_passo_orfão": {
      await storage.updatePlanoAgenticoPasso(acao.passoId, {
        status: "concluido",
        resolvidoEm: new Date(),
        resultadoResumo: "[recuperação automática] proposta confirmada sem callback",
      });
      console.warn("[PLANO-AGENTICO]", {
        acao: "self_heal_concluir_passo_orfao",
        planoId: acao.planoId,
        passoId: acao.passoId,
        propostaId: acao.propostaId,
      });
      return;
    }
    case "rollback_passo": {
      await storage.updatePlanoAgenticoPasso(acao.passoId, {
        status: "pendente",
        propostaId: null,
        resolvidoEm: null,
      });
      console.warn("[PLANO-AGENTICO]", {
        acao: "self_heal_rollback_passo",
        planoId: acao.planoId,
        passoId: acao.passoId,
        propostaId: acao.propostaId,
        statusProposta: acao.statusProposta,
      });
      return;
    }
  }
}

export async function runPlanoAgenticoHealing(): Promise<HealingExecucaoResumo> {
  if (rodando) {
    return {
      executadoEm: new Date(),
      duracaoMs: 0,
      planosVarridos: 0,
      acoesAplicadas: 0,
      porCategoria: categoriaInicial(),
      erros: ["execucao_anterior_em_andamento"],
    };
  }
  rodando = true;
  const inicio = Date.now();
  const executadoEm = new Date();
  const porCategoria = categoriaInicial();
  const erros: string[] = [];
  let planosVarridos = 0;
  let acoesAplicadas = 0;

  try {
    const empresas = await storage.getAllEmpresas();
    if (!empresas || empresas.length === 0) {
      const resumo: HealingExecucaoResumo = {
        executadoEm,
        duracaoMs: Date.now() - inicio,
        planosVarridos: 0,
        acoesAplicadas: 0,
        porCategoria,
        erros,
      };
      registrarLog(resumo);
      return resumo;
    }

    for (const empresa of empresas) {
      let planosAtivos: PlanoAgentico[] = [];
      try {
        planosAtivos = await storage.listPlanosAgenticosByEmpresa(empresa.id, { status: "ativo", limite: 200 });
      } catch (err) {
        erros.push(`empresa ${empresa.id}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      for (const plano of planosAtivos) {
        planosVarridos += 1;
        try {
          const passos = await storage.listPassosByPlano(plano.id);
          const propostaIds = passos.map((p) => p.propostaId).filter((x): x is string => !!x);
          const propostasPorId = new Map<string, AssistenteAcaoLog>();
          if (propostaIds.length > 0) {
            const propostas = await storage.listPropostasByIds(propostaIds);
            for (const p of propostas) propostasPorId.set(p.id, p);
          }
          const acoes = detectarAcoes({ agora: new Date(), plano, passos, propostasPorId });
          for (const acao of acoes) {
            await aplicarAcao(acao);
            acoesAplicadas += 1;
            porCategoria[acao.tipo] += 1;
          }
        } catch (err) {
          erros.push(`plano ${plano.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    const resumo: HealingExecucaoResumo = {
      executadoEm,
      duracaoMs: Date.now() - inicio,
      planosVarridos,
      acoesAplicadas,
      porCategoria,
      erros,
    };
    registrarLog(resumo);
    console.info("[PLANO-AGENTICO]", {
      acao: "self_heal_run",
      planosVarridos,
      acoesAplicadas,
      porCategoria,
      duracaoMs: resumo.duracaoMs,
      erros: erros.length,
    });
    return resumo;
  } finally {
    rodando = false;
  }
}

function registrarLog(resumo: HealingExecucaoResumo): void {
  execLogs.unshift(resumo);
  if (execLogs.length > MAX_LOGS) execLogs.length = MAX_LOGS;
}

export function getHealingLogs(): HealingExecucaoResumo[] {
  return [...execLogs];
}

export function startPlanoAgenticoHealingScheduler(): void {
  if (activeTask) return;
  activeTask = cron.schedule("*/15 * * * *", async () => {
    try {
      await runPlanoAgenticoHealing();
    } catch (err) {
      console.error("[PLANO-AGENTICO] Falha no scheduler de healing:", err);
    }
  });
  console.log("[PLANO-AGENTICO] Self-healing scheduler iniciado (*/15 * * * *).");
}

export function stopPlanoAgenticoHealingScheduler(): void {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
  }
}

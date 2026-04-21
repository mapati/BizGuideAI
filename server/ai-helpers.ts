// Helpers de IA compartilhados entre routes.ts e os motores de geração
// (ex.: briefing-engine.ts). Existe para evitar dependência circular entre
// `routes.ts` e os módulos de geração que precisam do mesmo cliente OpenAI,
// da mesma resolução de modelo por plano e do mesmo contexto da empresa.

import OpenAI from "openai";
import { storage } from "./storage";
import type { Empresa } from "@shared/schema";

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/* ── Modelos de IA — carregados do banco na inicialização, atualizados ao vivo via PATCH /api/admin/config-ia ── */
export const AI_MODELS: Record<string, string> = {
  start_padrao:      "",
  start_relatorios:  "",
  start_busca:       "",
  pro_padrao:        "",
  pro_relatorios:    "",
  pro_busca:         "",
};

export async function loadModelConfig(): Promise<void> {
  const cfg = await storage.getConfiguracoesIA();
  AI_MODELS.start_padrao      = cfg.modeloPadraoStart;
  AI_MODELS.start_relatorios  = cfg.modeloRelatoriosStart;
  AI_MODELS.start_busca       = cfg.modeloBuscaStart;
  AI_MODELS.pro_padrao        = cfg.modeloPadraoProEnt;
  AI_MODELS.pro_relatorios    = cfg.modeloRelatoriosProEnt;
  AI_MODELS.pro_busca         = cfg.modeloBuscaProEnt;
}

export function getModelForPlan(planoTipo: string | null | undefined, tier: "padrao" | "relatorios" | "busca"): string {
  const isPro = planoTipo === "pro" || planoTipo === "enterprise";
  const prefix = isPro ? "pro" : "start";
  const raw = AI_MODELS[`${prefix}_${tier}`] || AI_MODELS["start_padrao"] || "";
  if (tier === "busca") {
    if (raw === "gpt-4o-search-preview") return "gpt-4o";
    if (raw === "gpt-4o-mini-search-preview") return isPro ? "gpt-4o" : "gpt-4o-mini";
  }
  return raw;
}

export function buildEmpresaContextoIA(empresa: Empresa, options?: { includeDocument?: boolean }): string {
  const includeDocument = options?.includeDocument ?? true;
  const linhas: string[] = [];
  linhas.push(`Empresa: ${empresa.nome}`);
  linhas.push(`Setor: ${empresa.setor}`);
  if (empresa.tamanho) linhas.push(`Tamanho: ${empresa.tamanho}`);
  if (empresa.descricao) linhas.push(`Descrição: ${empresa.descricao}`);
  if (empresa.modeloNegocio) linhas.push(`Modelo de negócio: ${empresa.modeloNegocio}`);
  if (empresa.areaAtuacao) linhas.push(`Área de atuação geográfica: ${empresa.areaAtuacao}`);
  if (empresa.publicoAlvo) linhas.push(`Público-alvo / cliente ideal: ${empresa.publicoAlvo}`);
  if (empresa.principaisProdutos) linhas.push(`Principais produtos/serviços: ${empresa.principaisProdutos}`);
  if (empresa.concorrentesConhecidos) linhas.push(`Concorrentes conhecidos: ${empresa.concorrentesConhecidos}`);
  if (empresa.diferenciaisCompetitivos) linhas.push(`Diferenciais competitivos: ${empresa.diferenciaisCompetitivos}`);
  if (empresa.anoFundacao) linhas.push(`Ano de fundação: ${empresa.anoFundacao}`);
  if (empresa.cidade || empresa.estado) linhas.push(`Localização: ${[empresa.cidade, empresa.estado].filter(Boolean).join(", ")}`);
  if (includeDocument && empresa.documentoInterpretacao) {
    linhas.push(`\n━━━ DOCUMENTO ESTRATÉGICO DA EMPRESA ━━━`);
    linhas.push(empresa.documentoInterpretacao);
  }
  return linhas.join("\n");
}

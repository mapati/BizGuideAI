// Helpers de IA compartilhados entre routes.ts e os motores de geração
// (ex.: briefing-engine.ts). Existe para evitar dependência circular entre
// `routes.ts` e os módulos de geração que precisam do mesmo cliente OpenAI,
// da mesma resolução de modelo por plano e do mesmo contexto da empresa.

import OpenAI from "openai";
import { storage } from "./storage";
import type { Empresa, AssistenteAcaoLog } from "@shared/schema";

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

/**
 * Busca as ações recentes do assistente (últimos N dias) e devolve um bloco
 * de texto pronto para injetar no contexto da IA. Permite que o agente
 * "lembre" do que já foi proposto/confirmado/ignorado e evite repetir
 * sugestões já tratadas.
 */
export async function buildAcoesRecentesContextoIA(
  empresaId: string,
  opts: { sinceDays?: number; limite?: number } = {}
): Promise<string> {
  const sinceDays = opts.sinceDays ?? 7;
  const limite = opts.limite ?? 30;
  const desde = Date.now() - sinceDays * 24 * 60 * 60 * 1000;

  const todas = await storage.listPropostasByEmpresa(empresaId, 80);
  const recentes = todas
    .filter((l) => new Date(l.criadoEm).getTime() >= desde)
    .slice(0, limite);

  if (recentes.length === 0) return "";

  const fmtStatus: Record<string, string> = {
    proposta: "PENDENTE (aguardando confirmação do usuário)",
    confirmada: "JÁ EXECUTADA",
    ajustada: "AJUSTADA pelo usuário e executada",
    ignorada: "IGNORADA pelo usuário",
    falhou: "FALHOU na execução",
  };

  const linhas = recentes.map((l) => {
    const preview = (l.preview ?? {}) as { titulo?: string; descricao?: string };
    const titulo = preview.titulo ?? l.ferramenta;
    const data = new Date(l.criadoEm).toISOString().slice(0, 10);
    const statusTxt = fmtStatus[l.status] ?? l.status;
    const entidade = l.entidadeId ? ` → ${l.entidadeTipo ?? "entidade"}#${l.entidadeId}` : "";
    return `- [${data}] ${l.ferramenta}: "${titulo}" — ${statusTxt}${entidade}`;
  });

  return `## AÇÕES RECENTES DO ASSISTENTE (últimos ${sinceDays} dias)
${linhas.join("\n")}

REGRA DE MEMÓRIA:
- Não proponha de novo ações JÁ EXECUTADAS ou AJUSTADAS — elas já estão feitas.
- Não ressuscite ações IGNORADAS recentemente, a menos que o usuário peça explicitamente.
- Se uma ação está PENDENTE, lembre o usuário para confirmá-la em vez de propor outra equivalente.
- Se o usuário disser que algo já foi feito (ex.: "já resolvi o KPI X", "concluí a iniciativa Y"), use as ferramentas de atualização (atualizar_iniciativa com status "concluida"/"pausada", atualizar_valor_indicador, atualizar_progresso_kr) para refletir isso no sistema.`;
}

/** Versão sem dependência de fetch para ser injetada quando os logs já foram carregados. */
export function formatAcoesRecentesContextoIA(
  logs: AssistenteAcaoLog[],
  sinceDays: number = 7,
): string {
  if (logs.length === 0) return "";
  const fmtStatus: Record<string, string> = {
    proposta: "PENDENTE (aguardando confirmação do usuário)",
    confirmada: "JÁ EXECUTADA",
    ajustada: "AJUSTADA pelo usuário e executada",
    ignorada: "IGNORADA pelo usuário",
    falhou: "FALHOU na execução",
  };
  const linhas = logs.map((l) => {
    const preview = (l.preview ?? {}) as { titulo?: string; descricao?: string };
    const titulo = preview.titulo ?? l.ferramenta;
    const data = new Date(l.criadoEm).toISOString().slice(0, 10);
    const statusTxt = fmtStatus[l.status] ?? l.status;
    const entidade = l.entidadeId ? ` → ${l.entidadeTipo ?? "entidade"}#${l.entidadeId}` : "";
    return `- [${data}] ${l.ferramenta}: "${titulo}" — ${statusTxt}${entidade}`;
  });
  return `## AÇÕES RECENTES DO ASSISTENTE (últimos ${sinceDays} dias)
${linhas.join("\n")}`;
}

// Task #188 — Registro central de tools do Assistente Estratégico (HITL).
// Task #189 — Adicionado loop agêntico (criar/concluir/cancelar plano) +
// vínculo opcional `planoId`/`passoOrdem` em todas as tools executoras.
// Cada tool tem (1) JSON Schema para a OpenAI, (2) validação Zod dos parâmetros,
// (3) preview() que descreve a ação para o humano e (4) apply() que executa via storage.

import { z } from "zod/v4";
import { storage, PlanoAtivoJaExisteError } from "./storage";
import type { PropostaPreview, ConteudoPauta } from "@shared/schema";
import { tipoRitoEnum } from "@shared/schema";
import {
  getKpiTendencia,
  getRelacoesIndicador,
  projetarValorKr,
  contarAtualizacoesKr,
  comparePeriodos,
  carregarKrsDaEmpresa,
  montarConteudoPauta,
  type EscopoComparacao,
  type PeriodoIso,
} from "./plan-insights";
import { openai, getModelForPlan } from "./ai-helpers";
import { gerarResumoCiclo, lerConteudoResumo } from "./bizzy-resumos";

// ---------- Tipos públicos ----------
export type ToolName =
  | "criar_iniciativa"
  | "atualizar_iniciativa"
  | "encerrar_iniciativa"
  | "vincular_iniciativa_a_kpi"
  | "dividir_iniciativa"
  | "criar_okr"
  | "atualizar_okr"
  | "adicionar_kr_a_okr"
  | "atualizar_kr"
  | "atualizar_progresso_kr"
  | "registrar_checkin_kr"
  | "revisar_qualidade_kr"
  | "vincular_kr_a_indicador"
  | "criar_indicador"
  | "atualizar_valor_indicador"
  | "criar_risco"
  | "atualizar_risco"
  | "registrar_mitigacao"
  | "criar_item_swot"
  | "atualizar_item_swot"
  | "arquivar_item_swot"
  | "criar_fator_pestel"
  | "atualizar_fator_pestel"
  | "arquivar_fator_pestel"
  | "atualizar_intensidade_forca"
  | "adicionar_evidencia_forca"
  | "criar_oportunidade"
  | "atualizar_oportunidade"
  | "arquivar_oportunidade"
  | "navegar_para"
  | "abrir_entidade"
  | "criar_plano_agentico"
  | "concluir_plano_agentico"
  | "cancelar_plano_agentico"
  | "registrar_fato_manualmente"
  | "esquecer_fato"
  | "gerar_pauta_reuniao"
  | "registrar_ata"
  | "registrar_decisao"
  | "agendar_revisao"
  // Task #287 — Modelo & Estratégia
  | "criar_estrategia"
  | "atualizar_estrategia"
  | "arquivar_estrategia"
  | "criar_bloco_bmc"
  | "atualizar_bloco_bmc"
  | "arquivar_bloco_bmc"
  | "criar_relacao_bsc"
  | "atualizar_relacao_bsc"
  | "remover_relacao_bsc"
  | "criar_cenario"
  | "atualizar_cenario"
  | "arquivar_cenario"
  // Task #288 — Ciclo de Aprendizado
  | "registrar_retrospectiva"
  | "arquivar_objetivo"
  | "repriorizar_iniciativas"
  | "repriorizar_estrategias"
  | "proposta_em_lote"
  // Task #289 — Memória de longo prazo
  | "gerar_resumo_ciclo_manual";

export interface ToolApplyContext {
  empresaId: string;
  usuarioId?: string | null;
}

export type EntidadeTipo =
  | "iniciativa"
  | "objetivo"
  | "resultado_chave"
  | "indicador"
  | "kpi_leitura"
  | "navegacao"
  | "risco"
  | "oportunidade_crescimento"
  | "estrategia"
  | "swot"
  | "fator_pestel"
  | "cinco_forcas"
  | "reuniao_pauta"
  | "reuniao_ata"
  | "decisao_estrategica"
  | "revisao_agendada"
  // Task #287 — Modelo & Estratégia
  | "modelo_negocio"
  | "cenario"
  | "bsc_relacao"
  // Task #289 — Memória de longo prazo
  | "resumo_ciclo";

export interface ToolApplyResult {
  resumo: string;
  dados?: Record<string, unknown>;
  rota?: string;
  entidadeTipo?: EntidadeTipo;
  entidadeId?: string;
}

export interface ToolDefinition<TParams> {
  name: ToolName;
  description: string;
  paramsSchema: z.ZodType<TParams>;
  jsonSchema: Record<string, unknown>;
  preview: (params: TParams) => PropostaPreview;
  apply: (params: TParams, ctx: ToolApplyContext) => Promise<ToolApplyResult>;
  // Rota de formulário tradicional para o fluxo "Ajustar" (HITL).
  // O usuário é levado a essa rota com os params atuais para edição manual.
  formRota: string;
  // Task #284 — rótulo curto exibido no chip de status durante o streaming
  // ("Criando iniciativa…", "Atualizando KR…"). Opcional; quando ausente
  // a rota usa um fallback genérico.
  statusLabel?: string;
  // Task #284 — enriquecimento async opcional do preview para incluir
  // `valorAnterior` em campos atualizados (diff antes→depois).
  enrichPreview?: (
    preview: PropostaPreview,
    params: TParams,
    ctx: { empresaId: string; usuarioId?: string | null },
  ) => Promise<PropostaPreview>;
}

// ---------- Helpers ----------
const ROTAS_VALIDAS = [
  "/iniciativas", "/okrs", "/estrategias", "/riscos", "/indicadores",
  "/oportunidades-crescimento", "/meu-painel", "/dashboard", "/swot",
  "/pestel", "/cinco-forcas", "/bmc", "/ritos", "/ritos/gestao", "/bsc", "/mapa-bsc",
  "/cenarios", "/alertas", "/diagnostico", "/rastreabilidade",
] as const;

// Vocabulário canônico do produto (mantido em sincronia com client/src/pages/*).
// IMPORTANTE: OKRs e Indicadores usam vocabulários distintos no produto — manter espelhado.
const PRIORIDADES = ["alta", "média", "baixa"] as const;
const STATUS_INICIATIVA = ["planejada", "em_andamento", "concluida", "pausada"] as const;
// OKRs (client/src/pages/OKRs.tsx): perspectivas do mapa estratégico clássico.
const PERSPECTIVAS_OKR = [
  "Financeira",
  "Clientes",
  "Processos Internos",
  "Aprendizado e Crescimento",
] as const;
// Indicadores (client/src/pages/Indicadores.tsx): rótulos curtos exibidos na grade.
const PERSPECTIVAS_INDICADOR = ["Finanças", "Clientes", "Processos", "Pessoas"] as const;

function strField(label: string, valor: string | undefined | null) {
  if (!valor || !String(valor).trim()) return null;
  return { label, valor: String(valor) };
}

// Task #284 — helper compartilhado pelos `enrichPreview` das update tools.
// Recebe um campo do preview e o "estado anterior" (raw + flag numeric).
// Retorna o campo possivelmente decorado com `valorAnterior` apenas quando o
// valor mudou. Trata vazio→preenchido como mudança ("(vazio)") e normaliza
// valores numéricos para evitar diff falso-positivo (ex.: "1.00" vs "1").
function applyDiff(
  campo: { label: string; valor: string },
  anterior: { raw: string | null | undefined; numeric?: boolean } | undefined,
): { label: string; valor: string; valorAnterior?: string } | null {
  if (!anterior) return campo;
  const ant = anterior.raw;
  const novo = campo.valor;
  if (ant === undefined) return campo;
  if (anterior.numeric) {
    const a = ant != null ? Number(ant) : NaN;
    const b = Number(novo);
    if (!Number.isNaN(a) && !Number.isNaN(b) && a === b) return null;
  } else if (ant === novo) {
    return null;
  }
  return { ...campo, valorAnterior: ant && String(ant).trim() ? String(ant) : "(vazio)" };
}

// Task #266/#268 — `prazoData` (YYYY-MM-DD) é a forma normalizada do prazo,
// que alimenta o pipeline de "atrasado" usado pela UI/dashboard. A IA deve
// preenchê-la sempre que o usuário disser uma data explícita
// (ex.: "até 31/12/2025"); `prazo` continua aceitando texto livre como
// "Q4 2025" para retrocompatibilidade. Helpers ficam aqui no topo para
// poderem ser reutilizados pelos schemas de iniciativa e OKR.
const PRAZO_DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const prazoDataOpt = z
  .string()
  .regex(PRAZO_DATA_REGEX, "prazoData deve ser YYYY-MM-DD")
  .optional();
const prazoDataOptNullable = z
  .string()
  .regex(PRAZO_DATA_REGEX, "prazoData deve ser YYYY-MM-DD")
  .nullable()
  .optional();

// ── Task #333 — Detecção determinística de iniciativas duplicadas ─────
// Usado no `apply` de criar_iniciativa e na pré-validação de
// registrarProposta. Normaliza acentos/case/pontuação, tokeniza, remove
// stopwords PT-BR e calcula max(jaccard, containment). Limiar 0.6 prefere
// "alarme falso" (que vira pedido de desambiguação ao usuário) a perder
// duplicata real. Sem libs externas — implementação local intencional.
const STOPWORDS_PT = new Set([
  "a","o","as","os","de","da","do","das","dos","e","em","no","na","nos","nas",
  "para","por","com","sem","ao","aos","à","às","um","uma","uns","umas","que",
  "se","ou","como","já","ja","mais","menos","muito","muita","muitos","muitas",
  "essa","esse","essas","esses","esta","este","estas","estes","isso","isto",
  "mas","então","entao","sobre","quando","onde","qual","quais","sua","seu",
  "suas","seus","nosso","nossa","nossos","nossas","ser","ter","fazer",
]);

function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizarTitulo(s: string): string[] {
  return normalizarTexto(s)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS_PT.has(t));
}

function similaridadeTitulos(a: string, b: string): number {
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = tokenizarTitulo(a);
  const tb = tokenizarTitulo(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let inter = 0;
  sa.forEach((t) => { if (sb.has(t)) inter++; });
  const uniSet = new Set<string>();
  sa.forEach((t) => uniSet.add(t));
  sb.forEach((t) => uniSet.add(t));
  const jaccard = inter / uniSet.size;
  const containment = inter / Math.min(sa.size, sb.size);
  return Math.max(jaccard, containment);
}

const SIMILARIDADE_LIMITE_PADRAO = 0.6;

// ── Task #335 — Helpers genéricos de detecção de duplicatas ────────────
// `buscarSimilares` reaproveita `similaridadeTitulos` para qualquer
// entidade que tenha um campo de título/nome. Cada wrapper específico
// (iniciativas, OKRs, KRs, indicadores, riscos, oportunidades, SWOT,
// PESTEL) carrega sua lista, filtra itens terminais/arquivados e
// delega aqui. Mantém a estratégia da Task #333 (jaccard ∪ containment,
// limiar 0.6) para preferir alarme falso → desambiguação.
export interface EntidadeSimilarMatch {
  id: string;
  titulo: string;
  contexto?: string; // ex.: "status=identificado" ou "perspectiva=Financeira"
  similaridade: number;
}

interface CandidatoBruto {
  id: string;
  titulo: string;
  contexto?: string;
}

export function buscarSimilares(
  novoTitulo: string,
  candidatos: CandidatoBruto[],
  opts: { limite?: number; threshold?: number } = {},
): EntidadeSimilarMatch[] {
  const limite = opts.limite ?? 3;
  const threshold = opts.threshold ?? SIMILARIDADE_LIMITE_PADRAO;
  const matches: EntidadeSimilarMatch[] = [];
  for (const c of candidatos) {
    const sim = similaridadeTitulos(novoTitulo, c.titulo);
    if (sim >= threshold) {
      matches.push({ id: c.id, titulo: c.titulo, contexto: c.contexto, similaridade: sim });
    }
  }
  matches.sort((x, y) => y.similaridade - x.similaridade);
  return matches.slice(0, limite);
}

export class EntidadeDuplicadaError extends Error {
  constructor(
    public entidadeRotulo: string,
    public candidatos: EntidadeSimilarMatch[],
  ) {
    const lista = candidatos
      .map((c) => `• "${c.titulo}" (id=${c.id}${c.contexto ? `, ${c.contexto}` : ""})`)
      .join("\n");
    super(
      `Já existe ${entidadeRotulo} parecido(a) nesta empresa. Em vez de criar um(a) novo(a), atualize/arquive um dos existentes ou pergunte ao usuário qual ele quis dizer:\n${lista}`,
    );
    this.name = "EntidadeDuplicadaError";
  }
}

// ── Iniciativas (Task #333) ────────────────────────────────────────────
export interface IniciativaSimilarMatch {
  id: string;
  titulo: string;
  status: string;
  similaridade: number;
}

/**
 * Retorna até 3 iniciativas ATIVAS (não concluida/cancelada) da mesma
 * empresa cujo título tem similaridade ≥ limite com o novo título.
 * Mantida com tipo próprio por compatibilidade com chamadas existentes.
 */
export async function buscarIniciativasSimilares(
  empresaId: string,
  novoTitulo: string,
  opts: { limite?: number } = {},
): Promise<IniciativaSimilarMatch[]> {
  // Status terminais a ignorar: cobre formas canônicas + variantes legadas
  // com acento ("concluída") e formas históricas ("encerrada", "arquivada").
  const STATUS_TERMINAIS = new Set([
    "concluida", "concluída", "cancelada", "encerrada", "arquivada",
  ]);
  try {
    const todas = await storage.getIniciativas(empresaId);
    const ativas = todas.filter((i) => !STATUS_TERMINAIS.has(i.status));
    const matches = buscarSimilares(
      novoTitulo,
      ativas.map((i) => ({ id: i.id, titulo: i.titulo, contexto: `status=${i.status}` })),
      opts,
    );
    return matches.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      status: m.contexto?.replace(/^status=/, "") ?? "",
      similaridade: m.similaridade,
    }));
  } catch {
    return [];
  }
}

export class IniciativaDuplicadaError extends Error {
  constructor(public candidatos: IniciativaSimilarMatch[]) {
    const lista = candidatos
      .map((c) => `• "${c.titulo}" (id=${c.id}, status=${c.status})`)
      .join("\n");
    super(
      `Já existe iniciativa parecida nesta empresa. Em vez de criar uma nova, atualize/encerre uma das existentes ou pergunte ao usuário qual ele quis dizer:\n${lista}`,
    );
    this.name = "IniciativaDuplicadaError";
  }
}

// ── OKRs / Objetivos ───────────────────────────────────────────────────
export async function buscarObjetivosSimilares(
  empresaId: string,
  novoTitulo: string,
): Promise<EntidadeSimilarMatch[]> {
  try {
    const objetivos = await storage.getObjetivos(empresaId);
    const ativos = objetivos.filter((o) => !o.encerrado);
    return buscarSimilares(
      novoTitulo,
      ativos.map((o) => ({
        id: o.id,
        titulo: o.titulo,
        contexto: `perspectiva=${o.perspectiva}`,
      })),
    );
  } catch { return []; }
}

// ── KRs (escopo: dentro do MESMO objetivo) ─────────────────────────────
export async function buscarKrsSimilares(
  empresaId: string,
  objetivoId: string,
  novaMetrica: string,
): Promise<EntidadeSimilarMatch[]> {
  try {
    const krs = await storage.getResultadosChave(objetivoId, empresaId);
    return buscarSimilares(
      novaMetrica,
      krs.map((k) => ({
        id: k.id,
        titulo: k.metrica,
        contexto: `alvo=${k.valorAlvo}`,
      })),
    );
  } catch { return []; }
}

// ── Indicadores (KPIs) ─────────────────────────────────────────────────
export async function buscarIndicadoresSimilares(
  empresaId: string,
  novoNome: string,
): Promise<EntidadeSimilarMatch[]> {
  try {
    const lista = await storage.getIndicadores(empresaId);
    return buscarSimilares(
      novoNome,
      lista.map((i) => ({
        id: i.id,
        titulo: i.nome,
        contexto: `perspectiva=${i.perspectiva}`,
      })),
    );
  } catch { return []; }
}

// ── Riscos (ignora terminais: eliminado/mitigado) ──────────────────────
export async function buscarRiscosSimilares(
  empresaId: string,
  novaDescricao: string,
): Promise<EntidadeSimilarMatch[]> {
  const STATUS_TERMINAIS = new Set(["eliminado", "mitigado"]);
  try {
    const lista = await storage.getRiscos(empresaId);
    const ativos = lista.filter((r) => !STATUS_TERMINAIS.has(r.status));
    return buscarSimilares(
      novaDescricao,
      ativos.map((r) => ({
        id: r.id,
        titulo: r.descricao,
        contexto: `categoria=${r.categoria}, status=${r.status}`,
      })),
    );
  } catch { return []; }
}

// ── Oportunidades de crescimento (ignora arquivadas) ───────────────────
export async function buscarOportunidadesSimilares(
  empresaId: string,
  novoTitulo: string,
): Promise<EntidadeSimilarMatch[]> {
  try {
    const lista = await storage.getOportunidadesCrescimento(empresaId);
    const ativas = lista.filter((o) => (o as { status?: string }).status !== "arquivado");
    return buscarSimilares(
      novoTitulo,
      ativas.map((o) => ({
        id: o.id,
        titulo: o.titulo,
        contexto: `tipo=${o.tipo}`,
      })),
    );
  } catch { return []; }
}

// ── Itens SWOT (escopo: mesmo quadrante; ignora arquivados) ────────────
export async function buscarItensSwotSimilares(
  empresaId: string,
  tipo: string,
  novaDescricao: string,
): Promise<EntidadeSimilarMatch[]> {
  try {
    const lista = await storage.getAnaliseSwot(empresaId);
    const ativos = lista.filter(
      (s) => s.tipo === tipo && (s as { status?: string }).status !== "arquivado",
    );
    return buscarSimilares(
      novaDescricao,
      ativos.map((s) => ({
        id: s.id,
        titulo: s.descricao,
        contexto: `quadrante=${s.tipo}`,
      })),
    );
  } catch { return []; }
}

// ── Fatores PESTEL (escopo: mesma dimensão; ignora arquivados) ─────────
export async function buscarFatoresPestelSimilares(
  empresaId: string,
  tipo: string,
  novaDescricao: string,
): Promise<EntidadeSimilarMatch[]> {
  try {
    const lista = await storage.getFatoresPestel(empresaId);
    const ativos = lista.filter(
      (f) => f.tipo === tipo && (f as { status?: string }).status !== "arquivado",
    );
    return buscarSimilares(
      novaDescricao,
      ativos.map((f) => ({
        id: f.id,
        titulo: f.descricao,
        contexto: `dimensao=${f.tipo}`,
      })),
    );
  } catch { return []; }
}

// ── Roteador: descobre duplicatas para uma tool de criação ─────────────
// Usado tanto pela pré-validação em `registrarProposta` quanto pela
// defesa em profundidade dentro dos `apply()`. Retorna `null` quando
// não há duplicata (ou a tool não está coberta).
interface DuplicidadeInfo {
  entidadeRotulo: string;
  tituloNovo: string;
  candidatos: EntidadeSimilarMatch[];
}

export async function detectarDuplicidade(
  toolName: string,
  data: unknown,
  empresaId: string,
): Promise<DuplicidadeInfo | null> {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  let entidadeRotulo = "";
  let tituloNovo = "";
  let candidatos: EntidadeSimilarMatch[] = [];
  switch (toolName) {
    case "criar_iniciativa": {
      tituloNovo = String(d.titulo ?? "");
      entidadeRotulo = "iniciativa";
      const matches = await buscarIniciativasSimilares(empresaId, tituloNovo);
      candidatos = matches.map((m) => ({
        id: m.id,
        titulo: m.titulo,
        contexto: `status=${m.status}`,
        similaridade: m.similaridade,
      }));
      break;
    }
    case "criar_okr":
      tituloNovo = String(d.objetivoTitulo ?? "");
      entidadeRotulo = "OKR (objetivo)";
      candidatos = await buscarObjetivosSimilares(empresaId, tituloNovo);
      break;
    case "adicionar_kr_a_okr": {
      tituloNovo = String(d.metrica ?? "");
      entidadeRotulo = "meta (KR) neste OKR";
      const objetivoId = String(d.objetivoId ?? "");
      if (!objetivoId) return null;
      candidatos = await buscarKrsSimilares(empresaId, objetivoId, tituloNovo);
      break;
    }
    case "criar_indicador":
      tituloNovo = String(d.nome ?? "");
      entidadeRotulo = "indicador (KPI)";
      candidatos = await buscarIndicadoresSimilares(empresaId, tituloNovo);
      break;
    case "criar_risco":
      tituloNovo = String(d.descricao ?? "");
      entidadeRotulo = "risco";
      candidatos = await buscarRiscosSimilares(empresaId, tituloNovo);
      break;
    case "criar_oportunidade":
      tituloNovo = String(d.titulo ?? "");
      entidadeRotulo = "oportunidade de crescimento";
      candidatos = await buscarOportunidadesSimilares(empresaId, tituloNovo);
      break;
    case "criar_item_swot": {
      tituloNovo = String(d.descricao ?? "");
      const tipo = String(d.tipo ?? "");
      entidadeRotulo = `item SWOT (${tipo})`;
      if (!tipo) return null;
      candidatos = await buscarItensSwotSimilares(empresaId, tipo, tituloNovo);
      break;
    }
    case "criar_fator_pestel": {
      tituloNovo = String(d.descricao ?? "");
      const tipo = String(d.tipo ?? "");
      entidadeRotulo = `fator PESTEL (${tipo})`;
      if (!tipo) return null;
      candidatos = await buscarFatoresPestelSimilares(empresaId, tipo, tituloNovo);
      break;
    }
    default:
      return null;
  }
  if (!tituloNovo || candidatos.length === 0) return null;
  return { entidadeRotulo, tituloNovo, candidatos };
}

function mensagemDuplicidade(info: DuplicidadeInfo): string {
  const lista = info.candidatos
    .map((c) => `• "${c.titulo}" (id=${c.id}${c.contexto ? `, ${c.contexto}` : ""})`)
    .join("\n");
  return `Já existe ${info.entidadeRotulo} parecido(a) nesta empresa — não criei "${String(info.tituloNovo).slice(0, 80)}" para evitar duplicidade. Candidatos:\n${lista}\nProponha atualizar/arquivar um deles ou pergunte ao usuário qual ele quis dizer.`;
}

// ── Pré-validação de FKs (Task #342) ───────────────────────────────────
// Bloqueia a emissão do PropostaCard quando o LLM passa um id de FK que
// não existe na empresa (ex.: inventou um slug "kpi_..." em vez do UUID
// do CATÁLOGO). Sem isto, o erro só aparece no `apply` — depois que o
// usuário já clicou "Confirmar" — e a proposta falha com 500.
//
// Estratégia: para cada tool de update coberta, faz um lookup do id na
// empresa atual; se falhar, devolve mensagem com candidatos por nome
// (mesma similaridade usada para duplicatas) para o LLM se autocorrigir
// no próximo turno.
type FkSpec = {
  campo: string;
  rotulo: string;
  // Valida o id; retorna { ok: true } se existe na empresa, { ok: false }
  // caso contrário. Best-effort — qualquer exceção do storage deixa
  // passar e cai no apply (defesa em profundidade).
  validar: (id: string, empresaId: string) => Promise<boolean>;
  // Procura candidatos por nome para sugerir ao LLM. Recebe o valor que
  // o LLM passou (que pode ser slug, nome parcial, etc.). Retorna até 5.
  candidatosPorNome: (
    valor: string,
    empresaId: string,
  ) => Promise<EntidadeSimilarMatch[]>;
};

const FK_SPECS_POR_TOOL: Partial<Record<ToolName, FkSpec[]>> = {
  atualizar_valor_indicador: [{
    campo: "indicadorId",
    rotulo: "indicador (KPI)",
    validar: async (id, empresaId) => {
      try {
        const ind = await storage.getIndicador(id);
        return !!ind && ind.empresaId === empresaId;
      } catch { return false; }
    },
    candidatosPorNome: (valor, empresaId) =>
      buscarIndicadoresSimilares(empresaId, normalizarValorFkParaBusca(valor)),
  }],
  atualizar_iniciativa: [{
    campo: "id",
    rotulo: "iniciativa",
    validar: async (id, empresaId) => {
      try {
        const ini = await storage.getIniciativa(id);
        return !!ini && ini.empresaId === empresaId;
      } catch { return false; }
    },
    candidatosPorNome: (valor, empresaId) =>
      buscarIniciativasSimilares(empresaId, normalizarValorFkParaBusca(valor))
        .then((ms) => ms.map((m) => ({
          id: m.id, titulo: m.titulo, contexto: `status=${m.status}`, similaridade: m.similaridade,
        }))),
  }],
  encerrar_iniciativa: [{
    campo: "id",
    rotulo: "iniciativa",
    validar: async (id, empresaId) => {
      try {
        const ini = await storage.getIniciativa(id);
        return !!ini && ini.empresaId === empresaId;
      } catch { return false; }
    },
    candidatosPorNome: (valor, empresaId) =>
      buscarIniciativasSimilares(empresaId, normalizarValorFkParaBusca(valor))
        .then((ms) => ms.map((m) => ({
          id: m.id, titulo: m.titulo, contexto: `status=${m.status}`, similaridade: m.similaridade,
        }))),
  }],
  atualizar_okr: [{
    campo: "objetivoId",
    rotulo: "OKR (objetivo)",
    validar: async (id, empresaId) => {
      try {
        const objetivos = await storage.getObjetivos(empresaId);
        return objetivos.some((o) => o.id === id);
      } catch { return false; }
    },
    candidatosPorNome: (valor, empresaId) =>
      buscarObjetivosSimilares(empresaId, normalizarValorFkParaBusca(valor)),
  }],
  adicionar_kr_a_okr: [{
    campo: "objetivoId",
    rotulo: "OKR (objetivo)",
    validar: async (id, empresaId) => {
      try {
        const objetivos = await storage.getObjetivos(empresaId);
        return objetivos.some((o) => o.id === id);
      } catch { return false; }
    },
    candidatosPorNome: (valor, empresaId) =>
      buscarObjetivosSimilares(empresaId, normalizarValorFkParaBusca(valor)),
  }],
  atualizar_kr: [{
    campo: "resultadoChaveId",
    rotulo: "meta (KR)",
    validar: async (id, empresaId) => {
      try {
        const kr = await storage.getResultadoChaveById(id, empresaId);
        return !!kr;
      } catch { return false; }
    },
    candidatosPorNome: async () => [], // KR está aninhado em OKR; sem objetivoId não dá pra sugerir bem
  }],
  atualizar_progresso_kr: [{
    campo: "resultadoChaveId",
    rotulo: "meta (KR)",
    validar: async (id, empresaId) => {
      try {
        const kr = await storage.getResultadoChaveById(id, empresaId);
        return !!kr;
      } catch { return false; }
    },
    candidatosPorNome: async () => [],
  }],
  registrar_checkin_kr: [{
    campo: "resultadoChaveId",
    rotulo: "meta (KR)",
    validar: async (id, empresaId) => {
      try {
        const kr = await storage.getResultadoChaveById(id, empresaId);
        return !!kr;
      } catch { return false; }
    },
    candidatosPorNome: async () => [],
  }],
  vincular_iniciativa_a_kpi: [
    {
      campo: "iniciativaId",
      rotulo: "iniciativa",
      validar: async (id, empresaId) => {
        try {
          const ini = await storage.getIniciativa(id);
          return !!ini && ini.empresaId === empresaId;
        } catch { return false; }
      },
      candidatosPorNome: (valor, empresaId) =>
        buscarIniciativasSimilares(empresaId, normalizarValorFkParaBusca(valor))
          .then((ms) => ms.map((m) => ({
            id: m.id, titulo: m.titulo, contexto: `status=${m.status}`, similaridade: m.similaridade,
          }))),
    },
    {
      campo: "indicadorId",
      rotulo: "indicador (KPI)",
      validar: async (id, empresaId) => {
        try {
          const ind = await storage.getIndicador(id);
          return !!ind && ind.empresaId === empresaId;
        } catch { return false; }
      },
      candidatosPorNome: (valor, empresaId) =>
        buscarIndicadoresSimilares(empresaId, normalizarValorFkParaBusca(valor)),
    },
  ],
};

// Normaliza valor que veio como id para usar como query de busca por
// nome. Slugs no formato "kpi_uso_sistemas_digitais_integrados" viram
// "uso sistemas digitais integrados".
function normalizarValorFkParaBusca(valor: string): string {
  return valor
    .replace(/^(kpi|okr|kr|iniciativa|risco|oportunidade)[_-]/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export async function validarFkExistentes(
  toolName: string,
  data: unknown,
  empresaId: string,
): Promise<{ mensagem: string } | null> {
  const specs = FK_SPECS_POR_TOOL[toolName as ToolName];
  if (!specs || !data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  for (const spec of specs) {
    const raw = d[spec.campo];
    if (typeof raw !== "string" || raw.length === 0) continue;
    const ok = await spec.validar(raw, empresaId);
    if (ok) continue;
    const candidatos = await spec.candidatosPorNome(raw, empresaId);
    const lista = candidatos.length > 0
      ? candidatos
        .map((c) => `• "${c.titulo}" (id=${c.id}${c.contexto ? `, ${c.contexto}` : ""})`)
        .join("\n")
      : "(nenhum candidato parecido encontrado nesta empresa)";
    const mensagem =
      `O ${spec.rotulo} com ${spec.campo}="${String(raw).slice(0, 80)}" não existe nesta empresa. ` +
      `Use sempre o id REAL do CATÁLOGO (formato UUID, ex.: "12345678-..."), nunca um slug ou nome. ` +
      `Candidatos parecidos:\n${lista}\n` +
      `Reemita a tool com o id correto ou pergunte ao usuário qual ele quis dizer.`;
    return { mensagem };
  }
  return null;
}

// ---------- 1. criar_iniciativa ----------
const criarIniciativaSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(3).max(1000),
  prioridade: z.enum(PRIORIDADES).default("média"),
  prazo: z.string().min(4).max(32), // YYYY-MM-DD ou texto livre
  // Task #268 — prazo calendarizado opcional, espelha o picker de prazo
  // da UI de Iniciativas e alimenta o cálculo de atraso.
  prazoData: prazoDataOpt,
  status: z.enum(STATUS_INICIATIVA).default("planejada"),
  responsavel: z.string().max(120).default(""),
  impacto: z.string().max(500).default(""),
  estrategiaId: z.string().optional(),
  // Task #208 — Indicador (KPI) que esta iniciativa busca melhorar.
  indicadorFonteId: z.string().optional(),
});
type CriarIniciativaParams = z.infer<typeof criarIniciativaSchema>;

const criarIniciativa: ToolDefinition<CriarIniciativaParams> = {
  name: "criar_iniciativa",
  description:
    "Cria uma nova iniciativa estratégica. Use quando o usuário aprovar uma ação concreta a ser executada (projeto, ação, entrega).",
  paramsSchema: criarIniciativaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["titulo", "descricao", "prazo"],
    properties: {
      titulo: { type: "string", description: "Nome curto da iniciativa (≤120 chars)" },
      descricao: { type: "string", description: "O que será feito, em 1-3 frases" },
      prioridade: { type: "string", enum: ["alta", "média", "baixa"] },
      prazo: { type: "string", description: "Texto livre do prazo (ex.: 'Q4 2025'). Para datas calendarizadas, use também prazoData." },
      prazoData: { type: "string", description: "Prazo da iniciativa em YYYY-MM-DD. Preencha sempre que o usuário disser uma data calendarizada (ex.: 'até 31/12/2025'). Alimenta o cálculo de atraso na UI." },
      status: { type: "string", enum: [...STATUS_INICIATIVA] },
      responsavel: { type: "string", description: "Nome do responsável (string livre)" },
      impacto: { type: "string", description: "Impacto esperado em 1 frase" },
      estrategiaId: { type: "string", description: "ID da estratégia vinculada (opcional)" },
      indicadorFonteId: { type: "string", description: "ID do indicador (KPI) que esta iniciativa busca melhorar (opcional). Use o id do CATÁLOGO de Indicadores quando o usuário disser que a iniciativa visa atacar um KPI específico." },
    },
  },
  preview: (p) => ({
    titulo: `Criar iniciativa: ${p.titulo}`,
    descricao: p.descricao,
    campos: [
      strField("Prioridade", p.prioridade),
      strField("Prazo", p.prazoData ? `${p.prazo} (${p.prazoData})` : p.prazo),
      strField("Responsável", p.responsavel),
      strField("Impacto esperado", p.impacto),
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Criar iniciativa",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Task #333/#335 — Defesa em profundidade: bloqueia duplicata também
    // no apply caso a pré-validação em registrarProposta não tenha sido
    // executada (ex.: lote, briefing, retrocompatibilidade futura).
    const candidatos = await buscarIniciativasSimilares(ctx.empresaId, p.titulo);
    if (candidatos.length > 0) {
      throw new IniciativaDuplicadaError(candidatos);
    }
    // Validação de tenant para FK opcional: se estrategiaId vier, precisa
    // pertencer à mesma empresa — caso contrário, ignora o vínculo para
    // não criar referência cruzada entre tenants.
    let estrategiaIdSafe: string | undefined = undefined;
    if (p.estrategiaId) {
      const est = await storage.getEstrategia(p.estrategiaId);
      if (est && est.empresaId === ctx.empresaId) estrategiaIdSafe = est.id;
    }
    // Task #208 — mesma proteção de tenant para o indicador-fonte.
    let indicadorFonteIdSafe: string | undefined = undefined;
    if (p.indicadorFonteId) {
      const ind = await storage.getIndicador(p.indicadorFonteId);
      if (ind && ind.empresaId === ctx.empresaId) indicadorFonteIdSafe = ind.id;
    }
    const created = await storage.createIniciativa({
      empresaId: ctx.empresaId,
      titulo: p.titulo,
      descricao: p.descricao,
      status: p.status,
      prioridade: p.prioridade,
      prazo: p.prazo,
      prazoData: p.prazoData ?? null,
      responsavel: p.responsavel || "",
      impacto: p.impacto || "",
      estrategiaId: estrategiaIdSafe,
      indicadorFonteId: indicadorFonteIdSafe,
    });
    return {
      resumo: `Iniciativa "${created.titulo}" criada.`,
      dados: { id: created.id },
      rota: "/iniciativas",
      entidadeTipo: "iniciativa",
      entidadeId: created.id,
    };
  },
  formRota: "/iniciativas",
};

// ---------- 2. atualizar_iniciativa ----------
// Task #333 — `.refine` exige ao menos um campo de mudança além do `id`.
// Bloqueia o caso em que o LLM emite `atualizar_iniciativa` só com o `id`
// (que entrava em loop, gerando proposta vazia a cada turno).
const ATUALIZAR_INICIATIVA_CAMPOS_MUTAVEIS = [
  "titulo", "descricao", "prioridade", "prazo", "prazoData", "status", "responsavel",
] as const;

const atualizarIniciativaSchema = z
  .object({
    id: z.string().min(8),
    titulo: z.string().min(3).max(200).optional(),
    descricao: z.string().max(1000).optional(),
    prioridade: z.enum(PRIORIDADES).optional(),
    prazo: z.string().max(32).optional(),
    // Task #268 — passe `prazoData` (YYYY-MM-DD) para calendarizar o prazo
    // da iniciativa, ou `null` para limpar a data normalizada.
    prazoData: prazoDataOptNullable,
    status: z.enum(STATUS_INICIATIVA).optional(),
    responsavel: z.string().max(120).optional(),
  })
  .refine(
    (data) =>
      ATUALIZAR_INICIATIVA_CAMPOS_MUTAVEIS.some(
        (k) => (data as Record<string, unknown>)[k] !== undefined,
      ),
    {
      message:
        "atualizar_iniciativa precisa de ao menos um campo a alterar além do id (titulo, descricao, prioridade, prazo, prazoData, status ou responsavel).",
    },
  );
type AtualizarIniciativaParams = z.infer<typeof atualizarIniciativaSchema>;

const atualizarIniciativa: ToolDefinition<AtualizarIniciativaParams> = {
  name: "atualizar_iniciativa",
  description:
    "Atualiza campos de uma iniciativa existente (status, prazo, prioridade, responsável). Use quando o usuário aprovar mudança de planejamento.",
  paramsSchema: atualizarIniciativaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["id"],
    properties: {
      id: { type: "string", description: "ID real da iniciativa" },
      titulo: { type: "string" },
      descricao: { type: "string" },
      prioridade: { type: "string", enum: ["alta", "média", "baixa"] },
      prazo: { type: "string", description: "Texto livre do prazo. Para datas calendarizadas, use também prazoData." },
      prazoData: { type: ["string", "null"], description: "Prazo calendarizado em YYYY-MM-DD; passe null para limpar a data normalizada." },
      status: { type: "string", enum: [...STATUS_INICIATIVA] },
      responsavel: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: `Atualizar iniciativa`,
    descricao: `Vamos ajustar a iniciativa selecionada.`,
    campos: [
      strField("ID", p.id),
      strField("Novo título", p.titulo),
      strField("Status", p.status),
      strField("Prioridade", p.prioridade),
      strField("Prazo", p.prazo),
      p.prazoData === null
        ? { label: "Prazo (data)", valor: "(limpar)" }
        : strField("Prazo (data)", p.prazoData ?? undefined),
      strField("Responsável", p.responsavel),
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await storage.getIniciativa(p.id);
    if (!existing || existing.empresaId !== ctx.empresaId) {
      throw new Error("Iniciativa não encontrada nesta empresa.");
    }
    const patch: Partial<typeof existing> = {};
    if (p.titulo) patch.titulo = p.titulo;
    if (p.descricao) patch.descricao = p.descricao;
    if (p.prioridade) patch.prioridade = p.prioridade;
    if (p.prazo) patch.prazo = p.prazo;
    if (p.prazoData !== undefined) patch.prazoData = p.prazoData;
    if (p.status) patch.status = p.status;
    if (p.responsavel !== undefined) patch.responsavel = p.responsavel;

    // Task #333 — Detecta no-op: todos os campos enviados batem com o
    // estado atual. Bloqueia o card "Atualizar iniciativa" sem mudança
    // alguma (que entrava em loop a cada Continue do usuário).
    const mudancas: string[] = [];
    for (const [k, v] of Object.entries(patch) as Array<[keyof typeof existing, unknown]>) {
      const atual = existing[k] as unknown;
      const igual =
        atual === v ||
        (atual == null && v == null) ||
        (typeof atual === "string" && typeof v === "string" && atual === v);
      if (!igual) mudancas.push(String(k));
    }
    if (mudancas.length === 0) {
      throw new Error(
        `Nada a alterar nesta iniciativa: todos os campos enviados já batem com o estado atual de "${existing.titulo}". Confirme com o usuário o que ele quer mudar antes de propor de novo.`,
      );
    }

    const updated = await storage.updateIniciativa(p.id, ctx.empresaId, patch);
    return {
      resumo: `Iniciativa "${updated.titulo}" atualizada.`,
      dados: { id: updated.id },
      rota: "/iniciativas",
      entidadeTipo: "iniciativa",
      entidadeId: updated.id,
    };
  },
  formRota: "/iniciativas",
  statusLabel: "Atualizando iniciativa…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const existing = await storage.getIniciativa(p.id);
      if (!existing || existing.empresaId !== ctx.empresaId) return preview;
      const before: Record<string, { raw: string | null | undefined; numeric?: boolean }> = {
        "Novo título": { raw: existing.titulo },
        "Status": { raw: existing.status ?? null },
        "Prioridade": { raw: existing.prioridade ?? null },
        "Prazo": { raw: existing.prazo ?? null },
        "Prazo (data)": { raw: existing.prazoData ?? null },
        "Responsável": { raw: existing.responsavel ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

// ---------- 2b. encerrar_iniciativa ----------
// Task #207 — fecha uma iniciativa registrando status final + nota curta.
const STATUS_ENCERRAMENTO = ["concluida", "pausada", "cancelada"] as const;
const encerrarIniciativaSchema = z.object({
  id: z.string().min(8),
  status: z.enum(STATUS_ENCERRAMENTO).default("concluida"),
  nota: z.string().min(1).max(600),
});
type EncerrarIniciativaParams = z.infer<typeof encerrarIniciativaSchema>;

const STATUS_ENCERRAMENTO_LABEL: Record<typeof STATUS_ENCERRAMENTO[number], string> = {
  concluida: "Concluída",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const encerrarIniciativa: ToolDefinition<EncerrarIniciativaParams> = {
  name: "encerrar_iniciativa",
  description:
    "Encerra uma iniciativa existente registrando status final (concluida/pausada/cancelada) e uma nota curta de fechamento (motivo, aprendizado ou resultado). Use quando o usuário disser que a iniciativa terminou — ex.: 'encerra a iniciativa X com a nota: deu certo, KPI voltou ao verde'. Prefira esta tool a atualizar_iniciativa quando o objetivo é fechar/dar baixa.",
  paramsSchema: encerrarIniciativaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["id", "nota"],
    properties: {
      id: { type: "string", description: "ID real da iniciativa (do CATÁLOGO)" },
      status: { type: "string", enum: [...STATUS_ENCERRAMENTO], description: "Status final: concluida (padrão), pausada ou cancelada." },
      nota: { type: "string", description: "Nota curta de fechamento — motivo, aprendizado ou resultado (até 600 chars)." },
    },
  },
  preview: (p) => ({
    titulo: "Encerrar iniciativa",
    descricao: `Marcar a iniciativa como ${STATUS_ENCERRAMENTO_LABEL[p.status]} e registrar a nota de fechamento.`,
    campos: [
      { label: "ID", valor: p.id },
      { label: "Status final", valor: STATUS_ENCERRAMENTO_LABEL[p.status] },
      { label: "Nota de fechamento", valor: p.nota },
    ],
    ctaConfirmar: "Encerrar iniciativa",
    ctaIgnorar: "Manter aberta",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await storage.getIniciativa(p.id);
    if (!existing || existing.empresaId !== ctx.empresaId) {
      throw new Error("Iniciativa não encontrada nesta empresa.");
    }
    const updated = await storage.updateIniciativa(p.id, ctx.empresaId, {
      status: p.status,
      notaEncerramento: p.nota,
      encerradaEm: new Date(),
    } as Partial<typeof existing>);
    return {
      resumo: `Iniciativa "${updated.titulo}" encerrada como ${STATUS_ENCERRAMENTO_LABEL[p.status]}.`,
      dados: { id: updated.id, status: updated.status },
      rota: "/iniciativas",
      entidadeTipo: "iniciativa",
      entidadeId: updated.id,
    };
  },
  formRota: "/iniciativas",
};

// ---------- 2c. vincular_iniciativa_a_kpi ----------
// Task #231 — fecha lacuna "iniciativas conectadas à estratégia / KPIs vivos"
// preenchendo `iniciativas.indicadorFonteId`.
const vincularIniciativaAKpiSchema = z.object({
  iniciativaId: z.string().min(8),
  indicadorId: z.string().min(8),
});
type VincularIniciativaAKpiParams = z.infer<typeof vincularIniciativaAKpiSchema>;

const vincularIniciativaAKpi: ToolDefinition<VincularIniciativaAKpiParams> = {
  name: "vincular_iniciativa_a_kpi",
  description:
    "Vincula uma iniciativa existente a um indicador (KPI) — preenche o campo indicadorFonteId. Use quando a QUALIDADE DO PLANO mostrar 'iniciativa sem KPI vinculado' ou quando o usuário disser que a iniciativa X serve para atacar o KPI Y. Não cria nada — só conecta dois itens já existentes (use IDs do CATÁLOGO).",
  paramsSchema: vincularIniciativaAKpiSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["iniciativaId", "indicadorId"],
    properties: {
      iniciativaId: { type: "string", description: "ID real da iniciativa (do CATÁLOGO)" },
      indicadorId: { type: "string", description: "ID real do indicador/KPI (do CATÁLOGO)" },
    },
  },
  preview: (p) => ({
    titulo: "Vincular iniciativa a KPI",
    descricao: "A iniciativa selecionada passará a atacar o KPI indicado.",
    campos: [
      { label: "Iniciativa", valor: p.iniciativaId },
      { label: "KPI", valor: p.indicadorId },
    ],
    ctaConfirmar: "Vincular",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const ini = await storage.getIniciativa(p.iniciativaId);
    if (!ini || ini.empresaId !== ctx.empresaId) {
      throw new Error("Iniciativa não encontrada nesta empresa.");
    }
    const ind = await storage.getIndicador(p.indicadorId);
    if (!ind || ind.empresaId !== ctx.empresaId) {
      throw new Error("Indicador não encontrado nesta empresa.");
    }
    const updated = await storage.updateIniciativa(p.iniciativaId, ctx.empresaId, {
      indicadorFonteId: p.indicadorId,
    });
    return {
      resumo: `Iniciativa "${updated.titulo}" agora ataca o KPI "${ind.nome}".`,
      dados: { iniciativaId: updated.id, indicadorId: ind.id },
      rota: "/iniciativas",
      entidadeTipo: "iniciativa",
      entidadeId: updated.id,
    };
  },
  formRota: "/iniciativas",
};

// ---------- 2d. dividir_iniciativa ----------
// Task #231 — quebra uma iniciativa parada/atrasada em 2-5 sub-iniciativas
// executáveis e encerra a mãe com nota apontando para as filhas. Atômico.
const subitemDividirSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(3).max(1000),
  prazo: z.string().min(4).max(32),
  // Task #268 — sub-iniciativas também propagam prazo calendarizado.
  prazoData: prazoDataOpt,
  prioridade: z.enum(PRIORIDADES).optional(),
  responsavel: z.string().max(120).optional(),
});
const dividirIniciativaSchema = z.object({
  iniciativaId: z.string().min(8),
  subitens: z.array(subitemDividirSchema).min(2).max(5),
});
type DividirIniciativaParams = z.infer<typeof dividirIniciativaSchema>;

const dividirIniciativa: ToolDefinition<DividirIniciativaParams> = {
  name: "dividir_iniciativa",
  description:
    "Divide uma iniciativa parada/atrasada em 2 a 5 sub-iniciativas executáveis e encerra a mãe (status=cancelada) com nota apontando para as filhas. Use quando uma iniciativa estiver parada há muito tempo (>60 dias) ou for grande demais para sair do papel. As filhas herdam estratégia, KPI-fonte e responsável da mãe quando não informados. Não use para edição comum — para isso use atualizar_iniciativa.",
  paramsSchema: dividirIniciativaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["iniciativaId", "subitens"],
    properties: {
      iniciativaId: { type: "string", description: "ID real da iniciativa-mãe (do CATÁLOGO)" },
      subitens: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["titulo", "descricao", "prazo"],
          properties: {
            titulo: { type: "string" },
            descricao: { type: "string" },
            prazo: { type: "string", description: "Texto livre do prazo. Para datas calendarizadas, use também prazoData." },
            prazoData: { type: "string", description: "Prazo da sub-iniciativa em YYYY-MM-DD. Preencha sempre que o usuário disser uma data calendarizada." },
            prioridade: { type: "string", enum: ["alta", "média", "baixa"] },
            responsavel: { type: "string" },
          },
        },
      },
    },
  },
  preview: (p) => ({
    titulo: `Dividir iniciativa em ${p.subitens.length} entregas`,
    descricao: "A iniciativa selecionada será encerrada (cancelada) e substituída pelas sub-iniciativas abaixo, que herdam estratégia, KPI e responsável quando não informados.",
    campos: [
      { label: "Iniciativa-mãe", valor: p.iniciativaId },
      ...p.subitens.map((s, i) => ({
        label: `Filha ${i + 1}`,
        valor: `${s.titulo} (prazo ${s.prazoData ? `${s.prazo} / ${s.prazoData}` : s.prazo}${s.responsavel ? `, ${s.responsavel}` : ""})`,
      })),
    ],
    ctaConfirmar: "Dividir e encerrar mãe",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const titulosFilhas = p.subitens.map((s) => s.titulo).join("; ");
    const nota = `Dividida em ${p.subitens.length} entregas: ${titulosFilhas}`.slice(0, 600);
    const { mae, filhas } = await storage.dividirIniciativa(
      p.iniciativaId,
      ctx.empresaId,
      p.subitens.map((s) => ({
        titulo: s.titulo,
        descricao: s.descricao,
        prazo: s.prazo,
        prazoData: s.prazoData ?? null,
        prioridade: s.prioridade,
        responsavel: s.responsavel,
      })),
      nota,
    );
    return {
      resumo: `Iniciativa "${mae.titulo}" dividida em ${filhas.length} sub-iniciativas.`,
      dados: { maeId: mae.id, filhasIds: filhas.map((f) => f.id) },
      rota: "/iniciativas",
      entidadeTipo: "iniciativa",
      entidadeId: mae.id,
    };
  },
  formRota: "/iniciativas",
};

// ---------- 3. criar_okr ----------
// Task #266 — usa os helpers `prazoDataOpt` / `prazoDataOptNullable`
// definidos no topo do arquivo (compartilhados com as tools de iniciativa).
const criarOkrSchema = z.object({
  objetivoTitulo: z.string().min(3).max(200),
  objetivoDescricao: z.string().max(800).default(""),
  perspectiva: z.enum(PERSPECTIVAS_OKR).default("Financeira"),
  prazo: z.string().min(4).max(32),
  prazoData: prazoDataOpt,
  resultadosChave: z
    .array(
      z.object({
        metrica: z.string().min(3).max(200),
        valorInicial: z.number().or(z.string()).transform((v) => Number(v)),
        valorAlvo: z.number().or(z.string()).transform((v) => Number(v)),
        owner: z.string().min(1).max(120),
        prazo: z.string().min(4).max(32),
        prazoData: prazoDataOpt,
        // Task #208 — Indicador (KPI) que esta meta busca melhorar (opcional).
        indicadorFonteId: z.string().optional(),
      })
    )
    .min(1)
    .max(5),
});
type CriarOkrParams = z.infer<typeof criarOkrSchema>;

const criarOkr: ToolDefinition<CriarOkrParams> = {
  name: "criar_okr",
  description:
    "Cria um Objetivo + 1 a 5 Resultados-chave (OKR). Use quando o usuário aprovar uma nova meta estratégica medida.",
  paramsSchema: criarOkrSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["objetivoTitulo", "prazo", "resultadosChave"],
    properties: {
      objetivoTitulo: { type: "string" },
      objetivoDescricao: { type: "string" },
      perspectiva: { type: "string", enum: [...PERSPECTIVAS_OKR] },
      prazo: { type: "string", description: "Texto livre do prazo (ex.: 'Q4 2025', 'Mar/2026')." },
      prazoData: { type: "string", description: "Prazo do objetivo em YYYY-MM-DD. Preencha sempre que o usuário disser uma data calendarizada (ex.: 'até 31/12/2025'). Alimenta o cálculo de atraso na UI." },
      resultadosChave: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["metrica", "valorInicial", "valorAlvo", "owner", "prazo"],
          properties: {
            metrica: { type: "string" },
            valorInicial: { type: "number" },
            valorAlvo: { type: "number" },
            owner: { type: "string" },
            prazo: { type: "string" },
            prazoData: { type: "string", description: "Prazo do KR em YYYY-MM-DD. Preencha sempre que o usuário disser uma data calendarizada para esta meta." },
            indicadorFonteId: { type: "string", description: "ID do indicador (KPI) que esta meta busca melhorar (opcional). Use o id do CATÁLOGO de Indicadores quando o usuário indicar que a meta ataca um KPI específico." },
          },
        },
      },
    },
  },
  preview: (p) => ({
    titulo: `Criar OKR: ${p.objetivoTitulo}`,
    descricao: p.objetivoDescricao || `Objetivo na perspectiva ${p.perspectiva}, prazo ${p.prazo}.`,
    campos: [
      { label: "Perspectiva", valor: p.perspectiva },
      { label: "Prazo", valor: p.prazoData ? `${p.prazo} (${p.prazoData})` : p.prazo },
      ...p.resultadosChave.map((r, i) => ({
        label: `KR ${i + 1}`,
        valor: `${r.metrica} (${r.valorInicial} → ${r.valorAlvo}, ${r.owner}, ${r.prazoData ? `${r.prazo} / ${r.prazoData}` : r.prazo})`,
      })),
    ],
    ctaConfirmar: "Criar OKR",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Task #335 — defesa em profundidade contra OKR duplicado.
    const dupOkr = await buscarObjetivosSimilares(ctx.empresaId, p.objetivoTitulo);
    if (dupOkr.length > 0) {
      throw new EntidadeDuplicadaError("OKR (objetivo)", dupOkr);
    }
    const objetivo = await storage.createObjetivo({
      empresaId: ctx.empresaId,
      titulo: p.objetivoTitulo,
      descricao: p.objetivoDescricao || null,
      prazo: p.prazo,
      prazoData: p.prazoData ?? null,
      perspectiva: p.perspectiva,
    });
    const krsCriados = [];
    for (const r of p.resultadosChave) {
      // Task #208 — valida tenant do indicador-fonte por KR antes de gravar.
      let indicadorFonteIdSafe: string | undefined = undefined;
      if (r.indicadorFonteId) {
        const ind = await storage.getIndicador(r.indicadorFonteId);
        if (ind && ind.empresaId === ctx.empresaId) indicadorFonteIdSafe = ind.id;
      }
      const kr = await storage.createResultadoChave(
        {
          objetivoId: objetivo.id,
          metrica: r.metrica,
          valorInicial: String(r.valorInicial),
          valorAlvo: String(r.valorAlvo),
          valorAtual: String(r.valorInicial),
          owner: r.owner,
          prazo: r.prazo,
          prazoData: r.prazoData ?? null,
          indicadorFonteId: indicadorFonteIdSafe,
        },
        ctx.empresaId
      );
      krsCriados.push(kr.id);
    }
    return {
      resumo: `OKR "${objetivo.titulo}" criado com ${krsCriados.length} KR(s).`,
      dados: { objetivoId: objetivo.id, krIds: krsCriados },
      rota: "/okrs",
      entidadeTipo: "objetivo",
      entidadeId: objetivo.id,
    };
  },
  formRota: "/okrs",
};

// ---------- 3b. atualizar_okr ----------
const atualizarOkrSchema = z.object({
  objetivoId: z.string().min(8),
  titulo: z.string().min(3).max(200).optional(),
  descricao: z.string().max(800).optional(),
  perspectiva: z.enum(PERSPECTIVAS_OKR).optional(),
  prazo: z.string().min(4).max(32).optional(),
  // Task #266 — passe `prazoData` (YYYY-MM-DD) para calendarizar o prazo,
  // ou explicitamente `null` para limpar a data normalizada existente.
  prazoData: prazoDataOptNullable,
});
type AtualizarOkrParams = z.infer<typeof atualizarOkrSchema>;

const atualizarOkr: ToolDefinition<AtualizarOkrParams> = {
  name: "atualizar_okr",
  description:
    "Atualiza campos de um Objetivo (OKR) existente — título, descrição, perspectiva ou prazo. Use quando o usuário aprovar mudança de planejamento de meta.",
  paramsSchema: atualizarOkrSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["objetivoId"],
    properties: {
      objetivoId: { type: "string", description: "ID real do objetivo (OKR)" },
      titulo: { type: "string" },
      descricao: { type: "string" },
      perspectiva: { type: "string", enum: [...PERSPECTIVAS_OKR] },
      prazo: { type: "string" },
      prazoData: { type: ["string", "null"], description: "Prazo calendarizado em YYYY-MM-DD; passe null para limpar a data normalizada." },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar OKR",
    descricao: "Vamos ajustar o objetivo selecionado.",
    campos: [
      strField("ID", p.objetivoId),
      strField("Novo título", p.titulo),
      strField("Perspectiva", p.perspectiva),
      strField("Prazo", p.prazo),
      p.prazoData === null
        ? { label: "Prazo (data)", valor: "limpar" }
        : strField("Prazo (data)", p.prazoData ?? undefined),
      strField("Descrição", p.descricao),
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const patch: Record<string, unknown> = {};
    if (p.titulo) patch.titulo = p.titulo;
    if (p.descricao !== undefined) patch.descricao = p.descricao;
    if (p.perspectiva) patch.perspectiva = p.perspectiva;
    if (p.prazo) patch.prazo = p.prazo;
    if (p.prazoData !== undefined) patch.prazoData = p.prazoData;
    const updated = await storage.updateObjetivo(p.objetivoId, ctx.empresaId, patch);
    return {
      resumo: `OKR "${updated.titulo}" atualizado.`,
      dados: { id: updated.id },
      rota: "/okrs",
      entidadeTipo: "objetivo",
      entidadeId: updated.id,
    };
  },
  formRota: "/okrs",
  statusLabel: "Atualizando OKR…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const lista = await storage.getObjetivos(ctx.empresaId);
      const existing = lista.find((o) => o.id === p.objetivoId);
      if (!existing) return preview;
      const before: Record<string, { raw: string | null | undefined; numeric?: boolean }> = {
        "Novo título": { raw: existing.titulo },
        "Perspectiva": { raw: existing.perspectiva ?? null },
        "Prazo": { raw: existing.prazo ?? null },
        "Prazo (data)": { raw: (existing as { prazoData?: string | null }).prazoData ?? null },
        "Descrição": { raw: (existing as { descricao?: string | null }).descricao ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

// ---------- 3c. adicionar_kr_a_okr ----------
// Task #207 — Acrescenta UMA meta nova a um OKR (objetivo) já existente.
const adicionarKrAOkrSchema = z.object({
  objetivoId: z.string().min(8),
  metrica: z.string().min(3).max(200),
  valorInicial: z.number().or(z.string()).transform((v) => Number(v)),
  valorAlvo: z.number().or(z.string()).transform((v) => Number(v)),
  owner: z.string().min(1).max(120),
  prazo: z.string().min(4).max(32),
  // Task #266 — `prazoData` (YYYY-MM-DD) calendariza o prazo da meta.
  prazoData: prazoDataOpt,
  // Task #208 — Indicador (KPI) que esta meta busca melhorar (opcional).
  indicadorFonteId: z.string().optional(),
});
type AdicionarKrAOkrParams = z.infer<typeof adicionarKrAOkrSchema>;

const adicionarKrAOkr: ToolDefinition<AdicionarKrAOkrParams> = {
  name: "adicionar_kr_a_okr",
  description:
    "Adiciona uma nova meta (resultado-chave / KR) DENTRO de um OKR (objetivo) já existente, sem criar novo objetivo. Use quando o usuário pedir 'adiciona uma meta de X ao OKR Y' e o objetivo Y já estiver no CATÁLOGO. Não use criar_okr para isso (criaria objetivo duplicado).",
  paramsSchema: adicionarKrAOkrSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["objetivoId", "metrica", "valorInicial", "valorAlvo", "owner", "prazo"],
    properties: {
      objetivoId: { type: "string", description: "ID real do objetivo (OKR) do CATÁLOGO" },
      metrica: { type: "string" },
      valorInicial: { type: "number" },
      valorAlvo: { type: "number" },
      owner: { type: "string" },
      prazo: { type: "string", description: "Texto livre do prazo (ex.: 'Q4 2025'). Para datas calendarizadas, use também prazoData." },
      prazoData: { type: "string", description: "Prazo da meta em YYYY-MM-DD. Preencha sempre que o usuário disser uma data explícita (ex.: 'até 31/12/2025'). Alimenta o cálculo de atraso na UI." },
      indicadorFonteId: { type: "string", description: "ID do indicador (KPI) que esta meta busca melhorar (opcional). Use o id do CATÁLOGO de Indicadores quando o usuário indicar que a meta ataca um KPI específico." },
    },
  },
  preview: (p) => ({
    titulo: `Adicionar meta ao OKR`,
    descricao: `Nova meta dentro do objetivo selecionado: ${p.metrica}.`,
    campos: [
      { label: "Objetivo", valor: p.objetivoId },
      { label: "Métrica", valor: p.metrica },
      { label: "Valor inicial → alvo", valor: `${p.valorInicial} → ${p.valorAlvo}` },
      { label: "Dono", valor: p.owner },
      { label: "Prazo", valor: p.prazoData ? `${p.prazo} (${p.prazoData})` : p.prazo },
    ],
    ctaConfirmar: "Adicionar meta",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Task #335 — defesa em profundidade contra KR duplicado dentro do
    // mesmo objetivo (ex.: "NPS ≥ 70" e "NPS acima de 70").
    const dupKr = await buscarKrsSimilares(ctx.empresaId, p.objetivoId, p.metrica);
    if (dupKr.length > 0) {
      throw new EntidadeDuplicadaError("meta (KR) neste OKR", dupKr);
    }
    // Task #208 — valida tenant do indicador-fonte antes de gravar.
    let indicadorFonteIdSafe: string | undefined = undefined;
    if (p.indicadorFonteId) {
      const ind = await storage.getIndicador(p.indicadorFonteId);
      if (ind && ind.empresaId === ctx.empresaId) indicadorFonteIdSafe = ind.id;
    }
    // createResultadoChave já valida que o objetivo pertence à empresa.
    const kr = await storage.createResultadoChave(
      {
        objetivoId: p.objetivoId,
        metrica: p.metrica,
        valorInicial: String(p.valorInicial),
        valorAlvo: String(p.valorAlvo),
        valorAtual: String(p.valorInicial),
        owner: p.owner,
        prazo: p.prazo,
        prazoData: p.prazoData ?? null,
        indicadorFonteId: indicadorFonteIdSafe,
      },
      ctx.empresaId,
    );
    return {
      resumo: `Meta "${kr.metrica}" adicionada ao OKR.`,
      dados: { id: kr.id, objetivoId: p.objetivoId },
      rota: "/okrs",
      entidadeTipo: "resultado_chave",
      entidadeId: kr.id,
    };
  },
  formRota: "/okrs",
};

// ---------- 3d. atualizar_kr ----------
// Task #207 — Edita os campos de calibragem de uma meta existente
// (métrica, valor inicial, valor-alvo, dono, prazo). Não toca em valorAtual,
// que continua exclusivo da tool atualizar_progresso_kr.
const atualizarKrSchema = z.object({
  resultadoChaveId: z.string().min(8),
  metrica: z.string().min(3).max(200).optional(),
  valorInicial: z.number().or(z.string()).transform((v) => Number(v)).optional(),
  valorAlvo: z.number().or(z.string()).transform((v) => Number(v)).optional(),
  owner: z.string().min(1).max(120).optional(),
  prazo: z.string().min(4).max(32).optional(),
  // Task #266 — passe `prazoData` (YYYY-MM-DD) para calendarizar o prazo,
  // ou explicitamente `null` para limpar a data normalizada existente.
  prazoData: prazoDataOptNullable,
});
type AtualizarKrParams = z.infer<typeof atualizarKrSchema>;

const atualizarKr: ToolDefinition<AtualizarKrParams> = {
  name: "atualizar_kr",
  description:
    "Edita campos de calibragem de uma meta (resultado-chave) existente: métrica, valor inicial, valor-alvo, dono ou prazo. Use quando o usuário pedir para 'ajustar a meta-alvo daquela meta para 95', 'mudar o dono da meta para Ana' ou 'remarcar o prazo da meta'. Para apenas o valor atual (progresso), use atualizar_progresso_kr.",
  paramsSchema: atualizarKrSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["resultadoChaveId"],
    properties: {
      resultadoChaveId: { type: "string", description: "ID real do KR (do CATÁLOGO)" },
      metrica: { type: "string" },
      valorInicial: { type: "number" },
      valorAlvo: { type: "number" },
      owner: { type: "string" },
      prazo: { type: "string" },
      prazoData: { type: ["string", "null"], description: "Prazo calendarizado em YYYY-MM-DD; passe null para limpar a data normalizada." },
    },
  },
  preview: (p) => ({
    titulo: "Editar meta",
    descricao: "Vamos ajustar os campos da meta selecionada.",
    campos: [
      strField("KR", p.resultadoChaveId),
      strField("Métrica", p.metrica),
      p.valorInicial !== undefined ? { label: "Valor inicial", valor: String(p.valorInicial) } : null,
      p.valorAlvo !== undefined ? { label: "Valor-alvo", valor: String(p.valorAlvo) } : null,
      strField("Dono", p.owner),
      strField("Prazo", p.prazo),
      p.prazoData === null
        ? { label: "Prazo (data)", valor: "limpar" }
        : strField("Prazo (data)", p.prazoData ?? undefined),
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const patch: Record<string, unknown> = {};
    if (p.metrica) patch.metrica = p.metrica;
    if (p.valorInicial !== undefined) patch.valorInicial = String(p.valorInicial);
    if (p.valorAlvo !== undefined) patch.valorAlvo = String(p.valorAlvo);
    if (p.owner) patch.owner = p.owner;
    if (p.prazo) patch.prazo = p.prazo;
    if (p.prazoData !== undefined) patch.prazoData = p.prazoData;
    const updated = await storage.updateResultadoChave(p.resultadoChaveId, ctx.empresaId, patch);
    return {
      resumo: `Meta "${updated.metrica}" atualizada.`,
      dados: { id: updated.id },
      rota: "/okrs",
      entidadeTipo: "resultado_chave",
      entidadeId: updated.id,
    };
  },
  formRota: "/okrs",
  statusLabel: "Editando meta…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const kr = await storage.getResultadoChaveById(p.resultadoChaveId, ctx.empresaId);
      if (!kr) return preview;
      const before: Record<string, { raw: string | null | undefined; numeric?: boolean }> = {
        "Métrica": { raw: kr.metrica },
        "Valor inicial": { raw: kr.valorInicial != null ? String(kr.valorInicial) : null, numeric: true },
        "Valor-alvo": { raw: kr.valorAlvo != null ? String(kr.valorAlvo) : null, numeric: true },
        "Dono": { raw: kr.owner ?? null },
        "Prazo": { raw: kr.prazo ?? null },
        "Prazo (data)": { raw: (kr as { prazoData?: string | null }).prazoData ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

// ---------- 4. atualizar_progresso_kr ----------
const atualizarProgressoKrSchema = z.object({
  resultadoChaveId: z.string().min(8),
  valorAtual: z.number().or(z.string()).transform((v) => Number(v)),
  nota: z.string().max(400).default(""),
});
type AtualizarProgressoKrParams = z.infer<typeof atualizarProgressoKrSchema>;

const atualizarProgressoKr: ToolDefinition<AtualizarProgressoKrParams> = {
  name: "atualizar_progresso_kr",
  description:
    "Atualiza o valor atual de um Resultado-chave (KR) de OKR. Use quando o usuário informar progresso novo.",
  paramsSchema: atualizarProgressoKrSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["resultadoChaveId", "valorAtual"],
    properties: {
      resultadoChaveId: { type: "string", description: "ID real do KR" },
      valorAtual: { type: "number" },
      nota: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar progresso de KR",
    descricao: p.nota || "Atualizar o valor atual do resultado-chave indicado.",
    campos: [
      { label: "Resultado-chave", valor: p.resultadoChaveId },
      { label: "Novo valor atual", valor: String(p.valorAtual) },
    ],
    ctaConfirmar: "Atualizar KR",
    ctaIgnorar: "Cancelar",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const updated = await storage.updateResultadoChave(p.resultadoChaveId, ctx.empresaId, {
      valorAtual: String(p.valorAtual),
    });
    return {
      resumo: `KR atualizado para ${updated.valorAtual}.`,
      dados: { id: updated.id, valorAtual: updated.valorAtual },
      rota: "/okrs",
      entidadeTipo: "resultado_chave",
      entidadeId: updated.id,
    };
  },
  formRota: "/okrs",
  statusLabel: "Atualizando progresso do KR…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const kr = await storage.getResultadoChaveById(p.resultadoChaveId, ctx.empresaId);
      if (!kr) return preview;
      const before: Record<string, { raw: string | null | undefined; numeric?: boolean }> = {
        "Novo valor atual": { raw: kr.valorAtual != null ? String(kr.valorAtual) : null, numeric: true },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

// ---------- 4b. vincular_kr_a_indicador ----------
// Task #231 — fecha lacuna "KRs ligados a um indicador" (uma das 8 dimensões
// do Score). Preenche resultados_chave.indicadorFonteId.
const vincularKrAIndicadorSchema = z.object({
  krId: z.string().min(8),
  indicadorId: z.string().min(8),
});
type VincularKrAIndicadorParams = z.infer<typeof vincularKrAIndicadorSchema>;

const vincularKrAIndicador: ToolDefinition<VincularKrAIndicadorParams> = {
  name: "vincular_kr_a_indicador",
  description:
    "Vincula um Resultado-chave (KR) existente a um indicador (KPI) — preenche o campo indicadorFonteId do KR. RASTREABILIDADE OPCIONAL: KR e KPI são camadas independentes (alcance do ciclo vs. performance contínua); use esta tool APENAS quando o usuário pedir explicitamente para amarrar uma meta a um KPI, nunca como sugestão proativa de melhoria de plano. Não cria nada — só conecta dois itens já existentes (use IDs do CATÁLOGO).",
  paramsSchema: vincularKrAIndicadorSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["krId", "indicadorId"],
    properties: {
      krId: { type: "string", description: "ID real do KR / resultado-chave (do CATÁLOGO)" },
      indicadorId: { type: "string", description: "ID real do indicador/KPI (do CATÁLOGO)" },
    },
  },
  preview: (p) => ({
    titulo: "Vincular KR a indicador",
    descricao: "O resultado-chave selecionado passará a usar o indicador indicado como fonte.",
    campos: [
      { label: "KR", valor: p.krId },
      { label: "Indicador-fonte", valor: p.indicadorId },
    ],
    ctaConfirmar: "Vincular",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // updateResultadoChave já valida tenant via join com objetivos.empresaId.
    const ind = await storage.getIndicador(p.indicadorId);
    if (!ind || ind.empresaId !== ctx.empresaId) {
      throw new Error("Indicador não encontrado nesta empresa.");
    }
    const updated = await storage.updateResultadoChave(p.krId, ctx.empresaId, {
      indicadorFonteId: p.indicadorId,
    });
    return {
      resumo: `KR "${updated.metrica}" agora usa o indicador "${ind.nome}" como fonte.`,
      dados: { krId: updated.id, indicadorId: ind.id },
      rota: "/okrs",
      entidadeTipo: "resultado_chave",
      entidadeId: updated.id,
    };
  },
  formRota: "/okrs",
};

// ---------- 4c. registrar_checkin_kr ----------
// Task #257 — registra um check-in completo de KR (valor + confiança +
// comentário) e atualiza o cache leve no próprio resultado-chave.
const registrarCheckinKrSchema = z.object({
  resultadoChaveId: z.string().min(8),
  valor: z.number().or(z.string()).transform((v) => Number(v)),
  confianca: z.enum(["verde", "amarelo", "vermelho"]),
  comentario: z.string().max(800).default(""),
});
type RegistrarCheckinKrParams = z.infer<typeof registrarCheckinKrSchema>;

const registrarCheckinKr: ToolDefinition<RegistrarCheckinKrParams> = {
  name: "registrar_checkin_kr",
  description:
    "Registra um CHECK-IN tático de Resultado-chave (KR): valor atual + nível de confiança em bater a meta (verde/amarelo/vermelho) + comentário curto. Use sempre que o usuário disser 'fizemos check-in', 'meta X está em risco', 'estamos no caminho', ou der atualização periódica de progresso. Diferente de atualizar_progresso_kr, este registra HISTÓRICO + sinal de risco.",
  paramsSchema: registrarCheckinKrSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["resultadoChaveId", "valor", "confianca"],
    properties: {
      resultadoChaveId: { type: "string", description: "ID real do KR (do CATÁLOGO)" },
      valor: { type: "number", description: "Valor medido agora" },
      confianca: {
        type: "string",
        enum: ["verde", "amarelo", "vermelho"],
        description: "verde = vai bater a meta, amarelo = atenção, vermelho = em risco",
      },
      comentario: { type: "string", description: "Resumo curto do que mudou e próximo passo" },
    },
  },
  preview: (p) => ({
    titulo: "Registrar check-in do KR",
    descricao: p.comentario || "Registrar valor atual + nível de confiança no KR indicado.",
    campos: [
      { label: "KR", valor: p.resultadoChaveId },
      { label: "Valor atual", valor: String(p.valor) },
      { label: "Confiança", valor: p.confianca },
    ],
    ctaConfirmar: "Registrar check-in",
    ctaIgnorar: "Cancelar",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const kr = await storage.getResultadoChaveById(p.resultadoChaveId, ctx.empresaId);
    if (!kr) throw new Error("KR não encontrado nesta empresa.");
    const checkin = await storage.createKrCheckin({
      krId: p.resultadoChaveId,
      empresaId: ctx.empresaId,
      valor: String(p.valor),
      confianca: p.confianca,
      comentario: p.comentario || null,
      autorId: ctx.usuarioId ?? null,
    });
    const updated = await storage.updateResultadoChave(p.resultadoChaveId, ctx.empresaId, {
      valorAtual: String(p.valor),
      confiancaAtual: p.confianca,
      ultimoCheckinEm: new Date(),
      ultimoCheckinComentario: p.comentario || null,
    });
    return {
      resumo: `Check-in registrado em "${updated.metrica}" — valor ${updated.valorAtual}, confiança ${p.confianca}.`,
      dados: { krId: updated.id, checkinId: checkin.id, confianca: p.confianca },
      rota: "/okrs",
      entidadeTipo: "resultado_chave",
      entidadeId: updated.id,
    };
  },
  formRota: "/okrs",
};

// ---------- 4d. revisar_qualidade_kr ----------
// Task #257 — revisa um KR (existente ou rascunho) procurando os 4 problemas
// mais comuns: parece_tarefa, sem_metrica, sem_prazo, vago. Não muda dados;
// devolve veredito + sugestão.
const revisarQualidadeKrSchema = z.object({
  resultadoChaveId: z.string().min(8).optional(),
  metrica: z.string().max(400).optional(),
  valorInicial: z.union([z.number(), z.string()]).optional(),
  valorAlvo: z.union([z.number(), z.string()]).optional(),
  prazo: z.string().max(80).optional(),
});
type RevisarQualidadeKrParams = z.infer<typeof revisarQualidadeKrSchema>;

const revisarQualidadeKr: ToolDefinition<RevisarQualidadeKrParams> = {
  name: "revisar_qualidade_kr",
  description:
    "Revisa a QUALIDADE de um Resultado-chave (KR) — identifica se está mal formulado: parece_tarefa, sem_metrica, sem_prazo ou vago. Use ANTES de criar/editar um KR, ou quando o usuário pedir 'esse KR está bom?'. Aceita id de um KR existente OU os campos brutos do rascunho. Não altera dados — devolve veredito e sugestão de reescrita.",
  paramsSchema: revisarQualidadeKrSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      resultadoChaveId: { type: "string", description: "ID real do KR existente (opcional)" },
      metrica: { type: "string" },
      valorInicial: { type: "number" },
      valorAlvo: { type: "number" },
      prazo: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Revisar qualidade do KR",
    descricao: "Análise rápida com IA — não altera nada, só sugere.",
    campos: [
      { label: "KR", valor: p.resultadoChaveId || p.metrica || "(rascunho)" },
    ],
    ctaConfirmar: "Revisar",
    ctaIgnorar: "Cancelar",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    let metrica = p.metrica || "";
    let valorInicial: string | number | undefined = p.valorInicial;
    let valorAlvo: string | number | undefined = p.valorAlvo;
    let prazo = p.prazo || "";
    if (p.resultadoChaveId) {
      const kr = await storage.getResultadoChaveById(p.resultadoChaveId, ctx.empresaId);
      if (!kr) throw new Error("KR não encontrado nesta empresa.");
      metrica = metrica || kr.metrica;
      valorInicial = valorInicial ?? kr.valorInicial;
      valorAlvo = valorAlvo ?? kr.valorAlvo;
      prazo = prazo || kr.prazo;
    }
    if (!metrica) throw new Error("Informe um KR existente (resultadoChaveId) ou pelo menos a métrica.");

    const empresa = await storage.getEmpresa(ctx.empresaId);
    const completion = await openai.chat.completions.create({
      model: getModelForPlan(empresa?.planoTipo, "relatorios"),
      messages: [
        {
          role: "system",
          content:
            "Você é um consultor estratégico que revisa Resultados-Chave (KRs) — a camada TÁTICA de execução de uma estratégia BSC. Um bom KR descreve um RESULTADO mensurável (não uma tarefa), tem métrica numérica clara, baseline → alvo, e prazo concreto.",
        },
        {
          role: "user",
          content:
            `Revise este KR:\n- Métrica: ${metrica}\n- Valor inicial: ${valorInicial ?? "(não informado)"}\n- Valor-alvo: ${valorAlvo ?? "(não informado)"}\n- Prazo: ${prazo || "(não informado)"}\n\n` +
            `Responda em JSON: {"veredito":"ok"|"precisa_ajuste","problemas":["parece_tarefa"|"sem_metrica"|"sem_prazo"|"vago"],"explicacao":"...","sugestaoMetrica":"...","sugestaoValorInicial":number|null,"sugestaoValorAlvo":number|null,"sugestaoPrazo":"..."}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    const resumo = parsed.veredito === "ok"
      ? "KR está bem formulado."
      : `Sugestão: ${parsed.explicacao || "ajustar formulação"}.`;
    return {
      resumo,
      dados: parsed,
      rota: "/okrs",
      entidadeTipo: "resultado_chave",
      entidadeId: p.resultadoChaveId,
    };
  },
  formRota: "/okrs",
};

// ---------- 5. criar_indicador ----------
const criarIndicadorSchema = z.object({
  perspectiva: z.enum(PERSPECTIVAS_INDICADOR).default("Finanças"),
  nome: z.string().min(3).max(200),
  meta: z.string().min(1).max(80),
  atual: z.string().min(1).max(80).default("0"),
  status: z.enum(["verde", "amarelo", "vermelho", "sem_dados"]).default("sem_dados"),
  owner: z.string().min(1).max(120),
});
type CriarIndicadorParams = z.infer<typeof criarIndicadorSchema>;

const criarIndicador: ToolDefinition<CriarIndicadorParams> = {
  name: "criar_indicador",
  description:
    "Cria um indicador (KPI) na empresa, vinculado a uma perspectiva do BSC. Use quando o usuário aprovar acompanhar uma nova métrica.",
  paramsSchema: criarIndicadorSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["perspectiva", "nome", "meta", "owner"],
    properties: {
      perspectiva: { type: "string", enum: [...PERSPECTIVAS_INDICADOR] },
      nome: { type: "string" },
      meta: { type: "string", description: "Meta numérica em string (ex.: '95', '100k')" },
      atual: { type: "string" },
      status: { type: "string", enum: ["verde", "amarelo", "vermelho", "sem_dados"] },
      owner: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: `Criar indicador: ${p.nome}`,
    descricao: `Acompanhar ${p.nome} na perspectiva ${p.perspectiva}.`,
    campos: [
      { label: "Perspectiva", valor: p.perspectiva },
      { label: "Meta", valor: p.meta },
      { label: "Atual", valor: p.atual },
      { label: "Owner", valor: p.owner },
    ],
    ctaConfirmar: "Criar indicador",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Task #335 — defesa em profundidade contra indicador duplicado.
    const dupInd = await buscarIndicadoresSimilares(ctx.empresaId, p.nome);
    if (dupInd.length > 0) {
      throw new EntidadeDuplicadaError("indicador (KPI)", dupInd);
    }
    const created = await storage.createIndicador({
      empresaId: ctx.empresaId,
      perspectiva: p.perspectiva,
      nome: p.nome,
      meta: p.meta,
      atual: p.atual,
      status: p.status,
      owner: p.owner,
    });
    return {
      resumo: `Indicador "${created.nome}" criado.`,
      dados: { id: created.id },
      rota: "/indicadores",
      entidadeTipo: "indicador",
      entidadeId: created.id,
    };
  },
  formRota: "/indicadores",
};

// ---------- 6. atualizar_valor_indicador ----------
const atualizarValorIndicadorSchema = z.object({
  indicadorId: z.string().min(8),
  valor: z.string().min(1).max(80),
  nota: z.string().max(400).default(""),
});
type AtualizarValorIndicadorParams = z.infer<typeof atualizarValorIndicadorSchema>;

const atualizarValorIndicador: ToolDefinition<AtualizarValorIndicadorParams> = {
  name: "atualizar_valor_indicador",
  description:
    "Registra uma nova leitura para um indicador (KPI). Atualiza o valor atual e cria histórico.",
  paramsSchema: atualizarValorIndicadorSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["indicadorId", "valor"],
    properties: {
      indicadorId: { type: "string" },
      valor: { type: "string" },
      nota: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Registrar leitura de indicador",
    descricao: p.nota || "Registrar nova medição do indicador selecionado.",
    campos: [
      { label: "Indicador", valor: p.indicadorId },
      { label: "Valor", valor: p.valor },
    ],
    ctaConfirmar: "Registrar leitura",
    ctaIgnorar: "Cancelar",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const indicador = await storage.getIndicador(p.indicadorId);
    if (!indicador || indicador.empresaId !== ctx.empresaId) {
      throw new Error("Indicador não encontrado nesta empresa.");
    }
    await storage.createLeitura({
      indicadorId: p.indicadorId,
      valor: p.valor,
      nota: p.nota || null,
      registradoPor: ctx.usuarioId ?? null,
    });
    await storage.updateIndicador(p.indicadorId, ctx.empresaId, { atual: p.valor });
    return {
      resumo: `Leitura registrada (${p.valor}) para ${indicador.nome}.`,
      dados: { indicadorId: p.indicadorId, valor: p.valor },
      rota: "/indicadores",
      entidadeTipo: "kpi_leitura",
      entidadeId: p.indicadorId,
    };
  },
  formRota: "/indicadores",
  statusLabel: "Registrando leitura do KPI…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const ind = await storage.getIndicador(p.indicadorId);
      if (!ind || ind.empresaId !== ctx.empresaId) return preview;
      const before: Record<string, { raw: string | null | undefined; numeric?: boolean }> = {
        "Valor": { raw: (ind as { atual?: string | null }).atual ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

// ---------- 7. navegar_para ----------
const navegarParaSchema = z.object({
  rota: z.enum(ROTAS_VALIDAS),
  motivo: z.string().max(200).default(""),
});
type NavegarParaParams = z.infer<typeof navegarParaSchema>;

const navegarPara: ToolDefinition<NavegarParaParams> = {
  name: "navegar_para",
  description:
    "Sugere abrir uma página específica do app. Use quando a melhor próxima ação for revisar uma área (sem mexer em dados).",
  paramsSchema: navegarParaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["rota"],
    properties: {
      rota: { type: "string", enum: [...ROTAS_VALIDAS] },
      motivo: { type: "string", description: "Por que ir até essa página" },
    },
  },
  preview: (p) => ({
    titulo: `Abrir ${p.rota}`,
    descricao: p.motivo || "Abrir esta página para revisar.",
    campos: [{ label: "Rota", valor: p.rota }],
    ctaConfirmar: "Abrir agora",
    ctaIgnorar: "Mais tarde",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p) => {
    return {
      resumo: `Navegar para ${p.rota}.`,
      dados: { rota: p.rota },
      rota: p.rota,
      entidadeTipo: "navegacao",
      entidadeId: p.rota,
    };
  },
  // formRota é usado pelo botão "Ajustar". Para navegar_para não há formulário
  // a pré-preencher; mandamos o usuário para a própria rota sugerida.
  formRota: "/",
};

// ---------- 8. abrir_entidade ----------
// Task #202 — Permite ao agente abrir DIRETAMENTE o modal de edição de uma
// entidade existente (indicador, iniciativa, OKR, KR, risco, oportunidade,
// estratégia) usando deep link `?editar=<id>`. Diferente de navegar_para
// (que leva à página inteira), esta tool já abre o item específico.
// Task #287 — Constantes do BMC (declaradas cedo por serem usadas em abrir_entidade).
const BLOCOS_BMC = [
  "segmentos_clientes",
  "proposta_valor",
  "canais",
  "relacionamento_clientes",
  "fontes_receita",
  "recursos_principais",
  "atividades_principais",
  "parcerias_principais",
  "estrutura_custos",
] as const;
const BLOCO_BMC_LABEL: Record<typeof BLOCOS_BMC[number], string> = {
  segmentos_clientes: "Segmentos de Clientes",
  proposta_valor: "Proposta de Valor",
  canais: "Canais",
  relacionamento_clientes: "Relacionamento com Clientes",
  fontes_receita: "Fontes de Receita",
  recursos_principais: "Recursos Principais",
  atividades_principais: "Atividades Principais",
  parcerias_principais: "Parcerias Principais",
  estrutura_custos: "Estrutura de Custos",
};

const TIPOS_ABRIR_ENTIDADE = [
  "indicador",
  "iniciativa",
  "objetivo",
  "kr",
  "risco",
  "oportunidade",
  "estrategia",
  "bmc",
  "cenario",
  "swot",
  "pestel",
  "forca",
] as const;

const TIPO_ROTA_ABRIR: Record<typeof TIPOS_ABRIR_ENTIDADE[number], string> = {
  indicador:    "/indicadores",
  iniciativa:   "/iniciativas",
  objetivo:     "/okrs",
  kr:           "/okrs",
  risco:        "/riscos",
  oportunidade: "/oportunidades-crescimento",
  estrategia:   "/estrategias",
  bmc:          "/modelo-negocio",
  cenario:      "/cenarios",
  swot:         "/swot",
  pestel:       "/pestel",
  forca:        "/cinco-forcas",
};

const TIPO_LABEL_ABRIR: Record<typeof TIPOS_ABRIR_ENTIDADE[number], string> = {
  indicador:    "indicador",
  iniciativa:   "iniciativa",
  objetivo:     "objetivo (OKR)",
  kr:           "resultado-chave",
  risco:        "risco",
  oportunidade: "oportunidade de crescimento",
  estrategia:   "estratégia",
  bmc:          "bloco do BMC",
  cenario:      "cenário",
  swot:         "item SWOT",
  pestel:       "fator PESTEL",
  forca:        "força de Porter",
};

const abrirEntidadeSchema = z.object({
  tipo: z.enum(TIPOS_ABRIR_ENTIDADE),
  id: z.string().min(8),
  nome: z.string().max(200).default(""),
});
type AbrirEntidadeParams = z.infer<typeof abrirEntidadeSchema>;

async function resolverNomeEntidade(
  tipo: typeof TIPOS_ABRIR_ENTIDADE[number],
  id: string,
  empresaId: string,
): Promise<{ ok: boolean; nome: string; objetivoId?: string }> {
  try {
    switch (tipo) {
      case "indicador": {
        const e = await storage.getIndicador(id);
        if (!e || e.empresaId !== empresaId) return { ok: false, nome: "" };
        return { ok: true, nome: e.nome };
      }
      case "iniciativa": {
        const e = await storage.getIniciativa(id);
        if (!e || e.empresaId !== empresaId) return { ok: false, nome: "" };
        return { ok: true, nome: e.titulo };
      }
      case "objetivo": {
        const objs = await storage.getObjetivos(empresaId);
        const e = objs.find((o) => o.id === id);
        if (!e) return { ok: false, nome: "" };
        return { ok: true, nome: e.titulo };
      }
      case "kr": {
        const objs = await storage.getObjetivos(empresaId);
        for (const o of objs) {
          const krs = await storage.getResultadosChave(o.id, empresaId);
          const k = krs.find((x) => x.id === id);
          if (k) return { ok: true, nome: k.metrica, objetivoId: o.id };
        }
        return { ok: false, nome: "" };
      }
      case "risco": {
        const lista = await storage.getRiscos(empresaId);
        const e = lista.find((x) => x.id === id);
        if (!e) return { ok: false, nome: "" };
        return { ok: true, nome: e.descricao ?? "Risco" };
      }
      case "oportunidade": {
        const e = await storage.getOportunidadeCrescimento(id);
        if (!e || e.empresaId !== empresaId) return { ok: false, nome: "" };
        return { ok: true, nome: e.titulo ?? "Oportunidade" };
      }
      case "estrategia": {
        const e = await storage.getEstrategia(id);
        if (!e || e.empresaId !== empresaId) return { ok: false, nome: "" };
        return { ok: true, nome: e.titulo };
      }
      case "swot": {
        const lista = await storage.getAnaliseSwot(empresaId);
        const e = lista.find((x) => x.id === id);
        if (!e) return { ok: false, nome: "" };
        return { ok: true, nome: `[${e.tipo}] ${e.descricao.slice(0, 80)}` };
      }
      case "pestel": {
        const lista = await storage.getFatoresPestel(empresaId);
        const e = lista.find((x) => x.id === id);
        if (!e) return { ok: false, nome: "" };
        return { ok: true, nome: `[${e.tipo}] ${e.descricao.slice(0, 80)}` };
      }
      case "forca": {
        const lista = await storage.getCincoForcas(empresaId);
        const e = lista.find((x) => x.id === id);
        if (!e) return { ok: false, nome: "" };
        return { ok: true, nome: e.forca };
      }
      case "bmc": {
        const blocos = await storage.getModeloNegocio(empresaId);
        const e = blocos.find((b) => b.id === id);
        if (!e) return { ok: false, nome: "" };
        const label = BLOCO_BMC_LABEL[e.bloco as typeof BLOCOS_BMC[number]] ?? e.bloco;
        return { ok: true, nome: `BMC — ${label}` };
      }
      case "cenario": {
        const lista = await storage.getCenarios(empresaId);
        const e = lista.find((c) => c.id === id);
        if (!e) return { ok: false, nome: "" };
        return { ok: true, nome: e.titulo };
      }
    }
  } catch {
    return { ok: false, nome: "" };
  }
  return { ok: false, nome: "" };
}

const abrirEntidade: ToolDefinition<AbrirEntidadeParams> = {
  name: "abrir_entidade",
  description:
    "Abre DIRETAMENTE o cadastro/modal de edição de uma entidade já existente (indicador, iniciativa, OKR, KR, risco, oportunidade, estratégia). Use quando o usuário pedir para 'abrir', 'editar' ou 'ajustar' um item específico que aparece no '## CATÁLOGO'. Prefira esta tool a navegar_para sempre que houver um id conhecido. Se o usuário já forneceu o novo valor, use a tool de atualização específica em vez desta.",
  paramsSchema: abrirEntidadeSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["tipo", "id"],
    properties: {
      tipo: { type: "string", enum: [...TIPOS_ABRIR_ENTIDADE] },
      id:   { type: "string", description: "ID exato da entidade conforme o ## CATÁLOGO." },
      nome: { type: "string", description: "Nome legível da entidade (opcional, melhora a preview)." },
    },
  },
  preview: (p) => ({
    titulo: `Abrir ${TIPO_LABEL_ABRIR[p.tipo]}${p.nome ? `: ${p.nome}` : ""}`,
    descricao: `Abrir o ${TIPO_LABEL_ABRIR[p.tipo]} para edição.`,
    campos: [
      { label: "Tipo", valor: TIPO_LABEL_ABRIR[p.tipo] },
      ...(p.nome ? [{ label: "Item", valor: p.nome }] : []),
    ],
    ctaConfirmar: "Abrir agora",
    ctaIgnorar: "Mais tarde",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const resolvido = await resolverNomeEntidade(p.tipo, p.id, ctx.empresaId);
    if (!resolvido.ok) {
      throw new Error(`${TIPO_LABEL_ABRIR[p.tipo]} não encontrado(a) nesta empresa.`);
    }
    const rotaBase = TIPO_ROTA_ABRIR[p.tipo];
    const usp = new URLSearchParams({ editar: p.id });
    if (p.tipo === "kr") {
      usp.set("tipo", "kr");
      if (resolvido.objetivoId) usp.set("objetivoId", resolvido.objetivoId);
    }
    const rota = `${rotaBase}?${usp.toString()}`;
    const entidadeTipo: EntidadeTipo =
      p.tipo === "indicador" ? "indicador" :
      p.tipo === "iniciativa" ? "iniciativa" :
      p.tipo === "objetivo" ? "objetivo" :
      p.tipo === "kr" ? "resultado_chave" :
      p.tipo === "risco" ? "risco" :
      p.tipo === "oportunidade" ? "oportunidade_crescimento" :
      p.tipo === "bmc" ? "modelo_negocio" :
      p.tipo === "cenario" ? "cenario" :
      p.tipo === "swot" ? "swot" :
      p.tipo === "pestel" ? "fator_pestel" :
      p.tipo === "forca" ? "cinco_forcas" :
      "estrategia";
    return {
      resumo: `Abrindo ${TIPO_LABEL_ABRIR[p.tipo]}: ${resolvido.nome}.`,
      dados: { tipo: p.tipo, id: p.id, rota },
      rota,
      entidadeTipo,
      entidadeId: p.id,
    };
  },
  formRota: "/",
};

// ─── Task #189 — Tools de gerenciamento de plano agêntico ───
// O agente usa estas tools para abrir / encerrar planos multi-passo.
// Continuam HITL: a "criação" do plano também precisa de aprovação humana.

// Task #317 — Cada passo do plano agora tem um `tipo` que controla como o
// chat o renderiza:
//   - 'mensagem': fala curta do Bizzy (auto-avança ~1.5s, sem proposta).
//   - 'link': botão que leva o usuário para uma rota (também auto-avança).
//   - 'acao': proposta HITL gerada pela tool executora correspondente.
// `linkAlvo` é obrigatório quando `tipo === 'link'` e ignorado nos demais.
const passoPlanoSchema = z.object({
  ordem: z.number().int().min(1).max(20),
  titulo: z.string().min(2).max(160),
  descricao: z.string().max(400).default(""),
  tipo: z.enum(["mensagem", "link", "acao"]).default("acao"),
  linkAlvo: z.string().max(200).nullable().optional(),
}).superRefine((p, ctx) => {
  if (p.tipo === "link" && (!p.linkAlvo || !p.linkAlvo.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "linkAlvo é obrigatório quando tipo='link'", path: ["linkAlvo"] });
  }
});

const criarPlanoAgenticoSchema = z.object({
  titulo: z.string().min(3).max(160),
  objetivo: z.string().min(3).max(600),
  passos: z.array(passoPlanoSchema).min(2).max(8),
});
type CriarPlanoAgenticoParams = z.infer<typeof criarPlanoAgenticoSchema>;

const criarPlanoAgentico: ToolDefinition<CriarPlanoAgenticoParams> = {
  name: "criar_plano_agentico",
  description:
    "Cria um PLANO AGÊNTICO multi-passo: usado quando o objetivo do usuário é grande e exige uma sequência de ações (ex.: \"montar plano completo de retomada de vendas\"). Quebre em 2 a 8 passos curtos e ordenados; cada passo será proposto e confirmado individualmente depois. NÃO use esta tool para ações isoladas — use a ferramenta executora direta.",
  paramsSchema: criarPlanoAgenticoSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["titulo", "objetivo", "passos"],
    properties: {
      titulo: { type: "string", description: "Nome curto do plano (até 80 chars)." },
      objetivo: { type: "string", description: "O que este plano busca alcançar." },
      passos: {
        type: "array",
        minItems: 2,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["ordem", "titulo", "tipo"],
          properties: {
            ordem: { type: "integer", minimum: 1, maximum: 20 },
            titulo: { type: "string" },
            descricao: { type: "string" },
            // Task #317 — controla como o chat humaniza o passo.
            tipo: {
              type: "string",
              enum: ["mensagem", "link", "acao"],
              description:
                "'mensagem' = só uma fala curta do Bizzy (sem CTA); 'link' = botão que abre uma rota do app; 'acao' = proposta HITL com tool executora.",
            },
            linkAlvo: {
              type: "string",
              description:
                "Rota interna a abrir (ex.: '/iniciativas', '/okrs'). Obrigatório quando tipo='link', ignorado caso contrário.",
            },
          },
        },
      },
    },
  },
  preview: (p) => ({
    titulo: `Plano: ${p.titulo}`,
    descricao: p.objetivo,
    campos: p.passos
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((s) => {
        // Task #317 — sinaliza visualmente o tipo do passo no preview.
        const tag = s.tipo === "mensagem" ? "[mensagem] " : s.tipo === "link" ? "[link] " : "[ação] ";
        const sufixo = s.tipo === "link" && s.linkAlvo ? ` → ${s.linkAlvo}` : "";
        return { label: `Passo ${s.ordem}`, valor: `${tag}${s.titulo}${sufixo}` };
      }),
    ctaConfirmar: "Iniciar plano",
    ctaIgnorar: "Não agora",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Garante 1 plano ativo por usuário+empresa: cancela o anterior, se houver.
    const existente = await storage.getPlanoAtivoEmpresaUsuario(ctx.empresaId, ctx.usuarioId ?? null);
    if (existente) {
      await storage.updatePlanoAgentico(existente.id, {
        status: "cancelado",
        finalizadoEm: new Date(),
      });
    }
    // Task #199 — também cancela plano ativo de outro membro do time / plano
    // compartilhado, já que o preview HITL avisou explicitamente que isso
    // aconteceria. Sem esse cancelamento, o índice único parcial do shared
    // plan ainda permitiria coexistência, mas o aviso ficaria mentiroso.
    const outro = await storage.getPlanoAtivoEmpresaDeOutros(ctx.empresaId, ctx.usuarioId ?? null);
    if (outro && outro.plano.id !== existente?.id) {
      await storage.updatePlanoAgentico(outro.plano.id, {
        status: "cancelado",
        finalizadoEm: new Date(),
      });
    }
    const passosOrdenados = p.passos
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((s, idx) => ({
        ordem: idx + 1, // re-normaliza
        titulo: s.titulo,
        descricao: s.descricao ?? "",
        status: "pendente" as const,
        // Task #317 — persiste tipo + linkAlvo para o chat humanizar a execução.
        tipo: s.tipo ?? "acao",
        linkAlvo: s.tipo === "link" ? (s.linkAlvo ?? null) : null,
      }));
    let plano;
    try {
      ({ plano } = await storage.createPlanoAgentico(
        {
          empresaId: ctx.empresaId,
          usuarioId: ctx.usuarioId ?? null,
          titulo: p.titulo,
          objetivo: p.objetivo,
          status: "ativo",
          origem: "chat",
          totalPassos: passosOrdenados.length,
          passoAtual: 1,
        },
        passosOrdenados,
      ));
    } catch (err) {
      // Task #190 — outro request paralelo já criou o plano ativo. Mostra
      // mensagem clara para o usuário em vez de quebrar a conversa.
      if (err instanceof PlanoAtivoJaExisteError) {
        throw new Error(
          "Já existe um plano agêntico ativo para você nesta empresa. Conclua ou cancele o plano atual antes de iniciar outro.",
        );
      }
      throw err;
    }
    return {
      resumo: `Plano "${plano.titulo}" iniciado (${passosOrdenados.length} passos).`,
      dados: { planoId: plano.id, totalPassos: passosOrdenados.length },
      rota: "/dashboard",
      entidadeTipo: "navegacao",
      entidadeId: plano.id,
    };
  },
  formRota: "/dashboard",
};

const concluirPlanoAgenticoSchema = z.object({
  planoId: z.string().min(8),
  resumo: z.string().max(400).default(""),
});
type ConcluirPlanoAgenticoParams = z.infer<typeof concluirPlanoAgenticoSchema>;

const concluirPlanoAgentico: ToolDefinition<ConcluirPlanoAgenticoParams> = {
  name: "concluir_plano_agentico",
  description:
    "Marca um plano agêntico como CONCLUÍDO quando todos os passos relevantes foram executados. Use somente quando os objetivos do plano foram cumpridos.",
  paramsSchema: concluirPlanoAgenticoSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["planoId"],
    properties: {
      planoId: { type: "string" },
      resumo: { type: "string", description: "Resumo curto do que foi entregue." },
    },
  },
  preview: (p) => ({
    titulo: "Concluir plano agêntico",
    descricao: p.resumo || "Marcar este plano como concluído.",
    campos: [{ label: "Plano", valor: p.planoId }],
    ctaConfirmar: "Concluir plano",
    ctaIgnorar: "Manter aberto",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const plano = await storage.getPlanoAgentico(p.planoId);
    if (!plano || plano.empresaId !== ctx.empresaId) {
      throw new Error("Plano não encontrado nesta empresa.");
    }
    if (plano.usuarioId && ctx.usuarioId && plano.usuarioId !== ctx.usuarioId) {
      throw new Error("Apenas o dono do plano pode concluí-lo.");
    }
    if (plano.status !== "ativo") {
      throw new Error(`Plano já está ${plano.status}.`);
    }
    const atualizado = await storage.updatePlanoAgentico(p.planoId, {
      status: "concluido",
      finalizadoEm: new Date(),
    });
    return {
      resumo: `Plano "${atualizado.titulo}" concluído.`,
      dados: { planoId: p.planoId },
      rota: "/dashboard",
      entidadeTipo: "navegacao",
      entidadeId: p.planoId,
    };
  },
  formRota: "/dashboard",
};

const cancelarPlanoAgenticoSchema = z.object({
  planoId: z.string().min(8),
  motivo: z.string().max(400).default(""),
});
type CancelarPlanoAgenticoParams = z.infer<typeof cancelarPlanoAgenticoSchema>;

const cancelarPlanoAgentico: ToolDefinition<CancelarPlanoAgenticoParams> = {
  name: "cancelar_plano_agentico",
  description:
    "Cancela um plano agêntico em andamento. Use quando o usuário desistir do objetivo ou pedir para parar.",
  paramsSchema: cancelarPlanoAgenticoSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["planoId"],
    properties: {
      planoId: { type: "string" },
      motivo: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Cancelar plano agêntico",
    descricao: p.motivo || "Cancelar e arquivar este plano.",
    campos: [{ label: "Plano", valor: p.planoId }],
    ctaConfirmar: "Cancelar plano",
    ctaIgnorar: "Manter aberto",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const plano = await storage.getPlanoAgentico(p.planoId);
    if (!plano || plano.empresaId !== ctx.empresaId) {
      throw new Error("Plano não encontrado nesta empresa.");
    }
    if (plano.usuarioId && ctx.usuarioId && plano.usuarioId !== ctx.usuarioId) {
      throw new Error("Apenas o dono do plano pode cancelá-lo.");
    }
    if (plano.status !== "ativo") {
      throw new Error(`Plano já está ${plano.status}.`);
    }
    const atualizado = await storage.updatePlanoAgentico(p.planoId, {
      status: "cancelado",
      finalizadoEm: new Date(),
    });
    return {
      resumo: `Plano "${atualizado.titulo}" cancelado.`,
      dados: { planoId: p.planoId },
      rota: "/dashboard",
      entidadeTipo: "navegacao",
      entidadeId: p.planoId,
    };
  },
  formRota: "/dashboard",
};

// ---------- Task #234 — Tools de memória manual ----------
// Mesmo enum usado pelo extrator automático (server/memory-extractor.ts).
const CATEGORIAS_MEMORIA = [
  "decisao",
  "prioridade",
  "hipotese",
  "restricao",
  "contexto",
] as const;
const CATEGORIA_MEMORIA_LABEL: Record<typeof CATEGORIAS_MEMORIA[number], string> = {
  decisao: "Decisão",
  prioridade: "Prioridade",
  hipotese: "Hipótese",
  restricao: "Restrição",
  contexto: "Contexto",
};

const registrarFatoManualmenteSchema = z.object({
  fato: z.string().min(5).max(280),
  categoria: z.enum(CATEGORIAS_MEMORIA),
});
type RegistrarFatoManualmenteParams = z.infer<typeof registrarFatoManualmenteSchema>;

const registrarFatoManualmente: ToolDefinition<RegistrarFatoManualmenteParams> = {
  name: "registrar_fato_manualmente",
  description:
    "Registra IMEDIATAMENTE um fato na memória persistente do assistente, sem esperar o extrator automático. Use quando o usuário disser explicitamente 'lembre que…', 'guarda isso', 'fica registrado que…', 'anota aí que…' ou equivalente. O fato passa a aparecer no bloco 'O QUE VOCÊ JÁ APRENDEU SOBRE ESTA EMPRESA' nas próximas conversas.",
  paramsSchema: registrarFatoManualmenteSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["fato", "categoria"],
    properties: {
      fato: {
        type: "string",
        description: "Texto curto e autocontido do fato a lembrar (5–280 caracteres). Reescreva na 3ª pessoa ('a empresa decidiu…') quando fizer sentido.",
      },
      categoria: {
        type: "string",
        enum: [...CATEGORIAS_MEMORIA],
        description: "decisao | prioridade | hipotese | restricao | contexto.",
      },
    },
  },
  preview: (p) => ({
    titulo: "Registrar na memória do assistente",
    descricao: `Vou lembrar: «${p.fato}» (categoria: ${CATEGORIA_MEMORIA_LABEL[p.categoria]}).`,
    campos: [
      { label: "Categoria", valor: CATEGORIA_MEMORIA_LABEL[p.categoria] },
      { label: "Fato", valor: p.fato },
    ],
    ctaConfirmar: "Salvar na memória",
    ctaIgnorar: "Não salvar",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Best-effort: tenta vincular à última mensagem do usuário na conversa
    // ativa. Se não houver, persiste sem fonte.
    let fonteMensagemId: string | null = null;
    try {
      const conversa = await storage.getConversaAtiva(ctx.empresaId, ctx.usuarioId ?? null, 12);
      if (conversa) {
        const msgs = await storage.getMensagens(conversa.id, 10);
        const ultimaUser = [...msgs].reverse().find((m) => m.role === "user");
        if (ultimaUser) fonteMensagemId = ultimaUser.id;
      }
    } catch {
      /* fonte é opcional — segue sem ela */
    }
    const row = await storage.upsertMemoria(ctx.empresaId, p.fato, p.categoria, fonteMensagemId);
    return {
      resumo: `Fato registrado na memória (${CATEGORIA_MEMORIA_LABEL[p.categoria]}).`,
      dados: { id: row.id, categoria: row.categoria },
      rota: "/equipe?aba=memoria",
    };
  },
  formRota: "/equipe?aba=memoria",
};

const esquecerFatoSchema = z.object({
  fatoId: z.string().min(8),
  // Texto do fato apenas para o preview HITL — copie literalmente do bloco
  // "O QUE VOCÊ JÁ APRENDEU…" do contexto. Não muda o que será desativado.
  fato: z.string().max(280).optional(),
});
type EsquecerFatoParams = z.infer<typeof esquecerFatoSchema>;

const esquecerFato: ToolDefinition<EsquecerFatoParams> = {
  name: "esquecer_fato",
  description:
    "Desativa um fato da memória persistente (ele continua no banco para auditoria, mas para de entrar no system prompt). Use quando o usuário disser 'isso mudou', 'esquece esse fato', 'esse fato não vale mais', 'remove da memória'. Identifique o fatoId pelo ID listado no bloco 'O QUE VOCÊ JÁ APRENDEU SOBRE ESTA EMPRESA' do contexto e copie o texto do fato no campo 'fato' para que o usuário veja exatamente o que vai esquecer.",
  paramsSchema: esquecerFatoSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["fatoId"],
    properties: {
      fatoId: {
        type: "string",
        description: "ID do fato a desativar — use o id mostrado no bloco de memória do contexto.",
      },
      fato: {
        type: "string",
        description: "Texto do fato (copie literalmente do bloco de memória). Aparece no preview de confirmação para o usuário ter certeza do que está esquecendo.",
      },
    },
  },
  preview: (p) => ({
    titulo: "Esquecer fato da memória",
    descricao: p.fato
      ? `Vou desativar: «${p.fato}». O fato deixará de ser usado nas próximas conversas (continua no histórico para auditoria).`
      : "O fato será desativado e deixará de ser usado nas próximas conversas. Você pode reativá-lo depois em Equipe → Memória do Assistente.",
    campos: [
      ...(p.fato ? [{ label: "Fato", valor: p.fato }] : []),
      { label: "ID do fato", valor: p.fatoId },
    ],
    ctaConfirmar: "Esquecer fato",
    ctaIgnorar: "Manter",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const atual = await storage.getMemoriaById(p.fatoId, ctx.empresaId);
    if (!atual) {
      throw new Error("Fato não encontrado nesta empresa.");
    }
    if (!atual.ativo) {
      return {
        resumo: "Esse fato já estava desativado.",
        dados: { id: atual.id },
        rota: "/equipe?aba=memoria",
      };
    }
    const row = await storage.setMemoriaAtivo(p.fatoId, ctx.empresaId, false);
    return {
      resumo: `Fato desativado: «${(row?.fato ?? atual.fato).slice(0, 80)}».`,
      dados: { id: atual.id },
      rota: "/equipe?aba=memoria",
    };
  },
  formRota: "/equipe?aba=memoria",
};

// ─── Task #203 — Lookup tool: buscar_entidade_por_nome ───
// Diferente das tools acima, esta NÃO é HITL (não vira proposta).
// O modelo a chama em uma rodada intermediária para resolver pelo nome um
// item que ficou fora do "## CATÁLOGO" (limite 30 por tipo). O handler do
// /api/ai/assistente executa imediatamente e devolve os matches ao modelo,
// que então decide se chama abrir_entidade/atualizar_* com o id encontrado
// ou pergunta ao usuário em caso de ambiguidade.
const TIPOS_BUSCA_NOME = [
  "indicador",
  "iniciativa",
  "objetivo",
  "kr",
  "risco",
  "oportunidade",
  "estrategia",
  // Task #293 — diagnóstico externo: itens citados por descrição/título livre
  // que não aparecem no CATÁLOGO. As tools de SWOT/PESTEL/5 Forças exigem
  // ids reais (swotId, pestelId, forcaId), por isso o agente precisa
  // resolver pelo nome antes de atualizar/arquivar.
  "swot",
  "pestel",
  "forca",
] as const;
export type TipoBuscaNome = typeof TIPOS_BUSCA_NOME[number];

const buscarEntidadePorNomeSchema = z.object({
  tipo: z.enum(TIPOS_BUSCA_NOME),
  termo: z.string().min(1).max(120),
});
export type BuscarEntidadePorNomeParams = z.infer<typeof buscarEntidadePorNomeSchema>;

export interface BuscaEntidadeMatch {
  id: string;
  nome: string;
  contexto?: string;
  objetivoId?: string;
}

function normalizar(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Task #206 — Dicionário de sinônimos e abreviações comuns de gestão.
// Cada grupo lista termos tratados como equivalentes na busca por nome.
// Todos os termos são escritos JÁ normalizados (minúsculo, sem acento).
// Para multi-palavra, o casamento exige que o termo apareça como sequência
// completa de palavras no nome (não dentro de outra palavra).
const SINONIMOS: ReadonlyArray<ReadonlyArray<string>> = [
  ["cac", "custo de aquisicao de cliente", "custo de aquisicao de clientes", "customer acquisition cost"],
  ["mrr", "receita recorrente mensal", "monthly recurring revenue"],
  ["arr", "receita recorrente anual", "annual recurring revenue"],
  ["ltv", "lifetime value", "valor vitalicio do cliente", "valor do tempo de vida do cliente"],
  ["nps", "net promoter score"],
  ["roi", "retorno sobre investimento"],
  ["roas", "retorno sobre investimento em anuncios", "return on ad spend"],
  ["churn", "taxa de cancelamento", "taxa de evasao", "churn rate"],
  ["ticket medio", "valor medio de pedido", "average order value", "aov"],
  ["taxa de conversao", "conversao", "conversion rate"],
  ["okr", "objetivos e resultados chave", "objetivo e resultado chave"],
  ["kpi", "indicador chave de desempenho", "indicador-chave de desempenho"],
  ["ebitda", "lucro antes de juros impostos depreciacao e amortizacao"],
  ["b2b", "business to business"],
  ["b2c", "business to consumer"],
  ["sla", "acordo de nivel de servico", "service level agreement"],
  ["cpa", "custo por aquisicao"],
  ["cpc", "custo por clique"],
  ["cpm", "custo por mil"],
  ["ctr", "taxa de cliques", "click through rate"],
  ["mvp", "produto minimo viavel"],
  ["faq", "perguntas frequentes"],
  ["rh", "recursos humanos"],
  ["ti", "tecnologia da informacao"],
  ["p&d", "pd", "pesquisa e desenvolvimento", "r&d"],
  ["mql", "lead qualificado por marketing"],
  ["sql lead", "lead qualificado por vendas"],
  ["pdca", "planejar fazer checar agir"],
  ["bsc", "balanced scorecard"],
  ["swot", "fofa", "forcas oportunidades fraquezas ameacas"],
  ["margem de lucro", "lucratividade", "margem liquida"],
  ["fluxo de caixa", "cash flow"],
];

// Levenshtein limitado — usado só como fallback para detectar typos pequenos.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  if (Math.abs(al - bl) > 3) return 99;
  const v0 = Array.from({ length: bl + 1 }, (_, i) => i);
  const v1 = new Array<number>(bl + 1).fill(0);
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v0[bl];
}

// Verifica se `termo` aparece como sequência completa de palavras em `s`
// (já normalizados). Ex.: "cac" casa em "novo cac mensal", mas não em "vacao".
function contemPalavraOuFrase(s: string, termo: string): boolean {
  if (!termo) return false;
  return ` ${s} `.includes(` ${termo} `);
}

// Gera variantes de uma string substituindo termos conhecidos por seus
// sinônimos/abreviações. A string de entrada já deve estar normalizada.
function expandirSinonimos(s: string): string[] {
  const variantes = new Set<string>([s]);
  for (const grupo of SINONIMOS) {
    for (const termo of grupo) {
      if (!contemPalavraOuFrase(s, termo)) continue;
      for (const outro of grupo) {
        if (outro === termo) continue;
        // substitui ocorrências como palavra inteira
        const padded = ` ${s} `.split(` ${termo} `).join(` ${outro} `);
        variantes.add(padded.slice(1, -1));
        // adiciona o próprio sinônimo isolado, útil quando o termo do
        // usuário é apenas a abreviação (ex.: "cac").
        variantes.add(outro);
      }
    }
  }
  return Array.from(variantes);
}

function scoreMatch(nome: string, termo: string): number {
  const n = normalizar(nome);
  const t = normalizar(termo);
  if (!n || !t) return 0;

  const variantesT = expandirSinonimos(t);
  const variantesN = expandirSinonimos(n);

  let melhor = 0;
  for (const tv of variantesT) {
    for (const nv of variantesN) {
      if (!tv) continue;
      if (nv === tv) {
        melhor = Math.max(melhor, 100);
      } else if (nv.startsWith(`${tv} `)) {
        melhor = Math.max(melhor, 80);
      } else if (contemPalavraOuFrase(nv, tv)) {
        melhor = Math.max(melhor, 70);
      } else if (nv.includes(tv)) {
        melhor = Math.max(melhor, 60);
      }
    }
  }
  if (melhor >= 60) return melhor;

  // Fallback por tokens, tolerando typos pequenos (1-2 caracteres).
  const tokensT = t.split(" ").filter((x) => x.length >= 3);
  if (!tokensT.length) return melhor;
  const tokensN = n.split(" ").filter(Boolean);
  const setN = new Set(tokensN);
  let hits = 0;
  for (const tk of tokensT) {
    if (setN.has(tk) || n.includes(tk)) {
      hits++;
      continue;
    }
    const tolerancia = tk.length <= 4 ? 1 : 2;
    const achouTypo = tokensN.some((ntk) => {
      if (Math.abs(ntk.length - tk.length) > tolerancia) return false;
      return levenshtein(ntk, tk) <= tolerancia;
    });
    if (achouTypo) hits++;
  }
  if (!hits) return melhor;
  return Math.max(melhor, Math.round((hits / tokensT.length) * 50));
}

export const LOOKUP_TOOLS_OPENAI = [
  {
    type: "function" as const,
    function: {
      name: "buscar_entidade_por_nome",
      description:
        "Busca itens existentes da empresa pelo NOME quando o id não está no '## CATÁLOGO' (que mostra apenas os 30 mais recentes). Use ANTES de propor abrir_entidade/atualizar_*/arquivar_* sempre que o usuário citar um item por nome/descrição e você não encontrar o id no catálogo. Cobre indicador, iniciativa, objetivo, kr, risco, oportunidade, estrategia, swot (item do quadrante FOFA — busca pela descrição), pestel (fator PESTEL — busca pela descrição) e forca (uma das 5 Forças de Porter — busca pelo nome canônico ou pela evidência). NÃO use para criar nada — só para descobrir o id de itens já existentes. Devolve até 5 candidatos {id, nome}; se vier mais de um próximo, pergunte ao usuário qual antes de agir.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["tipo", "termo"],
        properties: {
          tipo: {
            type: "string",
            enum: [...TIPOS_BUSCA_NOME],
            description: "Tipo de entidade a buscar.",
          },
          termo: {
            type: "string",
            description: "Trecho do nome citado pelo usuário (ex.: 'custo de produção').",
          },
        },
      },
    },
  },
];

export async function executarBuscaPorNome(
  rawArgs: unknown,
  ctx: ToolApplyContext,
): Promise<{ ok: true; matches: BuscaEntidadeMatch[]; tipo: TipoBuscaNome; termo: string } | { ok: false; mensagem: string }> {
  const parsed = buscarEntidadePorNomeSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { ok: false, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
  }
  const { tipo, termo } = parsed.data;
  const empresaId = ctx.empresaId;
  let candidatos: BuscaEntidadeMatch[] = [];
  try {
    switch (tipo) {
      case "indicador": {
        // Task #216 — busca de KPIs no acompanhamento devolve só BSC.
        // Diagnóstico inicial não aparece para o agente nesse contexto.
        const lista = await storage.getIndicadoresAcompanhamento(empresaId);
        candidatos = lista.map((i) => ({ id: i.id, nome: i.nome, contexto: i.perspectiva }));
        break;
      }
      case "iniciativa": {
        const lista = await storage.getIniciativas(empresaId);
        candidatos = lista.map((i) => ({ id: i.id, nome: i.titulo, contexto: i.status }));
        break;
      }
      case "objetivo": {
        const lista = await storage.getObjetivos(empresaId);
        candidatos = lista.map((o) => ({ id: o.id, nome: o.titulo, contexto: o.perspectiva }));
        break;
      }
      case "kr": {
        const objs = await storage.getObjetivos(empresaId);
        for (const o of objs) {
          const krs = await storage.getResultadosChave(o.id, empresaId);
          for (const k of krs) {
            candidatos.push({ id: k.id, nome: k.metrica, contexto: `do OKR "${o.titulo}"`, objetivoId: o.id });
          }
        }
        break;
      }
      case "risco": {
        const lista = await storage.getRiscos(empresaId);
        candidatos = lista.map((r) => ({ id: r.id, nome: r.descricao ?? "Risco", contexto: r.status }));
        break;
      }
      case "oportunidade": {
        const lista = await storage.getOportunidadesCrescimento(empresaId);
        candidatos = lista.map((o) => ({ id: o.id, nome: o.titulo ?? "Oportunidade", contexto: o.tipo }));
        break;
      }
      case "estrategia": {
        const lista = await storage.getEstrategias(empresaId);
        candidatos = lista.map((e) => ({ id: e.id, nome: e.titulo, contexto: e.tipo }));
        break;
      }
      // Task #293 — itens do SWOT/PESTEL/5 Forças não têm título curto: o
      // identificador humano é a própria descrição. Concatenamos o tipo
      // (quadrante/categoria/força) só no `contexto`, para a busca textual
      // ranquear pelo conteúdo livre que o usuário citou.
      case "swot": {
        const lista = await storage.getAnaliseSwot(empresaId);
        candidatos = lista.map((s) => ({
          id: s.id,
          nome: s.descricao,
          contexto: `quadrante: ${s.tipo}`,
        }));
        break;
      }
      case "pestel": {
        const lista = await storage.getFatoresPestel(empresaId);
        candidatos = lista.map((f) => ({
          id: f.id,
          nome: f.descricao,
          contexto: `categoria: ${f.tipo}`,
        }));
        break;
      }
      case "forca": {
        const lista = await storage.getCincoForcas(empresaId);
        candidatos = lista.map((f) => ({
          id: f.id,
          // As 5 forças são fixas — o "nome" canônico é o próprio nome da força
          // (rivalidade_concorrentes, etc.). Concatenamos a descrição para que
          // o usuário possa achar pelo texto da evidência também.
          nome: `${f.forca} — ${f.descricao}`,
          // IMPORTANTE: as tools executoras de Forças (atualizar_intensidade_forca,
          // adicionar_evidencia_forca) recebem a CHAVE CANÔNICA `forca`
          // (enum), não o UUID. O contexto deixa essa chave explícita para o
          // agente passar o valor correto após o lookup.
          contexto: `força canônica: ${f.forca} | intensidade: ${f.intensidade}`,
        }));
        break;
      }
    }
  } catch (err) {
    return { ok: false, mensagem: `Falha ao buscar ${tipo}: ${(err as Error).message.slice(0, 160)}` };
  }
  const ranked = candidatos
    .map((c) => ({ c, score: scoreMatch(c.nome, termo) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.c);
  return { ok: true, matches: ranked, tipo, termo };
}

// ---------- Task #230 — Read-only analysis tools (sem HITL) ----------
// Padrão idêntico ao de `buscar_entidade_por_nome`: o modelo chama, o
// servidor executa direto e devolve um payload pequeno como tool message.
// Não passam por `registrarProposta` e não viram PropostaCard.

const READONLY_TOOL_NAMES = [
  "analisar_indicador",
  "projetar_kr",
  "simular_impacto",
  "comparar_periodos",
  // Task #285 — Diagnóstico ativo do plano (read-only puras).
  "analisar_gap_meta_vs_realizado",
  "detectar_lacunas_cascata",
  "detectar_objetivos_descarrilados",
  "analisar_consistencia_estrategica",
  "sumarizar_ciclo_atual",
  // Task #289 — Memória de longo prazo
  "consultar_historico_estrategia",
  "consultar_resumo_ciclo",
] as const;
export type ReadonlyToolName = typeof READONLY_TOOL_NAMES[number];

export function isReadonlyTool(name: string): name is ReadonlyToolName {
  return (READONLY_TOOL_NAMES as readonly string[]).includes(name);
}

// --- analisar_indicador ---
const analisarIndicadorSchema = z.object({ indicadorId: z.string().min(8) });

// --- projetar_kr ---
const projetarKrSchema = z.object({ krId: z.string().min(8) });

// --- simular_impacto ---
const simularImpactoSchema = z.object({
  iniciativaId: z.string().min(8),
  mudanca: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("adiar_dias"), valor: z.number().int().min(1).max(720) }),
    z.object({ tipo: z.literal("cancelar") }),
    z.object({ tipo: z.literal("concluir") }),
  ]),
});

// --- consultar_historico_estrategia ---
const consultarHistoricoEstrategiaSchema = z.object({
  limite: z.number().int().min(1).max(20).optional(),
  tipo: z.enum(["trimestre", "objetivo", "estrategia", "iniciativa"]).optional(),
});

// --- consultar_resumo_ciclo ---
const consultarResumoCicloSchema = z.object({
  resumoId: z.string().min(8),
});

// --- comparar_periodos ---
const periodoSchema = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const compararPeriodosSchema = z.object({
  escopo: z.enum(["kpis", "iniciativas", "okrs", "tudo"]),
  periodoA: periodoSchema,
  periodoB: periodoSchema,
});

// --- Task #285: Diagnóstico ativo do plano ---
const analisarGapSchema = z.object({
  tipo: z.enum(["kpi", "kr", "objetivo"]),
  id: z.string().min(8),
});
const detectarLacunasCascataSchema = z.object({}).strict();
const detectarDescarriladosSchema = z.object({
  diasSemCheckin: z.number().int().min(1).max(365).optional(),
  pctMinimo: z.number().min(0).max(100).optional(),
}).strict();
const consistenciaEstrategicaSchema = z.object({}).strict();
const sumarizarCicloSchema = z.object({
  dataReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

export const READONLY_TOOLS_OPENAI = [
  {
    type: "function" as const,
    function: {
      name: "analisar_indicador",
      description:
        "Analisa um KPI específico que o usuário citou. Devolve série recente (últimas 6 leituras), tendência classificada, valor atual vs meta, benchmark setorial (se houver) e iniciativas/KRs vinculados via indicadorFonteId. Use quando o usuário perguntar sobre UM KPI ('e o NPS?', 'como está o churn?'). NÃO usa HITL — executa direto.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["indicadorId"],
        properties: {
          indicadorId: { type: "string", description: "ID do indicador (use o id do CATÁLOGO ou de buscar_entidade_por_nome)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "projetar_kr",
      description:
        "Projeta linearmente se um KR vai bater o alvo no prazo, a partir do ritmo médio observado entre valorInicial e valorAtual. Devolve valor projetado, % vs alvo, dias restantes e nível de confiança ('alta' se houver ≥3 atualizações registradas com progresso; 'baixa' caso contrário). Use quando o usuário perguntar 'esse KR vai bater?' / 'estamos no ritmo?'. Não é ML — é regra simples.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["krId"],
        properties: {
          krId: { type: "string", description: "ID do resultado-chave (use o id do CATÁLOGO ou de buscar_entidade_por_nome com tipo='kr')." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "simular_impacto",
      description:
        "Simula o impacto determinístico de mudar uma iniciativa (adiar N dias, cancelar ou concluir) — sem persistir nada. Devolve os KPIs/KRs/OKRs vinculados via indicadorFonteId/estrategiaId e uma anotação por item ('KPI X perde a iniciativa Y; nenhuma outra iniciativa ataca este KPI'). Use ANTES de recomendar adiar/cancelar uma iniciativa para mostrar o que está em jogo.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["iniciativaId", "mudanca"],
        properties: {
          iniciativaId: { type: "string", description: "ID da iniciativa." },
          mudanca: {
            type: "object",
            additionalProperties: false,
            required: ["tipo"],
            properties: {
              tipo: { type: "string", enum: ["adiar_dias", "cancelar", "concluir"] },
              valor: { type: "integer", minimum: 1, maximum: 720, description: "Quantos dias adiar (apenas para tipo='adiar_dias')." },
            },
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_historico_estrategia",
      description:
        "Lista resumos de ciclo (memória de longo prazo da empresa) — retornando os mais recentes primeiro com período, tipo, versão e os pilares (conquistas/atrasos/lições). Use quando o usuário perguntar 'o que aconteceu nos últimos trimestres?', 'já fechamos esse objetivo antes?', 'qual era nossa decisão sobre X?'. NÃO usa HITL — só leitura.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          limite: { type: "integer", minimum: 1, maximum: 20, description: "Quantos resumos retornar (padrão 5)." },
          tipo: { type: "string", enum: ["trimestre", "objetivo", "estrategia", "iniciativa"], description: "Filtra por tipo (opcional)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_resumo_ciclo",
      description:
        "Devolve o conteúdo completo de UM resumo de ciclo específico (todas as conquistas, atrasos, decisões, KPIs movidos, lições, iniciativas concluídas/arquivadas). Use após 'consultar_historico_estrategia' quando o usuário aprofundar em um item específico.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["resumoId"],
        properties: {
          resumoId: { type: "string", description: "ID do resumo de ciclo (do retorno de consultar_historico_estrategia)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "comparar_periodos",
      description:
        "Compara dois períodos para retrospectiva. escopo ∈ {kpis,iniciativas,okrs,tudo}. Para KPIs conta quantos melhoraram/pioraram (última leitura por janela). Para iniciativas conta criadas/concluídas/atrasadas. Para OKRs traz % médio atingido por KR dos OKRs criados em cada janela. Devolve totais + top 5 movimentações com IDs. Use para perguntas tipo 'como foi este trimestre vs o anterior?'.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["escopo", "periodoA", "periodoB"],
        properties: {
          escopo: { type: "string", enum: ["kpis", "iniciativas", "okrs", "tudo"] },
          periodoA: {
            type: "object",
            additionalProperties: false,
            required: ["inicio", "fim"],
            properties: {
              inicio: { type: "string", description: "Data ISO YYYY-MM-DD." },
              fim: { type: "string", description: "Data ISO YYYY-MM-DD." },
            },
          },
          periodoB: {
            type: "object",
            additionalProperties: false,
            required: ["inicio", "fim"],
            properties: {
              inicio: { type: "string", description: "Data ISO YYYY-MM-DD." },
              fim: { type: "string", description: "Data ISO YYYY-MM-DD." },
            },
          },
        },
      },
    },
  },
  // ─── Task #285 — Diagnóstico ativo do plano (read-only) ───
  {
    type: "function" as const,
    function: {
      name: "analisar_gap_meta_vs_realizado",
      description:
        "Diagnostica o gap entre meta e realizado de UMA entidade (KPI, KR ou Objetivo). Devolve valor atual, meta, gap absoluto e %, dias até o prazo, projeção linear (para KR/Objetivo), dias desde a última leitura/check-in e uma lista de causas prováveis ('sem leitura há 45 dias', 'tendência caindo', 'iniciativa vinculada parada/atrasada'). Use quando o usuário perguntar 'por que esse KPI/KR/objetivo não está batendo?' ou 'qual o gap?'. NÃO sugira ligar KR a KPI como defeito — são camadas independentes.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["tipo", "id"],
        properties: {
          tipo: { type: "string", enum: ["kpi", "kr", "objetivo"] },
          id: { type: "string", description: "ID da entidade analisada (use buscar_entidade_por_nome se só souber o nome)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "detectar_lacunas_cascata",
      description:
        "Varre toda a empresa e devolve listas determinísticas de itens órfãos na cascata BSC: iniciativas sem objetivo vinculado, objetivos sem KR, KPIs sem nenhuma iniciativa atacando e estratégias sem iniciativa. KR sem indicadorFonteId NÃO é defeito — é rastreabilidade voluntária e aparece apenas como contagem informativa. Use quando o usuário perguntar 'o que está solto no meu plano?' ou 'tem coisa órfã?'. Cap de 10 itens por categoria.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "detectar_objetivos_descarrilados",
      description:
        "Lista objetivos não-encerrados que estão descarrilados por DOIS critérios objetivos: (a) % médio dos KRs abaixo de 30% OU (b) sem nenhum check-in de KR há mais de 21 dias. Devolve para cada objetivo o pctMedio, o KR mais atrasado, dias desde o último check-in e o motivo do flag. Use quando o usuário perguntar 'quais objetivos estão em risco?' ou 'o que precisa de atenção?'. Cap de 10.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          diasSemCheckin: { type: "integer", minimum: 1, maximum: 365, description: "Override do limiar de dias sem check-in (default 21)." },
          pctMinimo: { type: "number", minimum: 0, maximum: 100, description: "Override do % médio mínimo aceitável (default 30)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analisar_consistencia_estrategica",
      description:
        "Avalia a consistência do encadeamento Estratégia → Objetivo → Iniciativa → KPI/KR. Para cada estratégia conta nº de objetivos vinculados, nº de iniciativas vinculadas e nº de iniciativas que tocam algum KPI (via indicadorFonteId). Sinaliza furos: estratégia sem nenhuma iniciativa, estratégia sem nenhum objetivo, estratégia com iniciativas mas nenhuma toca KPI, objetivo sem iniciativa atacando. Use para perguntas tipo 'a execução está conectada à estratégia?' ou 'tem estratégia no papel sem ação?'.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sumarizar_ciclo_atual",
      description:
        "Resumo executivo do trimestre vigente (ou do trimestre da `dataReferencia` informada): % de iniciativas concluídas no período, nº de check-ins de KR registrados, nº de decisões estratégicas registradas, top 3 conquistas (iniciativas concluídas + KRs com maior avanço) e top 3 atrasos (iniciativas com prazo vencido em aberto). Use quando o usuário pedir 'me dá o status do trimestre' / 'resume o ciclo' / 'fechamento do quarter'.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dataReferencia: { type: "string", description: "Data ISO YYYY-MM-DD para definir o trimestre. Default = hoje." },
        },
      },
    },
  },
];

export interface ReadonlyToolResult {
  ok: true;
  ferramenta: ReadonlyToolName;
  dados: Record<string, unknown>;
}
export interface ReadonlyToolErr {
  ok: false;
  ferramenta: ReadonlyToolName | string;
  mensagem: string;
}

export async function executarFerramentaReadonly(
  name: string,
  rawArgs: unknown,
  ctx: ToolApplyContext,
): Promise<ReadonlyToolResult | ReadonlyToolErr> {
  if (!isReadonlyTool(name)) {
    return { ok: false, ferramenta: name, mensagem: `Ferramenta read-only desconhecida: ${name}` };
  }
  try {
    if (name === "analisar_indicador") {
      const parsed = analisarIndicadorSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      const ind = await storage.getIndicador(parsed.data.indicadorId);
      if (!ind || ind.empresaId !== ctx.empresaId) {
        return { ok: false, ferramenta: name, mensagem: "Indicador não encontrado para esta empresa." };
      }
      const tendencia = await getKpiTendencia(ind.id);
      // carrega iniciativas + krs da empresa para o helper de relações
      const [iniciativas, objetivos] = await Promise.all([
        storage.getIniciativas(ctx.empresaId),
        storage.getObjetivos(ctx.empresaId),
      ]);
      const krs = (
        await Promise.all(objetivos.map((o) => storage.getResultadosChave(o.id, ctx.empresaId)))
      ).flat();
      const relacoes = getRelacoesIndicador(ind.id, iniciativas, krs);
      const atual = ind.atual != null ? parseFloat(String(ind.atual)) : null;
      const meta = ind.meta != null ? parseFloat(String(ind.meta)) : null;
      const pctAtingido =
        atual != null && meta != null && Number.isFinite(atual) && Number.isFinite(meta) && meta !== 0
          ? atual / meta
          : null;
      const status =
        atual != null && meta != null && Number.isFinite(atual) && Number.isFinite(meta)
          ? atual >= meta
            ? "Verde"
            : atual >= meta * 0.8
            ? "Amarelo"
            : "Vermelho"
          : "Sem dados";
      if (tendencia.tendencia === "sem_dados") {
        return {
          ok: true,
          ferramenta: name,
          dados: {
            indicador: { id: ind.id, nome: ind.nome, perspectiva: ind.perspectiva, valorAtual: atual, meta, pctAtingido, status, benchmarkSetorial: ind.benchmarkSetorial ?? null },
            serie: [],
            tendencia: "sem_dados",
            deltaPercentual: null,
            vinculos: relacoes,
            instrucao: "Sem leituras suficientes para inferir tendência. Diga isso ao usuário em vez de inventar.",
          },
        };
      }
      return {
        ok: true,
        ferramenta: name,
        dados: {
          indicador: {
            id: ind.id,
            nome: ind.nome,
            perspectiva: ind.perspectiva,
            valorAtual: atual,
            meta,
            pctAtingido,
            status,
            benchmarkSetorial: ind.benchmarkSetorial ?? null,
          },
          serie: tendencia.ultimasLeituras,
          tendencia: tendencia.tendencia,
          deltaPercentual: tendencia.deltaPercentual,
          vinculos: relacoes,
        },
      };
    }

    if (name === "projetar_kr") {
      const parsed = projetarKrSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      const kr = await storage.getResultadoChaveById(parsed.data.krId, ctx.empresaId);
      if (!kr) return { ok: false, ferramenta: name, mensagem: "KR não encontrado para esta empresa." };
      const numAtualizacoes = await contarAtualizacoesKr(ctx.empresaId, kr.id);
      const proj = projetarValorKr(kr, numAtualizacoes);
      return {
        ok: true,
        ferramenta: name,
        dados: {
          kr: { id: kr.id, metrica: kr.metrica, objetivoId: kr.objetivoId },
          ...proj,
        },
      };
    }

    if (name === "simular_impacto") {
      const parsed = simularImpactoSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      const ini = await storage.getIniciativa(parsed.data.iniciativaId);
      if (!ini || ini.empresaId !== ctx.empresaId) {
        return { ok: false, ferramenta: name, mensagem: "Iniciativa não encontrada para esta empresa." };
      }
      // novoPrazo só faz sentido para "adiar_dias"
      let novoPrazo: string | null = null;
      if (parsed.data.mudanca.tipo === "adiar_dias") {
        const base = ini.prazo ? new Date(ini.prazo) : null;
        if (base && !isNaN(base.getTime())) {
          base.setDate(base.getDate() + parsed.data.mudanca.valor);
          const yy = base.getUTCFullYear();
          const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
          const dd = String(base.getUTCDate()).padStart(2, "0");
          novoPrazo = `${yy}-${mm}-${dd}`;
        }
      }

      // levantar todos os atacantes por KPI: iniciativas + KRs com mesmo indicadorFonteId
      const [todasInis, objetivos] = await Promise.all([
        storage.getIniciativas(ctx.empresaId),
        storage.getObjetivos(ctx.empresaId),
      ]);
      const krsAll = (
        await Promise.all(objetivos.map(async (o) => (await storage.getResultadosChave(o.id, ctx.empresaId)).map((kr) => ({ kr, objetivo: o }))))
      ).flat();

      const impactos: Array<Record<string, unknown>> = [];

      const krsImpactadosIds = new Set<string>();

      // KPIs atacados pela iniciativa em questão
      if (ini.indicadorFonteId) {
        const ind = await storage.getIndicador(ini.indicadorFonteId);
        if (ind && ind.empresaId === ctx.empresaId) {
          const outrosAtacantesInis = todasInis.filter(
            (i) => i.indicadorFonteId === ind.id && i.id !== ini.id && i.status !== "concluida" && i.status !== "pausada",
          );
          const krsLigadosAoKpi = krsAll.filter((p) => p.kr.indicadorFonteId === ind.id);
          let notaKpi = "";
          if (parsed.data.mudanca.tipo === "cancelar") {
            notaKpi = `KPI "${ind.nome}" perde esta iniciativa por cancelamento. ${outrosAtacantesInis.length === 0 && krsLigadosAoKpi.length === 0 ? "NENHUM outro item ataca este KPI — fica órfão." : `Restam ${outrosAtacantesInis.length} iniciativa(s) e ${krsLigadosAoKpi.length} KR(s) atacando-o.`}`;
          } else if (parsed.data.mudanca.tipo === "concluir") {
            notaKpi = `KPI "${ind.nome}" deve receber o impacto desta iniciativa em breve, se a tese de causa-efeito se confirmar.`;
          } else {
            notaKpi = `KPI "${ind.nome}" perde a iniciativa do prazo original (${ini.prazo ?? "sem prazo"}); novo prazo proposto: ${novoPrazo ?? "indefinido"}.`;
          }
          impactos.push({
            tipo: "kpi",
            id: ind.id,
            nome: ind.nome,
            outrosAtacantesIniciativas: outrosAtacantesInis.length,
            outrosAtacantesKrs: krsLigadosAoKpi.length,
            nota: notaKpi,
          });

          // KRs vinculados ao mesmo KPI sentem o impacto diretamente.
          for (const { kr, objetivo } of krsLigadosAoKpi) {
            krsImpactadosIds.add(kr.id);
            const notaKr =
              parsed.data.mudanca.tipo === "cancelar"
                ? `KR "${kr.metrica}" depende deste KPI — sem outras iniciativas atacando-o, fica vulnerável.`
                : parsed.data.mudanca.tipo === "concluir"
                ? `KR "${kr.metrica}" deve se beneficiar do movimento esperado neste KPI.`
                : `KR "${kr.metrica}" verá o efeito esperado adiado em ~${parsed.data.mudanca.valor}d.`;
            impactos.push({
              tipo: "kr",
              id: kr.id,
              metrica: kr.metrica,
              objetivoId: objetivo.id,
              objetivoTitulo: objetivo.titulo,
              indicadorFonteId: ind.id,
              nota: notaKr,
            });
          }
        }
      }

      // OKRs/KRs ligados pela estratégia (mesmo sem KPI compartilhado)
      if (ini.estrategiaId) {
        for (const o of objetivos) {
          if (o.estrategiaId !== ini.estrategiaId) continue;
          const krsDoObj = krsAll.filter((p) => p.objetivo.id === o.id).map((p) => p.kr);
          impactos.push({
            tipo: "okr",
            id: o.id,
            nome: o.titulo,
            krs: krsDoObj.length,
            nota:
              parsed.data.mudanca.tipo === "cancelar"
                ? `OKR "${o.titulo}" perde uma das iniciativas que apoiavam sua estratégia.`
                : parsed.data.mudanca.tipo === "concluir"
                ? `OKR "${o.titulo}" deve sentir o efeito desta entrega.`
                : `OKR "${o.titulo}" terá uma de suas iniciativas atrasada em ${parsed.data.mudanca.valor}d (novo prazo: ${novoPrazo ?? "indefinido"}).`,
          });
          for (const kr of krsDoObj) {
            if (krsImpactadosIds.has(kr.id)) continue;
            krsImpactadosIds.add(kr.id);
            const notaKr =
              parsed.data.mudanca.tipo === "cancelar"
                ? `KR "${kr.metrica}" pertence ao OKR "${o.titulo}", afetado pelo cancelamento desta iniciativa.`
                : parsed.data.mudanca.tipo === "concluir"
                ? `KR "${kr.metrica}" pode avançar via efeito indireto da entrega desta iniciativa.`
                : `KR "${kr.metrica}" pode ter avanço esperado adiado em ${parsed.data.mudanca.valor}d (mesma estratégia).`;
            impactos.push({
              tipo: "kr",
              id: kr.id,
              metrica: kr.metrica,
              objetivoId: o.id,
              objetivoTitulo: o.titulo,
              indicadorFonteId: kr.indicadorFonteId ?? null,
              nota: notaKr,
            });
          }
        }
      }

      // Cap por tipo p/ manter payload compacto (~600 tokens) em tenants grandes.
      const CAP_POR_TIPO = 5;
      const porTipo = new Map<string, Array<Record<string, unknown>>>();
      for (const it of impactos) {
        const tipo = String(it.tipo);
        if (!porTipo.has(tipo)) porTipo.set(tipo, []);
        porTipo.get(tipo)!.push(it);
      }
      const impactosCapados: Array<Record<string, unknown>> = [];
      const totaisPorTipo: Record<string, number> = {};
      porTipo.forEach((arr, tipo) => {
        totaisPorTipo[tipo] = arr.length;
        impactosCapados.push(...arr.slice(0, CAP_POR_TIPO));
      });

      return {
        ok: true,
        ferramenta: name,
        dados: {
          iniciativa: { id: ini.id, titulo: ini.titulo, status: ini.status, prazo: ini.prazo },
          mudanca: parsed.data.mudanca,
          novoPrazo,
          impactos: impactosCapados,
          totaisPorTipo,
          truncado: impactosCapados.length < impactos.length,
          aviso: impactos.length === 0
            ? "Nenhum vínculo encontrado (esta iniciativa não está ligada a KPI/estratégia). Cite isso ao usuário."
            : null,
        },
      };
    }

    if (name === "consultar_historico_estrategia") {
      const parsed = consultarHistoricoEstrategiaSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      const limite = parsed.data.limite ?? 5;
      let lista = await storage.listResumosCicloByEmpresa(ctx.empresaId, Math.max(limite, parsed.data.tipo ? 20 : limite));
      if (parsed.data.tipo) lista = lista.filter((r) => r.tipo === parsed.data.tipo);
      lista = lista.slice(0, limite);
      const resumos = lista.map((row) => {
        const c = lerConteudoResumo(row);
        return {
          id: row.id,
          tipo: row.tipo,
          periodo: row.periodo,
          versao: row.versao,
          referenciaId: row.referenciaId,
          criadoEm: row.criadoEm,
          resumoCurto: c.resumoCurto,
          conquistas: c.conquistas.slice(0, 4),
          atrasos: c.atrasos.slice(0, 4),
          licoes: c.licoes.slice(0, 4),
        };
      });
      return {
        ok: true,
        ferramenta: name,
        dados: {
          total: resumos.length,
          resumos,
          instrucao: resumos.length === 0
            ? "Ainda não há resumos de ciclo para esta empresa. Sugira ao usuário gerar o primeiro com 'gerar_resumo_ciclo_manual'."
            : "Cite os períodos exatos ao referenciar a memória — não invente datas.",
        },
      };
    }

    if (name === "consultar_resumo_ciclo") {
      const parsed = consultarResumoCicloSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      const row = await storage.getResumoCicloById(parsed.data.resumoId, ctx.empresaId);
      if (!row) return { ok: false, ferramenta: name, mensagem: "Resumo de ciclo não encontrado para esta empresa." };
      const conteudo = lerConteudoResumo(row);
      return {
        ok: true,
        ferramenta: name,
        dados: {
          id: row.id,
          tipo: row.tipo,
          periodo: row.periodo,
          versao: row.versao,
          referenciaId: row.referenciaId,
          criadoEm: row.criadoEm,
          geradoPor: row.geradoPor,
          imutavel: row.imutavel,
          conteudo,
        },
      };
    }

    if (name === "comparar_periodos") {
      const parsed = compararPeriodosSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      const r = await comparePeriodos(
        ctx.empresaId,
        parsed.data.escopo as EscopoComparacao,
        parsed.data.periodoA as PeriodoIso,
        parsed.data.periodoB as PeriodoIso,
      );
      if (!r.ok) return { ok: false, ferramenta: name, mensagem: r.mensagem };
      return { ok: true, ferramenta: name, dados: r.resultado as unknown as Record<string, unknown> };
    }

    // ─── Task #285 — Diagnóstico ativo do plano ───
    if (name === "analisar_gap_meta_vs_realizado") {
      const parsed = analisarGapSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      return { ok: true, ferramenta: name, dados: await runAnalisarGap(parsed.data, ctx.empresaId) };
    }
    if (name === "detectar_lacunas_cascata") {
      const parsed = detectarLacunasCascataSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      return { ok: true, ferramenta: name, dados: await runDetectarLacunasCascata(ctx.empresaId) };
    }
    if (name === "detectar_objetivos_descarrilados") {
      const parsed = detectarDescarriladosSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      return { ok: true, ferramenta: name, dados: await runDetectarDescarrilados(ctx.empresaId, parsed.data) };
    }
    if (name === "analisar_consistencia_estrategica") {
      const parsed = consistenciaEstrategicaSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      return { ok: true, ferramenta: name, dados: await runConsistenciaEstrategica(ctx.empresaId) };
    }
    if (name === "sumarizar_ciclo_atual") {
      const parsed = sumarizarCicloSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) return { ok: false, ferramenta: name, mensagem: `Parâmetros inválidos: ${parsed.error.message.slice(0, 200)}` };
      return { ok: true, ferramenta: name, dados: await runSumarizarCiclo(ctx.empresaId, parsed.data.dataReferencia) };
    }

    return { ok: false, ferramenta: name, mensagem: "Caminho não implementado." };
  } catch (err) {
    return { ok: false, ferramenta: name, mensagem: `Falha ao executar ${name}: ${(err as Error).message.slice(0, 160)}` };
  }
}

// ─── Task #285 — helpers de diagnóstico ativo (read-only, determinísticos) ───
const DIAGNOSTICO_DAY_MS = 24 * 60 * 60 * 1000;

function pctKr(kr: { valorInicial: unknown; valorAtual: unknown; valorAlvo: unknown }): number | null {
  const ini = Number(kr.valorInicial);
  const atual = Number(kr.valorAtual);
  const alvo = Number(kr.valorAlvo);
  if (![ini, atual, alvo].every(Number.isFinite)) return null;
  if (alvo === ini) return atual >= alvo ? 100 : 0;
  const p = ((atual - ini) / (alvo - ini)) * 100;
  if (!Number.isFinite(p)) return null;
  return Math.max(0, Math.min(200, Math.round(p)));
}

function diasDesde(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / DIAGNOSTICO_DAY_MS);
}

function diasAte(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / DIAGNOSTICO_DAY_MS);
}

function trimestreDe(ref: Date): { inicio: Date; fim: Date; rotulo: string } {
  const ano = ref.getFullYear();
  const trimestreIdx = Math.floor(ref.getMonth() / 3); // 0..3
  const inicio = new Date(ano, trimestreIdx * 3, 1, 0, 0, 0, 0);
  const fim = new Date(ano, trimestreIdx * 3 + 3, 0, 23, 59, 59, 999);
  return { inicio, fim, rotulo: `Q${trimestreIdx + 1}/${ano}` };
}

function semaforoPct(pct: number | null): "verde" | "amarelo" | "vermelho" | "sem_dados" {
  if (pct == null) return "sem_dados";
  if (pct >= 80) return "verde";
  if (pct >= 50) return "amarelo";
  return "vermelho";
}

function semaforoKpi(gapPct: number | null, tendencia: string): "verde" | "amarelo" | "vermelho" | "sem_dados" {
  if (gapPct == null) return "sem_dados";
  if (tendencia === "caindo" && gapPct < 0) return "vermelho";
  if (gapPct < -20) return "vermelho";
  if (gapPct < 0) return "amarelo";
  return "verde";
}

export async function runAnalisarGap(
  args: { tipo: "kpi" | "kr" | "objetivo"; id: string },
  empresaId: string,
): Promise<Record<string, unknown>> {
  const causas: string[] = [];

  if (args.tipo === "kpi") {
    const ind = await storage.getIndicador(args.id);
    if (!ind || ind.empresaId !== empresaId) {
      return { erro: "KPI não encontrado para esta empresa.", id: args.id };
    }
    const tendencia = await getKpiTendencia(ind.id);
    const atual = ind.atual != null ? Number(ind.atual) : null;
    const meta = ind.meta != null ? Number(ind.meta) : null;
    const gapAbs = atual != null && meta != null ? Math.round((atual - meta) * 100) / 100 : null;
    const gapPct = atual != null && meta != null && meta !== 0 ? Math.round(((atual - meta) / meta) * 100) : null;
    let ultimaLeituraIso: string | null = null;
    let diasSemLeitura: number | null = null;
    try {
      const leituras = await storage.getLeituras(ind.id);
      const top = leituras[0];
      if (top?.registradoEm) {
        const t = new Date(top.registradoEm);
        ultimaLeituraIso = t.toISOString();
        diasSemLeitura = Math.floor((Date.now() - t.getTime()) / DIAGNOSTICO_DAY_MS);
      }
    } catch { /* ignore */ }

    if (diasSemLeitura != null && diasSemLeitura > 30) causas.push(`Sem leitura há ${diasSemLeitura} dias.`);
    if (tendencia.tendencia === "caindo") causas.push("Tendência caindo nas últimas leituras.");
    if (tendencia.tendencia === "estavel" && gapPct != null && gapPct < 0) causas.push("KPI estagnado abaixo da meta.");

    // Iniciativas vinculadas paradas?
    try {
      const [iniciativas, krs] = await Promise.all([
        storage.getIniciativas(empresaId),
        carregarKrsDaEmpresa(empresaId),
      ]);
      const rels = getRelacoesIndicador(ind.id, iniciativas, krs.map((x) => x.kr));
      const iniAtacando = rels.iniciativasVinculadas;
      const paradas = iniAtacando.filter((i) => {
        const s = (i.status ?? "").toLowerCase();
        return s === "atrasada" || s === "pausada" || s === "cancelada";
      });
      if (iniAtacando.length === 0) causas.push("Nenhuma iniciativa ataca este KPI.");
      else if (paradas.length === iniAtacando.length) causas.push(`Todas as ${iniAtacando.length} iniciativa(s) vinculada(s) estão paradas/atrasadas.`);
      return {
        tipo: "kpi",
        id: ind.id,
        nome: ind.nome,
        valorAtual: atual,
        meta,
        gapAbsoluto: gapAbs,
        gapPct,
        status: semaforoKpi(gapPct, tendencia.tendencia),
        tendencia: tendencia.tendencia,
        ultimaLeituraEm: ultimaLeituraIso,
        diasSemLeitura,
        iniciativasVinculadas: iniAtacando.length,
        iniciativasParadas: paradas.length,
        krsVinculados: rels.krsVinculados.length,
        causasProvaveis: causas,
      };
    } catch {
      return {
        tipo: "kpi", id: ind.id, nome: ind.nome,
        valorAtual: atual, meta, gapAbsoluto: gapAbs, gapPct,
        status: semaforoKpi(gapPct, tendencia.tendencia),
        tendencia: tendencia.tendencia,
        ultimaLeituraEm: ultimaLeituraIso, diasSemLeitura,
        causasProvaveis: causas,
      };
    }
  }

  if (args.tipo === "kr") {
    // localizar KR via lookup batched (uma única passada pela cascata).
    const todos = await carregarKrsDaEmpresa(empresaId);
    const krEncontrado = todos.find((x) => x.kr.id === args.id) ?? null;
    if (!krEncontrado) return { erro: "KR não encontrado para esta empresa.", id: args.id };
    const { kr, objetivo } = krEncontrado;
    const num = await contarAtualizacoesKr(empresaId, kr.id);
    const proj = projetarValorKr(kr, num);
    const pct = pctKr(kr);
    const prazo = kr.prazoData ?? kr.prazo ?? null;
    const diasPrazo = diasAte(typeof prazo === "string" ? prazo : null);
    const ultimoCheckin = kr.ultimoCheckinEm ?? null;
    const diasSemCheckin = diasDesde(ultimoCheckin);

    if (diasSemCheckin != null && diasSemCheckin > 21) causas.push(`Sem check-in há ${diasSemCheckin} dias.`);
    else if (ultimoCheckin == null) causas.push("Nenhum check-in registrado ainda.");
    if (pct != null && pct < 30) causas.push(`Progresso baixo (${pct}% do alvo).`);
    if (kr.confiancaAtual === "vermelho") causas.push("Último check-in marcado como vermelho.");
    if (proj.pctProjetadoVsAlvo != null && proj.pctProjetadoVsAlvo < 0.7) {
      causas.push(`Projeção linear indica chegar a ${Math.round((proj.pctProjetadoVsAlvo ?? 0) * 100)}% do alvo no prazo.`);
    }
    if (diasPrazo != null && diasPrazo < 0) causas.push(`Prazo vencido há ${Math.abs(diasPrazo)} dias.`);

    return {
      tipo: "kr",
      id: kr.id,
      metrica: kr.metrica,
      objetivo: { id: objetivo.id, titulo: objetivo.titulo },
      valorInicial: Number(kr.valorInicial),
      valorAtual: Number(kr.valorAtual),
      valorAlvo: Number(kr.valorAlvo),
      pctAtingido: pct,
      status: (kr.confiancaAtual as "verde" | "amarelo" | "vermelho" | undefined) ?? semaforoPct(pct),
      prazo: typeof prazo === "string" ? prazo : null,
      diasAtePrazo: diasPrazo,
      ultimoCheckinEm: ultimoCheckin,
      diasSemCheckin,
      confianca: kr.confiancaAtual ?? null,
      projecao: {
        valorProjetadoNoPrazo: proj.valorProjetadoNoPrazo,
        pctProjetadoVsAlvo: proj.pctProjetadoVsAlvo,
        confianca: proj.confianca,
      },
      indicadorFonteId: kr.indicadorFonteId ?? null,
      causasProvaveis: causas,
    };
  }

  // tipo === "objetivo" — usa lookup batched (carregarKrsDaEmpresa) para
  // evitar N+1 quando há muitos objetivos.
  const todos = await carregarKrsDaEmpresa(empresaId);
  const objetivosUnicos = new Map(todos.map((x) => [x.objetivo.id, x.objetivo]));
  const obj = objetivosUnicos.get(args.id);
  if (!obj) {
    // pode ser objetivo sem KR cadastrado — tentar buscar avulsamente
    const objs = await storage.getObjetivos(empresaId);
    const objSemKr = objs.find((o) => o.id === args.id);
    if (!objSemKr) return { erro: "Objetivo não encontrado para esta empresa.", id: args.id };
    return {
      tipo: "objetivo", id: objSemKr.id, titulo: objSemKr.titulo,
      perspectiva: objSemKr.perspectiva ?? null, encerrado: !!objSemKr.encerrado,
      totalKrs: 0, pctMedio: null, alvoPct: 100, gapPct: null,
      status: "vermelho" as const,
      diasAtePrazoMaisProximo: null,
      projecaoMediaPctVsAlvo: null,
      krMaisAtrasado: null, ultimoCheckinEm: null, diasSemCheckin: null,
      causasProvaveis: ["Objetivo sem nenhum KR cadastrado."],
    };
  }
  const krs = todos.filter((x) => x.objetivo.id === obj.id).map((x) => x.kr);
  const pcts: number[] = [];
  const projs: number[] = [];
  let krMaisAtrasado: { id: string; metrica: string; pct: number | null } | null = null;
  let ultimoCheckinTs: number | null = null;
  let prazoMaisProximoTs: number | null = null;
  for (const k of krs) {
    const p = pctKr(k);
    if (p != null) pcts.push(p);
    if (krMaisAtrasado == null || (p != null && (krMaisAtrasado.pct ?? 999) > p)) {
      krMaisAtrasado = { id: k.id, metrica: k.metrica, pct: p };
    }
    const ts = k.ultimoCheckinEm ? new Date(k.ultimoCheckinEm).getTime() : null;
    if (ts != null && (ultimoCheckinTs == null || ts > ultimoCheckinTs)) ultimoCheckinTs = ts;
    const prazoTs = k.prazoData ? new Date(k.prazoData).getTime() : NaN;
    if (Number.isFinite(prazoTs) && prazoTs >= Date.now()) {
      if (prazoMaisProximoTs == null || prazoTs < prazoMaisProximoTs) prazoMaisProximoTs = prazoTs;
    }
    const projKr = projetarValorKr(k, 0);
    if (projKr.pctProjetadoVsAlvo != null) projs.push(projKr.pctProjetadoVsAlvo * 100);
  }
  const pctMedio = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const projMedio = projs.length ? Math.round(projs.reduce((a, b) => a + b, 0) / projs.length) : null;
  const gapPct = pctMedio != null ? pctMedio - 100 : null;
  const diasSemCheckin = ultimoCheckinTs ? Math.floor((Date.now() - ultimoCheckinTs) / DIAGNOSTICO_DAY_MS) : null;
  const diasAtePrazoMaisProximo = prazoMaisProximoTs ? Math.ceil((prazoMaisProximoTs - Date.now()) / DIAGNOSTICO_DAY_MS) : null;

  if (krs.length === 0) causas.push("Objetivo sem nenhum KR cadastrado.");
  if (pctMedio != null && pctMedio < 30) causas.push(`Progresso médio dos KRs em ${pctMedio}%.`);
  if (diasSemCheckin != null && diasSemCheckin > 21) causas.push(`Nenhum KR teve check-in há ${diasSemCheckin} dias.`);
  else if (ultimoCheckinTs == null && krs.length > 0) causas.push("Nenhum KR deste objetivo recebeu check-in ainda.");
  if (obj.encerrado) causas.push("Objetivo já está encerrado.");

  return {
    tipo: "objetivo",
    id: obj.id,
    titulo: obj.titulo,
    perspectiva: obj.perspectiva ?? null,
    encerrado: !!obj.encerrado,
    totalKrs: krs.length,
    pctMedio,
    alvoPct: 100,
    gapPct,
    status: semaforoPct(pctMedio),
    diasAtePrazoMaisProximo,
    projecaoMediaPctVsAlvo: projMedio,
    krMaisAtrasado,
    ultimoCheckinEm: ultimoCheckinTs ? new Date(ultimoCheckinTs).toISOString() : null,
    diasSemCheckin,
    causasProvaveis: causas,
  };
}

export async function runDetectarLacunasCascata(empresaId: string): Promise<Record<string, unknown>> {
  const [objetivos, indicadoresAll, iniciativas, estrategias, krsAll] = await Promise.all([
    storage.getObjetivos(empresaId),
    storage.getIndicadores(empresaId),
    storage.getIniciativas(empresaId),
    storage.getEstrategias(empresaId),
    carregarKrsDaEmpresa(empresaId),
  ]);
  const indicadores = indicadoresAll.filter((i) => (i.perspectiva ?? "").toLowerCase() !== "diagnostico");
  const krs = krsAll.map((x) => x.kr);
  const objetivosComKr = new Set(krsAll.map((x) => x.objetivo.id));

  const iniciativasSemObjetivo = iniciativas
    .filter((i) => !i.objetivoOriginadorId)
    .slice(0, 10)
    .map((i) => ({ id: i.id, titulo: i.titulo, status: i.status, estrategiaId: i.estrategiaId ?? null }));

  const objetivosSemKr = objetivos
    .filter((o) => !o.encerrado && !objetivosComKr.has(o.id))
    .slice(0, 10)
    .map((o) => ({ id: o.id, titulo: o.titulo, perspectiva: o.perspectiva ?? null }));

  // KPI sem KR atacando: nenhum KR.indicadorFonteId === kpi.id
  const kpisSemKrAtacando = indicadores
    .filter((ind) => !krs.some((k) => k.indicadorFonteId === ind.id))
    .slice(0, 10)
    .map((ind) => ({ id: ind.id, nome: ind.nome, perspectiva: ind.perspectiva ?? null }));

  // KPI sem iniciativa atacando: nenhuma Iniciativa.indicadorFonteId === kpi.id
  const kpisSemIniciativaAtacando = indicadores
    .filter((ind) => !iniciativas.some((i) => i.indicadorFonteId === ind.id))
    .slice(0, 10)
    .map((ind) => ({ id: ind.id, nome: ind.nome, perspectiva: ind.perspectiva ?? null }));

  const estrategiasSemIniciativa = estrategias
    .filter((e) => !iniciativas.some((i) => i.estrategiaId === e.id))
    .slice(0, 10)
    .map((e) => ({ id: e.id, titulo: e.titulo }));

  // KR sem indicadorFonteId — listado como informativo (NÃO é defeito por design,
  // apenas rastreabilidade voluntária entre camadas independentes).
  const krsSemIndicador = krs
    .filter((k) => !k.indicadorFonteId)
    .slice(0, 10)
    .map((k) => {
      const obj = krsAll.find((x) => x.kr.id === k.id)?.objetivo;
      return { id: k.id, metrica: k.metrica, objetivoId: obj?.id ?? null, objetivoTitulo: obj?.titulo ?? null };
    });
  const krsSemIndicadorTotal = krs.filter((k) => !k.indicadorFonteId).length;

  return {
    iniciativasSemObjetivo,
    objetivosSemKr,
    kpisSemKrAtacando,
    kpisSemIniciativaAtacando,
    estrategiasSemIniciativa,
    informativo: {
      krsSemIndicadorFonteTotal: krsSemIndicadorTotal,
      krsSemIndicadorFonteAmostra: krsSemIndicador,
      observacao: "KR sem indicadorFonteId NÃO é defeito — KR (alcance no ciclo) e KPI (performance contínua) são camadas independentes. Lista apenas para rastreabilidade voluntária; não recomende ao usuário 'ligar KR ao KPI' como correção do plano.",
    },
    totais: {
      iniciativas: iniciativas.length,
      objetivos: objetivos.length,
      kpis: indicadores.length,
      estrategias: estrategias.length,
      krs: krs.length,
    },
    geradoEm: new Date().toISOString(),
  };
}

export async function runDetectarDescarrilados(
  empresaId: string,
  opts: { diasSemCheckin?: number; pctMinimo?: number },
): Promise<Record<string, unknown>> {
  const limiteDias = opts.diasSemCheckin ?? 21;
  const limitePct = opts.pctMinimo ?? 30;
  // Carrega cascata inteira em uma única passada (helper batched) e
  // agrupa KRs por objetivo, evitando N+1 ao escalar para muitos objetivos.
  const todos = await carregarKrsDaEmpresa(empresaId);
  const grupos = new Map<string, { obj: typeof todos[number]["objetivo"]; krs: typeof todos[number]["kr"][] }>();
  for (const { kr, objetivo } of todos) {
    if (objetivo.encerrado) continue;
    const g = grupos.get(objetivo.id) ?? { obj: objetivo, krs: [] };
    g.krs.push(kr);
    grupos.set(objetivo.id, g);
  }
  const krsPorObj = Array.from(grupos.values());

  const descarrilados = krsPorObj
    .map(({ obj, krs }) => {
      const pcts = krs.map((k) => pctKr(k)).filter((p): p is number => p != null);
      const pctMedio = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
      let krMaisAtrasado: { id: string; metrica: string; pct: number | null } | null = null;
      let ultimoCheckinTs: number | null = null;
      for (const k of krs) {
        const p = pctKr(k);
        if (krMaisAtrasado == null || (p != null && (krMaisAtrasado.pct ?? 999) > p)) {
          krMaisAtrasado = { id: k.id, metrica: k.metrica, pct: p };
        }
        const ts = k.ultimoCheckinEm ? new Date(k.ultimoCheckinEm).getTime() : null;
        if (ts != null && (ultimoCheckinTs == null || ts > ultimoCheckinTs)) ultimoCheckinTs = ts;
      }
      const diasSemCheckin = ultimoCheckinTs ? Math.floor((Date.now() - ultimoCheckinTs) / DIAGNOSTICO_DAY_MS) : null;
      const motivos: string[] = [];
      if (krs.length > 0 && pctMedio != null && pctMedio < limitePct) motivos.push(`pct_medio_${pctMedio}_abaixo_de_${limitePct}`);
      if (krs.length > 0 && (diasSemCheckin == null || diasSemCheckin > limiteDias)) {
        motivos.push(diasSemCheckin == null ? "sem_checkin_nunca" : `sem_checkin_${diasSemCheckin}d`);
      }
      return { obj, krs, pctMedio, krMaisAtrasado, diasSemCheckin, ultimoCheckinTs, motivos };
    })
    .filter((x) => x.krs.length > 0 && x.motivos.length > 0)
    .sort((a, b) => (a.pctMedio ?? 0) - (b.pctMedio ?? 0))
    .slice(0, 10)
    .map((x) => ({
      id: x.obj.id,
      titulo: x.obj.titulo,
      perspectiva: x.obj.perspectiva ?? null,
      totalKrs: x.krs.length,
      pctMedio: x.pctMedio,
      krMaisAtrasado: x.krMaisAtrasado,
      diasSemCheckin: x.diasSemCheckin,
      ultimoCheckinEm: x.ultimoCheckinTs ? new Date(x.ultimoCheckinTs).toISOString() : null,
      motivos: x.motivos,
    }));

  return {
    descarrilados,
    criterios: { diasSemCheckinLimite: limiteDias, pctMinimoAceitavel: limitePct },
    totalObjetivosAtivos: krsPorObj.length,
    geradoEm: new Date().toISOString(),
  };
}

export async function runConsistenciaEstrategica(empresaId: string): Promise<Record<string, unknown>> {
  const [estrategias, objetivos, iniciativas, indicadoresAll] = await Promise.all([
    storage.getEstrategias(empresaId),
    storage.getObjetivos(empresaId),
    storage.getIniciativas(empresaId),
    storage.getIndicadores(empresaId),
  ]);
  const indicadores = indicadoresAll.filter((i) => (i.perspectiva ?? "").toLowerCase() !== "diagnostico");
  const indicadorIds = new Set(indicadores.map((i) => i.id));

  const porEstrategia = estrategias.map((e) => {
    const objs = objetivos.filter((o) => (o as { estrategiaId?: string | null }).estrategiaId === e.id);
    const inis = iniciativas.filter((i) => i.estrategiaId === e.id);
    const inisQueTocamKpi = inis.filter((i) => i.indicadorFonteId && indicadorIds.has(i.indicadorFonteId));
    const furos: string[] = [];
    if (objs.length === 0) furos.push("estrategia_sem_objetivo");
    if (inis.length === 0) furos.push("estrategia_sem_iniciativa");
    else if (inisQueTocamKpi.length === 0) furos.push("iniciativas_nao_tocam_kpi");
    return {
      id: e.id,
      titulo: e.titulo,
      objetivosVinculados: objs.length,
      iniciativasVinculadas: inis.length,
      iniciativasQueTocamKpi: inisQueTocamKpi.length,
      furos,
    };
  });

  const objetivosSemIniciativa = objetivos
    .filter((o) => !o.encerrado)
    .filter((o) => !iniciativas.some((i) => i.objetivoOriginadorId === o.id))
    .slice(0, 10)
    .map((o) => ({ id: o.id, titulo: o.titulo, perspectiva: o.perspectiva ?? null }));

  const estrategiasComFuros = porEstrategia.filter((e) => e.furos.length > 0).slice(0, 10);

  return {
    porEstrategia,
    estrategiasComFuros,
    objetivosSemIniciativa,
    totais: {
      estrategias: estrategias.length,
      objetivos: objetivos.length,
      iniciativas: iniciativas.length,
      kpis: indicadores.length,
    },
    geradoEm: new Date().toISOString(),
  };
}

export async function runSumarizarCiclo(
  empresaId: string,
  dataReferencia?: string,
): Promise<Record<string, unknown>> {
  const ref = dataReferencia ? new Date(dataReferencia) : new Date();
  const { inicio, fim, rotulo } = trimestreDe(ref);
  const inicioTs = inicio.getTime();
  const fimTs = fim.getTime();
  const dentro = (d: Date | string | null | undefined): boolean => {
    if (!d) return false;
    const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
    return Number.isFinite(t) && t >= inicioTs && t <= fimTs;
  };

  const [iniciativas, objetivos, atas, decisoes] = await Promise.all([
    storage.getIniciativas(empresaId),
    storage.getObjetivos(empresaId),
    storage.getReuniaoAtas(empresaId, 200),
    storage.getDecisoesEstrategicas(empresaId, 200),
  ]);
  const krsTodos = await carregarKrsDaEmpresa(empresaId);

  // check-ins por KR (paralelo)
  const checkinsPorKr = await Promise.all(
    krsTodos.map(async ({ kr }) => ({ kr, checkins: await storage.getKrCheckins(kr.id, empresaId) })),
  );
  const checkinsNoCiclo = checkinsPorKr.flatMap(({ kr, checkins }) =>
    checkins.filter((c) => dentro(c.createdAt)).map((c) => ({ kr, c })),
  );

  // % executado: iniciativas concluídas no ciclo / iniciativas com prazoData no ciclo (ou todas ativas)
  const concluidasNoCiclo = iniciativas.filter((i) => {
    const s = (i.status ?? "").toLowerCase();
    return (s === "concluida" || s === "concluída") && dentro(i.encerradaEm ?? i.createdAt ?? null);
  });
  const ativasOuConcluidas = iniciativas.filter((i) => {
    const s = (i.status ?? "").toLowerCase();
    if (s === "cancelada") return false;
    return true;
  });
  const pctExecutado = ativasOuConcluidas.length > 0
    ? Math.round((concluidasNoCiclo.length / ativasOuConcluidas.length) * 100)
    : 0;

  // top 3 conquistas
  const krsAvancados = checkinsPorKr
    .map(({ kr, checkins }) => {
      const noCiclo = checkins.filter((c) => dentro(c.createdAt));
      if (noCiclo.length === 0) return null;
      const valIni = Number(noCiclo[noCiclo.length - 1].valor);
      const valFim = Number(noCiclo[0].valor);
      const alvo = Number(kr.valorAlvo);
      const ini = Number(kr.valorInicial);
      const denom = alvo - ini;
      const avancoPct = Number.isFinite(denom) && denom !== 0 ? Math.round(((valFim - valIni) / denom) * 100) : null;
      return { kr, avancoPct, valFim };
    })
    .filter((x): x is { kr: typeof krsTodos[number]["kr"]; avancoPct: number | null; valFim: number } => x != null && x.avancoPct != null)
    .sort((a, b) => (b.avancoPct ?? 0) - (a.avancoPct ?? 0));

  const topConquistas: Array<Record<string, unknown>> = [];
  for (const i of concluidasNoCiclo.slice(0, 3)) {
    topConquistas.push({ tipo: "iniciativa_concluida", id: i.id, titulo: i.titulo });
  }
  for (const k of krsAvancados.slice(0, 3 - topConquistas.length)) {
    topConquistas.push({ tipo: "kr_avancado", id: k.kr.id, metrica: k.kr.metrica, avancoPct: k.avancoPct });
  }

  // top 3 atrasos
  const atrasos = iniciativas
    .filter((i) => {
      const s = (i.status ?? "").toLowerCase();
      if (s === "concluida" || s === "concluída" || s === "cancelada") return false;
      const prazoTs = i.prazoData ? new Date(i.prazoData).getTime() : NaN;
      return Number.isFinite(prazoTs) && prazoTs < Date.now();
    })
    .sort((a, b) => new Date(a.prazoData!).getTime() - new Date(b.prazoData!).getTime())
    .slice(0, 3)
    .map((i) => ({
      id: i.id,
      titulo: i.titulo,
      prazo: i.prazoData ?? i.prazo,
      diasAtraso: i.prazoData ? Math.floor((Date.now() - new Date(i.prazoData).getTime()) / DIAGNOSTICO_DAY_MS) : null,
    }));

  // decisões: registradaEm dentro do ciclo + decisoes inline em atas do ciclo
  const decisoesNoCiclo = decisoes.filter((d) => dentro(d.registradaEm));
  const decisoesEmAtasCount = atas
    .filter((a) => dentro(a.registradaEm))
    .reduce((acc, a) => acc + (Array.isArray(a.decisoes) ? a.decisoes.length : 0), 0);

  return {
    cicloRotulo: rotulo,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    pctExecutado,
    iniciativasConcluidasNoCiclo: concluidasNoCiclo.length,
    iniciativasAtivasOuConcluidas: ativasOuConcluidas.length,
    checkinsNoCiclo: checkinsNoCiclo.length,
    decisoesEstrategicasNoCiclo: decisoesNoCiclo.length,
    decisoesEmAtasNoCiclo: decisoesEmAtasCount,
    atasNoCiclo: atas.filter((a) => dentro(a.registradaEm)).length,
    topConquistas,
    topAtrasos: atrasos,
    totais: {
      objetivos: objetivos.length,
      iniciativas: iniciativas.length,
      krs: krsTodos.length,
    },
    geradoEm: new Date().toISOString(),
  };
}
// ---------- Riscos (Task #232) ----------
const CATEGORIAS_RISCO = [
  "operacional",
  "financeiro",
  "estrategico",
  "regulatorio",
  "tecnologico",
  "reputacao",
] as const;
const STATUS_RISCO = [
  "identificado",
  "em_mitigacao",
  "aceito",
  "eliminado",
  "mitigado",
] as const;

function criticidadeLabel(prob: number, imp: number): string {
  const score = prob * imp;
  if (score >= 16) return "Crítico";
  if (score >= 9) return "Alto";
  if (score >= 4) return "Médio";
  return "Baixo";
}

const criarRiscoSchema = z.object({
  descricao: z.string().min(10).max(1000),
  categoria: z.enum(CATEGORIAS_RISCO).default("estrategico"),
  probabilidade: z.number().int().min(1).max(5).default(3),
  impacto: z.number().int().min(1).max(5).default(3),
  planoMitigacao: z.string().max(1500).default(""),
  responsavelId: z.string().optional(),
  origemSwotId: z.string().optional(),
});
type CriarRiscoParams = z.infer<typeof criarRiscoSchema>;

const criarRisco: ToolDefinition<CriarRiscoParams> = {
  name: "criar_risco",
  description:
    "Registra um novo risco estratégico/operacional. Use quando o usuário relatar uma ameaça em discussão (ex.: 'o NPS pode despencar se o concorrente lançar X', 'temos risco de perder o cliente Y'). Sempre que registrar, oriente o usuário a também planejar mitigação depois.",
  paramsSchema: criarRiscoSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["descricao"],
    properties: {
      descricao: { type: "string", description: "Descrição clara do risco (≥10 chars)." },
      categoria: { type: "string", enum: [...CATEGORIAS_RISCO] },
      probabilidade: { type: "integer", minimum: 1, maximum: 5, description: "1=muito baixa, 5=muito alta" },
      impacto: { type: "integer", minimum: 1, maximum: 5, description: "1=muito baixo, 5=muito alto" },
      planoMitigacao: { type: "string", description: "Ações iniciais de mitigação (opcional)." },
      responsavelId: { type: "string", description: "ID do usuário responsável (opcional)." },
      origemSwotId: { type: "string", description: "ID de fator SWOT que originou o risco (opcional)." },
    },
  },
  preview: (p) => ({
    titulo: `Registrar risco: ${p.descricao.slice(0, 80)}`,
    descricao: `Novo risco na categoria ${p.categoria}, criticidade ${criticidadeLabel(p.probabilidade, p.impacto)} (${p.probabilidade * p.impacto} pts).`,
    campos: [
      { label: "Descrição", valor: p.descricao },
      { label: "Categoria", valor: p.categoria },
      { label: "Probabilidade", valor: `${p.probabilidade}/5` },
      { label: "Impacto", valor: `${p.impacto}/5` },
      { label: "Criticidade", valor: `${criticidadeLabel(p.probabilidade, p.impacto)} (${p.probabilidade * p.impacto} pts)` },
      ...(p.planoMitigacao ? [{ label: "Plano de mitigação", valor: p.planoMitigacao }] : []),
    ],
    ctaConfirmar: "Registrar risco",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Task #335 — defesa em profundidade contra risco duplicado.
    const dupRisco = await buscarRiscosSimilares(ctx.empresaId, p.descricao);
    if (dupRisco.length > 0) {
      throw new EntidadeDuplicadaError("risco", dupRisco);
    }
    let origemSwotIdSafe: string | undefined = undefined;
    if (p.origemSwotId) {
      const swots = await storage.getAnaliseSwot(ctx.empresaId);
      if (swots.some((s) => s.id === p.origemSwotId)) origemSwotIdSafe = p.origemSwotId;
    }
    let responsavelIdSafe: string | undefined = undefined;
    if (p.responsavelId) {
      const u = await storage.getUsuarioById(p.responsavelId);
      if (u && u.empresaId === ctx.empresaId) responsavelIdSafe = u.id;
    }
    const created = await storage.createRisco({
      empresaId: ctx.empresaId,
      descricao: p.descricao,
      categoria: p.categoria,
      probabilidade: p.probabilidade,
      impacto: p.impacto,
      status: "identificado",
      planoMitigacao: p.planoMitigacao || "",
      responsavelId: responsavelIdSafe,
      origemSwotId: origemSwotIdSafe,
    });
    return {
      resumo: `Risco "${created.descricao.slice(0, 60)}" registrado (${criticidadeLabel(created.probabilidade, created.impacto)}).`,
      dados: { id: created.id },
      rota: "/riscos",
      entidadeTipo: "risco",
      entidadeId: created.id,
    };
  },
  formRota: "/riscos",
};

const atualizarRiscoSchema = z.object({
  riscoId: z.string().min(8),
  descricao: z.string().min(10).max(1000).optional(),
  categoria: z.enum(CATEGORIAS_RISCO).optional(),
  probabilidade: z.number().int().min(1).max(5).optional(),
  impacto: z.number().int().min(1).max(5).optional(),
  status: z.enum(STATUS_RISCO).optional(),
  planoMitigacao: z.string().max(1500).optional(),
  responsavelId: z.string().optional(),
});
type AtualizarRiscoParams = z.infer<typeof atualizarRiscoSchema>;

const atualizarRisco: ToolDefinition<AtualizarRiscoParams> = {
  name: "atualizar_risco",
  description:
    "Atualiza campos de um risco existente — status, probabilidade, impacto, responsável, plano de mitigação ou descrição. Use quando o usuário pedir reavaliação ou mudança de status. Para apenas registrar uma ação tomada de mitigação, prefira registrar_mitigacao.",
  paramsSchema: atualizarRiscoSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["riscoId"],
    properties: {
      riscoId: { type: "string", description: "ID real do risco (do CATÁLOGO)." },
      descricao: { type: "string" },
      categoria: { type: "string", enum: [...CATEGORIAS_RISCO] },
      probabilidade: { type: "integer", minimum: 1, maximum: 5 },
      impacto: { type: "integer", minimum: 1, maximum: 5 },
      status: { type: "string", enum: [...STATUS_RISCO] },
      planoMitigacao: { type: "string" },
      responsavelId: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar risco",
    descricao: "Vamos ajustar o risco selecionado.",
    campos: [
      { label: "ID", valor: p.riscoId },
      strField("Nova descrição", p.descricao),
      strField("Categoria", p.categoria),
      p.probabilidade !== undefined ? { label: "Probabilidade", valor: `${p.probabilidade}/5` } : null,
      p.impacto !== undefined ? { label: "Impacto", valor: `${p.impacto}/5` } : null,
      strField("Status", p.status),
      strField("Plano de mitigação", p.planoMitigacao),
      strField("Responsável", p.responsavelId),
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await storage.getRisco(p.riscoId);
    if (!existing || existing.empresaId !== ctx.empresaId) {
      throw new Error("Risco não encontrado nesta empresa.");
    }
    const patch: Partial<typeof existing> = {};
    if (p.descricao) patch.descricao = p.descricao;
    if (p.categoria) patch.categoria = p.categoria;
    if (p.probabilidade !== undefined) patch.probabilidade = p.probabilidade;
    if (p.impacto !== undefined) patch.impacto = p.impacto;
    if (p.status) patch.status = p.status;
    if (p.planoMitigacao !== undefined) patch.planoMitigacao = p.planoMitigacao;
    if (p.responsavelId !== undefined) {
      if (p.responsavelId === "") {
        (patch as Record<string, unknown>).responsavelId = null;
      } else {
        const u = await storage.getUsuarioById(p.responsavelId);
        if (u && u.empresaId === ctx.empresaId) patch.responsavelId = u.id;
      }
    }
    const updated = await storage.updateRisco(p.riscoId, ctx.empresaId, patch);
    return {
      resumo: `Risco "${updated.descricao.slice(0, 60)}" atualizado.`,
      dados: { id: updated.id },
      rota: "/riscos",
      entidadeTipo: "risco",
      entidadeId: updated.id,
    };
  },
  formRota: "/riscos",
  statusLabel: "Atualizando risco…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const existing = await storage.getRisco(p.riscoId);
      if (!existing || existing.empresaId !== ctx.empresaId) return preview;
      const before: Record<string, { raw: string | null | undefined; numeric?: boolean }> = {
        "Nova descrição": { raw: existing.descricao ?? null },
        "Categoria": { raw: existing.categoria ?? null },
        "Probabilidade": { raw: existing.probabilidade != null ? `${existing.probabilidade}/5` : null },
        "Impacto": { raw: existing.impacto != null ? `${existing.impacto}/5` : null },
        "Status": { raw: existing.status ?? null },
        "Plano de mitigação": { raw: (existing as { planoMitigacao?: string | null }).planoMitigacao ?? null },
        "Responsável": { raw: (existing as { responsavelId?: string | null }).responsavelId ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

const registrarMitigacaoSchema = z.object({
  riscoId: z.string().min(8),
  acao: z.string().min(3).max(600),
  marcarComoMitigado: z.boolean().default(false),
});
type RegistrarMitigacaoParams = z.infer<typeof registrarMitigacaoSchema>;

const registrarMitigacao: ToolDefinition<RegistrarMitigacaoParams> = {
  name: "registrar_mitigacao",
  description:
    "Anexa uma ação de mitigação tomada ao histórico do risco (preserva o texto anterior, prependendo uma linha datada [YYYY-MM-DD]). Opcionalmente, marca o risco como 'mitigado'. Use quando o usuário disser que executou uma ação contra um risco existente (ex.: 'já implementei o plano de contingência X', 'esse risco já foi resolvido', 'mitigamos com Y').",
  paramsSchema: registrarMitigacaoSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["riscoId", "acao"],
    properties: {
      riscoId: { type: "string", description: "ID real do risco (do CATÁLOGO)." },
      acao: { type: "string", description: "Ação de mitigação tomada (texto livre, vai para o histórico)." },
      marcarComoMitigado: { type: "boolean", description: "Se true, muda também o status para 'mitigado'." },
    },
  },
  preview: (p) => ({
    titulo: "Registrar ação de mitigação",
    descricao: p.marcarComoMitigado
      ? "Vamos anexar a ação ao histórico do risco e marcá-lo como mitigado."
      : "Vamos anexar a ação ao histórico do plano de mitigação do risco.",
    campos: [
      { label: "Risco", valor: p.riscoId },
      { label: "Ação tomada", valor: p.acao },
      { label: "Marcar como mitigado", valor: p.marcarComoMitigado ? "Sim" : "Não" },
    ],
    ctaConfirmar: "Registrar mitigação",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await storage.getRisco(p.riscoId);
    if (!existing || existing.empresaId !== ctx.empresaId) {
      throw new Error("Risco não encontrado nesta empresa.");
    }
    const data = new Date().toISOString().slice(0, 10);
    const linhaNova = `[${data}] ${p.acao.trim()}`;
    const atual = (existing.planoMitigacao ?? "").trim();
    const novoPlano = atual ? `${linhaNova}\n${atual}` : linhaNova;
    const patch: Partial<typeof existing> = { planoMitigacao: novoPlano };
    if (p.marcarComoMitigado) patch.status = "mitigado";
    const updated = await storage.updateRisco(p.riscoId, ctx.empresaId, patch);
    return {
      resumo: p.marcarComoMitigado
        ? `Mitigação registrada e risco "${updated.descricao.slice(0, 50)}" marcado como mitigado.`
        : `Mitigação registrada no risco "${updated.descricao.slice(0, 50)}".`,
      dados: { id: updated.id, status: updated.status },
      rota: "/riscos",
      entidadeTipo: "risco",
      entidadeId: updated.id,
    };
  },
  formRota: "/riscos",
};

// ─── Task #286 — Tools de diagnóstico externo (SWOT, PESTEL, 5 Forças, Oportunidades) ───
const TIPOS_SWOT = ["forca", "fraqueza", "oportunidade", "ameaca"] as const;
const NIVEIS_IMPACTO = ["alto", "médio", "baixo"] as const;
const DIMENSOES_PESTEL = ["politico", "economico", "social", "tecnologico", "ambiental", "legal"] as const;
const FORCAS_PORTER = ["rivalidade_concorrentes", "poder_fornecedores", "poder_clientes", "ameaca_novos_entrantes", "ameaca_substitutos"] as const;
const NIVEIS_INTENSIDADE = ["alta", "média", "baixa"] as const;
const TIPOS_OPORTUNIDADE = ["penetracao_mercado", "desenvolvimento_mercado", "desenvolvimento_produto", "diversificacao"] as const;

// ---------- SWOT ----------
const criarItemSwotSchema = z.object({
  tipo: z.enum(TIPOS_SWOT),
  descricao: z.string().min(3).max(600),
  impacto: z.enum(NIVEIS_IMPACTO).default("médio"),
});
type CriarItemSwotParams = z.infer<typeof criarItemSwotSchema>;

const criarItemSwot: ToolDefinition<CriarItemSwotParams> = {
  name: "criar_item_swot",
  description: "Cria um item na análise SWOT da empresa (força, fraqueza, oportunidade ou ameaça). Use quando o usuário identificar um novo elemento estratégico interno/externo do diagnóstico.",
  paramsSchema: criarItemSwotSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["tipo", "descricao"],
    properties: {
      tipo: { type: "string", enum: [...TIPOS_SWOT], description: "Quadrante do SWOT." },
      descricao: { type: "string", description: "Descrição clara do item." },
      impacto: { type: "string", enum: [...NIVEIS_IMPACTO], description: "Impacto estimado." },
    },
  },
  preview: (p) => ({
    titulo: `Adicionar ${p.tipo} ao SWOT`,
    descricao: `Vamos registrar uma nova ${p.tipo} no SWOT com impacto ${p.impacto}.`,
    campos: [
      { label: "Quadrante", valor: p.tipo },
      { label: "Descrição", valor: p.descricao },
      { label: "Impacto", valor: p.impacto },
    ],
    ctaConfirmar: "Adicionar ao SWOT",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Task #335 — defesa em profundidade contra item SWOT duplicado
    // dentro do mesmo quadrante.
    const dupSwot = await buscarItensSwotSimilares(ctx.empresaId, p.tipo, p.descricao);
    if (dupSwot.length > 0) {
      throw new EntidadeDuplicadaError(`item SWOT (${p.tipo})`, dupSwot);
    }
    const created = await storage.createAnaliseSwot({
      empresaId: ctx.empresaId,
      tipo: p.tipo,
      descricao: p.descricao,
      impacto: p.impacto,
    });
    return {
      resumo: `Item SWOT (${p.tipo}) "${created.descricao.slice(0, 60)}" registrado.`,
      dados: { id: created.id },
      rota: "/swot",
      entidadeTipo: "swot",
      entidadeId: created.id,
    };
  },
  formRota: "/swot",
  statusLabel: "Adicionando item ao SWOT…",
};

const atualizarItemSwotSchema = z.object({
  swotId: z.string().min(8),
  tipo: z.enum(TIPOS_SWOT).optional(),
  descricao: z.string().min(3).max(600).optional(),
  impacto: z.enum(NIVEIS_IMPACTO).optional(),
});
type AtualizarItemSwotParams = z.infer<typeof atualizarItemSwotSchema>;

const atualizarItemSwot: ToolDefinition<AtualizarItemSwotParams> = {
  name: "atualizar_item_swot",
  description: "Atualiza um item existente do SWOT (quadrante, descrição ou impacto). Use o id do CATÁLOGO ou de buscar_entidade_por_nome.",
  paramsSchema: atualizarItemSwotSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["swotId"],
    properties: {
      swotId: { type: "string", description: "ID do item SWOT." },
      tipo: { type: "string", enum: [...TIPOS_SWOT] },
      descricao: { type: "string" },
      impacto: { type: "string", enum: [...NIVEIS_IMPACTO] },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar item do SWOT",
    descricao: "Vamos aplicar mudanças neste item do SWOT.",
    campos: [
      p.tipo ? { label: "Quadrante", valor: p.tipo } : null,
      p.descricao ? { label: "Descrição", valor: p.descricao } : null,
      p.impacto ? { label: "Impacto", valor: p.impacto } : null,
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const lista = await storage.getAnaliseSwot(ctx.empresaId);
    const existing = lista.find((x) => x.id === p.swotId);
    if (!existing) throw new Error("Item SWOT não encontrado nesta empresa.");
    const patch: Partial<typeof existing> = {};
    if (p.tipo) patch.tipo = p.tipo;
    if (p.descricao) patch.descricao = p.descricao;
    if (p.impacto) patch.impacto = p.impacto;
    const updated = await storage.updateAnaliseSwot(p.swotId, ctx.empresaId, patch);
    return {
      resumo: `Item SWOT (${updated.tipo}) atualizado.`,
      dados: { id: updated.id },
      rota: "/swot",
      entidadeTipo: "swot",
      entidadeId: updated.id,
    };
  },
  formRota: "/swot",
  statusLabel: "Atualizando item do SWOT…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const lista = await storage.getAnaliseSwot(ctx.empresaId);
      const existing = lista.find((x) => x.id === p.swotId);
      if (!existing) return preview;
      const before: Record<string, { raw: string | null | undefined }> = {
        "Quadrante": { raw: existing.tipo },
        "Descrição": { raw: existing.descricao },
        "Impacto": { raw: existing.impacto },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

const arquivarItemSwotSchema = z.object({
  swotId: z.string().min(8),
});
type ArquivarItemSwotParams = z.infer<typeof arquivarItemSwotSchema>;

const arquivarItemSwot: ToolDefinition<ArquivarItemSwotParams> = {
  name: "arquivar_item_swot",
  description: "Remove (arquiva) um item obsoleto do SWOT. Use quando o usuário disser que um item não é mais relevante.",
  paramsSchema: arquivarItemSwotSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["swotId"],
    properties: {
      swotId: { type: "string", description: "ID do item SWOT a arquivar." },
    },
  },
  preview: (p) => ({
    titulo: "Arquivar item do SWOT",
    descricao: "Este item será removido da análise SWOT atual.",
    campos: [{ label: "Item", valor: p.swotId }],
    ctaConfirmar: "Arquivar",
    ctaIgnorar: "Manter",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const lista = await storage.getAnaliseSwot(ctx.empresaId);
    const existing = lista.find((x) => x.id === p.swotId);
    if (!existing) throw new Error("Item SWOT não encontrado nesta empresa.");
    await storage.deleteAnaliseSwot(p.swotId, ctx.empresaId);
    return {
      resumo: `Item SWOT (${existing.tipo}) "${existing.descricao.slice(0, 50)}" arquivado.`,
      dados: { id: p.swotId },
      rota: "/swot",
      entidadeTipo: "swot",
      entidadeId: p.swotId,
    };
  },
  formRota: "/swot",
  statusLabel: "Arquivando item do SWOT…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const lista = await storage.getAnaliseSwot(ctx.empresaId);
      const existing = lista.find((x) => x.id === p.swotId);
      if (!existing) return preview;
      return {
        ...preview,
        campos: [
          { label: "Quadrante", valor: existing.tipo },
          { label: "Descrição", valor: existing.descricao },
          { label: "Impacto", valor: existing.impacto },
        ],
      };
    } catch { return preview; }
  },
};

// ---------- PESTEL ----------
const criarFatorPestelSchema = z.object({
  tipo: z.enum(DIMENSOES_PESTEL),
  descricao: z.string().min(3).max(600),
  impacto: z.enum(NIVEIS_IMPACTO).default("médio"),
  evidencia: z.string().max(600).optional(),
});
type CriarFatorPestelParams = z.infer<typeof criarFatorPestelSchema>;

const criarFatorPestel: ToolDefinition<CriarFatorPestelParams> = {
  name: "criar_fator_pestel",
  description: "Cria um novo fator PESTEL (político, econômico, social, tecnológico, ambiental ou legal) no diagnóstico externo.",
  paramsSchema: criarFatorPestelSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["tipo", "descricao"],
    properties: {
      tipo: { type: "string", enum: [...DIMENSOES_PESTEL], description: "Dimensão do PESTEL." },
      descricao: { type: "string", description: "Descrição do fator." },
      impacto: { type: "string", enum: [...NIVEIS_IMPACTO] },
      evidencia: { type: "string", description: "Evidência ou fonte (opcional)." },
    },
  },
  preview: (p) => ({
    titulo: `Adicionar fator PESTEL (${p.tipo})`,
    descricao: `Vamos registrar um novo fator ${p.tipo} no PESTEL com impacto ${p.impacto}.`,
    campos: [
      { label: "Dimensão", valor: p.tipo },
      { label: "Descrição", valor: p.descricao },
      { label: "Impacto", valor: p.impacto },
      ...(p.evidencia ? [{ label: "Evidência", valor: p.evidencia }] : []),
    ],
    ctaConfirmar: "Adicionar ao PESTEL",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Task #335 — defesa em profundidade contra fator PESTEL duplicado
    // dentro da mesma dimensão.
    const dupPestel = await buscarFatoresPestelSimilares(ctx.empresaId, p.tipo, p.descricao);
    if (dupPestel.length > 0) {
      throw new EntidadeDuplicadaError(`fator PESTEL (${p.tipo})`, dupPestel);
    }
    const created = await storage.createFatorPestel({
      empresaId: ctx.empresaId,
      tipo: p.tipo,
      descricao: p.descricao,
      impacto: p.impacto,
      evidencia: p.evidencia ?? "",
    });
    return {
      resumo: `Fator PESTEL (${p.tipo}) "${created.descricao.slice(0, 60)}" registrado.`,
      dados: { id: created.id },
      rota: "/pestel",
      entidadeTipo: "fator_pestel",
      entidadeId: created.id,
    };
  },
  formRota: "/pestel",
  statusLabel: "Adicionando fator ao PESTEL…",
};

const atualizarFatorPestelSchema = z.object({
  pestelId: z.string().min(8),
  tipo: z.enum(DIMENSOES_PESTEL).optional(),
  descricao: z.string().min(3).max(600).optional(),
  impacto: z.enum(NIVEIS_IMPACTO).optional(),
  evidencia: z.string().max(600).optional(),
});
type AtualizarFatorPestelParams = z.infer<typeof atualizarFatorPestelSchema>;

const atualizarFatorPestel: ToolDefinition<AtualizarFatorPestelParams> = {
  name: "atualizar_fator_pestel",
  description: "Atualiza um fator PESTEL existente (dimensão, descrição, impacto ou evidência).",
  paramsSchema: atualizarFatorPestelSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["pestelId"],
    properties: {
      pestelId: { type: "string" },
      tipo: { type: "string", enum: [...DIMENSOES_PESTEL] },
      descricao: { type: "string" },
      impacto: { type: "string", enum: [...NIVEIS_IMPACTO] },
      evidencia: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar fator PESTEL",
    descricao: "Vamos aplicar mudanças neste fator do PESTEL.",
    campos: [
      p.tipo ? { label: "Dimensão", valor: p.tipo } : null,
      p.descricao ? { label: "Descrição", valor: p.descricao } : null,
      p.impacto ? { label: "Impacto", valor: p.impacto } : null,
      p.evidencia !== undefined ? { label: "Evidência", valor: p.evidencia || "(vazio)" } : null,
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const lista = await storage.getFatoresPestel(ctx.empresaId);
    const existing = lista.find((x) => x.id === p.pestelId);
    if (!existing) throw new Error("Fator PESTEL não encontrado nesta empresa.");
    const patch: Partial<typeof existing> = {};
    if (p.tipo) patch.tipo = p.tipo;
    if (p.descricao) patch.descricao = p.descricao;
    if (p.impacto) patch.impacto = p.impacto;
    if (p.evidencia !== undefined) patch.evidencia = p.evidencia;
    const updated = await storage.updateFatorPestel(p.pestelId, ctx.empresaId, patch);
    return {
      resumo: `Fator PESTEL (${updated.tipo}) atualizado.`,
      dados: { id: updated.id },
      rota: "/pestel",
      entidadeTipo: "fator_pestel",
      entidadeId: updated.id,
    };
  },
  formRota: "/pestel",
  statusLabel: "Atualizando fator PESTEL…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const lista = await storage.getFatoresPestel(ctx.empresaId);
      const existing = lista.find((x) => x.id === p.pestelId);
      if (!existing) return preview;
      const before: Record<string, { raw: string | null | undefined }> = {
        "Dimensão": { raw: existing.tipo },
        "Descrição": { raw: existing.descricao },
        "Impacto": { raw: existing.impacto },
        "Evidência": { raw: existing.evidencia ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

const arquivarFatorPestelSchema = z.object({
  pestelId: z.string().min(8),
});
type ArquivarFatorPestelParams = z.infer<typeof arquivarFatorPestelSchema>;

const arquivarFatorPestel: ToolDefinition<ArquivarFatorPestelParams> = {
  name: "arquivar_fator_pestel",
  description: "Remove (arquiva) um fator PESTEL obsoleto.",
  paramsSchema: arquivarFatorPestelSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["pestelId"],
    properties: { pestelId: { type: "string" } },
  },
  preview: (p) => ({
    titulo: "Arquivar fator PESTEL",
    descricao: "Este fator será removido do PESTEL atual.",
    campos: [{ label: "Item", valor: p.pestelId }],
    ctaConfirmar: "Arquivar",
    ctaIgnorar: "Manter",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const lista = await storage.getFatoresPestel(ctx.empresaId);
    const existing = lista.find((x) => x.id === p.pestelId);
    if (!existing) throw new Error("Fator PESTEL não encontrado nesta empresa.");
    await storage.deleteFatorPestel(p.pestelId, ctx.empresaId);
    return {
      resumo: `Fator PESTEL (${existing.tipo}) "${existing.descricao.slice(0, 50)}" arquivado.`,
      dados: { id: p.pestelId },
      rota: "/pestel",
      entidadeTipo: "fator_pestel",
      entidadeId: p.pestelId,
    };
  },
  formRota: "/pestel",
  statusLabel: "Arquivando fator PESTEL…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const lista = await storage.getFatoresPestel(ctx.empresaId);
      const existing = lista.find((x) => x.id === p.pestelId);
      if (!existing) return preview;
      return {
        ...preview,
        campos: [
          { label: "Dimensão", valor: existing.tipo },
          { label: "Descrição", valor: existing.descricao },
          { label: "Impacto", valor: existing.impacto },
          ...(existing.evidencia ? [{ label: "Evidência", valor: existing.evidencia }] : []),
        ],
      };
    } catch { return preview; }
  },
};

// ---------- 5 Forças ----------
async function findOrInitForca(empresaId: string, forca: typeof FORCAS_PORTER[number]) {
  const lista = await storage.getCincoForcas(empresaId);
  const existing = lista.find((x) => x.forca === forca);
  if (existing) return existing;
  return await storage.createCincoForcas({
    empresaId,
    forca,
    descricao: "",
    intensidade: "média",
    impacto: "",
  });
}

const atualizarIntensidadeForcaSchema = z.object({
  forca: z.enum(FORCAS_PORTER),
  intensidade: z.enum(NIVEIS_INTENSIDADE),
  impacto: z.string().max(400).optional(),
});
type AtualizarIntensidadeForcaParams = z.infer<typeof atualizarIntensidadeForcaSchema>;

const atualizarIntensidadeForca: ToolDefinition<AtualizarIntensidadeForcaParams> = {
  name: "atualizar_intensidade_forca",
  description: "Atualiza a intensidade (alta/média/baixa) de uma das 5 Forças de Porter (rivalidade, fornecedores, clientes, novos entrantes, substitutos). As 5 forças são fixas — esta tool só atualiza a intensidade e o impacto estratégico, nunca cria uma nova força.",
  paramsSchema: atualizarIntensidadeForcaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["forca", "intensidade"],
    properties: {
      forca: { type: "string", enum: [...FORCAS_PORTER], description: "Chave canônica da força." },
      intensidade: { type: "string", enum: [...NIVEIS_INTENSIDADE] },
      impacto: { type: "string", description: "Resumo do impacto estratégico (opcional)." },
    },
  },
  preview: (p) => ({
    titulo: `Atualizar intensidade — ${p.forca}`,
    descricao: `Vamos definir a intensidade da força "${p.forca}" como ${p.intensidade}.`,
    campos: [
      { label: "Força", valor: p.forca },
      { label: "Intensidade", valor: p.intensidade },
      ...(p.impacto ? [{ label: "Impacto", valor: p.impacto }] : []),
    ],
    ctaConfirmar: "Aplicar mudança",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await findOrInitForca(ctx.empresaId, p.forca);
    const patch: Partial<typeof existing> = { intensidade: p.intensidade };
    if (p.impacto !== undefined) patch.impacto = p.impacto;
    const updated = await storage.updateCincoForcas(existing.id, ctx.empresaId, patch);
    return {
      resumo: `Força "${p.forca}" agora está com intensidade ${p.intensidade}.`,
      dados: { id: updated.id },
      rota: "/cinco-forcas",
      entidadeTipo: "cinco_forcas",
      entidadeId: updated.id,
    };
  },
  formRota: "/cinco-forcas",
  statusLabel: "Atualizando intensidade da força…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const lista = await storage.getCincoForcas(ctx.empresaId);
      const existing = lista.find((x) => x.forca === p.forca);
      if (!existing) return preview;
      const before: Record<string, { raw: string | null | undefined }> = {
        "Intensidade": { raw: existing.intensidade },
        "Impacto": { raw: existing.impacto ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

const adicionarEvidenciaForcaSchema = z.object({
  forca: z.enum(FORCAS_PORTER),
  evidencia: z.string().min(3).max(600),
});
type AdicionarEvidenciaForcaParams = z.infer<typeof adicionarEvidenciaForcaSchema>;

const adicionarEvidenciaForca: ToolDefinition<AdicionarEvidenciaForcaParams> = {
  name: "adicionar_evidencia_forca",
  description: "Anexa uma nova evidência ao histórico da força de Porter (preserva o texto anterior, prependendo uma linha datada [YYYY-MM-DD]). Use quando o usuário trouxer um novo dado, fato ou observação que reforce/justifique a intensidade da força.",
  paramsSchema: adicionarEvidenciaForcaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["forca", "evidencia"],
    properties: {
      forca: { type: "string", enum: [...FORCAS_PORTER] },
      evidencia: { type: "string", description: "Texto da evidência a adicionar." },
    },
  },
  preview: (p) => ({
    titulo: `Adicionar evidência — ${p.forca}`,
    descricao: "Vamos anexar esta evidência ao histórico da força.",
    campos: [
      { label: "Força", valor: p.forca },
      { label: "Evidência", valor: p.evidencia },
    ],
    ctaConfirmar: "Adicionar evidência",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await findOrInitForca(ctx.empresaId, p.forca);
    const data = new Date().toISOString().slice(0, 10);
    const linhaNova = `[${data}] ${p.evidencia.trim()}`;
    const atual = (existing.descricao ?? "").trim();
    const novaDesc = atual ? `${linhaNova}\n${atual}` : linhaNova;
    const updated = await storage.updateCincoForcas(existing.id, ctx.empresaId, { descricao: novaDesc });
    return {
      resumo: `Evidência adicionada à força "${p.forca}".`,
      dados: { id: updated.id },
      rota: "/cinco-forcas",
      entidadeTipo: "cinco_forcas",
      entidadeId: updated.id,
    };
  },
  formRota: "/cinco-forcas",
  statusLabel: "Registrando evidência da força…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const lista = await storage.getCincoForcas(ctx.empresaId);
      const existing = lista.find((x) => x.forca === p.forca);
      if (!existing) return preview;
      const historicoAtual = (existing.descricao ?? "").trim();
      const campos = [
        ...(preview.campos ?? []),
        ...(historicoAtual
          ? [{ label: "Histórico atual", valor: historicoAtual.slice(0, 400) + (historicoAtual.length > 400 ? "…" : "") }]
          : [{ label: "Histórico atual", valor: "(sem evidências anteriores)" }]),
      ];
      return { ...preview, campos };
    } catch { return preview; }
  },
};

// ---------- Oportunidades de Crescimento ----------
const criarOportunidadeSchema = z.object({
  tipo: z.enum(TIPOS_OPORTUNIDADE),
  titulo: z.string().min(3).max(160),
  descricao: z.string().min(3).max(600),
  potencial: z.enum(NIVEIS_IMPACTO).default("médio"),
  risco: z.enum(NIVEIS_IMPACTO).default("médio"),
  estrategiaId: z.string().optional(),
});
type CriarOportunidadeParams = z.infer<typeof criarOportunidadeSchema>;

const criarOportunidade: ToolDefinition<CriarOportunidadeParams> = {
  name: "criar_oportunidade",
  description: "Cria uma oportunidade de crescimento usando a matriz de Ansoff (penetração, desenvolvimento de mercado, desenvolvimento de produto ou diversificação).",
  paramsSchema: criarOportunidadeSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["tipo", "titulo", "descricao"],
    properties: {
      tipo: { type: "string", enum: [...TIPOS_OPORTUNIDADE], description: "Quadrante de Ansoff." },
      titulo: { type: "string" },
      descricao: { type: "string" },
      potencial: { type: "string", enum: [...NIVEIS_IMPACTO] },
      risco: { type: "string", enum: [...NIVEIS_IMPACTO] },
      estrategiaId: { type: "string", description: "ID de estratégia vinculada (opcional)." },
    },
  },
  preview: (p) => ({
    titulo: `Nova oportunidade: ${p.titulo}`,
    descricao: `Vamos registrar uma oportunidade de crescimento (${p.tipo}) com potencial ${p.potencial} e risco ${p.risco}.`,
    campos: [
      { label: "Quadrante Ansoff", valor: p.tipo },
      { label: "Título", valor: p.titulo },
      { label: "Descrição", valor: p.descricao },
      { label: "Potencial", valor: p.potencial },
      { label: "Risco", valor: p.risco },
      ...(p.estrategiaId ? [{ label: "Estratégia", valor: p.estrategiaId }] : []),
    ],
    ctaConfirmar: "Criar oportunidade",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Task #335 — defesa em profundidade contra oportunidade duplicada.
    const dupOp = await buscarOportunidadesSimilares(ctx.empresaId, p.titulo);
    if (dupOp.length > 0) {
      throw new EntidadeDuplicadaError("oportunidade de crescimento", dupOp);
    }
    let estrategiaId: string | null = null;
    if (p.estrategiaId) {
      const est = await storage.getEstrategia(p.estrategiaId);
      if (est && est.empresaId === ctx.empresaId) estrategiaId = est.id;
    }
    const created = await storage.createOportunidadeCrescimento({
      empresaId: ctx.empresaId,
      tipo: p.tipo,
      titulo: p.titulo,
      descricao: p.descricao,
      potencial: p.potencial,
      risco: p.risco,
      estrategiaId,
    });
    return {
      resumo: `Oportunidade "${created.titulo}" criada (${p.tipo}).`,
      dados: { id: created.id },
      rota: "/oportunidades-crescimento",
      entidadeTipo: "oportunidade_crescimento",
      entidadeId: created.id,
    };
  },
  formRota: "/oportunidades-crescimento",
  statusLabel: "Criando oportunidade…",
};

const atualizarOportunidadeSchema = z.object({
  oportunidadeId: z.string().min(8),
  tipo: z.enum(TIPOS_OPORTUNIDADE).optional(),
  titulo: z.string().min(3).max(160).optional(),
  descricao: z.string().min(3).max(600).optional(),
  potencial: z.enum(NIVEIS_IMPACTO).optional(),
  risco: z.enum(NIVEIS_IMPACTO).optional(),
  estrategiaId: z.string().optional(),
});
type AtualizarOportunidadeParams = z.infer<typeof atualizarOportunidadeSchema>;

const atualizarOportunidade: ToolDefinition<AtualizarOportunidadeParams> = {
  name: "atualizar_oportunidade",
  description: "Atualiza uma oportunidade de crescimento existente.",
  paramsSchema: atualizarOportunidadeSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["oportunidadeId"],
    properties: {
      oportunidadeId: { type: "string" },
      tipo: { type: "string", enum: [...TIPOS_OPORTUNIDADE] },
      titulo: { type: "string" },
      descricao: { type: "string" },
      potencial: { type: "string", enum: [...NIVEIS_IMPACTO] },
      risco: { type: "string", enum: [...NIVEIS_IMPACTO] },
      estrategiaId: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar oportunidade",
    descricao: "Vamos aplicar mudanças nesta oportunidade.",
    campos: [
      p.titulo ? { label: "Título", valor: p.titulo } : null,
      p.tipo ? { label: "Quadrante Ansoff", valor: p.tipo } : null,
      p.descricao ? { label: "Descrição", valor: p.descricao } : null,
      p.potencial ? { label: "Potencial", valor: p.potencial } : null,
      p.risco ? { label: "Risco", valor: p.risco } : null,
      p.estrategiaId !== undefined ? { label: "Estratégia", valor: p.estrategiaId || "(sem estratégia)" } : null,
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await storage.getOportunidadeCrescimento(p.oportunidadeId);
    if (!existing || existing.empresaId !== ctx.empresaId) {
      throw new Error("Oportunidade não encontrada nesta empresa.");
    }
    const patch: Partial<typeof existing> = {};
    if (p.tipo) patch.tipo = p.tipo;
    if (p.titulo) patch.titulo = p.titulo;
    if (p.descricao) patch.descricao = p.descricao;
    if (p.potencial) patch.potencial = p.potencial;
    if (p.risco) patch.risco = p.risco;
    if (p.estrategiaId !== undefined) {
      let estrategiaId: string | null = null;
      if (p.estrategiaId) {
        const est = await storage.getEstrategia(p.estrategiaId);
        if (est && est.empresaId === ctx.empresaId) estrategiaId = est.id;
      }
      (patch as Record<string, unknown>).estrategiaId = estrategiaId;
    }
    const updated = await storage.updateOportunidadeCrescimento(p.oportunidadeId, ctx.empresaId, patch);
    return {
      resumo: `Oportunidade "${updated.titulo}" atualizada.`,
      dados: { id: updated.id },
      rota: "/oportunidades-crescimento",
      entidadeTipo: "oportunidade_crescimento",
      entidadeId: updated.id,
    };
  },
  formRota: "/oportunidades-crescimento",
  statusLabel: "Atualizando oportunidade…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const existing = await storage.getOportunidadeCrescimento(p.oportunidadeId);
      if (!existing || existing.empresaId !== ctx.empresaId) return preview;
      const before: Record<string, { raw: string | null | undefined }> = {
        "Título": { raw: existing.titulo ?? null },
        "Quadrante Ansoff": { raw: existing.tipo },
        "Descrição": { raw: existing.descricao ?? null },
        "Potencial": { raw: existing.potencial ?? null },
        "Risco": { raw: existing.risco ?? null },
        "Estratégia": { raw: (existing as { estrategiaId?: string | null }).estrategiaId ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

const arquivarOportunidadeSchema = z.object({
  oportunidadeId: z.string().min(8),
});
type ArquivarOportunidadeParams = z.infer<typeof arquivarOportunidadeSchema>;

const arquivarOportunidade: ToolDefinition<ArquivarOportunidadeParams> = {
  name: "arquivar_oportunidade",
  description: "Remove (arquiva) uma oportunidade de crescimento obsoleta.",
  paramsSchema: arquivarOportunidadeSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["oportunidadeId"],
    properties: { oportunidadeId: { type: "string" } },
  },
  preview: (p) => ({
    titulo: "Arquivar oportunidade",
    descricao: "Esta oportunidade será removida do diagnóstico atual.",
    campos: [{ label: "Item", valor: p.oportunidadeId }],
    ctaConfirmar: "Arquivar",
    ctaIgnorar: "Manter",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await storage.getOportunidadeCrescimento(p.oportunidadeId);
    if (!existing || existing.empresaId !== ctx.empresaId) {
      throw new Error("Oportunidade não encontrada nesta empresa.");
    }
    await storage.deleteOportunidadeCrescimento(p.oportunidadeId, ctx.empresaId);
    return {
      resumo: `Oportunidade "${existing.titulo}" arquivada.`,
      dados: { id: p.oportunidadeId },
      rota: "/oportunidades-crescimento",
      entidadeTipo: "oportunidade_crescimento",
      entidadeId: p.oportunidadeId,
    };
  },
  formRota: "/oportunidades-crescimento",
  statusLabel: "Arquivando oportunidade…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const existing = await storage.getOportunidadeCrescimento(p.oportunidadeId);
      if (!existing || existing.empresaId !== ctx.empresaId) return preview;
      return {
        ...preview,
        campos: [
          { label: "Título", valor: existing.titulo ?? "" },
          { label: "Quadrante Ansoff", valor: existing.tipo },
          { label: "Descrição", valor: existing.descricao ?? "" },
        ],
      };
    } catch { return preview; }
  },
};

// ---------- Registry ----------
// ---------- Task #233 — Tools de rituais de gestão ----------
const gerarPautaSchema = z.object({
  tipo: tipoRitoEnum,
  dataAlvo: z.string().min(8).max(32),
  notaDoUsuario: z.string().max(500).optional(),
});
type GerarPautaParams = z.infer<typeof gerarPautaSchema>;
const gerarPautaReuniao: ToolDefinition<GerarPautaParams> = {
  name: "gerar_pauta_reuniao",
  description:
    "Gera (e persiste) a pauta de uma reunião de gestão (semanal/mensal/trimestral) com KPIs críticos, KRs próximos do prazo, iniciativas a revisar e decisões pendentes — pronta para guiar o ritual.",
  paramsSchema: gerarPautaSchema,
  jsonSchema: {
    type: "object",
    properties: {
      tipo: { type: "string", enum: ["semanal", "mensal", "trimestral"], description: "Tipo do rito de gestão." },
      dataAlvo: { type: "string", description: "Data da reunião no formato YYYY-MM-DD." },
      notaDoUsuario: { type: "string", description: "Nota livre do usuário sobre o foco da reunião (opcional)." },
    },
    required: ["tipo", "dataAlvo"],
    additionalProperties: false,
  },
  preview: (p) => ({
    titulo: `Gerar pauta da reunião ${p.tipo}`,
    descricao: `Monta a pauta da reunião ${p.tipo} para ${p.dataAlvo} com KPIs críticos, KRs no prazo e iniciativas a revisar.${p.notaDoUsuario ? ` Foco: ${p.notaDoUsuario}` : ""}`,
    campos: [
      { label: "Tipo", valor: p.tipo },
      { label: "Data alvo", valor: p.dataAlvo },
      ...(p.notaDoUsuario ? [{ label: "Foco", valor: p.notaDoUsuario }] : []),
    ],
    ctaConfirmar: "Gerar pauta",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const conteudoBase = await montarConteudoPauta(ctx.empresaId, p.tipo);
    const conteudo: ConteudoPauta & { notaDoUsuario?: string } = p.notaDoUsuario
      ? { ...conteudoBase, notaDoUsuario: p.notaDoUsuario }
      : conteudoBase;
    const pauta = await storage.createReuniaoPauta({
      empresaId: ctx.empresaId,
      tipo: p.tipo,
      dataAlvo: p.dataAlvo,
      conteudo,
      ataId: null,
    });
    return {
      resumo: `Pauta da reunião ${p.tipo} (${p.dataAlvo}) gerada — ${conteudoBase.kpisCriticos.length} KPI(s) críticos e ${conteudoBase.iniciativasARevisar.length} iniciativa(s) em foco.`,
      dados: { pautaId: pauta.id, conteudo },
      rota: `/ritos/gestao?aba=pautas&id=${pauta.id}`,
      entidadeTipo: "reuniao_pauta",
      entidadeId: pauta.id,
    };
  },
  formRota: "/ritos/gestao?aba=pautas",
};

const encaminhamentoSchema = z.object({
  tipo: z.enum([
    "criar_iniciativa",
    "atualizar_iniciativa",
    "encerrar_iniciativa",
    "criar_okr",
    "atualizar_okr",
    "adicionar_kr_a_okr",
    "atualizar_kr",
    "atualizar_progresso_kr",
    "criar_indicador",
    "atualizar_valor_indicador",
    "agendar_revisao",
  ]),
  parametros: z.record(z.string(), z.unknown()),
});
const registrarAtaSchema = z.object({
  pautaId: z.string().optional(),
  resumo: z.string().min(3).max(2000),
  decisoes: z.array(z.object({
    titulo: z.string().min(3).max(300),
    justificativa: z.string().max(1000).default(""),
  })).default([]),
  encaminhamentos: z.array(encaminhamentoSchema).default([]),
});
type RegistrarAtaParams = z.infer<typeof registrarAtaSchema>;
const registrarAta: ToolDefinition<RegistrarAtaParams> = {
  name: "registrar_ata",
  description:
    "Registra a ata de uma reunião de gestão: resumo, decisões tomadas e encaminhamentos. Cada encaminhamento vira uma proposta HITL separada (não executa nada às cegas).",
  paramsSchema: registrarAtaSchema,
  jsonSchema: {
    type: "object",
    properties: {
      pautaId: { type: "string", description: "ID da pauta vinculada (opcional)." },
      resumo: { type: "string", description: "Resumo curto da reunião." },
      decisoes: {
        type: "array",
        description: "Decisões tomadas na reunião.",
        items: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            justificativa: { type: "string" },
          },
          required: ["titulo"],
        },
      },
      encaminhamentos: {
        type: "array",
        description: "Encaminhamentos — cada um vira uma proposta HITL separada.",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["criar_iniciativa", "atualizar_iniciativa", "encerrar_iniciativa", "criar_okr", "atualizar_okr", "adicionar_kr_a_okr", "atualizar_kr", "atualizar_progresso_kr", "criar_indicador", "atualizar_valor_indicador", "agendar_revisao"] },
            parametros: { type: "object", description: "Parâmetros da tool a ser proposta — devem casar com o paramsSchema dela." },
          },
          required: ["tipo", "parametros"],
        },
      },
    },
    required: ["resumo"],
    additionalProperties: false,
  },
  preview: (p) => ({
    titulo: "Registrar ata da reunião",
    descricao: `Persiste o resumo da reunião com ${(p.decisoes ?? []).length} decisão(ões) e ${(p.encaminhamentos ?? []).length} encaminhamento(s) — cada encaminhamento vira uma proposta separada para você confirmar.`,
    campos: [
      { label: "Resumo", valor: p.resumo.slice(0, 200) },
      { label: "Decisões", valor: String((p.decisoes ?? []).length) },
      { label: "Encaminhamentos", valor: String((p.encaminhamentos ?? []).length) },
      ...(p.pautaId ? [{ label: "Pauta", valor: p.pautaId }] : []),
    ],
    ctaConfirmar: "Registrar ata",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const ata = await storage.createReuniaoAta({
      empresaId: ctx.empresaId,
      pautaId: p.pautaId ?? null,
      decisoes: p.decisoes,
      encaminhamentos: p.encaminhamentos,
    });
    if (p.pautaId) {
      try { await storage.setReuniaoPautaAta(p.pautaId, ctx.empresaId, ata.id); } catch { /* ignorar */ }
    }
    // Cada encaminhamento vira uma proposta HITL separada (não executamos nada às cegas).
    const propostasGeradas: Array<{ logId: string; tipo: string; ok: boolean; mensagem?: string }> = [];
    for (const enc of p.encaminhamentos) {
      try {
        const r = await registrarProposta({
          toolName: enc.tipo,
          rawArgs: enc.parametros,
          empresaId: ctx.empresaId,
          usuarioId: ctx.usuarioId ?? null,
          origem: "chat",
        });
        if (r.ok) propostasGeradas.push({ logId: r.logId, tipo: enc.tipo, ok: true });
        else propostasGeradas.push({ logId: "", tipo: enc.tipo, ok: false, mensagem: r.mensagem });
      } catch (e: any) {
        propostasGeradas.push({ logId: "", tipo: enc.tipo, ok: false, mensagem: e?.message ?? String(e) });
      }
    }
    const okCount = propostasGeradas.filter((x) => x.ok).length;
    return {
      resumo: `Ata registrada com ${p.decisoes.length} decisão(ões). ${okCount} de ${p.encaminhamentos.length} encaminhamento(s) foram propostos como cards para você confirmar.`,
      dados: { ataId: ata.id, propostasGeradas },
      rota: `/ritos/gestao?aba=atas&id=${ata.id}`,
      entidadeTipo: "reuniao_ata",
      entidadeId: ata.id,
    };
  },
  formRota: "/ritos/gestao?aba=atas",
};

const registrarDecisaoSchema = z.object({
  titulo: z.string().min(3).max(300),
  contexto: z.string().max(2000).default(""),
  alternativas: z.array(z.object({
    descricao: z.string().min(1).max(500),
    prosContras: z.string().max(500).default(""),
  })).default([]),
  escolha: z.string().min(1).max(500),
  justificativa: z.string().max(2000).default(""),
  ataId: z.string().optional(),
});
type RegistrarDecisaoParams = z.infer<typeof registrarDecisaoSchema>;
const registrarDecisao: ToolDefinition<RegistrarDecisaoParams> = {
  name: "registrar_decisao",
  description:
    "Registra uma decisão estratégica explícita (título, contexto, alternativas avaliadas, escolha e justificativa) no histórico de decisões da empresa.",
  paramsSchema: registrarDecisaoSchema,
  jsonSchema: {
    type: "object",
    properties: {
      titulo: { type: "string" },
      contexto: { type: "string" },
      alternativas: {
        type: "array",
        items: {
          type: "object",
          properties: { descricao: { type: "string" }, prosContras: { type: "string" } },
          required: ["descricao"],
        },
      },
      escolha: { type: "string" },
      justificativa: { type: "string" },
      ataId: { type: "string", description: "ID da ata vinculada (opcional)." },
    },
    required: ["titulo", "escolha"],
    additionalProperties: false,
  },
  preview: (p) => ({
    titulo: `Registrar decisão: ${p.titulo}`,
    descricao: `Escolha: ${p.escolha}${p.justificativa ? ` — ${p.justificativa.slice(0, 160)}` : ""}`,
    campos: [
      { label: "Título", valor: p.titulo },
      { label: "Escolha", valor: p.escolha },
      ...((p.alternativas ?? []).length ? [{ label: "Alternativas", valor: String((p.alternativas ?? []).length) }] : []),
      ...(p.justificativa ? [{ label: "Justificativa", valor: p.justificativa.slice(0, 200) }] : []),
    ],
    ctaConfirmar: "Registrar decisão",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const dec = await storage.createDecisaoEstrategica({
      empresaId: ctx.empresaId,
      titulo: p.titulo,
      contexto: p.contexto,
      alternativas: p.alternativas,
      escolha: p.escolha,
      justificativa: p.justificativa,
      registradaPorUsuarioId: ctx.usuarioId ?? null,
      ataId: p.ataId ?? null,
    });
    return {
      resumo: `Decisão "${p.titulo}" registrada no histórico.`,
      dados: { decisaoId: dec.id },
      rota: `/ritos/gestao?aba=decisoes&id=${dec.id}`,
      entidadeTipo: "decisao_estrategica",
      entidadeId: dec.id,
    };
  },
  formRota: "/ritos/gestao?aba=decisoes",
};

const agendarRevisaoSchema = z.object({
  escopo: z.enum(["iniciativa", "okr", "kr", "indicador", "estrategia", "plano"]),
  escopoId: z.string().optional(),
  dataAlvo: z.string().min(8).max(32),
  foco: z.string().max(500).default(""),
});
type AgendarRevisaoParams = z.infer<typeof agendarRevisaoSchema>;
const agendarRevisao: ToolDefinition<AgendarRevisaoParams> = {
  name: "agendar_revisao",
  description:
    "Agenda uma revisão futura de uma iniciativa, OKR, KR, indicador, estratégia ou do plano — vira um lembrete que aparece no briefing diário quando vencer.",
  paramsSchema: agendarRevisaoSchema,
  jsonSchema: {
    type: "object",
    properties: {
      escopo: { type: "string", enum: ["iniciativa", "okr", "kr", "indicador", "estrategia", "plano"] },
      escopoId: { type: "string", description: "ID do item a ser revisado (opcional para escopo 'plano')." },
      dataAlvo: { type: "string", description: "Data da revisão no formato YYYY-MM-DD." },
      foco: { type: "string", description: "O que precisa ser revisado / pergunta-guia (opcional)." },
    },
    required: ["escopo", "dataAlvo"],
    additionalProperties: false,
  },
  preview: (p) => ({
    titulo: `Agendar revisão de ${p.escopo}`,
    descricao: `Cria lembrete para revisar ${p.escopo}${p.escopoId ? ` (id ${p.escopoId})` : ""} em ${p.dataAlvo}${p.foco ? ` — foco: ${p.foco}` : ""}.`,
    campos: [
      { label: "Escopo", valor: p.escopo },
      { label: "Data alvo", valor: p.dataAlvo },
      ...(p.escopoId ? [{ label: "Item", valor: p.escopoId }] : []),
      ...(p.foco ? [{ label: "Foco", valor: p.foco }] : []),
    ],
    ctaConfirmar: "Agendar revisão",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const rev = await storage.createRevisaoAgendada({
      empresaId: ctx.empresaId,
      escopo: p.escopo,
      escopoId: p.escopoId ?? null,
      dataAlvo: p.dataAlvo,
      foco: p.foco,
      status: "pendente",
    });
    return {
      resumo: `Revisão de ${p.escopo} agendada para ${p.dataAlvo}.`,
      dados: { revisaoId: rev.id },
      rota: `/ritos/gestao?aba=revisoes&id=${rev.id}`,
      entidadeTipo: "revisao_agendada",
      entidadeId: rev.id,
    };
  },
  formRota: "/ritos/gestao?aba=revisoes",
};

// ─── Task #287 — Modelo & Estratégia (BMC / Estratégia / Mapa BSC / Cenários) ───

const TIPOS_ESTRATEGIA = ["FO", "FA", "DO", "DA"] as const;
const STATUS_ESTRATEGIA = ["planejada", "em_andamento", "concluida", "arquivada"] as const;

const criarEstrategiaSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(3).max(2000),
  tipo: z.enum(TIPOS_ESTRATEGIA).default("FO"),
  prioridade: z.enum(PRIORIDADES).default("média"),
  status: z.enum(STATUS_ESTRATEGIA).default("planejada"),
  swotOrigemIds: z.array(z.string()).optional(),
});
type CriarEstrategiaParams = z.infer<typeof criarEstrategiaSchema>;
const criarEstrategia: ToolDefinition<CriarEstrategiaParams> = {
  name: "criar_estrategia",
  description:
    "Cria uma nova estratégia-mãe (FO/FA/DO/DA da matriz SWOT). Use quando o usuário aprovar uma estratégia clara antes de virar iniciativas/OKRs (ex.: 'cria uma estratégia de fidelização para o segmento premium e linka com o objetivo de receita recorrente').",
  paramsSchema: criarEstrategiaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["titulo", "descricao"],
    properties: {
      titulo: { type: "string" },
      descricao: { type: "string" },
      tipo: { type: "string", enum: [...TIPOS_ESTRATEGIA], description: "FO/FA/DO/DA da matriz SWOT." },
      prioridade: { type: "string", enum: [...PRIORIDADES] },
      status: { type: "string", enum: [...STATUS_ESTRATEGIA] },
      swotOrigemIds: { type: "array", items: { type: "string" }, description: "IDs de fatores SWOT que originam a estratégia (opcional)." },
    },
  },
  preview: (p) => ({
    titulo: `Nova estratégia: ${p.titulo}`,
    descricao: `Estratégia ${p.tipo}, prioridade ${p.prioridade}.`,
    campos: [
      { label: "Título", valor: p.titulo },
      { label: "Tipo", valor: p.tipo },
      { label: "Prioridade", valor: p.prioridade },
      { label: "Status", valor: p.status },
      { label: "Descrição", valor: p.descricao.slice(0, 240) },
    ],
    ctaConfirmar: "Criar estratégia",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const created = await storage.createEstrategia({
      empresaId: ctx.empresaId,
      tipo: p.tipo,
      titulo: p.titulo,
      descricao: p.descricao,
      prioridade: p.prioridade,
      status: p.status,
      swotOrigemIds: p.swotOrigemIds ?? null,
    });
    return {
      resumo: `Estratégia "${created.titulo}" criada.`,
      dados: { id: created.id },
      rota: `/estrategias?editar=${created.id}`,
      entidadeTipo: "estrategia",
      entidadeId: created.id,
    };
  },
  formRota: "/estrategias",
  statusLabel: "Criando estratégia…",
};

const atualizarEstrategiaSchema = z.object({
  estrategiaId: z.string().min(8),
  titulo: z.string().min(3).max(200).optional(),
  descricao: z.string().min(3).max(2000).optional(),
  tipo: z.enum(TIPOS_ESTRATEGIA).optional(),
  prioridade: z.enum(PRIORIDADES).optional(),
  status: z.enum(STATUS_ESTRATEGIA).optional(),
});
type AtualizarEstrategiaParams = z.infer<typeof atualizarEstrategiaSchema>;
const atualizarEstrategia: ToolDefinition<AtualizarEstrategiaParams> = {
  name: "atualizar_estrategia",
  description:
    "Atualiza uma estratégia existente (título, descrição, tipo SWOT, prioridade ou status). Use quando o usuário pedir reescrita ou repriorização de uma estratégia já listada no CATÁLOGO.",
  paramsSchema: atualizarEstrategiaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["estrategiaId"],
    properties: {
      estrategiaId: { type: "string", description: "ID real da estratégia (do CATÁLOGO)." },
      titulo: { type: "string" },
      descricao: { type: "string" },
      tipo: { type: "string", enum: [...TIPOS_ESTRATEGIA] },
      prioridade: { type: "string", enum: [...PRIORIDADES] },
      status: { type: "string", enum: [...STATUS_ESTRATEGIA] },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar estratégia",
    descricao: "Vamos ajustar a estratégia selecionada.",
    campos: [
      { label: "ID", valor: p.estrategiaId },
      strField("Novo título", p.titulo),
      strField("Tipo", p.tipo),
      strField("Prioridade", p.prioridade),
      strField("Status", p.status),
      strField("Nova descrição", p.descricao),
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await storage.getEstrategia(p.estrategiaId);
    if (!existing || existing.empresaId !== ctx.empresaId) {
      throw new Error("Estratégia não encontrada nesta empresa.");
    }
    const patch: Partial<typeof existing> = {};
    if (p.titulo !== undefined) patch.titulo = p.titulo;
    if (p.descricao !== undefined) patch.descricao = p.descricao;
    if (p.tipo !== undefined) patch.tipo = p.tipo;
    if (p.prioridade !== undefined) patch.prioridade = p.prioridade;
    if (p.status !== undefined) patch.status = p.status;
    const updated = await storage.updateEstrategia(p.estrategiaId, ctx.empresaId, patch);
    return {
      resumo: `Estratégia "${updated.titulo}" atualizada.`,
      dados: { id: updated.id },
      rota: `/estrategias?editar=${updated.id}`,
      entidadeTipo: "estrategia",
      entidadeId: updated.id,
    };
  },
  formRota: "/estrategias",
  statusLabel: "Atualizando estratégia…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const existing = await storage.getEstrategia(p.estrategiaId);
      if (!existing || existing.empresaId !== ctx.empresaId) return preview;
      const before: Record<string, { raw: string | null | undefined }> = {
        "Novo título": { raw: existing.titulo ?? null },
        "Tipo": { raw: existing.tipo ?? null },
        "Prioridade": { raw: existing.prioridade ?? null },
        "Status": { raw: existing.status ?? null },
        "Nova descrição": { raw: existing.descricao ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

const arquivarEstrategiaSchema = z.object({
  estrategiaId: z.string().min(8),
  motivo: z.string().max(500).default(""),
});
type ArquivarEstrategiaParams = z.infer<typeof arquivarEstrategiaSchema>;
const arquivarEstrategia: ToolDefinition<ArquivarEstrategiaParams> = {
  name: "arquivar_estrategia",
  description:
    "Arquiva uma estratégia obsoleta (status='arquivada'). NÃO apaga: mantém a estratégia para fins históricos. Use quando o usuário decidir abandonar ou substituir uma estratégia.",
  paramsSchema: arquivarEstrategiaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["estrategiaId"],
    properties: {
      estrategiaId: { type: "string", description: "ID real da estratégia (do CATÁLOGO)." },
      motivo: { type: "string", description: "Motivo do arquivamento (opcional)." },
    },
  },
  preview: (p) => ({
    titulo: "Arquivar estratégia",
    descricao: p.motivo ? `Motivo: ${p.motivo}` : "Vamos arquivar esta estratégia.",
    campos: [
      { label: "ID", valor: p.estrategiaId },
      ...(p.motivo ? [{ label: "Motivo", valor: p.motivo }] : []),
    ],
    ctaConfirmar: "Arquivar",
    ctaIgnorar: "Manter ativa",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existing = await storage.getEstrategia(p.estrategiaId);
    if (!existing || existing.empresaId !== ctx.empresaId) {
      throw new Error("Estratégia não encontrada nesta empresa.");
    }
    const updated = await storage.updateEstrategia(p.estrategiaId, ctx.empresaId, { status: "arquivada" });
    return {
      resumo: `Estratégia "${updated.titulo}" arquivada.`,
      dados: { id: updated.id },
      rota: `/estrategias?editar=${updated.id}`,
      entidadeTipo: "estrategia",
      entidadeId: updated.id,
    };
  },
  formRota: "/estrategias",
  statusLabel: "Arquivando estratégia…",
};

// ── BMC (Business Model Canvas) ──
// (BLOCOS_BMC e BLOCO_BMC_LABEL declarados acima — usados também por abrir_entidade.)

const criarBlocoBmcSchema = z.object({
  bloco: z.enum(BLOCOS_BMC),
  descricao: z.string().min(3).max(2000),
});
type CriarBlocoBmcParams = z.infer<typeof criarBlocoBmcSchema>;
const criarBlocoBmc: ToolDefinition<CriarBlocoBmcParams> = {
  name: "criar_bloco_bmc",
  description:
    "Cria/preenche um bloco do Business Model Canvas (BMC). Use quando o usuário decidir adicionar conteúdo a um dos 9 blocos do canvas (ex.: 'adiciona consultoria embarcada na Proposta de Valor').",
  paramsSchema: criarBlocoBmcSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["bloco", "descricao"],
    properties: {
      bloco: { type: "string", enum: [...BLOCOS_BMC], description: "Um dos 9 blocos canônicos do BMC." },
      descricao: { type: "string", description: "Conteúdo do bloco (texto livre)." },
    },
  },
  preview: (p) => ({
    titulo: `BMC — ${BLOCO_BMC_LABEL[p.bloco]}`,
    descricao: `Vamos preencher o bloco "${BLOCO_BMC_LABEL[p.bloco]}" no canvas.`,
    campos: [
      { label: "Bloco", valor: BLOCO_BMC_LABEL[p.bloco] },
      { label: "Conteúdo", valor: p.descricao.slice(0, 300) },
    ],
    ctaConfirmar: "Adicionar ao BMC",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const created = await storage.createModeloNegocio({
      empresaId: ctx.empresaId,
      bloco: p.bloco,
      descricao: p.descricao,
    });
    return {
      resumo: `Bloco "${BLOCO_BMC_LABEL[p.bloco]}" criado no BMC.`,
      dados: { id: created.id },
      rota: `/modelo-negocio?editar=${created.id}`,
      entidadeTipo: "modelo_negocio",
      entidadeId: created.id,
    };
  },
  formRota: "/modelo-negocio",
  statusLabel: "Atualizando BMC…",
};

const atualizarBlocoBmcSchema = z.object({
  blocoId: z.string().min(8),
  descricao: z.string().min(3).max(2000),
});
type AtualizarBlocoBmcParams = z.infer<typeof atualizarBlocoBmcSchema>;
const atualizarBlocoBmc: ToolDefinition<AtualizarBlocoBmcParams> = {
  name: "atualizar_bloco_bmc",
  description:
    "Atualiza o conteúdo de um bloco BMC já existente. Use quando o usuário pedir para reescrever/ajustar texto de um bloco do canvas.",
  paramsSchema: atualizarBlocoBmcSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["blocoId", "descricao"],
    properties: {
      blocoId: { type: "string", description: "ID real do bloco BMC." },
      descricao: { type: "string", description: "Novo conteúdo do bloco." },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar bloco do BMC",
    descricao: "Vamos reescrever este bloco do canvas.",
    campos: [
      { label: "ID", valor: p.blocoId },
      { label: "Nova descrição", valor: p.descricao.slice(0, 300) },
    ],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const blocos = await storage.getModeloNegocio(ctx.empresaId);
    const existing = blocos.find((b) => b.id === p.blocoId);
    if (!existing) throw new Error("Bloco BMC não encontrado nesta empresa.");
    const updated = await storage.updateModeloNegocio(p.blocoId, ctx.empresaId, { descricao: p.descricao });
    const label = BLOCO_BMC_LABEL[updated.bloco as typeof BLOCOS_BMC[number]] ?? updated.bloco;
    return {
      resumo: `Bloco "${label}" atualizado.`,
      dados: { id: updated.id },
      rota: `/modelo-negocio?editar=${updated.id}`,
      entidadeTipo: "modelo_negocio",
      entidadeId: updated.id,
    };
  },
  formRota: "/modelo-negocio",
  statusLabel: "Atualizando BMC…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const blocos = await storage.getModeloNegocio(ctx.empresaId);
      const existing = blocos.find((b) => b.id === p.blocoId);
      if (!existing) return preview;
      const before: Record<string, { raw: string | null | undefined }> = {
        "Nova descrição": { raw: existing.descricao ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

const arquivarBlocoBmcSchema = z.object({
  blocoId: z.string().min(8),
});
type ArquivarBlocoBmcParams = z.infer<typeof arquivarBlocoBmcSchema>;
const arquivarBlocoBmc: ToolDefinition<ArquivarBlocoBmcParams> = {
  name: "arquivar_bloco_bmc",
  description:
    "Arquiva (remove) um bloco do BMC quando o conteúdo ficou obsoleto. O bloco pode ser recriado depois com nova descrição.",
  paramsSchema: arquivarBlocoBmcSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["blocoId"],
    properties: {
      blocoId: { type: "string", description: "ID real do bloco BMC a remover." },
    },
  },
  preview: (p) => ({
    titulo: "Arquivar bloco do BMC",
    descricao: "Vamos remover este bloco do canvas (pode ser recriado depois).",
    campos: [{ label: "ID", valor: p.blocoId }],
    ctaConfirmar: "Arquivar",
    ctaIgnorar: "Manter",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const blocos = await storage.getModeloNegocio(ctx.empresaId);
    const existing = blocos.find((b) => b.id === p.blocoId);
    if (!existing) throw new Error("Bloco BMC não encontrado nesta empresa.");
    await storage.deleteModeloNegocio(p.blocoId, ctx.empresaId);
    const label = BLOCO_BMC_LABEL[existing.bloco as typeof BLOCOS_BMC[number]] ?? existing.bloco;
    return {
      resumo: `Bloco "${label}" arquivado.`,
      rota: "/modelo-negocio",
      entidadeTipo: "modelo_negocio",
      entidadeId: p.blocoId,
    };
  },
  formRota: "/modelo-negocio",
  statusLabel: "Arquivando bloco BMC…",
};

// ── Mapa BSC (relações causa-efeito entre objetivos) ──
const TIPOS_RELACAO_BSC = ["causa_efeito", "correlacao"] as const;
const criarRelacaoBscSchema = z.object({
  origemId: z.string().min(8),
  destinoId: z.string().min(8),
  tipo: z.enum(TIPOS_RELACAO_BSC).default("causa_efeito"),
});
type CriarRelacaoBscParams = z.infer<typeof criarRelacaoBscSchema>;
const criarRelacaoBsc: ToolDefinition<CriarRelacaoBscParams> = {
  name: "criar_relacao_bsc",
  description:
    "Cria uma relação no Mapa Estratégico (BSC) ligando dois objetivos com tipo causa-efeito ou correlação. Use quando o usuário pedir para 'amarrar', 'ligar' ou 'conectar' dois objetivos no mapa estratégico (ex.: 'amarra o objetivo de NPS ao objetivo de Receita').",
  paramsSchema: criarRelacaoBscSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["origemId", "destinoId"],
    properties: {
      origemId: { type: "string", description: "ID do objetivo de origem (causa)." },
      destinoId: { type: "string", description: "ID do objetivo de destino (efeito)." },
      tipo: { type: "string", enum: [...TIPOS_RELACAO_BSC], description: "causa_efeito (default) ou correlacao." },
    },
  },
  preview: (p) => ({
    titulo: "Nova relação no Mapa BSC",
    descricao: `Vamos ligar dois objetivos no mapa estratégico (${p.tipo === "causa_efeito" ? "causa-efeito" : "correlação"}).`,
    campos: [
      { label: "Origem", valor: p.origemId },
      { label: "Destino", valor: p.destinoId },
      { label: "Tipo", valor: p.tipo === "causa_efeito" ? "causa-efeito" : "correlação" },
    ],
    ctaConfirmar: "Criar relação",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    if (p.origemId === p.destinoId) {
      throw new Error("Origem e destino não podem ser o mesmo objetivo.");
    }
    const objs = await storage.getObjetivos(ctx.empresaId);
    const origem = objs.find((o) => o.id === p.origemId);
    const destino = objs.find((o) => o.id === p.destinoId);
    if (!origem || !destino) throw new Error("Um dos objetivos não foi encontrado nesta empresa.");
    const existentes = await storage.getBscRelacoes(ctx.empresaId);
    const dup = existentes.find(
      (r) =>
        (r.origemId === p.origemId && r.destinoId === p.destinoId) ||
        (r.origemId === p.destinoId && r.destinoId === p.origemId),
    );
    if (dup) throw new Error("Já existe uma relação entre estes dois objetivos.");
    const created = await storage.createBscRelacao({
      empresaId: ctx.empresaId,
      origemId: p.origemId,
      destinoId: p.destinoId,
      tipo: p.tipo,
    });
    return {
      resumo: `Relação criada: "${origem.titulo}" → "${destino.titulo}".`,
      dados: { id: created.id, tipo: p.tipo },
      rota: "/mapa-bsc",
      entidadeTipo: "bsc_relacao",
      entidadeId: created.id,
    };
  },
  formRota: "/mapa-bsc",
  statusLabel: "Criando relação BSC…",
};

const atualizarRelacaoBscSchema = z.object({
  relacaoId: z.string().min(8),
  tipo: z.enum(TIPOS_RELACAO_BSC),
});
type AtualizarRelacaoBscParams = z.infer<typeof atualizarRelacaoBscSchema>;
const atualizarRelacaoBsc: ToolDefinition<AtualizarRelacaoBscParams> = {
  name: "atualizar_relacao_bsc",
  description:
    "Altera o tipo de uma relação existente no Mapa BSC (causa_efeito ou correlacao). Use quando o usuário pedir para 'mudar', 'corrigir' ou 'trocar' o tipo de uma relação já existente entre dois objetivos.",
  paramsSchema: atualizarRelacaoBscSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["relacaoId", "tipo"],
    properties: {
      relacaoId: { type: "string", description: "ID real da relação BSC." },
      tipo: { type: "string", enum: [...TIPOS_RELACAO_BSC], description: "Novo tipo: causa_efeito ou correlacao." },
    },
  },
  preview: (p) => ({
    titulo: "Alterar tipo de relação no Mapa BSC",
    descricao: `Vamos mudar o tipo desta relação para ${p.tipo === "causa_efeito" ? "causa-efeito" : "correlação"}.`,
    campos: [
      { label: "Relação", valor: p.relacaoId },
      { label: "Novo tipo", valor: p.tipo === "causa_efeito" ? "causa-efeito" : "correlação" },
    ],
    ctaConfirmar: "Atualizar",
    ctaIgnorar: "Manter",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existentes = await storage.getBscRelacoes(ctx.empresaId);
    const existing = existentes.find((r) => r.id === p.relacaoId);
    if (!existing) throw new Error("Relação BSC não encontrada nesta empresa.");
    const updated = await storage.updateBscRelacao(p.relacaoId, ctx.empresaId, { tipo: p.tipo });
    return {
      resumo: `Relação atualizada para ${p.tipo === "causa_efeito" ? "causa-efeito" : "correlação"}.`,
      dados: { id: updated.id, tipo: updated.tipo },
      rota: "/mapa-bsc",
      entidadeTipo: "bsc_relacao",
      entidadeId: updated.id,
    };
  },
  enrichPreview: async (preview, p, ctx) => {
    const existentes = await storage.getBscRelacoes(ctx.empresaId);
    const existing = existentes.find((r) => r.id === p.relacaoId);
    if (!existing) return preview;
    const tipoAnterior = (existing.tipo as "causa_efeito" | "correlacao") ?? "causa_efeito";
    const campos = (preview.campos ?? []).map((c) =>
      c.label === "Novo tipo"
        ? { ...c, valorAnterior: tipoAnterior === "causa_efeito" ? "causa-efeito" : "correlação" }
        : c,
    );
    return { ...preview, campos };
  },
  formRota: "/mapa-bsc",
  statusLabel: "Atualizando relação BSC…",
};

const removerRelacaoBscSchema = z.object({
  relacaoId: z.string().min(8),
});
type RemoverRelacaoBscParams = z.infer<typeof removerRelacaoBscSchema>;
const removerRelacaoBsc: ToolDefinition<RemoverRelacaoBscParams> = {
  name: "remover_relacao_bsc",
  description: "Remove uma relação do Mapa BSC entre dois objetivos.",
  paramsSchema: removerRelacaoBscSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["relacaoId"],
    properties: {
      relacaoId: { type: "string", description: "ID real da relação BSC." },
    },
  },
  preview: (p) => ({
    titulo: "Remover relação do Mapa BSC",
    descricao: "Vamos desfazer esta ligação entre os dois objetivos.",
    campos: [{ label: "ID", valor: p.relacaoId }],
    ctaConfirmar: "Remover",
    ctaIgnorar: "Manter",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existentes = await storage.getBscRelacoes(ctx.empresaId);
    const existing = existentes.find((r) => r.id === p.relacaoId);
    if (!existing) throw new Error("Relação BSC não encontrada nesta empresa.");
    await storage.deleteBscRelacao(p.relacaoId, ctx.empresaId);
    return {
      resumo: "Relação BSC removida.",
      rota: "/mapa-bsc",
      entidadeTipo: "bsc_relacao",
      entidadeId: p.relacaoId,
    };
  },
  formRota: "/mapa-bsc",
  statusLabel: "Removendo relação BSC…",
};

// ── Cenários ──
const TIPOS_CENARIO = ["pessimista", "base", "realista", "otimista"] as const;
const criarCenarioSchema = z.object({
  tipo: z.enum(TIPOS_CENARIO),
  titulo: z.string().min(3).max(200),
  descricao: z.string().max(2000).default(""),
  premissas: z.array(z.string().max(500)).default([]),
  respostaEstrategica: z.string().max(2000).default(""),
});
type CriarCenarioParams = z.infer<typeof criarCenarioSchema>;
const criarCenario: ToolDefinition<CriarCenarioParams> = {
  name: "criar_cenario",
  description:
    "Registra um cenário no planejamento (otimista, realista/base ou pessimista). Use quando o usuário pedir para registrar uma hipótese de futuro (ex.: 'cria um cenário pessimista de queda de 20% na receita').",
  paramsSchema: criarCenarioSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["tipo", "titulo"],
    properties: {
      tipo: { type: "string", enum: [...TIPOS_CENARIO] },
      titulo: { type: "string" },
      descricao: { type: "string" },
      premissas: { type: "array", items: { type: "string" }, description: "Variáveis-chave / premissas do cenário." },
      respostaEstrategica: { type: "string", description: "Resposta estratégica preparada para este cenário." },
    },
  },
  preview: (p) => ({
    titulo: `Novo cenário ${p.tipo}: ${p.titulo}`,
    descricao: p.descricao || `Cenário ${p.tipo} com ${p.premissas.length} premissa(s).`,
    campos: [
      { label: "Tipo", valor: p.tipo },
      { label: "Título", valor: p.titulo },
      ...(p.descricao ? [{ label: "Descrição", valor: p.descricao.slice(0, 240) }] : []),
      ...(p.premissas.length ? [{ label: "Premissas", valor: p.premissas.join(" • ").slice(0, 300) }] : []),
      ...(p.respostaEstrategica ? [{ label: "Resposta estratégica", valor: p.respostaEstrategica.slice(0, 240) }] : []),
    ],
    ctaConfirmar: "Registrar cenário",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const created = await storage.createCenario({
      empresaId: ctx.empresaId,
      tipo: p.tipo,
      titulo: p.titulo,
      descricao: p.descricao,
      premissas: JSON.stringify(p.premissas),
      respostaEstrategica: p.respostaEstrategica,
    });
    return {
      resumo: `Cenário ${p.tipo} "${created.titulo}" registrado.`,
      dados: { id: created.id },
      rota: `/cenarios?editar=${created.id}`,
      entidadeTipo: "cenario",
      entidadeId: created.id,
    };
  },
  formRota: "/cenarios",
  statusLabel: "Registrando cenário…",
};

const atualizarCenarioSchema = z.object({
  cenarioId: z.string().min(8),
  tipo: z.enum(TIPOS_CENARIO).optional(),
  titulo: z.string().min(3).max(200).optional(),
  descricao: z.string().max(2000).optional(),
  premissas: z.array(z.string().max(500)).optional(),
  respostaEstrategica: z.string().max(2000).optional(),
});
type AtualizarCenarioParams = z.infer<typeof atualizarCenarioSchema>;
const atualizarCenario: ToolDefinition<AtualizarCenarioParams> = {
  name: "atualizar_cenario",
  description:
    "Atualiza um cenário existente (tipo, título, descrição, premissas ou resposta estratégica).",
  paramsSchema: atualizarCenarioSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["cenarioId"],
    properties: {
      cenarioId: { type: "string" },
      tipo: { type: "string", enum: [...TIPOS_CENARIO] },
      titulo: { type: "string" },
      descricao: { type: "string" },
      premissas: { type: "array", items: { type: "string" } },
      respostaEstrategica: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Atualizar cenário",
    descricao: "Vamos ajustar o cenário selecionado.",
    campos: [
      { label: "ID", valor: p.cenarioId },
      strField("Tipo", p.tipo),
      strField("Novo título", p.titulo),
      strField("Nova descrição", p.descricao),
      p.premissas ? { label: "Novas premissas", valor: p.premissas.join(" • ").slice(0, 300) } : null,
      strField("Resposta estratégica", p.respostaEstrategica),
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Aplicar mudanças",
    ctaIgnorar: "Manter como está",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existentes = await storage.getCenarios(ctx.empresaId);
    const existing = existentes.find((c) => c.id === p.cenarioId);
    if (!existing) throw new Error("Cenário não encontrado nesta empresa.");
    const patch: Partial<typeof existing> = {};
    if (p.tipo !== undefined) patch.tipo = p.tipo;
    if (p.titulo !== undefined) patch.titulo = p.titulo;
    if (p.descricao !== undefined) patch.descricao = p.descricao;
    if (p.premissas !== undefined) patch.premissas = JSON.stringify(p.premissas);
    if (p.respostaEstrategica !== undefined) patch.respostaEstrategica = p.respostaEstrategica;
    const updated = await storage.updateCenario(p.cenarioId, ctx.empresaId, patch);
    return {
      resumo: `Cenário "${updated.titulo}" atualizado.`,
      dados: { id: updated.id },
      rota: `/cenarios?editar=${updated.id}`,
      entidadeTipo: "cenario",
      entidadeId: updated.id,
    };
  },
  formRota: "/cenarios",
  statusLabel: "Atualizando cenário…",
  enrichPreview: async (preview, p, ctx) => {
    try {
      const existentes = await storage.getCenarios(ctx.empresaId);
      const existing = existentes.find((c) => c.id === p.cenarioId);
      if (!existing) return preview;
      let premissasAnt = "";
      try {
        const arr = JSON.parse(existing.premissas ?? "[]");
        if (Array.isArray(arr)) premissasAnt = arr.join(" • ").slice(0, 300);
      } catch { premissasAnt = existing.premissas ?? ""; }
      const before: Record<string, { raw: string | null | undefined }> = {
        "Tipo": { raw: existing.tipo ?? null },
        "Novo título": { raw: existing.titulo ?? null },
        "Nova descrição": { raw: existing.descricao ?? null },
        "Novas premissas": { raw: premissasAnt },
        "Resposta estratégica": { raw: existing.respostaEstrategica ?? null },
      };
      const campos = (preview.campos ?? [])
        .map((c) => applyDiff(c, before[c.label]))
        .filter((c): c is { label: string; valor: string; valorAnterior?: string } => c !== null);
      return { ...preview, campos };
    } catch { return preview; }
  },
};

const arquivarCenarioSchema = z.object({
  cenarioId: z.string().min(8),
});
type ArquivarCenarioParams = z.infer<typeof arquivarCenarioSchema>;
const arquivarCenario: ToolDefinition<ArquivarCenarioParams> = {
  name: "arquivar_cenario",
  description:
    "Arquiva (remove) um cenário obsoleto do planejamento. Use quando o usuário decidir descartar uma hipótese.",
  paramsSchema: arquivarCenarioSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["cenarioId"],
    properties: {
      cenarioId: { type: "string" },
    },
  },
  preview: (p) => ({
    titulo: "Arquivar cenário",
    descricao: "Vamos remover este cenário do planejamento.",
    campos: [{ label: "ID", valor: p.cenarioId }],
    ctaConfirmar: "Arquivar",
    ctaIgnorar: "Manter",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const existentes = await storage.getCenarios(ctx.empresaId);
    const existing = existentes.find((c) => c.id === p.cenarioId);
    if (!existing) throw new Error("Cenário não encontrado nesta empresa.");
    await storage.deleteCenario(p.cenarioId, ctx.empresaId);
    return {
      resumo: `Cenário "${existing.titulo}" arquivado.`,
      rota: "/cenarios",
      entidadeTipo: "cenario",
      entidadeId: p.cenarioId,
    };
  },
  formRota: "/cenarios",
  statusLabel: "Arquivando cenário…",
};

// ─── Task #288 — Ciclo de Aprendizado: 5 novas tools HITL ────────────────
// Bloco fechado de aprendizado contínuo: o agente registra retrospectivas,
// arquiva objetivos cumpridos/abandonados, repriorize iniciativas e
// estratégias e (meta-tool) agrupa N mudanças com a mesma justificativa
// em uma única proposta de "lote" — UX atômica do usuário, idempotente
// por item no backend.

// ---------- 2k.1 registrar_retrospectiva ----------
// Deterministica: registra os 4 campos da retrospectiva (conquistas/falhas/
// aprendizados/ajustes) vinculada a um objetivo no período informado. NÃO
// gera opinião, NÃO recomenda ações — esta tool é só de captura.
const registrarRetrospectivaSchema = z.object({
  objetivoId: z.string().min(8),
  periodoInicio: z.string().regex(PRAZO_DATA_REGEX, "periodoInicio deve ser YYYY-MM-DD").optional(),
  periodoFim: z.string().regex(PRAZO_DATA_REGEX, "periodoFim deve ser YYYY-MM-DD").optional(),
  conquistas: z.string().max(2000).default(""),
  falhas: z.string().max(2000).default(""),
  aprendizados: z.string().max(2000).default(""),
  ajustes: z.string().max(2000).default(""),
}).refine((d) => [d.conquistas, d.falhas, d.aprendizados, d.ajustes].some((s) => s.trim().length > 0), {
  message: "Pelo menos um dos quatro campos (conquistas/falhas/aprendizados/ajustes) deve ser preenchido.",
});
type RegistrarRetrospectivaParams = z.infer<typeof registrarRetrospectivaSchema>;

const registrarRetrospectiva: ToolDefinition<RegistrarRetrospectivaParams> = {
  name: "registrar_retrospectiva",
  description:
    "Registra uma retrospectiva (conquistas, falhas, aprendizados, ajustes) vinculada a um objetivo do CATÁLOGO no período informado. Use quando o usuário fizer um balanço de ciclo (ex.: fim de trimestre, fim de OKR). Esta tool só captura DADOS — não opina nem propõe ações.",
  paramsSchema: registrarRetrospectivaSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["objetivoId"],
    properties: {
      objetivoId: { type: "string", description: "ID real do objetivo do CATÁLOGO." },
      periodoInicio: { type: "string", description: "Início do período avaliado (YYYY-MM-DD)." },
      periodoFim: { type: "string", description: "Fim do período avaliado (YYYY-MM-DD)." },
      conquistas: { type: "string", description: "O que foi alcançado/funcionou neste ciclo." },
      falhas: { type: "string", description: "O que não funcionou ou ficou aquém." },
      aprendizados: { type: "string", description: "Lições extraídas do ciclo." },
      ajustes: { type: "string", description: "Ajustes/decisões para o próximo ciclo." },
    },
  },
  preview: (p) => ({
    titulo: "Registrar retrospectiva",
    descricao: `Capturar conquistas, falhas, aprendizados e ajustes deste ciclo do objetivo${p.periodoInicio || p.periodoFim ? ` (${p.periodoInicio ?? "?"} → ${p.periodoFim ?? "?"})` : ""}.`,
    campos: [
      { label: "Objetivo", valor: p.objetivoId },
      ...(p.periodoInicio ? [{ label: "Início", valor: p.periodoInicio }] : []),
      ...(p.periodoFim ? [{ label: "Fim", valor: p.periodoFim }] : []),
      ...(p.conquistas.trim() ? [{ label: "Conquistas", valor: p.conquistas }] : []),
      ...(p.falhas.trim() ? [{ label: "Falhas", valor: p.falhas }] : []),
      ...(p.aprendizados.trim() ? [{ label: "Aprendizados", valor: p.aprendizados }] : []),
      ...(p.ajustes.trim() ? [{ label: "Ajustes", valor: p.ajustes }] : []),
    ],
    ctaConfirmar: "Registrar retrospectiva",
    ctaIgnorar: "Não registrar",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const objetivos = await storage.getObjetivos(ctx.empresaId);
    const obj = objetivos.find((o) => o.id === p.objetivoId);
    if (!obj) throw new Error("Objetivo não encontrado nesta empresa.");
    const retro = await storage.createRetrospectiva({
      objetivoId: p.objetivoId,
      empresaId: ctx.empresaId,
      conquistas: p.conquistas,
      falhas: p.falhas,
      aprendizados: p.aprendizados,
      ajustes: p.ajustes,
      periodoInicio: p.periodoInicio ?? null,
      periodoFim: p.periodoFim ?? null,
      registradoPor: ctx.usuarioId ?? null,
    });
    return {
      resumo: `Retrospectiva registrada para "${obj.titulo}".`,
      dados: { retrospectivaId: retro.id, objetivoId: p.objetivoId },
      rota: `/okrs?objetivo=${p.objetivoId}`,
      entidadeTipo: "objetivo",
      entidadeId: p.objetivoId,
    };
  },
  formRota: "/okrs",
};

// ---------- 2k.2 arquivar_objetivo ----------
// Marca um objetivo como `encerrado=true`. Não exclui — preserva histórico,
// retrospectivas e KRs para consulta retroativa. O motivo fica anexado à
// descrição do objetivo (com data) para rastreabilidade.
const arquivarObjetivoSchema = z.object({
  id: z.string().min(8),
  motivo: z.string().min(3).max(600),
});
type ArquivarObjetivoParams = z.infer<typeof arquivarObjetivoSchema>;

const arquivarObjetivoTool: ToolDefinition<ArquivarObjetivoParams> = {
  name: "arquivar_objetivo",
  description:
    "Arquiva (encerra) um objetivo do CATÁLOGO preservando todo o histórico (KRs, retrospectivas, check-ins). Use quando o usuário disser que um OKR/objetivo terminou — concluído, abandonado ou substituído — e quiser tirar do radar ativo. NÃO apaga dados, só marca como encerrado.",
  paramsSchema: arquivarObjetivoSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["id", "motivo"],
    properties: {
      id: { type: "string", description: "ID real do objetivo do CATÁLOGO." },
      motivo: { type: "string", description: "Justificativa curta do arquivamento (ex.: 'Atingido 110%', 'Abandonado por falta de capacidade', 'Substituído pelo OKR X')." },
    },
  },
  preview: (p) => ({
    titulo: "Arquivar objetivo",
    descricao: "Encerrar o objetivo (preserva histórico) e remover da lista ativa.",
    campos: [
      { label: "Objetivo", valor: p.id },
      { label: "Motivo", valor: p.motivo },
    ],
    ctaConfirmar: "Arquivar",
    ctaIgnorar: "Manter ativo",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const obj = await storage.arquivarObjetivo(p.id, ctx.empresaId, p.motivo);
    return {
      resumo: `Objetivo "${obj.titulo}" arquivado.`,
      dados: { id: obj.id },
      rota: "/okrs",
      entidadeTipo: "objetivo",
      entidadeId: obj.id,
    };
  },
  formRota: "/okrs",
};

// ---------- 2k.3 repriorizar_iniciativas ----------
// Aplica `ordem` (1-based) na ordem do array. Não muda nenhum outro campo.
const repriorizarIniciativasSchema = z.object({
  ids: z.array(z.string().min(8)).min(2).max(50),
  justificativa: z.string().min(3).max(500),
});
type RepriorizarIniciativasParams = z.infer<typeof repriorizarIniciativasSchema>;

const repriorizarIniciativasTool: ToolDefinition<RepriorizarIniciativasParams> = {
  name: "repriorizar_iniciativas",
  description:
    "Reordena iniciativas existentes do CATÁLOGO definindo a coluna `ordem` (1-based, na ordem do array). Use quando o usuário pedir explicitamente para repriorizar/reordenar iniciativas (ex.: 'coloca a iniciativa X no topo', 'reorganiza as iniciativas: A, B, C nessa ordem'). NÃO muda nenhum outro campo (status, prazo, dono).",
  paramsSchema: repriorizarIniciativasSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["ids", "justificativa"],
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 50,
        description: "IDs reais das iniciativas, na ordem desejada (do topo para a base).",
      },
      justificativa: { type: "string", description: "Por que esta ordem? (curto, ex.: 'foco no caixa do trimestre')." },
    },
  },
  preview: (p) => ({
    titulo: "Repriorizar iniciativas",
    descricao: `Definir a nova ordem (${p.ids.length} iniciativas) — só muda o ranking, mantém todo o resto.`,
    campos: [
      { label: "Justificativa", valor: p.justificativa },
      ...p.ids.map((id, i) => ({ label: `${i + 1}º`, valor: id })),
    ],
    ctaConfirmar: "Aplicar nova ordem",
    ctaIgnorar: "Manter ordem atual",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const updated = await storage.repriorizarIniciativas(ctx.empresaId, p.ids);
    return {
      resumo: `Repriorização aplicada a ${updated.length} iniciativa(s).`,
      dados: { ids: updated.map((u) => u.id), justificativa: p.justificativa },
      rota: "/iniciativas",
      entidadeTipo: "iniciativa",
      entidadeId: updated[0]?.id,
    };
  },
  formRota: "/iniciativas",
};

// ---------- 2k.4 repriorizar_estrategias ----------
const repriorizarEstrategiasSchema = z.object({
  ids: z.array(z.string().min(8)).min(2).max(50),
  justificativa: z.string().min(3).max(500),
});
type RepriorizarEstrategiasParams = z.infer<typeof repriorizarEstrategiasSchema>;

const repriorizarEstrategiasTool: ToolDefinition<RepriorizarEstrategiasParams> = {
  name: "repriorizar_estrategias",
  description:
    "Reordena estratégias existentes do CATÁLOGO definindo a coluna `ordem` (1-based, na ordem do array). Use quando o usuário pedir explicitamente para repriorizar/reordenar estratégias. NÃO muda nenhum outro campo.",
  paramsSchema: repriorizarEstrategiasSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["ids", "justificativa"],
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 50,
        description: "IDs reais das estratégias, na ordem desejada (do topo para a base).",
      },
      justificativa: { type: "string", description: "Por que esta ordem? (curto)." },
    },
  },
  preview: (p) => ({
    titulo: "Repriorizar estratégias",
    descricao: `Definir a nova ordem (${p.ids.length} estratégias) — só muda o ranking, mantém todo o resto.`,
    campos: [
      { label: "Justificativa", valor: p.justificativa },
      ...p.ids.map((id, i) => ({ label: `${i + 1}º`, valor: id })),
    ],
    ctaConfirmar: "Aplicar nova ordem",
    ctaIgnorar: "Manter ordem atual",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const updated = await storage.repriorizarEstrategias(ctx.empresaId, p.ids);
    return {
      resumo: `Repriorização aplicada a ${updated.length} estratégia(s).`,
      dados: { ids: updated.map((u) => u.id), justificativa: p.justificativa },
      rota: "/estrategias",
      entidadeTipo: "estrategia",
      entidadeId: updated[0]?.id,
    };
  },
  formRota: "/estrategias",
};

// ---------- 2k.5 proposta_em_lote (META-TOOL) ----------
// Agrupa N (3+) chamadas de tools executoras com a MESMA justificativa em
// uma única proposta para o usuário. UX atômica (1 card "Confirmar tudo"),
// idempotente por item no backend (cada apply roda em sequência; falha de
// um item não rebobina os anteriores — o resultado agregado mostra o que
// foi e o que não foi aplicado).
//
// Restrições anti-loop:
//  - tools internas devem ser executoras (não nav, não meta, não plano).
//  - `proposta_em_lote` NÃO pode aninhar outra `proposta_em_lote`.
//  - mínimo 2 chamadas (faz mais sentido a partir de 3, mas 2 é suficiente
//    para o caso "bumpa prazo de A e B com a mesma justificativa").
const TOOLS_PROIBIDAS_EM_LOTE: ReadonlySet<string> = new Set([
  "proposta_em_lote",
  "criar_plano_agentico",
  "concluir_plano_agentico",
  "cancelar_plano_agentico",
  "navegar_para",
  "abrir_entidade",
  "registrar_ata",
]);

const propostaEmLoteSchema = z.object({
  justificativa: z.string().min(10).max(500),
  chamadas: z.array(z.object({
    tool: z.string().min(1),
    parametros: z.record(z.string(), z.unknown()),
  })).min(2).max(15),
});
type PropostaEmLoteParams = z.infer<typeof propostaEmLoteSchema>;

const propostaEmLote: ToolDefinition<PropostaEmLoteParams> = {
  name: "proposta_em_lote",
  description:
    "META-TOOL: agrupa 3+ mudanças que compartilham a MESMA justificativa em uma única proposta de 'lote' para o usuário (ex.: 'adia o prazo de A, B e C em 1 mês porque o fornecedor atrasou'). Cada sub-chamada é validada contra o schema da própria tool antes do card aparecer; ao confirmar, todas são aplicadas em sequência (idempotente por item). NÃO pode aninhar outra proposta_em_lote, nem chamar tools de navegação/plano agêntico/ata.",
  paramsSchema: propostaEmLoteSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["justificativa", "chamadas"],
    properties: {
      justificativa: { type: "string", description: "Motivo único compartilhado por todas as sub-mudanças." },
      chamadas: {
        type: "array",
        minItems: 2,
        maxItems: 15,
        description: "Lista de sub-chamadas. Cada item vira uma sub-proposta dentro do mesmo card.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["tool", "parametros"],
          properties: {
            tool: { type: "string", description: "Nome da tool executora (ex.: atualizar_iniciativa, atualizar_kr)." },
            parametros: { type: "object", description: "Parâmetros que passariam à tool individualmente — devem casar com o paramsSchema dela." },
          },
        },
      },
    },
  },
  preview: (p) => {
    const lote = p.chamadas.map((c) => {
      const tool = getTool(c.tool);
      if (!tool) {
        return {
          ferramenta: c.tool,
          titulo: `Tool desconhecida: ${c.tool}`,
          descricao: "Esta sub-chamada será ignorada.",
          campos: [] as Array<{ label: string; valor: string; valorAnterior?: string }>,
        };
      }
      const parsed = tool.paramsSchema.safeParse(c.parametros);
      if (!parsed.success) {
        return {
          ferramenta: c.tool,
          titulo: `${tool.name} (parâmetros inválidos)`,
          descricao: parsed.error.message.slice(0, 200),
          campos: [],
        };
      }
      const sub = tool.preview(parsed.data);
      return {
        ferramenta: c.tool,
        titulo: sub.titulo,
        descricao: sub.descricao,
        campos: sub.campos ?? [],
      };
    });
    return {
      titulo: `Lote de ${p.chamadas.length} mudanças`,
      descricao: p.justificativa,
      campos: [{ label: "Justificativa", valor: p.justificativa }],
      ctaConfirmar: "Confirmar tudo",
      ctaIgnorar: "Não aplicar",
      ctaAjustar: "Revisar item a item",
      lote,
    };
  },
  apply: async (p, ctx) => {
    const resultados: Array<{
      tool: string;
      ok: boolean;
      resumo?: string;
      erro?: string;
      entidadeTipo?: string;
      entidadeId?: string;
    }> = [];
    for (const chamada of p.chamadas) {
      if (TOOLS_PROIBIDAS_EM_LOTE.has(chamada.tool)) {
        resultados.push({ tool: chamada.tool, ok: false, erro: "Tool não permitida em lote." });
        continue;
      }
      const tool = getTool(chamada.tool);
      if (!tool) {
        resultados.push({ tool: chamada.tool, ok: false, erro: "Tool desconhecida." });
        continue;
      }
      const parsed = tool.paramsSchema.safeParse(chamada.parametros);
      if (!parsed.success) {
        resultados.push({ tool: chamada.tool, ok: false, erro: parsed.error.message.slice(0, 200) });
        continue;
      }
      try {
        const r = await tool.apply(parsed.data, ctx);
        resultados.push({
          tool: chamada.tool,
          ok: true,
          resumo: r.resumo,
          entidadeTipo: r.entidadeTipo,
          entidadeId: r.entidadeId,
        });
      } catch (err) {
        resultados.push({
          tool: chamada.tool,
          ok: false,
          erro: err instanceof Error ? err.message : String(err),
        });
      }
    }
    const sucessos = resultados.filter((r) => r.ok).length;
    const falhas = resultados.length - sucessos;
    return {
      resumo: falhas === 0
        ? `Lote aplicado: ${sucessos} de ${resultados.length} mudanças concluídas.`
        : `Lote parcial: ${sucessos} aplicada(s), ${falhas} falharam.`,
      dados: { justificativa: p.justificativa, resultados },
    };
  },
  formRota: "/dashboard",
};

// ---------- Task #289 — Resumo de ciclo (HITL manual) ----------
const gerarResumoCicloManualSchema = z.object({
  tipo: z.enum(["trimestre", "objetivo", "estrategia", "iniciativa"]),
  referenciaId: z.string().min(8).optional(),
  periodo: z.string().min(3).max(60).optional(),
});
type GerarResumoCicloManualParams = z.infer<typeof gerarResumoCicloManualSchema>;

const gerarResumoCicloManual: ToolDefinition<GerarResumoCicloManualParams> = {
  name: "gerar_resumo_ciclo_manual",
  description:
    "Gera (com confirmação humana) um resumo imutável de ciclo na memória de longo prazo do Bizzy. Use quando o usuário pedir 'fecha o trimestre', 'faz um post-mortem desse objetivo' ou 'consolida essa estratégia'. tipo='trimestre' não exige referenciaId (usa o trimestre atual se 'periodo' não for informado). Para os demais tipos, referenciaId é obrigatório (ID do objetivo/estratégia/iniciativa). O resumo é determinístico, gerado a partir do storage — não inventa nada.",
  paramsSchema: gerarResumoCicloManualSchema,
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    required: ["tipo"],
    properties: {
      tipo: { type: "string", enum: ["trimestre", "objetivo", "estrategia", "iniciativa"] },
      referenciaId: { type: "string", description: "ID da entidade resumida (objetivo/estrategia/iniciativa). Obrigatório se tipo≠trimestre." },
      periodo: { type: "string", description: "Identificador do ciclo (ex.: '2026-Q1' para trimestre). Opcional." },
    },
  },
  preview: (p) => ({
    titulo: `Gerar resumo de ${p.tipo}`,
    descricao: `Vou consolidar conquistas, atrasos, decisões e lições do ${p.tipo}${p.periodo ? ` (${p.periodo})` : ""} em um resumo imutável que ficará na memória de longo prazo. Posso gerar?`,
    campos: [
      { label: "Tipo", valor: p.tipo },
      ...(p.referenciaId ? [{ label: "Referência", valor: p.referenciaId }] : []),
      ...(p.periodo ? [{ label: "Período", valor: p.periodo }] : []),
      { label: "Imutável", valor: "Sim — não pode ser editado depois." },
    ],
    ctaConfirmar: "Gerar resumo",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    if (p.tipo !== "trimestre" && !p.referenciaId) {
      throw new Error(`referenciaId é obrigatório para tipo=${p.tipo}.`);
    }
    const r = await gerarResumoCiclo({
      empresaId: ctx.empresaId,
      tipo: p.tipo,
      referenciaId: p.referenciaId ?? null,
      periodo: p.periodo,
      geradoPor: "manual",
    });
    return {
      resumo: `Resumo de ${p.tipo} (${r.periodo}) gerado — versão ${r.versao}.`,
      dados: { resumoId: r.id, tipo: r.tipo, periodo: r.periodo, versao: r.versao },
      entidadeTipo: "resumo_ciclo",
      entidadeId: r.id,
    };
  },
  formRota: "/bizzy",
};

// Cada ToolDefinition tem um TParams concreto; o registry, porém, precisa
// guardar todos juntos. `wrap` faz o "sealing" para `unknown` em um único
// ponto tipado, evitando `any` espalhado pelo módulo. A validação de runtime
// continua sendo feita pelo `paramsSchema` Zod de cada tool.
function wrap<T>(def: ToolDefinition<T>): ToolDefinition<unknown> {
  return def as unknown as ToolDefinition<unknown>;
}

export const TOOLS: Record<ToolName, ToolDefinition<unknown>> = {
  criar_iniciativa: wrap(criarIniciativa),
  atualizar_iniciativa: wrap(atualizarIniciativa),
  encerrar_iniciativa: wrap(encerrarIniciativa),
  vincular_iniciativa_a_kpi: wrap(vincularIniciativaAKpi),
  dividir_iniciativa: wrap(dividirIniciativa),
  criar_okr: wrap(criarOkr),
  atualizar_okr: wrap(atualizarOkr),
  adicionar_kr_a_okr: wrap(adicionarKrAOkr),
  atualizar_kr: wrap(atualizarKr),
  atualizar_progresso_kr: wrap(atualizarProgressoKr),
  registrar_checkin_kr: wrap(registrarCheckinKr),
  revisar_qualidade_kr: wrap(revisarQualidadeKr),
  vincular_kr_a_indicador: wrap(vincularKrAIndicador),
  criar_indicador: wrap(criarIndicador),
  atualizar_valor_indicador: wrap(atualizarValorIndicador),
  criar_risco: wrap(criarRisco),
  atualizar_risco: wrap(atualizarRisco),
  registrar_mitigacao: wrap(registrarMitigacao),
  criar_item_swot: wrap(criarItemSwot),
  atualizar_item_swot: wrap(atualizarItemSwot),
  arquivar_item_swot: wrap(arquivarItemSwot),
  criar_fator_pestel: wrap(criarFatorPestel),
  atualizar_fator_pestel: wrap(atualizarFatorPestel),
  arquivar_fator_pestel: wrap(arquivarFatorPestel),
  atualizar_intensidade_forca: wrap(atualizarIntensidadeForca),
  adicionar_evidencia_forca: wrap(adicionarEvidenciaForca),
  criar_oportunidade: wrap(criarOportunidade),
  atualizar_oportunidade: wrap(atualizarOportunidade),
  arquivar_oportunidade: wrap(arquivarOportunidade),
  navegar_para: wrap(navegarPara),
  abrir_entidade: wrap(abrirEntidade),
  criar_plano_agentico: wrap(criarPlanoAgentico),
  concluir_plano_agentico: wrap(concluirPlanoAgentico),
  cancelar_plano_agentico: wrap(cancelarPlanoAgentico),
  registrar_fato_manualmente: wrap(registrarFatoManualmente),
  esquecer_fato: wrap(esquecerFato),
  gerar_pauta_reuniao: wrap(gerarPautaReuniao),
  registrar_ata: wrap(registrarAta),
  registrar_decisao: wrap(registrarDecisao),
  agendar_revisao: wrap(agendarRevisao),
  // Task #287
  criar_estrategia: wrap(criarEstrategia),
  atualizar_estrategia: wrap(atualizarEstrategia),
  arquivar_estrategia: wrap(arquivarEstrategia),
  criar_bloco_bmc: wrap(criarBlocoBmc),
  atualizar_bloco_bmc: wrap(atualizarBlocoBmc),
  arquivar_bloco_bmc: wrap(arquivarBlocoBmc),
  criar_relacao_bsc: wrap(criarRelacaoBsc),
  atualizar_relacao_bsc: wrap(atualizarRelacaoBsc),
  remover_relacao_bsc: wrap(removerRelacaoBsc),
  criar_cenario: wrap(criarCenario),
  atualizar_cenario: wrap(atualizarCenario),
  arquivar_cenario: wrap(arquivarCenario),
  // Task #288 — Ciclo de Aprendizado
  registrar_retrospectiva: wrap(registrarRetrospectiva),
  arquivar_objetivo: wrap(arquivarObjetivoTool),
  repriorizar_iniciativas: wrap(repriorizarIniciativasTool),
  repriorizar_estrategias: wrap(repriorizarEstrategiasTool),
  proposta_em_lote: wrap(propostaEmLote),
  // Task #289 — Memória de longo prazo
  gerar_resumo_ciclo_manual: wrap(gerarResumoCicloManual),
};

// Tools que executam ações de negócio (passíveis de vínculo com plano).
// As tools de gerenciamento de plano agêntico não são consideradas "passos".
const TOOLS_EXECUTORAS: ReadonlySet<ToolName> = new Set<ToolName>([
  "criar_iniciativa",
  "atualizar_iniciativa",
  "encerrar_iniciativa",
  "vincular_iniciativa_a_kpi",
  "dividir_iniciativa",
  "criar_okr",
  "atualizar_okr",
  "adicionar_kr_a_okr",
  "atualizar_kr",
  "atualizar_progresso_kr",
  "registrar_checkin_kr",
  "revisar_qualidade_kr",
  "vincular_kr_a_indicador",
  "criar_indicador",
  "atualizar_valor_indicador",
  "criar_risco",
  "atualizar_risco",
  "registrar_mitigacao",
  "criar_item_swot",
  "atualizar_item_swot",
  "arquivar_item_swot",
  "criar_fator_pestel",
  "atualizar_fator_pestel",
  "arquivar_fator_pestel",
  "atualizar_intensidade_forca",
  "adicionar_evidencia_forca",
  "criar_oportunidade",
  "atualizar_oportunidade",
  "arquivar_oportunidade",
  "navegar_para",
  "abrir_entidade",
  "gerar_pauta_reuniao",
  "registrar_ata",
  "registrar_decisao",
  "agendar_revisao",
  "criar_estrategia",
  "atualizar_estrategia",
  "arquivar_estrategia",
  "criar_bloco_bmc",
  "atualizar_bloco_bmc",
  "arquivar_bloco_bmc",
  "criar_relacao_bsc",
  "atualizar_relacao_bsc",
  "remover_relacao_bsc",
  "criar_cenario",
  "atualizar_cenario",
  "arquivar_cenario",
  // Task #288 — só as tools que de fato gravam no domínio podem virar
  // passo de plano agêntico. `proposta_em_lote` é meta (não vira passo).
  "registrar_retrospectiva",
  "arquivar_objetivo",
  "repriorizar_iniciativas",
  "repriorizar_estrategias",
]);

export function isToolExecutora(name: string): boolean {
  return TOOLS_EXECUTORAS.has(name as ToolName);
}

export function getTool(name: string): ToolDefinition<unknown> | null {
  if (name in TOOLS) return TOOLS[name as ToolName];
  return null;
}

/** Devolve as definições no formato esperado pelo OpenAI Chat Completions API.
 * Para tools executoras, injeta `planoId`/`passoOrdem` opcionais no JSON schema
 * permitindo ao modelo vincular a proposta a um passo de plano agêntico ativo.
 */
export function toOpenAITools() {
  return Object.values(TOOLS).map((t) => {
    let parameters: Record<string, unknown> = t.jsonSchema;
    if (isToolExecutora(t.name)) {
      const base = t.jsonSchema as { properties?: Record<string, unknown>; [k: string]: unknown };
      parameters = {
        ...base,
        properties: {
          ...(base.properties ?? {}),
          planoId: {
            type: "string",
            description: "Opcional: ID do plano agêntico ativo ao qual este passo pertence.",
          },
          passoOrdem: {
            type: "integer",
            minimum: 1,
            description: "Opcional: número do passo (1-based) dentro do plano.",
          },
        },
      };
    }
    return {
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters },
    };
  });
}

/**
 * Valida os parâmetros recebidos do modelo, persiste a proposta no log
 * e devolve o registro pronto para o frontend exibir como PropostaCard.
 */
// Task #246 — Resolvedores de IDs → nomes amigáveis para o preview HITL.
// Cada chave do parsed.data cujo nome bate com o registro abaixo é
// resolvido contra o storage (com checagem de tenant) e o resultado é
// usado para substituir qualquer campo do preview cujo `valor` seja
// exatamente esse ID. Best-effort: falhas viram null e não quebram a
// proposta.
const ID_RESOLVERS: Record<string, (id: string, empresaId: string) => Promise<string | null>> = {
  objetivoId: async (id, e) => {
    const list = await storage.getObjetivos(e);
    return list.find((o) => o.id === id)?.titulo ?? null;
  },
  indicadorId: async (id, e) => {
    const ind = await storage.getIndicador(id);
    return ind && ind.empresaId === e ? ind.nome : null;
  },
  indicadorFonteId: async (id, e) => {
    const ind = await storage.getIndicador(id);
    return ind && ind.empresaId === e ? ind.nome : null;
  },
  iniciativaId: async (id, e) => {
    const it = await storage.getIniciativa(id);
    return it && it.empresaId === e ? it.titulo : null;
  },
  krId: async (id, e) => {
    const kr = await storage.getResultadoChaveById(id, e);
    return kr ? kr.metrica : null;
  },
  resultadoChaveId: async (id, e) => {
    const kr = await storage.getResultadoChaveById(id, e);
    return kr ? kr.metrica : null;
  },
  oportunidadeId: async (id, e) => {
    const op = await storage.getOportunidadeCrescimento(id);
    return op && op.empresaId === e ? op.titulo : null;
  },
  estrategiaId: async (id, e) => {
    const est = await storage.getEstrategia(id);
    return est && est.empresaId === e ? est.titulo : null;
  },
  // Task #287
  blocoId: async (id, e) => {
    const list = await storage.getModeloNegocio(e);
    const b = list.find((x) => x.id === id);
    if (!b) return null;
    return BLOCO_BMC_LABEL[b.bloco as typeof BLOCOS_BMC[number]] ?? b.bloco;
  },
  cenarioId: async (id, e) => {
    const list = await storage.getCenarios(e);
    return list.find((c) => c.id === id)?.titulo ?? null;
  },
  relacaoId: async (id, e) => {
    const list = await storage.getBscRelacoes(e);
    const rel = list.find((r) => r.id === id);
    if (!rel) return null;
    const objs = await storage.getObjetivos(e);
    const o = objs.find((x) => x.id === rel.origemId)?.titulo ?? "?";
    const d = objs.find((x) => x.id === rel.destinoId)?.titulo ?? "?";
    return `${o} → ${d}`;
  },
  origemId: async (id, e) => {
    const list = await storage.getObjetivos(e);
    return list.find((o) => o.id === id)?.titulo ?? null;
  },
  destinoId: async (id, e) => {
    const list = await storage.getObjetivos(e);
    return list.find((o) => o.id === id)?.titulo ?? null;
  },
};

// Tools que recebem o ID da entidade alvo na chave genérica `id` em vez de
// usar o nome explícito (ex.: `iniciativaId`). Mapeia toolName → resolver.
const TOOL_ID_RESOLVERS: Record<string, (id: string, empresaId: string) => Promise<string | null>> = {
  atualizar_iniciativa: ID_RESOLVERS.iniciativaId,
  encerrar_iniciativa: ID_RESOLVERS.iniciativaId,
  // Task #288 — `arquivar_objetivo` recebe o ID do objetivo na chave `id`.
  arquivar_objetivo: ID_RESOLVERS.objetivoId,
};

async function enrichPreviewWithFriendlyNames(
  preview: PropostaPreview,
  parsed: Record<string, unknown>,
  empresaId: string,
  toolName?: string,
): Promise<PropostaPreview> {
  const idMap = new Map<string, string>();
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof val !== "string" || val.length < 8) continue;
    let resolver: ((id: string, empresaId: string) => Promise<string | null>) | undefined =
      ID_RESOLVERS[key];
    if (!resolver && key === "id" && toolName) {
      resolver = TOOL_ID_RESOLVERS[toolName];
    }
    if (!resolver) continue;
    if (idMap.has(val)) continue;
    try {
      const friendly = await resolver(val, empresaId);
      if (friendly) idMap.set(val, friendly);
    } catch { /* best-effort */ }
  }
  if (idMap.size === 0) return preview;
  const campos = (preview.campos ?? []).map((c) => {
    const friendly = idMap.get(c.valor);
    return friendly ? { ...c, valor: friendly } : c;
  });
  return { ...preview, campos };
}

export async function registrarProposta(opts: {
  toolName: string;
  rawArgs: unknown;
  empresaId: string;
  usuarioId?: string | null;
  origem?: "chat" | "briefing";
  // Task #189 — vínculo opcional com plano agêntico (passo).
  vinculoPlano?: { planoId: string; passoOrdem: number } | null;
}): Promise<{
  ok: true;
  logId: string;
  ferramenta: ToolName;
  preview: PropostaPreview;
  parametros: Record<string, unknown>;
  passo?: { planoId: string; passoOrdem: number; passoId: string } | null;
} | { ok: false; mensagem: string }> {
  const tool = getTool(opts.toolName);
  if (!tool) return { ok: false, mensagem: `Ferramenta desconhecida: ${opts.toolName}` };

  // Extrai metadados de plano dos argumentos (o LLM pode tê-los enviado
  // inline mesmo sem estarem no schema da tool — strip antes de validar).
  let inlinePlanoId: string | undefined;
  let inlinePassoOrdem: number | undefined;
  let argsLimpos: unknown = opts.rawArgs;
  if (opts.rawArgs && typeof opts.rawArgs === "object" && !Array.isArray(opts.rawArgs)) {
    const r = { ...(opts.rawArgs as Record<string, unknown>) };
    if (typeof r.planoId === "string") {
      inlinePlanoId = r.planoId;
      delete r.planoId;
    }
    if (typeof r.passoOrdem === "number") {
      inlinePassoOrdem = r.passoOrdem;
      delete r.passoOrdem;
    }
    argsLimpos = r;
  }

  // Fix — para concluir_plano_agentico/cancelar_plano_agentico, se o LLM
  // esqueceu de informar planoId (acontece quando o usuário só diz "sim"
  // para uma confirmação conversacional), resolvemos pelo plano ativo da
  // empresa/usuário antes de validar. Evita a falha "Parâmetros inválidos"
  // e "Não consegui formular uma resposta agora".
  if (
    (opts.toolName === "cancelar_plano_agentico" || opts.toolName === "concluir_plano_agentico")
    && argsLimpos && typeof argsLimpos === "object" && !Array.isArray(argsLimpos)
  ) {
    const r = argsLimpos as Record<string, unknown>;
    if (!r.planoId || typeof r.planoId !== "string" || r.planoId.length < 8) {
      try {
        const ativo = await storage.getPlanoAtivoEmpresaUsuario(opts.empresaId, opts.usuarioId ?? null);
        if (ativo?.id) {
          argsLimpos = { ...r, planoId: ativo.id };
        }
      } catch { /* best-effort */ }
    }
  }

  const parsed = tool.paramsSchema.safeParse(argsLimpos);
  if (!parsed.success) {
    return {
      ok: false,
      mensagem: `Parâmetros inválidos para ${opts.toolName}: ${parsed.error.message.slice(0, 200)}`,
    };
  }

  // Task #333/#335 — Pré-validação determinística de duplicidade para
  // todas as tools de criação cobertas (iniciativa, OKR, KR, indicador,
  // risco, oportunidade, item SWOT, fator PESTEL). Evita gerar card de
  // proposta quando já existe item muito parecido na mesma empresa.
  // O LLM, ao ver o erro estruturado, deve propor atualizar/arquivar/
  // abrir um dos candidatos ou pedir desambiguação ao usuário.
  const dup = await detectarDuplicidade(tool.name, parsed.data, opts.empresaId);
  if (dup) {
    return { ok: false, mensagem: mensagemDuplicidade(dup) };
  }

  // Task #342 — Pré-validação determinística de FKs em tools de update
  // (atualizar_valor_indicador, atualizar_iniciativa, encerrar_iniciativa,
  // atualizar_okr, adicionar_kr_a_okr, atualizar_kr, atualizar_progresso_kr).
  // Bloqueia o card quando o LLM passa um id inventado (ex.: slug
  // "kpi_uso_sistemas_..." em vez do UUID do CATÁLOGO) — antes só falhava
  // no apply, depois do usuário já ter confirmado.
  const fkErr = await validarFkExistentes(tool.name, parsed.data, opts.empresaId);
  if (fkErr) {
    return { ok: false, mensagem: fkErr.mensagem };
  }

  let preview = tool.preview(parsed.data);

  // Task #246 — Substitui IDs (UUIDs) por nomes amigáveis no preview HITL
  // (ex.: objetivoId → título do objetivo). Best-effort: se a resolução
  // falhar, mantém o valor original.
  try {
    if (parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)) {
      preview = await enrichPreviewWithFriendlyNames(
        preview,
        parsed.data as Record<string, unknown>,
        opts.empresaId,
        tool.name,
      );
    }
  } catch { /* best-effort */ }

  // Task #284 — diff "antes → depois" para tools de atualização que
  // expõem `enrichPreview`. Best-effort: se falhar, mantém o preview já
  // enriquecido com nomes amigáveis.
  try {
    if (typeof tool.enrichPreview === "function") {
      preview = await tool.enrichPreview(preview, parsed.data, {
        empresaId: opts.empresaId,
        usuarioId: opts.usuarioId ?? null,
      });
    }
  } catch { /* best-effort */ }

  // Task #193 — Aviso explícito quando o usuário já tem um plano agêntico
  // ativo. Em vez de cancelar silenciosamente o plano anterior, enriquecemos
  // o preview HITL para deixar claro o que vai acontecer e dar ao usuário a
  // chance de revisar antes de confirmar.
  if (tool.name === "criar_plano_agentico") {
    try {
      const planoExistente = await storage.getPlanoAtivoEmpresaUsuario(
        opts.empresaId,
        opts.usuarioId ?? null,
      );
      if (planoExistente) {
        const passosExistente = await storage.listPassosByPlano(planoExistente.id);
        const concluidos = passosExistente.filter((p) => p.status === "concluido").length;
        const avisoCampos = [
          {
            label: "⚠ Plano em andamento",
            valor: `"${planoExistente.titulo}" — passo ${planoExistente.passoAtual}/${planoExistente.totalPassos} (${concluidos} concluído${concluidos === 1 ? "" : "s"}).`,
          },
          {
            label: "O que acontece se você confirmar",
            valor: "O plano atual será cancelado e este novo plano começará do passo 1.",
          },
        ];
        preview = {
          ...preview,
          descricao: `Você já tem um plano ativo. ${preview.descricao}`,
          campos: [...avisoCampos, ...(preview.campos ?? [])],
          ctaConfirmar: "Cancelar atual e iniciar este",
          ctaIgnorar: "Manter plano atual",
        };
      }

      // Task #199 — Aviso quando o plano ativo NÃO é do usuário corrente:
      // pode ser compartilhado da empresa ou de outro membro do time.
      // Reaproveita o mesmo formato visual, só muda o cabeçalho/CTA pra
      // deixar claro que o impacto é coletivo.
      const planoOutro = await storage.getPlanoAtivoEmpresaDeOutros(
        opts.empresaId,
        opts.usuarioId ?? null,
      );
      // Evita aviso duplicado: getPlanoAtivoEmpresaUsuario também retorna
      // planos compartilhados (usuarioId IS NULL); se já caiu no bloco
      // anterior, não renderiza o bloco "de outro membro" para o mesmo plano.
      if (planoOutro && planoOutro.plano.id !== planoExistente?.id) {
        const passosOutro = await storage.listPassosByPlano(planoOutro.plano.id);
        const concluidosOutro = passosOutro.filter((p) => p.status === "concluido").length;
        const donoTxt = planoOutro.donoNome
          ? `Plano de ${planoOutro.donoNome}`
          : "Plano compartilhado da empresa";
        const avisoCampos = [
          {
            label: `⚠ ${donoTxt} em andamento`,
            valor: `"${planoOutro.plano.titulo}" — passo ${planoOutro.plano.passoAtual}/${planoOutro.plano.totalPassos} (${concluidosOutro} concluído${concluidosOutro === 1 ? "" : "s"}).`,
          },
          {
            label: "O que acontece se você confirmar",
            valor: planoOutro.donoNome
              ? `O plano de ${planoOutro.donoNome} será cancelado e este novo plano começará do passo 1.`
              : "O plano compartilhado do time será cancelado e este novo plano começará do passo 1.",
          },
        ];
        preview = {
          ...preview,
          descricao: planoOutro.donoNome
            ? `Já existe um plano agêntico ativo de ${planoOutro.donoNome} nesta empresa. ${preview.descricao}`
            : `Já existe um plano agêntico compartilhado do time nesta empresa. ${preview.descricao}`,
          campos: [...avisoCampos, ...(preview.campos ?? [])],
          ctaConfirmar: "Cancelar plano do time e iniciar este",
          ctaIgnorar: "Manter plano do time",
        };
      }
    } catch {
      /* best-effort — segue com o preview padrão se a checagem falhar */
    }
  }

  const log = await storage.createPropostaLog({
    empresaId: opts.empresaId,
    usuarioId: opts.usuarioId ?? null,
    ferramenta: tool.name,
    parametros: parsed.data as Record<string, unknown>,
    preview: preview as unknown as Record<string, unknown>,
    status: "proposta",
    origem: opts.origem ?? "chat",
  });

  // Vincula ao passo do plano, se aplicável (só para tools executoras).
  let passo: { planoId: string; passoOrdem: number; passoId: string } | null = null;
  const vinculo = opts.vinculoPlano ?? (inlinePlanoId && inlinePassoOrdem ? { planoId: inlinePlanoId, passoOrdem: inlinePassoOrdem } : null);
  if (vinculo && isToolExecutora(tool.name)) {
    try {
      const plano = await storage.getPlanoAgentico(vinculo.planoId);
      // Ownership: empresa correta + (plano compartilhado OU dono do plano).
      const ownerOk =
        !!plano &&
        plano.empresaId === opts.empresaId &&
        (plano.usuarioId == null || plano.usuarioId === (opts.usuarioId ?? null));
      if (plano && ownerOk && plano.status === "ativo") {
        const passoRow = await storage.getPassoByPlanoOrdem(vinculo.planoId, vinculo.passoOrdem);
        if (passoRow && passoRow.status === "pendente") {
          await storage.updatePlanoAgenticoPasso(passoRow.id, {
            status: "em_andamento",
            propostaId: log.id,
          });
          passo = { planoId: vinculo.planoId, passoOrdem: vinculo.passoOrdem, passoId: passoRow.id };
        }
      }
    } catch {
      /* vínculo é best-effort — proposta segue mesmo sem o link */
    }
  }

  return {
    ok: true,
    logId: log.id,
    ferramenta: tool.name,
    preview,
    parametros: parsed.data as Record<string, unknown>,
    passo,
  };
}

// ─── Status labels para SSE (chip de "o que o agente está fazendo") ───
// Registro central PT-BR para todas as tools — HITL (writes), lookup
// (buscar_entidade_por_nome) e read-only (analisar_indicador, projetar_kr,
// simular_impacto, comparar_periodos). Usado por /api/ai/assistente para
// emitir `event: status` antes de cada chamada interna.
export const STATUS_LABELS: Readonly<Record<string, string>> = {
  // Iniciativas
  criar_iniciativa: "Preparando iniciativa…",
  atualizar_iniciativa: "Atualizando iniciativa…",
  encerrar_iniciativa: "Encerrando iniciativa…",
  vincular_iniciativa_a_kpi: "Vinculando iniciativa ao KPI…",
  dividir_iniciativa: "Dividindo iniciativa em entregas…",
  // OKRs / KRs
  criar_okr: "Criando OKR…",
  atualizar_okr: "Atualizando OKR…",
  adicionar_kr_a_okr: "Adicionando meta ao OKR…",
  atualizar_kr: "Editando meta…",
  atualizar_progresso_kr: "Atualizando progresso da meta…",
  vincular_kr_a_indicador: "Vinculando meta ao KPI…",
  registrar_checkin_kr: "Registrando check-in da meta…",
  revisar_qualidade_kr: "Revisando qualidade da meta…",
  // Indicadores
  criar_indicador: "Criando KPI…",
  atualizar_valor_indicador: "Registrando leitura do KPI…",
  // Riscos
  criar_risco: "Registrando risco…",
  atualizar_risco: "Atualizando risco…",
  registrar_mitigacao: "Registrando mitigação…",
  criar_item_swot: "Adicionando item ao SWOT…",
  atualizar_item_swot: "Atualizando item do SWOT…",
  arquivar_item_swot: "Arquivando item do SWOT…",
  criar_fator_pestel: "Adicionando fator ao PESTEL…",
  atualizar_fator_pestel: "Atualizando fator PESTEL…",
  arquivar_fator_pestel: "Arquivando fator PESTEL…",
  atualizar_intensidade_forca: "Atualizando intensidade da força…",
  adicionar_evidencia_forca: "Registrando evidência da força…",
  criar_oportunidade: "Criando oportunidade…",
  atualizar_oportunidade: "Atualizando oportunidade…",
  arquivar_oportunidade: "Arquivando oportunidade…",
  // Memória persistente
  registrar_fato_manualmente: "Anotando fato na memória…",
  esquecer_fato: "Removendo fato da memória…",
  // Planos agênticos
  criar_plano_agentico: "Montando plano agêntico…",
  concluir_plano_agentico: "Concluindo plano agêntico…",
  cancelar_plano_agentico: "Cancelando plano agêntico…",
  // Rituais de gestão
  gerar_pauta_reuniao: "Gerando pauta de reunião…",
  registrar_ata: "Registrando ata da reunião…",
  registrar_decisao: "Registrando decisão estratégica…",
  agendar_revisao: "Agendando revisão…",
  // Task #288 — Ciclo de Aprendizado
  registrar_retrospectiva: "Registrando retrospectiva…",
  arquivar_objetivo: "Arquivando objetivo…",
  repriorizar_iniciativas: "Repriorizando iniciativas…",
  repriorizar_estrategias: "Repriorizando estratégias…",
  proposta_em_lote: "Preparando lote de mudanças…",
  // Navegação / abertura
  navegar_para: "Preparando navegação…",
  abrir_entidade: "Abrindo item…",
  // Modelo & Estratégia (Task #287)
  criar_estrategia: "Criando estratégia…",
  atualizar_estrategia: "Atualizando estratégia…",
  arquivar_estrategia: "Arquivando estratégia…",
  criar_bloco_bmc: "Atualizando BMC…",
  atualizar_bloco_bmc: "Atualizando BMC…",
  arquivar_bloco_bmc: "Arquivando bloco do BMC…",
  criar_relacao_bsc: "Conectando objetivos no Mapa BSC…",
  atualizar_relacao_bsc: "Atualizando relação BSC…",
  remover_relacao_bsc: "Removendo relação do Mapa BSC…",
  criar_cenario: "Registrando cenário…",
  atualizar_cenario: "Atualizando cenário…",
  arquivar_cenario: "Arquivando cenário…",
  // Lookup (read-only, sem HITL)
  buscar_entidade_por_nome: "Buscando item pelo nome…",
  // Read-only de análise (sem HITL)
  analisar_indicador: "Consultando indicador…",
  projetar_kr: "Projetando meta…",
  simular_impacto: "Simulando impacto…",
  comparar_periodos: "Comparando períodos…",
  // Task #285 — Diagnóstico ativo do plano
  analisar_gap_meta_vs_realizado: "Analisando gap meta × realizado…",
  detectar_lacunas_cascata: "Procurando itens órfãos no plano…",
  detectar_objetivos_descarrilados: "Identificando objetivos em risco…",
  analisar_consistencia_estrategica: "Avaliando consistência estratégica…",
  sumarizar_ciclo_atual: "Resumindo o ciclo atual…",
  // Memória de longo prazo (Task #289)
  gerar_resumo_ciclo_manual: "Gerando resumo do ciclo…",
  consultar_historico_estrategia: "Consultando memória do Bizzy…",
  consultar_resumo_ciclo: "Lendo resumo do ciclo…",
};

export function getToolStatusLabel(name: string): string {
  return STATUS_LABELS[name] ?? "Trabalhando…";
}

// Task #342 — Humaniza mensagens de erro técnicas devolvidas por
// `registrarProposta` (FK inválida, duplicidade, parâmetros, no-op) para
// quando a autocorreção do Bizzy também falhou e a mensagem precisa
// chegar ao usuário. O objetivo é nunca vazar UUIDs, `indicadorId=`,
// `Use sempre o id REAL`, JSON, nomes de tools em snake_case nem
// "Parâmetros inválidos" — apenas uma frase curta em PT-BR.
export function humanizarErroProposta(mensagem: string): string {
  const msg = (mensagem || "").trim();
  if (!msg) return "Não consegui concluir essa ação. Pode reformular ou me dar mais contexto?";

  // FK inválida: "O <rotulo> com <campo>=\"...\" não existe nesta empresa..."
  const mFk = msg.match(
    /O\s+([^"]+?)\s+com\s+\w+="([^"]{0,80})"\s+não existe nesta empresa/i,
  );
  if (mFk) {
    const rotulo = mFk[1].trim();
    // Tenta extrair os primeiros candidatos por nome (sem UUIDs).
    const nomes: string[] = [];
    const reCand = /•\s+"([^"]+)"\s*\(id=[^)]+\)/g;
    let m: RegExpExecArray | null;
    while ((m = reCand.exec(msg)) !== null && nomes.length < 3) {
      nomes.push(m[1]);
    }
    const sugestoes = nomes.length > 0
      ? ` Você quis dizer ${nomes.map((n) => `“${n}”`).join(", ")}?`
      : "";
    return `Não consegui identificar com certeza qual ${rotulo} você quis dizer.${sugestoes} Pode confirmar o nome?`;
  }

  // Duplicidade: "Já existe <rotulo> parecido(a) nesta empresa..."
  const mDup = msg.match(
    /Já existe\s+([^"]+?)\s+parecid[oa]\(a\)\s+nesta empresa[^"]*"([^"]{0,80})"/i,
  );
  if (mDup) {
    const rotulo = mDup[1].trim();
    const novo = mDup[2];
    const nomes: string[] = [];
    const reCand = /•\s+"([^"]+)"\s*\(id=[^)]+\)/g;
    let m: RegExpExecArray | null;
    while ((m = reCand.exec(msg)) !== null && nomes.length < 3) {
      nomes.push(m[1]);
    }
    const lista = nomes.length > 0 ? `: ${nomes.map((n) => `“${n}”`).join(", ")}` : "";
    return `Já existe ${rotulo} parecida no catálogo${lista} — não criei “${novo}” para evitar duplicidade. Quer que eu atualize ou arquive a existente em vez de criar uma nova?`;
  }

  // Parâmetros inválidos (Zod): "Parâmetros inválidos para <tool>: <jsonZod>"
  if (/Parâmetros inválidos para\s+\w+/i.test(msg)) {
    return "Faltam algumas informações para concluir essa ação. Pode me dar mais detalhes (qual item, prazo, valor)?";
  }

  // No-op: "Nada a alterar nesta iniciativa: todos os campos enviados já batem..."
  if (/Nada a alterar|todos os campos enviados já batem|sem mudança/i.test(msg)) {
    return "Os dados que você passou são iguais ao que já está cadastrado. Me diga o que mudou (título, prazo, status, responsável) para eu atualizar.";
  }

  // Ferramenta desconhecida
  if (/Ferramenta desconhecida/i.test(msg)) {
    return "Não tenho uma ação direta pra isso. Pode descrever o que você quer fazer?";
  }

  // Fallback genérico — remove qualquer pista técnica (UUIDs, ids, JSON,
  // nomes de tools snake_case) antes de devolver.
  let safe = msg
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "")
    .replace(/\b\w+Id="[^"]*"/g, "")
    .replace(/\b[a-z]+(?:_[a-z]+)+/g, "")
    .replace(/\{[\s\S]*?\}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!safe || safe.length < 12) {
    safe = "Não consegui concluir essa ação. Pode me dar mais contexto?";
  }
  return safe;
}

// Task #188 — Registro central de tools do Assistente Estratégico (HITL).
// Cada tool tem (1) JSON Schema para a OpenAI, (2) validação Zod dos parâmetros,
// (3) preview() que descreve a ação para o humano e (4) apply() que executa via storage.

import { z } from "zod/v4";
import { storage } from "./storage";
import type { PropostaPreview } from "@shared/schema";

// ---------- Tipos públicos ----------
export type ToolName =
  | "criar_iniciativa"
  | "atualizar_iniciativa"
  | "criar_okr"
  | "atualizar_okr"
  | "atualizar_progresso_kr"
  | "criar_indicador"
  | "atualizar_valor_indicador"
  | "navegar_para";

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
  | "navegacao";

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
}

// ---------- Helpers ----------
const ROTAS_VALIDAS = [
  "/iniciativas", "/okrs", "/estrategias", "/riscos", "/indicadores",
  "/oportunidades-crescimento", "/meu-painel", "/dashboard", "/swot",
  "/pestel", "/cinco-forcas", "/bmc", "/ritos", "/bsc", "/mapa-bsc",
  "/cenarios", "/alertas", "/diagnostico", "/rastreabilidade",
] as const;

// Vocabulário canônico do produto (mantido em sincronia com client/src/pages/*).
const PRIORIDADES = ["alta", "média", "baixa"] as const;
const STATUS_INICIATIVA = ["planejada", "em_andamento", "concluida", "atrasada"] as const;
const PERSPECTIVAS_BSC = ["Finanças", "Clientes", "Processos", "Aprendizado"] as const;

function strField(label: string, valor: string | undefined | null) {
  if (!valor || !String(valor).trim()) return null;
  return { label, valor: String(valor) };
}

// ---------- 1. criar_iniciativa ----------
const criarIniciativaSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(3).max(1000),
  prioridade: z.enum(PRIORIDADES).default("média"),
  prazo: z.string().min(4).max(32), // YYYY-MM-DD ou texto livre
  status: z.enum(STATUS_INICIATIVA).default("planejada"),
  responsavel: z.string().max(120).default(""),
  impacto: z.string().max(500).default(""),
  estrategiaId: z.string().optional(),
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
      prazo: { type: "string", description: "Prazo no formato YYYY-MM-DD ou texto curto" },
      status: { type: "string", enum: [...STATUS_INICIATIVA] },
      responsavel: { type: "string", description: "Nome do responsável (string livre)" },
      impacto: { type: "string", description: "Impacto esperado em 1 frase" },
      estrategiaId: { type: "string", description: "ID da estratégia vinculada (opcional)" },
    },
  },
  preview: (p) => ({
    titulo: `Criar iniciativa: ${p.titulo}`,
    descricao: p.descricao,
    campos: [
      strField("Prioridade", p.prioridade),
      strField("Prazo", p.prazo),
      strField("Responsável", p.responsavel),
      strField("Impacto esperado", p.impacto),
    ].filter(Boolean) as { label: string; valor: string }[],
    ctaConfirmar: "Criar iniciativa",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    // Validação de tenant para FK opcional: se estrategiaId vier, precisa
    // pertencer à mesma empresa — caso contrário, ignora o vínculo para
    // não criar referência cruzada entre tenants.
    let estrategiaIdSafe: string | undefined = undefined;
    if (p.estrategiaId) {
      const est = await storage.getEstrategia(p.estrategiaId);
      if (est && est.empresaId === ctx.empresaId) estrategiaIdSafe = est.id;
    }
    const created = await storage.createIniciativa({
      empresaId: ctx.empresaId,
      titulo: p.titulo,
      descricao: p.descricao,
      status: p.status,
      prioridade: p.prioridade,
      prazo: p.prazo,
      responsavel: p.responsavel || "",
      impacto: p.impacto || "",
      estrategiaId: estrategiaIdSafe,
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
const atualizarIniciativaSchema = z.object({
  id: z.string().min(8),
  titulo: z.string().min(3).max(200).optional(),
  descricao: z.string().max(1000).optional(),
  prioridade: z.enum(PRIORIDADES).optional(),
  prazo: z.string().max(32).optional(),
  status: z.enum(STATUS_INICIATIVA).optional(),
  responsavel: z.string().max(120).optional(),
});
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
      prazo: { type: "string" },
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
    if (p.status) patch.status = p.status;
    if (p.responsavel !== undefined) patch.responsavel = p.responsavel;
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
};

// ---------- 3. criar_okr ----------
const criarOkrSchema = z.object({
  objetivoTitulo: z.string().min(3).max(200),
  objetivoDescricao: z.string().max(800).default(""),
  perspectiva: z.enum(PERSPECTIVAS_BSC).default("Finanças"),
  prazo: z.string().min(4).max(32),
  resultadosChave: z
    .array(
      z.object({
        metrica: z.string().min(3).max(200),
        valorInicial: z.number().or(z.string()).transform((v) => Number(v)),
        valorAlvo: z.number().or(z.string()).transform((v) => Number(v)),
        owner: z.string().min(1).max(120),
        prazo: z.string().min(4).max(32),
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
      perspectiva: { type: "string", enum: [...PERSPECTIVAS_BSC] },
      prazo: { type: "string", description: "Ex.: 2026-Q2 ou YYYY-MM-DD" },
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
      { label: "Prazo", valor: p.prazo },
      ...p.resultadosChave.map((r, i) => ({
        label: `KR ${i + 1}`,
        valor: `${r.metrica} (${r.valorInicial} → ${r.valorAlvo}, ${r.owner}, ${r.prazo})`,
      })),
    ],
    ctaConfirmar: "Criar OKR",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
    const objetivo = await storage.createObjetivo({
      empresaId: ctx.empresaId,
      titulo: p.objetivoTitulo,
      descricao: p.objetivoDescricao || null,
      prazo: p.prazo,
      perspectiva: p.perspectiva,
    });
    const krsCriados = [];
    for (const r of p.resultadosChave) {
      const kr = await storage.createResultadoChave(
        {
          objetivoId: objetivo.id,
          metrica: r.metrica,
          valorInicial: String(r.valorInicial),
          valorAlvo: String(r.valorAlvo),
          valorAtual: String(r.valorInicial),
          owner: r.owner,
          prazo: r.prazo,
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
  perspectiva: z.enum(PERSPECTIVAS_BSC).optional(),
  prazo: z.string().min(4).max(32).optional(),
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
      perspectiva: { type: "string", enum: [...PERSPECTIVAS_BSC] },
      prazo: { type: "string" },
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
};

// ---------- 5. criar_indicador ----------
const criarIndicadorSchema = z.object({
  perspectiva: z.enum(PERSPECTIVAS_BSC).default("Finanças"),
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
      perspectiva: { type: "string", enum: [...PERSPECTIVAS_BSC] },
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
  formRota: "/dashboard",
};

// ---------- Registry ----------
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
  criar_okr: wrap(criarOkr),
  atualizar_okr: wrap(atualizarOkr),
  atualizar_progresso_kr: wrap(atualizarProgressoKr),
  criar_indicador: wrap(criarIndicador),
  atualizar_valor_indicador: wrap(atualizarValorIndicador),
  navegar_para: wrap(navegarPara),
};

export function getTool(name: string): ToolDefinition<unknown> | null {
  if (name in TOOLS) return TOOLS[name as ToolName];
  return null;
}

/** Devolve as definições no formato esperado pelo OpenAI Chat Completions API. */
export function toOpenAITools() {
  return Object.values(TOOLS).map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.jsonSchema,
    },
  }));
}

/**
 * Valida os parâmetros recebidos do modelo, persiste a proposta no log
 * e devolve o registro pronto para o frontend exibir como PropostaCard.
 */
export async function registrarProposta(opts: {
  toolName: string;
  rawArgs: unknown;
  empresaId: string;
  usuarioId?: string | null;
  origem?: "chat" | "briefing";
}): Promise<{
  ok: true;
  logId: string;
  ferramenta: ToolName;
  preview: PropostaPreview;
  parametros: Record<string, unknown>;
} | { ok: false; mensagem: string }> {
  const tool = getTool(opts.toolName);
  if (!tool) return { ok: false, mensagem: `Ferramenta desconhecida: ${opts.toolName}` };

  const parsed = tool.paramsSchema.safeParse(opts.rawArgs);
  if (!parsed.success) {
    return {
      ok: false,
      mensagem: `Parâmetros inválidos para ${opts.toolName}: ${parsed.error.message.slice(0, 200)}`,
    };
  }

  const preview = tool.preview(parsed.data);
  const log = await storage.createPropostaLog({
    empresaId: opts.empresaId,
    usuarioId: opts.usuarioId ?? null,
    ferramenta: tool.name,
    parametros: parsed.data as Record<string, unknown>,
    preview: preview as unknown as Record<string, unknown>,
    status: "proposta",
    origem: opts.origem ?? "chat",
  });

  return {
    ok: true,
    logId: log.id,
    ferramenta: tool.name,
    preview,
    parametros: parsed.data as Record<string, unknown>,
  };
}

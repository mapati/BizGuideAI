// Task #188 — Registro central de tools do Assistente Estratégico (HITL).
// Task #189 — Adicionado loop agêntico (criar/concluir/cancelar plano) +
// vínculo opcional `planoId`/`passoOrdem` em todas as tools executoras.
// Cada tool tem (1) JSON Schema para a OpenAI, (2) validação Zod dos parâmetros,
// (3) preview() que descreve a ação para o humano e (4) apply() que executa via storage.

import { z } from "zod/v4";
import { storage, PlanoAtivoJaExisteError } from "./storage";
import type { PropostaPreview } from "@shared/schema";

// ---------- Tipos públicos ----------
export type ToolName =
  | "criar_iniciativa"
  | "atualizar_iniciativa"
  | "encerrar_iniciativa"
  | "criar_okr"
  | "atualizar_okr"
  | "adicionar_kr_a_okr"
  | "atualizar_kr"
  | "atualizar_progresso_kr"
  | "criar_indicador"
  | "atualizar_valor_indicador"
  | "navegar_para"
  | "abrir_entidade"
  | "criar_plano_agentico"
  | "concluir_plano_agentico"
  | "cancelar_plano_agentico";

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
  | "estrategia";

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

// ---------- 3. criar_okr ----------
const criarOkrSchema = z.object({
  objetivoTitulo: z.string().min(3).max(200),
  objetivoDescricao: z.string().max(800).default(""),
  perspectiva: z.enum(PERSPECTIVAS_OKR).default("Financeira"),
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
      perspectiva: { type: "string", enum: [...PERSPECTIVAS_OKR] },
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
  perspectiva: z.enum(PERSPECTIVAS_OKR).optional(),
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
      perspectiva: { type: "string", enum: [...PERSPECTIVAS_OKR] },
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

// ---------- 3c. adicionar_kr_a_okr ----------
// Task #207 — Acrescenta UMA meta nova a um OKR (objetivo) já existente.
const adicionarKrAOkrSchema = z.object({
  objetivoId: z.string().min(8),
  metrica: z.string().min(3).max(200),
  valorInicial: z.number().or(z.string()).transform((v) => Number(v)),
  valorAlvo: z.number().or(z.string()).transform((v) => Number(v)),
  owner: z.string().min(1).max(120),
  prazo: z.string().min(4).max(32),
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
      prazo: { type: "string", description: "Ex.: 2026-Q2 ou YYYY-MM-DD" },
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
      { label: "Prazo", valor: p.prazo },
    ],
    ctaConfirmar: "Adicionar meta",
    ctaIgnorar: "Agora não",
    ctaAjustar: "Ajustar",
  }),
  apply: async (p, ctx) => {
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
  // formRota é usado pelo botão "Ajustar". Para navegar_para não há formulário
  // a pré-preencher; mandamos o usuário para a própria rota sugerida.
  formRota: "/",
};

// ---------- 8. abrir_entidade ----------
// Task #202 — Permite ao agente abrir DIRETAMENTE o modal de edição de uma
// entidade existente (indicador, iniciativa, OKR, KR, risco, oportunidade,
// estratégia) usando deep link `?editar=<id>`. Diferente de navegar_para
// (que leva à página inteira), esta tool já abre o item específico.
const TIPOS_ABRIR_ENTIDADE = [
  "indicador",
  "iniciativa",
  "objetivo",
  "kr",
  "risco",
  "oportunidade",
  "estrategia",
] as const;

const TIPO_ROTA_ABRIR: Record<typeof TIPOS_ABRIR_ENTIDADE[number], string> = {
  indicador:    "/indicadores",
  iniciativa:   "/iniciativas",
  objetivo:     "/okrs",
  kr:           "/okrs",
  risco:        "/riscos",
  oportunidade: "/oportunidades-crescimento",
  estrategia:   "/estrategias",
};

const TIPO_LABEL_ABRIR: Record<typeof TIPOS_ABRIR_ENTIDADE[number], string> = {
  indicador:    "indicador",
  iniciativa:   "iniciativa",
  objetivo:     "objetivo (OKR)",
  kr:           "resultado-chave",
  risco:        "risco",
  oportunidade: "oportunidade de crescimento",
  estrategia:   "estratégia",
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
    }
  } catch {
    return { ok: false, nome: "" };
  }
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

const passoPlanoSchema = z.object({
  ordem: z.number().int().min(1).max(20),
  titulo: z.string().min(2).max(160),
  descricao: z.string().max(400).default(""),
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
          required: ["ordem", "titulo"],
          properties: {
            ordem: { type: "integer", minimum: 1, maximum: 20 },
            titulo: { type: "string" },
            descricao: { type: "string" },
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
      .map((s) => ({ label: `Passo ${s.ordem}`, valor: s.titulo })),
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
      rota: "/assistente",
      entidadeTipo: "navegacao",
      entidadeId: plano.id,
    };
  },
  formRota: "/assistente",
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
      rota: "/assistente",
      entidadeTipo: "navegacao",
      entidadeId: p.planoId,
    };
  },
  formRota: "/assistente",
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
      rota: "/assistente",
      entidadeTipo: "navegacao",
      entidadeId: p.planoId,
    };
  },
  formRota: "/assistente",
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
        "Busca itens existentes da empresa pelo NOME quando o id não está no '## CATÁLOGO' (que mostra apenas os 30 mais recentes). Use ANTES de propor abrir_entidade/atualizar_* sempre que o usuário citar um item por nome e você não encontrar o id no catálogo. NÃO use para criar nada — só para descobrir o id de itens já existentes. Devolve até 5 candidatos {id, nome}; se vier mais de um próximo, pergunte ao usuário qual antes de agir.",
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
        const lista = await storage.getIndicadores(empresaId);
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
  encerrar_iniciativa: wrap(encerrarIniciativa),
  criar_okr: wrap(criarOkr),
  atualizar_okr: wrap(atualizarOkr),
  adicionar_kr_a_okr: wrap(adicionarKrAOkr),
  atualizar_kr: wrap(atualizarKr),
  atualizar_progresso_kr: wrap(atualizarProgressoKr),
  criar_indicador: wrap(criarIndicador),
  atualizar_valor_indicador: wrap(atualizarValorIndicador),
  navegar_para: wrap(navegarPara),
  abrir_entidade: wrap(abrirEntidade),
  criar_plano_agentico: wrap(criarPlanoAgentico),
  concluir_plano_agentico: wrap(concluirPlanoAgentico),
  cancelar_plano_agentico: wrap(cancelarPlanoAgentico),
};

// Tools que executam ações de negócio (passíveis de vínculo com plano).
// As tools de gerenciamento de plano agêntico não são consideradas "passos".
const TOOLS_EXECUTORAS: ReadonlySet<ToolName> = new Set<ToolName>([
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
  "navegar_para",
  "abrir_entidade",
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

  const parsed = tool.paramsSchema.safeParse(argsLimpos);
  if (!parsed.success) {
    return {
      ok: false,
      mensagem: `Parâmetros inválidos para ${opts.toolName}: ${parsed.error.message.slice(0, 200)}`,
    };
  }

  let preview = tool.preview(parsed.data);

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

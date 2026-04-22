// Task #182 — Motor de geração do Briefing Diário (uma vez por dia por empresa).
//
// Recebe um empresaId, detecta sinais críticos determinísticos, monta o prompt
// com perfil + sinais + briefing de ontem + tendência simples de KPIs vermelhos
// dos últimos 7 dias, chama a IA, valida a saída com Zod e devolve o objeto
// estruturado pronto para persistir. Em caso de IA indisponível ou saída
// inválida, cai num montador determinístico (replica do antigo endpoint).

import { storage } from "./storage";
import { detectarSinaisCriticos, type SinaisCriticos } from "./notification-engine";
import { isJornadaConcluida } from "./jornada-helper";
import { openai, getModelForPlan, buildEmpresaContextoIA, buildAcoesRecentesContextoIA, buildPlanoAtivoContextoIA } from "./ai-helpers";
import {
  briefingConteudoSchema,
  type BriefingConteudo,
  type BriefingAcao,
  type Empresa,
} from "@shared/schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const TZ = "America/Sao_Paulo";

/** Retorna a data lógica (YYYY-MM-DD) da empresa no fuso de São Paulo. */
export function dataDeHojeSP(now: Date = new Date()): string {
  // pt-BR retorna DD/MM/YYYY no fuso solicitado
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const partes = fmt.formatToParts(now);
  const dia = partes.find((p) => p.type === "day")?.value ?? "01";
  const mes = partes.find((p) => p.type === "month")?.value ?? "01";
  const ano = partes.find((p) => p.type === "year")?.value ?? "1970";
  return `${ano}-${mes}-${dia}`;
}

/** Retorna a string de YYYY-MM-DD do dia anterior à data informada. */
function diaAnterior(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const ts = Date.UTC(y, m - 1, d) - DAY_MS;
  const dt = new Date(ts);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const ROTAS_VALIDAS = new Set([
  "/iniciativas",
  "/okrs",
  "/estrategias",
  "/riscos",
  "/indicadores",
  "/oportunidades-crescimento",
  "/meu-painel",
  "/dashboard",
  "/swot",
  "/pestel",
  "/cinco-forcas",
  "/bmc",
  "/ritos",
  "/bsc",
  "/mapa-bsc",
  "/cenarios",
  "/alertas",
  "/diagnostico",
  "/rastreabilidade",
]);

/** Tendência simples (melhorando/estável/piorando) por KPI vermelho — últimos 7 dias. */
async function tendenciaKpisVermelhos(
  sinais: SinaisCriticos
): Promise<Array<{ id: string; nome: string; tendencia: "melhorando" | "estavel" | "piorando" | "sem_dados" }>> {
  const limite = Date.now() - 7 * DAY_MS;
  const out: Array<{ id: string; nome: string; tendencia: "melhorando" | "estavel" | "piorando" | "sem_dados" }> = [];
  for (const k of sinais.kpisVermelhos.slice(0, 5)) {
    try {
      const leituras = await storage.getLeituras(k.id);
      const recentes = leituras
        .filter((l) => new Date(l.registradoEm).getTime() >= limite)
        .sort((a, b) => new Date(a.registradoEm).getTime() - new Date(b.registradoEm).getTime());
      if (recentes.length < 2) {
        out.push({ id: k.id, nome: k.nome, tendencia: "sem_dados" });
        continue;
      }
      const primeiro = Number(recentes[0].valor);
      const ultimo = Number(recentes[recentes.length - 1].valor);
      const meta = Number(k.meta);
      if (!Number.isFinite(primeiro) || !Number.isFinite(ultimo) || !Number.isFinite(meta)) {
        out.push({ id: k.id, nome: k.nome, tendencia: "sem_dados" });
        continue;
      }
      const distInicial = Math.abs(meta - primeiro);
      const distFinal = Math.abs(meta - ultimo);
      const delta = distInicial - distFinal;
      const ref = Math.max(Math.abs(meta), 1);
      const pct = delta / ref;
      let tendencia: "melhorando" | "estavel" | "piorando";
      if (pct > 0.05) tendencia = "melhorando";
      else if (pct < -0.05) tendencia = "piorando";
      else tendencia = "estavel";
      out.push({ id: k.id, nome: k.nome, tendencia });
    } catch {
      out.push({ id: k.id, nome: k.nome, tendencia: "sem_dados" });
    }
  }
  return out;
}

/** Constrói o briefing determinístico (fallback) com a mesma lógica do endpoint antigo. */
export function montarBriefingDeterministico(sinais: SinaisCriticos): BriefingConteudo {
  const partes: string[] = [];
  const acoes: BriefingAcao[] = [];

  partes.push(`### Bom dia! Encontrei pontos que merecem sua atenção hoje`);

  if (sinais.kpisVermelhos.length > 0) {
    const lista = sinais.kpisVermelhos
      .slice(0, 3)
      .map((k) => `**${k.nome}** (${k.atual} vs meta ${k.meta})`)
      .join(", ");
    partes.push(`- 🔴 **${sinais.kpisVermelhos.length} indicador(es) no vermelho**: ${lista}`);
    if (acoes.length < 2) acoes.push({ label: "Ver indicadores críticos", tipo: "abrir", rota: "/indicadores" });
  }
  if (sinais.iniciativasAtrasadas.length > 0) {
    const top = sinais.iniciativasAtrasadas[0];
    partes.push(
      `- ⏰ **${sinais.iniciativasAtrasadas.length} iniciativa(s) atrasada(s)**: a mais crítica é "${top.titulo}" (${top.diasAtraso} dia(s) de atraso)`
    );
    if (acoes.length < 2) acoes.push({ label: "Abrir iniciativas atrasadas", tipo: "abrir", rota: "/iniciativas" });
  }
  if (sinais.okrsParados.length > 0) {
    const top = sinais.okrsParados[0];
    partes.push(
      `- 📊 **${sinais.okrsParados.length} meta(s) sem atualização há 14+ dias**: ex. "${top.metrica}" (${top.diasParado} dias)`
    );
    if (acoes.length < 2) acoes.push({ label: "Atualizar metas", tipo: "abrir", rota: "/okrs" });
  }
  if (sinais.riscosAltosSemMitigacao.length > 0) {
    const top = sinais.riscosAltosSemMitigacao[0];
    partes.push(
      `- ⚠️ **${sinais.riscosAltosSemMitigacao.length} risco(s) alto(s) sem plano de mitigação**: ex. "${top.descricao.slice(0, 80)}"`
    );
    if (acoes.length < 2) {
      acoes.push({
        label: "Adicionar mitigação",
        tipo: "editar",
        rota: "/riscos",
        params: { id: top.id },
      });
    }
  }

  partes.push(`\nQuer que eu te ajude a priorizar e definir o próximo passo?`);
  acoes.push({ label: "Mais tarde", tipo: "dispensar" });

  // Decide o tom da prioridade
  const tom = sinais.kpisVermelhos.length + sinais.riscosAltosSemMitigacao.length >= 2 ? "critico" : "atencao";

  // Título resumido da prioridade
  let tituloPrioridade = "Pontos críticos do dia";
  if (sinais.kpisVermelhos[0]) tituloPrioridade = `Atenção: ${sinais.kpisVermelhos[0].nome}`;
  else if (sinais.iniciativasAtrasadas[0]) tituloPrioridade = `Iniciativa atrasada: ${sinais.iniciativasAtrasadas[0].titulo}`;
  else if (sinais.okrsParados[0]) tituloPrioridade = `OKR parado: ${sinais.okrsParados[0].metrica}`;
  else if (sinais.riscosAltosSemMitigacao[0]) tituloPrioridade = "Risco alto sem mitigação";

  return {
    corpo: partes.join("\n"),
    prioridade: { titulo: tituloPrioridade, tom },
    acoes: acoes.slice(0, 3),
    observacoes: [],
  };
}

/** Filtra ações vindas da IA mantendo só rotas válidas e IDs realmente presentes nos sinais. */
function sanitizarAcoes(acoes: BriefingAcao[], sinais: SinaisCriticos): BriefingAcao[] {
  const idsValidos = new Set<string>([
    ...sinais.kpisVermelhos.map((k) => k.id),
    ...sinais.iniciativasAtrasadas.map((i) => i.id),
    ...sinais.okrsParados.flatMap((o) => [o.objetivoId, o.resultadoId]),
    ...sinais.riscosAltosSemMitigacao.map((r) => r.id),
  ]);
  const out: BriefingAcao[] = [];
  for (const acao of acoes) {
    if (acao.tipo === "dispensar") {
      out.push({ label: acao.label || "Mais tarde", tipo: "dispensar" });
      continue;
    }
    if (!acao.rota || !ROTAS_VALIDAS.has(acao.rota)) continue;
    if (acao.params?.id && !idsValidos.has(acao.params.id)) continue;
    out.push(acao);
  }
  if (!out.some((a) => a.tipo === "dispensar")) out.push({ label: "Mais tarde", tipo: "dispensar" });
  return out.slice(0, 3);
}

interface ResultadoGeracao {
  conteudo: BriefingConteudo;
  fonte: "ia" | "regra";
  duracaoMs: number;
  mensagem: string;
}

/**
 * Gera o briefing do dia para uma empresa. Devolve `null` se não há sinais
 * críticos (jornada concluída e zero alertas) ou se a empresa ainda não está
 * apta a receber briefing (jornada incompleta / perfil vazio).
 */
export async function gerarBriefingParaEmpresa(
  empresaId: string,
  opts: { allowAI?: boolean } = {}
): Promise<{ resultado: ResultadoGeracao; sinais: SinaisCriticos } | null> {
  const allowAI = opts.allowAI ?? true;
  const inicio = Date.now();

  const empresa = await storage.getEmpresa(empresaId);
  if (!empresa) return null;

  // Empresa precisa ter concluído a jornada para receber briefing — caso contrário
  // o assistente segue em modo "guia" no frontend.
  try {
    const concluida = await isJornadaConcluida(empresaId);
    if (!concluida) return null;
  } catch {
    return null;
  }

  const sinais = await detectarSinaisCriticos(empresaId);
  if (sinais.total === 0) return null;

  if (!allowAI || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    const conteudo = montarBriefingDeterministico(sinais);
    return {
      resultado: { conteudo, fonte: "regra", duracaoMs: Date.now() - inicio, mensagem: "IA desabilitada — fallback determinístico" },
      sinais,
    };
  }

  // Briefing de ontem (para evitar repetição literal)
  const hoje = dataDeHojeSP();
  const ontem = diaAnterior(hoje);
  let briefingOntemTexto = "(sem briefing anterior registrado)";
  try {
    const ontemRow = await storage.getBriefingDiario(empresaId, ontem);
    if (ontemRow) {
      const parsed = briefingConteudoSchema.safeParse(ontemRow.conteudo);
      if (parsed.success) {
        briefingOntemTexto = parsed.data.corpo.slice(0, 1200);
      } else if (typeof ontemRow.conteudo === "string") {
        briefingOntemTexto = (ontemRow.conteudo as string).slice(0, 1200);
      }
    }
  } catch {
    /* ignorar */
  }

  // Tendências simples
  const tendencias = await tendenciaKpisVermelhos(sinais);

  // Memória do assistente: ações já propostas/confirmadas/ignoradas nos últimos 7 dias.
  let acoesRecentesTxt = "";
  try {
    acoesRecentesTxt = await buildAcoesRecentesContextoIA(empresaId, { sinceDays: 7 });
  } catch {
    /* ignorar — memória é best-effort */
  }

  // Task #189 — plano agêntico ativo (compartilhado da empresa) entra no
  // contexto do briefing para que o texto referencie o plano em vez de propor
  // ações soltas que duplicariam passos já planejados.
  let planoAtivoTxt = "";
  try {
    planoAtivoTxt = await buildPlanoAtivoContextoIA(empresaId, null);
  } catch {
    /* best-effort */
  }

  const prompt = montarPromptIA({ empresa, sinais, briefingOntemTexto, tendencias, acoesRecentesTxt, planoAtivoTxt });

  try {
    const completion = await openai.chat.completions.create({
      model: getModelForPlan(empresa.planoTipo, "padrao"),
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const json = JSON.parse(raw);
    const parsed = briefingConteudoSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Saída IA inválida: ${parsed.error.message.slice(0, 200)}`);
    }
    const conteudo: BriefingConteudo = {
      ...parsed.data,
      acoes: sanitizarAcoes(parsed.data.acoes, sinais),
    };
    return {
      resultado: { conteudo, fonte: "ia", duracaoMs: Date.now() - inicio, mensagem: "OK" },
      sinais,
    };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.warn(`[BRIEFING] IA falhou para empresa ${empresaId} — caindo em regra: ${msg}`);
    const conteudo = montarBriefingDeterministico(sinais);
    return {
      resultado: { conteudo, fonte: "regra", duracaoMs: Date.now() - inicio, mensagem: `Fallback IA: ${msg.slice(0, 200)}` },
      sinais,
    };
  }
}

function montarPromptIA(args: {
  empresa: Empresa;
  sinais: SinaisCriticos;
  briefingOntemTexto: string;
  tendencias: Array<{ id: string; nome: string; tendencia: string }>;
  acoesRecentesTxt?: string;
  planoAtivoTxt?: string;
}): { system: string; user: string } {
  const { empresa, sinais, briefingOntemTexto, tendencias, acoesRecentesTxt = "", planoAtivoTxt = "" } = args;
  const perfil = buildEmpresaContextoIA(empresa, { includeDocument: false });

  const system = `Você é um consultor sênior de gestão estratégica falando diretamente com o dono ou CEO de uma PME brasileira. Seu papel é redigir um BRIEFING DIÁRIO curto, priorizado e acionável, em português do Brasil, no tom de um sócio experiente — direto, calmo, sem jargão e sem floreio.

REGRAS DE FORMATO (obrigatórias):
- Máximo 3 parágrafos curtos, escritos em markdown leve (negritos pontuais, sem listas numeradas longas).
- 1 PRIORIDADE PRINCIPAL com a "história": fato + provável causa + recomendação concreta.
- Até 2 OBSERVAÇÕES SECUNDÁRIAS (frases curtas, opcionais).
- Sempre sugira o PRÓXIMO PASSO concreto da prioridade principal.
- Use APENAS números, nomes e IDs que aparecem nos dados fornecidos. Não invente métricas.
- Compare brevemente com o briefing de ontem: se a situação está igual, reconheça isso (ex.: "mesmo cenário de ontem"); se mudou, explicite.
- Para cada KPI crítico, os dados já trazem TENDÊNCIA (série recente em "tendencia.ultimasLeituras" e classificação em "tendencia.tendencia") e ITENS VINCULADOS ("iniciativasVinculadas", "krsVinculados"). Use isso para narrar fato + provável causa (ex.: "esse KPI vem caindo desde X e a iniciativa Y, que ataca esse mesmo indicador, está atrasada há Zd"). Não invente relações que não apareçam no JSON. Se "tendencia.tendencia" for "sem_dados", reconheça a falta de leituras em vez de inventar.
- Considere as AÇÕES RECENTES DO ASSISTENTE: se algo já foi proposto e CONFIRMADO/EXECUTADO, NÃO repita como se fosse novo — reconheça o avanço (ex.: "a iniciativa criada ontem está em andamento"). Se algo foi IGNORADO, evite ressuscitar a mesma sugestão. Se há proposta PENDENTE de confirmação, lembre-a brevemente.
- Se houver PLANO AGÊNTICO ATIVO, ancore o briefing nele: cite o objetivo do plano, o passo atual e o próximo passo pendente — em vez de propor ações soltas que dupliquem passos já planejados.

SAÍDA: responda APENAS com um objeto JSON válido (sem markdown ao redor) com este formato:
{
  "corpo": "<texto markdown final do briefing — saudação curta + prioridade principal + observações>",
  "prioridade": { "titulo": "<frase curta da prioridade>", "tom": "positivo|neutro|atencao|critico" },
  "acoes": [ { "label": "<até 30 chars>", "tipo": "criar|editar|abrir|dispensar", "rota": "/iniciativas|/okrs|/indicadores|/riscos|/estrategias|/oportunidades-crescimento|/meu-painel|/dashboard", "params": { "id": "<id real dos sinais, opcional>" } } ],
  "observacoes": [ "<até 2 frases curtas>" ]
}

REGRAS DE AÇÕES:
- Máximo 3 ações no total. Inclua sempre uma ação tipo "dispensar" com label "Mais tarde".
- Cada ação não-dispensar deve apontar para uma rota da lista acima.
- Use "params.id" SOMENTE com IDs reais que aparecem nos sinais. Se não tiver ID confiável, omita params.
- Prefira 1 botão "abrir" ou "editar" ligado à prioridade principal.`;

  const sinaisJson = JSON.stringify({
    kpisVermelhos: sinais.kpisVermelhos,
    kpisAmarelos: sinais.kpisAmarelos ?? [],
    iniciativasAtrasadas: sinais.iniciativasAtrasadas,
    okrsParados: sinais.okrsParados,
    riscosAltosSemMitigacao: sinais.riscosAltosSemMitigacao,
    total: sinais.total,
  }, null, 2);

  const tendenciasJson = JSON.stringify(tendencias, null, 2);

  const user = `## Perfil da empresa
${perfil}

## Sinais críticos detectados HOJE (determinísticos, números e IDs reais)
${sinaisJson}

## Tendência dos KPIs vermelhos nos últimos 7 dias
${tendenciasJson}

## Briefing de ontem (para evitar repetição literal)
${briefingOntemTexto}

${planoAtivoTxt ? planoAtivoTxt + "\n\n" : ""}${acoesRecentesTxt ? acoesRecentesTxt + "\n\n" : ""}Gere agora o briefing de hoje seguindo estritamente o formato JSON definido.`;

  return { system, user };
}

/**
 * Gera e persiste o briefing do dia para uma empresa.
 * Retorna o conteúdo persistido ou `null` se a empresa não recebeu briefing.
 */
export async function gerarEPersistirBriefing(
  empresaId: string,
  opts: { allowAI?: boolean } = {}
): Promise<{ conteudo: BriefingConteudo; fonte: "ia" | "regra"; sinais: SinaisCriticos } | null> {
  const hoje = dataDeHojeSP();
  const out = await gerarBriefingParaEmpresa(empresaId, opts);
  if (!out) {
    try {
      await storage.addBriefingDiarioLog({
        empresaId,
        data: hoje,
        executadoEm: new Date(),
        fonte: "pulado",
        duracaoMs: 0,
        resultado: "pulado",
        mensagem: "sem sinais críticos ou jornada incompleta",
      });
    } catch {
      /* ignorar */
    }
    return null;
  }
  const { resultado, sinais } = out;
  try {
    await storage.upsertBriefingDiario(empresaId, hoje, resultado.conteudo, resultado.fonte);
  } catch (err: any) {
    console.error(`[BRIEFING] Falha ao persistir briefing de ${empresaId}:`, err?.message ?? err);
  }
  try {
    await storage.addBriefingDiarioLog({
      empresaId,
      data: hoje,
      executadoEm: new Date(),
      fonte: resultado.fonte,
      duracaoMs: resultado.duracaoMs,
      resultado: "sucesso",
      mensagem: resultado.mensagem.slice(0, 500),
    });
  } catch {
    /* ignorar */
  }
  return { conteudo: resultado.conteudo, fonte: resultado.fonte, sinais };
}

/**
 * Roda o agendador diário: itera as empresas ativas, gera (ou pula) o briefing
 * de cada uma e purga briefings antigos no final.
 */
export async function runBriefingDiarioScheduler(): Promise<{ total: number; gerados: number; pulados: number; falhas: number }> {
  const inicio = Date.now();
  const todas = await storage.getAllEmpresas();
  // Apenas empresas ativas (trial vigente, ativa ou em processo de conversão)
  // recebem briefing — empresas canceladas/expiradas/inativas são puladas para
  // economizar custo de IA e seguir a regra "para cada empresa ativa".
  const STATUS_ATIVOS = new Set(["trial", "ativa", "ativo", "active", "trialing", "pendente_pagamento"]);
  const empresas = todas.filter((e) => STATUS_ATIVOS.has((e.planoStatus ?? "").toLowerCase()));
  let gerados = 0;
  let pulados = 0;
  let falhas = 0;

  console.log(`[BRIEFING_SCHED] Iniciando geração diária para ${empresas.length} empresa(s) ativa(s) (${todas.length} total)...`);
  for (const empresa of empresas) {
    try {
      const r = await gerarEPersistirBriefing(empresa.id);
      if (r) {
        gerados++;
        console.log(`[BRIEFING_SCHED] ${empresa.nome} (${empresa.id}) → ${r.fonte}`);
      } else {
        pulados++;
      }
    } catch (err: any) {
      falhas++;
      console.error(`[BRIEFING_SCHED] Erro empresa ${empresa.id}:`, err?.message ?? err);
      try {
        await storage.addBriefingDiarioLog({
          empresaId: empresa.id,
          data: dataDeHojeSP(),
          executadoEm: new Date(),
          fonte: "regra",
          duracaoMs: 0,
          resultado: "erro",
          mensagem: (err?.message ?? String(err)).slice(0, 500),
        });
      } catch {
        /* ignorar */
      }
    }
    // Espaçamento curto entre empresas para não estourar rate-limit da OpenAI.
    await new Promise((r) => setTimeout(r, 750));
  }

  try {
    const removidos = await storage.purgeBriefingsAntigos(7);
    if (removidos > 0) console.log(`[BRIEFING_SCHED] Purga: ${removidos} briefing(s) com mais de 7 dias removido(s).`);
  } catch (err: any) {
    console.error(`[BRIEFING_SCHED] Falha na purga:`, err?.message ?? err);
  }

  const dur = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(`[BRIEFING_SCHED] Fim em ${dur}s — total=${empresas.length}, gerados=${gerados}, pulados=${pulados}, falhas=${falhas}`);
  return { total: empresas.length, gerados, pulados, falhas };
}

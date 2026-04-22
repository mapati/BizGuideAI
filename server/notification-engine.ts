import { storage } from "./storage";
import { sendAlertEmail, getEmailDiagnostics, type EmailDiagnostics } from "./email";
import type { Indicador, Iniciativa, Objetivo, ResultadoChave } from "@shared/schema";

export type EngineSkipReason =
  | "config_ausente"
  | "remetente_invalido"
  | "dominio_nao_verificado"
  | "frequencia_nao_atingida"
  | "sem_condicao"
  | "deduplicado"
  | "erro_provedor"
  | "domingo_apenas";

export interface EngineReport {
  iniciadoEm: string;
  finalizadoEm: string;
  enviados: number;
  pulados: Record<EngineSkipReason, number>;
  detalhes: Array<{
    usuarioId: string;
    email: string;
    tipoAlerta: string;
    alvoId?: string;
    resultado: "enviado" | "pulado" | "erro";
    motivo?: string;
  }>;
  configuracao: EmailDiagnostics;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function frequencyDedupeMs(freq: string): number {
  switch (freq) {
    // "imediato": evita repetir mais de uma vez por hora (cadência do scheduler)
    case "imediato": return 60 * 60 * 1000;
    case "diario":   return DAY_MS;
    case "semanal":  return 7 * DAY_MS;
    default:         return DAY_MS;
  }
}

function parsePrazo(prazo: string | null | undefined): Date | null {
  if (!prazo) return null;
  const d = new Date(prazo);
  if (!isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY
  const m = String(prazo).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const dt = new Date(`${m[3]}-${m[2]}-${m[1]}`);
    if (!isNaN(dt.getTime())) return dt;
  }
  return null;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface AvaliacaoCtx {
  empresaId: string;
  indicadores: Indicador[];
  iniciativas: Iniciativa[];
  resultadosComObjetivo: Array<{ objetivo: Objetivo; resultado: ResultadoChave }>;
}

export interface SinaisCriticos {
  kpisVermelhos: Array<{ id: string; nome: string; perspectiva: string; atual: string; meta: string }>;
  iniciativasAtrasadas: Array<{ id: string; titulo: string; prazo: string; diasAtraso: number; responsavel: string }>;
  okrsParados: Array<{ objetivoId: string; resultadoId: string; metrica: string; objetivo: string; diasParado: number }>;
  riscosAltosSemMitigacao: Array<{ id: string; descricao: string; categoria: string; score: number }>;
  total: number;
}

export async function detectarSinaisCriticos(empresaId: string): Promise<SinaisCriticos> {
  const ctx = await carregarContextoEmpresa(empresaId);
  let riscos: Array<{ id: string; descricao: string; categoria: string; probabilidade: number; impacto: number; status: string; planoMitigacao: string | null }> = [];
  try {
    riscos = (await storage.getRiscos(empresaId)) as typeof riscos;
  } catch {
    riscos = [];
  }

  const kpisVermelhos = ctx.indicadores
    .filter((i) => i.status === "vermelho")
    .map((i) => ({ id: i.id, nome: i.nome, perspectiva: i.perspectiva, atual: i.atual, meta: i.meta }));

  const agoraTs = Date.now();
  const iniciativasAtrasadas = ctx.iniciativas
    .filter((i) => i.status !== "concluida" && i.status !== "pausada")
    .map((i) => {
      const prazo = parsePrazo(i.prazo);
      if (!prazo) return null;
      const fimDoDia = new Date(prazo);
      fimDoDia.setHours(23, 59, 59, 999);
      if (fimDoDia.getTime() >= agoraTs) return null;
      const diasAtraso = Math.floor((agoraTs - fimDoDia.getTime()) / DAY_MS);
      return { id: i.id, titulo: i.titulo, prazo: i.prazo, diasAtraso, responsavel: i.responsavel };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const limite = Date.now() - 14 * DAY_MS;
  const okrsParados = ctx.resultadosComObjetivo
    .map(({ objetivo, resultado }) => {
      const ts = new Date(resultado.atualizadoEm ?? resultado.createdAt).getTime();
      if (ts >= limite) return null;
      const diasParado = Math.floor((Date.now() - ts) / DAY_MS);
      return {
        objetivoId: objetivo.id,
        resultadoId: resultado.id,
        metrica: resultado.metrica,
        objetivo: objetivo.titulo,
        diasParado,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const riscosAltosSemMitigacao = riscos
    .filter((r) => r.status !== "eliminado" && r.status !== "aceito")
    .map((r) => ({
      id: r.id,
      descricao: r.descricao,
      categoria: r.categoria,
      score: Number(r.probabilidade ?? 0) * Number(r.impacto ?? 0),
      semPlano: !r.planoMitigacao || r.planoMitigacao.trim().length === 0,
    }))
    .filter((r) => r.score >= 12 && r.semPlano)
    .map(({ id, descricao, categoria, score }) => ({ id, descricao, categoria, score }));

  return {
    kpisVermelhos,
    iniciativasAtrasadas,
    okrsParados,
    riscosAltosSemMitigacao,
    total: kpisVermelhos.length + iniciativasAtrasadas.length + okrsParados.length + riscosAltosSemMitigacao.length,
  };
}

async function carregarContextoEmpresa(empresaId: string): Promise<AvaliacaoCtx> {
  const [indicadores, iniciativas, objetivos] = await Promise.all([
    // Task #216 — usar apenas indicadores de acompanhamento (BSC). Diagnóstico
    // inicial não deve disparar sinais críticos no briefing/resumo semanal.
    storage.getIndicadoresAcompanhamento(empresaId),
    storage.getIniciativas(empresaId),
    storage.getObjetivos(empresaId),
  ]);
  const krsArr = await Promise.all(
    objetivos
      .filter((o) => !o.encerrado)
      .map(async (o) => {
        const krs = await storage.getResultadosChave(o.id, empresaId);
        return krs.map((r) => ({ objetivo: o, resultado: r }));
      })
  );
  return {
    empresaId,
    indicadores,
    iniciativas,
    resultadosComObjetivo: krsArr.flat(),
  };
}

export async function runNotificationEngine(opts?: { trigger?: "manual" | "agendado"; force?: boolean }): Promise<EngineReport> {
  const trigger = opts?.trigger ?? "agendado";
  const force = opts?.force ?? false;
  const iniciadoEm = new Date();
  const report: EngineReport = {
    iniciadoEm: iniciadoEm.toISOString(),
    finalizadoEm: "",
    enviados: 0,
    pulados: {
      config_ausente: 0,
      remetente_invalido: 0,
      dominio_nao_verificado: 0,
      frequencia_nao_atingida: 0,
      sem_condicao: 0,
      deduplicado: 0,
      erro_provedor: 0,
      domingo_apenas: 0,
    },
    detalhes: [],
    configuracao: getEmailDiagnostics(),
  };

  console.log(`[NOTIF_ENGINE] Iniciando (${trigger}) — RESEND_API_KEY=${report.configuracao.resendApiKey}, EMAIL_FROM=${report.configuracao.emailFrom} (válido=${report.configuracao.emailFromValido})`);

  try {
    const configsAtivas = await storage.getAllConfiguracoesNotificacaoAtivas();
    if (configsAtivas.length === 0) {
      console.log(`[NOTIF_ENGINE] Nenhuma preferência ativa.`);
      report.finalizadoEm = new Date().toISOString();
      return report;
    }

    // group by usuarioId
    const porUsuario = new Map<string, typeof configsAtivas>();
    for (const c of configsAtivas) {
      const arr = porUsuario.get(c.usuarioId) ?? [];
      arr.push(c);
      porUsuario.set(c.usuarioId, arr);
    }

    // cache de contexto por empresa
    const ctxCache = new Map<string, AvaliacaoCtx>();

    for (const [usuarioId, confs] of Array.from(porUsuario.entries())) {
      const usuario = await storage.getUsuarioById(usuarioId);
      if (!usuario || !usuario.email || !usuario.empresaId) continue;
      let ctx = ctxCache.get(usuario.empresaId);
      if (!ctx) {
        try {
          ctx = await carregarContextoEmpresa(usuario.empresaId);
          ctxCache.set(usuario.empresaId, ctx);
        } catch (e: any) {
          console.error(`[NOTIF_ENGINE] Erro carregando contexto da empresa ${usuario.empresaId}:`, e?.message ?? e);
          continue;
        }
      }

      for (const conf of confs) {
        try {
          await processarConfig(conf, usuario, ctx, report, force);
        } catch (e: any) {
          report.pulados.erro_provedor++;
          report.detalhes.push({ usuarioId, email: usuario.email, tipoAlerta: conf.tipoAlerta, resultado: "erro", motivo: e?.message ?? String(e) });
          console.error(`[NOTIF_ENGINE] Erro processando ${usuarioId}/${conf.tipoAlerta}:`, e?.message ?? e);
        }
      }
    }
  } catch (e: any) {
    console.error(`[NOTIF_ENGINE] Falha geral:`, e?.message ?? e);
  }

  report.finalizadoEm = new Date().toISOString();
  console.log(`[NOTIF_ENGINE] Fim — enviados=${report.enviados}, pulados=${JSON.stringify(report.pulados)}`);
  return report;
}

async function processarConfig(
  conf: { id: string; usuarioId: string; tipoAlerta: string; frequencia: string; ultimoEnvio: Date | null },
  usuario: { id: string; email: string; nome: string },
  ctx: AvaliacaoCtx,
  report: EngineReport,
  force: boolean
): Promise<void> {
  const { tipoAlerta, frequencia } = conf;
  const agora = new Date();

  // Se o provedor de e-mail não está configurado/inválido, pular antes de tentar enviar.
  const cfg = report.configuracao;
  if (!cfg.resendApiKey) {
    report.pulados.config_ausente++;
    report.detalhes.push({
      usuarioId: usuario.id, email: usuario.email, tipoAlerta,
      resultado: "pulado", motivo: "RESEND_API_KEY ausente — configure o provedor de e-mail",
    });
    return;
  }
  if (!cfg.emailFromValido) {
    report.pulados.remetente_invalido++;
    report.detalhes.push({
      usuarioId: usuario.id, email: usuario.email, tipoAlerta,
      resultado: "pulado", motivo: `EMAIL_FROM inválido (${cfg.emailFrom})`,
    });
    return;
  }
  if (!cfg.emailFromConfigured) {
    // Está rodando com o fallback noreply@bizguideai.org — registramos só como aviso uma vez por execução.
    if (report.detalhes.length === 0) {
      console.warn(`[NOTIF_ENGINE] EMAIL_FROM não definido — usando fallback ${cfg.emailFrom}.`);
    }
  }

  // Resumo semanal: só aos domingos (a menos que forçado), 1x/semana
  if (tipoAlerta === "resumo_semanal") {
    const isDomingo = agora.getDay() === 0;
    if (!isDomingo && !force) {
      report.pulados.domingo_apenas++;
      report.detalhes.push({ usuarioId: usuario.id, email: usuario.email, tipoAlerta, resultado: "pulado", motivo: "Aguardando domingo" });
      return;
    }
    if (conf.ultimoEnvio && agora.getTime() - new Date(conf.ultimoEnvio).getTime() < 6 * DAY_MS && !force) {
      report.pulados.deduplicado++;
      report.detalhes.push({ usuarioId: usuario.id, email: usuario.email, tipoAlerta, resultado: "pulado", motivo: "Já enviado nesta semana" });
      return;
    }
    await enviarResumoSemanal(usuario, ctx, conf, report);
    return;
  }

  // Para alertas por item, montar a lista de alvos correspondentes
  const alvos = identificarAlvos(tipoAlerta, ctx);
  if (alvos.length === 0) {
    report.pulados.sem_condicao++;
    report.detalhes.push({ usuarioId: usuario.id, email: usuario.email, tipoAlerta, resultado: "pulado", motivo: "Nenhum item em condição de alerta" });
    return;
  }

  const dedupeMs = frequencyDedupeMs(frequencia);

  for (const alvo of alvos) {
    const ultimo = await storage.getUltimoEnvioAlvo(usuario.id, tipoAlerta, alvo.id);
    if (!force && ultimo && agora.getTime() - new Date(ultimo).getTime() < dedupeMs) {
      report.pulados.deduplicado++;
      report.detalhes.push({ usuarioId: usuario.id, email: usuario.email, tipoAlerta, alvoId: alvo.id, resultado: "pulado", motivo: `Deduplicado (${frequencia})` });
      continue;
    }
    const html = montarHtmlAlerta(tipoAlerta, alvo, usuario.nome);
    const resultado = await sendAlertEmail(usuario.email, alvo.assunto, html);
    if (resultado.ok) {
      await storage.registrarEnvio(usuario.id, tipoAlerta, alvo.id);
      await storage.updateUltimoEnvio(conf.id);
      report.enviados++;
      report.detalhes.push({ usuarioId: usuario.id, email: usuario.email, tipoAlerta, alvoId: alvo.id, resultado: "enviado" });
    } else {
      const cat = resultado.errorCategory ?? "provedor";
      const bucket: EngineSkipReason =
        cat === "config_ausente" ? "config_ausente" :
        cat === "remetente_invalido" ? "remetente_invalido" :
        cat === "dominio_nao_verificado" ? "dominio_nao_verificado" :
        "erro_provedor";
      report.pulados[bucket]++;
      report.detalhes.push({ usuarioId: usuario.id, email: usuario.email, tipoAlerta, alvoId: alvo.id, resultado: "erro", motivo: resultado.errorMessage });
    }
  }
}

interface AlvoAlerta {
  id: string;
  titulo: string;
  detalhe: string;
  assunto: string;
  ctaUrl: string;
  ctaLabel: string;
}

function appUrl(path: string): string {
  const base = (process.env.APP_URL || "https://bizguideai.org").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function identificarAlvos(tipoAlerta: string, ctx: AvaliacaoCtx): AlvoAlerta[] {
  const alvos: AlvoAlerta[] = [];

  if (tipoAlerta === "kpi_vermelho") {
    for (const i of ctx.indicadores) {
      if (i.status === "vermelho") {
        alvos.push({
          id: i.id,
          titulo: i.nome,
          detalhe: `Indicador "${i.nome}" (${i.perspectiva}) está em estado vermelho. Atual: ${i.atual} | Meta: ${i.meta}`,
          assunto: `🔴 Indicador crítico — ${i.nome}`,
          ctaUrl: appUrl("/indicadores"),
          ctaLabel: "Ver Indicadores",
        });
      }
    }
  } else if (tipoAlerta === "kpi_amarelo") {
    for (const i of ctx.indicadores) {
      if (i.status === "amarelo") {
        alvos.push({
          id: i.id,
          titulo: i.nome,
          detalhe: `Indicador "${i.nome}" (${i.perspectiva}) está em atenção. Atual: ${i.atual} | Meta: ${i.meta}`,
          assunto: `🟡 Indicador em atenção — ${i.nome}`,
          ctaUrl: appUrl("/indicadores"),
          ctaLabel: "Ver Indicadores",
        });
      }
    }
  } else if (tipoAlerta === "iniciativa_atrasada") {
    const agoraTs = Date.now();
    for (const ini of ctx.iniciativas) {
      if (ini.status === "concluida" || ini.status === "pausada") continue;
      const prazo = parsePrazo(ini.prazo);
      if (!prazo) continue;
      // Considera atrasada apenas após o fim do dia do prazo (evita marcar atrasada às 00:00 do próprio dia).
      const fimDoDia = new Date(prazo); fimDoDia.setHours(23, 59, 59, 999);
      if (fimDoDia.getTime() < agoraTs) {
        const diasAtraso = Math.floor((agoraTs - fimDoDia.getTime()) / DAY_MS);
        alvos.push({
          id: ini.id,
          titulo: ini.titulo,
          detalhe: `Iniciativa "${ini.titulo}" está atrasada há ${diasAtraso} dia(s). Prazo: ${ini.prazo} | Responsável: ${ini.responsavel}`,
          assunto: `⏰ Iniciativa atrasada — ${ini.titulo}`,
          ctaUrl: appUrl(`/iniciativas?highlight=${ini.id}`),
          ctaLabel: "Abrir Iniciativa",
        });
      }
    }
  } else if (tipoAlerta === "okr_sem_atualizacao") {
    const limite = Date.now() - 14 * DAY_MS;
    for (const { objetivo, resultado } of ctx.resultadosComObjetivo) {
      const ts = new Date(resultado.atualizadoEm ?? resultado.createdAt).getTime();
      if (ts < limite) {
        const diasParado = Math.floor((Date.now() - ts) / DAY_MS);
        alvos.push({
          id: resultado.id,
          titulo: resultado.metrica,
          detalhe: `Meta "${resultado.metrica}" do OKR "${objetivo.titulo}" não é atualizada há ${diasParado} dia(s). Valor atual: ${resultado.valorAtual} de ${resultado.valorAlvo}.`,
          assunto: `📊 Meta sem atualização — ${resultado.metrica}`,
          ctaUrl: appUrl(`/okrs?highlight=${objetivo.id}`),
          ctaLabel: "Atualizar Meta",
        });
      }
    }
  }

  return alvos;
}

function montarHtmlAlerta(tipoAlerta: string, alvo: AlvoAlerta, nome: string): string {
  const titulo = alvo.assunto.replace(/^[^\w]+/, "").trim();
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1d4ed8;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">BizGuideAI</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">${escHtml(titulo)}</h2>
          <p style="margin:0 0 8px;color:#374151;font-size:15px;">Olá, ${escHtml(nome)}!</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">${escHtml(alvo.detalhe)}</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="background:#1d4ed8;border-radius:6px;">
            <a href="${alvo.ctaUrl}" style="display:inline-block;padding:12px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">${escHtml(alvo.ctaLabel)}</a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">Você está recebendo este alerta porque a opção "${escHtml(tipoAlerta)}" está ativa em suas preferências.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">&copy; ${new Date().getFullYear()} BizGuideAI</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function enviarResumoSemanal(
  usuario: { id: string; email: string; nome: string },
  ctx: AvaliacaoCtx,
  conf: { id: string },
  report: EngineReport
): Promise<void> {
  const kpisVermelhos = ctx.indicadores.filter((i) => i.status === "vermelho");
  const kpisAmarelos = ctx.indicadores.filter((i) => i.status === "amarelo");
  const hoje = new Date();
  const iniciativasAtrasadas = ctx.iniciativas.filter((i) => {
    if (i.status === "concluida" || i.status === "pausada") return false;
    const p = parsePrazo(i.prazo);
    return p && p < hoje;
  });
  const limite = Date.now() - 14 * DAY_MS;
  const okrsParados = ctx.resultadosComObjetivo.filter(({ resultado }) => {
    const ts = new Date(resultado.atualizadoEm ?? resultado.createdAt).getTime();
    return ts < limite;
  });

  const html = montarHtmlResumoSemanal(usuario.nome, kpisVermelhos, kpisAmarelos, iniciativasAtrasadas, okrsParados);
  const resultado = await sendAlertEmail(usuario.email, "Resumo semanal do seu plano — BizGuideAI", html);
  if (resultado.ok) {
    await storage.registrarEnvio(usuario.id, "resumo_semanal", "");
    await storage.updateUltimoEnvio(conf.id);
    report.enviados++;
    report.detalhes.push({ usuarioId: usuario.id, email: usuario.email, tipoAlerta: "resumo_semanal", resultado: "enviado" });
  } else {
    const cat = resultado.errorCategory ?? "provedor";
    const bucket: EngineSkipReason =
      cat === "config_ausente" ? "config_ausente" :
      cat === "remetente_invalido" ? "remetente_invalido" :
      cat === "dominio_nao_verificado" ? "dominio_nao_verificado" :
      "erro_provedor";
    report.pulados[bucket]++;
    report.detalhes.push({ usuarioId: usuario.id, email: usuario.email, tipoAlerta: "resumo_semanal", resultado: "erro", motivo: resultado.errorMessage });
  }
}

function montarHtmlResumoSemanal(
  nome: string,
  kpisV: Indicador[],
  kpisA: Indicador[],
  iniciativasAtras: Iniciativa[],
  okrsParados: Array<{ objetivo: Objetivo; resultado: ResultadoChave }>
): string {
  const linkPainel = appUrl("/");
  const sec = (titulo: string, items: string[]) =>
    items.length === 0 ? "" : `
      <h3 style="margin:24px 0 8px;color:#111827;font-size:16px;">${escHtml(titulo)} (${items.length})</h3>
      <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.7;">
        ${items.slice(0, 10).map((s) => `<li>${escHtml(s)}</li>`).join("")}
      </ul>`;

  const tudoOk = kpisV.length === 0 && kpisA.length === 0 && iniciativasAtras.length === 0 && okrsParados.length === 0;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1d4ed8;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">BizGuideAI — Resumo Semanal</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#374151;font-size:15px;">Olá, ${escHtml(nome)}!</p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;">Aqui está a foto geral do seu plano estratégico desta semana.</p>
          ${tudoOk ? `<p style="margin:24px 0;color:#059669;font-size:15px;">✅ Tudo dentro do esperado. Nenhum item exige atenção imediata.</p>` : ""}
          ${sec("Indicadores em estado crítico (vermelho)", kpisV.map((i) => `${i.nome} — atual ${i.atual} / meta ${i.meta}`))}
          ${sec("Indicadores em atenção (amarelo)", kpisA.map((i) => `${i.nome} — atual ${i.atual} / meta ${i.meta}`))}
          ${sec("Iniciativas atrasadas", iniciativasAtras.map((i) => `${i.titulo} — prazo ${i.prazo} (${i.responsavel})`))}
          ${sec("Metas sem atualização há 14+ dias", okrsParados.map(({ objetivo, resultado }) => `${resultado.metrica} (OKR: ${objetivo.titulo})`))}
          <table cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="background:#1d4ed8;border-radius:6px;">
            <a href="${linkPainel}" style="display:inline-block;padding:12px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">Abrir o Painel</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">&copy; ${new Date().getFullYear()} BizGuideAI</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

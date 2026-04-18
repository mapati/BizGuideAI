import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { criarAssinatura, buscarAssinatura, cancelarAssinatura, buscarPagamento, motivoLegivel, validarAssinaturaWebhook, PLANOS_MP, type PlanoTipo, type MpSubscription, type MpPayment } from "./mp";
import { randomBytes, createHash } from "crypto";
import cron from "node-cron";
import { 
  insertEmpresaSchema,
  PLAN_LIMITS,
  type InsertEmpresa,
  type Empresa,
  insertFatorPestelSchema, 
  insertAnaliseSwotSchema,
  insertObjetivoSchema,
  insertResultadoChaveSchema,
  insertIndicadorSchema,
  insertRetrospectivaSchema,
  insertCenarioSchema,
  insertRiscoSchema,
  insertBscRelacaoSchema,
  insertCompartilhamentoSchema,
  insertConfiguracaoNotificacaoSchema,
  insertCincoForcasSchema,
  insertModeloNegocioSchema,
  insertEstrategiaSchema,
  insertOportunidadeCrescimentoSchema,
  insertIniciativaSchema,
  insertRitualSchema,
  insertEventoSchema,
  insertFaturaSchema,
  type FatorPestel,
  type AnaliseSwot,
  type Objetivo,
  type ResultadoChave,
  type Indicador,
  type CincoForcas,
  type ModeloNegocio,
  type Estrategia,
  type Iniciativa,
  type Fatura,
} from "@shared/schema";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import { promises as dnsLookup } from "dns";
import bcrypt from "bcryptjs";
import { z } from "zod";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import "./session.d";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos PDF são aceitos."));
    }
  },
});

function buildEmpresaContextoIA(empresa: Empresa, options?: { includeDocument?: boolean }): string {
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

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Serper.dev search helper — replaces the previous Google Custom Search integration.
// Requires SERPER_API_KEY. Returns an empty array if the key is missing,
// so all callers get a graceful fallback without web search.
interface SerperSearchItem { title: string; snippet: string; link: string }
interface SerperNewsItem  { title: string; source: string; date: string; link: string }

async function serperSearch(query: string, numResults = 8): Promise<SerperSearchItem[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  // Increment counter on every outbound attempt (before res.ok check) so
  // failed requests that still reach Serper's servers are counted accurately.
  storage.incrementSearchUsage().catch(() => {});
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: numResults, gl: "br", hl: "pt", tbs: "qdr:m" }),
    });
    if (!res.ok) {
      console.warn(`[serperSearch] HTTP ${res.status} para query: ${query}`);
      return [];
    }
    const data = await res.json() as { organic?: Array<{ title?: string; snippet?: string; link?: string }> };
    return (data.organic ?? []).map((it) => ({
      title:   it.title   ?? "",
      snippet: it.snippet ?? "",
      link:    it.link    ?? "",
    }));
  } catch (err) {
    console.warn("[serperSearch] Erro:", err);
    return [];
  }
}

// Serper.dev NEWS search — returns real news titles, no LLM involved.
// Used by pulse_manchetes to source verified headlines directly from publishers.
async function serperNewsSearch(query: string, numResults = 10): Promise<SerperNewsItem[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  storage.incrementSearchUsage().catch(() => {});
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: numResults, gl: "br", hl: "pt" }),
    });
    if (!res.ok) {
      console.warn(`[serperNewsSearch] HTTP ${res.status} para query: ${query}`);
      return [];
    }
    const data = await res.json() as {
      news?: Array<{ title?: string; source?: string; date?: string; link?: string }>;
    };
    return (data.news ?? []).map((it) => ({
      title:  it.title  ?? "",
      source: it.source ?? "",
      date:   it.date   ?? "",
      link:   it.link   ?? "",
    }));
  } catch (err) {
    console.warn("[serperNewsSearch] Erro:", err);
    return [];
  }
}

// Format Serper search results as a readable context block for LLM prompts
function formatSearchContext(items: SerperSearchItem[]): string {
  if (!items.length) return "";
  const dataGeracao = new Date().toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const lines = items.map((it, i) =>
    `${i + 1}. "${it.title}" (${it.link})\n   ${it.snippet}`
  );
  return `[DADOS RECENTES DA INTERNET — gerados em ${dataGeracao} — use como contexto factual nas suas análises]\n\n${lines.join("\n\n")}\n\n[FIM DOS DADOS DA INTERNET]`;
}

/* ── Contexto Macro IA — cache 60s ── */
let _macroCtxCache: { text: string; expiry: number } | null = null;

/* ── Contexto Macro — scheduler execution log (persisted in DB) ── */

async function buildContextoMacroIA(): Promise<string> {
  const now = Date.now();
  if (_macroCtxCache && now < _macroCtxCache.expiry) return _macroCtxCache.text;
  try {
    const ativos = await storage.getContextoMacroAtivos();
    if (!ativos.length) {
      _macroCtxCache = { text: "", expiry: now + 60_000 };
      return "";
    }
    const linhas = ativos.map((c) => {
      const dataStr = c.ultimaAtualizacao
        ? new Date(c.ultimaAtualizacao).toLocaleDateString("pt-BR")
        : "sem data";
      return `### ${c.titulo} (atualizado em ${dataStr})\n${c.textoAtivo}`;
    }).join("\n\n");
    const text = `\n\n## Cenário Macroeconômico Atual\n\n${linhas}`;
    _macroCtxCache = { text, expiry: now + 60_000 };
    return text;
  } catch {
    return "";
  }
}

/* Typed helper — injects macro context into a messages array */
async function injectMacroCtx(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
  const macroCtx = await buildContextoMacroIA();
  if (!macroCtx) return messages;
  return messages.map((msg) => {
    if (msg.role === "system" && typeof msg.content === "string") {
      return { ...msg, content: msg.content + macroCtx };
    }
    return msg;
  });
}

function isPrivateIp(ip: string): boolean {
  // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const check = mapped ? mapped[1] : ip;

  if (check === "::1" || check === "0:0:0:0:0:0:0:1") return true; // IPv6 loopback
  if (/^127\./.test(check)) return true; // IPv4 loopback (127/8)
  if (/^10\./.test(check)) return true; // RFC1918 10/8
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(check)) return true; // RFC1918 172.16/12
  if (/^192\.168\./.test(check)) return true; // RFC1918 192.168/16
  if (/^169\.254\./.test(check)) return true; // Link-local (AWS metadata, etc.)
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(check)) return true; // CGNAT 100.64/10
  if (check === "0.0.0.0" || /^0\./.test(check)) return true; // This network
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(check)) return true; // ULA (fc00::/7)
  if (/^fe80:/i.test(check)) return true; // IPv6 link-local
  return false;
}

async function ssrfSafeFetch(rawUrl: string): Promise<string> {
  // Validate and check initial hostname via DNS before fetching
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Protocolo não permitido: apenas http/https.");
  }

  let initialAddr: string;
  try {
    const result = await dnsLookup.lookup(parsed.hostname);
    initialAddr = result.address;
  } catch {
    throw new Error("Não foi possível resolver o domínio do website.");
  }

  if (isPrivateIp(initialAddr)) {
    throw Object.assign(new Error("SSRF_BLOCKED"), { code: "SSRF_BLOCKED" });
  }

  // Fetch with automatic redirect following (undici/Node.js native fetch
  // returns opaque responses for redirect:"manual", so we use "follow" and
  // validate the final destination URL afterwards to catch redirect-based SSRF)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(rawUrl, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
      },
    });
  } finally {
    clearTimeout(timer);
  }

  // Validate the final URL (after any redirects) to block redirect-based SSRF
  const finalUrl = response.url || rawUrl;
  if (finalUrl !== rawUrl) {
    let finalParsed: URL;
    try {
      finalParsed = new URL(finalUrl);
    } catch {
      throw new Error("URL de destino final inválida.");
    }
    if (finalParsed.protocol !== "http:" && finalParsed.protocol !== "https:") {
      throw Object.assign(new Error("SSRF_BLOCKED"), { code: "SSRF_BLOCKED" });
    }
    try {
      const finalResult = await dnsLookup.lookup(finalParsed.hostname);
      if (isPrivateIp(finalResult.address)) {
        throw Object.assign(new Error("SSRF_BLOCKED"), { code: "SSRF_BLOCKED" });
      }
    } catch (e: any) {
      if (e.code === "SSRF_BLOCKED") throw e;
      // If DNS fails for final URL but response was already received, continue
    }
  }

  if (!response.ok) {
    throw new Error(`O site retornou erro HTTP ${response.status}.`);
  }

  return await response.text();
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session?.userId || !req.session?.empresaId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const usuario = await storage.getUsuarioById(req.session.userId);
    if (!usuario) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (usuario.isAdmin) { next(); return; }

    const empresa = await storage.getEmpresa(req.session.empresaId);
    if (!empresa) {
      return res.status(401).json({ error: "Empresa não encontrada" });
    }

    const planoStatus = empresa.planoStatus;

    if (planoStatus === "pendente_pagamento") {
      const isPaymentRoute = req.path.startsWith("/api/pagamentos/");
      if (!isPaymentRoute) {
        return res.status(403).json({ error: "PENDENTE_PAGAMENTO" });
      }
      next(); return;
    }

    if (planoStatus === "expirado" || planoStatus === "suspenso") {
      return res.status(403).json({ error: "TRIAL_EXPIRADO" });
    }

    if (planoStatus === "trial") {
      const trialStart = empresa.trialStartedAt || empresa.createdAt;
      const daysSinceStart = Math.floor((Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceStart >= 7) {
        return res.status(403).json({ error: "TRIAL_EXPIRADO" });
      }
    }

    next();
  } catch (error: any) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

function stripTenantFields<T extends Record<string, unknown>>(data: T): Omit<T, "empresaId" | "objetivoId"> {
  const result = { ...data };
  delete (result as Record<string, unknown>)["empresaId"];
  delete (result as Record<string, unknown>)["objetivoId"];
  return result as Omit<T, "empresaId" | "objetivoId">;
}

function computeTrialInfo(empresa: { planoStatus: string; trialStartedAt: Date | null; createdAt: Date }) {
  const planoStatus = empresa.planoStatus;
  if (planoStatus === "ativo") {
    return { planoStatus, diasRestantes: null, trialExpirado: false };
  }
  if (planoStatus === "pendente_pagamento") {
    return { planoStatus, diasRestantes: null, trialExpirado: false };
  }
  if (planoStatus === "expirado" || planoStatus === "suspenso") {
    return { planoStatus, diasRestantes: 0, trialExpirado: true };
  }
  const trialStart = empresa.trialStartedAt || empresa.createdAt;
  const daysSinceStart = Math.floor((Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.max(0, 7 - daysSinceStart);
  const trialExpirado = daysSinceStart >= 7;
  return { planoStatus, diasRestantes, trialExpirado };
}

/* ── Modelos de IA — carregados do banco na inicialização, atualizados ao vivo via PATCH /api/admin/config-ia ── */
const AI_MODELS: Record<string, string> = {
  start_padrao:      "",
  start_relatorios:  "",
  start_busca:       "",
  pro_padrao:        "",
  pro_relatorios:    "",
  pro_busca:         "",
};

async function loadModelConfig() {
  // Throws if DB row missing — startup migration (server/index.ts) guarantees the row exists
  const cfg = await storage.getConfiguracoesIA();
  AI_MODELS.start_padrao      = cfg.modeloPadraoStart;
  AI_MODELS.start_relatorios  = cfg.modeloRelatoriosStart;
  AI_MODELS.start_busca       = cfg.modeloBuscaStart;
  AI_MODELS.pro_padrao        = cfg.modeloPadraoProEnt;
  AI_MODELS.pro_relatorios    = cfg.modeloRelatoriosProEnt;
  AI_MODELS.pro_busca         = cfg.modeloBuscaProEnt;
}

function getPlanLimits(planoTipo: string | null | undefined) {
  const tipo = (planoTipo ?? "start") as keyof typeof PLAN_LIMITS;
  return PLAN_LIMITS[tipo] ?? PLAN_LIMITS.start;
}

function getModelForPlan(planoTipo: string | null | undefined, tier: "padrao" | "relatorios" | "busca"): string {
  const isPro = planoTipo === "pro" || planoTipo === "enterprise";
  const prefix = isPro ? "pro" : "start";
  const raw = AI_MODELS[`${prefix}_${tier}`] || AI_MODELS["start_padrao"] || "";
  // Defensive: *-search-preview models are Chat-Completions-only and cause a 404 in the
  // Responses API used by web search. If a stale config still has them, auto-map to a
  // compatible model so the request never fails because of bad legacy data.
  if (tier === "busca") {
    if (raw === "gpt-4o-search-preview") return "gpt-4o";
    if (raw === "gpt-4o-mini-search-preview") return isPro ? "gpt-4o" : "gpt-4o-mini";
  }
  return raw;
}

export async function registerRoutes(app: Express): Promise<Server> {
  await loadModelConfig();

  // ==================== AUTH ====================

  const registerSchema = z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    senha: z.string().min(8).regex(/\d/, "A senha deve conter pelo menos um número"),
    nomeEmpresa: z.string().min(1),
    setor: z.string().min(1),
    tamanho: z.string().min(1),
    descricao: z.string().optional(),
    cnpj: z.string().optional(),
    endereco: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    cep: z.string().optional(),
    nomeResponsavel: z.string().optional(),
    emailResponsavel: z.string().email().optional().or(z.literal("")),
    telefoneResponsavel: z.string().optional(),
    termsAccepted: z.boolean().optional(),
    plano: z.enum(["start", "pro"]).optional(),
  });

  function generateSecureToken(): string {
    return randomBytes(32).toString("hex");
  }

  function hashToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MINUTES = 15;

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existing = await storage.getUsuarioByEmail(data.email);
      if (existing) {
        return res.status(409).json({ error: "E-mail já cadastrado" });
      }

      const isPaidPlan = data.plano === "start" || data.plano === "pro";
      const now = new Date();

      const empresa = await storage.createEmpresa({
        nome: data.nomeEmpresa,
        setor: data.setor,
        tamanho: data.tamanho,
        descricao: data.descricao,
        cnpj: data.cnpj,
        endereco: data.endereco,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep,
        nomeResponsavel: data.nomeResponsavel,
        emailResponsavel: data.emailResponsavel || null,
        telefoneResponsavel: data.telefoneResponsavel,
        termoAceitoEm: data.termsAccepted ? now : undefined,
        planoStatus: isPaidPlan ? "pendente_pagamento" : "trial",
        planoTipo: isPaidPlan ? data.plano : undefined,
        trialStartedAt: now,
      });

      const senhaHash = await bcrypt.hash(data.senha, 10);
      const usuario = await storage.createUsuario({
        empresaId: empresa.id,
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        isAdmin: false,
        role: "admin",
        emailVerificado: false,
        loginAttempts: 0,
      });

      // Marca o registrante como proprietário da empresa (task #53)
      await storage.setEmpresaProprietario(empresa.id, usuario.id);

      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createEmailVerificationToken(usuario.id, hashToken(token), expiresAt);

      // Send verification email async (non-blocking for both flows)
      sendVerificationEmail(usuario.email, usuario.nome, token, data.plano).catch((emailErr) => {
        console.error("[EMAIL] Falha ao enviar e-mail de verificação:", emailErr);
      });

      // For paid plans: create MP subscription immediately and return checkout URL
      if (isPaidPlan) {
        try {
          const baseUrl = process.env.REPLIT_DOMAINS
            ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
            : "http://localhost:5000";

          const result = await criarAssinatura({
            planoTipo: data.plano as PlanoTipo,
            payerEmail: usuario.email,
            externalReference: empresa.id,
            successUrl: `${baseUrl}/pagamento/sucesso`,
            notificationUrl: `${baseUrl}/api/pagamentos/webhook`,
          });

          if (result.id) {
            await storage.updateEmpresaPlano(empresa.id, {
              mpSubscriptionId: result.id,
              mpSubscriptionStatus: "pending",
            });
          }

          const checkoutUrl = result.init_point || result.sandbox_init_point;
          if (!checkoutUrl) throw new Error("URL de checkout não disponível");

          return res.status(201).json({ checkoutUrl, planoTipo: data.plano });
        } catch (mpErr: any) {
          console.error("[MP] Erro ao criar assinatura no registro:", mpErr.message);
          // MP failed — return without checkoutUrl; frontend will redirect to /assinar
          return res.status(201).json({
            checkoutUrl: null,
            planoTipo: data.plano,
            message: "Conta criada. Complete o pagamento para ativar seu plano.",
          });
        }
      }

      // Trial flow: redirect to email verification
      res.status(202).json({ message: "Conta criada. Verifique seu e-mail para continuar." });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = req.query.token as string;
      const plano = req.query.plano as string | undefined;
      const planoSuffix = plano === "start" || plano === "pro" ? `&plano=${plano}` : "";

      if (!token) return res.redirect("/verify-email?error=token_invalido");

      const record = await storage.getEmailVerificationToken(hashToken(token));
      if (!record) return res.redirect("/verify-email?error=token_invalido");
      if (record.usedAt) return res.redirect(`/login?verified=1${planoSuffix}`);
      if (new Date() > record.expiresAt) return res.redirect("/verify-email?error=token_expirado");

      await storage.markEmailVerificationTokenUsed(record.id);
      await storage.updateUsuarioEmailVerificado(record.usuarioId, true);

      res.redirect(`/login?verified=1${planoSuffix}`);
    } catch (error: any) {
      res.redirect("/verify-email?error=erro_interno");
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "E-mail obrigatório" });

      const usuario = await storage.getUsuarioByEmail(email);
      if (!usuario) {
        return res.json({ message: "Se o e-mail estiver cadastrado, você receberá o link em breve." });
      }

      if (usuario.emailVerificado) {
        return res.json({ message: "Se o e-mail estiver cadastrado, você receberá o link em breve." });
      }

      const lastToken = await storage.getLastVerificationTokenByUserId(usuario.id);
      if (lastToken && !lastToken.usedAt) {
        const secondsSinceLast = (Date.now() - lastToken.createdAt.getTime()) / 1000;
        if (secondsSinceLast < 60) {
          return res.status(429).json({ error: "Aguarde 1 minuto antes de reenviar." });
        }
      }

      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createEmailVerificationToken(usuario.id, hashToken(token), expiresAt);

      try {
        await sendVerificationEmail(usuario.email, usuario.nome, token);
      } catch (emailErr) {
        console.error("[EMAIL] Falha ao reenviar e-mail de verificação:", emailErr);
      }

      res.json({ message: "Se o e-mail estiver cadastrado, você receberá o link em breve." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "E-mail obrigatório" });

      const usuario = await storage.getUsuarioByEmail(email);
      if (!usuario) {
        return res.json({ message: "Se o e-mail estiver cadastrado, você receberá o link em breve." });
      }

      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await storage.createPasswordResetToken(usuario.id, hashToken(token), expiresAt);

      try {
        await sendPasswordResetEmail(usuario.email, usuario.nome, token);
      } catch (emailErr) {
        console.error("[EMAIL] Falha ao enviar e-mail de reset:", emailErr);
      }

      res.json({ message: "Se o e-mail estiver cadastrado, você receberá o link em breve." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const schema = z.object({
        token: z.string().min(1),
        novaSenha: z.string().min(8).regex(/\d/, "A senha deve conter pelo menos um número"),
      });
      const data = schema.parse(req.body);

      const record = await storage.getPasswordResetToken(hashToken(data.token));
      if (!record) return res.status(400).json({ error: "Link inválido ou expirado." });
      if (record.usedAt) return res.status(400).json({ error: "Este link já foi utilizado." });
      if (new Date() > record.expiresAt) return res.status(400).json({ error: "Link expirado. Solicite um novo." });

      await storage.markPasswordResetTokenUsed(record.id);
      const senhaHash = await bcrypt.hash(data.novaSenha, 10);
      await storage.updateUsuarioSenha(record.usuarioId, senhaHash);

      res.json({ message: "Senha redefinida com sucesso." });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        senha: z.string().min(1),
      });
      const data = schema.parse(req.body);

      const usuario = await storage.getUsuarioByEmail(data.email);
      if (!usuario) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      if (usuario.lockedUntil && new Date() < usuario.lockedUntil) {
        const minutosRestantes = Math.ceil((usuario.lockedUntil.getTime() - Date.now()) / 60000);
        return res.status(403).json({
          error: `Conta bloqueada por tentativas excessivas. Tente novamente em ${minutosRestantes} minuto(s).`,
          code: "CONTA_BLOQUEADA",
          lockedUntil: usuario.lockedUntil,
        });
      }

      const lockoutExpirou = usuario.lockedUntil && new Date() >= usuario.lockedUntil;
      const tentativasAtuais = lockoutExpirou ? 0 : (usuario.loginAttempts ?? 0);
      if (lockoutExpirou) {
        await storage.updateUsuarioLoginAttempts(usuario.id, 0, null);
      }

      const senhaCorreta = await bcrypt.compare(data.senha, usuario.senha);
      if (!senhaCorreta) {
        const newAttempts = tentativasAtuais + 1;
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          await storage.updateUsuarioLoginAttempts(usuario.id, newAttempts, lockedUntil);
          return res.status(403).json({
            error: `Conta bloqueada por ${LOCKOUT_MINUTES} minutos após ${MAX_LOGIN_ATTEMPTS} tentativas incorretas.`,
            code: "CONTA_BLOQUEADA",
            lockedUntil,
          });
        } else {
          await storage.updateUsuarioLoginAttempts(usuario.id, newAttempts);
          const tentativasRestantes = MAX_LOGIN_ATTEMPTS - newAttempts;
          return res.status(401).json({
            error: `Credenciais inválidas. ${tentativasRestantes} tentativa(s) restante(s) antes do bloqueio.`,
          });
        }
      }

      // Fetch empresa before email check so we can check planoStatus
      const empresa = await storage.getEmpresa(usuario.empresaId);
      const planoStatusLogin = empresa?.planoStatus;

      // Skip email verification for 'ativo' users (payment = validation)
      if (!usuario.emailVerificado && planoStatusLogin !== "ativo") {
        return res.status(403).json({
          error: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
          code: "EMAIL_NAO_VERIFICADO",
          email: usuario.email,
        });
      }

      if ((usuario.loginAttempts ?? 0) > 0) {
        await storage.updateUsuarioLoginAttempts(usuario.id, 0, null);
      }

      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      req.session.userId = usuario.id;
      req.session.empresaId = usuario.empresaId;

      const loginPlanoLimits = empresa ? getPlanLimits(empresa.planoTipo) : PLAN_LIMITS.start;
      res.json({
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, empresaId: usuario.empresaId, isAdmin: usuario.isAdmin, role: usuario.role, createdAt: usuario.createdAt },
        empresa,
        trialInfo: empresa ? computeTrialInfo(empresa) : null,
        planoInfo: {
          planoTipo: empresa?.planoTipo ?? "start",
          maxUsuarios: loginPlanoLimits.maxUsuarios === Infinity ? null : loginPlanoLimits.maxUsuarios,
          aiTier: loginPlanoLimits.aiTier,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/auth/senha", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      const { senhaAtual, novaSenha } = req.body;
      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
      }
      if (novaSenha.length < 8 || !/\d/.test(novaSenha)) {
        return res.status(400).json({ error: "A nova senha deve ter pelo menos 8 caracteres e um número" });
      }
      const usuario = await storage.getUsuarioById(req.session.userId);
      if (!usuario) {
        return res.status(401).json({ error: "Usuário não encontrado" });
      }
      const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaCorreta) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }
      const senhaHash = await bcrypt.hash(novaSenha, 10);
      await storage.updateUsuarioSenha(usuario.id, senhaHash);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao encerrar sessão" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId || !req.session?.empresaId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const usuario = await storage.getUsuarioById(req.session.userId);
      if (!usuario) {
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const empresa = await storage.getEmpresa(req.session.empresaId);

      const planoLimits = empresa ? getPlanLimits(empresa.planoTipo) : PLAN_LIMITS.start;
      res.json({
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, empresaId: usuario.empresaId, isAdmin: usuario.isAdmin, role: usuario.role, createdAt: usuario.createdAt, introBoasVindasDismissed: usuario.introBoasVindasDismissed },
        empresa,
        trialInfo: empresa ? computeTrialInfo(empresa) : null,
        planoInfo: {
          planoTipo: empresa?.planoTipo ?? "start",
          maxUsuarios: planoLimits.maxUsuarios === Infinity ? null : planoLimits.maxUsuarios,
          aiTier: planoLimits.aiTier,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/auth/preferencias", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      const schema = z.object({
        introBoasVindasDismissed: z.boolean().optional(),
      }).refine((d) => Object.keys(d).length > 0, { message: "Nenhuma preferência informada" });
      const data = schema.parse(req.body);
      await storage.updateUsuarioPreferencias(req.session.userId, data);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== ADMIN ====================

  async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      const usuario = await storage.getUsuarioById(req.session.userId);
      if (!usuario) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      if (!usuario.isAdmin) {
        return res.status(403).json({ error: "Acesso negado. Área restrita a administradores." });
      }
      next();
    } catch (error: any) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  app.use("/api/admin", requireAdmin);

  app.get("/api/admin/usuarios", async (req, res) => {
    try {
      const usuarios = await storage.getAllUsuarios();
      const result = usuarios.map(u => {
        const planoStatus = u.empresa?.planoStatus ?? "trial";
        const trialStart = u.empresa?.trialStartedAt ?? u.empresa?.createdAt ?? u.createdAt;
        const daysSinceStart = Math.floor((Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
        const diasRestantes = planoStatus === "trial" ? Math.max(0, 7 - daysSinceStart) : null;
        const trialExpirado = planoStatus === "trial" && daysSinceStart >= 7;
        return {
          id: u.id,
          nome: u.nome,
          email: u.email,
          empresaId: u.empresaId,
          empresaNome: u.empresa?.nome ?? "-",
          planoStatus: trialExpirado ? "expirado" : planoStatus,
          diasRestantes,
          isAdmin: u.isAdmin,
          role: u.role,
          createdAt: u.createdAt,
        };
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/empresas", async (req, res) => {
    try {
      const empresasData = await storage.getAllEmpresas();
      const result = empresasData.map(e => {
        const trialStart = e.trialStartedAt ?? e.createdAt;
        const daysSinceStart = Math.floor((Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
        const diasRestantes = e.planoStatus === "trial" ? Math.max(0, 7 - daysSinceStart) : null;
        const trialExpirado = e.planoStatus === "trial" && daysSinceStart >= 7;
        return {
          id: e.id,
          nome: e.nome,
          setor: e.setor,
          tamanho: e.tamanho,
          planoStatus: trialExpirado ? "expirado" : e.planoStatus,
          planoTipo: e.planoTipo ?? null,
          diasRestantes,
          totalUsuarios: e.totalUsuarios,
          userCount: e.totalUsuarios,
          trialStartedAt: e.trialStartedAt,
          planoAtivadoEm: e.planoAtivadoEm,
          createdAt: e.createdAt,
        };
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/empresas/:id/ativar-plano", async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        planoTipo: z.enum(["start", "pro", "enterprise"]).default("start"),
      });
      const { planoTipo } = schema.parse(req.body);
      const empresa = await storage.updateEmpresaPlano(id, { planoStatus: "ativo", planoAtivadoEm: new Date(), planoTipo });
      res.json({ success: true, planoStatus: empresa.planoStatus, planoTipo: empresa.planoTipo });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Força uma reconciliação do status da assinatura direto no Mercado Pago.
  // Útil quando o webhook não chegou mas o pagamento foi confirmado.
  app.post("/api/admin/empresas/:id/sincronizar-mp", async (req, res) => {
    try {
      const { id } = req.params;
      const empresa = await storage.getEmpresa(id);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
      if (!empresa.mpSubscriptionId) {
        return res.status(400).json({ error: "Empresa não possui assinatura no Mercado Pago" });
      }

      let subscription: MpSubscription | null = null;
      try {
        subscription = (await buscarAssinatura(empresa.mpSubscriptionId)) as MpSubscription;
      } catch (err) {
        return res.status(502).json({
          error: "Falha ao consultar Mercado Pago",
          detalhe: (err as Error)?.message ?? String(err),
        });
      }

      const mpStatus = subscription?.status ?? null;
      const statusDetail = subscription?.status_detail ?? null;
      const reason = (subscription?.reason ?? "").toLowerCase();
      const planoTipo = reason.includes("pro") ? "pro" : "start";

      let empresaAtualizada = empresa;
      if (mpStatus === "authorized") {
        empresaAtualizada = await storage.updateEmpresaPlano(empresa.id, {
          planoStatus: "ativo",
          planoTipo,
          planoAtivadoEm: empresa.planoAtivadoEm ?? new Date(),
          mpSubscriptionStatus: mpStatus,
        });
      } else if (mpStatus === "cancelled" || mpStatus === "paused") {
        empresaAtualizada = await storage.updateEmpresaPlano(empresa.id, {
          planoStatus: "suspenso",
          mpSubscriptionStatus: mpStatus,
        });
      } else {
        empresaAtualizada = await storage.updateEmpresaPlano(empresa.id, {
          mpSubscriptionStatus: mpStatus ?? "pending",
        });
      }

      // Auditoria da sincronização manual
      await storage.createPagamentoEvento({
        empresaId: empresa.id,
        tipo: "sync_manual",
        acao: "admin_sync",
        mpResourceId: empresa.mpSubscriptionId,
        status: mpStatus,
        statusDetail,
        payload: JSON.stringify(subscription ?? {}).slice(0, 10000),
      }).catch(() => {});

      res.json({
        success: true,
        mpStatus,
        statusDetail,
        planoStatus: empresaAtualizada.planoStatus,
        planoTipo: empresaAtualizada.planoTipo,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/admin/empresas/:id/suspender", async (req, res) => {
    try {
      const { id } = req.params;
      const empresa = await storage.updateEmpresaPlano(id, { planoStatus: "suspenso" });
      res.json({ success: true, planoStatus: empresa.planoStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/empresas/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const empresa = await storage.getEmpresa(id);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
      await storage.deleteEmpresa(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[ADMIN] Erro ao deletar empresa:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/usuarios/:id/ativar-plano", async (req, res) => {
    try {
      const { id } = req.params;
      const usuario = await storage.getUsuarioById(id);
      if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });
      const empresa = await storage.updateEmpresaPlano(usuario.empresaId, { planoStatus: "ativo", planoAtivadoEm: new Date() });
      res.json({ success: true, planoStatus: empresa.planoStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/usuarios/:id/suspender", async (req, res) => {
    try {
      const { id } = req.params;
      const usuario = await storage.getUsuarioById(id);
      if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });
      const empresa = await storage.updateEmpresaPlano(usuario.empresaId, { planoStatus: "suspenso" });
      res.json({ success: true, planoStatus: empresa.planoStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/faturas", async (req, res) => {
    try {
      const faturas = await storage.getAllFaturas();
      res.json(faturas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/faturas", async (req, res) => {
    try {
      const body = {
        ...req.body,
        dataVencimento: req.body.dataVencimento ? new Date(req.body.dataVencimento) : undefined,
        dataPagamento: req.body.dataPagamento ? new Date(req.body.dataPagamento) : undefined,
      };
      const data = insertFaturaSchema.parse(body);
      const fatura = await storage.createFatura(data);
      res.json(fatura);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/admin/faturas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        status: z.enum(["pendente", "pago", "cancelado"]).optional(),
        dataPagamento: z.string().optional().nullable(),
      });
      const data = schema.parse(req.body);
      const updateData: Partial<Pick<Fatura, "status" | "dataPagamento">> = {};
      if (data.status) updateData.status = data.status;
      if (data.dataPagamento !== undefined) {
        updateData.dataPagamento = data.dataPagamento ? new Date(data.dataPagamento) : null;
      }
      const fatura = await storage.updateFatura(id, updateData);
      res.json(fatura);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/resumo", async (req, res) => {
    try {
      const empresasData = await storage.getEmpresasComContagem();
      const faturas = await storage.getAllFaturas();
      const now = Date.now();
      const comStatus = empresasData.map(e => {
        const trialStart = e.trialStartedAt ?? e.createdAt;
        const days = Math.floor((now - trialStart.getTime()) / (1000 * 60 * 60 * 24));
        const trialExpirado = e.planoStatus === "trial" && days >= 7;
        return { ...e, planoStatus: trialExpirado ? "expirado" : e.planoStatus };
      });

      const countStart = comStatus.filter(e => e.planoStatus === "ativo" && e.planoTipo === "start").length;
      const countPro = comStatus.filter(e => e.planoStatus === "ativo" && e.planoTipo === "pro").length;
      const countEnterprise = comStatus.filter(e => e.planoStatus === "ativo" && e.planoTipo === "enterprise").length;

      const receitaTotal = faturas.filter(f => f.status === "pago").reduce((acc, f) => acc + parseFloat(f.valor), 0);

      res.json({
        empresas: {
          total: comStatus.length,
          trial: comStatus.filter(e => e.planoStatus === "trial").length,
          expirado: comStatus.filter(e => e.planoStatus === "expirado").length,
          ativo: comStatus.filter(e => e.planoStatus === "ativo").length,
          suspenso: comStatus.filter(e => e.planoStatus === "suspenso").length,
        },
        mrr: {
          start: { count: countStart, total: countStart * 187 },
          pro: { count: countPro, total: countPro * 490 },
          enterprise: { count: countEnterprise, total: null },
        },
        mrrTotal: countStart * 187 + countPro * 490,
        faturas: {
          total: faturas.length,
          pendentes: faturas.filter(f => f.status === "pendente").length,
          pagas: faturas.filter(f => f.status === "pago").length,
          receitaTotal,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/config-ia", async (req, res) => {
    try {
      const config = await storage.getConfiguracoesIA();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Returns Serper.dev web search status and this month's call count (max 2500 free/month).
  // Count is persisted in DB (google_search_usage table) and survives server restarts.
  // Never exposes key values — booleans and numeric counts only.
  app.get("/api/admin/ai-status", async (_req, res) => {
    let searchUsageMes = 0;
    try {
      searchUsageMes = await storage.getSearchUsageThisMonth();
    } catch (err) {
      console.warn("[ai-status] Não foi possível ler contagem do Serper Search:", err);
    }
    res.json({
      webSearchAtivo: !!process.env.SERPER_API_KEY,
      searchUsageMes,
    });
  });

  app.patch("/api/admin/config-ia", async (req, res) => {
    try {
      // *-search-preview models are Chat-Completions-only and break the Responses API
      // (used for web search). Reject them on every busca field, regardless of the
      // client version sending the payload (prevents stale browsers from re-introducing
      // the broken value into the database).
      const buscaModel = z.string().min(1).refine(
        (v) => v !== "gpt-4o-search-preview" && v !== "gpt-4o-mini-search-preview",
        { message: "Modelo *-search-preview não é compatível com a Responses API. Use gpt-4o, gpt-4o-mini, gpt-4.1 ou gpt-4.1-mini." }
      );
      const schema = z.object({
        modeloPadrao:           z.string().min(1).optional(),
        modeloRelatorios:       z.string().min(1).optional(),
        modeloBusca:            buscaModel.optional(),
        modeloPadraoStart:      z.string().min(1).optional(),
        modeloRelatoriosStart:  z.string().min(1).optional(),
        modeloBuscaStart:       buscaModel.optional(),
        modeloPadraoProEnt:     z.string().min(1).optional(),
        modeloRelatoriosProEnt: z.string().min(1).optional(),
        modeloBuscaProEnt:      buscaModel.optional(),
      });
      const data = schema.parse(req.body);
      const config = await storage.upsertConfiguracoesIA(data);
      if (data.modeloPadraoStart)      AI_MODELS.start_padrao      = data.modeloPadraoStart;
      if (data.modeloRelatoriosStart)  AI_MODELS.start_relatorios  = data.modeloRelatoriosStart;
      if (data.modeloBuscaStart)       AI_MODELS.start_busca       = data.modeloBuscaStart;
      if (data.modeloPadraoProEnt)     AI_MODELS.pro_padrao        = data.modeloPadraoProEnt;
      if (data.modeloRelatoriosProEnt) AI_MODELS.pro_relatorios    = data.modeloRelatoriosProEnt;
      if (data.modeloBuscaProEnt)      AI_MODELS.pro_busca         = data.modeloBuscaProEnt;
      res.json(config);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Dados fiscais do sistema (BizGuideAI) — público para leitura, admin para escrita
  app.get("/api/config-sistema", async (_req, res) => {
    try {
      const config = await storage.getConfigSistema();
      res.json(config ?? {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/config-sistema", async (req, res) => {
    try {
      const schema = z.object({
        razaoSocial: z.string().min(1).optional(),
        cnpj: z.string().min(1).optional(),
        endereco: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        cep: z.string().optional(),
        email: z.string().email().optional(),
      });
      const data = schema.parse(req.body);
      const config = await storage.upsertConfigSistema(data);
      res.json(config);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // All routes below require authentication
  app.use("/api/empresa", requireAuth);
  app.use("/api/fatores-pestel", requireAuth);
  app.use("/api/analise-swot", requireAuth);
  app.use("/api/objetivos", requireAuth);
  app.use("/api/resultados-chave", requireAuth);
  app.use("/api/indicadores", requireAuth);
  app.use("/api/cinco-forcas", requireAuth);
  app.use("/api/modelo-negocio", requireAuth);
  app.use("/api/estrategias", requireAuth);
  app.use("/api/oportunidades-crescimento", requireAuth);
  app.use("/api/iniciativas", requireAuth);
  app.use("/api/rituais", requireAuth);
  app.use("/api/eventos", requireAuth);
  app.use("/api/alertas", requireAuth);
  app.use("/api/ai", requireAuth);

  // ==================== EMPRESA ====================


  app.get("/api/membros", requireAuth, async (req, res) => {
    try {
      const membros = await storage.getUsuariosByEmpresaId(req.session.empresaId!);
      res.json(membros.map(m => ({ id: m.id, nome: m.nome, email: m.email })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/empresa", async (req, res) => {
    try {
      const empresa = await storage.getEmpresa(req.session.empresaId!);
      if (!empresa) return res.json(null);
      const souProprietario =
        !!empresa.proprietarioUsuarioId && empresa.proprietarioUsuarioId === req.session.userId;
      res.json({ ...empresa, souProprietario });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/empresa", async (req, res) => {
    try {
      const profileSchema = z.object({
        nome: z.string().optional(),
        setor: z.string().optional(),
        tamanho: z.string().optional(),
        descricao: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        cnpj: z.string().nullable().optional(),
        endereco: z.string().nullable().optional(),
        cidade: z.string().nullable().optional(),
        estado: z.string().nullable().optional(),
        cep: z.string().nullable().optional(),
        nomeResponsavel: z.string().nullable().optional(),
        emailResponsavel: z.string().nullable().optional(),
        telefoneResponsavel: z.string().nullable().optional(),
        termoAceitoEm: z.string().nullable().optional(),
        logoUrl: z.string().nullable().optional(),
        modeloNegocio: z.string().nullable().optional(),
        areaAtuacao: z.string().nullable().optional(),
        publicoAlvo: z.string().nullable().optional(),
        principaisProdutos: z.string().nullable().optional(),
        concorrentesConhecidos: z.string().nullable().optional(),
        diferenciaisCompetitivos: z.string().nullable().optional(),
        anoFundacao: z.number().int().nullable().optional(),
      });
      const parsed = profileSchema.parse(req.body);
      const safeData: Partial<InsertEmpresa> = {};
      const fields = [
        "nome","setor","tamanho","descricao","website","cnpj","endereco","cidade","estado","cep",
        "nomeResponsavel","emailResponsavel","telefoneResponsavel",
        "logoUrl","modeloNegocio","areaAtuacao","publicoAlvo","principaisProdutos","concorrentesConhecidos","diferenciaisCompetitivos","anoFundacao",
      ] as const;
      // Handle termoAceitoEm separately as it needs to be a Date
      if (parsed.termoAceitoEm && !(safeData as any).termoAceitoEm) {
        (safeData as any).termoAceitoEm = new Date(parsed.termoAceitoEm);
      }
      for (const field of fields) {
        if (parsed[field] !== undefined) (safeData as Record<string, unknown>)[field] = parsed[field];
      }
      const empresa = await storage.updateEmpresa(req.session.empresaId!, safeData);
      res.json(empresa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ── Upload e análise de documento PDF ──────────────────────────────────────
  app.post("/api/empresa/documento", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.session?.userId || !req.session?.empresaId) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
      }

      const MAX_TEXT_CHARS = 15000;
      let extractedText = "";
      try {
        const parser = new PDFParse({ data: req.file.buffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        extractedText = (pdfData.text || "").trim().slice(0, MAX_TEXT_CHARS);
      } catch (err) {
        console.error("[PDF parse error]", err);
        return res.status(422).json({ error: "Não foi possível extrair texto do PDF. Verifique se o arquivo não está protegido ou corrompido." });
      }

      if (extractedText.length < 100) {
        return res.status(422).json({ error: "O PDF não contém texto suficiente para análise. Certifique-se de que o documento não é composto apenas por imagens." });
      }

      const tamanhoKb = Math.round(req.file.size / 1024);
      const nomeArquivo = req.file.originalname;

      await storage.updateEmpresa(req.session.empresaId, {
        documentoNome: nomeArquivo,
        documentoTamanhoKb: tamanhoKb,
        documentoInterpretacao: extractedText,
        documentoAnalisadoEm: new Date(),
      });

      res.json({
        documentoNome: nomeArquivo,
        documentoTamanhoKb: tamanhoKb,
        documentoAnalisadoEm: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({ error: msg });
    }
  });

  app.delete("/api/empresa/documento", async (req, res) => {
    try {
      if (!req.session?.userId || !req.session?.empresaId) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      await storage.updateEmpresa(req.session.empresaId, {
        documentoNome: null,
        documentoTamanhoKb: null,
        documentoInterpretacao: null,
        documentoAnalisadoEm: null,
      });
      res.json({ success: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({ error: msg });
    }
  });

  // ==================== GERENCIAMENTO DE USUÁRIOS DA EMPRESA ====================

  async function requireCompanyAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      const usuario = await storage.getUsuarioById(req.session.userId);
      if (!usuario) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      if (usuario.role !== "admin" && !usuario.isAdmin) {
        return res.status(403).json({ error: "Apenas administradores da empresa podem gerenciar usuários." });
      }
      next();
    } catch (error: any) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  app.get("/api/empresa/usuarios", requireCompanyAdmin, async (req, res) => {
    try {
      const membros = await storage.getUsuariosByEmpresaId(req.session.empresaId!);
      res.json(membros.map(u => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/empresa/usuarios", requireCompanyAdmin, async (req, res) => {
    try {
      const schema = z.object({
        nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("E-mail inválido"),
        senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").regex(/\d/, "A senha deve conter pelo menos um número"),
        role: z.enum(["admin", "membro"]).default("membro"),
      });
      const data = schema.parse(req.body);

      const empresa = await storage.getEmpresa(req.session.empresaId!);
      const planoTipo = empresa?.planoTipo ?? "start";
      const limits = getPlanLimits(planoTipo);
      if (limits.maxUsuarios !== Infinity) {
        const count = await storage.countUsuariosByEmpresa(req.session.empresaId!);
        if (count >= limits.maxUsuarios) {
          return res.status(403).json({ error: `Limite de usuários do plano Start atingido. Faça upgrade para Pro para adicionar membros.` });
        }
      }

      const existing = await storage.getUsuarioByEmail(data.email);
      if (existing) {
        return res.status(409).json({ error: "E-mail já cadastrado" });
      }

      const senhaHash = await bcrypt.hash(data.senha, 10);
      const novoUsuario = await storage.createUsuario({
        empresaId: req.session.empresaId!,
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        isAdmin: false,
        role: data.role,
      });

      res.status(201).json({
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        role: novoUsuario.role,
        isAdmin: novoUsuario.isAdmin,
        createdAt: novoUsuario.createdAt,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/empresa/usuarios/:id", requireCompanyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const membros = await storage.getUsuariosByEmpresaId(req.session.empresaId!);
      const admins = membros.filter(u => u.role === "admin");
      const alvo = membros.find(u => u.id === id);

      if (!alvo) {
        return res.status(404).json({ error: "Usuário não encontrado nesta empresa." });
      }

      // Block removal if it would leave the company with no admins
      // (this covers self-removal when the user is the last admin)
      if (alvo.role === "admin" && admins.length <= 1) {
        return res.status(400).json({ error: "Não é possível remover o único administrador da empresa." });
      }

      await storage.deleteUsuario(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/empresa/usuarios/:id", requireCompanyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        nome: z.string().min(2).optional(),
        role: z.enum(["admin", "membro"]).optional(),
      });
      const data = schema.parse(req.body);

      const membros = await storage.getUsuariosByEmpresaId(req.session.empresaId!);
      const alvo = membros.find(u => u.id === id);
      if (!alvo) {
        return res.status(404).json({ error: "Usuário não encontrado nesta empresa." });
      }

      if (data.role === "membro" && alvo.role === "admin") {
        const admins = membros.filter(u => u.role === "admin");
        if (admins.length <= 1) {
          return res.status(400).json({ error: "Não é possível rebaixar o único administrador da empresa." });
        }
      }

      const updated = await storage.updateUsuario(id, data);
      res.json({
        id: updated.id,
        nome: updated.nome,
        email: updated.email,
        role: updated.role,
        isAdmin: updated.isAdmin,
        createdAt: updated.createdAt,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== FATORES PESTEL ====================

  app.get("/api/fatores-pestel", async (req, res) => {
    try {
      const fatores = await storage.getFatoresPestel(req.session.empresaId!);
      res.json(fatores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/fatores-pestel", async (req, res) => {
    try {
      const data = insertFatorPestelSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const fator = await storage.createFatorPestel(data);
      res.json(fator);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/fatores-pestel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertFatorPestelSchema.partial().parse(req.body));
      const fator = await storage.updateFatorPestel(id, req.session.empresaId!, data);
      res.json(fator);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/fatores-pestel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFatorPestel(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ANALISE SWOT ====================

  app.get("/api/analise-swot", async (req, res) => {
    try {
      const analises = await storage.getAnaliseSwot(req.session.empresaId!);
      res.json(analises);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analise-swot", async (req, res) => {
    try {
      const data = insertAnaliseSwotSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const analise = await storage.createAnaliseSwot(data);
      res.json(analise);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/analise-swot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertAnaliseSwotSchema.partial().parse(req.body));
      const analise = await storage.updateAnaliseSwot(id, req.session.empresaId!, data);
      res.json(analise);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/analise-swot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAnaliseSwot(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== OBJETIVOS ====================

  app.get("/api/objetivos", async (req, res) => {
    try {
      const objetivos = await storage.getObjetivos(req.session.empresaId!);
      res.json(objetivos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/objetivos", async (req, res) => {
    try {
      const data = insertObjetivoSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const objetivo = await storage.createObjetivo(data);
      res.json(objetivo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/objetivos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertObjetivoSchema.partial().parse(req.body));
      const objetivo = await storage.updateObjetivo(id, req.session.empresaId!, data);
      res.json(objetivo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/objetivos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteObjetivo(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== RESULTADOS CHAVE ====================

  app.get("/api/resultados-chave/:objetivoId", async (req, res) => {
    try {
      const { objetivoId } = req.params;
      const resultados = await storage.getResultadosChave(objetivoId, req.session.empresaId!);
      res.json(resultados);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/resultados-chave", async (req, res) => {
    try {
      const data = insertResultadoChaveSchema.parse(req.body);
      const resultado = await storage.createResultadoChave(data, req.session.empresaId!);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/resultados-chave/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertResultadoChaveSchema.partial().parse(req.body));
      const resultado = await storage.updateResultadoChave(id, req.session.empresaId!, data);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/resultados-chave/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteResultadoChave(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== INDICADORES ====================

  app.get("/api/indicadores", async (req, res) => {
    try {
      const indicadores = await storage.getIndicadores(req.session.empresaId!);
      res.json(indicadores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/indicadores", async (req, res) => {
    try {
      const data = insertIndicadorSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const indicador = await storage.createIndicador(data);
      res.json(indicador);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/indicadores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertIndicadorSchema.partial().parse(req.body));
      const indicador = await storage.updateIndicador(id, req.session.empresaId!, data);
      res.json(indicador);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/indicadores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIndicador(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/indicadores/:id/leituras", async (req, res) => {
    try {
      const { id } = req.params;
      const leituras = await storage.getLeituras(id);
      res.json(leituras);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/indicadores/:id/leituras", async (req, res) => {
    try {
      const { id } = req.params;
      const { valor, nota, registradoPor } = req.body;
      if (!valor) return res.status(400).json({ error: "valor é obrigatório" });
      const leitura = await storage.createLeitura({
        indicadorId: id,
        valor,
        nota: nota || null,
        registradoPor: registradoPor || null,
      });
      const numVal = parseFloat(String(valor).replace(/[^\d.,\-]/g, "").replace(",", "."));
      const indicador = await storage.getIndicador(id);
      if (indicador) {
        const numMeta = parseFloat(String(indicador.meta).replace(/[^\d.,\-]/g, "").replace(",", "."));
        let status = "verde";
        if (!isNaN(numVal) && !isNaN(numMeta) && numMeta !== 0) {
          const ratio = numVal / numMeta;
          if (ratio < 0.7) status = "vermelho";
          else if (ratio < 0.95) status = "amarelo";
        }
        await storage.updateIndicador(id, indicador.empresaId, { atual: valor, status });
      }
      res.json(leitura);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/indicadores/leituras/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLeitura(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CINCO FORCAS ====================

  app.get("/api/cinco-forcas", async (req, res) => {
    try {
      const forcas = await storage.getCincoForcas(req.session.empresaId!);
      res.json(forcas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cinco-forcas", async (req, res) => {
    try {
      const data = insertCincoForcasSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const forca = await storage.createCincoForcas(data);
      res.json(forca);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/cinco-forcas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertCincoForcasSchema.partial().parse(req.body));
      const forca = await storage.updateCincoForcas(id, req.session.empresaId!, data);
      res.json(forca);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/cinco-forcas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCincoForcas(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== MODELO NEGOCIO ====================

  app.get("/api/modelo-negocio", async (req, res) => {
    try {
      const blocos = await storage.getModeloNegocio(req.session.empresaId!);
      res.json(blocos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/modelo-negocio", async (req, res) => {
    try {
      const data = insertModeloNegocioSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const bloco = await storage.createModeloNegocio(data);
      res.json(bloco);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/modelo-negocio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertModeloNegocioSchema.partial().parse(req.body));
      const bloco = await storage.updateModeloNegocio(id, req.session.empresaId!, data);
      res.json(bloco);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/modelo-negocio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteModeloNegocio(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== AI ROUTES ====================

  // Research external scenario via web search for PESTEL analysis
  app.post("/api/ai/pesquisar-cenario-externo", async (req, res) => {
    interface CenarioDim {
      resumo: string;
      fontes: string[];
    }
    interface CenarioPESTEL {
      politico: CenarioDim;
      economico: CenarioDim;
      social: CenarioDim;
      tecnologico: CenarioDim;
      ambiental: CenarioDim;
      legal: CenarioDim;
      [key: string]: CenarioDim;
    }

    try {
      const { nomeEmpresa, setor, descricao } = req.body;
      if (!setor) return res.status(400).json({ error: "Setor é obrigatório" });

      // Enriquecer contexto com campos adicionais do perfil
      let contextoRico = "";
      if (req.session?.empresaId) {
        const empresaCompleta = await storage.getEmpresa(req.session.empresaId);
        if (empresaCompleta) {
          contextoRico = buildEmpresaContextoIA(empresaCompleta);
        }
      }

      // Build steering instructions based on empresa profile
      const empresaParaPestel = req.session?.empresaId ? await storage.getEmpresa(req.session.empresaId) : null;
      const steeringPestel: string[] = [];
      if (empresaParaPestel?.areaAtuacao) {
        steeringPestel.push(`FOCO GEOGRÁFICO: A empresa atua no recorte "${empresaParaPestel.areaAtuacao}". Priorize dados e tendências relevantes para este escopo geográfico.`);
      }
      if (empresaParaPestel?.modeloNegocio) {
        steeringPestel.push(`MODELO DE NEGÓCIO: "${empresaParaPestel.modeloNegocio}". Considere como cada fator PESTEL impacta especificamente este tipo de operação.`);
      }
      const steeringPestelStr = steeringPestel.length > 0 ? `\n\n━━━ DIRECIONAMENTO DA ANÁLISE ━━━\n${steeringPestel.join("\n")}` : "";

      const prompt = `Você é um analista estratégico especializado em cenário macroeconômico brasileiro. Pesquise notícias, relatórios e tendências RECENTES (últimos 6 a 12 meses) relevantes para uma empresa do setor de "${setor}" no Brasil.

${contextoRico || `Empresa: ${nomeEmpresa || "não informado"}\nSetor: ${setor}${descricao ? `\nDescrição: ${descricao}` : ""}`}
${steeringPestelStr}

Pesquise e resuma o contexto externo atual para CADA uma das 6 dimensões PESTEL, com foco no impacto para este setor no Brasil:

- POLÍTICO: Políticas governamentais, mudanças de governo, regulamentações em tramitação, instabilidade política
- ECONÔMICO: Taxa Selic, inflação (IPCA), variação cambial, PIB, crédito, poder de compra do consumidor
- SOCIAL: Mudanças de comportamento, tendências de consumo, dados demográficos, valores sociais emergentes
- TECNOLÓGICO: Inovações disruptivas, automação, inteligência artificial, transformação digital no setor
- AMBIENTAL: Legislação ambiental, metas ESG, mudanças climáticas, economia circular
- LEGAL: Novas leis, regulamentações setoriais, normas técnicas, decisões judiciais relevantes

Responda APENAS em JSON válido com exatamente este formato:
{
  "politico": { "resumo": "2-3 parágrafos com contexto atual e tendências", "fontes": ["site ou publicação 1", "site ou publicação 2"] },
  "economico": { "resumo": "...", "fontes": ["...", "..."] },
  "social": { "resumo": "...", "fontes": ["...", "..."] },
  "tecnologico": { "resumo": "...", "fontes": ["...", "..."] },
  "ambiental": { "resumo": "...", "fontes": ["...", "..."] },
  "legal": { "resumo": "...", "fontes": ["...", "..."] }
}`;

      const dims = ["politico", "economico", "social", "tecnologico", "ambiental", "legal"] as const;
      const emptyDim = (): CenarioDim => ({ resumo: "Informação não disponível.", fontes: [] });
      let cenario: CenarioPESTEL = {
        politico: emptyDim(),
        economico: emptyDim(),
        social: emptyDim(),
        tecnologico: emptyDim(),
        ambiental: emptyDim(),
        legal: emptyDim(),
      };

      try {
        // Step 1 — Serper.dev: fetch recent snippets about this sector
        const pestelQuery = `cenário externo ${setor || req.body.setor} Brasil 2025 regulação economia tendências mercado`;
        const searchItems = await serperSearch(pestelQuery, 8);
        const searchCtx = formatSearchContext(searchItems);

        // Step 2 — Azure LLM synthesises PESTEL from web snippets + company context
        const promptWithCtx = searchCtx ? `${searchCtx}\n\n${prompt}` : prompt;

        const webRes = await openai.chat.completions.create({
          model: getModelForPlan(empresaParaPestel?.planoTipo, "relatorios"),
          messages: await injectMacroCtx([
            {
              role: "system",
              content: "Você é um analista estratégico especializado em cenário macroeconômico brasileiro. Baseie sua análise nos dados recentes fornecidos, no cenário macroeconômico atual do system message (quando disponível) e no seu conhecimento do contexto brasileiro.",
            },
            { role: "user", content: promptWithCtx },
          ]),
          response_format: { type: "json_object" },
          temperature: 0.3,
        });

        const text: string = webRes.choices[0].message.content || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON não encontrado na resposta");
        const parsed: Record<string, unknown> = JSON.parse(jsonMatch[0]);

        for (const dim of dims) {
          const raw = parsed[dim];
          if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            const entry = raw as Record<string, unknown>;
            cenario[dim] = {
              resumo: typeof entry.resumo === "string" ? entry.resumo : emptyDim().resumo,
              fontes: Array.isArray(entry.fontes)
                ? (entry.fontes as unknown[]).filter((f): f is string => typeof f === "string")
                : [],
            };
          }
        }
      } catch (searchError: unknown) {
        // Fallback: use regular chat completion with knowledge-based analysis
        const msg = searchError instanceof Error ? searchError.message : String(searchError);
        console.warn("[PESTEL] busca Serper falhou, usando fallback:", msg);
        const fallback = await openai.chat.completions.create({
          model: getModelForPlan(empresaParaPestel?.planoTipo, "relatorios"),
          messages: await injectMacroCtx([
            {
              role: "system",
              content: "Você é um analista estratégico brasileiro especializado em cenário macroeconômico. Use o cenário macroeconômico atual do system message (quando disponível) e seu conhecimento mais atualizado possível sobre o Brasil.",
            },
            { role: "user", content: prompt },
          ]),
          response_format: { type: "json_object" },
          temperature: 0.5,
        });
        const parsed: Record<string, unknown> = JSON.parse(fallback.choices[0].message.content || "{}");

        for (const dim of dims) {
          const raw = parsed[dim];
          if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            const entry = raw as Record<string, unknown>;
            cenario[dim] = {
              resumo: typeof entry.resumo === "string" ? entry.resumo : emptyDim().resumo,
              fontes: Array.isArray(entry.fontes)
                ? (entry.fontes as unknown[]).filter((f): f is string => typeof f === "string")
                : [],
            };
          }
        }
      }

      res.json(cenario);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/ai/sugerir-pestel", async (req, res) => {
    try {
      const { nomeEmpresa, setor, descricao, cenarioExterno } = req.body as {
        nomeEmpresa: string;
        setor: string;
        descricao: string;
        cenarioExterno?: Record<string, { resumo?: string; fontes?: string[] }>;
      };

      // Enriquecer contexto com campos adicionais do perfil
      let contextoRico = "";
      let empresaCompleta: Awaited<ReturnType<typeof storage.getEmpresa>> | null = null;
      if (req.session?.empresaId) {
        empresaCompleta = await storage.getEmpresa(req.session.empresaId);
        if (empresaCompleta) {
          contextoRico = buildEmpresaContextoIA(empresaCompleta);
        }
      }
      const perfilEmpresa = contextoRico || `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao}`;

      // Contexto rico com título por dimensão
      const cenarioContext = cenarioExterno
        ? `\n\n━━━ CONTEXTO EXTERNO ATUAL (baseado em pesquisa de notícias e tendências recentes) ━━━\n` +
          `(Use OBRIGATORIAMENTE estes dados para embasar os fatores. Cite percentuais, eventos e tendências específicos.)\n\n` +
          Object.entries(cenarioExterno)
            .map(([dim, data]) => {
              const titulo = {
                politico: "POLÍTICO",
                economico: "ECONÔMICO",
                social: "SOCIAL",
                tecnologico: "TECNOLÓGICO",
                ambiental: "AMBIENTAL",
                legal: "LEGAL",
              }[dim] ?? dim.toUpperCase();
              return `${titulo}:\n${data?.resumo ?? ""}`;
            })
            .join("\n\n")
        : "";

      const regrasEspecificidadePestel = cenarioExterno
        ? `\nREGRAS OBRIGATÓRIAS DE QUALIDADE:\n` +
          `- Cada "descricao" deve mencionar dados ou tendências CONCRETOS do contexto pesquisado (percentuais, nomes de políticas, taxas, leis específicas).\n` +
          `- Cada "evidencia" deve explicar com fatos REAIS por que este fator importa para esta empresa específica — nunca escreva frases genéricas como "este fator pode impactar o negócio".\n` +
          `- PROIBIDO escrever análises vagas ou genéricas. Toda afirmação deve ser baseada nos dados do contexto acima.\n` +
          `- As descrições devem ter pelo menos 2-3 frases com informações específicas e atuais.\n` +
          `- Incorpore também os dados do "Cenário Macroeconômico Atual" presentes no system message (quando disponíveis), integrando-os com os dados do contexto de pesquisa.\n`
        : "";
      
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresaCompleta?.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em análise de cenário externo para empresas brasileiras. Sua função é produzir análises CONCRETAS e ESPECÍFICAS com dados reais — nunca texto genérico. Use sempre linguagem simples e direta, sem jargões técnicos. Quando tiver contexto de pesquisa disponível, use-o obrigatoriamente: cite percentuais, nomes de leis, taxas e tendências reais.`,
          },
          {
            role: "user",
            content: `${perfilEmpresa}${cenarioContext}${regrasEspecificidadePestel}\n\nCrie EXATAMENTE 6 fatores externos (um para cada categoria PESTEL):\n1. Um fator POLÍTICO (tipo: "politico")\n2. Um fator ECONÔMICO (tipo: "economico")\n3. Um fator SOCIAL (tipo: "social")\n4. Um fator TECNOLÓGICO (tipo: "tecnologico")\n5. Um fator AMBIENTAL (tipo: "ambiental")\n6. Um fator LEGAL (tipo: "legal")\n\nPara cada fator, forneça:\n- tipo: exatamente como indicado acima (politico, economico, social, tecnologico, ambiental, legal)\n- descricao: descrição ESPECÍFICA com dados concretos do contexto pesquisado (percentuais, nomes, datas, leis)\n- impacto: "alto", "médio" ou "baixo"\n- evidencia: explicação ESPECÍFICA de por que este fator importa para esta empresa, com consequências práticas concretas\n\nResponda OBRIGATORIAMENTE em JSON com este formato exato:\n{\n  "fatores": [\n    {"tipo": "politico", "descricao": "...", "impacto": "alto", "evidencia": "..."},\n    {"tipo": "economico", "descricao": "...", "impacto": "médio", "evidencia": "..."},\n    {"tipo": "social", "descricao": "...", "impacto": "...", "evidencia": "..."},\n    {"tipo": "tecnologico", "descricao": "...", "impacto": "...", "evidencia": "..."},\n    {"tipo": "ambiental", "descricao": "...", "impacto": "...", "evidencia": "..."},\n    {"tipo": "legal", "descricao": "...", "impacto": "...", "evidencia": "..."}\n  ]\n}`,
          },
        ]),
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-swot", async (req, res) => {
    try {
      const { nomeEmpresa, setor, descricao, tipo } = req.body;
      
      let contextoPerfil = `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao || "Não informada"}`;
      let swotEmpresa: Awaited<ReturnType<typeof storage.getEmpresa>> | null = null;
      if (req.session?.empresaId) {
        swotEmpresa = await storage.getEmpresa(req.session.empresaId);
        if (swotEmpresa) contextoPerfil = buildEmpresaContextoIA(swotEmpresa);
      }

      const tipoLabel = tipo === "forca" ? "forças" : tipo === "fraqueza" ? "fraquezas" : tipo === "oportunidade" ? "oportunidades" : "ameaças";
      
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(swotEmpresa?.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em análise de negócios. Use sempre linguagem simples e direta, sem jargões técnicos.`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA\n${contextoPerfil}\n\nSugira 4-5 ${tipoLabel} relevantes para esta empresa. Para cada item, forneça uma descrição clara e o nível de impacto (alto/médio/baixo). Responda em JSON com formato: [{descricao, impacto}]`
          }
        ]),
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-swot-individual", async (req, res) => {
    try {
      const { tipo, instrucaoAdicional = "" } = req.body;
      const empresaId = req.session.empresaId!;
      
      const tiposValidos = ["forca", "fraqueza", "oportunidade", "ameaca"];
      if (!tipo || !tiposValidos.includes(tipo)) {
        return res.status(400).json({ error: "tipo inválido. Use: forca, fraqueza, oportunidade ou ameaca" });
      }

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const fatoresPestelList = await storage.getFatoresPestel(empresaId);
      const cincoForcasList = await storage.getCincoForcas(empresaId);
      const modeloNegocioList = await storage.getModeloNegocio(empresaId);
      const swotExistente = await storage.getAnaliseSwot(empresaId);

      const fatoresPestelResumo = fatoresPestelList.map(f => `${f.tipo}: ${f.descricao}`).join("\n");
      const cincoForcasResumo = cincoForcasList.map(f => `${f.forca}: ${f.descricao} (intensidade ${f.intensidade})`).join("\n");
      const modeloNegocioResumo = modeloNegocioList.map(m => `${m.bloco}: ${m.descricao}`).join("\n");
      
      const swotPorTipo = swotExistente.filter(s => s.tipo === tipo).map(s => s.descricao);

      const tipoLabel = tipo === "forca" ? "FORÇA" : tipo === "fraqueza" ? "FRAQUEZA" : tipo === "oportunidade" ? "OPORTUNIDADE" : "AMEAÇA";
      const contextoBase = tipo === "forca" || tipo === "fraqueza" ? "MODELO DE NEGÓCIO" : "CENÁRIO EXTERNO (PESTEL) e MERCADO E CONCORRÊNCIA";

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em análise SWOT. Sua missão é identificar com precisão forças, fraquezas, oportunidades e ameaças relevantes e específicas da empresa. Use sempre linguagem simples e direta, sem jargões técnicos. IMPORTANTE: Nunca repita itens que já foram identificados anteriormente.
PRIORIDADE MÁXIMA: Se existir um DOCUMENTO ESTRATÉGICO DA EMPRESA nos dados fornecidos (marcado com ━━━ DOCUMENTO ESTRATÉGICO DA EMPRESA ━━━), leia-o com atenção total e priorize as informações nele contidas sobre riscos, fraquezas, vulnerabilidades, pontos críticos e oportunidades. Os dados do documento estratégico são reais e específicos e devem sobrepor qualquer suposição genérica.`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA
${contextoPerfil}
${instrucaoAdicional?.trim() ? `\n## INSTRUÇÃO PRIORITÁRIA DO USUÁRIO:\n${instrucaoAdicional.trim()}\nEsta instrução deve ser seguida com máxima prioridade.\n` : ""}
## CONTEXTO COMPLETO DA EMPRESA:

### Modelo de Negócio (Business Model Canvas):
${modeloNegocioResumo || "Ainda não definido"}

### Cenário Externo (Análise PESTEL):
${fatoresPestelResumo || "Ainda não definido"}

### Mercado e Concorrência (Cinco Forças):
${cincoForcasResumo || "Ainda não definido"}

## ${tipoLabel}S JÁ EXISTENTES (EVITE REPETIR):
${swotPorTipo.length > 0 ? swotPorTipo.map((item, i) => `${i + 1}. ${item}`).join("\n") : `Nenhuma ${tipoLabel.toLowerCase()} identificada ainda`}

## TAREFA:
Com base no ${contextoBase}, gere EXATAMENTE 1 (uma) nova ${tipoLabel} que NÃO esteja na lista acima.

Para o item, forneça:
- descricao: uma descrição clara, objetiva e específica (diferente dos itens existentes)
- impacto: "alto", "médio" ou "baixo"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "descricao": "...",
  "impacto": "alto"
}`
          }
        ]),
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestao = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestao);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Resumo de contexto disponível para geração SWOT ─────────────────────────
  app.get("/api/ai/swot-context-summary", async (req, res) => {
    try {
      if (!req.session.empresaId) return res.status(401).json({ error: "Não autenticado" });
      const empresaId = req.session.empresaId;
      const [empresa, pestelList, cincoForcasList, modeloList, indicadoresList, objetivosList, estrategiasList, iniciativasList] = await Promise.all([
        storage.getEmpresa(empresaId),
        storage.getFatoresPestel(empresaId),
        storage.getCincoForcas(empresaId),
        storage.getModeloNegocio(empresaId),
        storage.getIndicadores(empresaId),
        storage.getObjetivos(empresaId),
        storage.getEstrategias(empresaId),
        storage.getIniciativas(empresaId),
      ]);
      res.json({
        counts: {
          pestel: pestelList.length,
          cincoForcas: cincoForcasList.length,
          modeloNegocio: modeloList.length,
          indicadores: indicadoresList.length,
          objetivos: objetivosList.length,
          estrategias: estrategiasList.length + iniciativasList.length,
        },
        temDocumento: !!empresa?.documentoNome,
        nomeDocumento: empresa?.documentoNome || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-swot-completo", async (req, res) => {
    try {
      if (!req.session.empresaId) return res.status(401).json({ error: "Não autenticado" });
      const empresaId = req.session.empresaId;
      const {
        tiposSelecionados = ["forca", "fraqueza", "oportunidade", "ameaca"],
        quantidadePorTipo = { forca: 1, fraqueza: 1, oportunidade: 1, ameaca: 1 },
        instrucaoAdicional = "",
        fontesContexto = ["perfil", "documento", "pestel", "cincoForcas", "modeloNegocio", "indicadores", "objetivos", "estrategias"],
      } = req.body;

      // Validate tiposSelecionados
      const tiposPermitidos = ["forca", "fraqueza", "oportunidade", "ameaca"];
      if (!Array.isArray(tiposSelecionados) || tiposSelecionados.length === 0) {
        return res.status(400).json({ error: "tiposSelecionados deve ser um array não vazio" });
      }
      for (const t of tiposSelecionados) {
        if (!tiposPermitidos.includes(t)) {
          return res.status(400).json({ error: `Tipo inválido: ${t}. Use: forca, fraqueza, oportunidade, ameaca` });
        }
        const qtd = quantidadePorTipo[t];
        if (qtd !== undefined && (typeof qtd !== "number" || qtd < 1 || qtd > 5)) {
          return res.status(400).json({ error: `quantidadePorTipo["${t}"] deve ser um número entre 1 e 5` });
        }
      }

      // Validate fontesContexto values
      const fontesPermitidas = ["perfil", "documento", "pestel", "cincoForcas", "modeloNegocio", "indicadores", "objetivos", "estrategias"] as const;
      const fontesInput: string[] = Array.isArray(fontesContexto) ? fontesContexto : [];
      const fontesInvalidas = fontesInput.filter((f) => !fontesPermitidas.includes(f as typeof fontesPermitidas[number]));
      if (fontesInvalidas.length > 0) {
        return res.status(400).json({ error: `Fontes inválidas: ${fontesInvalidas.join(", ")}. Permitidas: ${fontesPermitidas.join(", ")}` });
      }
      const fontesValidas = fontesInput as (typeof fontesPermitidas[number])[];

      // Parse fontes flags (perfil always included)
      const useDocumento    = fontesValidas.includes("documento");
      const usePestel       = fontesValidas.includes("pestel");
      const useCincoForcas  = fontesValidas.includes("cincoForcas");
      const useModeloNeg    = fontesValidas.includes("modeloNegocio");
      const useIndicadores  = fontesValidas.includes("indicadores");
      const useObjetivos    = fontesValidas.includes("objetivos");
      const useEstrategias  = fontesValidas.includes("estrategias");

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

      // Conditional parallel DB queries (typed)
      const [
        fatoresPestelList,
        cincoForcasList,
        modeloNegocioList,
        indicadoresList,
        objetivosList,
        estrategiasList,
        iniciativasList,
        swotExistente,
      ] = await Promise.all([
        usePestel      ? storage.getFatoresPestel(empresaId) : Promise.resolve<FatorPestel[]>([]),
        useCincoForcas ? storage.getCincoForcas(empresaId)   : Promise.resolve<CincoForcas[]>([]),
        useModeloNeg   ? storage.getModeloNegocio(empresaId) : Promise.resolve<ModeloNegocio[]>([]),
        useIndicadores ? storage.getIndicadores(empresaId)   : Promise.resolve<Indicador[]>([]),
        useObjetivos   ? storage.getObjetivos(empresaId)     : Promise.resolve<Objetivo[]>([]),
        useEstrategias ? storage.getEstrategias(empresaId)   : Promise.resolve<Estrategia[]>([]),
        useEstrategias ? storage.getIniciativas(empresaId)   : Promise.resolve<Iniciativa[]>([]),
        storage.getAnaliseSwot(empresaId),
      ]);

      // Fetch resultadosChave for each objective (OKRs)
      const resultadosChaveMap: Record<string, ResultadoChave[]> = {};
      if (useObjetivos && objetivosList.length > 0) {
        const resultados = await Promise.all(
          objetivosList.map((o) => storage.getResultadosChave(o.id, empresaId))
        );
        objetivosList.forEach((o, idx) => {
          resultadosChaveMap[o.id] = resultados[idx] ?? [];
        });
      }

      // Build context strings (fully typed, no any)
      const fatoresPestelResumo  = fatoresPestelList.map((f) => `${f.tipo}: ${f.descricao}`).join("\n");
      const cincoForcasResumo    = cincoForcasList.map((f) => `${f.forca}: ${f.descricao} (intensidade ${f.intensidade})`).join("\n");
      const modeloNegocioResumo  = modeloNegocioList.map((m) => `${m.bloco}: ${m.descricao}`).join("\n");
      const indicadoresResumo    = indicadoresList.map((i) => `[${i.perspectiva}] ${i.nome}: atual=${i.atual}, meta=${i.meta}, status=${i.status}`).join("\n");
      const objetivosResumo      = objetivosList.map((o) => {
        const krs = resultadosChaveMap[o.id] ?? [];
        const krsText = krs.length > 0
          ? "\n" + krs.map((kr) => `    KR: ${kr.descricao} — atual: ${kr.atual}, meta: ${kr.meta}, status: ${kr.status}`).join("\n")
          : "";
        return `[${o.perspectiva}] ${o.titulo}${o.descricao ? `: ${o.descricao}` : ""} (prazo: ${o.prazo})${krsText}`;
      }).join("\n");
      const estrategiasResumo    = [
        ...estrategiasList.map((e) => `[Estratégia | ${e.tipo} | ${e.prioridade}] ${e.titulo}: ${e.descricao}`),
        ...iniciativasList.map((i) => `[Iniciativa | ${i.prioridade} | ${i.status}] ${i.titulo}: ${i.descricao} (resp: ${i.responsavel})`),
      ].join("\n");

      const swotExistentePorTipo: Record<string, string[]> = {
        forca:        swotExistente.filter((s: AnaliseSwot) => s.tipo === "forca").map((s: AnaliseSwot) => s.descricao),
        fraqueza:     swotExistente.filter((s: AnaliseSwot) => s.tipo === "fraqueza").map((s: AnaliseSwot) => s.descricao),
        oportunidade: swotExistente.filter((s: AnaliseSwot) => s.tipo === "oportunidade").map((s: AnaliseSwot) => s.descricao),
        ameaca:       swotExistente.filter((s: AnaliseSwot) => s.tipo === "ameaca").map((s: AnaliseSwot) => s.descricao),
      };

      // ── TWO-STEP EXTRACTION (split internal / external) ────────────────────
      // Run two targeted extractions in parallel when both internal and external
      // SWOT types are requested — each focused on the right domain. This prevents
      // the model from classifying internal problems as external threats and vice-versa.
      const temDocumentoReal = useDocumento && !!empresa.documentoInterpretacao;
      const temInstrucao     = !!instrucaoAdicional?.trim();

      const tiposInternos = tiposSelecionados.filter((t: string) => t === "forca" || t === "fraqueza");
      const tiposExternos = tiposSelecionados.filter((t: string) => t === "oportunidade" || t === "ameaca");
      const pedidoInterno = tiposInternos.length > 0;
      const pedidoExterno = tiposExternos.length > 0;

      let achadosInternosSection = "";
      let achadosExternosSection = "";

      const makeExtracaoCall = async (guiaExtracao: string): Promise<string[]> => {
        const result = await openai.chat.completions.create({
          model: getModelForPlan(empresa.planoTipo, "relatorios"),
          messages: [
            {
              role: "system",
              content: `Você é um analista especializado em extrair informações de documentos estratégicos para análise SWOT. Seja fiel ao documento: cite situações reais, valores, eventos e problemas mencionados — nunca generalize ou invente.`,
            },
            {
              role: "user",
              content: `## GUIA DE EXTRAÇÃO:
${guiaExtracao}

## DOCUMENTO ESTRATÉGICO:
${empresa.documentoInterpretacao}

## TAREFA:
Leia o documento integralmente e extraia cada achado relevante de forma objetiva, incluindo fatos específicos (ex: dívidas, conflitos, percentuais, aquisições, dependências). Se o documento mencionar um fato específico, liste-o — não omita.

Responda EXCLUSIVAMENTE em JSON:
{
  "achados": [
    "Achado específico 1 com dados/fatos reais do documento",
    "Achado específico 2 com dados/fatos reais do documento"
  ]
}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });
        const parsed = JSON.parse(result.choices[0].message.content || "{}");
        return (parsed.achados || []).filter((a: string) => a.trim().length > 10);
      };

      if (temDocumentoReal) {
        const extractionTasks: Promise<void>[] = [];

        if (pedidoInterno) {
          const guia = temInstrucao
            ? `Instrução do usuário: ${instrucaoAdicional.trim()}\n\nFoque em aspectos INTERNOS da organização (estrutura, processos, recursos, competências, finanças internas, governança, operações, histórico) relevantes para identificar forças e fraquezas.`
            : `Extraia EXCLUSIVAMENTE achados sobre aspectos INTERNOS da organização: estrutura, processos, recursos humanos, competências, situação financeira interna, governança, operações, cultura, histórico. NÃO inclua fatores externos de mercado ou macro-ambiente.`;
          extractionTasks.push(
            makeExtracaoCall(guia).then((achados) => {
              if (achados.length > 0) {
                achadosInternosSection = `\n## ACHADOS INTERNOS DO DOCUMENTO (use para Forças e Fraquezas):\n${achados.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\nATENÇÃO: Estes achados são fatos INTERNOS à organização. Use-os APENAS para identificar Forças e Fraquezas. Não use para Oportunidades/Ameaças.\n`;
              }
            })
          );
        }

        if (pedidoExterno) {
          const guia = temInstrucao
            ? `Instrução do usuário: ${instrucaoAdicional.trim()}\n\nFoque em aspectos EXTERNOS ao ambiente da empresa (mercado, concorrência, macro-ambiente, legislação, tendências setoriais) relevantes para identificar oportunidades e ameaças.`
            : `Extraia EXCLUSIVAMENTE achados sobre fatores EXTERNOS ao controle da empresa: mercado, concorrência, economia, legislação, regulação, tecnologia de mercado, tendências setoriais, movimentos dos concorrentes. NÃO inclua problemas internos da organização.`;
          extractionTasks.push(
            makeExtracaoCall(guia).then((achados) => {
              if (achados.length > 0) {
                achadosExternosSection = `\n## ACHADOS EXTERNOS DO DOCUMENTO (use para Oportunidades e Ameaças):\n${achados.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\nATENÇÃO: Estes achados são fatores EXTERNOS ao controle da empresa. Use-os APENAS para identificar Oportunidades e Ameaças. Não os confunda com Fraquezas internas.\n`;
              }
            })
          );
        }

        await Promise.all(extractionTasks);
      }

      // ── BUILD CONTEXT ──────────────────────────────────────────────────────
      // Raw document never included — achados sections replace it entirely.
      const contextoPerfil = buildEmpresaContextoIA(empresa, { includeDocument: false });

      // Internal context sections (for Forças and Fraquezas)
      const contextSectionsInternas: string[] = [];
      if (useModeloNeg   && modeloNegocioResumo) contextSectionsInternas.push(`### Modelo de Negócio (Business Model Canvas):\n${modeloNegocioResumo}`);
      if (useIndicadores && indicadoresResumo)   contextSectionsInternas.push(`### Indicadores e KPIs:\n${indicadoresResumo}`);
      if (useObjetivos   && objetivosResumo)     contextSectionsInternas.push(`### Objetivos e OKRs:\n${objetivosResumo}`);
      if (useEstrategias && estrategiasResumo)   contextSectionsInternas.push(`### Estratégias e Iniciativas:\n${estrategiasResumo}`);

      // External context sections (for Oportunidades and Ameaças)
      const contextSectionsExternas: string[] = [];
      if (usePestel      && fatoresPestelResumo) contextSectionsExternas.push(`### Cenário Externo (Análise PESTEL):\n${fatoresPestelResumo}`);
      if (useCincoForcas && cincoForcasResumo)   contextSectionsExternas.push(`### Mercado e Concorrência (Cinco Forças):\n${cincoForcasResumo}`);

      // Compute fonte labels for TAREFA section per type
      const fontesInternas: string[] = ["Perfil da empresa"];
      if (achadosInternosSection)                       fontesInternas.push("Achados Internos do Documento");
      else if (temDocumentoReal && pedidoInterno)       fontesInternas.push("Documento Estratégico");
      if (useModeloNeg   && modeloNegocioResumo)        fontesInternas.push("Modelo de Negócio");
      if (useIndicadores && indicadoresResumo)          fontesInternas.push("Indicadores e KPIs");
      if (useObjetivos   && objetivosResumo)            fontesInternas.push("Objetivos e OKRs");
      if (useEstrategias && estrategiasResumo)          fontesInternas.push("Estratégias e Iniciativas");

      const fontesExternas: string[] = [];
      if (achadosExternosSection)                       fontesExternas.push("Achados Externos do Documento");
      else if (temDocumentoReal && pedidoExterno)       fontesExternas.push("Documento Estratégico");
      if (usePestel      && fatoresPestelResumo)        fontesExternas.push("Análise PESTEL");
      if (useCincoForcas && cincoForcasResumo)          fontesExternas.push("Cinco Forças / Mercado e Concorrência");
      // No fallback to "Perfil da empresa" for external sources — preserves strict internal/external separation.
      // If no external source is selected, oportunidade/ameaca types will have empty fonte list
      // which serves as a signal that the prompt should note limited external context.

      const tiposLabel: Record<string, { label: string; plural: string; fonte: string; proibicao: string }> = {
        forca:        { label: "FORÇA",        plural: "FORÇAS",        fonte: fontesInternas.join(", "),  proibicao: "PROIBIDO usar PESTEL/Cinco Forças. Forças são fatores INTERNOS." },
        fraqueza:     { label: "FRAQUEZA",     plural: "FRAQUEZAS",     fonte: fontesInternas.join(", "),  proibicao: "PROIBIDO usar PESTEL/Cinco Forças. Fraquezas são fatores INTERNOS." },
        oportunidade: { label: "OPORTUNIDADE", plural: "OPORTUNIDADES", fonte: fontesExternas.join(", "), proibicao: "PROIBIDO classificar problemas internos como Oportunidades. Oportunidades são fatores EXTERNOS favoráveis." },
        ameaca:       { label: "AMEAÇA",       plural: "AMEAÇAS",       fonte: fontesExternas.join(", "), proibicao: "PROIBIDO classificar problemas internos como Ameaças — esses são Fraquezas. Ameaças são fatores EXTERNOS." },
      };

      const tarefaLinhas = tiposSelecionados.map((tipo: string) => {
        const info = tiposLabel[tipo];
        const qtd  = quantidadePorTipo[tipo] || 1;
        const qtdLabel = qtd === 1
          ? `1 (uma) ${info.label}`
          : `${qtd} (${qtd === 2 ? "duas" : qtd === 3 ? "três" : qtd === 4 ? "quatro" : "cinco"}) ${info.plural}`;
        return `- **${qtdLabel}** (tipo: "${tipo}"): fontes: ${info.fonte}. ${info.proibicao} Não repita itens já existentes.`;
      }).join("\n");

      const existentesSecao = tiposSelecionados.map((tipo: string) => {
        const info = tiposLabel[tipo];
        const lista = swotExistentePorTipo[tipo];
        return `${info.plural} existentes:\n${lista.length > 0 ? lista.map((f, i) => `${i + 1}. ${f}`).join("\n") : `Nenhuma ${info.label.toLowerCase()} identificada ainda`}`;
      }).join("\n\n");

      const totalEsperado = tiposSelecionados.reduce((sum: number, tipo: string) => sum + (quantidadePorTipo[tipo] || 1), 0);

      const instrucaoSection = temInstrucao
        ? `\n## INSTRUÇÃO PRIORITÁRIA DO USUÁRIO:\n${instrucaoAdicional.trim()}\n`
        : "";

      // ── SYSTEM PROMPT ──────────────────────────────────────────────────────
      const todasFontesNomes = [...new Set([...fontesInternas, ...fontesExternas])].join(", ");
      const systemPrompt = `Você é um consultor estratégico sênior especializado em análise SWOT. Identifique forças, fraquezas, oportunidades e ameaças CONCRETAS e ESPECÍFICAS com base exclusivamente nos dados fornecidos.

REGRAS OBRIGATÓRIAS — CLASSIFICAÇÃO INTERNA vs. EXTERNA:
1. FORÇAS e FRAQUEZAS = EXCLUSIVAMENTE fatores INTERNOS da organização: estrutura, processos, recursos, competências, finanças internas, governança, histórico operacional. É PROIBIDO classificar tendências de mercado, concorrência ou macro-ambiente como força ou fraqueza.
2. OPORTUNIDADES e AMEAÇAS = EXCLUSIVAMENTE fatores EXTERNOS ao controle da empresa: mercado, concorrência, regulação, economia, tecnologia de mercado, tendências setoriais. É PROIBIDO classificar problemas internos (endividamento, conflitos de governança, falta de processos) como ameaças — esses são fraquezas.
3. Baseie CADA item em fatos e evidências das fontes fornecidas — nunca em suposições genéricas ou conhecimento geral.
4. Se houver ACHADOS DO DOCUMENTO, cada item deve se fundamentar em pelo menos um achado da seção correspondente (internos→Forças/Fraquezas; externos→Oportunidades/Ameaças).
5. Nunca repita itens já existentes.
6. Seja específico: mencione situações, valores e eventos reais quando presentes nos dados.

Fontes disponíveis: ${todasFontesNomes}.`;

      // Lower temperature when achados are available (fidelity over creativity)
      const temAchados = achadosInternosSection || achadosExternosSection;
      const generationTemperature = temAchados ? 0.4 : 0.7;

      const contextoInternoSection = contextSectionsInternas.length > 0
        ? `\n## CONTEXTO INTERNO (para Forças e Fraquezas):\n${contextSectionsInternas.join("\n\n")}`
        : "";
      const contextoExternoSection = contextSectionsExternas.length > 0
        ? `\n## CONTEXTO EXTERNO (para Oportunidades e Ameaças):\n${contextSectionsExternas.join("\n\n")}`
        : "";

      // ── GENERATE SWOT ──────────────────────────────────────────────────────
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA:
${contextoPerfil}
${achadosInternosSection}${achadosExternosSection}${instrucaoSection}${contextoInternoSection}${contextoExternoSection}

## ANÁLISE SWOT JÁ EXISTENTE (EVITE REPETIR):
${existentesSecao}

## TAREFA:
Gere EXATAMENTE ${totalEsperado} novo(s) item(ns) SWOT:

${tarefaLinhas}

Para cada item:
- tipo: "forca", "fraqueza", "oportunidade" ou "ameaca"
- descricao: descrição objetiva e específica (se houver achados do documento, mencione o fato concreto)
- impacto: "alto", "médio" ou "baixo"

Responda em JSON:
{
  "itens": [
    {"tipo": "forca", "descricao": "...", "impacto": "alto"},
    ...
  ]
}`,
          },
        ]),
        response_format: { type: "json_object" },
        temperature: generationTemperature,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Nova rota: pesquisa de mercado e concorrência em tempo real ──────────────
  app.post("/api/ai/pesquisar-mercado", async (req, res) => {
    const { nomeEmpresa, setor, descricao } = req.body as {
      nomeEmpresa: string;
      setor: string;
      descricao: string;
    };

    // Enriquecer contexto com campos adicionais do perfil
    let contextoRico = "";
    let planoTipoMercado: string | null = null;
    if (req.session?.empresaId) {
      const empresaCompleta = await storage.getEmpresa(req.session.empresaId);
      if (empresaCompleta) {
        contextoRico = buildEmpresaContextoIA(empresaCompleta);
        planoTipoMercado = empresaCompleta.planoTipo ?? null;
      }
    }
    const perfilEmpresaMercado = contextoRico || `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao}`;

    const forcaKeys = [
      "rivalidade_concorrentes",
      "poder_fornecedores",
      "poder_clientes",
      "ameaca_novos_entrantes",
      "ameaca_substitutos",
    ] as const;

    type ForcaKey = (typeof forcaKeys)[number];
    type MercadoPesquisado = Record<ForcaKey, { resumo: string; fontes: string[] }>;

    const emptyMercado = (): MercadoPesquisado =>
      Object.fromEntries(forcaKeys.map((k) => [k, { resumo: "", fontes: [] }])) as MercadoPesquisado;

    // Prompt de pesquisa livre — sem exigir JSON para que o modelo de busca
    // possa focar em encontrar informações reais e específicas
    // Extract empresa fields for targeted steering instructions
    let empresaSteeringInfo = { areaAtuacao: "", modeloNegocio: "", concorrentesConhecidos: "" };
    if (req.session?.empresaId) {
      const empresaC = await storage.getEmpresa(req.session.empresaId);
      if (empresaC) {
        empresaSteeringInfo = {
          areaAtuacao: empresaC.areaAtuacao || "",
          modeloNegocio: empresaC.modeloNegocio || "",
          concorrentesConhecidos: empresaC.concorrentesConhecidos || "",
        };
      }
    }

    const instrucoesDirecimento: string[] = [];
    if (empresaSteeringInfo.areaAtuacao) {
      instrucoesDirecimento.push(`FOCO GEOGRÁFICO: Esta empresa atua "${empresaSteeringInfo.areaAtuacao}". Priorize dados, players e tendências DESTE recorte geográfico específico ao descrever o mercado.`);
    }
    if (empresaSteeringInfo.modeloNegocio) {
      instrucoesDirecimento.push(`TIPO DE CLIENTE: Esta empresa opera no modelo "${empresaSteeringInfo.modeloNegocio}". Foque a análise de poder dos clientes (seção 3) neste tipo de relação comercial — se B2B, descreva clientes empresariais; se B2C, clientes pessoas físicas; etc.`);
    }
    if (empresaSteeringInfo.concorrentesConhecidos) {
      instrucoesDirecimento.push(`CONCORRENTES JÁ CONHECIDOS: O empresário já identificou estes concorrentes: "${empresaSteeringInfo.concorrentesConhecidos}". Obrigatoriamente inclua todos eles na seção de rivalidade entre concorrentes e EXPANDA a lista pesquisando outros concorrentes que o empresário pode ainda não conhecer.`);
    }

    const direcimentoStr = instrucoesDirecimento.length > 0
      ? `\n\n━━━ INSTRUÇÕES DE DIRECIONAMENTO DA PESQUISA ━━━\n${instrucoesDirecimento.join("\n")}`
      : "";

    const searchPrompt = `Você é um analista de inteligência competitiva especializado em mercado brasileiro.
Pesquise na internet informações ATUAIS e ESPECÍFICAS sobre o mercado de "${setor}" no Brasil para a seguinte empresa:

${perfilEmpresaMercado}
${direcimentoStr}

Pesquise e descreva com profundidade os seguintes aspectos:

1. RIVALIDADE ENTRE CONCORRENTES
   - Liste pelo menos 3 a 5 concorrentes REAIS pelo nome (empresas que atuam no mesmo mercado)
   - Para cada concorrente, indique seu porte, diferencial e estratégia de preço
   - Qual é a intensidade da concorrência? Há guerras de preço? Diferenciação de produto?
   - Cite dados de participação de mercado se disponíveis
   - SE foram fornecidos concorrentes conhecidos, OBRIGATORIAMENTE inclua todos eles e pesquise mais

2. PODER DE NEGOCIAÇÃO DOS FORNECEDORES
   - Quais são os principais insumos, matérias-primas ou serviços que empresas deste setor precisam comprar?
   - Quem são os principais fornecedores no Brasil? Há concentração (poucos fornecedores) ou pulverização?
   - Existem gargalos na cadeia de suprimentos? Há dependência de importação?
   - Qual é a facilidade de trocar de fornecedor?

3. PODER DE NEGOCIAÇÃO DOS CLIENTES
   - Quem são os principais clientes/segmentos? (Considere o modelo de negócio: ${empresaSteeringInfo.modeloNegocio || "não especificado"})
   - Qual é o ticket médio e sensibilidade ao preço?
   - Os clientes têm facilidade de trocar de fornecedor? Há fidelização?
   - Há grandes clientes que concentram parte expressiva da receita?

4. AMEAÇA DE NOVOS ENTRANTES
   - Quais são as barreiras de entrada no setor (capital, regulação, tecnologia, marca)?
   - Há startups ou grandes grupos nacionais/internacionais tentando entrar?
   - O setor exige licenças, certificações ou investimentos pesados?

5. AMEAÇA DE PRODUTOS/SERVIÇOS SUBSTITUTOS
   - Quais produtos ou serviços alternativos poderiam substituir o que este setor oferece?
   - Como está o crescimento desses substitutos no Brasil?
   - Qual é o risco de os clientes migrarem para substitutos?

Seja ESPECÍFICO. Use nomes reais de empresas, cite dados de mercado, percentuais e notícias recentes. Não generalize.`;

    // Prompt para estruturar o texto de pesquisa em JSON
    const structurePrompt = (researchText: string) =>
      `Com base na pesquisa de mercado abaixo, estruture as informações em JSON válido sem markdown.
Preserve TODOS os nomes de empresas, dados numéricos e detalhes específicos encontrados na pesquisa.

PESQUISA:
${researchText}

Retorne EXATAMENTE este JSON (sem texto adicional):
{
  "rivalidade_concorrentes": {
    "resumo": "Parágrafo detalhado citando os concorrentes reais pelo nome e suas características",
    "fontes": ["domínio1.com", "domínio2.com"]
  },
  "poder_fornecedores": {
    "resumo": "Parágrafo detalhado sobre insumos, fornecedores específicos e dinâmicas da cadeia",
    "fontes": ["domínio1.com"]
  },
  "poder_clientes": {
    "resumo": "Parágrafo detalhado sobre perfil dos clientes, sensibilidade e poder de barganha",
    "fontes": ["domínio1.com"]
  },
  "ameaca_novos_entrantes": {
    "resumo": "Parágrafo detalhado sobre barreiras e movimentos de potenciais entrantes",
    "fontes": ["domínio1.com"]
  },
  "ameaca_substitutos": {
    "resumo": "Parágrafo detalhado sobre substitutos reais e tendências de adoção",
    "fontes": ["domínio1.com"]
  }
}`;

    try {
      let mercado: MercadoPesquisado;

      try {
        // Passo 1 — Serper.dev: busca snippets sobre o mercado e concorrentes
        const mercadoQuery = `${setor} Brasil concorrentes mercado análise 2025`;
        const searchItems = await serperSearch(mercadoQuery, 8);
        const searchCtx = formatSearchContext(searchItems);

        // Combinar snippets do Google com o prompt de pesquisa como contexto para o LLM
        const promptWithCtx = searchCtx ? `${searchCtx}\n\n${searchPrompt}` : searchPrompt;

        // Passo 1b — LLM sintetiza o contexto em texto de pesquisa livre
        const synthResponse = await openai.chat.completions.create({
          model: getModelForPlan(planoTipoMercado, "relatorios"),
          messages: await injectMacroCtx([
            {
              role: "system",
              content: "Você é um analista de inteligência competitiva especializado em mercado brasileiro. Use os dados recentes fornecidos e o cenário macroeconômico atual do system message (quando disponível) para embasar a análise.",
            },
            { role: "user", content: promptWithCtx },
          ]),
          temperature: 0.3,
          max_tokens: 2000,
        });

        const researchText: string = synthResponse.choices[0].message.content || "";
        if (!researchText || researchText.trim().length < 100) {
          throw new Error("Pesquisa retornou resultado vazio ou muito curto");
        }

        // Passo 2 — estruturar o texto de pesquisa em JSON (modelo focado em formatar)
        const structureResponse = await openai.chat.completions.create({
          model: getModelForPlan(planoTipoMercado, "relatorios"),
          messages: [
            {
              role: "system",
              content: "Você é um assistente que converte textos de pesquisa em JSON estruturado. Preserva todos os detalhes específicos, nomes de empresas e dados numéricos. Responde somente com JSON válido.",
            },
            {
              role: "user",
              content: structurePrompt(researchText),
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });

        const parsed: Record<string, unknown> = JSON.parse(
          structureResponse.choices[0].message.content || "{}"
        );

        mercado = emptyMercado();
        for (const key of forcaKeys) {
          const entry = parsed[key];
          if (entry && typeof entry === "object" && !Array.isArray(entry)) {
            const obj = entry as Record<string, unknown>;
            mercado[key] = {
              resumo: typeof obj.resumo === "string" ? obj.resumo : "",
              fontes: Array.isArray(obj.fontes)
                ? (obj.fontes as string[]).filter((f) => typeof f === "string")
                : [],
            };
          }
        }
      } catch (searchError: unknown) {
        // Fallback — gpt-4o-mini sem web search, mas com o mesmo prompt estruturado
        const errMsg = searchError instanceof Error ? searchError.message : String(searchError);
        console.warn("[pesquisar-mercado] web search falhou, usando fallback:", errMsg);

        const fallbackPrompt = `Você é um especialista em análise de mercado brasileiro com conhecimento profundo do setor de "${setor}".
Com base no seu conhecimento, forneça uma análise detalhada e específica para a empresa "${nomeEmpresa}" (${descricao}).

${searchPrompt}

Retorne EXATAMENTE este JSON (sem texto adicional):
{
  "rivalidade_concorrentes": {"resumo": "...", "fontes": []},
  "poder_fornecedores": {"resumo": "...", "fontes": []},
  "poder_clientes": {"resumo": "...", "fontes": []},
  "ameaca_novos_entrantes": {"resumo": "...", "fontes": []},
  "ameaca_substitutos": {"resumo": "...", "fontes": []}
}`;

        const fallback = await openai.chat.completions.create({
          model: getModelForPlan(planoTipoMercado, "relatorios"),
          messages: [
            {
              role: "system",
              content: "Você é um especialista em mercado brasileiro. Seja ESPECÍFICO: cite nomes reais de empresas e dados concretos. Responda sempre em JSON válido sem markdown.",
            },
            { role: "user", content: fallbackPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.4,
        });

        const parsed: Record<string, unknown> = JSON.parse(
          fallback.choices[0].message.content || "{}"
        );
        mercado = emptyMercado();
        for (const key of forcaKeys) {
          const entry = parsed[key];
          if (entry && typeof entry === "object" && !Array.isArray(entry)) {
            const obj = entry as Record<string, unknown>;
            mercado[key] = {
              resumo: typeof obj.resumo === "string" ? obj.resumo : "",
              fontes: Array.isArray(obj.fontes)
                ? (obj.fontes as string[]).filter((f) => typeof f === "string")
                : [],
            };
          }
        }
      }

      res.json(mercado);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({ error: msg });
    }
  });

  // ── Sugestão de Cinco Forças (agora aceita mercadoPesquisado opcional) ────────
  app.post("/api/ai/sugerir-cinco-forcas", async (req, res) => {
    try {
      const { nomeEmpresa, setor, descricao, mercadoPesquisado } = req.body as {
        nomeEmpresa: string;
        setor: string;
        descricao: string;
        mercadoPesquisado?: Record<string, { resumo?: string; fontes?: string[] }>;
      };

      // Enriquecer contexto com campos adicionais do perfil
      let contextoRico = "";
      let empresaCompleta: Awaited<ReturnType<typeof storage.getEmpresa>> | null = null;
      if (req.session?.empresaId) {
        empresaCompleta = await storage.getEmpresa(req.session.empresaId);
        if (empresaCompleta) {
          contextoRico = buildEmpresaContextoIA(empresaCompleta);
        }
      }
      const perfilEmpresa = contextoRico || `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao}`;

      // Contexto rico: passa cada dimensão completa com título e resumo detalhado
      const contextoPesquisa = mercadoPesquisado
        ? `\n\n━━━ DADOS DE PESQUISA REAL DO MERCADO ━━━\n` +
          `(Use OBRIGATORIAMENTE estas informações como base da análise. Cite nomes reais de empresas e dados específicos.)\n\n` +
          Object.entries(mercadoPesquisado)
            .map(([forca, dados]) => {
              const titulo = {
                rivalidade_concorrentes: "RIVALIDADE ENTRE CONCORRENTES",
                poder_fornecedores: "PODER DOS FORNECEDORES",
                poder_clientes: "PODER DOS CLIENTES",
                ameaca_novos_entrantes: "AMEAÇA DE NOVOS ENTRANTES",
                ameaca_substitutos: "AMEAÇA DE SUBSTITUTOS",
              }[forca] ?? forca.toUpperCase();
              return `${titulo}:\n${dados.resumo ?? ""}`;
            })
            .join("\n\n")
        : "";

      const regrasEspecificidade = mercadoPesquisado
        ? `\nREGRAS OBRIGATÓRIAS DE QUALIDADE:\n` +
          `- RIVALIDADE: cite os concorrentes REAIS pelo nome (ex: "A empresa compete com X, Y e Z..."). Nunca escreva "empresas concorrentes" sem nomear.\n` +
          `- FORNECEDORES: mencione os insumos ou serviços específicos e os fornecedores concretos identificados na pesquisa.\n` +
          `- Cada "descricao" deve ter PELO MENOS 3 frases com informações concretas e específicas do mercado.\n` +
          `- Cada "impacto" deve explicar COMO e POR QUÊ a força afeta este negócio específico, com detalhes concretos.\n` +
          `- PROIBIDO escrever análises genéricas ou vagas. Toda afirmação deve ser baseada nos dados da pesquisa acima.\n` +
          `- Incorpore também os dados do "Cenário Macroeconômico Atual" presentes no system message (quando disponíveis), integrando-os com os dados da pesquisa de mercado.\n`
        : "";

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresaCompleta?.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em análise de mercado e concorrência para empresas brasileiras. Sua função é produzir análises CONCRETAS e ESPECÍFICAS, nunca genéricas. Use sempre linguagem simples e direta, sem jargões técnicos. Quando tiver dados de pesquisa disponíveis, use-os obrigatoriamente — cite nomes reais de empresas, dados de mercado e fatos específicos do setor. Incorpore também o cenário macroeconômico atual presente no system message quando disponível.`,
          },
          {
            role: "user",
            content: `${perfilEmpresa}${contextoPesquisa}${regrasEspecificidade}\n\nAnalise o mercado desta empresa usando as Cinco Forças Competitivas e crie EXATAMENTE 5 análises (uma para cada força):\n1. Rivalidade entre Concorrentes (forca: "rivalidade_concorrentes")\n2. Poder de Negociação dos Fornecedores (forca: "poder_fornecedores")\n3. Poder de Negociação dos Clientes (forca: "poder_clientes")\n4. Ameaça de Novos Entrantes (forca: "ameaca_novos_entrantes")\n5. Ameaça de Produtos Substitutos (forca: "ameaca_substitutos")\n\nPara cada força, forneça:\n- forca: exatamente como indicado acima\n- descricao: descrição ESPECÍFICA com pelo menos 3 frases concretas, citando nomes e dados reais quando disponíveis\n- intensidade: "alta", "média" ou "baixa"\n- impacto: explicação específica de como esta força afeta o negócio desta empresa, com consequências práticas concretas\n\nResponda OBRIGATORIAMENTE em JSON com este formato exato:\n{\n  "forcas": [\n    {"forca": "rivalidade_concorrentes", "descricao": "...", "intensidade": "alta", "impacto": "..."},\n    {"forca": "poder_fornecedores", "descricao": "...", "intensidade": "média", "impacto": "..."},\n    {"forca": "poder_clientes", "descricao": "...", "intensidade": "...", "impacto": "..."},\n    {"forca": "ameaca_novos_entrantes", "descricao": "...", "intensidade": "...", "impacto": "..."},\n    {"forca": "ameaca_substitutos", "descricao": "...", "intensidade": "...", "impacto": "..."}\n  ]\n}`,
          },
        ]),
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/ai/sugerir-modelo-negocio", async (req, res) => {
    try {
      const { nomeEmpresa, setor, descricao } = req.body;

      let contextoPerfil = `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao || "Não informada"}`;
      if (req.session?.empresaId) {
        const empresaCompleta = await storage.getEmpresa(req.session.empresaId);
        if (empresaCompleta) contextoPerfil = buildEmpresaContextoIA(empresaCompleta);
      }
      
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresaCompleta?.planoTipo, "relatorios"),
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em modelos de negócio. Sua função é ajudar empresários a estruturar seu modelo de negócio usando o Business Model Canvas. Use sempre linguagem simples e direta, sem jargões técnicos.`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA\n${contextoPerfil}\n\nCrie um modelo de negócio completo para esta empresa usando o Business Model Canvas. Forneça EXATAMENTE 9 blocos:\n1. Segmentos de Clientes (bloco: "segmentos_clientes")\n2. Proposta de Valor (bloco: "proposta_valor")\n3. Canais (bloco: "canais")\n4. Relacionamento com Clientes (bloco: "relacionamento_clientes")\n5. Fontes de Receita (bloco: "fontes_receita")\n6. Recursos Principais (bloco: "recursos_principais")\n7. Atividades Principais (bloco: "atividades_principais")\n8. Parcerias Principais (bloco: "parcerias_principais")\n9. Estrutura de Custos (bloco: "estrutura_custos")\n\nPara cada bloco, forneça:\n- bloco: exatamente como indicado acima\n- descricao: uma descrição clara e prática do bloco para esta empresa específica\n\nResponda OBRIGATORIAMENTE em JSON com este formato exato:\n{\n  "blocos": [\n    {"bloco": "segmentos_clientes", "descricao": "..."},\n    {"bloco": "proposta_valor", "descricao": "..."},\n    {"bloco": "canais", "descricao": "..."},\n    {"bloco": "relacionamento_clientes", "descricao": "..."},\n    {"bloco": "fontes_receita", "descricao": "..."},\n    {"bloco": "recursos_principais", "descricao": "..."},\n    {"bloco": "atividades_principais", "descricao": "..."},\n    {"bloco": "parcerias_principais", "descricao": "..."},\n    {"bloco": "estrutura_custos", "descricao": "..."}\n  ]\n}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-resultados", async (req, res) => {
    try {
      const { objetivo, nomeEmpresa, setor } = req.body;

      let contextoPerfil = `Empresa: ${nomeEmpresa}\nSetor: ${setor}`;
      if (req.session?.empresaId) {
        const empresaCompleta = await storage.getEmpresa(req.session.empresaId);
        if (empresaCompleta) contextoPerfil = buildEmpresaContextoIA(empresaCompleta);
      }
      
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresaCompleta?.planoTipo, "relatorios"),
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em definição de objetivos e resultados mensuráveis. Use sempre linguagem simples e direta, sem jargões técnicos.`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA\n${contextoPerfil}\n\nObjetivo: ${objetivo}\n\nSugira 3-4 resultados mensuráveis que indicariam o sucesso deste objetivo. Para cada resultado, forneça: nome da métrica, valor inicial estimado, valor alvo ambicioso porém realista, e prazo. Responda em JSON com formato: [{metrica, valorInicial, valorAlvo, prazo}]`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/assistente", requireAuth, async (req, res) => {
    try {
      const { pergunta, historico = [] } = req.body as {
        pergunta: string;
        historico: { role: "user" | "assistant"; content: string }[];
      };
      if (!pergunta?.trim()) return res.status(400).json({ error: "Pergunta não pode ser vazia." });

      const empresaId = req.session.empresaId!;

      const [
        empresa,
        pestel,
        swot,
        cincoForcas,
        modeloNegocio,
        estrategias,
        objetivos,
        indicadores,
        iniciativas,
        rituais,
      ] = await Promise.all([
        storage.getEmpresa(empresaId),
        storage.getFatoresPestel(empresaId),
        storage.getAnaliseSwot(empresaId),
        storage.getCincoForcas(empresaId),
        storage.getModeloNegocio(empresaId),
        storage.getEstrategias(empresaId),
        storage.getObjetivos(empresaId),
        storage.getIndicadores(empresaId),
        storage.getIniciativas(empresaId),
        storage.getRituais(empresaId),
      ]);

      // Fetch key results for each objective
      const resultadosPorObjetivo = await Promise.all(
        objetivos.map(o => storage.getResultadosChave(o.id, empresaId).then(rks => ({ objetivo: o, resultados: rks })))
      );

      // Build context
      const ctx: string[] = [];

      if (empresa) {
        ctx.push(`## PERFIL DA EMPRESA\n${buildEmpresaContextoIA(empresa)}`);
      }

      if (pestel.length > 0) {
        const grupos = ["politico", "economico", "social", "tecnologico", "ambiental", "legal"];
        const pestelStr = grupos.map(g => {
          const items = pestel.filter(p => p.categoria === g).map(p => `  - ${p.fator}: ${p.descricao} (impacto: ${p.impacto})`);
          return items.length ? `${g.toUpperCase()}:\n${items.join("\n")}` : null;
        }).filter(Boolean).join("\n");
        ctx.push(`## ANÁLISE DE CENÁRIO EXTERNO (PESTEL)\n${pestelStr}`);
      }

      if (cincoForcas.length > 0) {
        ctx.push(`## ANÁLISE DE MERCADO E CONCORRÊNCIA (CINCO FORÇAS)\n${cincoForcas.map(f => `- ${f.forca}: ${f.descricao} (intensidade: ${f.intensidade})`).join("\n")}`);
      }

      if (swot.length > 0) {
        const tipos = ["forca", "fraqueza", "oportunidade", "ameaca"];
        const swotStr = tipos.map(t => {
          const items = swot.filter(s => s.tipo === t).map(s => `  - ${s.descricao}`);
          return items.length ? `${t.toUpperCase()}S:\n${items.join("\n")}` : null;
        }).filter(Boolean).join("\n");
        ctx.push(`## FORÇAS E FRAQUEZAS / OPORTUNIDADES E AMEAÇAS (SWOT)\n${swotStr}`);
      }

      if (modeloNegocio.length > 0) {
        ctx.push(`## MODELO DE NEGÓCIO\n${modeloNegocio.map(b => `- ${b.bloco}: ${b.conteudo}`).join("\n")}`);
      }

      if (estrategias.length > 0) {
        ctx.push(`## ESTRATÉGIAS DEFINIDAS\n${estrategias.map(e => `- [${e.tipo}] ${e.titulo}: ${e.descricao}`).join("\n")}`);
      }

      if (resultadosPorObjetivo.length > 0) {
        const okrStr = resultadosPorObjetivo.map(({ objetivo, resultados }) => {
          const rks = resultados.map(r => {
            const progresso = r.valorAtual != null && r.valorMeta != null
              ? `${parseFloat(String(r.valorAtual))}/${parseFloat(String(r.valorMeta))} ${r.unidade || ""} (${Math.round((parseFloat(String(r.valorAtual)) / parseFloat(String(r.valorMeta))) * 100)}%)`
              : "sem dados";
            return `    • ${r.descricao}: ${progresso}`;
          }).join("\n");
          return `- Objetivo: ${objetivo.titulo} (${objetivo.perspectiva})\n${rks || "    • Sem resultados-chave"}`;
        }).join("\n");
        ctx.push(`## OBJETIVOS E RESULTADOS-CHAVE (OKRs)\n${okrStr}`);
      }

      if (indicadores.length > 0) {
        ctx.push(`## INDICADORES DE DESEMPENHO (KPIs / BSC)\n${indicadores.map(i => {
          const atual = i.valorAtual != null ? parseFloat(String(i.valorAtual)) : null;
          const meta = i.valorMeta != null ? parseFloat(String(i.valorMeta)) : null;
          const status = atual != null && meta != null
            ? (atual >= meta ? "Verde" : atual >= meta * 0.8 ? "Amarelo" : "Vermelho")
            : "Sem dados";
          return `- [${i.perspectiva}] ${i.nome}: atual=${atual ?? "—"}, meta=${meta ?? "—"} ${i.unidade || ""} — ${status}`;
        }).join("\n")}`);
      }

      if (iniciativas.length > 0) {
        ctx.push(`## INICIATIVAS PRIORITÁRIAS\n${iniciativas.map(i => `- ${i.titulo} [${i.status}] prazo: ${i.prazo || "não definido"} responsável: ${i.responsavel || "não definido"}`).join("\n")}`);
      }

      if (rituais.length > 0) {
        const recentes = rituais.filter(r => r.completado).slice(0, 5);
        if (recentes.length > 0) {
          ctx.push(`## RITOS DE GESTÃO RECENTES\n${recentes.map(r => `- ${r.tipo} em ${r.dataUltimo || "data não registrada"}`).join("\n")}`);
        }
      }

      const systemPrompt = `Você é o Assistente Estratégico do BizGuideAI, um consultor sênior de estratégia empresarial com profundo conhecimento em gestão para pequenas e médias empresas brasileiras.

Você tem acesso completo às informações estratégicas da empresa abaixo. Use esses dados para dar respostas precisas, contextualizadas e acionáveis.

REGRAS:
- Responda SEMPRE em português do Brasil
- Use linguagem simples e direta, sem jargões desnecessários
- Baseie suas respostas nos dados reais da empresa quando relevante
- Seja específico e prático — foque em ações concretas
- Se a pergunta não tiver relação com os dados da empresa, responda da melhor forma usando seu conhecimento geral de gestão estratégica
- Limite a resposta a no máximo 400 palavras, exceto quando o usuário pedir algo mais extenso

${ctx.join("\n\n")}`;

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...historico.slice(-10),
        { role: "user", content: pergunta },
      ];

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa?.planoTipo, "relatorios"),
        messages: await injectMacroCtx(messages),
        temperature: 0.7,
        max_tokens: 700,
      });

      res.json({ resposta: completion.choices[0].message.content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/explicar", async (req, res) => {
    try {
      const { conceito, contexto } = req.body;
      const empresa = req.session?.empresaId ? await storage.getEmpresa(req.session.empresaId) : null;
      
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa?.planoTipo, "padrao"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é um mentor de negócios que explica conceitos estratégicos de forma simples e acessível, como se estivesse conversando com alguém que não tem experiência em planejamento estratégico. Use exemplos práticos e linguagem do dia a dia.`
          },
          {
            role: "user",
            content: `Explique em até 3 parágrafos curtos: ${conceito}${contexto ? `\n\nContexto: ${contexto}` : ""}`
          }
        ]),
        temperature: 0.7,
      });

      const explicacao = completion.choices[0].message.content;
      res.json({ explicacao });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ESTRATEGIAS ====================

  app.get("/api/estrategias", async (req, res) => {
    try {
      const estrategias = await storage.getEstrategias(req.session.empresaId!);
      res.json(estrategias);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/estrategias", async (req, res) => {
    try {
      const data = insertEstrategiaSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const estrategia = await storage.createEstrategia(data);
      res.json(estrategia);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/estrategias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertEstrategiaSchema.partial().parse(req.body));
      const estrategia = await storage.updateEstrategia(id, req.session.empresaId!, data);
      res.json(estrategia);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/estrategias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEstrategia(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-estrategias", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const swotExistente = await storage.getAnaliseSwot(empresaId);
      const estrategiasExistentes = await storage.getEstrategias(empresaId);

      const forcas = swotExistente.filter(s => s.tipo === "forca").map(s => s.descricao);
      const fraquezas = swotExistente.filter(s => s.tipo === "fraqueza").map(s => s.descricao);
      const oportunidades = swotExistente.filter(s => s.tipo === "oportunidade").map(s => s.descricao);
      const ameacas = swotExistente.filter(s => s.tipo === "ameaca").map(s => s.descricao);

      const estrategiasResume = estrategiasExistentes.map(e => 
        `- ${e.tipo}: ${e.titulo}\n  Descrição: ${e.descricao}`
      ).join("\n\n");

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em matriz TOWS (SWOT Cruzada). Sua missão é criar estratégias práticas e acionáveis combinando elementos internos e externos. Use sempre linguagem simples e direta, sem jargões técnicos.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Você DEVE analisar cuidadosamente todas as estratégias já existentes listadas na seção "ESTRATÉGIAS JÁ EXISTENTES"
- NUNCA crie estratégias que sejam semelhantes, parecidas ou que abordem os mesmos temas das estratégias existentes
- Cada nova estratégia PRECISA ser única, inovadora e diferente de todas as anteriores
- Se você sugerir algo muito parecido com o que já existe, está violando esta regra crítica`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA
${contextoPerfil}

## ANÁLISE SWOT EXISTENTE:

### FORÇAS (Internas - Positivo):
${forcas.length > 0 ? forcas.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Nenhuma força identificada"}

### FRAQUEZAS (Internas - Negativo):
${fraquezas.length > 0 ? fraquezas.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Nenhuma fraqueza identificada"}

### OPORTUNIDADES (Externas - Positivo):
${oportunidades.length > 0 ? oportunidades.map((o, i) => `${i + 1}. ${o}`).join("\n") : "Nenhuma oportunidade identificada"}

### AMEAÇAS (Externas - Negativo):
${ameacas.length > 0 ? ameacas.map((a, i) => `${i + 1}. ${a}`).join("\n") : "Nenhuma ameaça identificada"}

## ESTRATÉGIAS JÁ EXISTENTES (NÃO REPITA NENHUMA DELAS):
${estrategiasExistentes.length > 0 ? estrategiasResume : "Nenhuma estratégia criada ainda - esta é a primeira geração"}

${estrategiasExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${estrategiasExistentes.length} estratégia(s) cadastrada(s) acima.
Suas novas sugestões DEVEM ser completamente diferentes e abordar aspectos não cobertos pelas estratégias existentes.
Analise cada estratégia existente antes de sugerir algo novo.
` : ''}

## TAREFA:
Com base na matriz TOWS, crie EXATAMENTE 4 novas estratégias ÚNICAS e DIFERENTES, uma de cada tipo:

1. **FO (Ofensiva/Maxi-Maxi)**: Combine uma FORÇA com uma OPORTUNIDADE
2. **FA (Confronto/Maxi-Mini)**: Combine uma FORÇA para neutralizar uma AMEAÇA
3. **DO (Reorientação/Mini-Maxi)**: Supere uma FRAQUEZA aproveitando uma OPORTUNIDADE
4. **DA (Defensiva/Mini-Mini)**: Minimize uma FRAQUEZA e evite uma AMEAÇA

Para cada estratégia, forneça:
- tipo: "FO", "FA", "DO" ou "DA"
- titulo: Um título objetivo (máx 80 caracteres)
- descricao: Descrição detalhada da estratégia (2-3 frases)
- prioridade: "alta", "média" ou "baixa"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "estrategias": [
    {"tipo": "FO", "titulo": "...", "descricao": "...", "prioridade": "alta"},
    {"tipo": "FA", "titulo": "...", "descricao": "...", "prioridade": "alta"},
    {"tipo": "DO", "titulo": "...", "descricao": "...", "prioridade": "média"},
    {"tipo": "DA", "titulo": "...", "descricao": "...", "prioridade": "baixa"}
  ]
}`
          }
        ]),
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== OPORTUNIDADES CRESCIMENTO ====================

  app.get("/api/oportunidades-crescimento", async (req, res) => {
    try {
      const oportunidades = await storage.getOportunidadesCrescimento(req.session.empresaId!);
      res.json(oportunidades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/oportunidades-crescimento", async (req, res) => {
    try {
      const data = insertOportunidadeCrescimentoSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const oportunidade = await storage.createOportunidadeCrescimento(data);
      res.json(oportunidade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/oportunidades-crescimento/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertOportunidadeCrescimentoSchema.partial().parse(req.body));
      const oportunidade = await storage.updateOportunidadeCrescimento(id, req.session.empresaId!, data);
      res.json(oportunidade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/oportunidades-crescimento/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteOportunidadeCrescimento(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-oportunidades-crescimento", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const oportunidadesExistentes = await storage.getOportunidadesCrescimento(empresaId);
      const swotExistente = await storage.getAnaliseSwot(empresaId);

      const forcas = swotExistente.filter(s => s.tipo === "forca").map(s => s.descricao);
      const oportunidades = swotExistente.filter(s => s.tipo === "oportunidade").map(s => s.descricao);

      const oportunidadesResume = oportunidadesExistentes.map(o => 
        `- ${o.tipo}: ${o.titulo}\n  Descrição: ${o.descricao}`
      ).join("\n\n");

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em Matriz de Ansoff. Sua missão é identificar oportunidades de crescimento práticas e acionáveis. Use sempre linguagem simples e direta, sem jargões técnicos. Considere também o cenário macroeconômico atual presente no system message (quando disponível) para identificar oportunidades alinhadas ao contexto econômico brasileiro.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Você DEVE analisar cuidadosamente todas as oportunidades já existentes listadas na seção "OPORTUNIDADES JÁ EXISTENTES"
- NUNCA crie oportunidades que sejam semelhantes, parecidas ou que abordem os mesmos temas das oportunidades existentes
- Cada nova oportunidade PRECISA ser única, inovadora e diferente de todas as anteriores
- Se você sugerir algo muito parecido com o que já existe, está violando esta regra crítica`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA
${contextoPerfil}

## CONTEXTO ESTRATÉGICO (SWOT):

### FORÇAS:
${forcas.length > 0 ? forcas.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Nenhuma força identificada"}

### OPORTUNIDADES DE MERCADO:
${oportunidades.length > 0 ? oportunidades.map((o, i) => `${i + 1}. ${o}`).join("\n") : "Nenhuma oportunidade identificada"}

## OPORTUNIDADES JÁ EXISTENTES (NÃO REPITA NENHUMA DELAS):
${oportunidadesExistentes.length > 0 ? oportunidadesResume : "Nenhuma oportunidade criada ainda - esta é a primeira geração"}

${oportunidadesExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${oportunidadesExistentes.length} oportunidade(s) cadastrada(s) acima.
Suas novas sugestões DEVEM ser completamente diferentes e abordar aspectos não cobertos pelas oportunidades existentes.
Analise cada oportunidade existente antes de sugerir algo novo.
` : ''}

## TAREFA:
Com base na Matriz de Ansoff, crie EXATAMENTE 4 novas oportunidades de crescimento ÚNICAS e DIFERENTES, uma de cada tipo:

1. **penetracao_mercado**: Aumentar participação no mercado atual com produtos/serviços atuais (menor risco)
2. **desenvolvimento_mercado**: Levar produtos/serviços atuais para novos mercados ou segmentos
3. **desenvolvimento_produto**: Criar novos produtos/serviços para os mercados atuais
4. **diversificacao**: Novos produtos/serviços para novos mercados (maior risco)

Para cada oportunidade, forneça:
- tipo: "penetracao_mercado", "desenvolvimento_mercado", "desenvolvimento_produto" ou "diversificacao"
- titulo: Um título objetivo (máx 80 caracteres)
- descricao: Descrição detalhada da oportunidade (2-3 frases)
- potencial: Potencial de crescimento - "alto", "médio" ou "baixo"
- risco: Nível de risco associado - "alto", "médio" ou "baixo"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "oportunidades": [
    {"tipo": "penetracao_mercado", "titulo": "...", "descricao": "...", "potencial": "alto", "risco": "baixo"},
    {"tipo": "desenvolvimento_mercado", "titulo": "...", "descricao": "...", "potencial": "alto", "risco": "médio"},
    {"tipo": "desenvolvimento_produto", "titulo": "...", "descricao": "...", "potencial": "médio", "risco": "médio"},
    {"tipo": "diversificacao", "titulo": "...", "descricao": "...", "potencial": "alto", "risco": "alto"}
  ]
}`
          }
        ]),
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== INICIATIVAS ====================

  app.get("/api/iniciativas", async (req, res) => {
    try {
      const iniciativas = await storage.getIniciativas(req.session.empresaId!);
      res.json(iniciativas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/iniciativas", async (req, res) => {
    try {
      const data = insertIniciativaSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const iniciativa = await storage.createIniciativa(data);
      res.json(iniciativa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/iniciativas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertIniciativaSchema.partial().parse(req.body));
      const iniciativa = await storage.updateIniciativa(id, req.session.empresaId!, data);
      res.json(iniciativa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/iniciativas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIniciativa(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-iniciativas", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const iniciativasExistentes = await storage.getIniciativas(empresaId);
      const estrategiasLista = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);

      const iniciativasResume = iniciativasExistentes.map(i => 
        `- ${i.titulo}\n  Descrição: ${i.descricao}\n  Status: ${i.status} | Prioridade: ${i.prioridade}`
      ).join("\n\n");

      const estrategiasResume = estrategiasLista.map(e => `${e.tipo}: ${e.titulo}`).join("\n");
      const oportunidadesResume = oportunidades.map(o => `${o.tipo}: ${o.titulo}`).join("\n");

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em gestão de portfólio de projetos. Sua missão é identificar iniciativas prioritárias práticas e acionáveis para executar a estratégia. Use sempre linguagem simples e direta, sem jargões técnicos.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Você DEVE analisar cuidadosamente todas as iniciativas já existentes listadas na seção "INICIATIVAS JÁ EXISTENTES"
- NUNCA crie iniciativas que sejam semelhantes, parecidas ou que abordem os mesmos temas das iniciativas existentes
- Cada nova iniciativa PRECISA ser única, inovadora e diferente de todas as anteriores
- Se você sugerir algo muito parecido com o que já existe, está violando esta regra crítica`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA
${contextoPerfil}

## CONTEXTO ESTRATÉGICO:

### ESTRATÉGIAS DEFINIDAS:
${estrategiasLista.length > 0 ? estrategiasResume : "Nenhuma estratégia definida"}

### OPORTUNIDADES DE CRESCIMENTO:
${oportunidades.length > 0 ? oportunidadesResume : "Nenhuma oportunidade identificada"}

## INICIATIVAS JÁ EXISTENTES (NÃO REPITA NENHUMA DELAS):
${iniciativasExistentes.length > 0 ? iniciativasResume : "Nenhuma iniciativa criada ainda - esta é a primeira geração"}

${iniciativasExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${iniciativasExistentes.length} iniciativa(s) cadastrada(s) acima.
Suas novas sugestões DEVEM ser completamente diferentes e abordar aspectos não cobertos pelas iniciativas existentes.
Analise cada iniciativa existente antes de sugerir algo novo.
` : ''}

## TAREFA:
Com base nas estratégias e oportunidades identificadas, crie EXATAMENTE 5 novas iniciativas prioritárias ÚNICAS e DIFERENTES para executar a estratégia.

Para cada iniciativa, forneça:
- titulo: Um título claro e objetivo (máx 80 caracteres)
- descricao: Descrição detalhada da iniciativa e seus objetivos (2-3 frases)
- status: "planejada", "em_andamento", "concluida" ou "pausada" (todas devem começar como "planejada")
- prioridade: "alta", "média" ou "baixa" (distribua entre as 5)
- prazo: Prazo em formato "Q1 2025", "Q2 2025", etc
- responsavel: Área ou cargo responsável (ex: "Gerente Comercial", "Time de Marketing")
- impacto: Impacto esperado - "alto", "médio" ou "baixo"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "iniciativas": [
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "alta", "prazo": "Q1 2025", "responsavel": "...", "impacto": "alto"},
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "alta", "prazo": "Q2 2025", "responsavel": "...", "impacto": "alto"},
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "média", "prazo": "Q2 2025", "responsavel": "...", "impacto": "médio"},
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "média", "prazo": "Q3 2025", "responsavel": "...", "impacto": "médio"},
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "baixa", "prazo": "Q4 2025", "responsavel": "...", "impacto": "baixo"}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (sugestoes.iniciativas && Array.isArray(sugestoes.iniciativas)) {
        const seenTitles = new Set(
          iniciativasExistentes.map(i => i.titulo.toLowerCase().trim())
        );
        
        sugestoes.iniciativas = sugestoes.iniciativas.filter((iniciativa: any) => {
          const titulo = iniciativa.titulo?.toLowerCase().trim();
          if (!titulo || seenTitles.has(titulo)) {
            return false;
          }
          seenTitles.add(titulo);
          return true;
        });
      }
      
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-objetivos", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;
      const { perspectiva: perspectivaSolicitada } = req.body;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const objetivosExistentes = await storage.getObjetivos(empresaId);
      const estrategiasLista = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);
      const iniciativas = await storage.getIniciativas(empresaId);

      const estrategiasResume = estrategiasLista.map(e => `${e.tipo}: ${e.titulo} - ${e.descricao}`).join("\n");
      const oportunidadesResume = oportunidades.map(o => `${o.tipo}: ${o.titulo} - ${o.descricao}`).join("\n");
      const iniciativasResume = iniciativas.map(i => `${i.titulo} (Prioridade: ${i.prioridade})`).join("\n");

      const definicoesPerspectivasBSC: Record<string, { definicao: string; exemplos: string }> = {
        "Financeira": {
          definicao: "Objetivos EXCLUSIVAMENTE sobre desempenho financeiro: receita, lucro, margem, custos, EBITDA, retorno sobre investimento, redução de dívidas, fluxo de caixa, rentabilidade.",
          exemplos: "Exemplos CORRETOS de objetivos Financeiros:\n- Aumentar a margem de lucro líquida\n- Reduzir os custos operacionais\n- Crescer o faturamento total\n- Melhorar o fluxo de caixa\n- Reduzir o endividamento\n- Aumentar o retorno sobre o investimento (ROI)\n\nExemplos INCORRETOS (NÃO usar para perspectiva Financeira):\n- Lançar novos produtos (isso é Processos Internos)\n- Aumentar satisfação de clientes (isso é Clientes)\n- Capacitar equipe (isso é Aprendizado)"
        },
        "Clientes": {
          definicao: "Objetivos EXCLUSIVAMENTE sobre relacionamento com clientes: satisfação, fidelização, aquisição, retenção, NPS, experiência de compra, participação de mercado, valor percebido pelo cliente.",
          exemplos: "Exemplos CORRETOS de objetivos de Clientes:\n- Aumentar a satisfação e fidelização dos clientes\n- Expandir base de clientes em novos segmentos\n- Melhorar o NPS (Net Promoter Score)\n- Reduzir a taxa de cancelamento/churn\n- Fortalecer o posicionamento de marca\n- Aumentar participação de mercado\n\nExemplos INCORRETOS (NÃO usar para perspectiva Clientes):\n- Reduzir custos (isso é Financeira)\n- Melhorar processos internos (isso é Processos Internos)"
        },
        "Processos Internos": {
          definicao: "Objetivos EXCLUSIVAMENTE sobre operações e processos internos: eficiência, qualidade, produtividade, tempo de ciclo, inovação de produtos/serviços, desenvolvimento de novos produtos, cadeia de suprimentos.",
          exemplos: "Exemplos CORRETOS de objetivos de Processos Internos:\n- Reduzir o tempo de entrega de pedidos\n- Melhorar a qualidade dos produtos e serviços\n- Aumentar a eficiência produtiva\n- Lançar novas linhas de produtos\n- Desenvolver processo de inovação contínua\n- Modernizar a cadeia de suprimentos\n\nExemplos INCORRETOS (NÃO usar para Processos Internos):\n- Aumentar faturamento (isso é Financeira)\n- Melhorar satisfação do cliente (isso é Clientes)"
        },
        "Aprendizado e Crescimento": {
          definicao: "Objetivos EXCLUSIVAMENTE sobre capital humano e organizacional: capacitação de pessoas, desenvolvimento de competências, cultura organizacional, tecnologia da informação, gestão do conhecimento.",
          exemplos: "Exemplos CORRETOS de objetivos de Aprendizado e Crescimento:\n- Desenvolver competências técnicas e comerciais da equipe\n- Fortalecer a cultura de inovação e melhoria contínua\n- Implementar ferramentas digitais para gestão\n- Aumentar o engajamento e retenção de talentos\n- Desenvolver programa estruturado de lideranças\n- Criar base de conhecimento institucional\n\nExemplos INCORRETOS (NÃO usar para Aprendizado):\n- Aumentar lucro (isso é Financeira)\n- Lançar produtos (isso é Processos Internos)"
        }
      };

      const gerarParaPerspectiva = async (perspectiva: string) => {
        const def = definicoesPerspectivasBSC[perspectiva];
        const objetivosDestaPerspectiva = objetivosExistentes.filter(o => o.perspectiva === perspectiva);
        const objetivosResume = objetivosDestaPerspectiva.map(o => `- ${o.titulo}`).join("\n");

        const completion = await openai.chat.completions.create({
          model: getModelForPlan(empresa.planoTipo, "relatorios"),
          messages: [
            {
              role: "system",
              content: `Você é um consultor especializado em Balanced Scorecard (BSC). Sua ÚNICA tarefa agora é criar objetivos para a perspectiva "${perspectiva}".

DEFINIÇÃO DESTA PERSPECTIVA:
${def.definicao}

${def.exemplos}

REGRA ABSOLUTA: Todo objetivo que você criar DEVE pertencer exclusivamente à perspectiva "${perspectiva}". Se o objetivo não se encaixa perfeitamente nessa perspectiva, NÃO o inclua.

REGRA DE DUPLICAÇÃO: Nunca repita objetivos já existentes listados pelo usuário.`
            },
            {
              role: "user",
              content: `## PERFIL DA EMPRESA
${contextoPerfil}

## CONTEXTO ESTRATÉGICO:
${estrategiasLista.length > 0 ? `Estratégias:\n${estrategiasResume}` : ""}
${oportunidades.length > 0 ? `\nOportunidades de crescimento:\n${oportunidadesResume}` : ""}
${iniciativas.length > 0 ? `\nIniciativas prioritárias:\n${iniciativasResume}` : ""}

## OBJETIVOS JÁ EXISTENTES NA PERSPECTIVA "${perspectiva}" (NÃO REPITA):
${objetivosDestaPerspectiva.length > 0 ? objetivosResume : "Nenhum ainda"}

## TAREFA:
Crie EXATAMENTE 1 objetivo estratégico para a perspectiva "${perspectiva}" desta empresa.

O objetivo deve:
- ser qualitativo e aspiracional (sem números no título)
- refletir claramente a perspectiva "${perspectiva}"
- ser relevante para o setor e contexto desta empresa
- ser diferente dos já existentes

Responda em JSON:
{
  "objetivo": {
    "titulo": "...",
    "descricao": "...",
    "prazo": "Anual 2025",
    "perspectiva": "${perspectiva}"
  }
}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.8,
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return result.objetivo || null;
      };

      const todasPerspectivas = ["Financeira", "Clientes", "Processos Internos", "Aprendizado e Crescimento"];
      const seenTitles = new Set(objetivosExistentes.map(o => o.titulo.toLowerCase().trim()));

      let objetivosGerados: any[] = [];

      if (perspectivaSolicitada && todasPerspectivas.includes(perspectivaSolicitada)) {
        const objetivo = await gerarParaPerspectiva(perspectivaSolicitada);
        if (objetivo && objetivo.titulo) {
          const titulo = objetivo.titulo.toLowerCase().trim();
          if (!seenTitles.has(titulo)) {
            objetivosGerados = [{ ...objetivo, perspectiva: perspectivaSolicitada }];
          }
        }
      } else {
        const resultados = await Promise.all(todasPerspectivas.map(p => gerarParaPerspectiva(p)));
        objetivosGerados = resultados
          .filter((obj): obj is NonNullable<typeof obj> => obj !== null && !!obj.titulo)
          .filter(obj => {
            const titulo = obj.titulo.toLowerCase().trim();
            if (seenTitles.has(titulo)) return false;
            seenTitles.add(titulo);
            return true;
          })
          .map((obj, idx) => ({ ...obj, perspectiva: obj.perspectiva || todasPerspectivas[idx] }));
      }

      res.json({ objetivos: objetivosGerados });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-resultados-chave", async (req, res) => {
    try {
      const { objetivoId } = req.body;
      const empresaId = req.session.empresaId!;
      
      if (!objetivoId) {
        return res.status(400).json({ error: "objetivoId é obrigatório" });
      }

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const objetivosList = await storage.getObjetivos(empresaId);
      const objetivo = objetivosList.find(o => o.id === objetivoId);
      
      if (!objetivo) {
        return res.status(404).json({ error: "Objetivo não encontrado" });
      }

      const resultadosExistentes = await storage.getResultadosChave(objetivoId, empresaId);
      const estrategiasLista = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);
      const iniciativas = await storage.getIniciativas(empresaId);

      const resultadosResume = resultadosExistentes.map(r => 
        `- ${r.metrica}\n  Inicial: ${r.valorInicial}, Alvo: ${r.valorAlvo}, Atual: ${r.valorAtual}\n  Owner: ${r.owner}, Prazo: ${r.prazo}`
      ).join("\n\n");

      const estrategiasResume = estrategiasLista.map(e => `${e.tipo}: ${e.titulo}`).join("\n");
      const oportunidadesResume = oportunidades.map(o => `${o.tipo}: ${o.titulo}`).join("\n");
      const iniciativasResume = iniciativas.map(i => i.titulo).join("\n");

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em OKRs (Objectives and Key Results). Sua missão é criar resultados-chave mensuráveis e específicos que demonstrem o sucesso do objetivo estratégico. Use linguagem simples, sem jargões.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Analise TODOS os resultados-chave já existentes para este objetivo
- NUNCA crie resultados similares ou que meçam as mesmas métricas
- Cada resultado-chave DEVE ser único e medir algo diferente
- Se você sugerir algo muito parecido com o que já existe, está VIOLANDO esta regra`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA
${contextoPerfil}

## OBJETIVO ESTRATÉGICO:
"${objetivo.titulo}"
${objetivo.descricao ? `Descrição: ${objetivo.descricao}` : ''}
Prazo: ${objetivo.prazo}

## CONTEXTO DAS APOSTAS ESTRATÉGICAS:

### ESTRATÉGIAS (TOWS):
${estrategiasLista.length > 0 ? estrategiasResume : "Nenhuma estratégia definida"}

### OPORTUNIDADES DE CRESCIMENTO (Ansoff):
${oportunidades.length > 0 ? oportunidadesResume : "Nenhuma oportunidade identificada"}

### INICIATIVAS PRIORITÁRIAS:
${iniciativas.length > 0 ? iniciativasResume : "Nenhuma iniciativa definida"}

## RESULTADOS-CHAVE JÁ EXISTENTES (NÃO REPITA):
${resultadosExistentes.length > 0 ? resultadosResume : "Nenhum resultado-chave criado ainda"}

${resultadosExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${resultadosExistentes.length} resultado(s)-chave. 
Suas sugestões DEVEM medir aspectos DIFERENTES e complementares.
` : ''}

## TAREFA:
Crie EXATAMENTE 3 resultados-chave ÚNICOS e mensuráveis para este objetivo.

Cada resultado-chave deve:
- metrica: Nome claro da métrica (ex: "Margem bruta", "Taxa de retenção de clientes", "Tempo médio de entrega")
- valorInicial: Valor atual/inicial em número decimal (ex: 38.5 para 38,5%, 12.3 para 12,3 dias)
- valorAlvo: Meta a atingir em número decimal (ex: 42.0 para 42%, 10.0 para 10 dias)
- valorAtual: Valor atual (mesmo que valorInicial no início)
- owner: Cargo/área responsável (ex: "CFO", "Gerente Comercial", "Coordenador de Logística")
- prazo: Horizonte temporal (ex: "Q4 2025", "Dez 2025", "Jun 2026")

IMPORTANTE sobre valores:
- Use números decimais simples (38.5, não "38,5%")
- Valores representam % se a métrica mencionar taxa/margem/percentual
- Valores representam dias/horas/R$ conforme a métrica indicar
- Sempre use . (ponto) como separador decimal, nunca vírgula
- Exemplo correto: valorInicial: 38.5, valorAlvo: 42.0
- Exemplo errado: valorInicial: "38,5%", valorAlvo: "42%"

Os resultados-chave devem ser:
✓ Específicos e mensuráveis com números
✓ Alinhados com o objetivo e as apostas estratégicas
✓ Diferentes entre si (medem coisas distintas)
✓ Realistas mas desafiadores

Responda em JSON:
{
  "resultados": [
    {"metrica": "...", "valorInicial": 38.5, "valorAlvo": 42.0, "valorAtual": 38.5, "owner": "...", "prazo": "Q4 2025"},
    {"metrica": "...", "valorInicial": 3.2, "valorAlvo": 2.0, "valorAtual": 3.2, "owner": "...", "prazo": "Dez 2025"},
    {"metrica": "...", "valorInicial": 45.0, "valorAlvo": 70.0, "valorAtual": 45.0, "owner": "...", "prazo": "Q2 2026"}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (sugestoes.resultados && Array.isArray(sugestoes.resultados)) {
        const seenMetricas = new Set(
          resultadosExistentes.map(r => r.metrica.toLowerCase().trim())
        );
        
        sugestoes.resultados = sugestoes.resultados.filter((resultado: any) => {
          const metrica = resultado.metrica?.toLowerCase().trim();
          if (!metrica || seenMetricas.has(metrica)) {
            return false;
          }
          seenMetricas.add(metrica);
          return true;
        });
      }
      
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== AI: GERAR DESCRIÇÃO DA EMPRESA ====================

  app.post("/api/ai/gerar-descricao-empresa", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;
      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const bodySchema = z.object({
        website: z.string().min(1).max(2048).optional(),
      });
      const bodyParsed = bodySchema.safeParse(req.body);
      if (!bodyParsed.success) {
        return res.status(400).json({ error: "Dados inválidos na requisição." });
      }

      const rawWebsite: string = bodyParsed.data.website || empresa.website || "";
      if (!rawWebsite) {
        return res.status(400).json({ error: "Informe o endereço do website da empresa." });
      }

      const stripped = rawWebsite.trim();
      const hasProtocol = stripped.startsWith("http://") || stripped.startsWith("https://");
      // Prefer https, but keep track so we can fall back to http on connection failure
      const websiteHttps = hasProtocol ? stripped : "https://" + stripped;
      const websiteHttp  = hasProtocol ? stripped : "http://"  + stripped;

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(websiteHttps);
      } catch {
        return res.status(400).json({ error: "Endereço de website inválido. Verifique o formato (ex: www.empresa.com.br)." });
      }

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return res.status(400).json({ error: "Apenas endereços http e https são suportados." });
      }

      let conteudoSite = "";
      try {
        // Try https first; if it fails with a connection/TLS error (and the user
        // did not explicitly specify a protocol), fall back to http.
        let html: string;
        try {
          html = await ssrfSafeFetch(websiteHttps);
        } catch (firstErr: any) {
          const isConnectionError = firstErr.code !== "SSRF_BLOCKED" &&
            firstErr.name !== "AbortError" && !hasProtocol;
          if (!isConnectionError) throw firstErr;
          // Retry with plain http
          html = await ssrfSafeFetch(websiteHttp);
        }
        // Follow meta http-equiv="refresh" redirects (not handled by native fetch)
        // Check raw HTML for the redirect before loading cheerio
        const metaRefreshMatch = html.match(/<meta[^>]+http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+http-equiv\s*=\s*["']refresh["']/i);
        if (metaRefreshMatch) {
          const urlMatch = metaRefreshMatch[1].match(/url\s*=\s*['"]?([^'";\s]+)/i);
          if (urlMatch) {
            let refreshUrl = urlMatch[1].trim();
            if (!refreshUrl.startsWith("http://") && !refreshUrl.startsWith("https://")) {
              const base = new URL(websiteHttps);
              refreshUrl = refreshUrl.startsWith("/") ? base.origin + refreshUrl : base.origin + "/" + refreshUrl;
            }
            try {
              html = await ssrfSafeFetch(refreshUrl);
            } catch {
              // If refresh URL fails, continue with original content
            }
          }
        }

        const $ = cheerio.load(html);

        $("script, style, noscript, nav, footer, [aria-hidden='true'], .cookie-banner, #cookie-consent, .popup, .modal").remove();

        // Extract JSON-LD structured data (Organization, LocalBusiness, WebSite, etc.)
        let jsonLdText = "";
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const raw = $(el).html() || "";
            const data = JSON.parse(raw);
            const graphs: any[] = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
            for (const node of graphs) {
              const type = node["@type"] || "";
              if (/organization|localbusiness|company|corporation|store/i.test(type)) {
                const parts = [
                  node.name ? `Nome: ${node.name}` : "",
                  node.description ? `Descrição: ${node.description}` : "",
                  node.slogan ? `Slogan: ${node.slogan}` : "",
                  node.foundingDate ? `Fundação: ${node.foundingDate}` : "",
                  node.numberOfEmployees?.value ? `Funcionários: ${node.numberOfEmployees.value}` : "",
                  node.address?.addressLocality ? `Cidade: ${node.address.addressLocality}` : "",
                  node.address?.addressRegion ? `Estado: ${node.address.addressRegion}` : "",
                  node.areaServed ? `Área de atuação: ${typeof node.areaServed === "string" ? node.areaServed : JSON.stringify(node.areaServed)}` : "",
                ].filter(Boolean).join(" | ");
                if (parts) jsonLdText += parts + "\n";
              }
              if (/webpage|website/i.test(type) && node.name) {
                jsonLdText += `Página: ${node.name}\n`;
              }
            }
          } catch {
            // Ignore malformed JSON-LD
          }
        });

        const title = $("title").text().trim();
        const metaDesc =
          $('meta[name="description"]').attr("content") ||
          $('meta[property="og:description"]').attr("content") ||
          $('meta[name="og:description"]').attr("content") ||
          "";
        const metaKeywords = $('meta[name="keywords"]').attr("content") || "";
        const ogTitle = $('meta[property="og:title"]').attr("content") || "";

        const h1s = $("h1")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .slice(0, 5)
          .join(" | ");
        const h2s = $("h2")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .slice(0, 10)
          .join(" | ");
        const h3s = $("h3")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean)
          .slice(0, 12)
          .join(" | ");

        // Extract text from paragraphs (lowered threshold for short but useful content)
        const paragrafos = $("p")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((t) => t.length > 20)
          .slice(0, 30)
          .join("\n");

        // Extract text from list items (products, services, features)
        const liItems = $("li")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((t) => t.length > 10 && t.length < 300)
          .slice(0, 30)
          .join(" | ");

        // Extract text from article/main/section semantic elements not already covered
        const semanticText = $("article, main, section, .about, .sobre, #about, #sobre, [class*='about'], [class*='sobre'], [class*='company'], [class*='empresa']")
          .map((_, el) => {
            // Get direct text without child headings (already captured) or scripts
            const clone = $(el).clone();
            clone.find("script, style, h1, h2, h3").remove();
            return clone.text().replace(/\s+/g, " ").trim();
          })
          .get()
          .filter((t) => t.length > 30)
          .slice(0, 10)
          .join("\n");

        conteudoSite = [
          title ? `Título: ${title}` : "",
          ogTitle && ogTitle !== title ? `Título OG: ${ogTitle}` : "",
          metaDesc ? `Descrição: ${metaDesc}` : "",
          metaKeywords ? `Palavras-chave: ${metaKeywords}` : "",
          jsonLdText ? `Dados estruturados:\n${jsonLdText}` : "",
          h1s ? `H1: ${h1s}` : "",
          h2s ? `H2: ${h2s}` : "",
          h3s ? `H3: ${h3s}` : "",
          paragrafos ? `Parágrafos:\n${paragrafos}` : "",
          liItems ? `Itens de lista: ${liItems}` : "",
          semanticText ? `Conteúdo semântico:\n${semanticText}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 10000);

        // If main page doesn't have enough text, try known subpages
        if (conteudoSite.length < 500) {
          const baseOrigin = new URL(websiteHttps).origin;
          const subpages = ["/sobre", "/sobre-nos", "/quem-somos", "/empresa", "/about", "/about-us", "/a-empresa", "/institucional"];
          for (const path of subpages) {
            try {
              const subUrl = baseOrigin + path;
              const subHtml = await ssrfSafeFetch(subUrl);
              const $2 = cheerio.load(subHtml);
              $2("script, style, noscript, nav, footer").remove();
              const subText = $2("p, li, article, section, main")
                .map((_, el) => $2(el).text().trim())
                .get()
                .filter((t) => t.length > 20)
                .slice(0, 30)
                .join("\n");
              if (subText.length > 200) {
                conteudoSite += `\n\n--- Página: ${path} ---\n${subText}`.slice(0, 10000);
                break;
              }
            } catch {
              // Subpage not found or inaccessible, continue
            }
          }
        }
      } catch (fetchErr: any) {
        if (fetchErr.code === "SSRF_BLOCKED") {
          return res.status(400).json({
            error: "Endereço de website inválido. Use um site público acessível pela internet.",
          });
        }
        if (fetchErr.name === "AbortError") {
          return res.status(408).json({
            error: "Timeout ao acessar o site. Verifique se o endereço está correto e o site está acessível.",
          });
        }
        return res.status(502).json({
          error: `Não foi possível acessar o site: ${fetchErr.message}. Verifique o endereço e tente novamente.`,
        });
      }

      if (!conteudoSite.trim()) {
        return res.status(422).json({
          error:
            "O site não retornou conteúdo legível suficiente. Isso pode ocorrer quando o site usa JavaScript para renderizar o conteúdo (React/Vue/Angular). Tente preencher manualmente ou use a URL de uma página com conteúdo estático (ex: /sobre ou /quem-somos).",
        });
      }

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: [
          {
            role: "system",
            content: `Você é um consultor de negócios especialista em estratégia empresarial. 
Com base no conteúdo extraído do site da empresa, escreva uma DESCRIÇÃO COMPLETA E PROFISSIONAL da empresa em português do Brasil.

A descrição deve incluir (quando disponível no conteúdo do site):
- O que a empresa faz (produtos/serviços)
- Para quem atende (público-alvo, segmentos de mercado)
- Diferenciais competitivos e proposta de valor
- Setor de atuação e posicionamento de mercado
- Missão, visão ou valores (se mencionados)
- Tamanho/porte aproximado (se mencionado)
- Localização/abrangência (se mencionado)

REGRAS:
- Escreva em parágrafo(s) corrido(s), sem listas ou bullet points
- Use linguagem profissional mas clara
- Seja específico e rico em detalhes relevantes
- Mínimo de 150 palavras, máximo de 400 palavras
- NÃO mencione que o texto foi gerado por IA
- NÃO inclua informações que não estejam no conteúdo fornecido`,
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}
Website: ${websiteHttps}

CONTEÚDO EXTRAÍDO DO SITE:
${conteudoSite}

Gere uma descrição completa e profissional desta empresa.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 600,
      });

      const descricao = completion.choices[0].message.content?.trim() || "";
      res.json({ descricao });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-indicadores", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const indicadoresExistentes = await storage.getIndicadores(empresaId);
      const estrategiasLista = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);
      const iniciativas = await storage.getIniciativas(empresaId);
      const objetivosList = await storage.getObjetivos(empresaId);

      const indicadoresResume = indicadoresExistentes.map(i => 
        `[${i.perspectiva}] ${i.nome} - Owner: ${i.owner}`
      ).join("\n");

      const estrategiasResume = estrategiasLista.map(e => `${e.tipo}: ${e.titulo}`).join("\n");
      const oportunidadesResume = oportunidades.map(o => `${o.tipo}: ${o.titulo}`).join("\n");
      const iniciativasResume = iniciativas.map(i => i.titulo).join("\n");
      const objetivosResume = objetivosList.map(o => o.titulo).join("\n");

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: [
          {
            role: "system",
            content: `Você é um consultor especializado em Balanced Scorecard (BSC) e KPIs. Sua missão é criar indicadores de desempenho equilibrados nas 4 perspectivas do BSC que ajudem a monitorar a execução da estratégia. Use linguagem simples.

REGRA CRÍTICA:
- Analise TODOS os indicadores existentes
- NUNCA crie indicadores duplicados ou muito similares
- Cada indicador DEVE ser único
- Distribua entre as 4 perspectivas: Finanças, Clientes, Processos, Pessoas`
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA
${contextoPerfil}

## CONTEXTO ESTRATÉGICO:

### OBJETIVOS ESTRATÉGICOS:
${objetivosList.length > 0 ? objetivosResume : "Nenhum objetivo definido"}

### ESTRATÉGIAS:
${estrategiasLista.length > 0 ? estrategiasResume : "Nenhuma estratégia"}

### OPORTUNIDADES:
${oportunidades.length > 0 ? oportunidadesResume : "Nenhuma oportunidade"}

### INICIATIVAS:
${iniciativas.length > 0 ? iniciativasResume : "Nenhuma iniciativa"}

## INDICADORES JÁ EXISTENTES (NÃO REPITA):
${indicadoresExistentes.length > 0 ? indicadoresResume : "Nenhum indicador criado"}

${indicadoresExistentes.length > 0 ? `
⚠️ ${indicadoresExistentes.length} indicador(es) já existe(m). Crie indicadores DIFERENTES.
` : ''}

## TAREFA:
Crie EXATAMENTE 8 indicadores BSC ÚNICOS (2 por perspectiva).

Para cada indicador:
- perspectiva: "Finanças", "Clientes", "Processos" ou "Pessoas"
- nome: Nome claro do indicador (ex: "Margem de Lucro Líquido", "Taxa de Retenção de Clientes")
- meta: Meta em formato texto (ex: "R$ 500 mil", "85%", "< 15 dias") - SEM valores numéricos hardcoded, use placeholders realistas
- atual: Valor atual (mesmo formato da meta, pode ser "A definir" se não souber)
- status: "verde", "amarelo" ou "vermelho" (distribua de forma realista)
- owner: Cargo/área responsável (ex: "CFO", "Gerente Comercial", "RH")

Responda em JSON:
{
  "indicadores": [
    {"perspectiva": "Finanças", "nome": "...", "meta": "...", "atual": "...", "status": "verde", "owner": "..."},
    {"perspectiva": "Finanças", "nome": "...", "meta": "...", "atual": "...", "status": "amarelo", "owner": "..."},
    {"perspectiva": "Clientes", "nome": "...", "meta": "...", "atual": "...", "status": "verde", "owner": "..."},
    {"perspectiva": "Clientes", "nome": "...", "meta": "...", "atual": "...", "status": "amarelo", "owner": "..."},
    {"perspectiva": "Processos", "nome": "...", "meta": "...", "atual": "...", "status": "amarelo", "owner": "..."},
    {"perspectiva": "Processos", "nome": "...", "meta": "...", "atual": "...", "status": "vermelho", "owner": "..."},
    {"perspectiva": "Pessoas", "nome": "...", "meta": "...", "atual": "...", "status": "verde", "owner": "..."},
    {"perspectiva": "Pessoas", "nome": "...", "meta": "...", "atual": "...", "status": "amarelo", "owner": "..."}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (sugestoes.indicadores && Array.isArray(sugestoes.indicadores)) {
        const seenNomes = new Set(
          indicadoresExistentes.map(i => i.nome.toLowerCase().trim())
        );
        
        sugestoes.indicadores = sugestoes.indicadores.filter((indicador: any) => {
          const nome = indicador.nome?.toLowerCase().trim();
          if (!nome || seenNomes.has(nome)) {
            return false;
          }
          seenNomes.add(nome);
          return true;
        });
      }
      
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-diagnostico", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const indicadoresExistentes = await storage.getIndicadores(empresaId);
      const diagnosticoExistente = indicadoresExistentes
        .filter((i) => i.perspectiva === "diagnostico")
        .map((i) => i.nome.toLowerCase().trim());

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: [
          {
            role: "system",
            content: `Você é um consultor de gestão especializado em diagnóstico empresarial. Sua missão é identificar as 5 métricas de saúde mais relevantes para o estado ATUAL de uma empresa, antes de qualquer análise estratégica.

Essas métricas devem:
- Ser simples, mensuráveis e imediatamente disponíveis (não precisam de implantação)
- Refletir a realidade operacional do negócio HOJE, não metas futuras
- Ser específicas para o setor e porte da empresa
- Cobrir as dimensões mais críticas: financeira, operacional e de clientes

NÃO use perspectivas BSC. Pense como um médico fazendo o diagnóstico inicial de um paciente.`,
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA
${contextoPerfil}

## MÉTRICAS JÁ REGISTRADAS (NÃO REPITA):
${diagnosticoExistente.length > 0 ? diagnosticoExistente.join(", ") : "Nenhuma ainda"}

## TAREFA:
Sugira exatamente 5 métricas de diagnóstico baseline mais relevantes para ESTA empresa específica.

Para cada métrica:
- nome: Nome claro e direto (ex: "Receita Mensal Recorrente", "Taxa de Cancelamento de Clientes")
- meta: Referência de mercado ou benchmark setorial em formato texto (ex: "R$ 100k/mês", "> 90%", "< 5% ao mês")
- razao: Uma frase explicando por que essa métrica é crítica para este tipo de negócio (máx. 20 palavras)

Priorize métricas que:
1. Revelam a saúde financeira imediata
2. Mostram a satisfação e retenção de clientes
3. Indicam eficiência operacional chave para o setor

Responda em JSON:
{
  "sugestoes": [
    {"nome": "...", "meta": "...", "razao": "..."},
    {"nome": "...", "meta": "...", "razao": "..."},
    {"nome": "...", "meta": "...", "razao": "..."},
    {"nome": "...", "meta": "...", "razao": "..."},
    {"nome": "...", "meta": "...", "razao": "..."}
  ]
}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const resultado = JSON.parse(completion.choices[0].message.content || "{}");

      if (resultado.sugestoes && Array.isArray(resultado.sugestoes)) {
        const seenNomes = new Set(diagnosticoExistente);
        resultado.sugestoes = resultado.sugestoes.filter((s: any) => {
          const nome = s.nome?.toLowerCase().trim();
          if (!nome || seenNomes.has(nome)) return false;
          seenNomes.add(nome);
          return true;
        });
      }

      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-benchmarks", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;
      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

      const todosIndicadores = await storage.getIndicadores(empresaId);
      const indicadoresBsc = todosIndicadores.filter((i) => i.perspectiva !== "diagnostico");

      if (indicadoresBsc.length === 0) {
        return res.json({ updated: 0 });
      }

      const contextoPerfil = buildEmpresaContextoIA(empresa);
      let updated = 0;

      for (const ind of indicadoresBsc) {
        try {
          const completion = await openai.chat.completions.create({
            model: getModelForPlan(empresa.planoTipo, "relatorios"),
            messages: [
              {
                role: "system",
                content: "Você é especialista em benchmarking setorial para PMEs brasileiras. Responda SEMPRE em JSON com uma única chave 'benchmark'.",
              },
              {
                role: "user",
                content: `## PERFIL DA EMPRESA:\n${contextoPerfil}\n\n## KPI: ${ind.nome}\n## Valor atual: ${ind.atual}\n## Meta: ${ind.meta}\n\nGere UMA frase de benchmark setorial para este KPI específico desta empresa. Use dados de mercado do setor brasileiro. Formato: "Sua [métrica] de [valor] está [acima/na/abaixo d] média do setor de [setor] ([benchmark de referência])."`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.5,
          });
          const r = JSON.parse(completion.choices[0].message.content || "{}");
          if (r.benchmark) {
            await storage.updateIndicadorBenchmark(ind.id, r.benchmark);
            updated++;
          }
        } catch {}
      }

      res.json({ updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== RITUAIS ====================
  
  function isRitualPendente(ritual: any, tipo: string): boolean {
    if (!ritual || !ritual.dataUltimo) return true;
    
    const dataUltimo = new Date(ritual.dataUltimo);
    const hoje = new Date();
    
    switch (tipo) {
      case "diario":
        return !isMesmaData(dataUltimo, hoje);
      case "semanal":
        return !isMesmaSemana(dataUltimo, hoje);
      case "mensal":
        return !isMesmoMes(dataUltimo, hoje);
      case "trimestral":
        return !isMesmoTrimestre(dataUltimo, hoje);
      default:
        return true;
    }
  }
  
  function isMesmaData(data1: Date, data2: Date): boolean {
    return data1.getFullYear() === data2.getFullYear() &&
           data1.getMonth() === data2.getMonth() &&
           data1.getDate() === data2.getDate();
  }
  
  function isMesmaSemana(data1: Date, data2: Date): boolean {
    const umDia = 24 * 60 * 60 * 1000;
    const primeiroDia = new Date(data2.getFullYear(), 0, 1);
    const dias1 = Math.floor((data1.getTime() - primeiroDia.getTime()) / umDia);
    const dias2 = Math.floor((data2.getTime() - primeiroDia.getTime()) / umDia);
    const semana1 = Math.floor(dias1 / 7);
    const semana2 = Math.floor(dias2 / 7);
    return semana1 === semana2 && data1.getFullYear() === data2.getFullYear();
  }
  
  function isMesmoMes(data1: Date, data2: Date): boolean {
    return data1.getFullYear() === data2.getFullYear() &&
           data1.getMonth() === data2.getMonth();
  }
  
  function isMesmoTrimestre(data1: Date, data2: Date): boolean {
    const trimestre1 = Math.floor(data1.getMonth() / 3);
    const trimestre2 = Math.floor(data2.getMonth() / 3);
    return data1.getFullYear() === data2.getFullYear() && trimestre1 === trimestre2;
  }
  
  app.get("/api/rituais", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;
      let rituais = await storage.getRituais(empresaId);
      
      if (rituais.length === 0) {
        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        amanha.setHours(9, 0, 0, 0);
        
        const proximaSegunda = new Date(hoje);
        proximaSegunda.setDate(proximaSegunda.getDate() - proximaSegunda.getDay() + 8);
        proximaSegunda.setHours(10, 0, 0, 0);
        
        const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
        proximoMes.setHours(14, 0, 0, 0);
        
        const proximoTrimestre = new Date(hoje.getFullYear(), Math.floor(hoje.getMonth() / 3) * 3 + 3, 1);
        proximoTrimestre.setHours(14, 0, 0, 0);
        
        const rituaisPadrao = [
          { empresaId, tipo: "diario", dataProximo: amanha, completado: "false" },
          { empresaId, tipo: "semanal", dataProximo: proximaSegunda, completado: "false" },
          { empresaId, tipo: "mensal", dataProximo: proximoMes, completado: "false" },
          { empresaId, tipo: "trimestral", dataProximo: proximoTrimestre, completado: "false" }
        ];
        
        for (const ritual of rituaisPadrao) {
          await storage.createRitual(ritual);
        }
        
        rituais = await storage.getRituais(empresaId);
      }
      
      const rituaisComStatus = rituais.map(ritual => ({
        ...ritual,
        pendente: isRitualPendente(ritual, ritual.tipo)
      }));
      
      res.json(rituaisComStatus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rituais", async (req, res) => {
    try {
      const data = insertRitualSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const ritual = await storage.createRitual(data);
      res.json(ritual);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/rituais/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      if (body.dataUltimo && typeof body.dataUltimo === "string") body.dataUltimo = new Date(body.dataUltimo);
      if (body.dataProximo && typeof body.dataProximo === "string") body.dataProximo = new Date(body.dataProximo);
      const data = stripTenantFields(insertRitualSchema.partial().parse(body));
      
      if (data.completado === "true" && !data.dataUltimo) {
        data.dataUltimo = new Date();
      }
      
      const ritual = await storage.updateRitual(id, req.session.empresaId!, data);
      res.json(ritual);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/rituais/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRitual(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CENÁRIO MACRO — DASHBOARD ====================

  app.get("/api/contexto-macro/cenario-atual", requireAuth, async (req, res) => {
    try {
      const row = await storage.getContextoMacroByCategoria("contexto_geral");
      if (!row || !row.textoAtivo) {
        return res.json(null);
      }
      return res.json({
        texto: row.textoAtivo,
        atualizadoEm: row.ultimaAtualizacao,
      });
    } catch (err) {
      console.error("[contexto-macro/cenario-atual] Erro:", err);
      return res.status(500).json({ error: "Erro interno" });
    }
  });

  // ==================== EVENTOS ====================

  app.get("/api/eventos", async (req, res) => {
    try {
      const eventos = await storage.getEventos(req.session.empresaId!);
      res.json(eventos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/eventos", async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.dataEvento && typeof body.dataEvento === 'string') {
        body.dataEvento = new Date(body.dataEvento);
      }
      body.empresaId = req.session.empresaId;
      const data = insertEventoSchema.parse(body);
      const evento = await storage.createEvento(data);
      res.json(evento);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/eventos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const body = { ...req.body };
      if (body.dataEvento && typeof body.dataEvento === 'string') {
        body.dataEvento = new Date(body.dataEvento);
      }
      const data = stripTenantFields(insertEventoSchema.partial().parse(body));
      const evento = await storage.updateEvento(id, req.session.empresaId!, data);
      res.json(evento);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/eventos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEvento(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PULSE DO MERCADO ====================

  // In-memory cache for live market quotes (10-minute TTL)
  let cotacoesCache: { items: string[]; cachedAt: number } | null = null;
  const COTACOES_TTL_MS = 10 * 60 * 1000;

  async function fetchCotacoes(): Promise<string[]> {
    const now = Date.now();
    if (cotacoesCache && now - cotacoesCache.cachedAt < COTACOES_TTL_MS) {
      return cotacoesCache.items;
    }

    const items: string[] = [];

    try {
      const fxRes = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL", {
        signal: AbortSignal.timeout(5000),
      });
      if (fxRes.ok) {
        const fxData = await fxRes.json() as Record<string, { bid: string; pctChange: string }>;
        const formatPct = (pct: string) => {
          const n = parseFloat(pct);
          const arrow = n >= 0 ? "▲" : "▼";
          return `${arrow}${Math.abs(n).toFixed(2).replace(".", ",")}%`;
        };
        const formatBid = (bid: string) =>
          parseFloat(bid).toFixed(2).replace(".", ",");

        if (fxData.USDBRL) {
          items.push(`USD/BRL ${formatBid(fxData.USDBRL.bid)} ${formatPct(fxData.USDBRL.pctChange)}`);
        }
        if (fxData.EURBRL) {
          items.push(`EUR/BRL ${formatBid(fxData.EURBRL.bid)} ${formatPct(fxData.EURBRL.pctChange)}`);
        }
      }
    } catch (e) {
      console.warn("[cotacoes] AwesomeAPI fetch failed:", e);
    }

    const brapiToken = process.env.BRAPI_TOKEN;
    if (brapiToken) {
      try {
        const bvspRes = await fetch(
          `https://brapi.dev/api/quote/%5EBVSP?token=${brapiToken}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (bvspRes.ok) {
          const bvspData = await bvspRes.json() as { results?: Array<{ regularMarketPrice?: number; regularMarketChangePercent?: number }> };
          const r = bvspData.results?.[0];
          if (r?.regularMarketPrice !== undefined) {
            const price = Math.round(r.regularMarketPrice).toLocaleString("pt-BR");
            const pct = r.regularMarketChangePercent ?? 0;
            const arrow = pct >= 0 ? "▲" : "▼";
            items.push(`IBOVESPA ${price} ${arrow}${Math.abs(pct).toFixed(2).replace(".", ",")}%`);
          }
        }
      } catch (e) {
        console.warn("[cotacoes] BRAPI fetch failed:", e);
      }
    }

    cotacoesCache = { items, cachedAt: now };
    return items;
  }

  app.get("/api/cotacoes", requireAuth, async (_req, res) => {
    try {
      const items = await fetchCotacoes();
      res.json(items);
    } catch (err: any) {
      console.error("[cotacoes]", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/pulse-mercado", requireAuth, async (_req, res) => {
    try {
      const record = await storage.getContextoMacroByCategoria("pulse_manchetes");
      if (!record || !record.textoAtivo || record.textoAtivo.trim() === "") {
        return res.json([]);
      }
      const manchetes = record.textoAtivo
        .split("|")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const linksList = (record.linksAtivos ?? "")
        .split("|")
        .map((s) => s.trim());
      const result = manchetes.map((texto, i) => ({
        texto,
        url: linksList[i] && linksList[i].startsWith("http") ? linksList[i] : undefined,
      }));
      res.json(result);
    } catch (err: any) {
      console.error("[pulse-mercado]", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  // ==================== ALERTAS ====================
  
  app.get("/api/alertas", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;
      
      const indicadores = await storage.getIndicadores(empresaId);
      const iniciativas = await storage.getIniciativas(empresaId);
      
      const alertas = [];
      
      for (const indicador of indicadores) {
        if (indicador.status === "vermelho") {
          alertas.push({
            tipo: "indicador_critico",
            severidade: "alta",
            mensagem: `Indicador "${indicador.nome}" está em status vermelho`,
            detalhes: {
              perspectiva: indicador.perspectiva,
              meta: indicador.meta,
              atual: indicador.atual,
              owner: indicador.owner
            }
          });
        } else if (indicador.status === "amarelo") {
          alertas.push({
            tipo: "indicador_atencao",
            severidade: "media",
            mensagem: `Indicador "${indicador.nome}" precisa de atenção`,
            detalhes: {
              perspectiva: indicador.perspectiva,
              meta: indicador.meta,
              atual: indicador.atual,
              owner: indicador.owner
            }
          });
        }
      }
      
      const hoje = new Date();
      for (const iniciativa of iniciativas) {
        if (iniciativa.status !== "concluida") {
          const prazo = new Date(iniciativa.prazo);
          if (prazo < hoje) {
            alertas.push({
              tipo: "iniciativa_atrasada",
              severidade: "alta",
              mensagem: `Iniciativa "${iniciativa.titulo}" está atrasada`,
              detalhes: {
                prazo: iniciativa.prazo,
                status: iniciativa.status,
                responsavel: iniciativa.responsavel,
                prioridade: iniciativa.prioridade
              }
            });
          }
        }
      }
      
      res.json(alertas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== DIAGNÓSTICO ESTRATÉGICO IA ====================

  app.get("/api/diagnostico-ia", requireAuth, async (req, res) => {
    const saved = await storage.getDiagnosticoIASalvo(req.session.empresaId!);
    if (!saved) return res.json(null);
    res.json({ diagnostico: JSON.parse(saved.payload), geradoEm: saved.geradoEm });
  });

  app.post("/api/ai/diagnostico-estrategico", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

      const contextoPerfil = buildEmpresaContextoIA(empresa);

      const [objetivosList, indicadores, eventos, iniciativas, rituais] = await Promise.all([
        storage.getObjetivos(empresaId),
        storage.getIndicadores(empresaId),
        storage.getEventos(empresaId),
        storage.getIniciativas(empresaId),
        storage.getRituais(empresaId),
      ]);

      const krsArrays = await Promise.all(
        objetivosList.map((obj) => storage.getResultadosChave(obj.id, empresaId))
      );
      const todosKRs: ResultadoChave[] = krsArrays.flat();

      const calcProgresso = (kr: ResultadoChave): number => {
        const i = parseFloat(kr.valorInicial);
        const a = parseFloat(kr.valorAtual);
        const v = parseFloat(kr.valorAlvo);
        if (isNaN(i) || isNaN(a) || isNaN(v)) return 0;
        if (i === v) return 100;
        return Math.max(0, Math.min(100, ((a - i) / (v - i)) * 100));
      };

      const objetivosComProgresso = objetivosList.map((obj) => {
        const krs = todosKRs.filter((kr) => kr.objetivoId === obj.id);
        const progresso =
          krs.length === 0
            ? 0
            : Math.round(krs.reduce((acc, kr) => acc + calcProgresso(kr), 0) / krs.length);
        return { ...obj, progresso, numKRs: krs.length, krs };
      });

      const perspectivas = [
        "Financeira",
        "Clientes",
        "Processos Internos",
        "Aprendizado e Crescimento",
      ];
      const progressoPorPerspectiva = perspectivas.map((p) => {
        const objs = objetivosComProgresso.filter(
          (o) => o.perspectiva === p && o.numKRs > 0
        );
        const media =
          objs.length === 0
            ? 0
            : Math.round(objs.reduce((acc, o) => acc + o.progresso, 0) / objs.length);
        return { perspectiva: p, progresso: media, numObjetivos: objs.length };
      });

      const kpiVerde = indicadores.filter((i) => i.status === "verde").length;
      const kpiAmarelo = indicadores.filter((i) => i.status === "amarelo").length;
      const kpiVermelho = indicadores.filter((i) => i.status === "vermelho").length;

      const hoje = new Date();
      const iniciativasAtrasadas = iniciativas.filter(
        (i) => i.status !== "concluida" && new Date(i.prazo) < hoje
      );

      const eventosRecentes = [...eventos]
        .sort(
          (a, b) =>
            new Date(b.dataEvento).getTime() - new Date(a.dataEvento).getTime()
        )
        .slice(0, 5);

      const objetivosResume =
        objetivosComProgresso.length > 0
          ? objetivosComProgresso
              .map(
                (o) =>
                  `- [${o.perspectiva}] "${o.titulo}" — ${o.progresso}% progresso (${o.numKRs} KRs)\n${o.krs
                    .map(
                      (kr: ResultadoChave) =>
                        `  • ${kr.metrica}: inicial=${kr.valorInicial}, atual=${kr.valorAtual}, alvo=${kr.valorAlvo} (${Math.round(calcProgresso(kr))}%)`
                    )
                    .join("\n")}`
              )
              .join("\n\n")
          : "Nenhum objetivo cadastrado.";

      const indicadoresResume =
        indicadores.length > 0
          ? indicadores
              .map(
                (i) =>
                  `- [${i.perspectiva}] ${i.nome}: meta=${i.meta}, atual=${i.atual}, status=${i.status}`
              )
              .join("\n")
          : "Nenhum indicador cadastrado.";

      const eventosResume =
        eventosRecentes.length > 0
          ? eventosRecentes
              .map(
                (e) =>
                  `- ${new Date(e.dataEvento).toLocaleDateString("pt-BR")}: [${e.tipo}] ${e.titulo}`
              )
              .join("\n")
          : "Nenhum evento registrado.";

      const rituaisResume =
        rituais.length > 0
          ? rituais
              .map((r) => {
                const ultimo = r.dataUltimo
                  ? new Date(r.dataUltimo).toLocaleDateString("pt-BR")
                  : "nunca realizado";
                const proximo = new Date(r.dataProximo).toLocaleDateString("pt-BR");
                return `- ${r.tipo}: último=${ultimo}, próximo=${proximo}, completado=${r.completado}`;
              })
              .join("\n")
          : "Nenhum ritual cadastrado.";

      // Derive alertas ativos from the data already collected
      const alertasAtivos: string[] = [];
      indicadores
        .filter((i) => i.status === "vermelho")
        .forEach((i) => alertasAtivos.push(`[KPI CRÍTICO] ${i.nome}: atual=${i.atual}, meta=${i.meta}`));
      iniciativasAtrasadas.forEach((i) =>
        alertasAtivos.push(`[INICIATIVA ATRASADA] "${i.titulo}" (responsável: ${i.responsavel})`)
      );
      todosKRs
        .filter((kr) => calcProgresso(kr) === 0)
        .forEach((kr) => alertasAtivos.push(`[KR SEM PROGRESSO] ${kr.metrica}`));

      const alertasResume =
        alertasAtivos.length > 0
          ? alertasAtivos.join("\n")
          : "Sem alertas ativos no momento.";

      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em Balanced Scorecard (BSC) e OKRs. Analise os dados do plano estratégico da empresa e forneça um diagnóstico executivo completo e honesto. Seja específico, cite métricas reais, dê recomendações acionáveis. Use linguagem simples e direta. Responda sempre em português brasileiro. Considere também o cenário macroeconômico atual presente no system message (quando disponível) ao formular as recomendações.`,
          },
          {
            role: "user",
            content: `## PERFIL DA EMPRESA
${contextoPerfil}
Tamanho: ${empresa.tamanho}

## OKRs — Objetivos e Resultados-Chave
${objetivosResume}

### Progresso por Perspectiva BSC:
${progressoPorPerspectiva
  .map((p) => `- ${p.perspectiva}: ${p.progresso}% (${p.numObjetivos} objetivo(s) com KRs)`)
  .join("\n")}

## Indicadores de Desempenho (KPIs)
${indicadoresResume}
Resumo KPIs: ${kpiVerde} verde | ${kpiAmarelo} amarelo | ${kpiVermelho} vermelho

## Iniciativas Prioritárias
Total: ${iniciativas.length} | Atrasadas: ${iniciativasAtrasadas.length}
${
  iniciativasAtrasadas.length > 0
    ? iniciativasAtrasadas
        .map((i) => `- ATRASADA: "${i.titulo}" (responsável: ${i.responsavel}, prazo: ${i.prazo})`)
        .join("\n")
    : "Nenhuma iniciativa atrasada."
}

## Rituais de Gestão
${rituaisResume}

## Alertas Ativos
${alertasResume}

## Eventos Recentes de Acompanhamento
${eventosResume}

---
Gere um diagnóstico estratégico em JSON com esta estrutura exata:
{
  "saudePlano": <número 0-100 representando a saúde geral>,
  "resumoExecutivo": "<parágrafo de 3-5 frases com visão geral honesta do estado do plano>",
  "pontosFortes": ["<ponto forte específico com dado>", ...],
  "pontosAtencao": ["<ponto de atenção com dado específico>", ...],
  "riscos": ["<risco identificado com possível impacto>", ...],
  "recomendacoes": ["<ação concreta e prioritária>", ...]
}
Inclua 3-5 itens em cada lista. Seja específico e cite os dados reais fornecidos.`,
          },
        ]),
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const diagnostico = JSON.parse(completion.choices[0].message.content || "{}");
      const geradoEm = new Date();
      await storage.saveDiagnosticoIASalvo(empresaId, JSON.stringify(diagnostico));
      res.json({ diagnostico, geradoEm });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Retrospectivas (Ciclo Aprendizado) ──────────────────────────────────
  app.get("/api/retrospectivas", requireAuth, async (req, res) => {
    const retros = await storage.getRetrospectivas(req.session.empresaId!);
    res.json(retros);
  });
  app.get("/api/objetivos/:objetivoId/retrospectivas", requireAuth, async (req, res) => {
    const retros = await storage.getRetrospectivasByObjetivo(req.params.objetivoId);
    res.json(retros);
  });
  app.post("/api/retrospectivas", requireAuth, async (req, res) => {
    try {
      const data = insertRetrospectivaSchema.parse({ ...req.body, empresaId: req.session.empresaId, registradoPor: req.session.userEmail });
      const retro = await storage.createRetrospectiva(data);
      res.status(201).json(retro);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/retrospectivas/:id", requireAuth, async (req, res) => {
    await storage.deleteRetrospectiva(req.params.id, req.session.empresaId!);
    res.json({ ok: true });
  });

  // ── Cenários Estratégicos ────────────────────────────────────────────────
  app.get("/api/cenarios", requireAuth, async (req, res) => {
    const cens = await storage.getCenarios(req.session.empresaId!);
    res.json(cens);
  });
  // Upsert by (empresaId, tipo) — guarantees at most 1 record per scenario type
  app.post("/api/cenarios", requireAuth, async (req, res) => {
    try {
      const data = insertCenarioSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const existing = (await storage.getCenarios(req.session.empresaId!)).find(
        (c) => c.tipo === data.tipo,
      );
      if (existing) {
        const updated = await storage.updateCenario(existing.id, req.session.empresaId!, data);
        return res.json(updated);
      }
      const c = await storage.createCenario(data);
      res.status(201).json(c);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/cenarios/:id", requireAuth, async (req, res) => {
    try {
      const c = await storage.updateCenario(req.params.id, req.session.empresaId!, req.body);
      res.json(c);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/cenarios/:id", requireAuth, async (req, res) => {
    await storage.deleteCenario(req.params.id, req.session.empresaId!);
    res.json({ ok: true });
  });
  // Returns suggestions only — does NOT save to DB (user reviews in dialog before confirming)
  app.post("/api/ai/gerar-cenarios", requireAuth, async (req, res) => {
    try {
      const empresa = await storage.getEmpresa(req.session.empresaId!);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
      const [swots, pestels, estrategias] = await Promise.all([
        storage.getAnaliseSwot(req.session.empresaId!),
        storage.getFatoresPestel(req.session.empresaId!),
        storage.getEstrategias(req.session.empresaId!),
      ]);
      const swotResume = swots.map(s => `${s.tipo.toUpperCase()}: ${s.descricao}`).join("\n");
      const pestelResume = pestels.map(p => `${p.tipo}: ${p.descricao} (impacto: ${p.impacto})`).join("\n");
      const estResume = estrategias.slice(0, 5).map(e => e.descricao).join("; ");
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é consultor estratégico especializado em planejamento de cenários para PMEs brasileiras. Considere o cenário macroeconômico atual presente no system message (quando disponível) ao construir as premissas de cada cenário — variáveis como Selic, câmbio e instabilidade política devem moldar os cenários pessimista, base e otimista.`,
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome} | Setor: ${empresa.setor} | Porte: ${empresa.tamanho}
Descrição: ${empresa.descricao || ""}

ANÁLISE SWOT:\n${swotResume || "Não disponível"}
FATORES PESTEL:\n${pestelResume || "Não disponível"}
ESTRATÉGIAS:\n${estResume || "Não disponível"}

Gere 3 cenários estratégicos distintos (pessimista, base e otimista) em JSON.
Cada cenário deve refletir a realidade do setor ${empresa.setor} com dados concretos.
premissas deve ter 3-4 itens específicos e mensuráveis.
resposta_estrategica deve ser acionável e específica para a empresa.

Responda APENAS com JSON no formato:
{
  "cenarios": [
    { "tipo": "pessimista", "titulo": "Título conciso", "descricao": "Contexto do cenário em 2-3 frases.", "premissas": ["...", "...", "..."], "resposta_estrategica": "Como a empresa deve responder..." },
    { "tipo": "base", "titulo": "...", "descricao": "...", "premissas": ["...", "...", "..."], "resposta_estrategica": "..." },
    { "tipo": "otimista", "titulo": "...", "descricao": "...", "premissas": ["...", "...", "..."], "resposta_estrategica": "..." }
  ]
}`,
          },
        ]),
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      // Return suggestions only — frontend saves after user review
      res.json({ cenarios: parsed.cenarios || [] });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Suggest only the respostaEstrategica for a single scenario card
  const sugerirRespostaSchema = z.object({
    tipo: z.enum(["pessimista", "base", "otimista"]),
    titulo: z.string().max(200).default(""),
    descricao: z.string().max(1000).default(""),
    premissas: z.string().max(2000).default("[]"),
  });
  app.post("/api/ai/sugerir-resposta-cenario", requireAuth, async (req, res) => {
    try {
      const { tipo, titulo, descricao, premissas } = sugerirRespostaSchema.parse(req.body);
      const empresa = await storage.getEmpresa(req.session.empresaId!);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
      const [swots, estrategias] = await Promise.all([
        storage.getAnaliseSwot(req.session.empresaId!),
        storage.getEstrategias(req.session.empresaId!),
      ]);
      const swotResume = swots.map(s => `${s.tipo.toUpperCase()}: ${s.descricao}`).join("\n");
      const estResume = estrategias.slice(0, 5).map(e => e.descricao).join("; ");
      let premList: string[] = [];
      try { premList = JSON.parse(premissas || "[]"); } catch { premList = []; }
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: [{
          role: "user",
          content: `Você é consultor estratégico de PMEs brasileiras.
Empresa: ${empresa.nome} | Setor: ${empresa.setor}
SWOT: ${swotResume || "Não disponível"}
Estratégias: ${estResume || "Não disponível"}

Cenário ${tipo}: "${titulo}"
Descrição: ${descricao}
Premissas: ${premList.join("; ")}

Escreva uma resposta estratégica específica e acionável (3-5 frases) de como esta empresa deve adaptar suas operações e estratégia neste cenário ${tipo}.
Responda APENAS com JSON: { "respostaEstrategica": "..." }`,
        }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ respostaEstrategica: parsed.respostaEstrategica || "" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Gestão de Riscos ─────────────────────────────────────────────────────
  app.get("/api/riscos", requireAuth, async (req, res) => {
    res.json(await storage.getRiscos(req.session.empresaId!));
  });
  app.post("/api/riscos", requireAuth, async (req, res) => {
    try {
      const data = insertRiscoSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      res.status(201).json(await storage.createRisco(data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/riscos/:id", requireAuth, async (req, res) => {
    try {
      res.json(await storage.updateRisco(req.params.id, req.session.empresaId!, req.body));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/riscos/:id", requireAuth, async (req, res) => {
    await storage.deleteRisco(req.params.id, req.session.empresaId!);
    res.json({ ok: true });
  });
  app.post("/api/ai/gerar-riscos", requireAuth, async (req, res) => {
    try {
      const empresa = await storage.getEmpresa(req.session.empresaId!);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
      const swots = await storage.getAnaliseSwot(req.session.empresaId!);
      const pestels = await storage.getFatoresPestel(req.session.empresaId!);
      const fraquezas = swots.filter(s => s.tipo === "fraqueza").map(s => s.descricao).join("; ");
      const ameacas = swots.filter(s => s.tipo === "ameaca").map(s => s.descricao).join("; ");
      const pestelNeg = pestels.filter(p => p.impacto === "negativo").map(p => `${p.categoria}: ${p.descricao}`).join("; ");
      const completion = await openai.chat.completions.create({
        model: getModelForPlan(empresa.planoTipo, "relatorios"),
        messages: await injectMacroCtx([
          {
            role: "system",
            content: `Você é especialista em gestão de riscos para PMEs brasileiras. Considere o cenário macroeconômico atual presente no system message (quando disponível) ao identificar riscos — variáveis como Selic, câmbio, instabilidade política e mudanças regulatórias são fontes críticas de risco para o contexto brasileiro.`,
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome} | Setor: ${empresa.setor}
Fraquezas: ${fraquezas || "N/A"}
Ameaças: ${ameacas || "N/A"}
Fatores negativos PESTEL: ${pestelNeg || "N/A"}

Gere 5-7 riscos estratégicos em JSON:
{
  "riscos": [
    { "descricao": "...", "categoria": "estrategico|operacional|financeiro|regulatorio|tecnologico", "probabilidade": 1-5, "impacto": 1-5, "plano_mitigacao": "..." }
  ]
}
Seja específico para o setor ${empresa.setor}.`,
          },
        ]),
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      const riscosCriados = [];
      for (const r of parsed.riscos || []) {
        const criado = await storage.createRisco({
          empresaId: req.session.empresaId!,
          descricao: r.descricao,
          categoria: r.categoria,
          probabilidade: Math.min(5, Math.max(1, Number(r.probabilidade) || 3)),
          impacto: Math.min(5, Math.max(1, Number(r.impacto) || 3)),
          status: "identificado",
          planoMitigacao: r.plano_mitigacao,
        });
        riscosCriados.push(criado);
      }
      res.json({ riscos: riscosCriados });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Mapa BSC (relações causa-efeito) ────────────────────────────────────
  app.get("/api/bsc-relacoes", requireAuth, async (req, res) => {
    res.json(await storage.getBscRelacoes(req.session.empresaId!));
  });
  app.post("/api/bsc-relacoes", requireAuth, async (req, res) => {
    try {
      const data = insertBscRelacaoSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      res.status(201).json(await storage.createBscRelacao(data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/bsc-relacoes/:id", requireAuth, async (req, res) => {
    await storage.deleteBscRelacao(req.params.id, req.session.empresaId!);
    res.json({ ok: true });
  });

  // ── Compartilhamentos (links read-only) ──────────────────────────────────
  app.get("/api/compartilhamentos", requireAuth, async (req, res) => {
    res.json(await storage.getCompartilhamentos(req.session.empresaId!));
  });
  app.post("/api/compartilhamentos", requireAuth, async (req, res) => {
    try {
      const { tipo } = z.object({ tipo: z.string().optional().default("completo") }).parse(req.body);
      const usuario = await storage.getUsuarioById(req.session.userId!);
      const comp = await storage.createCompartilhamento({
        empresaId: req.session.empresaId!,
        tipo,
        token: "",
        ativo: true,
        criadoPor: usuario?.nome ?? null,
      });
      res.status(201).json(comp);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/compartilhamentos/:id", requireAuth, async (req, res) => {
    await storage.deleteCompartilhamento(req.params.id, req.session.empresaId!);
    res.json({ ok: true });
  });
  // Public read-only endpoint (no auth required)
  app.get("/api/plano-publico/:token", async (req, res) => {
    try {
      const comp = await storage.getCompartilhamentoByToken(req.params.token);
      if (!comp) return res.status(404).json({ error: "Link não encontrado ou expirado" });
      const [empresa, fatoresPestel, cincoForcas, modeloNegocio, swot, estrategias, oportunidades, iniciativas, cenarios, objetivosList] = await Promise.all([
        storage.getEmpresa(comp.empresaId),
        storage.getFatoresPestel(comp.empresaId),
        storage.getCincoForcas(comp.empresaId),
        storage.getModeloNegocio(comp.empresaId),
        storage.getAnaliseSwot(comp.empresaId),
        storage.getEstrategias(comp.empresaId),
        storage.getOportunidadesCrescimento(comp.empresaId),
        storage.getIniciativas(comp.empresaId),
        storage.getCenarios(comp.empresaId),
        storage.getObjetivos(comp.empresaId),
      ]);
      // Attach key results (targets only — no valorAtual to protect business performance data)
      const objetivos = await Promise.all(
        objetivosList.map(async (o) => {
          const krs = await storage.getResultadosChave(o.id, comp.empresaId);
          return {
            id: o.id, titulo: o.titulo, descricao: o.descricao,
            perspectiva: o.perspectiva, prazo: o.prazo,
            resultadosChave: krs.map((kr) => ({
              id: kr.id, metrica: kr.metrica,
              valorInicial: kr.valorInicial, valorAlvo: kr.valorAlvo,
              prazo: kr.prazo, owner: kr.owner,
            })),
          };
        }),
      );
      res.json({ empresa, fatoresPestel, cincoForcas, modeloNegocio, swot, estrategias, oportunidades, iniciativas, cenarios, objetivos });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Configurações de Notificação (Alertas E-mail) ────────────────────────
  app.get("/api/notificacoes/configuracoes", requireAuth, async (req, res) => {
    res.json(await storage.getConfiguracoesNotificacao(req.session.userId!));
  });
  app.post("/api/notificacoes/configuracoes", requireAuth, async (req, res) => {
    try {
      const data = insertConfiguracaoNotificacaoSchema.parse({ ...req.body, usuarioId: req.session.userId });
      res.json(await storage.upsertConfiguracaoNotificacao(data));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ── Contato Enterprise ───────────────────────────────────────────────────

  app.post("/api/contact/enterprise", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        empresa: z.string().min(1, "Empresa é obrigatória"),
        email: z.string().email("E-mail inválido"),
        telefone: z.string().min(1, "Telefone é obrigatório"),
      });
      const data = schema.parse(req.body);

      const { Resend } = await import("resend");
      const key = process.env.RESEND_API_KEY;
      const fromEmail = process.env.EMAIL_FROM || "noreply@bizguideai.org";

      if (!key) {
        console.error("[ENTERPRISE CONTACT] RESEND_API_KEY não configurada — lead não enviado");
        return res.status(500).json({ error: "Serviço de e-mail não disponível. Tente novamente mais tarde." });
      }

      const resend = new Resend(key);
      await resend.emails.send({
        from: `BizGuideAI <${fromEmail}>`,
        to: "atendimento.jundiai@consultingnow.com.br",
        subject: `Solicitação de contato Enterprise — ${data.nome}`,
        html: `<h2>Nova solicitação de contato Enterprise</h2>
<p><strong>Nome:</strong> ${data.nome}</p>
<p><strong>Empresa:</strong> ${data.empresa}</p>
<p><strong>E-mail:</strong> ${data.email}</p>
<p><strong>Telefone:</strong> ${data.telefone}</p>`,
      });

      res.json({ ok: true });
    } catch (e: any) {
      if (e?.name === "ZodError") {
        return res.status(400).json({ error: e.issues?.[0]?.message || "Dados inválidos" });
      }
      console.error("[ENTERPRISE CONTACT] Erro ao enviar e-mail");
      res.status(500).json({ error: "Erro ao processar solicitação. Tente novamente." });
    }
  });

  // ── Mercado Pago — Assinaturas ───────────────────────────────────────────

  app.post("/api/pagamentos/criar-assinatura", requireAuth, async (req: Request, res: Response) => {
    try {
      const schema = z.object({ planoTipo: z.enum(["start", "pro"]) });
      const { planoTipo } = schema.parse(req.body);

      const empresaId = req.session.empresaId!;
      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

      const usuario = await storage.getUsuarioById(req.session.userId!);
      if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "http://localhost:5000";

      const result = await criarAssinatura({
        planoTipo: planoTipo as PlanoTipo,
        payerEmail: usuario.email,
        externalReference: empresaId,
        successUrl: `${baseUrl}/pagamento/sucesso`,
        notificationUrl: `${baseUrl}/api/pagamentos/webhook`,
      });

      if (!result.init_point) {
        return res.status(500).json({ error: "Não foi possível gerar o link de pagamento" });
      }

      await storage.updateEmpresaPlano(empresaId, {
        mpSubscriptionId: result.id,
        mpSubscriptionStatus: "pending",
      });

      res.json({ checkoutUrl: result.init_point, subscriptionId: result.id });
    } catch (e: any) {
      console.error("[MP] Erro ao criar assinatura:", e?.message ?? e);
      res.status(500).json({ error: e?.message ?? "Erro interno" });
    }
  });

  app.post("/api/pagamentos/webhook", async (req: Request, res: Response) => {
    // Sempre retornamos 200 rápido (MP penaliza 500+). Processamos em try/catch.
    try {
      const body = req.body ?? {};
      const type: string | undefined = body.type ?? body.topic ?? (req.query?.type as string);
      const action: string | undefined = body.action;
      const resourceId: string | undefined =
        body.data?.id ??
        body.id ??
        (req.query?.id as string) ??
        (req.query?.["data.id"] as string);

      console.log(`[MP] Webhook recebido: type=${type} action=${action} id=${resourceId}`);

      // Validação da assinatura do webhook (MP_WEBHOOK_SECRET). Se não configurado, passa.
      const xSignature = req.header("x-signature") ?? undefined;
      const xRequestId = req.header("x-request-id") ?? undefined;
      const dataId = (body.data?.id ?? (req.query?.["data.id"] as string) ?? resourceId) as string | undefined;
      const sig = validarAssinaturaWebhook(xSignature, xRequestId, dataId);
      if (!sig.valid) {
        // Auditamos a tentativa rejeitada mas respondemos 200 pra não gerar retry infinito do MP
        console.warn(`[MP] Webhook com assinatura inválida (${sig.reason}) — auditado e ignorado`);
        await storage.createPagamentoEvento({
          tipo: type ?? "desconhecido",
          acao: action ?? null,
          mpResourceId: resourceId ?? null,
          status: "signature_invalid",
          statusDetail: sig.reason ?? null,
          payload: JSON.stringify({ body, headers: { xSignature, xRequestId } }).slice(0, 10000),
        }).catch(() => {});
        return res.status(200).json({ received: true, ignored: "invalid_signature" });
      }
      if (sig.reason === "sem_secret_configurado") {
        console.warn("[MP] MP_WEBHOOK_SECRET não configurado — webhook aceito sem validação (configure no painel MP em produção)");
      }

      let empresaIdForAudit: string | null = null;
      let auditStatus: string | null = null;
      let auditStatusDetail: string | null = null;

      // ── Evento: preapproval (assinatura) ─────────────────────────────
      if ((type === "preapproval" || action?.startsWith("preapproval")) && resourceId) {
        let subscription: MpSubscription | null = null;
        try {
          subscription = (await buscarAssinatura(resourceId)) as MpSubscription;
        } catch (err) {
          console.warn("[MP] Falha ao buscar preapproval:", (err as Error)?.message ?? err);
        }
        const empresaId = subscription?.external_reference ?? undefined;
        const mpStatus = subscription?.status;
        auditStatus = mpStatus ?? null;
        auditStatusDetail = subscription?.status_detail ?? subscription?.reason ?? null;

        let empresa = empresaId ? await storage.getEmpresa(empresaId) : undefined;
        if (!empresa && resourceId) {
          empresa = await storage.getEmpresaByMpSubscriptionId(resourceId);
        }
        empresaIdForAudit = empresa?.id ?? empresaId ?? null;

        if (empresa) {
          const reason: string = subscription?.reason ?? "";
          const planoTipo = reason.toLowerCase().includes("pro") ? "pro" : "start";
          if (mpStatus === "authorized") {
            await storage.updateEmpresaPlano(empresa.id, {
              planoStatus: "ativo",
              planoTipo,
              // só define planoAtivadoEm se ainda não tiver (idempotência)
              ...(empresa.planoAtivadoEm ? {} : { planoAtivadoEm: new Date() }),
              mpSubscriptionId: resourceId,
              mpSubscriptionStatus: "authorized",
            });
          } else if (mpStatus === "cancelled" || mpStatus === "paused") {
            await storage.updateEmpresaPlano(empresa.id, {
              planoStatus: "suspenso",
              mpSubscriptionId: resourceId,
              mpSubscriptionStatus: mpStatus,
            });
          } else {
            // pending / outros status sem decisão clara: só atualizamos o tracking
            // do MP sem tocar em planoStatus (evita rebaixar plano já ativo).
            await storage.updateEmpresaPlano(empresa.id, {
              mpSubscriptionId: resourceId,
              mpSubscriptionStatus: mpStatus ?? "pending",
            });
          }
        }
      }

      // ── Evento: payment (pagamento individual / primeira cobrança) ────
      else if ((type === "payment" || action?.startsWith("payment")) && resourceId) {
        let payment: MpPayment | null = null;
        try {
          payment = (await buscarPagamento(resourceId)) as MpPayment;
        } catch (err) {
          console.warn("[MP] Falha ao buscar payment:", (err as Error)?.message ?? err);
        }
        auditStatus = payment?.status ?? null;
        auditStatusDetail = payment?.status_detail ?? null;

        const extRef = payment?.external_reference ?? undefined;
        let empresa = extRef ? await storage.getEmpresa(extRef) : undefined;
        // Pagamentos ligados a uma assinatura carregam metadata.preapproval_id em alguns casos
        const preapprovalId =
          payment?.metadata?.preapproval_id ??
          payment?.point_of_interaction?.transaction_data?.preapproval_id ??
          undefined;
        if (!empresa && preapprovalId) {
          empresa = await storage.getEmpresaByMpSubscriptionId(preapprovalId);
        }
        empresaIdForAudit = empresa?.id ?? extRef ?? null;

        if (empresa && payment?.status === "approved") {
          await storage.updateEmpresaPlano(empresa.id, {
            planoStatus: "ativo",
            // idempotência: só define data de ativação na primeira vez
            ...(empresa.planoAtivadoEm ? {} : { planoAtivadoEm: new Date() }),
            mpSubscriptionStatus: "authorized",
          });
        } else if (empresa && (payment?.status === "rejected" || payment?.status === "cancelled")) {
          // só registra o detalhe se a empresa ainda não estiver com plano ativo
          if (empresa.planoStatus !== "ativo") {
            await storage.updateEmpresaPlano(empresa.id, {
              mpSubscriptionStatus: `${payment.status}:${payment.status_detail ?? ""}`.slice(0, 120),
            });
          }
        }
      }

      // ── Evento: subscription_authorized_payment (cobrança recorrente) ─
      else if (
        (type === "subscription_authorized_payment" || action?.startsWith("subscription_authorized_payment")) &&
        resourceId
      ) {
        // O recurso "authorized_payment" não tem client direto no SDK, mas expõe
        // um paymentId no corpo. Usamos a API de Payment via buscarPagamento pra
        // capturar status_detail quando disponível.
        const webhookBody = body as {
          data?: { id?: string; status?: string; payment?: { id?: string }; preapproval_id?: string };
          preapproval_id?: string;
        };
        const paymentId: string | undefined =
          webhookBody.data?.payment?.id ?? webhookBody.data?.id ?? resourceId;
        const preapprovalId: string | undefined =
          webhookBody.data?.preapproval_id ?? webhookBody.preapproval_id ?? undefined;

        let payment: MpPayment | null = null;
        if (paymentId) {
          try {
            payment = (await buscarPagamento(paymentId)) as MpPayment;
          } catch (err) {
            console.warn("[MP] Falha ao buscar pagamento recorrente:", (err as Error)?.message ?? err);
          }
        }
        auditStatus = payment?.status ?? webhookBody.data?.status ?? null;
        auditStatusDetail = payment?.status_detail ?? null;

        let empresa = preapprovalId
          ? await storage.getEmpresaByMpSubscriptionId(preapprovalId)
          : undefined;
        if (!empresa && payment?.external_reference) {
          empresa = await storage.getEmpresa(payment.external_reference);
        }
        empresaIdForAudit = empresa?.id ?? null;

        if (empresa) {
          if (payment?.status === "approved") {
            await storage.updateEmpresaPlano(empresa.id, {
              planoStatus: "ativo",
              ...(empresa.planoAtivadoEm ? {} : { planoAtivadoEm: new Date() }),
              mpSubscriptionStatus: "authorized",
            });
          } else if (
            payment?.status === "rejected" ||
            payment?.status === "cancelled"
          ) {
            // Cobrança recorrente falhou — registra motivo sem derrubar plano ativo
            if (empresa.planoStatus !== "ativo") {
              await storage.updateEmpresaPlano(empresa.id, {
                mpSubscriptionStatus:
                  `${payment.status}:${payment.status_detail ?? ""}`.slice(0, 120),
              });
            }
          }
        }
      }

      // Grava auditoria sempre
      await storage.createPagamentoEvento({
        empresaId: empresaIdForAudit ?? undefined,
        tipo: type ?? "desconhecido",
        acao: action ?? null,
        mpResourceId: resourceId ?? null,
        status: auditStatus,
        statusDetail: auditStatusDetail,
        payload: JSON.stringify(body).slice(0, 10000),
      }).catch((err) => console.error("[MP] Falha ao gravar evento:", err?.message ?? err));

      res.status(200).json({ received: true });
    } catch (e: any) {
      console.error("[MP] Erro no webhook:", e?.message ?? e);
      res.status(200).json({ received: true });
    }
  });

  // Endpoint de consulta do status atual da assinatura + último evento.
  // Contrato: { status, statusDetail, motivoLegivel, planoStatus, planoTipo, ultimoEvento }
  // Aceita ?mpSubscriptionId=... pra consultar uma assinatura específica (usada no callback do MP).
  app.get("/api/pagamentos/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const empresaId = req.session.empresaId!;
      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

      const eventos = await storage.getPagamentoEventosByEmpresa(empresaId, 5);
      const ultimoEvento = eventos[0];

      // Prioridade: query param → empresa.mpSubscriptionId
      // Ownership: só aceitamos o query param se bater com a subscription da empresa.
      const subscriptionIdParam = (req.query.mpSubscriptionId as string | undefined) || undefined;
      const paramOk =
        subscriptionIdParam &&
        empresa.mpSubscriptionId &&
        subscriptionIdParam === empresa.mpSubscriptionId;
      const subId = paramOk ? subscriptionIdParam : empresa.mpSubscriptionId ?? null;

      let status: string | null = empresa.mpSubscriptionStatus ?? null;
      let statusDetail: string | null = null;
      if (subId) {
        try {
          const sub = (await buscarAssinatura(subId)) as MpSubscription;
          status = sub?.status ?? status;
          statusDetail = sub?.status_detail ?? null;
        } catch (err) {
          console.warn("[MP] Falha ao consultar assinatura:", (err as Error)?.message ?? err);
        }
      }

      // Se o status_detail não veio na assinatura, caímos no último evento auditado
      const detalheFinal = statusDetail ?? ultimoEvento?.statusDetail ?? null;
      const motivo = motivoLegivel(detalheFinal ?? undefined);

      res.json({
        status,
        statusDetail: detalheFinal,
        motivoLegivel: motivo,
        planoStatus: empresa.planoStatus,
        planoTipo: empresa.planoTipo,
        mpSubscriptionId: subId,
        ultimoEvento: ultimoEvento
          ? {
              tipo: ultimoEvento.tipo,
              status: ultimoEvento.status,
              statusDetail: ultimoEvento.statusDetail,
              criadoEm: ultimoEvento.criadoEm,
            }
          : null,
      });
    } catch (e: any) {
      console.error("[MP] Erro ao consultar status:", e?.message ?? e);
      res.status(500).json({ error: "Erro ao consultar status" });
    }
  });

  // Cancelamento de assinatura — apenas o proprietário (registrante original) pode cancelar.
  app.post("/api/pagamentos/cancelar-assinatura", requireAuth, async (req: Request, res: Response) => {
    try {
      const empresaId = req.session.empresaId!;
      const userId = req.session.userId!;
      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

      if (!empresa.proprietarioUsuarioId || empresa.proprietarioUsuarioId !== userId) {
        // Auditar tentativa negada (não-proprietário tentando cancelar).
        await storage.createPagamentoEvento({
          empresaId,
          tipo: "cancelamento_manual",
          acao: "negado_nao_proprietario",
          mpResourceId: empresa.mpSubscriptionId ?? null,
          status: empresa.mpSubscriptionStatus ?? null,
          statusDetail: null,
          payload: JSON.stringify({ usuarioId: userId, proprietarioUsuarioId: empresa.proprietarioUsuarioId ?? null }),
        }).catch(() => {});
        return res.status(403).json({
          error: "Apenas o proprietário da conta pode cancelar a assinatura.",
        });
      }

      // Idempotência: se já está cancelada localmente, retorna sucesso sem chamar o MP novamente.
      if (empresa.mpSubscriptionStatus === "cancelled" || empresa.planoStatus === "cancelado") {
        return res.json({ success: true, status: empresa.mpSubscriptionStatus ?? "cancelled", alreadyCancelled: true });
      }

      if (!empresa.mpSubscriptionId) {
        return res.status(400).json({ error: "Nenhuma assinatura ativa para cancelar." });
      }

      // Permitir cancelamento somente para planos ativos ou pendentes de pagamento.
      const statusPermitidos = new Set(["ativo", "pendente_pagamento"]);
      if (!statusPermitidos.has(empresa.planoStatus)) {
        return res.status(400).json({
          error: "A assinatura não está em um estado que permita cancelamento.",
        });
      }

      let mpResult: MpSubscription | null = null;
      try {
        mpResult = await cancelarAssinatura(empresa.mpSubscriptionId);
      } catch (err: any) {
        const msg = String(err?.message ?? err ?? "");
        const statusCode = err?.status ?? err?.statusCode ?? err?.cause?.status;
        const isNotFound = statusCode === 404 || /not[\s_-]?found/i.test(msg);
        const isAlreadyCancelled = /already.*cancel/i.test(msg) || /cancell?ed/i.test(msg);

        if (isNotFound || isAlreadyCancelled) {
          // Tratar como sucesso idempotente — sincronizar estado local.
          console.warn("[MP] Cancelamento tratado como idempotente:", msg);
          await storage.updateEmpresaPlano(empresaId, {
            planoStatus: "cancelado",
            mpSubscriptionStatus: "cancelled",
          });
          await storage.createPagamentoEvento({
            empresaId,
            tipo: "cancelamento_manual",
            acao: "ja_cancelado_no_mp",
            mpResourceId: empresa.mpSubscriptionId,
            status: "cancelled",
            statusDetail: null,
            payload: JSON.stringify({ usuarioId: userId, erro: msg }),
          }).catch(() => {});
          return res.json({ success: true, status: "cancelled", alreadyCancelled: true });
        }

        console.error("[MP] Falha ao cancelar assinatura:", msg);
        await storage.createPagamentoEvento({
          empresaId,
          tipo: "cancelamento_manual",
          acao: "erro",
          mpResourceId: empresa.mpSubscriptionId,
          status: null,
          statusDetail: null,
          payload: JSON.stringify({ usuarioId: userId, erro: msg }),
        }).catch(() => {});
        return res.status(502).json({ error: "Não foi possível cancelar no Mercado Pago. Tente novamente em instantes." });
      }

      const novoStatus = mpResult?.status ?? "cancelled";
      await storage.updateEmpresaPlano(empresaId, {
        planoStatus: "cancelado",
        mpSubscriptionStatus: novoStatus,
      });

      await storage.createPagamentoEvento({
        empresaId,
        tipo: "cancelamento_manual",
        acao: "solicitado_pelo_proprietario",
        mpResourceId: empresa.mpSubscriptionId,
        status: novoStatus,
        statusDetail: null,
        payload: JSON.stringify({ usuarioId: userId, mpResult }),
      });

      res.json({ success: true, status: novoStatus });
    } catch (e: any) {
      console.error("[MP] Erro no endpoint de cancelamento:", e?.message ?? e);
      res.status(500).json({ error: "Erro ao cancelar assinatura" });
    }
  });

  app.get("/api/pagamentos/planos", requireAuth, async (_req: Request, res: Response) => {
    res.json({
      planos: Object.entries(PLANOS_MP).map(([key, p]) => ({
        id: key,
        nome: p.nome,
        descricao: p.descricao,
        valor: p.valor,
        frequencia: p.frequencia,
      })),
      publicKey: process.env.MP_PUBLIC_KEY ?? null,
    });
  });

  // ==================== SUPER-ADMIN: CONTEXTO MACRO IA ====================

  async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) return res.status(401).json({ error: "Não autenticado" });
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return res.status(403).json({ error: "Acesso restrito" });
    const usuario = await storage.getUsuarioById(req.session.userId);
    if (!usuario || usuario.email !== adminEmail) return res.status(403).json({ error: "Acesso restrito" });
    next();
  }

  const CATEGORIAS_PROMPTS: Record<string, string> = {
    cambio_politica_monetaria: `Pesquise dados ATUAIS (últimas 2-4 semanas) sobre câmbio e política monetária no Brasil. Inclua: cotação recente do dólar (BRL/USD) e tendência, última decisão do Copom sobre a taxa Selic e expectativas para os próximos meses, meta e projeções de inflação do Banco Central, condições de crédito para empresas, e principais impactos práticos para PMEs que dependem de importações, exportações ou financiamento. Use dados numéricos precisos com datas sempre que disponível. Responda em português do Brasil, máximo 400 palavras.`,
    inflacao_custos: `Pesquise dados ATUAIS sobre inflação e custos no Brasil. Inclua: IPCA mensal e acumulado 12 meses mais recentes, IGP-M, variação do preço de combustíveis (gasolina, diesel, etanol), energia elétrica e insumos industriais chave, pressão inflacionária em alimentos e serviços, e impacto direto na margem e no poder de compra do consumidor brasileiro. Use dados numéricos com datas. Responda em português do Brasil, máximo 400 palavras.`,
    cenario_politico_regulatorio: `Pesquise o cenário político e regulatório ATUAL do Brasil com foco em impactos para empresas. Inclua: estado da reforma tributária (IVA/IBS/CBS — split payment, alíquotas, cronograma), novas regulações aprovadas ou em tramitação no Congresso e Executivo relevantes para PMEs, decisões recentes do STF e CADE com impacto nos negócios, e estabilidade ou riscos políticos do momento. Cite datas e fontes quando possível. Responda em português do Brasil, máximo 400 palavras.`,
    geopolitica_comercio_exterior: `Pesquise o cenário geopolítico ATUAL e seu impacto no comércio exterior brasileiro. Inclua: tarifas e barreiras comerciais recentes afetando exportações e importações do Brasil (especialmente com EUA e China), conflitos ou tensões que afetam cadeias de suprimento globais, andamento do acordo Mercosul-UE e outros acordos, variação recente de preços de commodities exportadas pelo Brasil (soja, petróleo, minério de ferro), e posição do Real frente a moedas de parceiros comerciais. Responda em português do Brasil, máximo 400 palavras.`,
    crises_setoriais: `Pesquise CRISES e RISCOS SETORIAIS ATUAIS no Brasil com foco em impactos para PMEs. Inclua: setores em maior dificuldade (varejo, construção civil, indústria, agronegócio, serviços), dados recentes de falências e recuperações judiciais, problemas de cadeia de suprimento, greves ou paralisações, escassez de insumos ou mão de obra qualificada, e setores com oportunidades emergindo de reestruturações. Cite dados com datas. Responda em português do Brasil, máximo 400 palavras.`,
    tendencias_mercado: `Pesquise as principais TENDÊNCIAS DE MERCADO ATUAIS no Brasil relevantes para PMEs. Inclua: mudanças recentes no comportamento do consumidor brasileiro (pós-pandemia, digital, crédito), setores em crescimento acelerado (healthtech, agritech, fintechs, energia limpa, IA aplicada), expansão do e-commerce e marketplace, dados de investimento e venture capital no ecossistema brasileiro, e oportunidades identificadas por analistas e consultorias. Cite fontes e datas. Responda em português do Brasil, máximo 400 palavras.`,
    contexto_geral: `Faça uma síntese estratégica ATUAL do contexto macroeconômico e de negócios do Brasil voltado para gestores de PMEs. Com base em dados e notícias recentes, sintetize: perspectiva econômica geral (PIB, juros, câmbio, inflação), principais riscos operacionais e financeiros do momento, oportunidades concretas de crescimento, sentimento do empresariado (índices de confiança recentes), e 2 a 3 recomendações práticas de posicionamento estratégico para PMEs neste cenário. Cite dados com datas. Responda em português do Brasil, máximo 450 palavras.`,
    // pulse_manchetes não usa prompt de IA — gerarContextoCategoria busca notícias reais via Serper /news
  };

  function calcularProximoAgendamento(frequencia: string, base: Date): Date {
    const d = new Date(base);
    if (frequencia === "4h") d.setHours(d.getHours() + 4);
    else if (frequencia === "diario") d.setDate(d.getDate() + 1);
    else if (frequencia === "semanal") d.setDate(d.getDate() + 7);
    else if (frequencia === "mensal") d.setDate(d.getDate() + 30);
    return d;
  }

  // Injects current month and year into a search query base string so that
  // Serper/Google always targets the current period instead of a stale year.
  function queryComData(base: string): string {
    const now = new Date();
    const mes = now.toLocaleString("pt-BR", { month: "long" });
    const ano = now.getFullYear();
    return `${base} ${mes} ${ano}`;
  }

  // Base query strings per Contexto Macro category — optimised for Google CSE.
  // DO NOT call queryComData() here: this object is initialised once at startup.
  // The dynamic month/year injection happens at request time inside gerarContextoCategoria
  // and in the queryEfetiva admin display below, both calling queryComData() there.
  const CATEGORIAS_QUERIES: Record<string, string> = {
    cambio_politica_monetaria:    "câmbio real dólar Selic política monetária COPOM Brasil",
    inflacao_custos:              "inflação IPCA IGP-M combustíveis energia custos insumos Brasil",
    cenario_politico_regulatorio: "cenário político regulatório governo reforma tributária Brasil",
    geopolitica_comercio_exterior:"geopolítica comércio exterior exportações Brasil EUA China",
    crises_setoriais:             "crises setoriais falências PME indústria varejo Brasil",
    tendencias_mercado:           "tendências mercado consumidor e-commerce startups inovação Brasil",
    contexto_geral:               "economia brasileira PIB risco negócio PME perspectiva",
    pulse_manchetes:              "dólar IBOVESPA Selic IPCA commodities manchetes negócios Brasil hoje",
  };

  async function gerarContextoCategoria(
    categoria: string
  ): Promise<{ texto: string; modo: "web_search" | "fallback" | "noticias_diretas"; links?: string }> {

    // ── pulse_manchetes: notícias reais direto da fonte, SEM síntese por IA ──
    // Eliminamos o passo de geração por LLM para evitar alucinações no ticker.
    // Usamos os títulos exatos retornados pelo endpoint /news do Serper.dev,
    // escritos pelos próprios jornalistas dos portais (Valor, InfoMoney, G1, etc.).
    if (categoria === "pulse_manchetes") {
      if (!process.env.SERPER_API_KEY) {
        console.warn("[pulse_manchetes] SERPER_API_KEY ausente — ticker retorna vazio (sem fallback para IA).");
        return { texto: "", modo: "noticias_diretas" };
      }
      const record = await storage.getContextoMacroByCategoria(categoria);
      const customQuery = record?.queryBusca?.trim();

      // Duas buscas paralelas para cobertura ampla.
      // Se admin definiu queryBusca customizada, ela substitui a primeira query-padrão
      // mas a segunda (negócios/PME) sempre roda para garantir diversidade de temas.
      const [macroNews, negociosNews] = await Promise.all([
        serperNewsSearch(customQuery ?? "mercado financeiro economia Brasil hoje", 10),
        serperNewsSearch("negócios empresas PME Brasil hoje", 8),
      ]);

      // Mescla e deduplica por prefixo do título (primeiros 40 chars, case-insensitive)
      const seen = new Set<string>();
      const manchetes: string[] = [];
      const linksColetados: string[] = [];
      for (const item of [...macroNews, ...negociosNews]) {
        const title = item.title.trim();
        if (!title) continue;
        const dedupeKey = title.toLowerCase().slice(0, 40);
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        // Formato: "Veículo · Título" (max 80 chars total para caber no ticker)
        const prefix = item.source ? `${item.source} · ` : "";
        const maxTitle = 80 - prefix.length;
        const truncated = title.length > maxTitle ? title.slice(0, maxTitle - 1) + "…" : title;
        manchetes.push(`${prefix}${truncated}`);
        linksColetados.push(item.link ?? "");
        if (manchetes.length >= 18) break;
      }

      const texto = manchetes.join(" | ");
      console.log(`[pulse_manchetes] ${manchetes.length} manchetes reais coletadas (sem IA, anti-alucinação)`);
      return { texto, modo: "noticias_diretas", links: linksColetados.join(" | ") };
    }

    const prompt = CATEGORIAS_PROMPTS[categoria];
    if (!prompt) throw new Error(`Categoria sem prompt: ${categoria}`);

    const serperApiKey = process.env.SERPER_API_KEY;

    // Build a temporal anchor so the LLM knows exactly when "now" is.
    const hoje = new Date().toLocaleDateString("pt-BR", {
      day: "numeric", month: "long", year: "numeric",
    });
    const systemPrompt = `Hoje é ${hoje}. Você é um analista macroeconômico especializado no Brasil. Sua função é redigir sínteses concisas e práticas do contexto econômico, político e regulatório brasileiro para ajudar gestores de pequenas e médias empresas a tomar melhores decisões estratégicas. Use linguagem direta e objetiva. Use EXCLUSIVAMENTE os dados fornecidos no contexto de busca para citar valores numéricos específicos (cotações, taxas, percentuais, preços, índices). Quando um dado específico não estiver nos resultados de busca fornecidos, escreva "dado não disponível nos resultados recentes" em vez de usar valores do seu conhecimento de treinamento. Responda sempre em português do Brasil.`;

    if (serperApiKey) {
      // Step 1 — Serper.dev search
      // Use custom queryBusca from DB if set, otherwise fall back to hardcoded map.
      // Fallback uses queryComData to inject current month/year (avoids stale year in generic queries).
      const record = await storage.getContextoMacroByCategoria(categoria);
      // queryComData() is called here at request time (not at module init) so the
      // injected month/year is always the current one, even after long-running processes.
      const baseQuery = CATEGORIAS_QUERIES[categoria] ?? `${categoria.replace(/_/g, " ")} Brasil`;
      const query = (record?.queryBusca && record.queryBusca.trim())
        ? record.queryBusca.trim()
        : queryComData(baseQuery);
      const searchItems = await serperSearch(query, 8);
      const searchCtx = formatSearchContext(searchItems);

      // Step 2 — LLM synthesises the category text using web snippets
      const promptWithCtx = searchCtx ? `${searchCtx}\n\n${prompt}` : prompt;
      const completion = await openai.chat.completions.create({
        model: getModelForPlan("pro", "relatorios"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptWithCtx },
        ],
        temperature: 0.4,
        max_tokens: 800,
      });
      return { texto: (completion.choices[0].message.content ?? "").trim(), modo: "web_search" };
    }

    // Fallback: no Serper key — LLM generates without web search context.
    console.warn("[contexto-macro] SERPER_API_KEY não configurada — usando fallback sem busca na web.");
    const completion = await openai.chat.completions.create({
      model: getModelForPlan("pro", "relatorios"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });
    return { texto: (completion.choices[0].message.content ?? "").trim(), modo: "fallback" };
  }

  app.get("/api/admin/contexto-macro", requireSuperAdmin, async (_req, res) => {
    try {
      const all = await storage.getContextoMacroAll();
      res.json(all.map((cat) => ({
        ...cat,
        queryEfetiva: (cat.queryBusca && cat.queryBusca.trim())
          ? cat.queryBusca.trim()
          : queryComData(CATEGORIAS_QUERIES[cat.categoria] ?? `${cat.categoria.replace(/_/g, " ")} Brasil`),
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/contexto-macro/:categoria/log", requireSuperAdmin, async (req, res) => {
    try {
      const { categoria } = req.params;
      const logs = await storage.getContextoMacroLogs(categoria);
      res.json(
        logs.map((l) => ({
          timestamp: l.executadoEm.toISOString(),
          modo: l.modo,
          resultado: l.resultado,
          mensagem: l.mensagem,
        }))
      );
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/admin/contexto-macro/:categoria", requireSuperAdmin, async (req, res) => {
    try {
      const { categoria } = req.params;
      const allowed = ["textoAtivo", "rascunho", "ativo", "agendadorAtivo", "agendadorFrequencia", "proximoAgendamento", "alertaDias", "queryBusca"] as const;
      const data: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in req.body) data[key] = req.body[key];
      }
      if (data.proximoAgendamento) data.proximoAgendamento = new Date(data.proximoAgendamento as string);

      // Auto-bump ultimaAtualizacao when textoAtivo is manually updated
      if ("textoAtivo" in data && data.textoAtivo) {
        data.ultimaAtualizacao = new Date();
      }

      // Recalculate proximoAgendamento server-side when scheduler activates or frequency changes
      const schedulerTriggered = data.agendadorAtivo === true || data.agendadorFrequencia !== undefined;
      if (schedulerTriggered && !data.proximoAgendamento) {
        const existing = await storage.getContextoMacroByCategoria(categoria);
        if (existing) {
          const isNowActive =
            data.agendadorAtivo === true ||
            (data.agendadorAtivo !== false && existing.agendadorAtivo);
          if (isNowActive) {
            const freq = (data.agendadorFrequencia as string | undefined) ?? existing.agendadorFrequencia ?? "semanal";
            data.proximoAgendamento = calcularProximoAgendamento(freq, new Date());
          }
        }
      }

      const updated = await storage.updateContextoMacro(categoria, data);
      _macroCtxCache = null;
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/contexto-macro/:categoria/gerar", requireSuperAdmin, async (req, res) => {
    const { categoria } = req.params;
    const agora = new Date();
    try {
      const record = await storage.getContextoMacroByCategoria(categoria);
      if (!record) return res.status(404).json({ error: "Categoria não encontrada" });

      const { texto, modo, links } = await gerarContextoCategoria(categoria);

      await storage.addContextoMacroLog({
        categoria,
        executadoEm: agora,
        modo,
        resultado: "sucesso",
        mensagem:
          modo === "noticias_diretas" ? "Manchetes reais coletadas direto da fonte (sem IA)"
          : modo === "web_search"     ? "Gerado com busca na web"
          :                             "Gerado sem busca na web (fallback)",
      });

      if (record.agendadorAtivo && record.agendadorFrequencia) {
        await storage.updateContextoMacro(categoria, {
          textoAtivo: texto,
          linksAtivos: links ?? null,
          ativo: record.ativo,
          ultimaAtualizacao: agora,
          proximoAgendamento: calcularProximoAgendamento(record.agendadorFrequencia, agora),
          rascunho: null,
        });
        _macroCtxCache = null;
        const updated = await storage.getContextoMacroByCategoria(categoria);
        return res.json({ mode: "auto_aprovado", record: updated });
      } else {
        await storage.updateContextoMacro(categoria, { rascunho: texto, linksAtivos: links ?? null });
        const updated = await storage.getContextoMacroByCategoria(categoria);
        return res.json({ mode: "rascunho", record: updated });
      }
    } catch (e: any) {
      try {
        await storage.addContextoMacroLog({
          categoria,
          executadoEm: agora,
          modo: categoria === "pulse_manchetes"
            ? "noticias_diretas"
            : process.env.SERPER_API_KEY ? "web_search" : "fallback",
          resultado: "erro",
          mensagem: e?.message ?? "Erro desconhecido",
        });
      } catch (_) {}
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/contexto-macro/:categoria/aprovar", requireSuperAdmin, async (req, res) => {
    try {
      const { categoria } = req.params;
      const record = await storage.getContextoMacroByCategoria(categoria);
      if (!record) return res.status(404).json({ error: "Categoria não encontrada" });
      if (!record.rascunho) return res.status(400).json({ error: "Nenhum rascunho para aprovar" });
      const agora = new Date();
      const updated = await storage.updateContextoMacro(categoria, {
        textoAtivo: record.rascunho,
        rascunho: null,
        ultimaAtualizacao: agora,
      });
      _macroCtxCache = null;
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/contexto-macro/:categoria/rascunho", requireSuperAdmin, async (req, res) => {
    try {
      const { categoria } = req.params;
      const updated = await storage.updateContextoMacro(categoria, { rascunho: null });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /* ── Scheduler: verifica categorias vencidas a cada hora ── */
  cron.schedule("0 * * * *", async () => {
    try {
      const all = await storage.getContextoMacroAll();
      const now = new Date();
      for (const cat of all) {
        if (!cat.agendadorAtivo || !cat.agendadorFrequencia || !cat.proximoAgendamento) continue;
        if (new Date(cat.proximoAgendamento) > now) continue;
        try {
          console.log(`[CONTEXTO_MACRO] Gerando: ${cat.categoria}`);
          const { texto, modo, links } = await gerarContextoCategoria(cat.categoria);
          const proxima = calcularProximoAgendamento(cat.agendadorFrequencia, now);
          await storage.updateContextoMacro(cat.categoria, {
            textoAtivo: texto,
            linksAtivos: links ?? null,
            ultimaAtualizacao: now,
            proximoAgendamento: proxima,
            rascunho: null,
          });
          _macroCtxCache = null;
          await storage.addContextoMacroLog({
            categoria: cat.categoria,
            executadoEm: now,
            modo,
            resultado: "sucesso",
            mensagem:
              modo === "noticias_diretas" ? "Agendador: manchetes reais coletadas direto da fonte (sem IA)"
              : modo === "web_search"     ? "Agendador: gerado com busca na web"
              :                             "Agendador: gerado sem busca na web (fallback)",
          });
          console.log(`[CONTEXTO_MACRO] OK: ${cat.categoria} — próximo: ${proxima.toISOString()}`);
        } catch (err: any) {
          try {
            await storage.addContextoMacroLog({
              categoria: cat.categoria,
              executadoEm: now,
              modo: cat.categoria === "pulse_manchetes"
                ? "noticias_diretas"
                : process.env.SERPER_API_KEY ? "web_search" : "fallback",
              resultado: "erro",
              mensagem: err?.message ?? "Erro desconhecido",
            });
          } catch (_) {}
          console.error(`[CONTEXTO_MACRO] Erro em ${cat.categoria}:`, err?.message ?? err);
        }
      }
    } catch (err: any) {
      console.error("[CONTEXTO_MACRO] Erro no scheduler:", err?.message ?? err);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

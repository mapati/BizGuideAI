import { MercadoPagoConfig, PreApproval, PreApprovalPlan, Payment } from "mercadopago";
import { createHmac, timingSafeEqual } from "crypto";
import { storage } from "./storage";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

if (!MP_ACCESS_TOKEN) {
  console.warn("[MP] MP_ACCESS_TOKEN não configurado — integração Mercado Pago desabilitada");
}

export const mpClient = MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN })
  : null;

export const PLANOS_MP = {
  start: {
    nome: "BizGuideAI Start",
    descricao: "Plano Start — 1 usuário, todas as ferramentas de IA estratégica",
    valor: 187.0,
    frequencia: "monthly" as const,
  },
  pro: {
    nome: "BizGuideAI Pro",
    descricao: "Plano Pro — usuários ilimitados, todas as ferramentas de IA estratégica",
    valor: 490.0,
    frequencia: "monthly" as const,
  },
} as const;

export type PlanoTipo = keyof typeof PLANOS_MP;

// Cache in-memory dos IDs dos PreApprovalPlans. Ao reiniciar o processo, será
// re-resolvido via busca por reason no MP antes de recriar. Usamos uma promise
// cache para evitar corrida: múltiplas chamadas concorrentes aguardam a mesma
// resolução em vez de criar planos duplicados.
// ── Tipos mínimos para os campos das respostas do MP que realmente usamos ──
export interface MpSubscription {
  id?: string;
  status?: string;
  status_detail?: string;
  reason?: string;
  external_reference?: string;
  init_point?: string;
  sandbox_init_point?: string;
}

export interface MpPayment {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  metadata?: { preapproval_id?: string } & Record<string, unknown>;
  point_of_interaction?: {
    transaction_data?: { preapproval_id?: string };
  };
}

const planoIdCache: Partial<Record<PlanoTipo, string>> = {};
const planoInflightCache: Partial<Record<PlanoTipo, Promise<string | null>>> = {};

async function getOrCreatePlanId(planoTipo: PlanoTipo, backUrl: string): Promise<string | null> {
  if (!mpClient) return null;
  if (planoIdCache[planoTipo]) return planoIdCache[planoTipo]!;
  if (planoInflightCache[planoTipo]) return planoInflightCache[planoTipo]!;

  const promise = resolvePlanId(planoTipo, backUrl).finally(() => {
    // libera lock assim que resolver/rejeitar
    delete planoInflightCache[planoTipo];
  });
  planoInflightCache[planoTipo] = promise;
  return promise;
}

async function resolvePlanId(planoTipo: PlanoTipo, backUrl: string): Promise<string | null> {
  if (!mpClient) return null;
  const plano = PLANOS_MP[planoTipo];

  // 1) Tentar ler do banco (persistido entre restarts)
  try {
    const stored = await storage.getMpPlanoId(planoTipo);
    if (stored) {
      planoIdCache[planoTipo] = stored;
      return stored;
    }
  } catch (err: any) {
    console.warn(`[MP] Falha ao ler plano do banco (${planoTipo}):`, err?.message ?? err);
  }

  const preApprovalPlan = new PreApprovalPlan(mpClient);

  // Tentar encontrar plano existente pelo "reason" (nome) para evitar duplicatas ao reiniciar.
  try {
    const search = await preApprovalPlan.search({
      options: { q: plano.nome, limit: 50 } as { q: string; limit: number },
    });
    const results = (search.results ?? []) as Array<{ id?: string; reason?: string; status?: string }>;
    const match = results.find(
      (r) => r.reason === plano.nome && r.status !== "cancelled",
    );
    if (match?.id) {
      planoIdCache[planoTipo] = match.id;
      await storage.saveMpPlanoId(planoTipo, match.id).catch(() => {});
      console.log(`[MP] Plano existente encontrado (${planoTipo}): ${match.id}`);
      return match.id;
    }
  } catch (err: any) {
    console.warn(`[MP] Busca de plano falhou (${planoTipo}):`, err?.message ?? err);
  }

  // Criar plano novo
  try {
    const body = {
      reason: plano.nome,
      back_url: backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plano.valor,
        currency_id: "BRL",
      },
      payment_methods_allowed: {
        payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
      },
    };
    const created = await preApprovalPlan.create({
      body: body as Parameters<typeof preApprovalPlan.create>[0]["body"],
    });
    if (created?.id) {
      planoIdCache[planoTipo] = created.id;
      await storage.saveMpPlanoId(planoTipo, created.id).catch(() => {});
      console.log(`[MP] Plano criado (${planoTipo}): ${created.id}`);
      return created.id;
    }
  } catch (err: any) {
    console.error(`[MP] Falha ao criar plano (${planoTipo}):`, err?.message ?? err);
  }
  return null;
}

export async function criarAssinatura(params: {
  planoTipo: PlanoTipo;
  payerEmail: string;
  externalReference: string;
  successUrl: string;
  notificationUrl: string;
}) {
  if (!mpClient) throw new Error("Mercado Pago não configurado");

  const plano = PLANOS_MP[params.planoTipo];
  const preApproval = new PreApproval(mpClient);

  // Observação importante sobre MP + Brasil:
  // A API `/preapproval` só aceita `preapproval_plan_id` quando também é
  // enviado `card_token_id` (gerado no frontend via Checkout Bricks). Como
  // nosso fluxo é "redirect para init_point" (usuário preenche o cartão na
  // tela do MP), NÃO enviamos `preapproval_plan_id` aqui — isso evita o
  // erro 500 "card_token_id is required".
  // A função `getOrCreatePlanId` segue disponível e pode ser usada por um
  // fluxo futuro baseado em Checkout Bricks.

  const body: Record<string, unknown> = {
    reason: plano.nome,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: plano.valor,
      currency_id: "BRL",
    },
    payer_email: params.payerEmail,
    back_url: params.successUrl,
    notification_url: params.notificationUrl,
    external_reference: params.externalReference,
  };

  console.log("[MP] Criando assinatura:", JSON.stringify(body, null, 2));

  const result = (await preApproval.create({
    body: body as Parameters<typeof preApproval.create>[0]["body"],
  })) as MpSubscription & {
    payer_email?: string;
    preapproval_plan_id?: string;
  };

  console.log("[MP] Resposta:", JSON.stringify({
    id: result.id,
    status: result.status,
    init_point: result.init_point,
    payer_email: result.payer_email,
    preapproval_plan_id: result.preapproval_plan_id,
  }, null, 2));

  return result;
}

export async function buscarAssinatura(subscriptionId: string) {
  if (!mpClient) throw new Error("Mercado Pago não configurado");
  const preApproval = new PreApproval(mpClient);
  return preApproval.get({ id: subscriptionId });
}

export async function buscarPagamento(paymentId: string) {
  if (!mpClient) throw new Error("Mercado Pago não configurado");
  const payment = new Payment(mpClient);
  return payment.get({ id: paymentId });
}

// Mapeamento status_detail → mensagem legível em pt-BR.
// Referência: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/response-handling/collection-results
const STATUS_DETAIL_MESSAGES: Record<string, string> = {
  accredited: "Pagamento aprovado.",
  pending_contingency: "Pagamento em análise. Aguardando confirmação do Mercado Pago.",
  pending_review_manual: "Pagamento em revisão manual pelo Mercado Pago.",
  pending_waiting_payment: "Aguardando o pagamento (boleto ou PIX).",
  pending_waiting_transfer: "Aguardando transferência bancária.",
  cc_rejected_bad_filled_card_number: "Número do cartão informado está incorreto.",
  cc_rejected_bad_filled_date: "Data de validade do cartão está incorreta.",
  cc_rejected_bad_filled_other: "Dados do cartão incorretos. Revise e tente novamente.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) inválido.",
  cc_rejected_blacklist: "Cartão recusado. Use outro meio de pagamento.",
  cc_rejected_call_for_authorize: "O banco pediu autorização. Ligue para o seu banco e autorize o pagamento.",
  cc_rejected_card_disabled: "Cartão desabilitado. Ligue para o seu banco para ativar.",
  cc_rejected_card_error: "Não foi possível processar o cartão. Tente novamente ou use outro.",
  cc_rejected_duplicated_payment: "Pagamento duplicado detectado. Aguarde alguns minutos antes de tentar novamente.",
  cc_rejected_high_risk: "Pagamento recusado por análise de risco do Mercado Pago. Tente com outro cartão.",
  cc_rejected_insufficient_amount: "Cartão sem limite suficiente.",
  cc_rejected_invalid_installments: "Número de parcelas inválido para este cartão.",
  cc_rejected_max_attempts: "Você atingiu o limite de tentativas. Use outro cartão.",
  cc_rejected_other_reason: "Pagamento recusado pelo emissor do cartão. Tente outro cartão ou meio de pagamento.",
  rejected_by_bank: "Pagamento recusado pelo banco emissor.",
  rejected_insufficient_data: "Dados insuficientes. Complete seu cadastro no Mercado Pago.",
  rejected_by_regulations: "Pagamento recusado por regulamentação.",
};

export function motivoLegivel(statusDetail?: string | null): string {
  if (!statusDetail) return "";
  return STATUS_DETAIL_MESSAGES[statusDetail] ?? `Motivo: ${statusDetail}`;
}

// ── Validação de assinatura do webhook do Mercado Pago ──────────────────
// Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#editor_11
// Quando o usuário configura o webhook no painel MP, um secret é gerado.
// Se MP_WEBHOOK_SECRET estiver setado, validamos x-signature + x-request-id.
// Se não estiver setado, logamos um aviso e deixamos passar (ambiente de dev).
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

export function validarAssinaturaWebhook(
  xSignature: string | undefined,
  xRequestId: string | undefined,
  dataId: string | undefined,
): { valid: boolean; reason?: string } {
  if (!MP_WEBHOOK_SECRET) {
    return { valid: true, reason: "sem_secret_configurado" };
  }
  if (!xSignature || !xRequestId) {
    return { valid: false, reason: "headers_ausentes" };
  }
  // x-signature formato: "ts=TIMESTAMP,v1=HASH"
  const parts = xSignature.split(",").reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split("=").map((s) => s.trim());
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return { valid: false, reason: "signature_invalida" };

  // Template: id:DATA_ID;request-id:X_REQUEST_ID;ts:TS;
  const manifest = `id:${dataId ?? ""};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", MP_WEBHOOK_SECRET).update(manifest).digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return { valid: false, reason: "hash_length_mismatch" };
    return timingSafeEqual(a, b) ? { valid: true } : { valid: false, reason: "hash_mismatch" };
  } catch {
    return { valid: false, reason: "hash_parse_error" };
  }
}

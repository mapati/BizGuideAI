import { MercadoPagoConfig, PreApproval } from "mercadopago";

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

  const result = await preApproval.create({
    body: {
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
      status: "pending",
    },
  });

  return result;
}

export async function buscarAssinatura(subscriptionId: string) {
  if (!mpClient) throw new Error("Mercado Pago não configurado");
  const preApproval = new PreApproval(mpClient);
  return preApproval.get({ id: subscriptionId });
}

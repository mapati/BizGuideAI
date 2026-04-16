import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { XCircle, Target, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

const STATUS_DETAIL_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Número do cartão informado está incorreto.",
  cc_rejected_bad_filled_date: "Data de validade do cartão está incorreta.",
  cc_rejected_bad_filled_other: "Dados do cartão incorretos. Revise e tente novamente.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) inválido.",
  cc_rejected_blacklist: "Cartão recusado. Use outro meio de pagamento.",
  cc_rejected_call_for_authorize: "O banco pediu autorização. Ligue para o seu banco e autorize o pagamento, depois tente novamente.",
  cc_rejected_card_disabled: "Cartão desabilitado. Ligue para o seu banco para ativar.",
  cc_rejected_card_error: "Não foi possível processar o cartão. Tente novamente ou use outro.",
  cc_rejected_duplicated_payment: "Pagamento duplicado detectado. Aguarde alguns minutos antes de tentar novamente.",
  cc_rejected_high_risk: "Pagamento recusado por análise de risco. Tente com outro cartão.",
  cc_rejected_insufficient_amount: "Cartão sem limite suficiente.",
  cc_rejected_invalid_installments: "Número de parcelas inválido para este cartão.",
  cc_rejected_max_attempts: "Limite de tentativas atingido. Use outro cartão.",
  cc_rejected_other_reason: "Pagamento recusado pelo emissor do cartão. Tente outro cartão ou meio de pagamento.",
  rejected_by_bank: "Pagamento recusado pelo banco emissor.",
  rejected_insufficient_data: "Dados insuficientes. Complete seu cadastro no Mercado Pago.",
  rejected_by_regulations: "Pagamento recusado por regulamentação.",
};

function mensagemAmigavel(statusDetail: string | null, collectionStatus: string | null): string | null {
  if (statusDetail && STATUS_DETAIL_MESSAGES[statusDetail]) {
    return STATUS_DETAIL_MESSAGES[statusDetail];
  }
  if (statusDetail) return `Motivo informado pelo Mercado Pago: ${statusDetail}`;
  if (collectionStatus === "rejected") return "O pagamento foi recusado. Tente com outro cartão ou meio de pagamento.";
  if (collectionStatus === "in_process" || collectionStatus === "pending") {
    return "O pagamento ainda está em processamento. Você receberá uma confirmação em instantes.";
  }
  return null;
}

export default function PagamentoCancelado() {
  const search = useSearch();
  const [motivo, setMotivo] = useState<string | null>(null);
  const [statusServidor, setStatusServidor] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const statusDetail = params.get("status_detail");
    const collectionStatus = params.get("collection_status") ?? params.get("status");
    setMotivo(mensagemAmigavel(statusDetail, collectionStatus));

    // Busca status atualizado no servidor (se autenticado)
    fetch("/api/pagamentos/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.motivoLegivel) {
          setStatusServidor(data.motivoLegivel);
        }
      })
      .catch(() => {});
  }, [search]);

  const mensagemFinal = motivo ?? statusServidor;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16 gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">BizGuideAI</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center flex flex-col items-center gap-8">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>

          <div className="flex flex-col gap-3">
            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              data-testid="heading-pagamento-cancelado"
            >
              Pagamento não concluído
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              O processo de pagamento foi cancelado ou não pôde ser concluído.
              Você pode tentar novamente a qualquer momento.
            </p>
          </div>

          {mensagemFinal && (
            <div
              className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 w-full text-left"
              data-testid="banner-motivo-recusa"
            >
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">Por que o pagamento não foi aprovado</p>
                <p className="text-sm text-muted-foreground" data-testid="text-motivo-recusa">{mensagemFinal}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <Link href="/assinar">
              <Button size="lg" className="gap-2" data-testid="button-tentar-novamente">
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-voltar-dashboard">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Target, ArrowRight, Clock, AlertCircle } from "lucide-react";

type StatusResp = {
  status?: string | null;
  statusDetail?: string | null;
  motivoLegivel?: string | null;
  planoStatus?: string | null;
  planoTipo?: string | null;
};

export default function PagamentoSucesso() {
  const search = useSearch();
  const [resp, setResp] = useState<StatusResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState<{ collectionStatus: string | null }>({
    collectionStatus: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const mpSubscriptionId = params.get("preapproval_id") ?? undefined;
    const collectionStatus = params.get("collection_status") ?? params.get("status");
    setFallback({ collectionStatus });

    const url = mpSubscriptionId
      ? `/api/pagamentos/status?mpSubscriptionId=${encodeURIComponent(mpSubscriptionId)}`
      : `/api/pagamentos/status`;

    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StatusResp | null) => {
        if (data) setResp(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  const ativo = resp?.planoStatus === "ativo" || resp?.status === "authorized";
  const pendente =
    !ativo &&
    (resp?.status === "pending" ||
      fallback.collectionStatus === "in_process" ||
      fallback.collectionStatus === "pending");

  const heading = ativo
    ? "Pagamento confirmado!"
    : pendente
    ? "Pagamento em processamento"
    : "Pagamento recebido!";

  const descricao = ativo
    ? "Seu plano está ativo. Faça login para começar a usar o BizGuideAI."
    : pendente
    ? "Recebemos seu pagamento e ele está sendo processado pelo Mercado Pago. Assim que for confirmado, seu plano será ativado automaticamente."
    : "Estamos confirmando seu pagamento. Faça login para ver o status atualizado na sua conta.";

  const Icon = ativo ? CheckCircle2 : pendente ? Clock : AlertCircle;
  const iconColor = ativo
    ? "text-green-600 dark:text-green-400"
    : pendente
    ? "text-amber-600 dark:text-amber-400"
    : "text-muted-foreground";
  const iconBg = ativo
    ? "bg-green-100 dark:bg-green-900/30"
    : pendente
    ? "bg-amber-100 dark:bg-amber-900/30"
    : "bg-muted";

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
          <div className={`h-20 w-20 rounded-full ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-10 w-10 ${iconColor}`} />
          </div>

          <div className="flex flex-col gap-3">
            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              data-testid="heading-pagamento-sucesso"
            >
              {heading}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed" data-testid="text-pagamento-descricao">
              {descricao}
            </p>
          </div>

          {resp?.motivoLegivel && !ativo && (
            <div
              className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 w-full text-left"
              data-testid="banner-motivo-status"
            >
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">Informação do Mercado Pago</p>
                <p className="text-sm text-muted-foreground" data-testid="text-motivo-status">
                  {resp.motivoLegivel}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <Link href="/login">
              <Button size="lg" className="gap-2" data-testid="button-ir-login">
                {loading ? "Carregando..." : "Fazer login para acessar o sistema"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {!ativo && (
            <p className="text-xs text-muted-foreground">
              A ativação pode levar alguns instantes. Se não for ativado em 5 minutos, contate o suporte.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

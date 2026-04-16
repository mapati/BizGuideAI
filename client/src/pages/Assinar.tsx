import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EnterpriseContactModal } from "@/components/EnterpriseContactModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  Target,
  Check,
  Loader2,
  Users,
  Brain,
  BarChart3,
  FileText,
  Zap,
  Shield,
  ArrowLeft,
  Building2,
  Phone,
  AlertCircle,
} from "lucide-react";

const planos = [
  {
    id: "start" as const,
    nome: "Start",
    preco: "R$ 187",
    periodo: "/mês",
    descricao: "Para empresários que querem planejamento estratégico profissional",
    destaque: false,
    badge: null,
    features: [
      { icon: Users, texto: "1 usuário" },
      { icon: Brain, texto: "IA Estratégica completa (PESTEL, SWOT, 5 Forças)" },
      { icon: BarChart3, texto: "OKRs, KPIs e BSC" },
      { icon: FileText, texto: "Jornada Estratégica Guiada (12 passos)" },
      { icon: Zap, texto: "Exportação do plano estratégico" },
      { icon: Shield, texto: "Suporte por e-mail" },
    ],
  },
  {
    id: "pro" as const,
    nome: "Pro",
    preco: "R$ 490",
    periodo: "/mês",
    descricao: "Para times que precisam de estratégia colaborativa em escala",
    destaque: true,
    badge: "Mais popular",
    features: [
      { icon: Users, texto: "Usuários ilimitados" },
      { icon: Brain, texto: "IA Estratégica completa (PESTEL, SWOT, 5 Forças)" },
      { icon: BarChart3, texto: "OKRs, KPIs e BSC" },
      { icon: FileText, texto: "Jornada Estratégica Guiada (12 passos)" },
      { icon: Zap, texto: "Exportação do plano estratégico" },
      { icon: Shield, texto: "Suporte prioritário" },
    ],
  },
];

export default function Assinar() {
  const [loadingPlano, setLoadingPlano] = useState<"start" | "pro" | null>(null);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const { toast } = useToast();
  const { trialInfo, empresa } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const planoParam = params.get("plano");
  const planoPreSelecionado = planoParam === "start" || planoParam === "pro" ? planoParam : null;
  const isPendentePagamento = trialInfo?.planoStatus === "pendente_pagamento";
  const planoTipoEmpresa = empresa?.planoTipo as "start" | "pro" | null | undefined;

  useEffect(() => {
    if (planoPreSelecionado) {
      const btn = document.querySelector<HTMLButtonElement>(
        `[data-testid="button-assinar-${planoPreSelecionado}"]`
      );
      btn?.focus();
    }
  }, [planoPreSelecionado]);

  const handleAssinar = async (planoTipo: "start" | "pro") => {
    setLoadingPlano(planoTipo);
    try {
      const data = await apiRequest(
        "POST",
        "/api/pagamentos/criar-assinatura",
        { planoTipo }
      );
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      toast({
        title: "Erro ao iniciar pagamento",
        description: e?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
      setLoadingPlano(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">BizGuideAI</span>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-voltar-dashboard-nav">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao App
            </Button>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16">
        <div className="max-w-5xl w-full flex flex-col items-center gap-10">
          <div className="text-center flex flex-col gap-3">
            <Badge variant="secondary" className="mx-auto" data-testid="badge-assinar">
              Escolha seu plano
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight" data-testid="heading-assinar">
              Estratégia profissional para o seu negócio
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Assine agora e continue com acesso completo a todas as
              ferramentas de IA estratégica. Cancele quando quiser.
            </p>
          </div>

          {isPendentePagamento && (
            <div
              className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 w-full max-w-2xl"
              data-testid="banner-pendente-pagamento"
            >
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">Pagamento pendente</p>
                <p className="text-sm text-muted-foreground">
                  Sua conta foi criada, mas o pagamento ainda não foi concluído.
                  Selecione o plano abaixo para finalizar a assinatura e ativar o acesso.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
            {planos.map((plano) => {
              const selecionado = planoPreSelecionado === plano.id;
              // When pendente_pagamento, lock the plan to empresa.planoTipo
              const isPlanoLocked = isPendentePagamento && planoTipoEmpresa && plano.id !== planoTipoEmpresa;
              const isPlanoAtivo = isPendentePagamento && plano.id === planoTipoEmpresa;
              return (
                <Card
                  key={plano.id}
                  className={`${plano.destaque || selecionado || isPlanoAtivo ? "border-primary shadow-sm" : ""} ${isPlanoLocked ? "opacity-50" : ""} flex flex-col`}
                  data-testid={`card-plano-${plano.id}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-xl">{plano.nome}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        {(selecionado || isPlanoAtivo) && (
                          <Badge variant="default" data-testid={`badge-selecionado-${plano.id}`}>
                            {isPendentePagamento ? "Seu plano" : "Selecionado"}
                          </Badge>
                        )}
                        {plano.badge && !selecionado && !isPlanoAtivo && (
                          <Badge data-testid={`badge-popular-${plano.id}`}>
                            {plano.badge}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end gap-1 mt-1">
                      <span
                        className="text-3xl font-bold"
                        data-testid={`text-preco-${plano.id}`}
                      >
                        {plano.preco}
                      </span>
                      <span className="text-muted-foreground mb-1">{plano.periodo}</span>
                    </div>
                    <CardDescription>{plano.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 flex-1">
                    <ul className="space-y-2.5 flex-1">
                      {plano.features.map((f) => {
                        const Icon = f.icon;
                        return (
                          <li key={f.texto} className="flex items-center gap-2.5 text-sm">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>{f.texto}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <Button
                      size="lg"
                      variant={plano.destaque || selecionado || isPlanoAtivo ? "default" : "outline"}
                      className="w-full mt-2"
                      onClick={() => !isPlanoLocked && handleAssinar(plano.id)}
                      disabled={loadingPlano !== null || !!isPlanoLocked}
                      data-testid={`button-assinar-${plano.id}`}
                    >
                      {loadingPlano === plano.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Aguarde...
                        </>
                      ) : isPlanoAtivo ? (
                        "Ir para o pagamento"
                      ) : (
                        `Assinar ${plano.nome}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {/* Enterprise */}
            <Card className="flex flex-col" data-testid="card-plano-enterprise">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-xl">Enterprise</CardTitle>
                </div>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-3xl font-bold" data-testid="text-preco-enterprise">
                    Sob consulta
                  </span>
                </div>
                <CardDescription>
                  Para corporações com requisitos avançados de segurança e personalização.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 flex-1">
                <ul className="space-y-2.5 flex-1">
                  {[
                    { icon: Users, texto: "Usuários ilimitados" },
                    { icon: Building2, texto: "Infraestrutura dedicada (on-premise)" },
                    { icon: Shield, texto: "Segurança máxima de dados" },
                    { icon: FileText, texto: "SLA personalizado" },
                    { icon: Zap, texto: "Gerente de sucesso dedicado" },
                  ].map((f) => {
                    const Icon = f.icon;
                    return (
                      <li key={f.texto} className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{f.texto}</span>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full mt-2 gap-2"
                  onClick={() => setEnterpriseOpen(true)}
                  data-testid="button-enterprise-contato"
                >
                  <Phone className="h-4 w-4" />
                  Falar com especialista
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary" />
              Pagamento seguro via Mercado Pago
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary" />
              Cartão de crédito, PIX ou boleto
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary" />
              Cancele quando quiser
            </span>
          </div>

          <p className="text-xs text-muted-foreground text-center max-w-md">
            Ao clicar em "Assinar", você será redirecionado para a página segura
            do Mercado Pago para concluir o pagamento. Seu acesso é ativado
            automaticamente após a confirmação.
          </p>
        </div>
      </div>

      <EnterpriseContactModal open={enterpriseOpen} onOpenChange={setEnterpriseOpen} />
    </div>
  );
}

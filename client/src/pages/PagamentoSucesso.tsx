import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Target, ArrowRight } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function PagamentoSucesso() {
  const [, navigate] = useLocation();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/empresa"] });

    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 8000);
    return () => clearTimeout(timer);
  }, [navigate]);

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
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>

          <div className="flex flex-col gap-3">
            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              data-testid="heading-pagamento-sucesso"
            >
              Pagamento recebido!
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Seu plano está sendo ativado. Em instantes você terá acesso
              completo ao BizGuideAI. Você será redirecionado automaticamente.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2" data-testid="button-ir-dashboard">
                Ir para o Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Redirecionando automaticamente em 5 segundos...
          </p>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GaugeChart } from "@/components/GaugeChart";
import { CircularProgress } from "@/components/CircularProgress";
import { DollarSign, Users, Cog, GraduationCap, Loader2, TrendingUp, BarChart3, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Objetivo, ResultadoChave, Empresa } from "@shared/schema";

const PERSPECTIVAS = [
  { 
    nome: "Financeira", 
    icon: DollarSign, 
    value: "Financeira",
    description: "Desempenho financeiro e sustentabilidade"
  },
  { 
    nome: "Clientes", 
    icon: Users, 
    value: "Clientes",
    description: "Satisfação e valor entregue aos clientes"
  },
  { 
    nome: "Processos Internos", 
    icon: Cog, 
    value: "Processos Internos",
    description: "Eficiência e qualidade dos processos"
  },
  { 
    nome: "Aprendizado e Crescimento", 
    icon: GraduationCap, 
    value: "Aprendizado e Crescimento",
    description: "Capacitação e inovação da equipe"
  },
];

export default function BSC() {
  const { data: empresa } = useQuery<Empresa>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  const { data: objetivos = [], isLoading: loadingObjetivos } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  // Usa as mesmas entradas de cache que a página OKRs — uma query por objetivo
  const krQueries = useQueries({
    queries: objetivos.map((obj) => ({
      queryKey: [`/api/resultados-chave/${obj.id}`],
      enabled: !!obj.id,
    })),
  });

  const allResultadosChave: ResultadoChave[] = useMemo(
    () => krQueries.flatMap((q) => (q.data as ResultadoChave[]) || []),
    [krQueries]
  );

  const loadingResultados = krQueries.some((q) => q.isLoading);

  // Progresso de um resultado-chave (0-100%)
  const calcularProgressoKR = (kr: ResultadoChave): number => {
    const inicial = parseFloat(kr.valorInicial);
    const atual = parseFloat(kr.valorAtual);
    const alvo = parseFloat(kr.valorAlvo);

    if (isNaN(inicial) || isNaN(atual) || isNaN(alvo)) return 0;
    if (inicial === alvo) return 100;

    const progresso = ((atual - inicial) / (alvo - inicial)) * 100;
    return Math.max(0, Math.min(100, progresso));
  };

  // Performance de um objetivo (média dos KRs)
  const calcularPerformanceObjetivo = (objetivoId: string): number => {
    const krs = allResultadosChave.filter((kr) => kr.objetivoId === objetivoId);
    if (krs.length === 0) return 0;
    const soma = krs.reduce((acc, kr) => acc + calcularProgressoKR(kr), 0);
    return soma / krs.length;
  };

  // Performance geral (média apenas dos objetivos com KRs)
  const performanceGeral = useMemo(() => {
    if (objetivos.length === 0) return 0;
    const objetivosComKRs = objetivos.filter((obj) =>
      allResultadosChave.some((kr) => kr.objetivoId === obj.id)
    );
    if (objetivosComKRs.length === 0) return 0;
    const soma = objetivosComKRs.reduce(
      (acc, obj) => acc + calcularPerformanceObjetivo(obj.id),
      0
    );
    return soma / objetivosComKRs.length;
  }, [objetivos, allResultadosChave]);

  const objetivosPorPerspectiva = PERSPECTIVAS.map((persp) => ({
    ...persp,
    objetivos: objetivos.filter((obj) => obj.perspectiva === persp.value),
  }));

  const isLoading = loadingObjetivos || loadingResultados;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Performance das Metas"
        description="Acompanhe o progresso dos seus objetivos estratégicos organizados nas 4 áreas do negócio."
        tooltip="Esta visão mostra o avanço de 0–100% das métricas de progresso de cada objetivo. Para monitorar indicadores de saúde contínua do negócio (verde/amarelo/vermelho), acesse 'Indicadores' no menu."
      />

      {/* Educational callout */}
      <Card className="p-4 bg-muted/30" data-testid="card-bsc-info">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Esta página: progresso das metas (0–100%)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Mostra quanto cada objetivo avançou no ciclo atual. Os percentuais são calculados a partir das métricas de progresso.
            </p>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Para Indicadores (verde/amarelo/vermelho) →</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Indicadores de saúde contínua do negócio estão em "Indicadores" no menu lateral.
            </p>
          </div>
          <Link href="/indicadores" className="hidden sm:block self-center">
            <Button size="sm" variant="ghost" data-testid="link-ver-kpis-bsc">
              Ver Indicadores
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Performance Geral do Plano */}
      <Card className="p-8" data-testid="card-performance-geral">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-performance-geral-title">
                Performance Geral do Plano
              </h2>
              <p className="text-sm text-muted-foreground">
                Consolidação de todos os objetivos estratégicos
              </p>
            </div>
          </div>

          <GaugeChart value={performanceGeral} size={240} />

          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[hsl(0,84%,60%)]" />
              <span className="text-muted-foreground">0-30% Crítico</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[hsl(45,93%,47%)]" />
              <span className="text-muted-foreground">30-70% Atenção</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[hsl(142,76%,36%)]" />
              <span className="text-muted-foreground">70-100% Excelente</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Objetivos por Perspectiva */}
      {objetivos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum objetivo criado</h3>
            <p className="text-sm text-muted-foreground">
              Crie objetivos na página de Metas e Resultados para visualizar o progresso do plano aqui.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {objetivosPorPerspectiva.map((perspectiva) => {
            const Icon = perspectiva.icon;
            if (perspectiva.objetivos.length === 0) return null;

            return (
              <div
                key={perspectiva.value}
                className="space-y-4"
                data-testid={`section-perspectiva-${perspectiva.value}`}
              >
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{perspectiva.nome}</h3>
                    <p className="text-sm text-muted-foreground">{perspectiva.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {perspectiva.objetivos.map((objetivo) => {
                    const performance = calcularPerformanceObjetivo(objetivo.id);
                    const numKRs = allResultadosChave.filter(
                      (kr) => kr.objetivoId === objetivo.id
                    ).length;
                    const hasKRs = numKRs > 0;

                    return (
                      <Card
                        key={objetivo.id}
                        className="p-6 flex flex-col items-center gap-4 hover-elevate"
                        data-testid={`card-objetivo-${objetivo.id}`}
                      >
                        {hasKRs ? (
                          <CircularProgress value={performance} size={100} strokeWidth={10} />
                        ) : (
                          <div className="h-[100px] w-[100px] flex items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-full">
                            <span className="text-xs text-muted-foreground text-center px-2">
                              Sem KRs
                            </span>
                          </div>
                        )}

                        <div className="text-center space-y-2 w-full">
                          <h4
                            className="font-semibold text-sm leading-tight"
                            data-testid={`text-objetivo-titulo-${objetivo.id}`}
                          >
                            {objetivo.titulo}
                          </h4>
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {numKRs} resultado{numKRs !== 1 ? "s" : ""}-chave
                            </span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

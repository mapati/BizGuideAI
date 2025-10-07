import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { GaugeChart } from "@/components/GaugeChart";
import { CircularProgress } from "@/components/CircularProgress";
import { DollarSign, Users, Cog, GraduationCap, Loader2, TrendingUp } from "lucide-react";
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
  // Buscar empresa
  const { data: empresa } = useQuery<Empresa>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  // Buscar objetivos
  const { data: objetivos = [], isLoading: loadingObjetivos, isFetching: fetchingObjetivos } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  // Buscar todos os resultados-chave para todos os objetivos
  const { data: allResultadosChave = [], isLoading: loadingResultados, isFetching: fetchingResultados } = useQuery<ResultadoChave[]>({
    queryKey: ["/api/resultados-chave/all", empresaId, objetivos.map(o => o.id).join(',')],
    queryFn: async () => {
      if (!empresaId || objetivos.length === 0) return [];
      
      const promises = objetivos.map((obj: Objetivo) => 
        fetch(`/api/resultados-chave/${obj.id}`).then(r => r.json())
      );
      
      const results = await Promise.all(promises);
      return results.flat() as ResultadoChave[];
    },
    enabled: !!empresaId && objetivos.length > 0,
  });

  // Função para calcular o progresso de um resultado-chave (0-100%)
  const calcularProgressoKR = (kr: ResultadoChave): number => {
    const inicial = parseFloat(kr.valorInicial);
    const atual = parseFloat(kr.valorAtual);
    const alvo = parseFloat(kr.valorAlvo);

    if (inicial === alvo) return 100;
    
    const progresso = ((atual - inicial) / (alvo - inicial)) * 100;
    return Math.max(0, Math.min(100, progresso));
  };

  // Função para calcular a performance de um objetivo (média dos KRs)
  const calcularPerformanceObjetivo = (objetivoId: string): number => {
    const krs = allResultadosChave.filter(kr => kr.objetivoId === objetivoId);
    
    if (krs.length === 0) return 0;
    
    const somaProgressos = krs.reduce((acc, kr) => acc + calcularProgressoKR(kr), 0);
    return somaProgressos / krs.length;
  };

  // Calcular performance geral (média apenas dos objetivos que têm resultados-chave)
  const performanceGeral = useMemo(() => {
    if (objetivos.length === 0) return 0;
    
    // Filtrar apenas objetivos que têm pelo menos 1 resultado-chave
    const objetivosComKRs = objetivos.filter(obj => 
      allResultadosChave.some(kr => kr.objetivoId === obj.id)
    );
    
    if (objetivosComKRs.length === 0) return 0;
    
    const somaPerformances = objetivosComKRs.reduce(
      (acc, obj) => acc + calcularPerformanceObjetivo(obj.id), 
      0
    );
    
    return somaPerformances / objetivosComKRs.length;
  }, [objetivos, allResultadosChave]);

  // Agrupar objetivos por perspectiva
  const objetivosPorPerspectiva = PERSPECTIVAS.map((persp) => ({
    ...persp,
    objetivos: objetivos.filter((obj) => obj.perspectiva === persp.value),
  }));

  // Mostrar loading enquanto carrega ou revalida dados
  const isLoading = loadingObjetivos || loadingResultados || fetchingObjetivos || fetchingResultados;
  
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
        title="Indicadores de Desempenho"
        description="Acompanhe a performance dos seus objetivos estratégicos organizados nas 4 perspectivas do Balanced Scorecard."
        tooltip="Os indicadores mostram o progresso médio dos resultados-chave de cada objetivo. A performance geral consolida todos os objetivos estratégicos do plano."
      />

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
              Crie objetivos estratégicos na página de OKRs para visualizar os indicadores de desempenho aqui.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {objetivosPorPerspectiva.map((perspectiva) => {
            const Icon = perspectiva.icon;
            
            if (perspectiva.objetivos.length === 0) return null;
            
            return (
              <div key={perspectiva.value} className="space-y-4" data-testid={`section-perspectiva-${perspectiva.value}`}>
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
                    const numKRs = allResultadosChave.filter(kr => kr.objetivoId === objetivo.id).length;
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
                            <span className="text-xs text-muted-foreground text-center px-2">Sem KRs</span>
                          </div>
                        )}
                        
                        <div className="text-center space-y-2 w-full">
                          <h4 className="font-semibold text-sm leading-tight" data-testid={`text-objetivo-titulo-${objetivo.id}`}>
                            {objetivo.titulo}
                          </h4>
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <span>{numKRs} resultado{numKRs !== 1 ? 's' : ''}-chave</span>
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

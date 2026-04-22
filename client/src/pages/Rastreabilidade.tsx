import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, Briefcase, Target, BarChart3, ArrowDown, CheckCircle2, Circle } from "lucide-react";
import type { Estrategia, Iniciativa, Objetivo, Indicador } from "@shared/schema";
import { filterAcompanhamento } from "@/lib/indicadores";

const camadas = [
  { label: "Estratégias", sublabel: "Por que fazemos?", icon: TrendingUp, color: "bg-blue-500/10 border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400" },
  { label: "Iniciativas", sublabel: "O que fazemos?", icon: Briefcase, color: "bg-orange-500/10 border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-400" },
  { label: "Metas", sublabel: "Onde queremos chegar?", icon: Target, color: "bg-purple-500/10 border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-400" },
  { label: "Indicadores", sublabel: "Como medimos?", icon: BarChart3, color: "bg-green-500/10 border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-400" },
];

function MetricCard({ label, value, meta, status }: { label: string; value: string; meta?: string; status?: string }) {
  const pct = meta ? Math.min(100, Math.round((Number(value) / Number(meta)) * 100)) : null;
  return (
    <div className="bg-background rounded-md border p-3 space-y-1.5">
      <p className="text-xs font-medium truncate">{label}</p>
      {pct !== null ? (
        <>
          <Progress value={pct} className="h-1.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{value}</span><span className="font-medium">{pct}%</span><span>{meta}</span>
          </div>
        </>
      ) : (
        <p className="text-sm font-semibold">{value}</p>
      )}
      {status && <Badge variant="outline" className="text-xs">{status}</Badge>}
    </div>
  );
}

export default function Rastreabilidade() {
  const { data: estrategias = [], isLoading: loadingE } = useQuery<Estrategia[]>({ queryKey: ["/api/estrategias"] });
  const { data: iniciativas = [], isLoading: loadingI } = useQuery<Iniciativa[]>({ queryKey: ["/api/iniciativas"] });
  const { data: objetivos = [] } = useQuery<Objetivo[]>({ queryKey: ["/api/objetivos"] });
  const { data: todosIndicadores = [] } = useQuery<Indicador[]>({ queryKey: ["/api/indicadores"] });
  // Task #248 — A camada "Indicadores" da rastreabilidade representa os
  // KPIs estratégicos do plano (BSC), não o diagnóstico inicial.
  const indicadores = filterAcompanhamento(todosIndicadores);

  const isLoading = loadingE || loadingI;

  const totais = [estrategias.length, iniciativas.length, objetivos.length, indicadores.length];
  const cobertura = totais.every(t => t > 0) ? 100 : Math.round((totais.filter(t => t > 0).length / 4) * 100);

  const statusIniciativas = {
    concluida: iniciativas.filter(i => i.status === "concluida").length,
    em_andamento: iniciativas.filter(i => i.status === "em_andamento").length,
    pendente: iniciativas.filter(i => i.status === "pendente").length,
    atrasada: iniciativas.filter(i => i.status === "atrasada").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Rastreabilidade Estratégica"
        description="Visualize a coerência entre as 4 camadas do seu plano: Estratégias → Iniciativas → Metas → Indicadores."
      />

      {/* Barra de cobertura */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Cobertura do Plano Estratégico</span>
            <span className="text-sm font-bold">{cobertura}%</span>
          </div>
          <Progress value={cobertura} className="h-2" data-testid="progress-cobertura" />
          <p className="text-xs text-muted-foreground mt-2">
            {totais.filter(t => t > 0).length} de 4 camadas preenchidas
            {cobertura < 100 && " — preencha todas as camadas para um plano completo"}
          </p>
        </CardContent>
      </Card>

      {/* Matriz de 4 camadas */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {camadas.map((camada, idx) => {
            const Icon = camada.icon;
            const items = [estrategias, iniciativas, objetivos, indicadores][idx];
            const count = items.length;
            return (
              <div key={camada.label}>
                <div className={`border rounded-md ${camada.color}`} data-testid={`camada-${camada.label.toLowerCase()}`}>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-inherit">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${camada.text}`} />
                    <div className="flex-1">
                      <span className={`font-semibold text-sm ${camada.text}`}>{camada.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{camada.sublabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{count} {count === 1 ? "item" : "itens"}</Badge>
                      {count > 0 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-muted-foreground/40" />}
                    </div>
                  </div>
                  <div className="p-4">
                    {count === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhum item cadastrado nesta camada</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(items as any[]).slice(0, 8).map((item: any) => (
                          <Badge key={item.id} variant="outline" className="text-xs max-w-[200px] truncate">
                            {item.descricao || item.titulo || item.metrica || item.nome || "—"}
                          </Badge>
                        ))}
                        {count > 8 && <Badge variant="secondary" className="text-xs">+{count - 8} mais</Badge>}
                      </div>
                    )}
                  </div>
                </div>
                {idx < camadas.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Status de execução */}
      {iniciativas.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">Status de Execução das Iniciativas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(statusIniciativas) as [string, number][]).map(([status, count]) => {
                const labels: Record<string, string> = { concluida: "Concluídas", em_andamento: "Em Andamento", pendente: "Pendentes", atrasada: "Atrasadas" };
                const colors: Record<string, string> = { concluida: "text-green-600", em_andamento: "text-blue-600", pendente: "text-muted-foreground", atrasada: "text-red-600" };
                return (
                  <div key={status} className="text-center" data-testid={`status-ini-${status}`}>
                    <p className={`text-2xl font-bold ${colors[status]}`}>{count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{labels[status]}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

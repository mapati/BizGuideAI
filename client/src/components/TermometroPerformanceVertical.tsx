import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PerformanceMetasData {
  score: number;
  totalObjetivos: number;
  objetivosComKRs: number;
  totalKRs: number;
}

interface EmpresaLite { id: string }

export function TermometroPerformanceVertical() {
  const { data: empresa } = useQuery<EmpresaLite | null>({
    queryKey: ["/api/empresa"],
  });
  const empresaId = empresa?.id;

  const { data, isLoading } = useQuery<PerformanceMetasData>({
    queryKey: ["/api/plano/performance-metas"],
    enabled: !!empresaId,
  });

  if (isLoading) {
    return (
      <div
        className="mx-auto my-2 h-32 w-2 rounded-full bg-muted/50 animate-pulse"
        data-testid="termometro-performance-vertical-loading"
      />
    );
  }

  if (!data) return null;

  const score = Math.max(0, Math.min(100, data.score));
  const semMetas = data.objetivosComKRs === 0;

  const fillClass =
    score >= 80
      ? "bg-green-500"
      : score >= 60
        ? "bg-yellow-500"
        : "bg-red-500";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new Event("biz-assistant:open"));
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className="mx-auto my-2 flex h-32 w-6 items-end justify-center rounded-md hover-elevate"
          data-testid="termometro-performance-vertical"
          aria-label={`Performance geral das metas: ${score} de 100`}
        >
          <span className="relative h-full w-2 overflow-hidden rounded-full bg-muted">
            <span
              className={cn("absolute inset-x-0 bottom-0 transition-all", fillClass)}
              style={{ height: `${score}%` }}
            />
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        <div className="font-medium">Performance geral das metas</div>
        {semMetas ? (
          <div className="text-muted-foreground">Sem metas com resultados-chave</div>
        ) : (
          <>
            <div className="text-muted-foreground">{score}/100</div>
            <div className="text-muted-foreground">
              {data.objetivosComKRs} objetivo{data.objetivosComKRs !== 1 ? "s" : ""} · {data.totalKRs} meta{data.totalKRs !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

import { useRef, useState, useEffect } from "react";
import { Sparkles, ChevronDown, ChevronUp, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface InsightsResult {
  nivel: "neutro" | "positivo" | "atencao" | "critico";
  bullets: string[];
}

interface InsightsApiResponse {
  nivel?: "neutro" | "positivo" | "atencao" | "critico";
  bullets?: string[];
}

interface AssistantInsightsProps {
  pagina: string;
  onAskAbout: (context: string) => void;
}

const NIVEL_LABEL: Record<string, string> = {
  positivo: "Tudo no caminho certo",
  atencao: "Pontos de atenção",
  critico: "Atenção necessária",
  neutro: "Sem dados suficientes",
};

const NIVEL_COLOR: Record<string, string> = {
  positivo: "text-green-600 dark:text-green-400",
  atencao: "text-amber-600 dark:text-amber-400",
  critico: "text-red-600 dark:text-red-400",
  neutro: "text-muted-foreground",
};

export function AssistantInsights({ pagina, onAskAbout }: AssistantInsightsProps) {
  const cacheMapRef = useRef<Map<string, InsightsResult>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const cached = cacheMapRef.current.get(pagina);
    if (cached) {
      setResult(cached);
      setLoading(false);
      return;
    }
    if (fetchingRef.current.has(pagina)) return;

    fetchingRef.current.add(pagina);
    setLoading(true);
    setResult(null);

    apiRequest("POST", "/api/ai/assistente", { modoAnalise: true, pagina })
      .then((data: unknown) => {
        const typed = data as InsightsApiResponse;
        const r: InsightsResult = {
          nivel: typed.nivel ?? "neutro",
          bullets: typed.bullets ?? [],
        };
        cacheMapRef.current.set(pagina, r);
        setResult(r);
      })
      .catch(() => {
        const r: InsightsResult = { nivel: "neutro", bullets: [] };
        cacheMapRef.current.set(pagina, r);
        setResult(r);
      })
      .finally(() => {
        fetchingRef.current.delete(pagina);
        setLoading(false);
      });
  }, [pagina]);

  const handleAskAbout = () => {
    if (!result) return;
    const ctx = `Análise atual de ${pagina}:\n${result.bullets.map((b) => `• ${b}`).join("\n")}`;
    onAskAbout(ctx);
  };

  return (
    <div className="border-b">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover-elevate"
        onClick={() => setCollapsed((c) => !c)}
        data-testid="button-insights-toggle"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold">Análise: {pagina}</span>
          {result && !loading && (
            <span className={cn("text-xs font-normal", NIVEL_COLOR[result.nivel])}>
              — {NIVEL_LABEL[result.nivel]}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {loading ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analisando dados da página...</span>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : result && result.bullets.length > 0 ? (
            <>
              <ul className="space-y-2">
                {result.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={cn("mt-0.5 flex-shrink-0 font-bold", NIVEL_COLOR[result.nivel])}>•</span>
                    <span className="text-foreground leading-snug">{bullet}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-2"
                onClick={handleAskAbout}
                data-testid="button-ask-about-insights"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Perguntar sobre isso
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem dados suficientes para análise de {pagina} ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

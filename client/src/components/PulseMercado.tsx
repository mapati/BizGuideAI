import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface PulseItem {
  titulo: string;
  resumo: string;
  ultimaAtualizacao: string | null;
}

function formatarData(dateStr: string | null): string {
  if (!dateStr) return "sem data";
  const data = new Date(dateStr);
  const agora = new Date();
  const diffMs = agora.getTime() - data.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return "hoje";
  if (diffDias === 1) return "ontem";
  return `há ${diffDias} dias`;
}

export function PulseMercado() {
  const { data: items = [], isLoading } = useQuery<PulseItem[]>({
    queryKey: ["/api/pulse-mercado"],
  });

  if (isLoading) return null;
  if (!items.length) return null;

  const desktopCols =
    items.length === 1
      ? "lg:grid-cols-1"
      : items.length === 2
      ? "lg:grid-cols-2"
      : "lg:grid-cols-3";

  return (
    <Card className="p-5" data-testid="card-pulse-mercado">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="relative flex-shrink-0">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
            style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
            aria-hidden="true"
          />
        </div>
        <h3 className="font-semibold text-sm" data-testid="text-pulse-titulo">
          Pulse do Mercado
        </h3>
        <Badge variant="secondary" className="ml-auto text-xs no-default-active-elevate">
          Cenário macro
        </Badge>
      </div>

      {/* Mobile: horizontal scroll lane; Desktop: responsive grid */}
      <div className="hidden lg:grid gap-4 lg:gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))` }}>
        {items.map((item, i) => (
          <PulseCard key={i} item={item} index={i} />
        ))}
      </div>

      {/* Mobile scroll lane */}
      <div className="flex gap-4 overflow-x-auto pb-1 lg:hidden" style={{ scrollSnapType: "x mandatory" }}>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-72"
            style={{ scrollSnapAlign: "start" }}
          >
            <PulseCard item={item} index={i} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function PulseCard({ item, index }: { item: PulseItem; index: number }) {
  return (
    <div className="space-y-1.5" data-testid={`item-pulse-${index}`}>
      <p
        className="text-sm font-medium leading-snug"
        data-testid={`text-pulse-categoria-${index}`}
      >
        {item.titulo}
      </p>
      <p
        className="text-xs text-muted-foreground leading-relaxed line-clamp-3"
        data-testid={`text-pulse-resumo-${index}`}
      >
        {item.resumo}
      </p>
      <p
        className="text-xs text-muted-foreground/70"
        data-testid={`text-pulse-data-${index}`}
      >
        Atualizado {formatarData(item.ultimaAtualizacao)}
      </p>
    </div>
  );
}

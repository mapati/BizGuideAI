import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

interface SemaphoreBadgeProps {
  status: "verde" | "amarelo" | "vermelho";
}

export function SemaphoreBadge({ status }: SemaphoreBadgeProps) {
  const colors = {
    verde: "text-green-600",
    amarelo: "text-yellow-600",
    vermelho: "text-red-600",
  };

  const labels = {
    verde: "No prazo",
    amarelo: "Atenção",
    vermelho: "Atrasado",
  };

  return (
    <div className="flex items-center gap-2" data-testid={`badge-semaphore-${status}`}>
      <Circle className={`h-3 w-3 fill-current ${colors[status]}`} />
      <span className="text-sm text-muted-foreground">{labels[status]}</span>
    </div>
  );
}

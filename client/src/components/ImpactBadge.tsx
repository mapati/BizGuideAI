import { Badge } from "@/components/ui/badge";

interface ImpactBadgeProps {
  impact: "alto" | "médio" | "baixo";
}

export function ImpactBadge({ impact }: ImpactBadgeProps) {
  const variants = {
    alto: "default" as const,
    médio: "secondary" as const,
    baixo: "outline" as const,
  };

  const labels = {
    alto: "Alto",
    médio: "Médio",
    baixo: "Baixo",
  };

  return (
    <Badge variant={variants[impact]} data-testid={`badge-impact-${impact}`}>
      {labels[impact]}
    </Badge>
  );
}

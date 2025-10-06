import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  trend?: number;
  icon?: React.ReactNode;
  description?: string;
}

export function MetricCard({ title, value, trend, icon, description }: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendText = () => {
    if (!trend) return null;
    const prefix = trend > 0 ? "+" : "";
    return `${prefix}${trend}%`;
  };

  return (
    <Card className="p-6 hover-elevate" data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <div className="space-y-2">
        <div className="text-3xl font-bold font-mono" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            {getTrendIcon()}
            <span className={trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"}>
              {getTrendText()}
            </span>
            {description && <span className="text-muted-foreground ml-1">{description}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

import { MetricCard } from "../MetricCard";
import { TrendingUp } from "lucide-react";

export default function MetricCardExample() {
  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Margem Bruta"
        value="42,5%"
        trend={5.2}
        icon={<TrendingUp className="h-5 w-5" />}
        description="vs. mês anterior"
      />
      <MetricCard
        title="OEE"
        value="74%"
        trend={8}
        description="meta: 75%"
      />
      <MetricCard
        title="Scrap"
        value="2,1%"
        trend={-15}
        description="redução"
      />
      <MetricCard
        title="OTIF"
        value="92%"
        trend={3}
      />
    </div>
  );
}

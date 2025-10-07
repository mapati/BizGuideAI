import { PieChart, Pie, Cell } from "recharts";

interface GaugeChartProps {
  value: number; // 0-100
  size?: number;
  showLabel?: boolean;
}

export function GaugeChart({ value, size = 200, showLabel = true }: GaugeChartProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  
  // Define color based on performance level
  const getColor = (val: number) => {
    if (val < 30) return "hsl(0, 84%, 60%)"; // Crítico (vermelho)
    if (val < 50) return "hsl(25, 95%, 53%)"; // Atenção baixa (laranja)
    if (val < 70) return "hsl(45, 93%, 47%)"; // Atenção (amarelo)
    if (val < 85) return "hsl(142, 76%, 36%)"; // Bom (verde claro)
    return "hsl(142, 76%, 36%)"; // Excelente (verde)
  };

  const getStatus = (val: number) => {
    if (val < 30) return "Crítico";
    if (val < 50) return "Atenção";
    if (val < 70) return "Satisfatório";
    if (val < 85) return "Bom";
    return "Excelente";
  };

  // Create data for the gauge - filled portion and empty portion
  const data = [
    { name: 'value', value: clampedValue },
    { name: 'empty', value: 100 - clampedValue }
  ];

  const COLORS = [getColor(clampedValue), 'hsl(var(--muted))'];

  return (
    <div className="flex flex-col items-center gap-2" data-testid="component-gauge-chart">
      <div className="relative">
        <PieChart width={size} height={size / 1.5}>
          <Pie
            data={data}
            cx={size / 2}
            cy={size / 1.5}
            startAngle={180}
            endAngle={0}
            innerRadius={size * 0.35}
            outerRadius={size * 0.45}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '35%' }}>
          <div className="text-3xl font-bold" data-testid="text-gauge-value">{Math.round(clampedValue)}%</div>
          {showLabel && (
            <div className="text-sm font-medium text-muted-foreground" data-testid="text-gauge-status">
              {getStatus(clampedValue)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

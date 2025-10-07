interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({ value, size = 80, strokeWidth = 8 }: CircularProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedValue / 100) * circumference;

  // Define color based on performance level
  const getColor = (val: number) => {
    if (val < 30) return "hsl(0, 84%, 60%)"; // Crítico (vermelho)
    if (val < 50) return "hsl(25, 95%, 53%)"; // Atenção baixa (laranja)
    if (val < 70) return "hsl(45, 93%, 47%)"; // Atenção (amarelo)
    if (val < 85) return "hsl(142, 76%, 36%)"; // Bom (verde)
    return "hsl(142, 76%, 36%)"; // Excelente (verde escuro)
  };

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="component-circular-progress">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(clampedValue)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold" data-testid="text-circular-progress-value">
          {Math.round(clampedValue)}%
        </span>
      </div>
    </div>
  );
}

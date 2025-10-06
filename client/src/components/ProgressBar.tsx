import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-2" data-testid="component-progress-bar">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label || "Progresso"}</span>
        <span className="font-medium" data-testid="text-progress-percentage">
          {current} de {total} ({percentage}%)
        </span>
      </div>
      <Progress value={percentage} data-testid="progress-bar" />
    </div>
  );
}

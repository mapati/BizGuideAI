import { TooltipHelper } from "./TooltipHelper";

interface PageHeaderProps {
  title: string;
  description: string;
  tooltip?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, tooltip, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{title}</h1>
          {tooltip && <TooltipHelper content={tooltip} />}
        </div>
        <p className="text-muted-foreground max-w-2xl" data-testid="text-page-description">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

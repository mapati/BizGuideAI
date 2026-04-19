import { Card } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface ExampleCardProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  example?: string;
}

export function ExampleCard({ children, title, description, example }: ExampleCardProps) {
  return (
    <Card className="p-4 bg-muted/30" data-testid="component-example-card">
      <div className="flex gap-3">
        <Lightbulb className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          {title && (
            <div className="text-xs font-semibold text-accent uppercase tracking-wide">
              {title}
            </div>
          )}
          {description && (
            <div className="text-sm text-foreground">{description}</div>
          )}
          {example && (
            <div className="text-xs italic text-muted-foreground">{example}</div>
          )}
          {children && (
            <>
              <div className="text-xs font-semibold text-accent uppercase tracking-wide">
                Exemplo típico
              </div>
              <div className="text-sm italic text-muted-foreground">{children}</div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

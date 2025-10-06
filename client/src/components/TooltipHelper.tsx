import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipHelperProps {
  content: string;
}

export function TooltipHelper({ content }: TooltipHelperProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="inline-flex" data-testid="button-tooltip-helper">
          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssistantInsights } from "@/components/AssistantInsights";
import { AssistantChat } from "@/components/AssistantChat";
import { cn } from "@/lib/utils";
import type { Alerta } from "@/hooks/useAssistantStatus";

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pagina: string | null;
  alertas: Alerta[];
}

export function AssistantDrawer({
  isOpen,
  onClose,
  pagina,
  alertas,
}: AssistantDrawerProps) {
  const [chatContext, setChatContext] = useState<string | undefined>(undefined);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (isOpen && !hasOpened) setHasOpened(true);
  }, [isOpen, hasOpened]);

  return (
    <div
      className={cn(
        "assistant-card fixed flex flex-col rounded-2xl border bg-background shadow-2xl",
        "transition-all duration-200 ease-out",
        isOpen
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
          : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
      )}
      style={{
        top: "8.5rem",
        right: "1.25rem",
        transformOrigin: "top right",
        zIndex: 9995,
      }}
      data-testid="component-assistant-drawer"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Assistente Estratégico</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Baseado nos dados da sua empresa
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-assistant-close"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {hasOpened && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-b-2xl">
          {pagina && (
            <div className="flex-shrink-0">
              <AssistantInsights
                pagina={pagina}
                isOpen={isOpen}
                onAskAbout={(ctx) => setChatContext(ctx)}
              />
            </div>
          )}

          <AssistantChat
            alertas={alertas}
            initialContext={chatContext}
            onContextUsed={() => setChatContext(undefined)}
          />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { X, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssistantInsights } from "@/components/AssistantInsights";
import { AssistantChat } from "@/components/AssistantChat";
import { cn } from "@/lib/utils";
import type { Alerta } from "@/hooks/useAssistantStatus";

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseAndClear: () => void;
  pagina: string | null;
  alertas: Alerta[];
}

export function AssistantDrawer({
  isOpen,
  onClose,
  onCloseAndClear,
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
        "fixed bottom-0 right-0 flex flex-col border-l border-t bg-background shadow-2xl transition-transform duration-200",
        isOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
      )}
      style={{
        width: "min(420px, 100vw)",
        height: "min(620px, calc(100vh - 60px))",
        zIndex: 9995,
        borderTopLeftRadius: "0.75rem",
      }}
      data-testid="component-assistant-drawer"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-tl-xl flex-shrink-0">
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-assistant-minimize"
            title="Minimizar"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseAndClear}
            data-testid="button-assistant-close"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {hasOpened && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {pagina && (
            <div className="flex-shrink-0">
              <AssistantInsights
                pagina={pagina}
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

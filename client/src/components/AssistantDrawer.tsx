import { useState, useEffect } from "react";
import { X, Sparkles, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssistantChat } from "@/components/AssistantChat";
import { GuiaContent } from "@/components/GuiaContent";
import { cn } from "@/lib/utils";
import type { Alerta } from "@/hooks/useAssistantStatus";
import type { JornadaProgresso } from "@/hooks/useJornadaProgresso";
import type { AssistantAcao } from "@/components/AssistantChat";

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alertas: Alerta[];
  modo: "guia" | "assistente";
  progresso: JornadaProgresso;
  showUnlock: boolean;
  onUnlockDismiss: () => void;
  proactiveMessage?: { content: string; acoes?: AssistantAcao[]; propostas?: import("@/components/PropostaCard").Proposta[] } | null;
  onProactiveConsumed?: () => void;
}

export function AssistantDrawer({
  isOpen,
  onClose,
  alertas,
  modo,
  progresso,
  showUnlock,
  onUnlockDismiss,
  proactiveMessage,
  onProactiveConsumed,
}: AssistantDrawerProps) {
  const [chatContext, setChatContext] = useState<string | undefined>(undefined);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (isOpen && !hasOpened) setHasOpened(true);
  }, [isOpen, hasOpened]);

  const isGuia = modo === "guia";
  const HeaderIcon = isGuia ? Compass : Sparkles;
  const titulo = isGuia ? "Guia Estratégico" : "Assistente Estratégico";
  const subtitulo = isGuia
    ? "Consultoria passo a passo"
    : "Baseado nos dados da sua empresa";

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
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center transition-colors duration-700",
              isGuia ? "bg-foreground" : "bg-primary"
            )}
          >
            <HeaderIcon
              className={cn(
                "h-3.5 w-3.5 transition-all duration-700",
                isGuia ? "text-background" : "text-primary-foreground"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none" data-testid="text-drawer-titulo">
              {titulo}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
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

      {showUnlock ? (
        <UnlockScreen onContinue={onUnlockDismiss} />
      ) : isGuia ? (
        <GuiaContent progresso={progresso} onNavigate={onClose} />
      ) : (
        hasOpened && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-b-2xl">
            <AssistantChat
              alertas={alertas}
              initialContext={chatContext}
              onContextUsed={() => setChatContext(undefined)}
              proactiveMessage={proactiveMessage}
              onProactiveConsumed={onProactiveConsumed}
              onCloseDrawer={onClose}
            />
          </div>
        )
      )}
    </div>
  );
}

function UnlockScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center flex-1 p-6 text-center gap-4"
      data-testid="screen-unlock"
    >
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center animate-pulse">
          <Sparkles className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-base" data-testid="text-unlock-titulo">
          Assistente Estratégico desbloqueado
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
          Você completou a Jornada Estratégica. A partir de agora, o Assistente analisa seus dados em tempo real e responde perguntas sobre o seu plano.
        </p>
      </div>
      <Button onClick={onContinue} data-testid="button-explorar-assistente">
        Explorar o Assistente
      </Button>
    </div>
  );
}

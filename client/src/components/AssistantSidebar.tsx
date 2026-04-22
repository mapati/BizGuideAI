import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sparkles, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAssistantStatus } from "@/hooks/useAssistantStatus";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { useAIModalLocked } from "@/contexts/ai-modal-lock";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { AssistantChat, type AssistantAcao } from "@/components/AssistantChat";
import type { Proposta } from "@/components/PropostaCard";

const OPEN_KEY = "biz-guide-assistant-sidebar-open";
const UNLOCK_SHOWN_KEY = "biz-guide-assistente-desbloqueado";

interface BriefingResponse {
  deveAbrir: boolean;
  mensagem: string | null;
  acoes?: AssistantAcao[];
  propostas?: Proposta[];
}

interface ProactiveMessage {
  content: string;
  acoes?: AssistantAcao[];
  propostas?: Proposta[];
}

export function AssistantSidebar() {
  const locked = useAIModalLocked();
  const [location] = useLocation();
  const { jornadaConcluida, isLoading: jornadaLoading } = useJornadaProgresso();
  const { alertas } = useAssistantStatus();
  const isMobile = useIsMobile();
  const { data: empresa } = useQuery<{ id: string }>({ queryKey: ["/api/empresa"] });

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // Em telas pequenas a sidebar inicia sempre fechada, ignorando a
    // preferência persistida (que vale apenas para desktop).
    if (window.matchMedia("(max-width: 767px)").matches) return false;
    return window.localStorage.getItem(OPEN_KEY) === "1";
  });
  const [proactive, setProactive] = useState<ProactiveMessage | null>(null);
  const proactiveLoadedRef = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      // ignore
    }
  }, [open]);

  // Auto-abre uma única vez quando a Jornada Estratégica é concluída,
  // preservando o "momento de unlock" da experiência anterior.
  useEffect(() => {
    if (jornadaLoading || !jornadaConcluida) return;
    try {
      if (window.localStorage.getItem(UNLOCK_SHOWN_KEY) === "1") return;
      window.localStorage.setItem(UNLOCK_SHOWN_KEY, "1");
      setOpen(true);
    } catch {
      // ignore
    }
  }, [jornadaConcluida, jornadaLoading]);

  // Briefing proativo (mantém comportamento anterior do AIAssistant).
  useEffect(() => {
    if (jornadaLoading || !jornadaConcluida || !empresa?.id) return;
    if (proactiveLoadedRef.current) return;
    proactiveLoadedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const data = (await apiRequest("GET", "/api/ai/briefing-proativo")) as BriefingResponse;
        if (cancelled) return;
        if (data.deveAbrir && data.mensagem) {
          setProactive({ content: data.mensagem, acoes: data.acoes, propostas: data.propostas });
        }
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jornadaLoading, jornadaConcluida, empresa?.id]);

  // Permite que componentes filhos peçam para fechar (ex.: PropostaCard ao "Ajustar").
  useEffect(() => {
    const onClose = () => setOpen(false);
    window.addEventListener("biz-assistant:close", onClose);
    return () => window.removeEventListener("biz-assistant:close", onClose);
  }, []);

  const hidden =
    locked ||
    jornadaLoading ||
    !jornadaConcluida ||
    location === "/assistente";

  if (hidden) return null;

  const desktopWidth = open ? "w-[22rem]" : "w-12";
  const mobileTransform = open ? "translate-x-0" : "translate-x-full";

  return (
    <>
      <aside
        data-testid="component-assistant-sidebar"
        data-state={open ? "expanded" : "collapsed"}
        className={cn(
          "bg-background border-l flex flex-col flex-shrink-0",
          isMobile
            ? cn(
                "fixed inset-y-0 right-0 z-50 w-[20rem] max-w-[90vw] transition-transform duration-200 shadow-xl",
                mobileTransform,
              )
            : cn("transition-[width] duration-200 ease-out", desktopWidth),
        )}
      >
        {open && (
          <div className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none truncate">Assistente</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Estratégico</p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setOpen(false)}
              title="Fechar Assistente"
              data-testid="button-assistant-sidebar-close"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Chat permanece montado para preservar o estado da conversa
            durante a navegação e ao colapsar/expandir a sidebar. */}
        <div className={cn("flex-1 min-h-0 flex flex-col", !open && "hidden")}>
          <AssistantChat
            alertas={alertas}
            proactiveMessage={proactive}
            onProactiveConsumed={() => setProactive(null)}
            onCloseDrawer={() => setOpen(false)}
          />
        </div>

        {!open && !isMobile && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-3 py-3 w-full hover-elevate"
            title="Abrir Assistente Estratégico"
            data-testid="button-assistant-sidebar-toggle"
          >
            <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            <Sparkles className="h-4 w-4 text-primary" />
          </button>
        )}
      </aside>

      {isMobile && !open && (
        <Button
          size="icon"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 rounded-full shadow-lg z-40"
          data-testid="button-assistant-sidebar-toggle"
          title="Abrir Assistente"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      )}

      {isMobile && open && (
        <button
          type="button"
          aria-label="Fechar Assistente"
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40"
          data-testid="overlay-assistant-sidebar"
        />
      )}
    </>
  );
}

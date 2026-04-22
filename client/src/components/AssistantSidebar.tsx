import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, PanelRightClose, PanelRightOpen, Loader2, Target, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAssistantStatus } from "@/hooks/useAssistantStatus";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { useAIModalLocked } from "@/contexts/ai-modal-lock";
import { useIsMobile } from "@/hooks/use-mobile";
import { AssistantChat } from "@/components/AssistantChat";
import { PropostaHistorico } from "@/components/PropostaHistorico";
import { GuiaContent } from "@/components/GuiaContent";
import {
  PlanoAgenticoCard,
  type PlanoAgenticoView,
  type PlanoAgenticoPassoView,
} from "@/components/PlanoAgenticoCard";

const OPEN_KEY = "biz-guide-assistant-sidebar-open";
const UNLOCK_SHOWN_KEY = "biz-guide-assistente-desbloqueado";

export function AssistantSidebar() {
  const locked = useAIModalLocked();
  const progresso = useJornadaProgresso();
  const { jornadaConcluida, isLoading: jornadaLoading } = progresso;
  const { alertas } = useAssistantStatus();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(max-width: 767px)").matches) return false;
    return window.localStorage.getItem(OPEN_KEY) === "1";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      // ignore
    }
  }, [open]);

  // Auto-abre uma única vez quando a Jornada Estratégica é concluída.
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

  // Permite que componentes filhos peçam para fechar (ex.: PropostaCard ao "Ajustar").
  useEffect(() => {
    const onClose = () => setOpen(false);
    window.addEventListener("biz-assistant:close", onClose);
    return () => window.removeEventListener("biz-assistant:close", onClose);
  }, []);

  if (locked || jornadaLoading) return null;

  const showGuia = !jornadaConcluida;

  const desktopWidth = open ? "w-[26rem]" : "w-12";
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
                "fixed inset-y-0 right-0 z-50 w-[24rem] max-w-[95vw] transition-transform duration-200 shadow-xl",
                mobileTransform,
              )
            : cn("transition-[width] duration-200 ease-out", desktopWidth),
        )}
      >
        {open && (
          <div className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                {showGuia ? (
                  <Compass className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none truncate">
                  {showGuia ? "Guia" : "Assistente"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Estratégico</p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setOpen(false)}
              title={showGuia ? "Fechar Guia" : "Fechar Assistente"}
              data-testid="button-assistant-sidebar-close"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        )}

        {showGuia && (
          <div className={cn("flex-1 min-h-0 flex flex-col", !open && "hidden")}>
            <GuiaContent progresso={progresso} onNavigate={() => isMobile && setOpen(false)} />
          </div>
        )}

        {/* Tabs Chat / Planos / Histórico — todos forceMount para preservar
            estado da conversa e dos filtros ao trocar de aba. */}
        {!showGuia && (
        <div className={cn("flex-1 min-h-0 flex flex-col", !open && "hidden")}>
          <Tabs defaultValue="chat" className="flex-1 min-h-0 flex flex-col">
            <TabsList
              className="grid grid-cols-3 mx-3 mt-2 mb-1 flex-shrink-0"
              data-testid="tabs-assistant-sidebar"
            >
              <TabsTrigger value="chat" data-testid="tab-chat">Chat</TabsTrigger>
              <TabsTrigger value="planos" data-testid="tab-planos">Planos</TabsTrigger>
              <TabsTrigger value="historico" data-testid="tab-historico">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent
              value="chat"
              forceMount
              className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden flex flex-col"
            >
              <AssistantChat
                alertas={alertas}
                onCloseDrawer={() => setOpen(false)}
              />
            </TabsContent>
            <TabsContent
              value="planos"
              forceMount
              className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-y-auto p-3"
            >
              <PlanosAgenticosLista />
            </TabsContent>
            <TabsContent
              value="historico"
              forceMount
              className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden flex flex-col"
            >
              <PropostaHistorico />
            </TabsContent>
          </Tabs>
        </div>
        )}

        {!open && !isMobile && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-3 py-3 w-full hover-elevate"
            title={showGuia ? "Abrir Guia Estratégico" : "Abrir Assistente Estratégico"}
            data-testid="button-assistant-sidebar-toggle"
          >
            <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            {showGuia ? (
              <Compass className="h-4 w-4 text-primary" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </button>
        )}
      </aside>

      {isMobile && !open && (
        <Button
          size="icon"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 rounded-full shadow-lg z-40"
          data-testid="button-assistant-sidebar-toggle"
          title={showGuia ? "Abrir Guia" : "Abrir Assistente"}
        >
          {showGuia ? (
            <Compass className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      )}

      {isMobile && open && (
        <button
          type="button"
          aria-label={showGuia ? "Fechar Guia" : "Fechar Assistente"}
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40"
          data-testid="overlay-assistant-sidebar"
        />
      )}
    </>
  );
}

function PlanosAgenticosLista() {
  const { data, isLoading } = useQuery<{ planos: Array<PlanoAgenticoView> }>({
    queryKey: ["/api/ai/planos"],
    refetchInterval: 30000,
  });
  const planos = data?.planos ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando planos…
      </div>
    );
  }
  if (planos.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Target className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground" data-testid="text-planos-vazio">
          Nenhum plano agêntico ainda. Quando você pedir algo amplo no chat, o assistente pode propor um plano de vários passos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="lista-planos-agenticos">
      {planos.map((p) => (
        <PlanoComPassos key={p.id} plano={p} />
      ))}
    </div>
  );
}

function PlanoComPassos({ plano }: { plano: PlanoAgenticoView }) {
  const { data } = useQuery<{ plano: PlanoAgenticoView; passos: PlanoAgenticoPassoView[] }>({
    queryKey: ["/api/ai/planos", plano.id],
    queryFn: async () => {
      const res = await fetch(`/api/ai/planos/${plano.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar plano");
      return res.json();
    },
  });
  const passos = data?.passos ?? [];
  return <PlanoAgenticoCard plano={data?.plano ?? plano} passos={passos} />;
}

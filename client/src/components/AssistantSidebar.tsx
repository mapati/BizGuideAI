import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PanelRightClose, PanelRightOpen, Loader2, Target } from "lucide-react";
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
import { BizzyAvatar } from "@/components/BizzyAvatar";
import {
  PlanoAgenticoCard,
  type PlanoAgenticoView,
  type PlanoAgenticoPassoView,
} from "@/components/PlanoAgenticoCard";

export function AssistantSidebar() {
  const locked = useAIModalLocked();
  const progresso = useJornadaProgresso();
  const { jornadaConcluida, isLoading: jornadaLoading } = progresso;
  const { alertas } = useAssistantStatus();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState<boolean>(false);

  // Define o estado inicial uma única vez por carregamento de página, baseado
  // no modo: Guia Estratégico (jornada incompleta) abre por padrão para
  // apresentar a ferramenta; Assistente (jornada concluída) inicia fechado
  // para um visual mais limpo no dia a dia.
  const initialAppliedRef = useRef(false);
  useEffect(() => {
    if (jornadaLoading || initialAppliedRef.current) return;
    initialAppliedRef.current = true;
    if (isMobile) return; // mobile sempre inicia fechado para não cobrir o conteúdo
    setOpen(!jornadaConcluida);
  }, [jornadaLoading, jornadaConcluida, isMobile]);

  // Permite que componentes filhos peçam para fechar (ex.: PropostaCard ao "Ajustar").
  useEffect(() => {
    const onClose = () => setOpen(false);
    const onOpen = () => setOpen(true);
    window.addEventListener("biz-assistant:close", onClose);
    window.addEventListener("biz-assistant:open", onOpen);
    return () => {
      window.removeEventListener("biz-assistant:close", onClose);
      window.removeEventListener("biz-assistant:open", onOpen);
    };
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
          "bg-background border-l flex flex-col flex-shrink-0 min-h-0 overflow-hidden",
          isMobile
            ? cn(
                "fixed inset-y-0 right-0 z-50 w-[24rem] max-w-[95vw] transition-transform duration-200 shadow-xl",
                mobileTransform,
              )
            : cn("h-full transition-[width] duration-200 ease-out", desktopWidth),
        )}
      >
        {open && (
          <div className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <BizzyAvatar size="md" mode={showGuia ? "guia" : "assistente"} />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none truncate">Bizzy</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {showGuia ? "modo Guia" : "modo Assistente"}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setOpen(false)}
              title={showGuia ? "Fechar Bizzy (modo Guia)" : "Fechar Bizzy"}
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
            title={showGuia ? "Abrir Bizzy (modo Guia)" : "Abrir Bizzy"}
            data-testid="button-assistant-sidebar-toggle"
          >
            <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            <BizzyAvatar size="sm" mode={showGuia ? "guia" : "assistente"} />
          </button>
        )}
      </aside>

      {isMobile && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 rounded-full shadow-lg z-40 p-1 bg-background border hover-elevate active-elevate-2"
          data-testid="button-assistant-sidebar-toggle"
          title={showGuia ? "Abrir Bizzy (modo Guia)" : "Abrir Bizzy"}
          aria-label={showGuia ? "Abrir Bizzy (modo Guia)" : "Abrir Bizzy"}
        >
          <BizzyAvatar size="md" mode={showGuia ? "guia" : "assistente"} />
        </button>
      )}

      {isMobile && open && (
        <button
          type="button"
          aria-label={showGuia ? "Fechar Bizzy (modo Guia)" : "Fechar Bizzy"}
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
          Nenhum plano agêntico ainda. Quando você pedir algo amplo no chat, o Bizzy pode propor um plano de vários passos.
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

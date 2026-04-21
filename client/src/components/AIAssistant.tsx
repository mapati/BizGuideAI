import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AssistantChip } from "@/components/AssistantChip";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { useAssistantStatus } from "@/hooks/useAssistantStatus";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { apiRequest } from "@/lib/queryClient";
import type { AssistantAcao } from "@/components/AssistantChat";

const UNLOCK_SHOWN_KEY = "biz-guide-assistente-desbloqueado";

interface ProactiveMessage {
  content: string;
  acoes?: AssistantAcao[];
}

interface BriefingResponse {
  deveAbrir: boolean;
  mensagem: string | null;
  acoes?: AssistantAcao[];
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState<ProactiveMessage | null>(null);
  const { nivel, preview, alertas, pagina } = useAssistantStatus();
  const progresso = useJornadaProgresso();
  const { data: empresa } = useQuery<{ id: string }>({ queryKey: ["/api/empresa"] });
  const empresaId = empresa?.id;

  const modo: "guia" | "assistente" = progresso.jornadaConcluida ? "assistente" : "guia";

  // Unlock animation (one-time, persistent). Marca como visto sem abrir o
  // drawer automaticamente — a Home e a página /assistente já comunicam isso.
  useEffect(() => {
    if (progresso.isLoading) return;
    if (!progresso.jornadaConcluida) return;
    if (localStorage.getItem(UNLOCK_SHOWN_KEY) === "1") return;
    localStorage.setItem(UNLOCK_SHOWN_KEY, "1");
  }, [progresso.jornadaConcluida, progresso.isLoading]);

  // Briefing proativo — busca para alimentar o preview do chip, mas NÃO abre
  // o drawer sozinho. O cartão na Home e a página /assistente são os pontos
  // de entrada principais; o usuário abre o chat manualmente quando quiser.
  useEffect(() => {
    if (progresso.isLoading) return;
    if (!progresso.jornadaConcluida) return;
    if (!empresaId) return;

    let cancelled = false;

    const fetchBriefing = async () => {
      try {
        const data = (await apiRequest("GET", "/api/ai/briefing-proativo")) as BriefingResponse;
        if (cancelled) return;
        if (data.deveAbrir && data.mensagem) {
          setProactiveMessage({ content: data.mensagem, acoes: data.acoes });
        }
      } catch {
        // silently ignore — proactive briefing is best-effort
      }
    };

    fetchBriefing();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchBriefing();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [progresso.isLoading, progresso.jornadaConcluida, empresaId]);

  if (progresso.isLoading) return null;

  const chipPreview = modo === "guia" ? "Guia Estratégico" : preview;
  const chipNivel = modo === "guia" ? "neutro" : nivel;

  return (
    <>
      <AssistantChip
        nivel={chipNivel}
        preview={chipPreview}
        onClick={() => setIsOpen(true)}
        isOpen={isOpen}
        modo={modo}
      />
      <AssistantDrawer
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setShowUnlock(false);
        }}
        pagina={pagina}
        alertas={alertas}
        modo={modo}
        progresso={progresso}
        showUnlock={showUnlock}
        onUnlockDismiss={() => setShowUnlock(false)}
        proactiveMessage={proactiveMessage}
        onProactiveConsumed={() => setProactiveMessage(null)}
      />
    </>
  );
}

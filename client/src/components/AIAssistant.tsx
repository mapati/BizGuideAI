import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AssistantChip } from "@/components/AssistantChip";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { useAssistantStatus } from "@/hooks/useAssistantStatus";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { apiRequest } from "@/lib/queryClient";
import type { AssistantAcao } from "@/components/AssistantChat";

const UNLOCK_SHOWN_KEY = "biz-guide-assistente-desbloqueado";
const PROACTIVE_SESSION_KEY_PREFIX = "biz-guide-assistente-proativo-sessao:";

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

  // Unlock animation (one-time, persistent)
  useEffect(() => {
    if (progresso.isLoading) return;
    if (!progresso.jornadaConcluida) return;
    if (localStorage.getItem(UNLOCK_SHOWN_KEY) === "1") return;
    localStorage.setItem(UNLOCK_SHOWN_KEY, "1");
    setShowUnlock(true);
    setIsOpen(true);
  }, [progresso.jornadaConcluida, progresso.isLoading]);

  // Proactive briefing — once per session per company, only when journey is completed
  useEffect(() => {
    if (progresso.isLoading) return;
    if (!progresso.jornadaConcluida) return;
    if (!empresaId) return;
    const sessionKey = `${PROACTIVE_SESSION_KEY_PREFIX}${empresaId}`;
    if (sessionStorage.getItem(sessionKey) === "1") return;

    let cancelled = false;
    (async () => {
      try {
        const data = (await apiRequest("GET", "/api/ai/briefing-proativo")) as BriefingResponse;
        if (cancelled) return;
        sessionStorage.setItem(sessionKey, "1");
        if (data.deveAbrir && data.mensagem) {
          setProactiveMessage({ content: data.mensagem, acoes: data.acoes });
          // Auto-open the assistant if not in unlock flow
          if (localStorage.getItem(UNLOCK_SHOWN_KEY) === "1") {
            setIsOpen(true);
          }
        }
      } catch {
        // silently ignore — proactive briefing is best-effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [progresso.jornadaConcluida, progresso.isLoading, empresaId]);

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

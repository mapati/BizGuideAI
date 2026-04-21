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

  // Proactive briefing — fires when there are critical signals.
  // Auto-open is throttled to once per browser session per company,
  // but the briefing itself can be re-fetched (e.g. when the tab regains focus
  // after the data has changed). The session lock is only set once we actually
  // surfaced something to the user.
  useEffect(() => {
    if (progresso.isLoading) return;
    if (!progresso.jornadaConcluida) return;
    if (!empresaId) return;

    const sessionKey = `${PROACTIVE_SESSION_KEY_PREFIX}${empresaId}`;

    let cancelled = false;

    const fetchBriefing = async (opts?: { force?: boolean }) => {
      try {
        const data = (await apiRequest("GET", "/api/ai/briefing-proativo")) as BriefingResponse;
        if (cancelled) return;
        if (data.deveAbrir && data.mensagem) {
          setProactiveMessage({ content: data.mensagem, acoes: data.acoes });
          const alreadyAutoOpened = sessionStorage.getItem(sessionKey) === "1";
          // Auto-open at most once per session per company — and only after the
          // unlock animation has already happened, to avoid two pop-ups on top
          // of each other. The user can always reopen via the chip.
          if (
            !alreadyAutoOpened &&
            localStorage.getItem(UNLOCK_SHOWN_KEY) === "1" &&
            (opts?.force || !isOpen)
          ) {
            setIsOpen(true);
            sessionStorage.setItem(sessionKey, "1");
          }
        }
      } catch {
        // silently ignore — proactive briefing is best-effort
      }
    };

    fetchBriefing();

    // Re-check when the tab becomes visible again — handles the case where the
    // user left the tab open all morning and a KPI just turned red.
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
    // isOpen is intentionally omitted: we only want the fetch to react to
    // identity/load changes, not to the drawer toggling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progresso.isLoading, empresaId]);

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

import { useState, useEffect } from "react";
import { AssistantChip } from "@/components/AssistantChip";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { useAssistantStatus } from "@/hooks/useAssistantStatus";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";

const UNLOCK_SHOWN_KEY = "biz-guide-assistente-desbloqueado";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const { nivel, preview, alertas, pagina } = useAssistantStatus();
  const progresso = useJornadaProgresso();

  const modo: "guia" | "assistente" = progresso.jornadaConcluida ? "assistente" : "guia";

  useEffect(() => {
    if (progresso.isLoading) return;
    if (!progresso.jornadaConcluida) return;
    if (localStorage.getItem(UNLOCK_SHOWN_KEY) === "1") return;
    localStorage.setItem(UNLOCK_SHOWN_KEY, "1");
    setShowUnlock(true);
    setIsOpen(true);
  }, [progresso.jornadaConcluida, progresso.isLoading]);

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
      />
    </>
  );
}

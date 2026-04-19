import { useState, useEffect, useRef } from "react";
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
  const prevConcluidaRef = useRef<boolean | null>(null);

  const modo: "guia" | "assistente" = progresso.jornadaConcluida ? "assistente" : "guia";

  useEffect(() => {
    if (progresso.isLoading) return;
    const prev = prevConcluidaRef.current;
    const atual = progresso.jornadaConcluida;
    const jaMostrou = localStorage.getItem(UNLOCK_SHOWN_KEY) === "1";
    if (prev === null) {
      prevConcluidaRef.current = atual;
      if (atual && !jaMostrou) {
        localStorage.setItem(UNLOCK_SHOWN_KEY, "1");
        setShowUnlock(true);
        setIsOpen(true);
      }
      return;
    }
    if (prev === false && atual === true && !jaMostrou) {
      localStorage.setItem(UNLOCK_SHOWN_KEY, "1");
      setShowUnlock(true);
      setIsOpen(true);
    }
    prevConcluidaRef.current = atual;
  }, [progresso.jornadaConcluida, progresso.isLoading]);

  const guiaPreview = (() => {
    const proxima = progresso.etapas.find(
      (e) => !e.concluida && (!e.bloqueadaPor || e.bloqueadaPor.length === 0)
    );
    if (proxima) return `Próxima: ${proxima.nome}`;
    return `${progresso.totalConcluidas} de ${progresso.total} etapas`;
  })();

  const chipPreview = modo === "guia" ? guiaPreview : preview;
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

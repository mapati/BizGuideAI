import { useState } from "react";
import { AssistantChip } from "@/components/AssistantChip";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { useAssistantStatus } from "@/hooks/useAssistantStatus";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { nivel, preview, alertas, pagina } = useAssistantStatus();

  return (
    <>
      <AssistantChip
        nivel={nivel}
        preview={preview}
        onClick={() => setIsOpen(true)}
        isOpen={isOpen}
      />
      <AssistantDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        pagina={pagina}
        alertas={alertas}
      />
    </>
  );
}

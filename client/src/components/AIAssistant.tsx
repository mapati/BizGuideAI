import { useState } from "react";
import { AssistantChip } from "@/components/AssistantChip";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { useAssistantStatus } from "@/hooks/useAssistantStatus";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { nivel, preview, alertas, pagina } = useAssistantStatus();

  return (
    <>
      {!isOpen && (
        <AssistantChip
          nivel={nivel}
          preview={preview}
          onClick={() => setIsOpen(true)}
        />
      )}
      <AssistantDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCloseAndClear={() => setIsOpen(false)}
        pagina={pagina}
        alertas={alertas}
      />
    </>
  );
}

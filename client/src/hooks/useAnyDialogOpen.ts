import { useEffect, useState } from "react";

/**
 * Retorna true sempre que houver algum diálogo modal aberto na página
 * (Radix Dialog/AlertDialog/Sheet renderizam `[role="dialog"][data-state="open"]`).
 * Usa MutationObserver para detectar abertura/fechamento sem polling.
 */
export function useAnyDialogOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const check = () => {
      const found = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      );
      setOpen(!!found);
    };

    check();

    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "role"],
    });

    return () => observer.disconnect();
  }, []);

  return open;
}

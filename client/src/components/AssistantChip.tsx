import { Sparkles, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NivelStatus } from "@/hooks/useAssistantStatus";

interface AssistantChipProps {
  nivel: NivelStatus;
  preview: string;
  onClick: () => void;
  isOpen: boolean;
  modo: "guia" | "assistente";
}

const CONFIG: Record<NivelStatus, { bg: string; text: string; border: string; pulse: boolean }> = {
  neutro: {
    bg: "bg-background",
    text: "text-foreground",
    border: "border-border",
    pulse: false,
  },
  positivo: {
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    pulse: false,
  },
  atencao: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    pulse: false,
  },
  critico: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    pulse: true,
  },
};

const GUIA_CONFIG = {
  bg: "bg-sky-300 dark:bg-sky-400",
  text: "text-sky-950 dark:text-sky-950",
  border: "border-sky-200 dark:border-sky-300",
  pulse: true,
};

export function AssistantChip({ nivel, preview, onClick, isOpen, modo }: AssistantChipProps) {
  const isGuia = modo === "guia";
  const cfg = isGuia ? GUIA_CONFIG : CONFIG[nivel];
  const Icon = isGuia ? Compass : Sparkles;
  const title = isGuia ? "Abrir Guia Estratégico" : "Abrir Assistente Estratégico";

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed top-[5.5rem] right-5 flex items-center gap-2 px-4 py-2.5",
        "rounded-full border shadow-md transition-all duration-300",
        "hover:shadow-lg active:scale-95",
        cfg.bg,
        cfg.border,
        cfg.text,
        isGuia && "guide-chip-glow font-semibold",
        isOpen ? "opacity-0 pointer-events-none translate-x-full" : "opacity-100 translate-x-0",
      )}
      style={{ zIndex: 9990 }}
      data-testid="button-assistant-chip"
      title={title}
    >
      <div className={cn("relative flex-shrink-0", cfg.pulse && "animate-pulse")}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium max-w-[180px] truncate">{preview}</span>
    </button>
  );
}

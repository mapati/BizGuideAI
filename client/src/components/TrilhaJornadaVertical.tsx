import { Link } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { JornadaProgresso, JornadaEtapa } from "@/hooks/useJornadaProgresso";

interface TrilhaJornadaVerticalProps {
  progresso: JornadaProgresso;
  onNavigate?: () => void;
}

function statusOf(etapa: JornadaEtapa): "concluida" | "atual" | "bloqueada" | "pendente" {
  if (etapa.concluida) return "concluida";
  const bloqueada = !!(etapa.bloqueadaPor && etapa.bloqueadaPor.length > 0);
  if (bloqueada) return "bloqueada";
  return etapa.status === "iniciado" ? "atual" : "pendente";
}

export function TrilhaJornadaVertical({ progresso, onNavigate }: TrilhaJornadaVerticalProps) {
  const { etapas } = progresso;

  // A "atual" é a primeira não-concluída e não-bloqueada (caso nenhuma esteja
  // marcada como iniciada). Garante que sempre exista um destaque visual.
  const atualIndex = (() => {
    const iniciada = etapas.findIndex(
      (e) => !e.concluida && e.status === "iniciado" && (!e.bloqueadaPor || e.bloqueadaPor.length === 0),
    );
    if (iniciada >= 0) return iniciada;
    return etapas.findIndex(
      (e) => !e.concluida && (!e.bloqueadaPor || e.bloqueadaPor.length === 0),
    );
  })();

  return (
    <div
      className="flex flex-col items-center gap-1.5 py-2"
      data-testid="trilha-jornada-vertical"
    >
      {etapas.map((etapa, i) => {
        const computed = statusOf(etapa);
        const status = i === atualIndex && computed !== "concluida" && computed !== "bloqueada"
          ? "atual"
          : computed;
        const Icone = etapa.icone;

        const dot = (
          <span
            className={cn(
              "block rounded-full border transition-colors",
              status === "concluida"
                ? "h-2 w-2 bg-green-500 dark:bg-green-400 border-green-500 dark:border-green-400"
                : status === "atual"
                  ? "h-2.5 w-2.5 bg-primary border-primary ring-2 ring-primary/30"
                  : status === "bloqueada"
                    ? "h-2 w-2 bg-transparent border-muted-foreground/30"
                    : "h-2 w-2 bg-transparent border-muted-foreground/60",
            )}
          />
        );

        const trigger = (
          <span
            className="flex h-4 w-6 items-center justify-center cursor-pointer hover-elevate rounded-sm"
            data-testid={`trilha-marcador-${etapa.id}`}
            data-status={status}
          >
            {dot}
          </span>
        );

        const isClickable = status !== "bloqueada";

        return (
          <Tooltip key={etapa.id}>
            <TooltipTrigger asChild>
              {isClickable ? (
                <Link
                  href={etapa.rota}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.();
                  }}
                >
                  {trigger}
                </Link>
              ) : (
                <span
                  onClick={(e) => e.stopPropagation()}
                  aria-disabled
                  className="opacity-60"
                >
                  {trigger}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              <div className="flex items-center gap-1.5">
                <Icone className="h-3 w-3" />
                <span className="font-medium">
                  {i + 1}. {etapa.nome}
                </span>
              </div>
              <div className="text-muted-foreground mt-0.5">
                {status === "concluida"
                  ? "Concluída"
                  : status === "atual"
                    ? "Etapa atual"
                    : status === "bloqueada"
                      ? "Bloqueada"
                      : "Pendente"}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

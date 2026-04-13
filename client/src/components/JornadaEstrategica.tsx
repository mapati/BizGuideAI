import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Lock,
  Map,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import type { JornadaStep } from "@/hooks/useJornadaProgresso";

function StepItem({ step }: { step: JornadaStep }) {
  const bloqueado = step.bloqueadoPor && step.bloqueadoPor.length > 0;

  return (
    <div
      className={`flex items-start gap-3 py-3 px-4 rounded-md transition-colors ${
        step.concluido
          ? "opacity-60"
          : bloqueado
          ? "opacity-50"
          : "hover-elevate cursor-pointer"
      }`}
      data-testid={`jornada-step-${step.id}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {step.concluido ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : bloqueado ? (
          <Lock className="h-5 w-5 text-muted-foreground/50" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground">
            {step.numero}.
          </span>
          <span
            className={`text-sm font-medium ${
              step.concluido ? "line-through text-muted-foreground" : ""
            }`}
          >
            {step.titulo}
          </span>
          {step.concluido && (
            <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-600/30">
              Concluído
            </Badge>
          )}
          {bloqueado && !step.concluido && (
            <Badge variant="secondary" className="text-xs">
              Aguardando etapa anterior
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {step.descricao}
        </p>
      </div>
      {!step.concluido && !bloqueado && (
        <Link href={step.url} data-testid={`link-jornada-${step.id}`}>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}

export function JornadaEstrategica() {
  const [open, setOpen] = useState(true);
  const { steps, totalConcluidos, total, percentual, jornadaConcluida, isLoading } =
    useJornadaProgresso();

  if (isLoading) return null;
  if (jornadaConcluida) return null;

  const proximaStep = steps.find(
    (s) => !s.concluido && (!s.bloqueadoPor || s.bloqueadoPor.length === 0)
  );

  return (
    <Card className="mb-6" data-testid="card-jornada-estrategica">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-left hover-elevate"
            data-testid="button-toggle-jornada"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                <span className="font-semibold">Jornada Estratégica</span>
              </div>
              <Badge variant="secondary" data-testid="badge-jornada-progresso">
                {totalConcluidos}/{total} etapas
              </Badge>
              {proximaStep && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Próxima: {proximaStep.titulo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <Progress value={percentual} className="w-24 h-1.5" />
                <span className="text-xs text-muted-foreground">{percentual}%</span>
              </div>
              {open ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-2 pb-4">
            <div className="flex items-center gap-2 px-4 pb-3 sm:hidden">
              <Progress value={percentual} className="flex-1 h-1.5" />
              <span className="text-xs text-muted-foreground">{percentual}%</span>
            </div>
            <div className="divide-y divide-border/50">
              {steps.map((step) => (
                <StepItem key={step.id} step={step} />
              ))}
            </div>
            {proximaStep && (
              <div className="mt-4 px-4">
                <Link href={proximaStep.url}>
                  <Button
                    className="w-full sm:w-auto"
                    data-testid="button-proxima-etapa"
                  >
                    Ir para: {proximaStep.titulo}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

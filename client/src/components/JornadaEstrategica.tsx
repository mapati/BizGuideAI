import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Map,
  ArrowRight,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import type { JornadaEtapa } from "@/hooks/useJornadaProgresso";

function getCtaLabel(etapa: JornadaEtapa): string {
  if (etapa.status === "concluido") return "Revisar";
  if (etapa.status === "iniciado") return "Continuar";
  return "Iniciar";
}

function getStatusBadge(etapa: JornadaEtapa) {
  const bloqueada = etapa.bloqueadaPor && etapa.bloqueadaPor.length > 0;
  if (etapa.status === "concluido") {
    return (
      <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-600/30">
        Concluído
      </Badge>
    );
  }
  if (bloqueada) {
    return (
      <Badge variant="secondary" className="text-xs">
        Aguardando etapa anterior
      </Badge>
    );
  }
  if (etapa.status === "iniciado") {
    return (
      <Badge variant="secondary" className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
        Iniciado
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
      Pendente
    </Badge>
  );
}

function EtapaCard({ etapa }: { etapa: JornadaEtapa }) {
  const bloqueada = etapa.bloqueadaPor && etapa.bloqueadaPor.length > 0;
  const Icone = etapa.icone;
  const ctaLabel = getCtaLabel(etapa);

  return (
    <div
      className={`flex items-start gap-3 py-3 px-4 rounded-md transition-colors ${
        etapa.concluida
          ? "opacity-60"
          : bloqueada
          ? "opacity-40"
          : ""
      }`}
      data-testid={`jornada-etapa-${etapa.id}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {etapa.concluida ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : bloqueada ? (
          <Lock className="h-5 w-5 text-muted-foreground/40" />
        ) : (
          <Icone className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {etapa.id === "perfil" ? "1" : etapa.id === "indicadores" ? "2" : etapa.id === "pestel" ? "3" : etapa.id === "cinco-forcas" ? "4" : etapa.id === "bmc" ? "5" : etapa.id === "swot" ? "6" : etapa.id === "estrategias" ? "7" : etapa.id === "oportunidades" ? "8" : etapa.id === "iniciativas" ? "9" : etapa.id === "okrs" ? "10" : "11"}.
          </span>
          <span
            className={`text-sm font-medium ${
              etapa.concluida ? "line-through text-muted-foreground" : ""
            }`}
          >
            {etapa.nome}
          </span>
          {getStatusBadge(etapa)}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {etapa.descricao}
        </p>
        {!bloqueada && (
          <div className="flex items-center gap-1 mt-1.5">
            <Sparkles className="h-3 w-3 text-primary/70 flex-shrink-0" />
            <p className="text-xs text-primary/80 leading-relaxed">
              {etapa.valorIA}
            </p>
          </div>
        )}
      </div>
      {!bloqueada && (
        <Link href={etapa.rota} data-testid={`link-jornada-${etapa.id}`}>
          <Button
            variant={etapa.concluida ? "ghost" : "outline"}
            size="sm"
            className="flex-shrink-0 whitespace-nowrap"
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  );
}

export function JornadaEstrategica() {
  const { etapas, totalConcluidas, total, percentual, jornadaConcluida, isLoading } =
    useJornadaProgresso();
  const emAndamento = totalConcluidas < 6;
  const [open, setOpen] = useState(emAndamento);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  if (isLoading) return null;

  if (jornadaConcluida && !celebrationDismissed) {
    return (
      <Card
        className="mb-6 p-6 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
        data-testid="card-jornada-concluida"
      >
        <div className="flex items-start gap-4 flex-wrap">
          <PartyPopper className="h-10 w-10 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 dark:text-green-300 text-lg">
              Jornada Estratégica concluída!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              Parabéns! Você completou todas as {total} etapas da jornada. Sua empresa tem agora uma estratégia completa e estruturada. Continue acompanhando os rituais e ajustando conforme necessário.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCelebrationDismissed(true)}
            data-testid="button-fechar-celebracao"
          >
            Fechar
          </Button>
        </div>
      </Card>
    );
  }

  if (jornadaConcluida && celebrationDismissed) return null;

  const proximaEtapa = etapas.find(
    (e) => !e.concluida && (!e.bloqueadaPor || e.bloqueadaPor.length === 0)
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
                {totalConcluidas}/{total} etapas
              </Badge>
              {proximaEtapa && !open && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Próxima: {proximaEtapa.nome}
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
              {etapas.map((etapa) => (
                <EtapaCard key={etapa.id} etapa={etapa} />
              ))}
            </div>
            {proximaEtapa && (
              <div className="mt-4 px-4">
                <Link href={proximaEtapa.rota}>
                  <Button className="w-full sm:w-auto" data-testid="button-proxima-etapa">
                    Iniciar: {proximaEtapa.nome}
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

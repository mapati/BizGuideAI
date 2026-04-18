import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Map,
  ArrowRight,
  PartyPopper,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
import type { JornadaEtapa, JornadaProgresso } from "@/hooks/useJornadaProgresso";

const CELEBRACAO_DISMISSED_KEY = "biz-guide-jornada-concluida-dismissed";

const ETAPA_INDEX: Record<string, number> = {
  perfil: 1,
  diagnostico: 2,
  bmc: 3,
  pestel: 4,
  "cinco-forcas": 5,
  swot: 6,
  estrategias: 7,
  oportunidades: 8,
  iniciativas: 9,
  okrs: 10,
  indicadores: 11,
  acompanhamento: 12,
};

function getCtaLabel(etapa: JornadaEtapa): string {
  if (etapa.status === "concluido") return "Revisar";
  if (etapa.status === "iniciado") return "Continuar";
  return "Iniciar";
}

function EtapaRow({ etapa, isLast }: { etapa: JornadaEtapa; isLast: boolean }) {
  const bloqueada = etapa.bloqueadaPor && etapa.bloqueadaPor.length > 0;
  const Icone = etapa.icone;
  const num = ETAPA_INDEX[etapa.id] ?? 0;
  const ctaLabel = getCtaLabel(etapa);

  return (
    <div
      className="flex gap-3 group"
      data-testid={`jornada-etapa-${etapa.id}`}
    >
      <div className="flex flex-col items-center">
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
            etapa.concluida
              ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
              : bloqueada
              ? "bg-muted text-muted-foreground/40"
              : etapa.status === "iniciado"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
              : "bg-primary/10 text-primary"
          }`}
        >
          {etapa.concluida ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : bloqueada ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            num
          )}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 min-h-[16px] ${
              etapa.concluida
                ? "bg-green-300 dark:bg-green-800"
                : "bg-border"
            }`}
          />
        )}
      </div>

      <div
        className={`flex-1 flex items-center gap-3 pb-3 min-w-0 ${
          bloqueada ? "opacity-40" : etapa.concluida ? "opacity-60" : ""
        }`}
      >
        <Icone className={`h-4 w-4 flex-shrink-0 ${
          etapa.concluida
            ? "text-green-600 dark:text-green-400"
            : bloqueada
            ? "text-muted-foreground/40"
            : "text-foreground"
        }`} />
        <span
          className={`text-sm font-medium flex-1 truncate ${
            etapa.concluida ? "line-through text-muted-foreground" : ""
          }`}
        >
          {etapa.nome}
        </span>

        {etapa.concluida && (
          <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-600/30 flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
            Concluído
          </Badge>
        )}
        {!etapa.concluida && bloqueada && (
          <span className="text-xs text-muted-foreground/50 flex-shrink-0 hidden sm:inline">
            Aguardando
          </span>
        )}
        {!etapa.concluida && !bloqueada && etapa.status === "iniciado" && (
          <Badge variant="secondary" className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
            Iniciado
          </Badge>
        )}

        {bloqueada && !etapa.concluida ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            disabled
            data-testid={`link-jornada-${etapa.id}`}
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        ) : (
          <Link href={etapa.rota} data-testid={`link-jornada-${etapa.id}`}>
            <Button
              variant={etapa.concluida ? "ghost" : "outline"}
              size="sm"
              className="flex-shrink-0"
            >
              {ctaLabel}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

interface JornadaEstrategicaProps {
  progresso: JornadaProgresso;
  defaultOpen?: boolean;
  compact?: boolean;
}

export function JornadaEstrategica({ progresso, defaultOpen, compact }: JornadaEstrategicaProps) {
  const { etapas, totalConcluidas, total, percentual, jornadaConcluida, perfilCompleto } = progresso;
  const [open, setOpen] = useState(defaultOpen ?? true);
  const [celebrationDismissed, setCelebrationDismissed] = useState(
    () => localStorage.getItem(CELEBRACAO_DISMISSED_KEY) === "1"
  );

  function dismissPermanently() {
    localStorage.setItem(CELEBRACAO_DISMISSED_KEY, "1");
    setCelebrationDismissed(true);
  }

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
              Parabéns! Você completou todas as {total} etapas. Continue acompanhando os rituais e ajustando conforme necessário.
            </p>
            <label
              htmlFor="check-celebracao-dismiss"
              className="flex items-center gap-2 mt-3 cursor-pointer w-fit"
              data-testid="label-nao-mostrar-celebracao"
            >
              <Checkbox
                id="check-celebracao-dismiss"
                data-testid="checkbox-nao-mostrar-celebracao"
                onCheckedChange={(checked) => {
                  if (checked) dismissPermanently();
                }}
              />
              <span className="text-xs text-green-700 dark:text-green-400 select-none">
                Não mostrar isso novamente
              </span>
            </label>
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

  const avisoPerfil = !perfilCompleto ? (
    <Card
      className="mb-6 p-5 border-yellow-300 dark:border-yellow-700 bg-yellow-50/60 dark:bg-yellow-950/20"
      data-testid="card-aviso-perfil-incompleto"
    >
      <div className="flex items-start gap-4 flex-wrap">
        <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">
            Perfil da empresa incompleto
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
            Para habilitar as próximas etapas da Jornada Estratégica, preencha todos os campos obrigatórios do perfil da empresa — razão social, CNPJ, endereço e responsável legal.
          </p>
        </div>
        <Link href="/onboarding" data-testid="link-completar-perfil">
          <Button variant="outline" size="sm" className="flex-shrink-0 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300">
            Completar perfil
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
    </Card>
  ) : null;

  if (compact) {
    return (
      <>
        {avisoPerfil}
        <Card className="mb-6 opacity-70 bg-sky-50 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-900/40" data-testid="card-jornada-estrategica">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <button
                className="w-full flex items-center justify-between px-6 py-3 text-left hover-elevate"
                data-testid="button-toggle-jornada"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <Map className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Jornada</span>
                  <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid="badge-jornada-progresso">
                    {totalConcluidas}/{total}
                  </Badge>
                  <Progress value={percentual} className="w-16 h-1" />
                </div>
                {open ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/60" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-3">
                {etapas.map((etapa, i) => (
                  <EtapaRow key={etapa.id} etapa={etapa} isLast={i === etapas.length - 1} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </>
    );
  }

  return (
    <>
      {avisoPerfil}
      <Card className="mb-6 bg-sky-50 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-900/40" data-testid="card-jornada-estrategica">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left hover-elevate"
              data-testid="button-toggle-jornada"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <Map className="h-5 w-5 text-primary" />
                <span className="font-semibold">Jornada Estratégica</span>
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-jornada-progresso">
                  {totalConcluidas}/{total}
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
            <div className="px-6 pb-5">
              <div className="flex items-center gap-2 sm:hidden mb-4">
                <Progress value={percentual} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground">{percentual}%</span>
              </div>
              {etapas.map((etapa, i) => (
                <EtapaRow key={etapa.id} etapa={etapa} isLast={i === etapas.length - 1} />
              ))}
              {proximaEtapa && (
                <div className="mt-3 pl-11">
                  <Link href={proximaEtapa.rota}>
                    <Button data-testid="button-proxima-etapa">
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
    </>
  );
}

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import type { JornadaEtapa, JornadaProgresso } from "@/hooks/useJornadaProgresso";

interface GuiaContentProps {
  progresso: JornadaProgresso;
  onNavigate?: () => void;
}

interface FaseConfig {
  nome: string;
  range: [number, number];
}

const FASES: FaseConfig[] = [
  { nome: "Fundação", range: [0, 2] },
  { nome: "Diagnóstico de Ambiente", range: [3, 5] },
  { nome: "Estratégia e Iniciativas", range: [6, 8] },
  { nome: "Execução", range: [9, 11] },
];

function faseDoIndex(i: number): number {
  return FASES.findIndex((f) => i >= f.range[0] && i <= f.range[1]);
}

function getNarrativa(total: number): string {
  if (total === 0)
    return "Antes de traçar qualquer estratégia, precisamos entender com clareza onde sua empresa está. Comece definindo o perfil — é a base sobre a qual tudo será construído.";
  if (total <= 2)
    return "A fundação está sendo construída. Com o perfil e o diagnóstico registrados, você terá o ponto de partida para medir o impacto real de cada decisão estratégica.";
  if (total === 3)
    return "A base está sólida. Você sabe quem é sua empresa, onde ela está e como ela opera. Agora é hora de olhar para fora — o ambiente externo moldará sua estratégia tanto quanto os fatores internos.";
  if (total <= 5)
    return "Você está mapeando as forças que atuam sobre o seu negócio. Entender o ambiente externo antes de definir estratégias evita decisões baseadas em suposições.";
  if (total === 6)
    return "O diagnóstico está completo. Você tem uma visão clara do ambiente, da competição e das suas forças internas. Com esse mapa, as estratégias que vêm a seguir terão embasamento real.";
  if (total <= 8)
    return "A análise foi concluída. Agora é o momento de transformar diagnóstico em direção. Cada estratégia definida aqui precisará ser desdobrada em iniciativas concretas.";
  if (total === 9)
    return "Sua estratégia está desenhada e as iniciativas, mapeadas. O próximo desafio é tornar a execução mensurável — sem indicadores, não há como saber se a estratégia está funcionando.";
  return "Você está na reta final. Com metas e indicadores definidos, o que falta é estabelecer a cadência de revisão que manterá a estratégia viva ao longo do tempo.";
}

function CompactEtapaRow({
  etapa,
  numero,
  isLast,
  isPhaseLast,
}: {
  etapa: JornadaEtapa;
  numero: number;
  isLast: boolean;
  isPhaseLast: boolean;
}) {
  const bloqueada = !!(etapa.bloqueadaPor && etapa.bloqueadaPor.length > 0);
  const Icone = etapa.icone;

  return (
    <div className="flex gap-2.5" data-testid={`guia-etapa-${etapa.id}`}>
      <div className="flex flex-col items-center">
        <div
          className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
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
            <CheckCircle2 className="h-3 w-3" />
          ) : bloqueada ? (
            <Lock className="h-2.5 w-2.5" />
          ) : (
            numero
          )}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 min-h-[12px] ${
              etapa.concluida ? "bg-green-300 dark:bg-green-800" : "bg-border"
            } ${isPhaseLast ? "opacity-30" : ""}`}
          />
        )}
      </div>

      <div
        className={`flex-1 flex items-center gap-2 pb-2 min-w-0 ${
          bloqueada ? "opacity-40" : etapa.concluida ? "opacity-60" : ""
        }`}
      >
        <Icone
          className={`h-3 w-3 flex-shrink-0 ${
            etapa.concluida
              ? "text-green-600 dark:text-green-400"
              : bloqueada
              ? "text-muted-foreground/40"
              : "text-foreground"
          }`}
        />
        <span
          className={`text-xs font-medium flex-1 truncate ${
            etapa.concluida ? "line-through text-muted-foreground" : ""
          }`}
        >
          {etapa.nome}
        </span>
      </div>
    </div>
  );
}

export function GuiaContent({ progresso, onNavigate }: GuiaContentProps) {
  const { etapas, totalConcluidas, total, percentual, perfilCompleto } = progresso;
  const proximaEtapa = etapas.find(
    (e) => !e.concluida && (!e.bloqueadaPor || e.bloqueadaPor.length === 0)
  );
  const narrativa = getNarrativa(totalConcluidas);
  const ProximoIcon = proximaEtapa?.icone;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!perfilCompleto && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-md border border-yellow-300 dark:border-yellow-700 bg-yellow-50/60 dark:bg-yellow-950/20"
            data-testid="aviso-perfil-incompleto-guia"
          >
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-relaxed">
              Complete os dados do perfil da empresa para desbloquear as próximas etapas.
            </p>
          </div>
        )}

        <p
          className="text-sm leading-relaxed text-muted-foreground italic"
          data-testid="text-narrativa"
        >
          {narrativa}
        </p>

        <div className="flex items-center gap-2">
          <Progress value={percentual} className="flex-1 h-1.5" />
          <span className="text-xs text-muted-foreground tabular-nums" data-testid="text-progresso">
            {totalConcluidas}/{total}
          </span>
        </div>

        {proximaEtapa && ProximoIcon && (
          <div
            className="rounded-lg border bg-card p-3.5 space-y-2.5"
            data-testid="card-proxima-acao"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Próxima ação
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ProximoIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{proximaEtapa.nome}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  {proximaEtapa.descricao}
                </p>
              </div>
            </div>
            <Link href={proximaEtapa.rota} onClick={onNavigate}>
              <Button
                size="sm"
                className="w-full"
                data-testid="button-ir-proxima-etapa"
              >
                Ir para {proximaEtapa.nome}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Jornada Completa
          </span>
          <div className="pt-2">
            {etapas.map((etapa, i) => {
              const numero = i + 1;
              const fase = faseDoIndex(i);
              const proxFase = i + 1 < etapas.length ? faseDoIndex(i + 1) : fase;
              const isPhaseLast = fase !== proxFase;
              const isLast = i === etapas.length - 1;
              return (
                <div key={etapa.id}>
                  {i === 0 || isPhaseLastForPrev(i) ? (
                    <p className="text-[10px] font-medium text-muted-foreground/70 mt-2 mb-1 uppercase tracking-wide">
                      {FASES[fase]?.nome}
                    </p>
                  ) : null}
                  <CompactEtapaRow
                    etapa={etapa}
                    numero={numero}
                    isLast={isLast}
                    isPhaseLast={isPhaseLast}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-3 border-t bg-muted/30 flex-shrink-0 rounded-b-2xl"
        data-testid="footer-assistente-bloqueado"
      >
        <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-snug">
          Complete a jornada para desbloquear o{" "}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Sparkles className="h-3 w-3" />
            Bizzy no modo Assistente
          </span>
        </p>
      </div>
    </div>
  );
}

function isPhaseLastForPrev(i: number): boolean {
  if (i === 0) return false;
  return faseDoIndex(i) !== faseDoIndex(i - 1);
}

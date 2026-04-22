import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, Shield, TrendingUp, AlertCircle, Sparkles, Tag, CheckCircle2, Circle, X } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Candidata {
  tipo: "FO" | "FA" | "DO" | "DA";
  titulo: string;
  descricao: string;
  prioridade: "alta" | "média" | "baixa";
  potencial: "alto" | "medio";
  selecionada: boolean;
  swotOrigemIds: string[];
  swotOrigemTextos: string[];
}

interface StrategyPickerProps {
  open: boolean;
  onClose: () => void;
  onSave: (selecionadas: Candidata[]) => void;
  onAbort?: () => void;
  candidatas: Candidata[];
  isLoading: boolean;
  isSaving: boolean;
}

const ETAPAS_GERACAO = [
  { label: "Preparando contexto da empresa", durationMs: 5000 },
  { label: "Analisando suas Forças e Fraquezas", durationMs: 8000 },
  { label: "Cruzando com Oportunidades e Ameaças", durationMs: 10000 },
  { label: "Gerando estratégias FO, FA, DO e DA", durationMs: 14000 },
  { label: "Validando e organizando o cardápio", durationMs: 8000 },
] as const;

const TOTAL_DURATION = ETAPAS_GERACAO.reduce((acc, e) => acc + e.durationMs, 0);

const TIPO_CONFIG = {
  FO: {
    label: "Ofensivas (FO)",
    desc: "Força + Oportunidade",
    icon: ArrowUpRight,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
    headerBg: "bg-green-100 dark:bg-green-900/30",
  },
  FA: {
    label: "Confronto (FA)",
    desc: "Força + Ameaça",
    icon: Shield,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    headerBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  DO: {
    label: "Reorientação (DO)",
    desc: "Fraqueza + Oportunidade",
    icon: TrendingUp,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
    headerBg: "bg-purple-100 dark:bg-purple-900/30",
  },
  DA: {
    label: "Defensivas (DA)",
    desc: "Fraqueza + Ameaça",
    icon: AlertCircle,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800",
    headerBg: "bg-orange-100 dark:bg-orange-900/30",
  },
};

export function StrategyPicker({ open, onClose, onSave, onAbort, candidatas, isLoading, isSaving }: StrategyPickerProps) {
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (open && candidatas.length > 0) {
      const preSelected = new Set(
        candidatas.map((c, i) => (c.selecionada ? i : -1)).filter(i => i >= 0)
      );
      setSelecionadas(preSelected);
    }
  }, [open, candidatas]);

  // Avança um cronômetro durante o carregamento para alimentar a barra de
  // progresso simulada. Limita em ~95% até a resposta real chegar.
  useEffect(() => {
    if (!open || !isLoading) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 250);
    return () => window.clearInterval(id);
  }, [open, isLoading]);

  const progressPct = isLoading
    ? Math.min(95, Math.round((elapsedMs / TOTAL_DURATION) * 95))
    : 100;

  let etapaAtualIndex = 0;
  let acc = 0;
  for (let i = 0; i < ETAPAS_GERACAO.length; i++) {
    acc += ETAPAS_GERACAO[i].durationMs;
    if (elapsedMs < acc) {
      etapaAtualIndex = i;
      break;
    }
    etapaAtualIndex = ETAPAS_GERACAO.length - 1;
  }
  if (!isLoading) etapaAtualIndex = ETAPAS_GERACAO.length;

  const toggle = (index: number) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSave = () => {
    const escolhidas = candidatas.filter((_, i) => selecionadas.has(i));
    onSave(escolhidas);
  };

  const tiposOrdem: Array<"FO" | "FA" | "DO" | "DA"> = ["FO", "FA", "DO", "DA"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        hideClose
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Cardápio de Estratégias — Escolha as que farão parte do seu plano
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 space-y-6" data-testid="cardapio-progress">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Construindo o cardápio de estratégias…
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Isso pode levar alguns segundos. Você pode interromper a qualquer momento.
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-muted-foreground" data-testid="text-progress-pct">
                {progressPct}%
              </span>
            </div>

            <Progress value={progressPct} className="h-2" data-testid="progress-cardapio" />

            <ol className="space-y-2.5">
              {ETAPAS_GERACAO.map((etapa, i) => {
                const concluida = i < etapaAtualIndex;
                const ativa = i === etapaAtualIndex;
                return (
                  <li
                    key={etapa.label}
                    className="flex items-center gap-3"
                    data-testid={`etapa-cardapio-${i}`}
                    data-state={concluida ? "done" : ativa ? "active" : "pending"}
                  >
                    {concluida ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : ativa ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span
                      className={
                        concluida
                          ? "text-sm text-muted-foreground line-through"
                          : ativa
                          ? "text-sm font-medium"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {etapa.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {onAbort && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={onAbort}
                  data-testid="button-abortar-cardapio"
                >
                  <X className="h-4 w-4 mr-2" />
                  Abortar geração
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {tiposOrdem.map((tipo) => {
              const cfg = TIPO_CONFIG[tipo];
              const Icon = cfg.icon;
              const deste = candidatas
                .map((c, i) => ({ c, i }))
                .filter(({ c }) => c.tipo === tipo);

              if (deste.length === 0) return null;

              return (
                <div key={tipo} className={`rounded-md border ${cfg.border} overflow-hidden`}>
                  <div className={`${cfg.headerBg} px-4 py-3 flex items-center gap-2`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                    <span className="font-semibold text-sm">{cfg.label}</span>
                    <span className="text-xs text-muted-foreground">— {cfg.desc}</span>
                    <Badge variant="outline" className="ml-auto">
                      {deste.filter(({ i }) => selecionadas.has(i)).length} de {deste.length} selecionadas
                    </Badge>
                  </div>
                  <div className="divide-y divide-border">
                    {deste.map(({ c, i }) => (
                      <div
                        key={i}
                        className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          selecionadas.has(i) ? cfg.bg : "hover:bg-muted/40"
                        }`}
                        onClick={() => toggle(i)}
                      >
                        <Checkbox
                          checked={selecionadas.has(i)}
                          className="mt-1 shrink-0"
                          data-testid={`checkbox-candidata-${i}`}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggle(i)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm">{c.titulo}</span>
                            <Badge
                              variant={c.potencial === "alto" ? "default" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              Potencial {c.potencial === "alto" ? "Alto" : "Médio"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{c.descricao}</p>
                          {c.swotOrigemTextos && c.swotOrigemTextos.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {c.swotOrigemTextos.map((texto, j) => (
                                <span
                                  key={j}
                                  className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded px-2 py-0.5"
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {texto.length > 50 ? texto.slice(0, 50) + "…" : texto}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {selecionadas.size} estratégia{selecionadas.size !== 1 ? "s" : ""} selecionada{selecionadas.size !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={selecionadas.size === 0 || isSaving}
                  data-testid="button-salvar-selecionadas"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    `Salvar selecionadas (${selecionadas.size})`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

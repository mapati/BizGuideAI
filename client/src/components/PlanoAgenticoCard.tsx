import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, Target, X, ChevronDown, ChevronUp, PlayCircle, ArrowRight, MessageSquare, ArrowUpRight, Zap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContinuacaoPlano } from "@/components/PropostaCard";

export interface PlanoAgenticoPassoView {
  id: string;
  ordem: number;
  titulo: string;
  descricao?: string;
  status: "pendente" | "em_andamento" | "concluido" | "pulado" | "falhou";
  // Task #317 — tipo do passo (default 'acao' p/ planos antigos sem coluna).
  tipo?: "mensagem" | "link" | "acao";
  linkAlvo?: string | null;
}

export interface PlanoAgenticoView {
  id: string;
  titulo: string;
  objetivo: string;
  status: "ativo" | "concluido" | "cancelado";
  passoAtual: number;
  totalPassos: number;
}

export function PlanoAgenticoCard({
  plano,
  passos,
  compacto = false,
  onCancelado,
  onContinuacao,
}: {
  plano: PlanoAgenticoView;
  passos: PlanoAgenticoPassoView[];
  compacto?: boolean;
  onCancelado?: () => void;
  onContinuacao?: (cont: ContinuacaoPlano) => void;
}) {
  const { toast } = useToast();
  const [expandido, setExpandido] = useState(!compacto);
  const [cancelando, setCancelando] = useState(false);
  const [avancando, setAvancando] = useState(false);

  const handleAvancar = async () => {
    setAvancando(true);
    try {
      const json = await apiRequest("POST", `/api/ai/planos/${plano.id}/avancar`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/ai/planos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/planos/ativo"] });
      if (json?.continuacao) {
        if (onContinuacao) {
          onContinuacao(json.continuacao);
        } else {
          toast({
            title: json.continuacao.finalizado ? "Plano concluído" : "Próximo passo proposto",
            description: json.continuacao.mensagem,
          });
        }
      }
    } catch (err) {
      toast({
        title: "Erro ao avançar",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setAvancando(false);
    }
  };

  const concluidos = passos.filter((p) => p.status === "concluido").length;
  const pct = plano.totalPassos > 0 ? Math.round((concluidos / plano.totalPassos) * 100) : 0;

  const handleCancelar = async () => {
    if (!confirm(`Cancelar o plano "${plano.titulo}"? Os passos pendentes serão descartados.`)) return;
    setCancelando(true);
    try {
      await apiRequest("POST", `/api/ai/planos/${plano.id}/cancelar`, {});
      toast({ title: "Plano cancelado", description: plano.titulo });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/planos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/planos/ativo"] });
      onCancelado?.();
    } catch (err) {
      toast({
        title: "Erro ao cancelar",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setCancelando(false);
    }
  };

  const statusBadge =
    plano.status === "ativo" ? (
      <Badge className="bg-violet-600 text-white hover:bg-violet-600 gap-1 text-[10px]">
        <PlayCircle className="h-2.5 w-2.5" /> em andamento
      </Badge>
    ) : plano.status === "concluido" ? (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 gap-1 text-[10px]">
        <CheckCircle2 className="h-2.5 w-2.5" /> concluído
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <X className="h-2.5 w-2.5" /> cancelado
      </Badge>
    );

  return (
    <Card className="border-violet-200 dark:border-violet-900/50" data-testid={`card-plano-${plano.id}`}>
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Target className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                Plano agêntico
              </Badge>
              {statusBadge}
              <span className="text-[10px] text-muted-foreground" data-testid={`text-plano-progresso-${plano.id}`}>
                {concluidos}/{plano.totalPassos} passos · {pct}%
              </span>
            </div>
            <div className="text-sm font-semibold leading-snug" data-testid={`text-plano-titulo-${plano.id}`}>
              {plano.titulo}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plano.objetivo}</div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setExpandido((v) => !v)}
            data-testid={`button-plano-toggle-${plano.id}`}
          >
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="h-1.5 bg-muted rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {expandido && (
          <ol className="space-y-1.5 pt-1">
            {passos.map((p) => {
              // Task #317 — quando o passo está pendente, mostramos o ícone
              // do TIPO (mensagem/link/ação) em vez de um círculo neutro,
              // para o usuário antecipar o estilo de interação.
              const tipo = p.tipo ?? "acao";
              const tipoIcon =
                tipo === "mensagem" ? (
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : tipo === "link" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                );
              const icon =
                p.status === "concluido" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : p.status === "em_andamento" ? (
                  <Loader2 className="h-3.5 w-3.5 text-violet-600 animate-spin shrink-0" />
                ) : p.status === "pulado" ? (
                  <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : p.status === "falhou" ? (
                  <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                ) : (
                  tipoIcon
                );
              return (
                <li
                  key={p.id}
                  className="flex items-start gap-2 text-xs"
                  data-testid={`item-plano-passo-${plano.id}-${p.ordem}`}
                >
                  {icon}
                  <div className="flex-1 min-w-0">
                    <div
                      className={
                        p.status === "concluido"
                          ? "line-through text-muted-foreground"
                          : p.status === "em_andamento"
                          ? "font-medium text-foreground"
                          : "text-foreground"
                      }
                    >
                      {p.ordem}. {p.titulo}
                    </div>
                    {p.descricao && (
                      <div className="text-[11px] text-muted-foreground line-clamp-2">{p.descricao}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {plano.status === "ativo" && (
          <div className="flex justify-end gap-2 pt-0.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelar}
              disabled={cancelando || avancando}
              data-testid={`button-plano-cancelar-${plano.id}`}
              className="gap-1.5 text-xs"
            >
              {cancelando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Cancelar plano
            </Button>
            <Button
              size="sm"
              onClick={handleAvancar}
              disabled={avancando || cancelando}
              data-testid={`button-plano-avancar-${plano.id}`}
              className="gap-1.5 text-xs"
            >
              {avancando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Sugerir próximo passo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

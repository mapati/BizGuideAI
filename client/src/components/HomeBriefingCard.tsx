import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sparkles, ArrowRight, AlertTriangle, Cpu, BookOpen, Loader2, ListChecks, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import type { AssistantAcao } from "@/components/AssistantChat";
import { isBriefingDismissedToday } from "@/lib/briefingDismiss";

interface BriefingResponse {
  deveAbrir: boolean;
  mensagem: string | null;
  acoes?: AssistantAcao[];
  sinais?: { total: number };
  fonte?: "ia" | "regra";
}

function buildHrefFromAcao(acao: AssistantAcao): string {
  if (!acao.rota) return "";
  const params = new URLSearchParams();
  if (acao.tipo === "criar") params.set("novo", "1");
  else if (acao.tipo === "editar" && acao.params?.id) params.set("editar", acao.params.id);
  if (acao.params) {
    for (const [k, v] of Object.entries(acao.params)) {
      if (k === "id" && acao.tipo === "editar") continue;
      params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `${acao.rota}?${qs}` : acao.rota;
}

export function HomeBriefingCard() {
  const { jornadaConcluida, isLoading: jornadaLoading } = useJornadaProgresso();
  const [dispensado, setDispensado] = useState(() => isBriefingDismissedToday());

  useEffect(() => {
    const sync = () => setDispensado(isBriefingDismissedToday());
    window.addEventListener("biz-guide:briefing-dispensado", sync);
    return () => window.removeEventListener("biz-guide:briefing-dispensado", sync);
  }, []);

  const enabled = !jornadaLoading && jornadaConcluida && !dispensado;

  const { data, isLoading } = useQuery<BriefingResponse>({
    queryKey: ["/api/ai/briefing-proativo"],
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Conta propostas pendentes (status="proposta") da empresa para sinalizar
  // ações aguardando aprovação na home, conforme requisito do HITL.
  const { data: propostasResp } = useQuery<{ propostas: Array<{ id: string; status: string }> }>({
    queryKey: ["/api/ai/propostas"],
    enabled,
    staleTime: 60 * 1000,
  });
  const pendentes = (propostasResp?.propostas ?? []).filter((p) => p.status === "proposta").length;

  // Task #189 — bloco "Plano em andamento" para dar visibilidade fora do chat.
  const { data: planoResp } = useQuery<{
    plano: {
      id: string;
      titulo: string;
      passoAtual: number;
      totalPassos: number;
      passos: Array<{ id: string; ordem: number; titulo: string; status: string }>;
    } | null;
  }>({
    queryKey: ["/api/ai/planos/ativo"],
    enabled,
    staleTime: 30 * 1000,
  });
  const planoAtivo = planoResp?.plano ?? null;
  const proximoPasso = planoAtivo?.passos.find((p) => p.status === "pendente" || p.status === "em_andamento") ?? null;
  const ultimoConcluido = planoAtivo
    ? [...planoAtivo.passos].reverse().find((p) => p.status === "concluido") ?? null
    : null;

  if (!enabled) return null;
  if (isLoading) {
    return (
      <Card
        className="p-5 border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent"
        data-testid="card-home-briefing-loading"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparando seu briefing de hoje…
        </div>
      </Card>
    );
  }
  if (!data?.mensagem) return null;

  const fonte = data.fonte;

  return (
    <Card
      className="overflow-hidden border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 text-white"
      data-testid="card-home-briefing"
    >
      <div className="p-5 sm:p-6 flex gap-4 items-start">
        <div className="h-11 w-11 rounded-md bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge className="bg-white text-violet-700 hover:bg-white text-[10px] uppercase tracking-wide">
              Briefing de hoje
            </Badge>
            {fonte && (
              <Badge
                variant="secondary"
                className="bg-white/15 text-white border-white/20 backdrop-blur gap-1 text-[10px]"
                data-testid={`badge-home-briefing-fonte-${fonte}`}
              >
                {fonte === "ia" ? <Cpu className="h-2.5 w-2.5" /> : <BookOpen className="h-2.5 w-2.5" />}
                via {fonte === "ia" ? "IA" : "regra"}
              </Badge>
            )}
            {data.sinais && data.sinais.total > 0 && (
              <Badge
                variant="secondary"
                className="bg-white/15 text-white border-white/20 backdrop-blur gap-1 text-[10px]"
              >
                <AlertTriangle className="h-2.5 w-2.5" /> {data.sinais.total} sina{data.sinais.total === 1 ? "l" : "is"}
              </Badge>
            )}
            {pendentes > 0 && (
              <Badge
                variant="secondary"
                className="bg-white/15 text-white border-white/20 backdrop-blur gap-1 text-[10px]"
                data-testid="badge-home-briefing-propostas-pendentes"
              >
                <ListChecks className="h-2.5 w-2.5" /> {pendentes} aguardando aprovação
              </Badge>
            )}
          </div>
          <p
            className="text-base sm:text-lg font-medium leading-snug text-white"
            data-testid="text-home-briefing-resumo"
          >
            Você tem uma mensagem do Assistente Estratégico esperando por você.
          </p>

          {planoAtivo && (
            <div
              className="mt-3 rounded-md bg-white/10 border border-white/20 backdrop-blur p-3 text-sm"
              data-testid={`block-home-briefing-plano-${planoAtivo.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4" />
                <span className="font-medium" data-testid="text-home-briefing-plano-titulo">
                  Plano em andamento: {planoAtivo.titulo}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-white/20 text-[10px]"
                  data-testid="badge-home-briefing-plano-progresso"
                >
                  passo {planoAtivo.passoAtual}/{planoAtivo.totalPassos}
                </Badge>
              </div>
              {ultimoConcluido && (
                <div className="text-white/85 text-xs" data-testid="text-home-briefing-plano-ultimo">
                  Último: passo {ultimoConcluido.ordem} — {ultimoConcluido.titulo}
                </div>
              )}
              {proximoPasso && (
                <div className="text-white/95 text-xs" data-testid="text-home-briefing-plano-proximo">
                  Próximo: passo {proximoPasso.ordem} — {proximoPasso.titulo}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Link href="/assistente">
              <Button
                size="sm"
                variant="outline"
                className="bg-white text-violet-700 border-white hover:bg-white/90 gap-1.5"
                data-testid="link-home-briefing-ver-mais"
              >
                {planoAtivo ? "Continuar plano no Assistente" : "Ver mais no Assistente"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

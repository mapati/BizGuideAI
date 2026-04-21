import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dismissBriefingForToday, isBriefingDismissedToday } from "@/lib/briefingDismiss";
import { Link } from "wouter";
import {
  Sparkles, AlertTriangle, Target, TrendingDown, MessageSquare,
  Calendar, ArrowRight, Activity, BookOpen, Flame, ChevronRight,
  Loader2, Cpu, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AssistantChat, type AssistantAcao } from "@/components/AssistantChat";
import { AssistantMarkdown } from "@/components/AssistantMarkdown";
import { useAssistantStatus } from "@/hooks/useAssistantStatus";
import { cn } from "@/lib/utils";

interface SinaisCriticosResp {
  kpisVermelhos: Array<{ id: string; nome: string; perspectiva: string; atual: string; meta: string }>;
  iniciativasAtrasadas: Array<{ id: string; titulo: string; prazo: string; diasAtraso: number; responsavel: string }>;
  okrsParados: Array<{ objetivoId: string; resultadoId: string; metrica: string; objetivo: string; diasParado: number }>;
  riscosAltosSemMitigacao: Array<{ id: string; descricao: string; categoria: string; score: number }>;
  total: number;
}

interface BriefingResponse {
  deveAbrir: boolean;
  mensagem: string | null;
  acoes?: AssistantAcao[];
  propostas?: import("@/components/PropostaCard").Proposta[];
  sinais?: SinaisCriticosResp;
  fonte?: "ia" | "regra";
}

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
});

function nowLabel() {
  const d = new Date();
  return formatadorData.format(d);
}

interface SinalRow {
  icon: typeof TrendingDown;
  color: string;
  bg: string;
  title: string;
  meta: string;
  href: string;
}

function montarSinais(sinais?: SinaisCriticosResp): SinalRow[] {
  if (!sinais) return [];
  const rows: SinalRow[] = [];
  for (const k of sinais.kpisVermelhos.slice(0, 3)) {
    rows.push({
      icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10",
      title: `${k.nome} — atual ${k.atual} (meta ${k.meta})`,
      meta: `KPI · ${k.perspectiva}`,
      href: "/indicadores",
    });
  }
  for (const i of sinais.iniciativasAtrasadas.slice(0, 3)) {
    rows.push({
      icon: Target, color: "text-amber-500", bg: "bg-amber-500/10",
      title: `${i.titulo} atrasada ${i.diasAtraso}d`,
      meta: `Iniciativa · ${i.responsavel || "sem responsável"}`,
      href: "/iniciativas",
    });
  }
  for (const o of sinais.okrsParados.slice(0, 3)) {
    rows.push({
      icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10",
      title: `${o.metrica} parado há ${o.diasParado}d`,
      meta: `OKR · ${o.objetivo}`,
      href: "/okrs",
    });
  }
  for (const r of sinais.riscosAltosSemMitigacao.slice(0, 3)) {
    rows.push({
      icon: Flame, color: "text-rose-500", bg: "bg-rose-500/10",
      title: r.descricao,
      meta: `Risco · score ${r.score}`,
      href: "/riscos",
    });
  }
  return rows.slice(0, 6);
}

export default function Assistente() {
  const { alertas } = useAssistantStatus();
  const { data: briefing, isLoading, refetch, isRefetching } = useQuery<BriefingResponse>({
    queryKey: ["/api/ai/briefing-proativo"],
    staleTime: 5 * 60 * 1000,
  });

  const sinaisRows = montarSinais(briefing?.sinais);
  const totalSinais = briefing?.sinais?.total ?? 0;
  const fonte = briefing?.fonte;

  const proactive = briefing?.mensagem
    ? { content: briefing.mensagem, acoes: briefing.acoes ?? [], propostas: briefing.propostas ?? [] }
    : null;

  const [briefingDispensado, setBriefingDispensado] = useState(() => isBriefingDismissedToday());

  useEffect(() => {
    const sync = () => setBriefingDispensado(isBriefingDismissedToday());
    window.addEventListener("biz-guide:briefing-dispensado", sync);
    return () => window.removeEventListener("biz-guide:briefing-dispensado", sync);
  }, []);

  const handleReabrir = () => {
    try {
      window.localStorage.removeItem("biz-guide-briefing-dispensado-em");
    } catch {
      // ignore
    }
    setBriefingDispensado(false);
  };

  const handleDispensar = () => {
    dismissBriefingForToday();
    setBriefingDispensado(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto" data-testid="page-assistente">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-tight" data-testid="text-assistente-title">
            Assistente Estratégico
          </h1>
          <p className="text-sm text-muted-foreground">
            Briefing diário, sinais ao vivo e conversa com a IA — tudo em um lugar.
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto gap-1">
          <Calendar className="h-3 w-3" /> {nowLabel()}
        </Badge>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* BRIEFING — coluna principal */}
        <Card
          className="col-span-12 lg:col-span-7 overflow-hidden border-violet-200 dark:border-violet-900/50"
          data-testid="card-briefing-hoje"
        >
          <div className="bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge className="bg-violet-600 text-white hover:bg-violet-600 text-[10px] uppercase tracking-wide">
                      Briefing de hoje
                    </Badge>
                    {fonte && (
                      <Badge variant="secondary" className="gap-1 text-[10px]" data-testid={`badge-fonte-${fonte}`}>
                        {fonte === "ia" ? <Cpu className="h-2.5 w-2.5" /> : <BookOpen className="h-2.5 w-2.5" />}
                        via {fonte === "ia" ? "IA" : "regra"}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl leading-tight">
                    {isLoading
                      ? "Preparando seu briefing…"
                      : briefing?.mensagem
                      ? "Resumo do dia"
                      : "Tudo tranquilo por aqui"}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analisando seus dados…
                </div>
              ) : briefingDispensado ? (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-dashed p-3"
                  data-testid="text-briefing-dispensado"
                >
                  <p className="text-sm text-muted-foreground">
                    Briefing adiado para amanhã. Você pode reabrir agora se quiser.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReabrir}
                    data-testid="button-reabrir-briefing"
                  >
                    Mostrar de novo
                  </Button>
                </div>
              ) : briefing?.mensagem ? (
                <div
                  className="text-sm leading-relaxed text-foreground/90"
                  data-testid="text-briefing-corpo"
                >
                  <AssistantMarkdown content={briefing.mensagem} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-briefing-vazio">
                  Nenhum sinal crítico hoje. Aproveite para revisar OKRs e iniciativas em andamento.
                </p>
              )}

              {!briefingDispensado && briefing?.acoes && briefing.acoes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Ações sugeridas
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {briefing.acoes.slice(0, 3).map((acao, idx) => (
                        <BriefingAcaoCard
                          key={`${acao.label}-${idx}`}
                          acao={acao}
                          onDispensar={handleDispensar}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </div>
        </Card>

        {/* SINAIS AO VIVO — coluna lateral */}
        <Card className="col-span-12 lg:col-span-5" data-testid="card-sinais-ao-vivo">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 space-y-0">
            <div>
              <CardTitle className="text-base">Sinais ao vivo</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> via regra
              </p>
            </div>
            <Badge variant="secondary" className="gap-1" data-testid="badge-total-sinais">
              <Activity className="h-3 w-3" /> {totalSinais}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando sinais…
              </div>
            ) : sinaisRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-sem-sinais">
                Nenhum sinal crítico no momento.
              </p>
            ) : (
              sinaisRows.map((s, i) => (
                <Link key={i} href={s.href}>
                  <button
                    className="w-full flex items-center gap-3 p-2.5 rounded-md border text-left hover-elevate"
                    data-testid={`button-sinal-${i}`}
                  >
                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", s.bg)}>
                      <s.icon className={cn("h-4 w-4", s.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.meta}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </Link>
              ))
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refetch-sinais"
            >
              {isRefetching ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando…</>
              ) : (
                <>Atualizar sinais <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* CHAT — ancorado abaixo */}
      <Card className="overflow-hidden" data-testid="card-conversa-assistente">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-600" />
            <CardTitle className="text-base">Conversa com o assistente</CardTitle>
            <Badge variant="secondary" className="ml-auto text-xs gap-1">
              <ShieldAlert className="h-3 w-3" /> Contexto: dados da sua empresa
            </Badge>
          </div>
        </CardHeader>
        <div className="h-[520px] flex flex-col">
          <AssistantChat
            alertas={alertas}
            proactiveMessage={proactive}
          />
        </div>
      </Card>
    </div>
  );
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

function BriefingAcaoCard({ acao, onDispensar }: { acao: AssistantAcao; onDispensar?: () => void }) {
  const href = buildHrefFromAcao(acao);
  const inner = (
    <div className="flex items-start gap-2.5 rounded-md border p-3 text-left bg-card hover-elevate h-full">
      <ArrowRight className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{acao.label}</div>
        {acao.rota && (
          <div className="text-xs text-muted-foreground truncate">
            {acao.tipo === "criar" ? "Criar em" : acao.tipo === "editar" ? "Editar em" : "Abrir"} {acao.rota}
          </div>
        )}
      </div>
    </div>
  );
  if (acao.tipo === "dispensar") {
    return (
      <button
        type="button"
        onClick={onDispensar}
        className="text-left w-full"
        data-testid="button-briefing-acao-dispensar"
      >
        {inner}
      </button>
    );
  }
  if (!href) {
    return <div data-testid={`card-briefing-acao-${acao.tipo}`}>{inner}</div>;
  }
  return (
    <Link href={href} data-testid={`link-briefing-acao-${acao.tipo}`}>
      {inner}
    </Link>
  );
}

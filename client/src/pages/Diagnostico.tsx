import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  RefreshCw,
  Stethoscope,
  Target,
  TrendingDown,
  ArrowRight,
  Calendar,
  ListChecks,
  Wrench,
  Gauge,
  X,
} from "lucide-react";

type LacunasResponse = {
  iniciativasSemObjetivo: Array<{ id: string; titulo: string; status?: string | null; estrategiaId: string | null }>;
  objetivosSemKr: Array<{ id: string; titulo: string; perspectiva: string | null }>;
  kpisSemKrAtacando: Array<{ id: string; nome: string; perspectiva: string | null }>;
  kpisSemIniciativaAtacando: Array<{ id: string; nome: string; perspectiva: string | null }>;
  estrategiasSemIniciativa: Array<{ id: string; titulo: string }>;
  totais: { iniciativas: number; objetivos: number; kpis: number; estrategias: number; krs: number };
  geradoEm: string;
};

type DescarriladosResponse = {
  descarrilados: Array<{
    id: string;
    titulo: string;
    perspectiva: string | null;
    totalKrs: number;
    pctMedio: number | null;
    krMaisAtrasado: { id: string; metrica: string; pct: number | null } | null;
    diasSemCheckin: number | null;
    ultimoCheckinEm: string | null;
    motivos: string[];
  }>;
  criterios: { diasSemCheckinLimite: number; pctMinimoAceitavel: number };
  totalObjetivosAtivos: number;
  geradoEm: string;
};

type ConsistenciaResponse = {
  porEstrategia: Array<{
    id: string;
    titulo: string;
    objetivosVinculados: number;
    iniciativasVinculadas: number;
    iniciativasQueTocamKpi: number;
    furos: string[];
  }>;
  estrategiasComFuros: Array<{ id: string; titulo: string; furos: string[] }>;
  objetivosSemIniciativa: Array<{ id: string; titulo: string; perspectiva: string | null }>;
  totais: { estrategias: number; objetivos: number; iniciativas: number; kpis: number };
  geradoEm: string;
};

type GapEntidade = { tipo: "kpi" | "kr" | "objetivo"; id: string; label: string };

type GapResponse = {
  tipo?: string;
  id?: string;
  nome?: string;
  titulo?: string;
  metrica?: string;
  valorAtual?: number | null;
  meta?: number | null;
  pctAtingido?: number | null;
  pctMedio?: number | null;
  gapAbsoluto?: number | null;
  gapPct?: number | null;
  status?: string;
  tendencia?: string;
  diasSemLeitura?: number | null;
  diasSemCheckin?: number | null;
  diasAtePrazo?: number | null;
  diasAtePrazoMaisProximo?: number | null;
  ultimaLeituraEm?: string | null;
  ultimoCheckinEm?: string | null;
  iniciativasVinculadas?: number;
  iniciativasParadas?: number;
  totalKrs?: number;
  causasProvaveis?: string[];
  erro?: string;
};

type CicloResponse = {
  cicloRotulo: string;
  inicio: string;
  fim: string;
  pctExecutado: number;
  iniciativasConcluidasNoCiclo: number;
  iniciativasAtivasOuConcluidas: number;
  checkinsNoCiclo: number;
  decisoesEstrategicasNoCiclo: number;
  decisoesEmAtasNoCiclo: number;
  atasNoCiclo: number;
  topConquistas: Array<Record<string, unknown>>;
  topAtrasos: Array<{ id: string; titulo: string; prazo: string | null; diasAtraso: number | null }>;
  totais: { objetivos: number; iniciativas: number; krs: number };
  geradoEm: string;
};

const FURO_LABELS: Record<string, string> = {
  estrategia_sem_objetivo: "Sem objetivo",
  estrategia_sem_iniciativa: "Sem iniciativa",
  iniciativas_nao_tocam_kpi: "Iniciativas não atacam KPI",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function motivoLabel(motivo: string): string {
  if (motivo.startsWith("pct_medio_")) {
    const m = motivo.match(/pct_medio_(\d+)_abaixo_de_(\d+)/);
    if (m) return `Progresso médio em ${m[1]}% (mín. ${m[2]}%)`;
  }
  if (motivo === "sem_checkin_nunca") return "Nunca recebeu check-in";
  if (motivo.startsWith("sem_checkin_")) {
    const m = motivo.match(/sem_checkin_(\d+)d/);
    if (m) return `Sem check-in há ${m[1]} dias`;
  }
  return motivo;
}

function PctBadge({ pct }: { pct: number | null }) {
  if (pct == null) {
    return <Badge variant="outline" data-testid="badge-pct-sem-dados">—</Badge>;
  }
  const variant = pct >= 80 ? "default" : pct >= 50 ? "secondary" : "destructive";
  return (
    <Badge variant={variant} data-testid={`badge-pct-${pct}`}>
      {pct}%
    </Badge>
  );
}

export default function Diagnostico() {
  const [gapAlvo, setGapAlvo] = useState<GapEntidade | null>(null);
  const lacunasQ = useQuery<LacunasResponse>({ queryKey: ["/api/diagnostico/lacunas-cascata"] });
  const descarriladosQ = useQuery<DescarriladosResponse>({ queryKey: ["/api/diagnostico/descarrilados"] });
  const consistenciaQ = useQuery<ConsistenciaResponse>({ queryKey: ["/api/diagnostico/consistencia"] });
  const cicloQ = useQuery<CicloResponse>({ queryKey: ["/api/diagnostico/ciclo"] });
  const gapQ = useQuery<GapResponse>({
    queryKey: ["/api/diagnostico/gap", gapAlvo?.tipo, gapAlvo?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/diagnostico/gap?tipo=${gapAlvo!.tipo}&id=${encodeURIComponent(gapAlvo!.id)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: gapAlvo != null,
  });

  const isLoading = lacunasQ.isLoading || descarriladosQ.isLoading || consistenciaQ.isLoading || cicloQ.isLoading;
  const isFetching = lacunasQ.isFetching || descarriladosQ.isFetching || consistenciaQ.isFetching || cicloQ.isFetching;

  const ultimaAtualizacao = [
    lacunasQ.data?.geradoEm,
    descarriladosQ.data?.geradoEm,
    consistenciaQ.data?.geradoEm,
    cicloQ.data?.geradoEm,
  ]
    .filter((x): x is string => !!x)
    .sort()
    .pop();

  function atualizarTudo() {
    queryClient.invalidateQueries({ queryKey: ["/api/diagnostico/lacunas-cascata"] });
    queryClient.invalidateQueries({ queryKey: ["/api/diagnostico/descarrilados"] });
    queryClient.invalidateQueries({ queryKey: ["/api/diagnostico/consistencia"] });
    queryClient.invalidateQueries({ queryKey: ["/api/diagnostico/ciclo"] });
    if (gapAlvo) {
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostico/gap", gapAlvo.tipo, gapAlvo.id] });
    }
  }

  function corrigirHrefGap(g: GapEntidade): string {
    if (g.tipo === "kpi") return `/indicadores?destacar=${g.id}`;
    return `/okrs?destacar=${g.id}`;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-row items-start justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold flex flex-row items-center gap-3 flex-wrap" data-testid="text-diagnostico-titulo">
            <Stethoscope className="h-7 w-7 text-primary" />
            Diagnóstico do Bizzy
          </h1>
          <p className="text-muted-foreground" data-testid="text-diagnostico-descricao">
            Saúde do plano em tempo real: lacunas da cascata, objetivos descarrilados, consistência e resumo do ciclo.
          </p>
          {ultimaAtualizacao && (
            <p className="text-xs text-muted-foreground" data-testid="text-ultima-atualizacao">
              Atualizado em {formatDateTime(ultimaAtualizacao)}
            </p>
          )}
        </div>
        <Button
          onClick={atualizarTudo}
          disabled={isFetching}
          data-testid="button-atualizar-diagnostico"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Atualizando..." : "Atualizar diagnóstico"}
        </Button>
      </div>

      {/* Resumo do Ciclo */}
      <Card data-testid="card-ciclo">
        <CardHeader>
          <div className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex flex-row items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumo do ciclo {cicloQ.data?.cicloRotulo ?? ""}
              </CardTitle>
              <CardDescription>
                {cicloQ.data ? `${formatDate(cicloQ.data.inicio)} – ${formatDate(cicloQ.data.fim)}` : "Carregando..."}
              </CardDescription>
            </div>
            {cicloQ.data && (
              <Badge variant="outline" data-testid="badge-ciclo-pct">
                {cicloQ.data.pctExecutado}% executado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cicloQ.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : cicloQ.data ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-md border p-3" data-testid="stat-iniciativas-concluidas">
                  <div className="text-xs text-muted-foreground">Iniciativas concluídas</div>
                  <div className="text-2xl font-semibold">
                    {cicloQ.data.iniciativasConcluidasNoCiclo}
                    <span className="text-sm font-normal text-muted-foreground"> / {cicloQ.data.iniciativasAtivasOuConcluidas}</span>
                  </div>
                </div>
                <div className="rounded-md border p-3" data-testid="stat-checkins">
                  <div className="text-xs text-muted-foreground">Check-ins de KR</div>
                  <div className="text-2xl font-semibold">{cicloQ.data.checkinsNoCiclo}</div>
                </div>
                <div className="rounded-md border p-3" data-testid="stat-decisoes">
                  <div className="text-xs text-muted-foreground">Decisões registradas</div>
                  <div className="text-2xl font-semibold">
                    {cicloQ.data.decisoesEstrategicasNoCiclo + cicloQ.data.decisoesEmAtasNoCiclo}
                  </div>
                </div>
                <div className="rounded-md border p-3" data-testid="stat-atas">
                  <div className="text-xs text-muted-foreground">Atas no ciclo</div>
                  <div className="text-2xl font-semibold">{cicloQ.data.atasNoCiclo}</div>
                </div>
              </div>

              {cicloQ.data.topAtrasos.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex flex-row items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Top atrasos
                  </div>
                  <div className="space-y-2">
                    {cicloQ.data.topAtrasos.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-row items-center justify-between gap-2 rounded-md border p-3 hover-elevate"
                        data-testid={`row-atraso-${a.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate" data-testid={`text-atraso-titulo-${a.id}`}>{a.titulo}</div>
                          <div className="text-xs text-muted-foreground">
                            Prazo: {formatDate(a.prazo)}
                            {a.diasAtraso != null && ` · ${a.diasAtraso} dia(s) de atraso`}
                          </div>
                        </div>
                        <Button asChild size="sm" variant="outline" data-testid={`button-corrigir-iniciativa-${a.id}`}>
                          <Link href={`/iniciativas?destacar=${a.id}`}>
                            <Wrench className="h-3.5 w-3.5" />
                            Corrigir
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cicloQ.data.topConquistas.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex flex-row items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Conquistas do ciclo
                  </div>
                  <ul className="space-y-1 text-sm">
                    {cicloQ.data.topConquistas.map((c, idx) => {
                      const tipo = String((c as { tipo?: string }).tipo ?? "");
                      const titulo = String((c as { titulo?: string; metrica?: string }).titulo ?? (c as { metrica?: string }).metrica ?? "");
                      const avanco = (c as { avancoPct?: number }).avancoPct;
                      return (
                        <li key={idx} className="flex flex-row items-center gap-2" data-testid={`row-conquista-${idx}`}>
                          <Badge variant="secondary">{tipo === "iniciativa_concluida" ? "Iniciativa" : "KR"}</Badge>
                          <span className="truncate">{titulo}</span>
                          {avanco != null && <span className="text-xs text-muted-foreground">+{avanco}%</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados do ciclo.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objetivos Descarrilados */}
        <Card data-testid="card-descarrilados">
          <CardHeader>
            <CardTitle className="flex flex-row items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Objetivos descarrilados
            </CardTitle>
            <CardDescription>
              {descarriladosQ.data
                ? `Critérios: < ${descarriladosQ.data.criterios.pctMinimoAceitavel}% de progresso ou sem check-in há mais de ${descarriladosQ.data.criterios.diasSemCheckinLimite} dias.`
                : "Carregando..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {descarriladosQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : descarriladosQ.data && descarriladosQ.data.descarrilados.length > 0 ? (
              descarriladosQ.data.descarrilados.map((d) => (
                <div
                  key={d.id}
                  className="rounded-md border p-3 space-y-2 hover-elevate"
                  data-testid={`row-descarrilado-${d.id}`}
                >
                  <div className="flex flex-row items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium" data-testid={`text-descarrilado-titulo-${d.id}`}>{d.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.perspectiva && <span className="capitalize">{d.perspectiva} · </span>}
                        {d.totalKrs} KR(s) · último check-in {formatDate(d.ultimoCheckinEm)}
                      </div>
                    </div>
                    <PctBadge pct={d.pctMedio} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {d.motivos.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs" data-testid={`badge-motivo-${d.id}-${m}`}>
                        {motivoLabel(m)}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-row gap-2 flex-wrap">
                    <Button asChild size="sm" variant="default" data-testid={`button-corrigir-objetivo-${d.id}`}>
                      <Link href={`/okrs?destacar=${d.id}`}>
                        <Wrench className="h-3.5 w-3.5" />
                        Corrigir
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setGapAlvo({ tipo: "objetivo", id: d.id, label: d.titulo })}
                      data-testid={`button-analisar-gap-${d.id}`}
                    >
                      <Gauge className="h-3.5 w-3.5" />
                      Ver análise
                    </Button>
                    {d.krMaisAtrasado && (
                      <span className="text-xs text-muted-foreground self-center">
                        KR mais atrasado: {d.krMaisAtrasado.metrica}
                        {d.krMaisAtrasado.pct != null && ` (${d.krMaisAtrasado.pct}%)`}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-descarrilados-vazio">
                Nenhum objetivo descarrilado. Bom trabalho!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lacunas da Cascata */}
        <Card data-testid="card-lacunas">
          <CardHeader>
            <CardTitle className="flex flex-row items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Lacunas da cascata
            </CardTitle>
            <CardDescription>
              Pontas soltas entre estratégia, objetivos, KRs, KPIs e iniciativas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lacunasQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : lacunasQ.data ? (
              <>
                <LacunaSecao
                  titulo="Iniciativas sem objetivo"
                  itens={lacunasQ.data.iniciativasSemObjetivo}
                  href={(i) => `/iniciativas?destacar=${i.id}`}
                  rotulo={(i) => i.titulo}
                  testIdPrefix="lacuna-ini-sem-obj"
                />
                <LacunaSecao
                  titulo="Objetivos sem KR"
                  itens={lacunasQ.data.objetivosSemKr}
                  href={(o) => `/okrs?destacar=${o.id}`}
                  rotulo={(o) => o.titulo}
                  testIdPrefix="lacuna-obj-sem-kr"
                />
                <LacunaSecao
                  titulo="KPIs sem KR atacando"
                  itens={lacunasQ.data.kpisSemKrAtacando}
                  href={(k) => `/indicadores?destacar=${k.id}`}
                  rotulo={(k) => k.nome}
                  testIdPrefix="lacuna-kpi-sem-kr"
                />
                <LacunaSecao
                  titulo="KPIs sem iniciativa atacando"
                  itens={lacunasQ.data.kpisSemIniciativaAtacando}
                  href={(k) => `/indicadores?destacar=${k.id}`}
                  rotulo={(k) => k.nome}
                  testIdPrefix="lacuna-kpi-sem-ini"
                />
                <LacunaSecao
                  titulo="Estratégias sem iniciativa"
                  itens={lacunasQ.data.estrategiasSemIniciativa}
                  href={(e) => `/estrategias?destacar=${e.id}`}
                  rotulo={(e) => e.titulo}
                  testIdPrefix="lacuna-est-sem-ini"
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}
          </CardContent>
        </Card>

        {/* Consistência Estratégica */}
        <Card className="lg:col-span-2" data-testid="card-consistencia">
          <CardHeader>
            <CardTitle className="flex flex-row items-center gap-2">
              <Activity className="h-5 w-5" />
              Consistência estratégica
            </CardTitle>
            <CardDescription>
              Cada estratégia deve ter objetivos vinculados e iniciativas que atacam KPIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {consistenciaQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : consistenciaQ.data ? (
              <>
                {consistenciaQ.data.porEstrategia.length === 0 ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-consistencia-vazio">
                    Nenhuma estratégia cadastrada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {consistenciaQ.data.porEstrategia.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-md border p-3 hover-elevate"
                        data-testid={`row-estrategia-${e.id}`}
                      >
                        <div className="flex flex-row items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium" data-testid={`text-estrategia-titulo-${e.id}`}>{e.titulo}</div>
                            <div className="text-xs text-muted-foreground">
                              {e.objetivosVinculados} objetivo(s) · {e.iniciativasVinculadas} iniciativa(s) · {e.iniciativasQueTocamKpi} atacando KPI
                            </div>
                          </div>
                          <div className="flex flex-row items-center gap-2 flex-wrap">
                            {e.furos.length === 0 ? (
                              <Badge variant="default" data-testid={`badge-estrategia-ok-${e.id}`}>
                                <CheckCircle2 className="h-3 w-3" />
                                OK
                              </Badge>
                            ) : (
                              e.furos.map((f) => (
                                <Badge key={f} variant="destructive" data-testid={`badge-furo-${e.id}-${f}`}>
                                  {FURO_LABELS[f] ?? f}
                                </Badge>
                              ))
                            )}
                            <Button asChild size="sm" variant={e.furos.length > 0 ? "outline" : "ghost"} data-testid={`button-${e.furos.length > 0 ? "corrigir" : "abrir"}-estrategia-${e.id}`}>
                              <Link href={`/estrategias?destacar=${e.id}`}>
                                {e.furos.length > 0 ? <Wrench className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                {e.furos.length > 0 ? "Corrigir" : "Abrir"}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {consistenciaQ.data.objetivosSemIniciativa.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium flex flex-row items-center gap-2">
                      <Target className="h-4 w-4" />
                      Objetivos sem iniciativa atacando
                    </div>
                    <div className="space-y-1">
                      {consistenciaQ.data.objetivosSemIniciativa.map((o) => (
                        <div
                          key={o.id}
                          className="flex flex-row items-center justify-between gap-2 rounded-md border p-2 hover-elevate"
                          data-testid={`row-obj-sem-ini-${o.id}`}
                        >
                          <div className="text-sm truncate">{o.titulo}</div>
                          <Button asChild size="sm" variant="outline" data-testid={`button-corrigir-objetivo-sem-ini-${o.id}`}>
                            <Link href={`/okrs?destacar=${o.id}`}>
                              <Wrench className="h-3.5 w-3.5" />
                              Corrigir
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gap meta × realizado */}
      <Card data-testid="card-gap">
        <CardHeader>
          <div className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex flex-row items-center gap-2">
                <Gauge className="h-5 w-5" />
                Gap meta × realizado
              </CardTitle>
              <CardDescription>
                {gapAlvo
                  ? `Análise detalhada de "${gapAlvo.label}".`
                  : "Selecione um item para ver causas prováveis, tendência e projeção."}
              </CardDescription>
            </div>
            {gapAlvo && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setGapAlvo(null)}
                data-testid="button-fechar-gap"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!gapAlvo ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use o botão "Ver análise" nos cards de objetivos descarrilados ou escolha um KPI sem KR atacando abaixo:
              </p>
              <div className="flex flex-row flex-wrap gap-2">
                {(lacunasQ.data?.kpisSemKrAtacando ?? []).slice(0, 8).map((k) => (
                  <Button
                    key={k.id}
                    size="sm"
                    variant="outline"
                    onClick={() => setGapAlvo({ tipo: "kpi", id: k.id, label: k.nome })}
                    data-testid={`button-analisar-gap-kpi-${k.id}`}
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    {k.nome}
                  </Button>
                ))}
                {(lacunasQ.data?.kpisSemKrAtacando ?? []).length === 0 && (
                  <span className="text-xs text-muted-foreground">Nenhum KPI com lacuna evidente — escolha pelo card de descarrilados.</span>
                )}
              </div>
            </div>
          ) : gapQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : gapQ.data?.erro ? (
            <p className="text-sm text-destructive" data-testid="text-gap-erro">{gapQ.data.erro}</p>
          ) : gapQ.data ? (
            <div className="space-y-3">
              <div className="flex flex-row flex-wrap gap-2 items-center">
                <Badge variant="outline" data-testid="badge-gap-tipo">{gapQ.data.tipo}</Badge>
                <span className="text-sm font-medium" data-testid="text-gap-titulo">
                  {gapQ.data.nome ?? gapQ.data.titulo ?? gapQ.data.metrica ?? "—"}
                </span>
                {gapQ.data.status && (
                  <Badge
                    variant={
                      gapQ.data.status === "verde"
                        ? "default"
                        : gapQ.data.status === "amarelo"
                        ? "secondary"
                        : gapQ.data.status === "vermelho"
                        ? "destructive"
                        : "outline"
                    }
                    data-testid="badge-gap-status"
                  >
                    {gapQ.data.status}
                  </Badge>
                )}
                {gapQ.data.tendencia && (
                  <Badge variant="outline" data-testid="badge-gap-tendencia">
                    Tendência: {gapQ.data.tendencia}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {gapQ.data.valorAtual != null && (
                  <div className="rounded-md border p-3" data-testid="stat-gap-atual">
                    <div className="text-xs text-muted-foreground">Valor atual</div>
                    <div className="text-lg font-semibold">{gapQ.data.valorAtual}</div>
                  </div>
                )}
                {gapQ.data.meta != null && (
                  <div className="rounded-md border p-3" data-testid="stat-gap-meta">
                    <div className="text-xs text-muted-foreground">Meta</div>
                    <div className="text-lg font-semibold">{gapQ.data.meta}</div>
                  </div>
                )}
                {gapQ.data.gapPct != null && (
                  <div className="rounded-md border p-3" data-testid="stat-gap-pct">
                    <div className="text-xs text-muted-foreground">Gap (%)</div>
                    <div className="text-lg font-semibold">{gapQ.data.gapPct}%</div>
                  </div>
                )}
                {gapQ.data.pctAtingido != null && (
                  <div className="rounded-md border p-3" data-testid="stat-gap-pct-atingido">
                    <div className="text-xs text-muted-foreground">% atingido</div>
                    <div className="text-lg font-semibold">{gapQ.data.pctAtingido}%</div>
                  </div>
                )}
                {gapQ.data.pctMedio != null && (
                  <div className="rounded-md border p-3" data-testid="stat-gap-pct-medio">
                    <div className="text-xs text-muted-foreground">% médio dos KRs</div>
                    <div className="text-lg font-semibold">{gapQ.data.pctMedio}%</div>
                  </div>
                )}
                {(gapQ.data.diasSemLeitura != null || gapQ.data.diasSemCheckin != null) && (
                  <div className="rounded-md border p-3" data-testid="stat-gap-dias-sem-update">
                    <div className="text-xs text-muted-foreground">Dias sem atualização</div>
                    <div className="text-lg font-semibold">
                      {gapQ.data.diasSemLeitura ?? gapQ.data.diasSemCheckin ?? "—"}
                    </div>
                  </div>
                )}
              </div>

              {gapQ.data.causasProvaveis && gapQ.data.causasProvaveis.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium flex flex-row items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Causas prováveis
                  </div>
                  <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                    {gapQ.data.causasProvaveis.map((c, idx) => (
                      <li key={idx} data-testid={`text-causa-${idx}`}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <Button asChild size="sm" variant="default" data-testid="button-corrigir-gap">
                  <Link href={corrigirHrefGap(gapAlvo)}>
                    <Wrench className="h-3.5 w-3.5" />
                    Corrigir agora
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center" data-testid="text-loading">
          Carregando diagnóstico...
        </p>
      )}
    </div>
  );
}

function LacunaSecao<T extends { id: string }>({
  titulo,
  itens,
  href,
  rotulo,
  testIdPrefix,
}: {
  titulo: string;
  itens: T[];
  href: (item: T) => string;
  rotulo: (item: T) => string;
  testIdPrefix: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium flex flex-row items-center gap-2 flex-wrap">
        <ListChecks className="h-4 w-4" />
        {titulo}
        <Badge variant={itens.length === 0 ? "default" : "secondary"} data-testid={`badge-${testIdPrefix}-count`}>
          {itens.length}
        </Badge>
      </div>
      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem pendências.</p>
      ) : (
        <ul className="space-y-1">
          {itens.map((it) => (
            <li
              key={it.id}
              className="flex flex-row items-center justify-between gap-2 rounded-md border p-2 hover-elevate"
              data-testid={`row-${testIdPrefix}-${it.id}`}
            >
              <span className="text-sm truncate">{rotulo(it)}</span>
              <Button asChild size="sm" variant="outline" data-testid={`button-${testIdPrefix}-${it.id}`}>
                <Link href={href(it)}>
                  <Wrench className="h-3.5 w-3.5" />
                  Corrigir
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useState } from "react";
import { useDeepLinkDialog } from "@/hooks/useDeepLinkDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DollarSign,
  Users,
  Cog,
  GraduationCap,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Edit2,
  BarChart3,
  Target,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Indicador, KpiLeitura } from "@shared/schema";
import { Link } from "wouter";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format, subMonths, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERSPECTIVAS = [
  {
    valor: "Finanças",
    label: "Finanças",
    icon: DollarSign,
    cor: "text-green-600 dark:text-green-400",
    bgCor: "bg-green-100 dark:bg-green-950/40",
    ringCor: "ring-green-200 dark:ring-green-900/60",
    accentClass: "border-l-green-500",
  },
  {
    valor: "Clientes",
    label: "Clientes",
    icon: Users,
    cor: "text-blue-600 dark:text-blue-400",
    bgCor: "bg-blue-100 dark:bg-blue-950/40",
    ringCor: "ring-blue-200 dark:ring-blue-900/60",
    accentClass: "border-l-blue-500",
  },
  {
    valor: "Processos",
    label: "Processos",
    icon: Cog,
    cor: "text-orange-600 dark:text-orange-400",
    bgCor: "bg-orange-100 dark:bg-orange-950/40",
    ringCor: "ring-orange-200 dark:ring-orange-900/60",
    accentClass: "border-l-orange-500",
  },
  {
    valor: "Pessoas",
    label: "Pessoas",
    icon: GraduationCap,
    cor: "text-purple-600 dark:text-purple-400",
    bgCor: "bg-purple-100 dark:bg-purple-950/40",
    ringCor: "ring-purple-200 dark:ring-purple-900/60",
    accentClass: "border-l-purple-500",
  },
];

const STATUS_CONFIG = {
  verde: {
    label: "No Alvo",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400",
    icon: CheckCircle2,
    dotClass: "bg-green-500",
  },
  amarelo: {
    label: "Atenção",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400",
    icon: AlertCircle,
    dotClass: "bg-yellow-500",
  },
  vermelho: {
    label: "Crítico",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400",
    icon: XCircle,
    dotClass: "bg-red-500",
  },
};

const EMPTY_FORM = {
  perspectiva: "Finanças",
  nome: "",
  meta: "",
  atual: "",
  status: "verde",
  owner: "",
  responsavelId: null as string | null,
};

const PERIOD_OPTIONS = [
  { value: "3m", label: "3 meses", months: 3 },
  { value: "6m", label: "6 meses", months: 6 },
  { value: "12m", label: "12 meses", months: 12 },
  { value: "all", label: "Todo período", months: 999 },
];

function extrairNumero(str: string | null | undefined): number | null {
  if (!str) return null;
  const clean = String(str).replace(/[^\d.,\-]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function calcularStatus(ultimaLeitura: string | null | undefined, meta: string | null | undefined): "verde" | "amarelo" | "vermelho" {
  const vAtual = extrairNumero(ultimaLeitura);
  const vMeta = extrairNumero(meta);
  if (vAtual === null || vMeta === null || vMeta === 0) return "verde";
  const ratio = vAtual / vMeta;
  if (ratio >= 0.95) return "verde";
  if (ratio >= 0.7) return "amarelo";
  return "vermelho";
}

function calcularVariacao(leituras: KpiLeitura[]): { texto: string; positivo: boolean | null } | null {
  if (leituras.length < 2) return null;
  const atual = extrairNumero(leituras[0].valor);
  const anterior = extrairNumero(leituras[1].valor);
  if (atual === null || anterior === null || anterior === 0) return null;
  const diff = ((atual - anterior) / Math.abs(anterior)) * 100;
  const sinal = diff >= 0 ? "+" : "";
  return {
    texto: `${sinal}${diff.toFixed(1)}%`,
    positivo: diff > 0 ? true : diff < 0 ? false : null,
  };
}

function formatarValorCurto(str: string | null | undefined): string {
  if (!str) return "—";
  return str;
}

function safeFormatDate(dateStr: string | number | Date): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function safeFormatShort(dateStr: string | number | Date): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "—" : format(d, "dd/MM", { locale: ptBR });
  } catch {
    return "—";
  }
}

function filterByPeriod(leituras: KpiLeitura[], months: number): KpiLeitura[] {
  if (months >= 999) return leituras;
  const cutoff = subMonths(new Date(), months);
  return leituras.filter((l) => {
    try {
      return isAfter(new Date(l.registradoEm), cutoff);
    } catch {
      return true;
    }
  });
}

function PerspectiveSummaryTile({
  perspectiva,
  indicadores,
}: {
  perspectiva: typeof PERSPECTIVAS[number];
  indicadores: Indicador[];
}) {
  const inds = indicadores.filter((i) => i.perspectiva === perspectiva.valor);
  const Icon = perspectiva.icon;
  const verde = inds.filter((i) => i.status === "verde").length;
  const amarelo = inds.filter((i) => i.status === "amarelo").length;
  const vermelho = inds.filter((i) => i.status === "vermelho").length;

  return (
    <Card
      className={`p-4 flex flex-col gap-3 ${perspectiva.bgCor} border-0`}
      data-testid={`tile-perspectiva-${perspectiva.valor}`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-md flex items-center justify-center bg-background/60 dark:bg-background/20`}>
          <Icon className={`h-4 w-4 ${perspectiva.cor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{perspectiva.label}</p>
          <p className="text-xs text-muted-foreground">{inds.length} indicador{inds.length !== 1 ? "es" : ""}</p>
        </div>
      </div>
      {inds.length > 0 && (
        <div className="flex items-center gap-3">
          {verde > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium">{verde}</span>
            </div>
          )}
          {amarelo > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-xs font-medium">{amarelo}</span>
            </div>
          )}
          {vermelho > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs font-medium">{vermelho}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

interface KpiCardProps {
  ind: Indicador;
  onEditar: (ind: Indicador) => void;
  onDeletar: (id: string) => void;
  deletandoId: string | null;
  onOpenDrilldown: (ind: Indicador) => void;
}

function KpiCard({ ind, onEditar, onDeletar, deletandoId, onOpenDrilldown }: KpiCardProps) {
  const { data: leituras = [] } = useQuery<KpiLeitura[]>({
    queryKey: [`/api/indicadores/${ind.id}/leituras`],
  });

  const ultimaLeitura = leituras[0];
  const valorAtual = ultimaLeitura ? ultimaLeitura.valor : ind.atual;
  const statusComputado = ultimaLeitura ? calcularStatus(ultimaLeitura.valor, ind.meta) : (ind.status as keyof typeof STATUS_CONFIG);
  const statusCfg = STATUS_CONFIG[statusComputado] || STATUS_CONFIG.verde;
  const StatusIcon = statusCfg.icon;
  const variacao = calcularVariacao(leituras);

  const sparkData = [...leituras].reverse().map((l) => ({
    v: extrairNumero(l.valor) ?? 0,
  }));

  const numAtual = extrairNumero(valorAtual);
  const numMeta = extrairNumero(ind.meta);
  const pctAtingido = numAtual !== null && numMeta !== null && numMeta !== 0
    ? Math.min(100, Math.round((numAtual / numMeta) * 100))
    : null;

  return (
    <Card
      className="p-0 overflow-visible cursor-pointer hover-elevate active-elevate-2 transition-all"
      data-testid={`card-indicador-${ind.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDrilldown(ind)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDrilldown(ind); } }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{ind.owner}</p>
            <p className="text-sm font-semibold leading-tight truncate" data-testid={`text-indicador-nome-${ind.id}`}>
              {ind.nome}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusCfg.badgeClass}`}>
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </span>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold tracking-tight leading-none" data-testid={`text-indicador-atual-${ind.id}`}>
              {formatarValorCurto(valorAtual)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                Meta: {ind.meta}
              </span>
              {variacao && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${variacao.positivo === true ? "text-green-600 dark:text-green-400" : variacao.positivo === false ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                  {variacao.positivo === true && <TrendingUp className="h-3 w-3" />}
                  {variacao.positivo === false && <TrendingDown className="h-3 w-3" />}
                  {variacao.positivo === null && <Minus className="h-3 w-3" />}
                  {variacao.texto}
                </span>
              )}
            </div>
          </div>

          {sparkData.length >= 2 && (
            <div className="w-24 h-10 flex-shrink-0" data-testid={`sparkline-${ind.id}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={statusComputado === "verde" ? "#22c55e" : statusComputado === "amarelo" ? "#eab308" : "#ef4444"}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {pctAtingido !== null && (
          <div className="space-y-1">
            <Progress
              value={pctAtingido}
              className={`h-1.5 ${pctAtingido >= 95 ? "[&>div]:bg-green-500" : pctAtingido >= 70 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}`}
            />
            <p className="text-xs text-muted-foreground text-right">{pctAtingido}% da meta</p>
          </div>
        )}

        {ind.benchmarkSetorial && (
          <div className="flex items-start gap-1.5 bg-muted/40 rounded px-2 py-1.5" data-testid={`benchmark-${ind.id}`}>
            <Globe className="h-3 w-3 text-muted-foreground/70 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ind.benchmarkSetorial}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {leituras.length > 0 && (
            <span>{leituras.length} leitura{leituras.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEditar(ind)}
            aria-label="Editar indicador"
            data-testid={`button-editar-indicador-${ind.id}`}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDeletar(ind.id)}
            disabled={deletandoId === ind.id}
            aria-label="Excluir indicador"
            data-testid={`button-deletar-indicador-${ind.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
        </div>
      </div>
    </Card>
  );
}

function DrilldownSheet({
  ind,
  open,
  onClose,
}: {
  ind: Indicador | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [periodFilter, setPeriodFilter] = useState("6m");
  const [leituraForm, setLeituraForm] = useState({ valor: "", nota: "" });

  const { data: allLeituras = [] } = useQuery<KpiLeitura[]>({
    queryKey: [`/api/indicadores/${ind?.id}/leituras`],
    enabled: !!ind,
  });

  // Task #208 — Iniciativas e KRs vinculados a este indicador (campo
  // indicadorFonteId). Mostradas em uma seção dedicada do drilldown.
  const { data: vinculados } = useQuery<{
    iniciativas: Array<{ id: string; titulo: string; status: string; prazo: string }>;
    resultadosChave: Array<{ id: string; metrica: string; objetivoId: string; objetivoTitulo: string }>;
  }>({
    queryKey: [`/api/indicadores/${ind?.id}/vinculados`],
    enabled: !!ind,
  });

  const criarLeituraMutation = useMutation({
    mutationFn: (data: { valor: string; nota: string }) =>
      apiRequest("POST", `/api/indicadores/${ind?.id}/leituras`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/indicadores/${ind?.id}/leituras`] });
      queryClient.invalidateQueries({ queryKey: ["/api/indicadores"] });
      setLeituraForm({ valor: "", nota: "" });
      toast({ title: "Leitura registrada!" });
    },
    onError: () => toast({ title: "Erro ao registrar leitura", variant: "destructive" }),
  });

  const deletarLeituraMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/indicadores/leituras/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/indicadores/${ind?.id}/leituras`] });
      queryClient.invalidateQueries({ queryKey: ["/api/indicadores"] });
    },
  });

  if (!ind) return null;

  const selectedPeriod = PERIOD_OPTIONS.find((p) => p.value === periodFilter) ?? PERIOD_OPTIONS[3];
  const leituras = filterByPeriod(allLeituras, selectedPeriod.months);

  const statusComputado = allLeituras[0]
    ? calcularStatus(allLeituras[0].valor, ind.meta)
    : (ind.status as keyof typeof STATUS_CONFIG);
  const statusCfg = STATUS_CONFIG[statusComputado] || STATUS_CONFIG.verde;
  const StatusIcon = statusCfg.icon;
  const valorAtual = allLeituras[0] ? allLeituras[0].valor : ind.atual;
  const variacao = calcularVariacao(allLeituras);

  const chartData = [...leituras].reverse().map((l) => ({
    date: safeFormatShort(l.registradoEm),
    valor: extrairNumero(l.valor) ?? 0,
  }));

  const metaNum = extrairNumero(ind.meta);

  const handleSubmitLeitura = () => {
    if (!leituraForm.valor.trim()) {
      toast({ title: "Preencha o valor", variant: "destructive" });
      return;
    }
    criarLeituraMutation.mutate(leituraForm);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto" data-testid="sheet-drilldown">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {ind.nome}
          </SheetTitle>
          <SheetDescription>
            {ind.perspectiva} &middot; {ind.owner}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold tracking-tight">{formatarValorCurto(valorAtual)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.badgeClass}`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusCfg.label}
                </span>
                {variacao && (
                  <span className={`text-xs font-semibold ${variacao.positivo === true ? "text-green-600 dark:text-green-400" : variacao.positivo === false ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    {variacao.texto} vs anterior
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Meta</p>
              <p className="text-lg font-semibold text-muted-foreground">{ind.meta}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Evolução</p>
            <div className="flex gap-1">
              {PERIOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={periodFilter === opt.value ? "default" : "ghost"}
                  onClick={() => setPeriodFilter(opt.value)}
                  data-testid={`button-period-${opt.value}`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {chartData.length >= 2 ? (
            <div className="h-48" data-testid="chart-drilldown">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      fontSize: "12px",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--background))",
                    }}
                    formatter={(v: number) => [v, "Valor"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                  />
                  {metaNum !== null && (
                    <Area
                      type="monotone"
                      dataKey={() => metaNum}
                      stroke="hsl(var(--destructive))"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      fill="none"
                      name="Meta"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Registre leituras para visualizar a evolução</p>
            </Card>
          )}

          {ind.benchmarkSetorial && (
            <div className="flex items-start gap-2 bg-muted/40 rounded-md px-3 py-2">
              <Globe className="h-4 w-4 text-muted-foreground/70 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Benchmark Setorial</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{ind.benchmarkSetorial}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Registrar Nova Leitura</p>
            <div className="flex gap-2">
              <Input
                placeholder={`Ex: ${ind.atual}`}
                value={leituraForm.valor}
                onChange={(e) => setLeituraForm({ ...leituraForm, valor: e.target.value })}
                className="flex-1"
                data-testid={`input-leitura-valor-${ind.id}`}
              />
              <Button
                onClick={handleSubmitLeitura}
                disabled={criarLeituraMutation.isPending}
                data-testid={`button-salvar-leitura-${ind.id}`}
              >
                {criarLeituraMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Registrar
              </Button>
            </div>
            <Textarea
              placeholder="Nota / Contexto (opcional)"
              value={leituraForm.nota}
              onChange={(e) => setLeituraForm({ ...leituraForm, nota: e.target.value })}
              className="resize-none"
              rows={2}
              data-testid={`input-leitura-nota-${ind.id}`}
            />
          </div>

          {/* Task #208 — Iniciativas e metas que tratam este indicador */}
          {(vinculados && (vinculados.iniciativas.length > 0 || vinculados.resultadosChave.length > 0)) && (
            <div className="space-y-2" data-testid="section-vinculados">
              <p className="text-sm font-medium">Iniciativas e metas que tratam este indicador</p>
              <div className="space-y-2">
                {vinculados.iniciativas.map((it) => (
                  <div
                    key={`ini-${it.id}`}
                    className="flex items-start justify-between gap-2 p-2 rounded-md border text-sm"
                    data-testid={`vinculado-iniciativa-${it.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="shrink-0">Iniciativa</Badge>
                        <span className="font-medium truncate">{it.titulo}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {it.status} · prazo {it.prazo || "—"}
                      </p>
                    </div>
                  </div>
                ))}
                {vinculados.resultadosChave.map((kr) => (
                  <div
                    key={`kr-${kr.id}`}
                    className="flex items-start justify-between gap-2 p-2 rounded-md border text-sm"
                    data-testid={`vinculado-kr-${kr.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="shrink-0">Meta (KR)</Badge>
                        <span className="font-medium truncate">{kr.metrica}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Objetivo: {kr.objetivoTitulo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allLeituras.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Histórico de Leituras</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {allLeituras.map((l) => (
                  <div key={l.id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/30 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{l.valor}</span>
                        <span className="text-xs text-muted-foreground">{safeFormatDate(l.registradoEm)}</span>
                      </div>
                      {l.nota && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{l.nota}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deletarLeituraMutation.mutate(l.id)}
                      aria-label="Excluir leitura"
                      data-testid={`button-deletar-leitura-${l.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Indicadores() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Indicador | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [drilldownInd, setDrilldownInd] = useState<Indicador | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

  const { data: empresa } = useQuery<{ id: string; nome: string }>({
    queryKey: ["/api/empresa"],
  });

  const { data: todosIndicadores = [], isLoading } = useQuery<Indicador[]>({
    queryKey: ["/api/indicadores"],
    enabled: !!empresa?.id,
  });

  const { data: membros = [] } = useQuery<{ id: string; nome: string; email: string }[]>({
    queryKey: ["/api/membros"],
  });

  const indicadores = todosIndicadores.filter((i) => i.perspectiva !== "diagnostico");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/indicadores"] });

  const criarMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      apiRequest("POST", "/api/indicadores", { ...data, empresaId: empresa?.id }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast({ title: "Indicador criado!", description: "Indicador adicionado com sucesso." });
    },
    onError: () =>
      toast({ title: "Erro ao criar", variant: "destructive" }),
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_FORM }) =>
      apiRequest("PATCH", `/api/indicadores/${id}`, data),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditando(null);
      setForm(EMPTY_FORM);
      toast({ title: "Indicador atualizado!", description: "Alterações salvas." });
    },
    onError: () =>
      toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deletarMutation = useMutation({
    mutationFn: (id: string) => {
      setDeletandoId(id);
      return apiRequest("DELETE", `/api/indicadores/${id}`);
    },
    onSuccess: () => {
      setDeletandoId(null);
      invalidate();
      toast({ title: "Indicador removido." });
    },
    onError: () => {
      setDeletandoId(null);
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });

  const benchmarkMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/gerar-benchmarks", {}),
    onSuccess: (data) => {
      invalidate();
      toast({
        title: "Benchmarks gerados!",
        description: `${data?.updated ?? 0} indicador(es) contextualizados com dados setoriais.`,
      });
    },
    onError: () => toast({ title: "Erro ao gerar benchmarks", variant: "destructive" }),
  });

  const gerarMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/gerar-indicadores", {}),
    onSuccess: async (data) => {
      if (!data?.indicadores?.length) {
        toast({
          title: "Nenhum indicador novo",
          description: "Todos já existem ou são similares.",
          variant: "destructive",
        });
        return;
      }
      for (const ind of data.indicadores) {
        await apiRequest("POST", "/api/indicadores", {
          ...ind,
          empresaId: empresa?.id,
        });
      }
      invalidate();
      toast({
        title: "Indicadores gerados!",
        description: `${data.indicadores.length} indicador(es) criado(s) pela IA.`,
      });
    },
    onError: () =>
      toast({ title: "Erro ao gerar indicadores com IA", variant: "destructive" }),
  });

  const abrirCriar = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const abrirEditar = (ind: Indicador) => {
    setEditando(ind);
    setForm({
      perspectiva: ind.perspectiva,
      nome: ind.nome,
      meta: ind.meta,
      atual: ind.atual,
      status: ind.status,
      owner: ind.owner,
      responsavelId: ind.responsavelId ?? null,
    });
    setDialogOpen(true);
  };

  useDeepLinkDialog(!!empresa?.id && !isLoading, ({ novo, editar, params }) => {
    if (editar) {
      const found = indicadores.find((i) => i.id === editar);
      if (!found) return false;
      abrirEditar(found);
      setForm((prev) => ({
        ...prev,
        ...(params.perspectiva ? { perspectiva: params.perspectiva } : {}),
        ...(params.nome ? { nome: params.nome } : {}),
        ...(params.meta ? { meta: params.meta } : {}),
        ...(params.atual ? { atual: params.atual } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.owner ? { owner: params.owner } : {}),
      }));
      return true;
    }
    if (novo) {
      setEditando(null);
      setForm({
        perspectiva: params.perspectiva || "Finanças",
        nome: params.nome || "",
        meta: params.meta || "",
        atual: params.atual || "",
        status: params.status || "verde",
        owner: params.owner || "",
        responsavelId: null,
      });
      setDialogOpen(true);
    }
  });

  const handleSubmit = () => {
    if (!form.nome || !form.meta || !form.atual || !form.owner) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, meta, valor atual e responsável.",
        variant: "destructive",
      });
      return;
    }
    if (editando) {
      editarMutation.mutate({ id: editando.id, data: form });
    } else {
      criarMutation.mutate(form);
    }
  };

  const isSaving = criarMutation.isPending || editarMutation.isPending;

  const indicadoresPorPerspectiva = (perspectiva: string) =>
    indicadores.filter((i) => i.perspectiva === perspectiva);

  const openDrilldown = (ind: Indicador) => {
    setDrilldownInd(ind);
    setDrilldownOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Indicadores"
        description="Monitore os principais indicadores do negócio e acompanhe a saúde da estratégia em execução."
        tooltip="Indicadores que derivam da estratégia já construída. Diferente do Diagnóstico Atual (pré-estratégico), esses indicadores medem se a estratégia está sendo executada e gerando os resultados esperados."
        action={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => benchmarkMutation.mutate()}
              disabled={benchmarkMutation.isPending || indicadores.length === 0}
              data-testid="button-comparar-mercado"
            >
              {benchmarkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              Comparar com Mercado
            </Button>
            <Button
              variant="outline"
              onClick={() => gerarMutation.mutate()}
              disabled={gerarMutation.isPending}
              data-testid="button-gerar-kpis-ia"
            >
              {gerarMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar com IA
            </Button>
            <Button onClick={abrirCriar} data-testid="button-add-indicador">
              <Plus className="h-4 w-4 mr-2" />
              Novo Indicador
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="section-perspective-tiles">
        {PERSPECTIVAS.map((p) => (
          <PerspectiveSummaryTile key={p.valor} perspectiva={p} indicadores={indicadores} />
        ))}
      </div>

      <Card className="p-4 bg-muted/30" data-testid="card-educational-kpi">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Indicadores — Saúde contínua do negócio</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Medem o que já está em funcionamento. Têm meta fixa e status permanente (verde/amarelo/vermelho).
              Respondem: <em>"Como o negócio está indo agora?"</em>
            </p>
          </div>
          <div className="hidden sm:flex items-center text-muted-foreground/40">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Metas — Mudança e crescimento</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Definem onde você quer chegar em um ciclo. Têm prazo e progresso de 0–100%.
              Respondem: <em>"O que queremos conquistar neste trimestre/ano?"</em>
            </p>
          </div>
          <div className="hidden sm:flex items-center sm:self-center">
            <Link href="/okrs">
              <Button size="sm" variant="ghost" data-testid="link-ver-okrs">
                Ver Metas
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {indicadores.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum indicador cadastrado</h3>
            <p className="text-sm text-muted-foreground">
              Crie indicadores para monitorar a saúde do negócio nas 4 áreas estratégicas, ou deixe a IA gerar indicadores alinhados às suas metas e estratégias.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                onClick={() => gerarMutation.mutate()}
                disabled={gerarMutation.isPending}
                data-testid="button-gerar-kpis-empty"
              >
                {gerarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Gerar Indicadores com IA
              </Button>
              <Button variant="outline" onClick={abrirCriar} data-testid="button-criar-kpi-empty">
                <Plus className="h-4 w-4 mr-2" />
                Criar manualmente
              </Button>
            </div>
          </div>
        </Card>
      )}

      {indicadores.length > 0 && (
        <div className="flex items-center gap-6 flex-wrap">
          {(["verde", "amarelo", "vermelho"] as const).map((status) => {
            const count = indicadores.filter((i) => i.status === status).length;
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${cfg.dotClass}`} />
                <span className="text-sm font-semibold" data-testid={`count-kpi-${status}`}>
                  {count}
                </span>
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
            );
          })}
          <span className="text-xs text-muted-foreground ml-auto">
            {indicadores.length} indicador{indicadores.length !== 1 ? "es" : ""} no total
          </span>
        </div>
      )}

      {indicadores.length > 0 && (
        <div className="space-y-8">
          {PERSPECTIVAS.map((persp) => {
            const inds = indicadoresPorPerspectiva(persp.valor);
            if (inds.length === 0) return null;
            const Icon = persp.icon;

            return (
              <div key={persp.valor} className="space-y-4" data-testid={`section-perspectiva-${persp.valor}`}>
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className={`h-10 w-10 rounded-md flex items-center justify-center ${persp.bgCor}`}>
                    <Icon className={`h-5 w-5 ${persp.cor}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{persp.label}</h3>
                    <p className="text-xs text-muted-foreground">{inds.length} indicador{inds.length !== 1 ? "es" : ""}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {inds.map((ind) => (
                    <KpiCard
                      key={ind.id}
                      ind={ind}
                      onEditar={abrirEditar}
                      onDeletar={(id) => deletarMutation.mutate(id)}
                      deletandoId={deletandoId}
                      onOpenDrilldown={openDrilldown}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {indicadores.length > 1 && (
        <div className="space-y-3" data-testid="section-gap-analysis">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Análise de Gap — Distância para a Meta</h3>
          </div>
          <div className="space-y-2">
            {[...indicadores]
              .filter(ind => {
                const atual = parseFloat(String(ind.atual).replace(/[^0-9.,\-]/g, "").replace(",", "."));
                const meta = parseFloat(String(ind.meta).replace(/[^0-9.,\-]/g, "").replace(",", "."));
                return !isNaN(atual) && !isNaN(meta) && meta > 0;
              })
              .map(ind => {
                const atual = parseFloat(String(ind.atual).replace(/[^0-9.,\-]/g, "").replace(",", "."));
                const meta = parseFloat(String(ind.meta).replace(/[^0-9.,\-]/g, "").replace(",", "."));
                const pct = Math.min(100, Math.max(0, Math.round((atual / meta) * 100)));
                const gap = meta - atual;
                const gapPct = 100 - pct;
                return { ind, atual, meta, pct, gap, gapPct };
              })
              .sort((a, b) => a.pct - b.pct)
              .map(({ ind, atual, meta, pct, gap, gapPct }) => (
                <div
                  key={ind.id}
                  className="flex items-center gap-3 p-3 rounded-md border bg-card cursor-pointer hover-elevate"
                  role="button"
                  tabIndex={0}
                  data-testid={`gap-row-${ind.id}`}
                  onClick={() => openDrilldown(ind)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrilldown(ind); } }}
                >
                  <div className="min-w-[140px] max-w-[200px]">
                    <p className="text-xs font-medium truncate">{ind.nome}</p>
                    <p className="text-xs text-muted-foreground">{ind.perspectiva}</p>
                  </div>
                  <div className="flex-1">
                    <Progress value={pct} className={`h-2 ${pct < 50 ? "[&>div]:bg-red-500" : pct < 80 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`} />
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground min-w-[140px] justify-end flex-shrink-0">
                    <span>Atual: <strong className="text-foreground">{ind.atual}</strong></span>
                    <span>Meta: <strong className="text-foreground">{ind.meta}</strong></span>
                    <span className={`font-bold ${gapPct <= 0 ? "text-green-600" : gapPct <= 20 ? "text-yellow-600" : "text-red-600"}`}>
                      {pct >= 100 ? "Atingido" : `Gap: ${gapPct}%`}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <DrilldownSheet
        ind={drilldownInd}
        open={drilldownOpen}
        onClose={() => { setDrilldownOpen(false); setDrilldownInd(null); }}
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditando(null); setForm(EMPTY_FORM); } }}>
        <DialogTrigger className="hidden" />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Indicador" : "Novo Indicador"}</DialogTitle>
            <DialogDescription>
              {editando ? "Atualize os dados do indicador." : "Preencha os campos para criar um novo indicador."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="perspectiva">Área do Negócio</Label>
              <Select
                value={form.perspectiva}
                onValueChange={(v) => setForm({ ...form, perspectiva: v })}
              >
                <SelectTrigger data-testid="select-perspectiva-kpi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSPECTIVAS.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nome">Nome do Indicador</Label>
              <Input
                id="nome"
                placeholder="Ex: Taxa de Retenção de Clientes"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                data-testid="input-kpi-nome"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="meta">Meta</Label>
                <Input
                  id="meta"
                  placeholder="Ex: 85% ou R$ 500k"
                  value={form.meta}
                  onChange={(e) => setForm({ ...form, meta: e.target.value })}
                  data-testid="input-kpi-meta"
                />
              </div>
              <div>
                <Label htmlFor="atual">Valor Atual</Label>
                <Input
                  id="atual"
                  placeholder="Ex: 78%"
                  value={form.atual}
                  onChange={(e) => setForm({ ...form, atual: e.target.value })}
                  data-testid="input-kpi-atual"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger data-testid="select-status-kpi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verde">Verde — No Alvo</SelectItem>
                  <SelectItem value="amarelo">Amarelo — Atenção</SelectItem>
                  <SelectItem value="vermelho">Vermelho — Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="owner">Responsável</Label>
              <Select
                value={form.responsavelId ?? "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") {
                    setForm({ ...form, responsavelId: null });
                  } else {
                    const m = membros.find((x) => x.id === v);
                    setForm({ ...form, responsavelId: v, owner: m ? m.nome : form.owner });
                  }
                }}
              >
                <SelectTrigger data-testid="select-kpi-owner">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {form.owner ? `Não atribuído (texto: ${form.owner})` : "Não atribuído"}
                  </SelectItem>
                  {membros.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSaving}
              data-testid="button-salvar-kpi"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editando ? "Salvar alterações" : "Criar Indicador"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

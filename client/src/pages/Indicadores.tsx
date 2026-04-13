import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
  ClipboardList,
  ChevronDown,
  ChevronUp,
  History,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Indicador, KpiLeitura } from "@shared/schema";
import { Link } from "wouter";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERSPECTIVAS = [
  {
    valor: "Finanças",
    label: "Finanças",
    icon: DollarSign,
    cor: "text-green-600 bg-green-50 dark:bg-green-950/30",
    descricao: "Crescimento, rentabilidade e sustentabilidade financeira",
  },
  {
    valor: "Clientes",
    label: "Clientes",
    icon: Users,
    cor: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    descricao: "Satisfação, retenção e valor entregue aos clientes",
  },
  {
    valor: "Processos",
    label: "Processos",
    icon: Cog,
    cor: "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
    descricao: "Eficiência operacional e qualidade dos processos internos",
  },
  {
    valor: "Pessoas",
    label: "Pessoas",
    icon: GraduationCap,
    cor: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
    descricao: "Capacitação, engajamento e crescimento da equipe",
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
};

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
    texto: `${sinal}${diff.toFixed(1)}% vs. anterior`,
    positivo: diff > 0 ? true : diff < 0 ? false : null,
  };
}

interface KpiCardProps {
  ind: Indicador;
  onEditar: (ind: Indicador) => void;
  onDeletar: (id: string) => void;
  deletandoId: string | null;
}

function KpiCard({ ind, onEditar, onDeletar, deletandoId }: KpiCardProps) {
  const { toast } = useToast();
  const [leituraDialogOpen, setLeituraDialogOpen] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [leituraForm, setLeituraForm] = useState({ valor: "", nota: "" });

  const { data: leituras = [] } = useQuery<KpiLeitura[]>({
    queryKey: ["/api/indicadores", ind.id, "leituras"],
    enabled: true,
  });

  const criarLeituraMutation = useMutation({
    mutationFn: (data: { valor: string; nota: string }) =>
      apiRequest("POST", `/api/indicadores/${ind.id}/leituras`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicadores", ind.id, "leituras"] });
      queryClient.invalidateQueries({ queryKey: ["/api/indicadores"] });
      setLeituraDialogOpen(false);
      setLeituraForm({ valor: "", nota: "" });
      toast({ title: "Leitura registrada!", description: "Histórico atualizado." });
    },
    onError: () => toast({ title: "Erro ao registrar leitura", variant: "destructive" }),
  });

  const deletarLeituraMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/indicadores/leituras/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicadores", ind.id, "leituras"] });
    },
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

  const handleSubmitLeitura = () => {
    if (!leituraForm.valor.trim()) {
      toast({ title: "Preencha o valor", variant: "destructive" });
      return;
    }
    criarLeituraMutation.mutate(leituraForm);
  };

  return (
    <Card className="p-4 flex flex-col gap-3" data-testid={`card-indicador-${ind.id}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-tight flex-1" data-testid={`text-indicador-nome-${ind.id}`}>
          {ind.nome}
        </p>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusCfg.badgeClass}`}>
          <StatusIcon className="h-3 w-3" />
          {statusCfg.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Atual</p>
          <p className="font-semibold" data-testid={`text-indicador-atual-${ind.id}`}>{valorAtual}</p>
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="font-semibold text-muted-foreground" data-testid={`text-indicador-meta-${ind.id}`}>{ind.meta}</p>
        </div>
        {variacao && (
          <div className="ml-auto flex items-center gap-1">
            {variacao.positivo === true && <TrendingUp className="h-3 w-3 text-green-500" />}
            {variacao.positivo === false && <TrendingDown className="h-3 w-3 text-red-500" />}
            {variacao.positivo === null && <Minus className="h-3 w-3 text-muted-foreground" />}
            <span className={`text-xs font-medium ${variacao.positivo === true ? "text-green-600 dark:text-green-400" : variacao.positivo === false ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              {variacao.texto}
            </span>
          </div>
        )}
      </div>

      {ind.benchmarkSetorial && (
        <div className="flex items-start gap-1.5 bg-muted/40 rounded px-2 py-1.5" data-testid={`benchmark-${ind.id}`}>
          <Globe className="h-3 w-3 text-muted-foreground/70 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{ind.benchmarkSetorial}</p>
        </div>
      )}

      {sparkData.length >= 2 && (
        <div className="h-12" data-testid={`sparkline-${ind.id}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                dot={false}
              />
              <Tooltip
                contentStyle={{ fontSize: "11px", padding: "4px 8px" }}
                formatter={(v: number) => [v, "Valor"]}
                labelFormatter={() => ""}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{ind.owner}</p>
          {leituras.length > 0 && (
            <span className="text-xs text-muted-foreground">· {leituras.length} leitura{leituras.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex gap-1">
          <Dialog open={leituraDialogOpen} onOpenChange={setLeituraDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                data-testid={`button-registrar-leitura-${ind.id}`}
              >
                <ClipboardList className="h-3.5 w-3.5 mr-1" />
                Registrar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Leitura — {ind.nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor={`valor-${ind.id}`}>Valor Atual</Label>
                  <Input
                    id={`valor-${ind.id}`}
                    placeholder={`Ex: ${ind.atual}`}
                    value={leituraForm.valor}
                    onChange={(e) => setLeituraForm({ ...leituraForm, valor: e.target.value })}
                    data-testid={`input-leitura-valor-${ind.id}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`nota-${ind.id}`}>
                    Nota / Contexto <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    id={`nota-${ind.id}`}
                    placeholder="Ex: Mês com campanha especial, dados do sistema ERP..."
                    value={leituraForm.nota}
                    onChange={(e) => setLeituraForm({ ...leituraForm, nota: e.target.value })}
                    className="resize-none"
                    rows={2}
                    data-testid={`input-leitura-nota-${ind.id}`}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmitLeitura}
                  disabled={criarLeituraMutation.isPending}
                  data-testid={`button-salvar-leitura-${ind.id}`}
                >
                  {criarLeituraMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Salvar Leitura
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEditar(ind)}
            data-testid={`button-editar-indicador-${ind.id}`}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDeletar(ind.id)}
            disabled={deletandoId === ind.id}
            data-testid={`button-deletar-indicador-${ind.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {leituras.length > 0 && (
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setHistoricoAberto(!historicoAberto)}
          data-testid={`button-historico-${ind.id}`}
        >
          <History className="h-3 w-3" />
          {historicoAberto ? "Ocultar histórico" : "Ver histórico"}
          {historicoAberto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}

      {historicoAberto && (
        <div className="space-y-1.5 border-t pt-2" data-testid={`historico-${ind.id}`}>
          {leituras.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-2 text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{l.valor}</span>
                <span className="text-muted-foreground ml-2">
                  {format(new Date(l.registradoEm), "dd MMM yyyy", { locale: ptBR })}
                </span>
                {l.nota && (
                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{l.nota}</p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 flex-shrink-0 opacity-60 hover:opacity-100"
                onClick={() => deletarLeituraMutation.mutate(l.id)}
                data-testid={`button-deletar-leitura-${l.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Indicadores() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Indicador | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  const { data: empresa } = useQuery<{ id: string; nome: string }>({
    queryKey: ["/api/empresa"],
  });

  const { data: todosIndicadores = [], isLoading } = useQuery<Indicador[]>({
    queryKey: ["/api/indicadores"],
    enabled: !!empresa?.id,
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
      toast({ title: "Indicador criado!", description: "KPI adicionado com sucesso." });
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
        description: `${data?.updated ?? 0} KPI(s) contextualizados com dados setoriais.`,
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
        title: "KPIs gerados!",
        description: `${data.indicadores.length} indicador(es) criado(s) pela IA.`,
      });
    },
    onError: () =>
      toast({ title: "Erro ao gerar KPIs com IA", variant: "destructive" }),
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
    });
    setDialogOpen(true);
  };

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
        title="KPIs — Painel BSC"
        description="Com a estratégia definida, monitore a execução nas 4 perspectivas do Balanced Scorecard: Finanças, Clientes, Processos e Pessoas."
        tooltip="Os KPIs do Painel BSC derivam da estratégia já construída. Diferente do Diagnóstico Atual (baseline pré-estratégico), esses indicadores medem se a estratégia está sendo executada e gerando os resultados esperados."
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
              Novo KPI
            </Button>
          </div>
        }
      />

      {/* Educational callout: OKR vs KPI */}
      <Card className="p-4 bg-muted/30" data-testid="card-educational-kpi">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">KPIs — Saúde contínua do negócio</span>
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
              <span className="text-sm font-semibold">OKRs — Mudança e crescimento</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Definem onde você quer chegar em um ciclo. Têm prazo e progresso de 0–100%.
              Respondem: <em>"O que queremos conquistar neste trimestre/ano?"</em>
            </p>
          </div>
          <div className="hidden sm:flex items-center sm:self-center">
            <Link href="/okrs">
              <Button size="sm" variant="ghost" data-testid="link-ver-okrs">
                Ver OKRs
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Empty state */}
      {indicadores.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum KPI cadastrado</h3>
            <p className="text-sm text-muted-foreground">
              Crie KPIs estratégicos nas 4 perspectivas BSC para monitorar se a estratégia está sendo executada, ou deixe a IA gerar indicadores alinhados aos seus OKRs e estratégias.
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
                Gerar KPIs com IA
              </Button>
              <Button variant="outline" onClick={abrirCriar} data-testid="button-criar-kpi-empty">
                <Plus className="h-4 w-4 mr-2" />
                Criar manualmente
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Summary row */}
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

      {/* Indicators grouped by perspective */}
      {indicadores.length > 0 && (
        <div className="space-y-8">
          {PERSPECTIVAS.map((persp) => {
            const inds = indicadoresPorPerspectiva(persp.valor);
            if (inds.length === 0) return null;
            const Icon = persp.icon;

            return (
              <div key={persp.valor} className="space-y-4" data-testid={`section-perspectiva-${persp.valor}`}>
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${persp.cor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{persp.label}</h3>
                    <p className="text-sm text-muted-foreground">{persp.descricao}</p>
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
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* T36 — Análise de Gap */}
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
                <div key={ind.id} className="flex items-center gap-3 p-3 rounded-md border bg-card" data-testid={`gap-row-${ind.id}`}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditando(null); setForm(EMPTY_FORM); } }}>
        <DialogTrigger className="hidden" />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar KPI" : "Novo KPI"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="perspectiva">Perspectiva BSC</Label>
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
              <Input
                id="owner"
                placeholder="Ex: CFO, Gerente Comercial"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                data-testid="input-kpi-owner"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSaving}
              data-testid="button-salvar-kpi"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editando ? "Salvar alterações" : "Criar KPI"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

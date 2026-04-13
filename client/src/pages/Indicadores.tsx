import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Indicador } from "@shared/schema";
import { Link } from "wouter";

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

export default function Indicadores() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Indicador | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

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
    mutationFn: (id: string) => apiRequest("DELETE", `/api/indicadores/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Indicador removido." });
    },
    onError: () =>
      toast({ title: "Erro ao remover", variant: "destructive" }),
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
          <div className="flex gap-2">
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
                  {inds.map((ind) => {
                    const statusCfg = STATUS_CONFIG[ind.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.verde;
                    const StatusIcon = statusCfg.icon;

                    return (
                      <Card
                        key={ind.id}
                        className="p-4 flex flex-col gap-3"
                        data-testid={`card-indicador-${ind.id}`}
                      >
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
                            <p className="font-semibold" data-testid={`text-indicador-atual-${ind.id}`}>{ind.atual}</p>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Meta</p>
                            <p className="font-semibold text-muted-foreground" data-testid={`text-indicador-meta-${ind.id}`}>{ind.meta}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t">
                          <p className="text-xs text-muted-foreground truncate">{ind.owner}</p>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => abrirEditar(ind)}
                              data-testid={`button-editar-indicador-${ind.id}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deletarMutation.mutate(ind.id)}
                              disabled={deletarMutation.isPending}
                              data-testid={`button-deletar-indicador-${ind.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
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

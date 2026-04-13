import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  BarChart2,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Indicador } from "@shared/schema";

const PERSPECTIVA_DIAGNOSTICO = "diagnostico";

const METRICAS_SUGERIDAS = [
  { nome: "Receita Mensal", placeholder: "Ex: R$ 85.000" },
  { nome: "Crescimento Mensal", placeholder: "Ex: 3,5%" },
  { nome: "Margem Bruta", placeholder: "Ex: 42%" },
  { nome: "Satisfação de Clientes (NPS)", placeholder: "Ex: 7,8 (0-10)" },
  { nome: "Ticket Médio", placeholder: "Ex: R$ 420" },
];

const EMPTY_FORM = {
  nome: "",
  atual: "",
  meta: "",
};

export default function DiagnosticoAtual() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Indicador | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nomeSugestao, setNomeSugestao] = useState<string | null>(null);

  const { data: empresa } = useQuery<{ id: string; nome: string }>({
    queryKey: ["/api/empresa"],
  });

  const { data: todosIndicadores = [], isLoading } = useQuery<Indicador[]>({
    queryKey: ["/api/indicadores"],
    enabled: !!empresa?.id,
  });

  const metricas = todosIndicadores.filter(
    (i) => i.perspectiva === PERSPECTIVA_DIAGNOSTICO
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/indicadores"] });

  const criarMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      apiRequest("POST", "/api/indicadores", {
        ...data,
        perspectiva: PERSPECTIVA_DIAGNOSTICO,
        status: "verde",
        owner: "diagnostico",
        empresaId: empresa?.id,
      }),
    onSuccess: () => {
      invalidate();
      fecharDialog();
      toast({ title: "Métrica registrada!", description: "Dado de diagnóstico salvo." });
    },
    onError: () =>
      toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_FORM }) =>
      apiRequest("PATCH", `/api/indicadores/${id}`, {
        ...data,
        perspectiva: PERSPECTIVA_DIAGNOSTICO,
        status: "verde",
        owner: "diagnostico",
      }),
    onSuccess: () => {
      invalidate();
      fecharDialog();
      toast({ title: "Métrica atualizada!" });
    },
    onError: () =>
      toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deletarMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/indicadores/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Métrica removida." });
    },
    onError: () =>
      toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  const abrirCriar = (sugestao?: string) => {
    setEditando(null);
    setForm({ ...EMPTY_FORM, nome: sugestao ?? "" });
    setNomeSugestao(sugestao ?? null);
    setDialogOpen(true);
  };

  const abrirEditar = (m: Indicador) => {
    setEditando(m);
    setForm({ nome: m.nome, atual: m.atual, meta: m.meta ?? "" });
    setNomeSugestao(null);
    setDialogOpen(true);
  };

  const fecharDialog = () => {
    setDialogOpen(false);
    setEditando(null);
    setForm(EMPTY_FORM);
    setNomeSugestao(null);
  };

  const handleSubmit = () => {
    if (!form.nome || !form.atual) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o valor atual da métrica.",
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

  const metricasJaCriadas = new Set(metricas.map((m) => m.nome));
  const sugestoesDisponiveis = METRICAS_SUGERIDAS.filter(
    (s) => !metricasJaCriadas.has(s.nome)
  );

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
        title="Diagnóstico Atual"
        description="Registre 3 a 5 métricas que representam a situação real do negócio hoje, antes de construir a estratégia."
        tooltip="O Diagnóstico Atual cria um baseline pré-estratégico. Diferente dos KPIs BSC (que derivam da estratégia), essas métricas capturam o estado de partida — permitindo medir o impacto das decisões estratégicas ao longo do tempo."
        action={
          <Button onClick={() => abrirCriar()} data-testid="button-add-metrica">
            <Plus className="h-4 w-4 mr-2" />
            Nova Métrica
          </Button>
        }
      />

      <Card className="p-4 bg-muted/30" data-testid="card-callout-diagnostico">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Por que fazer o diagnóstico agora?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Antes de definir estratégias, é preciso saber onde a empresa está. Registre aqui 3 a 5 números
              que descrevem o desempenho atual — eles serão o ponto de comparação para medir o sucesso das
              decisões tomadas nos próximos passos da jornada.
            </p>
          </div>
        </div>
      </Card>

      {metricas.length === 0 && sugestoesDisponiveis.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground">Sugestões de métricas para começar:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {METRICAS_SUGERIDAS.map((s) => (
              <button
                key={s.nome}
                onClick={() => abrirCriar(s.nome)}
                className="flex items-center gap-3 p-4 rounded-md border border-dashed border-border hover-elevate text-left active-elevate-2 transition-colors"
                data-testid={`button-sugestao-${s.nome.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.placeholder}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {metricas.length > 0 && (
        <div className="space-y-3" data-testid="lista-metricas-diagnostico">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {metricas.length} métrica{metricas.length !== 1 ? "s" : ""} registrada{metricas.length !== 1 ? "s" : ""}
            </p>
            {metricas.length < 5 && (
              <p className="text-xs text-muted-foreground">
                Recomendado: de 3 a 5 métricas
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricas.map((m) => (
              <Card
                key={m.id}
                className="p-4 flex flex-col gap-3"
                data-testid={`card-metrica-${m.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold truncate" data-testid={`text-metrica-nome-${m.id}`}>
                      {m.nome}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => abrirEditar(m)}
                      data-testid={`button-editar-metrica-${m.id}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deletarMutation.mutate(m.id)}
                      disabled={deletarMutation.isPending}
                      data-testid={`button-deletar-metrica-${m.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor atual</p>
                    <p className="font-semibold" data-testid={`text-metrica-atual-${m.id}`}>{m.atual}</p>
                  </div>
                  {m.meta && (
                    <>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Referência</p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-metrica-meta-${m.id}`}>{m.meta}</p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {metricas.length > 0 && sugestoesDisponiveis.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground">Adicionar outra métrica sugerida:</p>
          <div className="flex flex-wrap gap-2">
            {sugestoesDisponiveis.map((s) => (
              <Button
                key={s.nome}
                variant="outline"
                size="sm"
                onClick={() => abrirCriar(s.nome)}
                data-testid={`button-sugestao-${s.nome.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                {s.nome}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) fecharDialog();
          else setDialogOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Métrica" : "Nova Métrica"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="nome">Nome da Métrica</Label>
              <Input
                id="nome"
                placeholder="Ex: Receita Mensal"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                data-testid="input-metrica-nome"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="atual">Valor Atual</Label>
                <Input
                  id="atual"
                  placeholder={
                    nomeSugestao
                      ? METRICAS_SUGERIDAS.find((s) => s.nome === nomeSugestao)?.placeholder ??
                        "Ex: 78%"
                      : "Ex: 78%"
                  }
                  value={form.atual}
                  onChange={(e) => setForm({ ...form, atual: e.target.value })}
                  data-testid="input-metrica-atual"
                />
              </div>
              <div>
                <Label htmlFor="meta">
                  Referência{" "}
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="meta"
                  placeholder="Ex: 85% (setor)"
                  value={form.meta}
                  onChange={(e) => setForm({ ...form, meta: e.target.value })}
                  data-testid="input-metrica-meta"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSaving}
              data-testid="button-salvar-metrica"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editando ? "Salvar alterações" : "Registrar Métrica"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

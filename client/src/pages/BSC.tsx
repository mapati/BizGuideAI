import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SemaphoreBadge } from "@/components/SemaphoreBadge";
import { ExampleCard } from "@/components/ExampleCard";
import { Plus, DollarSign, Users, Zap, Target, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Indicador } from "@shared/schema";
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

const PERSPECTIVAS = [
  { nome: "Finanças", icon: DollarSign, value: "Finanças" },
  { nome: "Clientes", icon: Users, value: "Clientes" },
  { nome: "Processos", icon: Zap, value: "Processos" },
  { nome: "Pessoas", icon: Target, value: "Pessoas" },
];

export default function BSC() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoIndicador, setNovoIndicador] = useState({
    perspectiva: "",
    nome: "",
    meta: "",
    atual: "",
    status: "amarelo",
    owner: "",
  });

  // Buscar empresa
  const { data: empresa } = useQuery({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  // Buscar indicadores
  const { data: indicadores = [], isLoading } = useQuery<Indicador[]>({
    queryKey: ["/api/indicadores", empresaId],
    enabled: !!empresaId,
  });

  // Gerar indicadores com IA
  const gerarIndicadoresMutation = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/ai/gerar-indicadores", { empresaId });
    },
    onSuccess: async (data) => {
      if (data.indicadores && data.indicadores.length > 0) {
        toast({
          title: "Indicadores Gerados!",
          description: `${data.indicadores.length} indicador(es) sugerido(s) pela IA.`,
        });
        
        // Criar indicadores automaticamente
        for (const ind of data.indicadores) {
          await criarIndicadorMutation.mutateAsync({
            empresaId,
            perspectiva: ind.perspectiva,
            nome: ind.nome,
            meta: ind.meta,
            atual: ind.atual,
            status: ind.status,
            owner: ind.owner,
          });
        }
      } else {
        toast({
          title: "Nenhum indicador novo",
          description: "Todos os indicadores sugeridos já existem ou são similares.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao gerar indicadores",
        description: "Não foi possível gerar indicadores com IA. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Criar indicador
  const criarIndicadorMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/indicadores", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicadores", empresaId] });
    },
  });

  // Deletar indicador
  const deletarIndicadorMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/indicadores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicadores", empresaId] });
      toast({
        title: "Indicador removido",
        description: "O indicador foi removido com sucesso.",
      });
    },
  });

  const handleCriarIndicador = async () => {
    if (!novoIndicador.perspectiva || !novoIndicador.nome || !novoIndicador.meta || !novoIndicador.owner) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    await criarIndicadorMutation.mutateAsync({
      empresaId,
      ...novoIndicador,
    });

    setNovoIndicador({
      perspectiva: "",
      nome: "",
      meta: "",
      atual: "",
      status: "amarelo",
      owner: "",
    });
    setIsDialogOpen(false);
    toast({
      title: "Indicador criado!",
      description: "Novo indicador adicionado com sucesso.",
    });
  };

  // Agrupar indicadores por perspectiva
  const indicadoresPorPerspectiva = PERSPECTIVAS.map((persp) => ({
    ...persp,
    kpis: indicadores.filter((ind) => ind.perspectiva === persp.value),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Indicadores de Desempenho"
        description="Acompanhe os principais indicadores do seu negócio organizados em 4 áreas: Finanças, Clientes, Processos e Pessoas."
        tooltip="Esta visão equilibrada ajuda você a monitorar não apenas os resultados financeiros, mas também o que está levando a esses resultados: satisfação dos clientes, eficiência dos processos e desenvolvimento da equipe."
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => gerarIndicadoresMutation.mutate()}
              disabled={gerarIndicadoresMutation.isPending}
              variant="outline"
              data-testid="button-gerar-indicadores"
            >
              {gerarIndicadoresMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar com IA
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-kpi">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Indicador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Indicador</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="perspectiva">Perspectiva</Label>
                    <Select
                      value={novoIndicador.perspectiva}
                      onValueChange={(value) => setNovoIndicador({ ...novoIndicador, perspectiva: value })}
                    >
                      <SelectTrigger data-testid="select-perspectiva">
                        <SelectValue placeholder="Selecione a perspectiva" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSPECTIVAS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nome">Nome do Indicador</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Margem de Lucro Líquido"
                      value={novoIndicador.nome}
                      onChange={(e) => setNovoIndicador({ ...novoIndicador, nome: e.target.value })}
                      data-testid="input-indicador-nome"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="meta">Meta</Label>
                      <Input
                        id="meta"
                        placeholder="Ex: 42%"
                        value={novoIndicador.meta}
                        onChange={(e) => setNovoIndicador({ ...novoIndicador, meta: e.target.value })}
                        data-testid="input-indicador-meta"
                      />
                    </div>
                    <div>
                      <Label htmlFor="atual">Valor Atual</Label>
                      <Input
                        id="atual"
                        placeholder="Ex: 38%"
                        value={novoIndicador.atual}
                        onChange={(e) => setNovoIndicador({ ...novoIndicador, atual: e.target.value })}
                        data-testid="input-indicador-atual"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="owner">Responsável</Label>
                    <Input
                      id="owner"
                      placeholder="Ex: CFO, Gerente Comercial"
                      value={novoIndicador.owner}
                      onChange={(e) => setNovoIndicador({ ...novoIndicador, owner: e.target.value })}
                      data-testid="input-indicador-owner"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={novoIndicador.status}
                      onValueChange={(value) => setNovoIndicador({ ...novoIndicador, status: value })}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verde">Verde (No alvo)</SelectItem>
                        <SelectItem value="amarelo">Amarelo (Atenção)</SelectItem>
                        <SelectItem value="vermelho">Vermelho (Crítico)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCriarIndicador}
                    className="w-full"
                    disabled={criarIndicadorMutation.isPending}
                    data-testid="button-criar-indicador"
                  >
                    {criarIndicadorMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Criar Indicador
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <ExampleCard>
        <strong>Finanças:</strong> Margem Bruta 42% (meta) | <strong>Clientes:</strong> Entregas no prazo 95% | <strong>Processos:</strong> Eficiência 75% | <strong>Pessoas:</strong> 40h treinamento/ano
      </ExampleCard>

      {indicadores.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum indicador criado</h3>
            <p className="text-sm text-muted-foreground">
              Comece gerando indicadores com IA baseados nas suas apostas estratégicas ou crie manualmente.
            </p>
            <Button
              onClick={() => gerarIndicadoresMutation.mutate()}
              disabled={gerarIndicadoresMutation.isPending}
              data-testid="button-gerar-indicadores-empty"
            >
              {gerarIndicadoresMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar Indicadores com IA
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {indicadoresPorPerspectiva.map((perspectiva) => {
            const Icon = perspectiva.icon;
            return (
              <Card
                key={perspectiva.nome}
                className="p-6"
                data-testid={`card-perspectiva-${perspectiva.nome.toLowerCase()}`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{perspectiva.nome}</h3>
                </div>

                {perspectiva.kpis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum indicador nesta perspectiva
                  </p>
                ) : (
                  <div className="space-y-4">
                    {perspectiva.kpis.map((kpi) => (
                      <div
                        key={kpi.id}
                        className="p-4 border rounded-lg hover-elevate"
                        data-testid={`card-kpi-${kpi.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-semibold mb-1">{kpi.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              Owner: {kpi.owner}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <SemaphoreBadge status={kpi.status as "verde" | "amarelo" | "vermelho"} />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletarIndicadorMutation.mutate(kpi.id)}
                              data-testid={`button-delete-kpi-${kpi.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Meta: </span>
                            <span className="font-mono font-semibold">{kpi.meta}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Atual: </span>
                            <span className="font-mono font-bold text-foreground">{kpi.atual}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

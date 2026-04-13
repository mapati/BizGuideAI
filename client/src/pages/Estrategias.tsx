import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { Target, Plus, Sparkles, Trash2, Pencil, ArrowUpRight, Shield, TrendingUp, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";

interface Estrategia {
  id: string;
  empresaId: string;
  tipo: "FO" | "FA" | "DO" | "DA";
  titulo: string;
  descricao: string;
  prioridade: "alta" | "média" | "baixa";
}

const PrioridadeBadge = ({ prioridade }: { prioridade: "alta" | "média" | "baixa" }) => {
  const variants = {
    alta: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    média: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    baixa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Badge className={variants[prioridade]} data-testid={`badge-prioridade-${prioridade}`}>
      {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
    </Badge>
  );
};

const TipoIcon = ({ tipo }: { tipo: string }) => {
  const icons = {
    FO: <ArrowUpRight className="h-5 w-5 text-green-600" />,
    FA: <Shield className="h-5 w-5 text-blue-600" />,
    DO: <TrendingUp className="h-5 w-5 text-purple-600" />,
    DA: <AlertCircle className="h-5 w-5 text-orange-600" />,
  };
  return icons[tipo as keyof typeof icons] || null;
};

export default function Estrategias() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "",
    titulo: "",
    descricao: "",
    prioridade: "média" as const,
  });

  const tipos = [
    { 
      value: "FO", 
      label: "FO - Ofensiva", 
      desc: "Força + Oportunidade (Crescimento)",
      fullDesc: "Combine uma força interna com uma oportunidade externa para crescer"
    },
    { 
      value: "FA", 
      label: "FA - Confronto", 
      desc: "Força + Ameaça (Proteção)",
      fullDesc: "Use uma força interna para neutralizar ou reduzir uma ameaça externa"
    },
    { 
      value: "DO", 
      label: "DO - Reorientação", 
      desc: "Fraqueza + Oportunidade (Melhoria)",
      fullDesc: "Supere uma fraqueza interna aproveitando uma oportunidade externa"
    },
    { 
      value: "DA", 
      label: "DA - Defensiva", 
      desc: "Fraqueza + Ameaça (Sobrevivência)",
      fullDesc: "Minimize uma fraqueza interna para evitar uma ameaça externa"
    },
  ];

  const { data: empresa } = useQuery({
    queryKey: ["/api/empresa"],
  });

  const { data: estrategias = [], isLoading } = useQuery<Estrategia[]>({
    queryKey: ["/api/estrategias", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: swotItens = [] } = useQuery<any[]>({
    queryKey: ["/api/analise-swot", empresa?.id],
    enabled: !!empresa?.id,
  });

  const criarEstrategiaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/estrategias", { ...data, empresaId: empresa.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa?.id] });
      toast({
        title: "Estratégia adicionada!",
        description: "A estratégia foi salva com sucesso.",
      });
      setFormData({ tipo: "", titulo: "", descricao: "", prioridade: "média" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar estratégia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editarEstrategiaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/estrategias/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa?.id] });
      toast({
        title: "Estratégia atualizada!",
        description: "A estratégia foi atualizada com sucesso.",
      });
      setFormData({ tipo: "", titulo: "", descricao: "", prioridade: "média" });
      setEditandoId(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar estratégia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarEstrategiaMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/estrategias/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa?.id] });
      toast({
        title: "Estratégia removida",
        description: "A estratégia foi excluída.",
      });
    },
  });

  const handleSaveEstrategia = () => {
    if (!formData.tipo || !formData.titulo || !formData.descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    if (editandoId) {
      editarEstrategiaMutation.mutate({ id: editandoId, data: formData });
    } else {
      criarEstrategiaMutation.mutate(formData);
    }
  };

  const handleEditEstrategia = (estrategia: Estrategia) => {
    setEditandoId(estrategia.id);
    setFormData({
      tipo: estrategia.tipo,
      titulo: estrategia.titulo,
      descricao: estrategia.descricao,
      prioridade: estrategia.prioridade,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditandoId(null);
      setFormData({ tipo: "", titulo: "", descricao: "", prioridade: "média" });
    }
  };

  const handleGenerateStrategies = async () => {
    if (!empresa) {
      toast({
        title: "Perfil não encontrado",
        description: "Complete o perfil da empresa primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/gerar-estrategias", {
        empresaId: empresa.id,
      });

      if (response.estrategias && response.estrategias.length > 0) {
        let adicionadas = 0;
        for (const estrategia of response.estrategias) {
          try {
            await apiRequest("POST", "/api/estrategias", {
              ...estrategia,
              empresaId: empresa.id,
            });
            adicionadas++;
          } catch (err: any) {
            console.error(`Erro ao salvar estratégia ${estrategia.tipo}:`, err);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa.id] });
        
        if (adicionadas > 0) {
          toast({
            title: "Estratégias geradas!",
            description: `${adicionadas} ${adicionadas === 1 ? 'nova estratégia foi adicionada' : 'novas estratégias foram adicionadas'}.`,
          });
        } else {
          toast({
            title: "Erro ao salvar",
            description: "Não foi possível salvar as estratégias sugeridas.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar estratégias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const agruparPorTipo = () => {
    return {
      FO: estrategias.filter((e) => e.tipo === "FO"),
      FA: estrategias.filter((e) => e.tipo === "FA"),
      DO: estrategias.filter((e) => e.tipo === "DO"),
      DA: estrategias.filter((e) => e.tipo === "DA"),
    };
  };

  if (!empresa) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Complete seu perfil primeiro</h2>
          <p className="text-muted-foreground mb-6">
            Para criar estratégias, você precisa completar o perfil da sua empresa e a análise SWOT.
          </p>
          <Button onClick={() => window.location.href = "/onboarding"} data-testid="button-ir-onboarding">
            Ir para Onboarding
          </Button>
        </Card>
      </div>
    );
  }

  const grupos = agruparPorTipo();
  const semSwot = empresa && swotItens.length < 4;

  return (
    <div className="max-w-6xl mx-auto">
      {semSwot && (
        <PrerequisiteWarning
          titulo="Recomendado: complete a análise SWOT antes de criar estratégias"
          descricao="A Matriz TOWS combina forças, fraquezas, oportunidades e ameaças. Ter pelo menos 4 itens no SWOT enriquece muito as estratégias geradas pela IA."
          linkLabel="Ir para SWOT"
          linkHref="/swot"
          variante="info"
        />
      )}
      <PageHeader
        title="Estratégias (Matriz TOWS)"
        description="Combine forças, fraquezas, oportunidades e ameaças para criar estratégias práticas e acionáveis."
        tooltip="A Matriz TOWS (SWOT Cruzada) ajuda a criar estratégias combinando elementos internos e externos identificados na análise SWOT."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateStrategies}
              disabled={isGenerating}
              data-testid="button-generate-strategies"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-estrategia">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Estratégia
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editandoId ? "Editar Estratégia" : "Nova Estratégia"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="tipo">Tipo de Estratégia (Matriz TOWS)</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger data-testid="select-tipo-estrategia">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label} - {tipo.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.tipo && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {tipos.find(t => t.value === formData.tipo)?.fullDesc}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="titulo">Título da Estratégia</Label>
                    <Input
                      id="titulo"
                      placeholder="Ex: Expandir para mercado internacional usando experiência técnica"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      data-testid="input-titulo-estrategia"
                    />
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição Detalhada</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Descreva como essa estratégia será implementada, quais recursos serão necessários e qual o resultado esperado"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="min-h-[100px]"
                      data-testid="textarea-descricao-estrategia"
                    />
                  </div>

                  <div>
                    <Label htmlFor="prioridade">Nível de Prioridade</Label>
                    <Select value={formData.prioridade} onValueChange={(value: any) => setFormData({ ...formData, prioridade: value })}>
                      <SelectTrigger data-testid="select-prioridade-estrategia">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="média">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleCloseDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEstrategia}
                    disabled={criarEstrategiaMutation.isPending || editarEstrategiaMutation.isPending}
                    data-testid="button-salvar-estrategia"
                  >
                    {editandoId ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <ExampleCard>
        <strong>FO (Ofensiva):</strong> Use nossa equipe técnica experiente para atender a crescente demanda por soluções digitais no mercado. <strong>Prioridade: Alta</strong>
      </ExampleCard>

      {isLoading ? (
        <Card className="mt-6 p-8">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </Card>
      ) : estrategias.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<Target className="h-16 w-16" />}
            title="Nenhuma estratégia criada ainda"
            description="Gere estratégias automaticamente com IA ou crie manualmente combinando elementos da sua análise SWOT."
            actionLabel="Gerar com IA"
            onAction={handleGenerateStrategies}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {[
            { tipo: "FO", label: "Ofensivas (FO)", items: grupos.FO, color: "green", desc: "Força + Oportunidade" },
            { tipo: "FA", label: "Confronto (FA)", items: grupos.FA, color: "blue", desc: "Força + Ameaça" },
            { tipo: "DO", label: "Reorientação (DO)", items: grupos.DO, color: "purple", desc: "Fraqueza + Oportunidade" },
            { tipo: "DA", label: "Defensivas (DA)", items: grupos.DA, color: "orange", desc: "Fraqueza + Ameaça" },
          ].map((grupo) => (
            <Card key={grupo.tipo} className="p-6" data-testid={`card-grupo-${grupo.tipo}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TipoIcon tipo={grupo.tipo} />
                  <div>
                    <h3 className="text-lg font-semibold">{grupo.label}</h3>
                    <p className="text-xs text-muted-foreground">{grupo.desc}</p>
                  </div>
                  <Badge variant="outline">{grupo.items.length}</Badge>
                </div>
              </div>
              <div className="space-y-3">
                {grupo.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma estratégia {grupo.label.toLowerCase()} ainda
                  </p>
                ) : (
                  grupo.items.map((item) => (
                    <Card key={item.id} className="p-4 hover-elevate" data-testid={`estrategia-${item.id}`}>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-medium text-sm flex-1">{item.titulo}</h4>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEstrategia(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletarEstrategiaMutation.mutate(item.id)}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.descricao}</p>
                      <PrioridadeBadge prioridade={item.prioridade} />
                    </Card>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

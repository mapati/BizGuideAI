import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { Target, Plus, Sparkles, Trash2, TrendingUp, TrendingDown, AlertTriangle, Zap, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AnaliseSwot {
  id: string;
  empresaId: string;
  tipo: "forca" | "fraqueza" | "oportunidade" | "ameaca";
  descricao: string;
  impacto: "alto" | "médio" | "baixo";
}

const ImpactBadge = ({ impact }: { impact: "alto" | "médio" | "baixo" }) => {
  const variants = {
    alto: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    médio: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    baixo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Badge className={variants[impact]} data-testid={`badge-impacto-${impact}`}>
      {impact.charAt(0).toUpperCase() + impact.slice(1)}
    </Badge>
  );
};

const SwotIcon = ({ tipo }: { tipo: string }) => {
  const icons = {
    forca: <TrendingUp className="h-5 w-5 text-green-600" />,
    fraqueza: <TrendingDown className="h-5 w-5 text-red-600" />,
    oportunidade: <Zap className="h-5 w-5 text-blue-600" />,
    ameaca: <AlertTriangle className="h-5 w-5 text-orange-600" />,
  };
  return icons[tipo as keyof typeof icons] || null;
};

export default function Swot() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSuggestingComplete, setIsSuggestingComplete] = useState(false);
  const [isSuggestingModal, setIsSuggestingModal] = useState(false);
  const [tipoSugestao, setTipoSugestao] = useState<"forca" | "fraqueza" | "oportunidade" | "ameaca" | null>(null);
  const [formData, setFormData] = useState({
    tipo: "",
    descricao: "",
    impacto: "médio" as const,
  });

  const tipos = [
    { value: "forca", label: "Força", desc: "Algo que sua empresa faz bem" },
    { value: "fraqueza", label: "Fraqueza", desc: "Algo que precisa melhorar" },
    { value: "oportunidade", label: "Oportunidade", desc: "Possibilidade externa favorável" },
    { value: "ameaca", label: "Ameaça", desc: "Risco externo ao negócio" },
  ];

  const { data: empresa } = useQuery({
    queryKey: ["/api/empresa"],
  });

  const { data: analises = [], isLoading } = useQuery<AnaliseSwot[]>({
    queryKey: ["/api/analise-swot", empresa?.id],
    enabled: !!empresa?.id,
  });

  const criarAnaliseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/analise-swot", { ...data, empresaId: empresa.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa?.id] });
      toast({
        title: "Item adicionado!",
        description: "A análise foi salva com sucesso.",
      });
      setFormData({ tipo: "", descricao: "", impacto: "médio" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editarAnaliseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/analise-swot/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa?.id] });
      toast({
        title: "Item atualizado!",
        description: "A análise foi atualizada com sucesso.",
      });
      setFormData({ tipo: "", descricao: "", impacto: "médio" });
      setEditandoId(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarAnaliseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/analise-swot/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa?.id] });
      toast({
        title: "Item removido",
        description: "A análise foi excluída.",
      });
    },
  });

  const handleSaveAnalise = () => {
    if (!formData.tipo || !formData.descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    if (editandoId) {
      editarAnaliseMutation.mutate({ id: editandoId, data: formData });
    } else {
      criarAnaliseMutation.mutate(formData);
    }
  };

  const handleEditAnalise = (analise: AnaliseSwot) => {
    setEditandoId(analise.id);
    setFormData({
      tipo: analise.tipo,
      descricao: analise.descricao,
      impacto: analise.impacto,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditandoId(null);
      setFormData({ tipo: "", descricao: "", impacto: "médio" });
    }
  };

  const handleSuggest = async (tipo: "forca" | "fraqueza" | "oportunidade" | "ameaca") => {
    if (!empresa) {
      toast({
        title: "Perfil não encontrado",
        description: "Complete o perfil da empresa primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsSuggesting(true);
    setTipoSugestao(tipo);
    try {
      const response = await apiRequest("POST", "/api/ai/sugerir-swot", {
        nomeEmpresa: empresa.nome,
        setor: empresa.setor,
        descricao: empresa.descricao,
        tipo: tipo,
      });

      const sugestoes = response.itens || [];
      
      for (const sugestao of sugestoes) {
        await apiRequest("POST", "/api/analise-swot", {
          ...sugestao,
          tipo: tipo,
          empresaId: empresa.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa.id] });
      toast({
        title: "Sugestões adicionadas!",
        description: `${sugestoes.length} itens foram sugeridos pela IA.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar sugestões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSuggesting(false);
      setTipoSugestao(null);
    }
  };

  const handleSuggestModal = async () => {
    if (!empresa) {
      toast({
        title: "Perfil não encontrado",
        description: "Complete o perfil da empresa primeiro.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tipo) {
      toast({
        title: "Tipo não selecionado",
        description: "Selecione o tipo de análise primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsSuggestingModal(true);
    try {
      const response = await apiRequest("POST", "/api/ai/sugerir-swot-individual", {
        empresaId: empresa.id,
        tipo: formData.tipo,
      });

      if (response.descricao) {
        setFormData(prev => ({
          ...prev,
          descricao: response.descricao,
          impacto: response.impacto || "médio",
        }));
        
        toast({
          title: "Sugestão gerada!",
          description: "Revise o texto e ajuste se necessário antes de salvar.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar sugestão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSuggestingModal(false);
    }
  };

  const handleSuggestComplete = async () => {
    if (!empresa) {
      toast({
        title: "Perfil não encontrado",
        description: "Complete o perfil da empresa primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsSuggestingComplete(true);
    try {
      const response = await apiRequest("POST", "/api/ai/sugerir-swot-completo", {
        empresaId: empresa.id,
      });

      const itens = response.itens || [];
      
      if (itens.length !== 4) {
        throw new Error("A IA deve gerar exatamente 4 itens (1 de cada tipo)");
      }

      const tiposEsperados = ["forca", "fraqueza", "oportunidade", "ameaca"];
      const tiposRecebidos = itens.map((i: any) => i.tipo);
      const tiposValidos = tiposEsperados.every(tipo => tiposRecebidos.includes(tipo));
      
      if (!tiposValidos) {
        throw new Error("A IA deve gerar 1 item de cada tipo (força, fraqueza, oportunidade, ameaça)");
      }

      const analiseExistente = analises.map(a => a.descricao.toLowerCase().trim());
      const itensNaoduplicados = itens.filter((item: any) => 
        !analiseExistente.includes(item.descricao.toLowerCase().trim())
      );

      if (itensNaoduplicados.length === 0) {
        toast({
          title: "Nenhum item novo",
          description: "Todos os itens sugeridos pela IA já existem na análise.",
          variant: "destructive",
        });
        return;
      }

      let adicionados = 0;
      for (const item of itensNaoduplicados) {
        try {
          await apiRequest("POST", "/api/analise-swot", {
            ...item,
            empresaId: empresa.id,
          });
          adicionados++;
        } catch (err: any) {
          console.error(`Erro ao salvar item ${item.tipo}:`, err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa.id] });
      
      if (adicionados > 0) {
        toast({
          title: "Análise gerada com sucesso!",
          description: `${adicionados} ${adicionados === 1 ? 'novo item foi adicionado' : 'novos itens foram adicionados'}.`,
        });
      } else {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar os itens sugeridos.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar análise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSuggestingComplete(false);
    }
  };

  const agruparPorTipo = () => {
    return {
      forca: analises.filter((a) => a.tipo === "forca"),
      fraqueza: analises.filter((a) => a.tipo === "fraqueza"),
      oportunidade: analises.filter((a) => a.tipo === "oportunidade"),
      ameaca: analises.filter((a) => a.tipo === "ameaca"),
    };
  };

  if (!empresa) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Complete seu perfil primeiro</h2>
          <p className="text-muted-foreground mb-6">
            Para começar a análise de forças e fraquezas, você precisa completar o perfil da sua empresa.
          </p>
          <Button onClick={() => window.location.href = "/onboarding"} data-testid="button-ir-onboarding">
            Ir para Onboarding
          </Button>
        </Card>
      </div>
    );
  }

  const grupos = agruparPorTipo();

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Forças e Fraquezas"
        description="Identifique o que sua empresa faz bem (forças), o que precisa melhorar (fraquezas), oportunidades externas e ameaças que você enfrenta."
        tooltip="Esta análise ajuda a entender seus pontos fortes internos e fracos, além das oportunidades e riscos do mercado."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSuggestComplete}
              disabled={isSuggestingComplete || isSuggesting}
              data-testid="button-suggest-complete"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSuggestingComplete ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-analise">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editandoId ? "Editar Análise" : "Nova Análise"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="tipo">Tipo de Análise</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger data-testid="select-tipo-analise">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestModal}
                      disabled={isSuggestingModal}
                      className="mt-2 w-full"
                      data-testid="button-suggest-modal"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isSuggestingModal ? "Gerando sugestão..." : "Gerar com IA"}
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descreva de forma clara e objetiva"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="min-h-[100px]"
                    data-testid="textarea-descricao-analise"
                  />
                </div>

                <div>
                  <Label htmlFor="impacto">Nível de Impacto</Label>
                  <Select value={formData.impacto} onValueChange={(value: any) => setFormData({ ...formData, impacto: value })}>
                    <SelectTrigger data-testid="select-impacto-analise">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="médio">Médio</SelectItem>
                      <SelectItem value="baixo">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleCloseDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAnalise}
                  disabled={criarAnaliseMutation.isPending || editarAnaliseMutation.isPending}
                  data-testid="button-salvar-analise"
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
        <strong>Força:</strong> Temos uma equipe técnica altamente qualificada com 15 anos de experiência média. <strong>Impacto: Alto</strong>
      </ExampleCard>

      {isLoading ? (
        <Card className="mt-6 p-8">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </Card>
      ) : analises.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<Target className="h-16 w-16" />}
            title="Nenhuma análise realizada ainda"
            description="Comece identificando forças, fraquezas, oportunidades e ameaças do seu negócio."
            actionLabel="Adicionar Primeiro Item"
            onAction={() => setIsDialogOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {[
            { tipo: "forca", label: "Forças", items: grupos.forca, color: "green" },
            { tipo: "fraqueza", label: "Fraquezas", items: grupos.fraqueza, color: "red" },
            { tipo: "oportunidade", label: "Oportunidades", items: grupos.oportunidade, color: "blue" },
            { tipo: "ameaca", label: "Ameaças", items: grupos.ameaca, color: "orange" },
          ].map((grupo) => (
            <Card key={grupo.tipo} className="p-6" data-testid={`card-grupo-${grupo.tipo}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <SwotIcon tipo={grupo.tipo} />
                  <h3 className="text-lg font-semibold">{grupo.label}</h3>
                  <Badge variant="outline">{grupo.items.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggest(grupo.tipo as any)}
                  disabled={isSuggesting}
                  data-testid={`button-suggest-${grupo.tipo}`}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {isSuggesting && tipoSugestao === grupo.tipo ? "..." : "IA"}
                </Button>
              </div>
              <div className="space-y-3">
                {grupo.items.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Nenhum item adicionado ainda
                  </div>
                ) : (
                  grupo.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg hover-elevate group"
                      data-testid={`item-analise-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1">{item.descricao}</p>
                        <div className="flex items-center gap-2">
                          <ImpactBadge impact={item.impacto} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditAnalise(item)}
                            data-testid={`button-edit-analise-${item.id}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deletarAnaliseMutation.mutate(item.id)}
                            data-testid={`button-delete-analise-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
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

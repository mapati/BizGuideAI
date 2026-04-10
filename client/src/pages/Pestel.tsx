import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { Compass, Plus, Sparkles, Trash2, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FatorPESTEL {
  id: string;
  empresaId: string;
  tipo: string;
  descricao: string;
  impacto: "alto" | "médio" | "baixo";
  evidencia: string;
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

export default function Pestel() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "",
    descricao: "",
    impacto: "médio" as const,
    evidencia: "",
  });

  const tipos = [
    { value: "politico", label: "Político (leis, regulamentos)" },
    { value: "economico", label: "Econômico (custos, câmbio)" },
    { value: "social", label: "Social (comportamentos, valores)" },
    { value: "tecnologico", label: "Tecnológico (inovações)" },
    { value: "ambiental", label: "Ambiental (sustentabilidade)" },
    { value: "legal", label: "Legal (normas, certificações)" },
  ];

  const { data: empresa } = useQuery({
    queryKey: ["/api/empresa"],
  });

  const { data: fatores = [], isLoading } = useQuery<FatorPESTEL[]>({
    queryKey: ["/api/fatores-pestel", empresa?.id],
    enabled: !!empresa?.id,
  });

  const criarFatorMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/fatores-pestel", { ...data, empresaId: empresa.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fatores-pestel", empresa?.id] });
      toast({
        title: "Fator adicionado!",
        description: "O fator externo foi salvo com sucesso.",
      });
      setFormData({ tipo: "", descricao: "", impacto: "médio", evidencia: "" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar fator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editarFatorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/fatores-pestel/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fatores-pestel", empresa?.id] });
      toast({
        title: "Fator atualizado!",
        description: "O fator externo foi atualizado com sucesso.",
      });
      setFormData({ tipo: "", descricao: "", impacto: "médio", evidencia: "" });
      setEditandoId(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar fator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarFatorMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/fatores-pestel/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fatores-pestel", empresa?.id] });
      toast({
        title: "Fator removido",
        description: "O fator externo foi excluído.",
      });
    },
  });

  const handleSaveFator = () => {
    if (!formData.tipo || !formData.descricao || !formData.evidencia) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    if (editandoId) {
      editarFatorMutation.mutate({ id: editandoId, data: formData });
    } else {
      criarFatorMutation.mutate(formData);
    }
  };

  const handleEditFator = (fator: FatorPESTEL) => {
    setEditandoId(fator.id);
    setFormData({
      tipo: fator.tipo,
      descricao: fator.descricao,
      impacto: fator.impacto,
      evidencia: fator.evidencia,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditandoId(null);
    setFormData({ tipo: "", descricao: "", impacto: "médio", evidencia: "" });
  };

  const handleSuggest = async () => {
    if (!empresa) {
      toast({
        title: "Perfil não encontrado",
        description: "Complete o perfil da empresa primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsSuggesting(true);
    try {
      const response = await apiRequest("POST", "/api/ai/sugerir-pestel", {
        nomeEmpresa: empresa.nome,
        setor: empresa.setor,
        descricao: empresa.descricao,
      });

      const sugestoes = response.fatores || [];
      
      for (const sugestao of sugestoes) {
        await apiRequest("POST", "/api/fatores-pestel", {
          ...sugestao,
          empresaId: empresa.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/fatores-pestel", empresa.id] });
      toast({
        title: "Sugestões adicionadas!",
        description: `${sugestoes.length} fatores foram sugeridos pela IA.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar sugestões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  if (!empresa) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Complete seu perfil primeiro</h2>
          <p className="text-muted-foreground mb-6">
            Para começar a análise do cenário externo, você precisa completar o perfil da sua empresa.
          </p>
          <Button onClick={() => window.location.href = "/onboarding"} data-testid="button-ir-onboarding">
            Ir para Onboarding
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Cenário Externo"
        description="Identifique os principais fatores externos que impactam seu negócio: mudanças políticas, econômicas, sociais, tecnológicas, ambientais e legais."
        tooltip="Esta análise ajuda você a entender o ambiente ao redor da sua empresa e se preparar para mudanças importantes que podem afetar seus resultados."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSuggest}
              disabled={isSuggesting || !empresa}
              data-testid="button-suggest-pestel"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSuggesting ? "Gerando..." : "Sugerir Fatores"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-fator">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Fator
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editandoId ? "Editar Fator Externo" : "Novo Fator Externo"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="tipo">Tipo de Fator</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger data-testid="select-tipo-fator">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descreva o fator</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Ex: Novas leis ambientais vão exigir redução de emissões"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      data-testid="textarea-descricao-fator"
                    />
                  </div>

                  <div>
                    <Label htmlFor="impacto">Qual o impacto no seu negócio?</Label>
                    <Select value={formData.impacto} onValueChange={(value: any) => setFormData({ ...formData, impacto: value })}>
                      <SelectTrigger data-testid="select-impacto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alto">Alto</SelectItem>
                        <SelectItem value="médio">Médio</SelectItem>
                        <SelectItem value="baixo">Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="evidencia">Por que isso é importante?</Label>
                    <Textarea
                      id="evidencia"
                      placeholder="Explique o que justifica este fator e por que ele merece atenção"
                      value={formData.evidencia}
                      onChange={(e) => setFormData({ ...formData, evidencia: e.target.value })}
                      data-testid="textarea-evidencia"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveFator}
                    disabled={criarFatorMutation.isPending || editarFatorMutation.isPending}
                    data-testid="button-salvar-fator"
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
        <strong>Econômico:</strong> O dólar subiu muito e isso está aumentando nosso custo de matéria-prima importada. Se não conseguirmos repassar esse aumento, nossa margem pode cair 3-5%. <strong>Impacto: Alto</strong>
      </ExampleCard>

      {isLoading ? (
        <Card className="mt-6 p-8">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </Card>
      ) : fatores.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<Compass className="h-16 w-16" />}
            title="Nenhum fator externo identificado ainda"
            description="Adicione fatores externos que podem afetar seu negócio ou peça sugestões para a IA baseadas no perfil da sua empresa."
            actionLabel="Adicionar Primeiro Fator"
            onAction={() => setIsDialogOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {fatores.map((fator) => (
            <Card key={fator.id} className="p-6 hover-elevate" data-testid={`card-fator-${fator.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {tipos.find((t) => t.value === fator.tipo)?.label}
                </div>
                <div className="flex items-center gap-2">
                  <ImpactBadge impact={fator.impacto} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditFator(fator)}
                    data-testid={`button-edit-fator-${fator.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletarFatorMutation.mutate(fator.id)}
                    data-testid={`button-delete-fator-${fator.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm mb-3">{fator.descricao}</p>
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
                <strong>Por que é importante:</strong> {fator.evidencia}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

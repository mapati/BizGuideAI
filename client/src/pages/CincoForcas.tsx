import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { Layers, Plus, Sparkles, Trash2, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CincoForcas {
  id: string;
  empresaId: string;
  forca: string;
  descricao: string;
  intensidade: "alta" | "média" | "baixa";
  impacto: string;
}

const IntensidadeBadge = ({ intensidade }: { intensidade: "alta" | "média" | "baixa" }) => {
  const variants = {
    alta: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    média: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    baixa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Badge className={variants[intensidade]} data-testid={`badge-intensidade-${intensidade}`}>
      {intensidade.charAt(0).toUpperCase() + intensidade.slice(1)}
    </Badge>
  );
};

export default function CincoForcas() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [formData, setFormData] = useState({
    forca: "",
    descricao: "",
    intensidade: "média" as const,
    impacto: "",
  });

  const forcas = [
    { value: "rivalidade_concorrentes", label: "Rivalidade entre Concorrentes" },
    { value: "poder_fornecedores", label: "Poder dos Fornecedores" },
    { value: "poder_clientes", label: "Poder dos Clientes" },
    { value: "ameaca_novos_entrantes", label: "Ameaça de Novos Entrantes" },
    { value: "ameaca_substitutos", label: "Ameaça de Substitutos" },
  ];

  const { data: empresa } = useQuery({
    queryKey: ["/api/empresa"],
  });

  const { data: forcasData = [], isLoading } = useQuery<CincoForcas[]>({
    queryKey: ["/api/cinco-forcas", empresa?.id],
    enabled: !!empresa?.id,
  });

  const criarForcaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/cinco-forcas", { ...data, empresaId: empresa.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cinco-forcas", empresa?.id] });
      toast({
        title: "Força adicionada!",
        description: "A análise da força competitiva foi salva com sucesso.",
      });
      setFormData({ forca: "", descricao: "", intensidade: "média", impacto: "" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar força",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editarForcaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/cinco-forcas/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cinco-forcas", empresa?.id] });
      toast({
        title: "Força atualizada!",
        description: "A análise foi atualizada com sucesso.",
      });
      setFormData({ forca: "", descricao: "", intensidade: "média", impacto: "" });
      setEditandoId(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar força",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarForcaMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/cinco-forcas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cinco-forcas", empresa?.id] });
      toast({
        title: "Força removida",
        description: "A análise foi excluída.",
      });
    },
  });

  const handleSaveForca = () => {
    if (!formData.forca || !formData.descricao || !formData.impacto) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    if (editandoId) {
      editarForcaMutation.mutate({ id: editandoId, data: formData });
    } else {
      criarForcaMutation.mutate(formData);
    }
  };

  const handleEditForca = (forca: CincoForcas) => {
    setEditandoId(forca.id);
    setFormData({
      forca: forca.forca,
      descricao: forca.descricao,
      intensidade: forca.intensidade,
      impacto: forca.impacto,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditandoId(null);
    setFormData({ forca: "", descricao: "", intensidade: "média", impacto: "" });
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
      const response = await apiRequest("POST", "/api/ai/sugerir-cinco-forcas", {
        nomeEmpresa: empresa.nome,
        setor: empresa.setor,
        descricao: empresa.descricao,
      });

      const sugestoes = response.forcas || [];
      
      for (const sugestao of sugestoes) {
        await apiRequest("POST", "/api/cinco-forcas", {
          ...sugestao,
          empresaId: empresa.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/cinco-forcas", empresa.id] });
      toast({
        title: "Sugestões adicionadas!",
        description: `${sugestoes.length} análises foram sugeridas pela IA.`,
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
            Para começar a análise de mercado, você precisa completar o perfil da sua empresa.
          </p>
          <Button onClick={() => window.location.href = "/onboarding"} data-testid="button-ir-onboarding">
            Ir para Onboarding
          </Button>
        </Card>
      </div>
    );
  }

  const getForcaLabel = (forca: string) => {
    const forcaObj = forcas.find(f => f.value === forca);
    return forcaObj?.label || forca;
  };

  return (
    <div>
      <PageHeader
        title="Mercado e Concorrência"
        description="Entenda as forças que moldam a competição no seu mercado: concorrentes, fornecedores, clientes, novos entrantes e substitutos."
        tooltip="Esta análise ajuda você a identificar as principais pressões competitivas que afetam seu negócio e onde você tem mais ou menos poder de negociação."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSuggest}
              disabled={isSuggesting}
              data-testid="button-suggest-forcas"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSuggesting ? "Analisando..." : "Sugerir com IA"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleCloseDialog()} data-testid="button-add-forca">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Análise
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editandoId ? "Editar Análise" : "Nova Análise de Força Competitiva"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="forca">Força Competitiva</Label>
                    <Select
                      value={formData.forca}
                      onValueChange={(value) => setFormData({ ...formData, forca: value })}
                    >
                      <SelectTrigger data-testid="select-forca">
                        <SelectValue placeholder="Selecione a força" />
                      </SelectTrigger>
                      <SelectContent>
                        {forcas.map((forca) => (
                          <SelectItem key={forca.value} value={forca.value} data-testid={`select-item-${forca.value}`}>
                            {forca.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição da Situação</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Como esta força se manifesta no seu mercado?"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="min-h-[100px]"
                      data-testid="textarea-descricao"
                    />
                  </div>

                  <div>
                    <Label htmlFor="intensidade">Intensidade</Label>
                    <Select
                      value={formData.intensidade}
                      onValueChange={(value: "alta" | "média" | "baixa") =>
                        setFormData({ ...formData, intensidade: value })
                      }
                    >
                      <SelectTrigger data-testid="select-intensidade">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa" data-testid="select-item-baixa">Baixa</SelectItem>
                        <SelectItem value="média" data-testid="select-item-media">Média</SelectItem>
                        <SelectItem value="alta" data-testid="select-item-alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="impacto">Impacto no Negócio</Label>
                    <Textarea
                      id="impacto"
                      placeholder="Como esta força afeta seu negócio?"
                      value={formData.impacto}
                      onChange={(e) => setFormData({ ...formData, impacto: e.target.value })}
                      className="min-h-[100px]"
                      data-testid="textarea-impacto"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveForca} data-testid="button-save">
                    {editandoId ? "Atualizar" : "Adicionar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <ExampleCard>
        <strong>Rivalidade:</strong> Alta - Muitos concorrentes locais | <strong>Fornecedores:</strong> Média - Poucos fornecedores de matéria-prima | <strong>Clientes:</strong> Alta - Clientes exigentes e bem informados
      </ExampleCard>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando análises...</p>
        </div>
      ) : forcasData.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-16 w-16" />}
          title="Nenhuma análise ainda"
          description="Comece analisando as forças competitivas do seu mercado. A IA pode sugerir análises baseadas no perfil da sua empresa."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 mt-6">
          {forcasData.map((forca) => (
            <Card key={forca.id} className="p-6" data-testid={`card-forca-${forca.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold" data-testid={`text-forca-titulo-${forca.id}`}>
                      {getForcaLabel(forca.forca)}
                    </h3>
                    <IntensidadeBadge intensidade={forca.intensidade} />
                  </div>
                  <p className="text-muted-foreground mb-3" data-testid={`text-forca-descricao-${forca.id}`}>
                    {forca.descricao}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditForca(forca)}
                    data-testid={`button-edit-${forca.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletarForcaMutation.mutate(forca.id)}
                    data-testid={`button-delete-${forca.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
                <strong>Impacto no negócio:</strong> {forca.impacto}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

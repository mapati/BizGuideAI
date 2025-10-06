import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { LayoutGrid, Plus, Sparkles, Trash2, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Empresa {
  id: string;
  nome: string;
  setor: string;
  tamanho: string;
  descricao?: string;
}

interface ModeloNegocio {
  id: string;
  empresaId: string;
  bloco: string;
  descricao: string;
}

export default function ModeloNegocio() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [formData, setFormData] = useState({
    bloco: "",
    descricao: "",
  });

  const blocos = [
    { value: "segmentos_clientes", label: "Segmentos de Clientes", description: "Quem são seus clientes?" },
    { value: "proposta_valor", label: "Proposta de Valor", description: "O que você oferece?" },
    { value: "canais", label: "Canais", description: "Como entrega valor?" },
    { value: "relacionamento_clientes", label: "Relacionamento com Clientes", description: "Como se relaciona?" },
    { value: "fontes_receita", label: "Fontes de Receita", description: "Como ganha dinheiro?" },
    { value: "recursos_principais", label: "Recursos Principais", description: "O que você precisa ter?" },
    { value: "atividades_principais", label: "Atividades Principais", description: "O que você precisa fazer?" },
    { value: "parcerias_principais", label: "Parcerias Principais", description: "Quem te ajuda?" },
    { value: "estrutura_custos", label: "Estrutura de Custos", description: "Quais são os custos?" },
  ];

  const { data: empresa } = useQuery<Empresa>({
    queryKey: ["/api/empresa"],
  });

  const { data: blocosData = [], isLoading } = useQuery<ModeloNegocio[]>({
    queryKey: [`/api/modelo-negocio/${empresa?.id}`],
    enabled: !!empresa?.id,
  });

  const criarBlocoMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      const res = await apiRequest("POST", "/api/modelo-negocio", { ...data, empresaId: empresa.id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/modelo-negocio/${empresa?.id}`] });
      toast({
        title: "Bloco adicionado!",
        description: "O bloco do modelo de negócio foi salvo com sucesso.",
      });
      setFormData({ bloco: "", descricao: "" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar bloco",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editarBlocoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await apiRequest("PATCH", `/api/modelo-negocio/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/modelo-negocio/${empresa?.id}`] });
      toast({
        title: "Bloco atualizado!",
        description: "O bloco foi atualizado com sucesso.",
      });
      setFormData({ bloco: "", descricao: "" });
      setEditandoId(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar bloco",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarBlocoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/modelo-negocio/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/modelo-negocio/${empresa?.id}`] });
      toast({
        title: "Bloco removido",
        description: "O bloco foi excluído.",
      });
    },
  });

  const handleSaveBloco = () => {
    if (!formData.bloco || !formData.descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    if (editandoId) {
      editarBlocoMutation.mutate({ id: editandoId, data: formData });
    } else {
      criarBlocoMutation.mutate(formData);
    }
  };

  const handleEditBloco = (bloco: ModeloNegocio) => {
    setEditandoId(bloco.id);
    setFormData({
      bloco: bloco.bloco,
      descricao: bloco.descricao,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditandoId(null);
    setFormData({ bloco: "", descricao: "" });
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
      const res = await apiRequest("POST", "/api/ai/sugerir-modelo-negocio", {
        nomeEmpresa: empresa.nome,
        setor: empresa.setor,
        descricao: empresa.descricao,
      });
      const response = await res.json();

      const sugestoes = response.blocos || [];
      
      for (const sugestao of sugestoes) {
        await apiRequest("POST", "/api/modelo-negocio", {
          ...sugestao,
          empresaId: empresa.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: [`/api/modelo-negocio/${empresa.id}`] });
      toast({
        title: "Modelo criado!",
        description: `${sugestoes.length} blocos foram criados pela IA.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar modelo",
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
            Para criar seu modelo de negócio, você precisa completar o perfil da sua empresa.
          </p>
          <Button onClick={() => window.location.href = "/onboarding"} data-testid="button-ir-onboarding">
            Ir para Onboarding
          </Button>
        </Card>
      </div>
    );
  }

  const getBlocoLabel = (blocoValue: string) => {
    const bloco = blocos.find(b => b.value === blocoValue);
    return bloco?.label || blocoValue;
  };

  return (
    <div>
      <PageHeader
        title="Modelo de Negócio"
        description="Estruture como sua empresa cria, entrega e captura valor usando o Business Model Canvas com 9 blocos essenciais."
        tooltip="O Modelo de Negócio descreve a lógica de como sua empresa funciona: quem são seus clientes, o que você oferece, como ganha dinheiro e quais recursos precisa."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSuggest}
              disabled={isSuggesting}
              data-testid="button-suggest-blocos"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSuggesting ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleCloseDialog()} data-testid="button-add-bloco">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Bloco
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editandoId ? "Editar Bloco" : "Novo Bloco do Modelo de Negócio"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="bloco">Bloco do Canvas</Label>
                    <Select
                      value={formData.bloco}
                      onValueChange={(value) => setFormData({ ...formData, bloco: value })}
                    >
                      <SelectTrigger data-testid="select-bloco">
                        <SelectValue placeholder="Selecione o bloco" />
                      </SelectTrigger>
                      <SelectContent>
                        {blocos.map((bloco) => (
                          <SelectItem key={bloco.value} value={bloco.value} data-testid={`select-item-${bloco.value}`}>
                            <div>
                              <div className="font-medium">{bloco.label}</div>
                              <div className="text-xs text-muted-foreground">{bloco.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Descreva este bloco do seu modelo de negócio..."
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="min-h-[150px]"
                      data-testid="textarea-descricao"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveBloco} data-testid="button-save">
                    {editandoId ? "Atualizar" : "Adicionar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <ExampleCard>
        <strong>Clientes:</strong> PMEs brasileiras | <strong>Valor:</strong> Planejamento estratégico simples | <strong>Canais:</strong> Web | <strong>Receita:</strong> Assinatura mensal
      </ExampleCard>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando modelo...</p>
        </div>
      ) : blocosData.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-16 w-16" />}
          title="Nenhum bloco ainda"
          description="Comece construindo seu modelo de negócio adicionando os 9 blocos do Business Model Canvas. A IA pode criar um modelo completo automaticamente."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {blocosData.map((bloco) => (
            <Card key={bloco.id} className="p-6" data-testid={`card-bloco-${bloco.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2" data-testid={`text-bloco-titulo-${bloco.id}`}>
                    {getBlocoLabel(bloco.bloco)}
                  </h3>
                  <p className="text-muted-foreground text-sm" data-testid={`text-bloco-descricao-${bloco.id}`}>
                    {bloco.descricao}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditBloco(bloco)}
                    data-testid={`button-edit-${bloco.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletarBlocoMutation.mutate(bloco.id)}
                    data-testid={`button-delete-${bloco.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

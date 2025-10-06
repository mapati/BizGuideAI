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
import { TrendingUp, Plus, Sparkles, Trash2, Pencil, Target, Users, Package, Rocket } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OportunidadeCrescimento {
  id: string;
  empresaId: string;
  tipo: "penetracao_mercado" | "desenvolvimento_mercado" | "desenvolvimento_produto" | "diversificacao";
  titulo: string;
  descricao: string;
  potencial: "alto" | "médio" | "baixo";
  risco: "alto" | "médio" | "baixo";
}

const PotencialBadge = ({ potencial }: { potencial: "alto" | "médio" | "baixo" }) => {
  const variants = {
    alto: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    médio: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    baixo: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <Badge className={variants[potencial]} data-testid={`badge-potencial-${potencial}`}>
      Potencial {potencial.charAt(0).toUpperCase() + potencial.slice(1)}
    </Badge>
  );
};

const RiscoBadge = ({ risco }: { risco: "alto" | "médio" | "baixo" }) => {
  const variants = {
    alto: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    médio: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    baixo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Badge className={variants[risco]} data-testid={`badge-risco-${risco}`}>
      Risco {risco.charAt(0).toUpperCase() + risco.slice(1)}
    </Badge>
  );
};

const TipoIcon = ({ tipo }: { tipo: string }) => {
  const icons = {
    penetracao_mercado: <Target className="h-5 w-5 text-blue-600" />,
    desenvolvimento_mercado: <Users className="h-5 w-5 text-purple-600" />,
    desenvolvimento_produto: <Package className="h-5 w-5 text-green-600" />,
    diversificacao: <Rocket className="h-5 w-5 text-orange-600" />,
  };
  return icons[tipo as keyof typeof icons] || null;
};

export default function OportunidadesCrescimento() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "",
    titulo: "",
    descricao: "",
    potencial: "médio" as const,
    risco: "médio" as const,
  });

  const tipos = [
    { 
      value: "penetracao_mercado", 
      label: "Penetração de Mercado", 
      desc: "Produtos Atuais + Mercados Atuais",
      fullDesc: "Aumentar participação no mercado atual com produtos/serviços atuais (menor risco)"
    },
    { 
      value: "desenvolvimento_mercado", 
      label: "Desenvolvimento de Mercado", 
      desc: "Produtos Atuais + Novos Mercados",
      fullDesc: "Levar produtos/serviços atuais para novos mercados ou segmentos"
    },
    { 
      value: "desenvolvimento_produto", 
      label: "Desenvolvimento de Produto", 
      desc: "Novos Produtos + Mercados Atuais",
      fullDesc: "Criar novos produtos/serviços para os mercados atuais"
    },
    { 
      value: "diversificacao", 
      label: "Diversificação", 
      desc: "Novos Produtos + Novos Mercados",
      fullDesc: "Novos produtos/serviços para novos mercados (maior risco)"
    },
  ];

  const { data: empresa } = useQuery({
    queryKey: ["/api/empresa"],
  });

  const { data: oportunidades = [], isLoading } = useQuery<OportunidadeCrescimento[]>({
    queryKey: [`/api/oportunidades-crescimento/${empresa?.id}`],
    enabled: !!empresa?.id,
  });

  const criarOportunidadeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      const res = await apiRequest("POST", "/api/oportunidades-crescimento", { ...data, empresaId: empresa.id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/oportunidades-crescimento/${empresa?.id}`] });
      toast({
        title: "Oportunidade adicionada!",
        description: "A oportunidade de crescimento foi salva com sucesso.",
      });
      setFormData({ tipo: "", titulo: "", descricao: "", potencial: "médio", risco: "médio" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar oportunidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editarOportunidadeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await apiRequest("PATCH", `/api/oportunidades-crescimento/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/oportunidades-crescimento/${empresa?.id}`] });
      toast({
        title: "Oportunidade atualizada!",
        description: "A oportunidade foi atualizada com sucesso.",
      });
      setFormData({ tipo: "", titulo: "", descricao: "", potencial: "médio", risco: "médio" });
      setEditandoId(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar oportunidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarOportunidadeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/oportunidades-crescimento/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/oportunidades-crescimento/${empresa?.id}`] });
      toast({
        title: "Oportunidade removida",
        description: "A oportunidade foi excluída.",
      });
    },
  });

  const handleSaveOportunidade = () => {
    if (!formData.tipo || !formData.titulo || !formData.descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    if (editandoId) {
      editarOportunidadeMutation.mutate({ id: editandoId, data: formData });
    } else {
      criarOportunidadeMutation.mutate(formData);
    }
  };

  const handleEditOportunidade = (oportunidade: OportunidadeCrescimento) => {
    setEditandoId(oportunidade.id);
    setFormData({
      tipo: oportunidade.tipo,
      titulo: oportunidade.titulo,
      descricao: oportunidade.descricao,
      potencial: oportunidade.potencial,
      risco: oportunidade.risco,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditandoId(null);
      setFormData({ tipo: "", titulo: "", descricao: "", potencial: "médio", risco: "médio" });
    }
  };

  const handleGenerateOpportunities = async () => {
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
      const res = await apiRequest("POST", "/api/ai/gerar-oportunidades-crescimento", {
        empresaId: empresa.id,
      });
      const response = await res.json();

      if (response.oportunidades && response.oportunidades.length > 0) {
        let adicionadas = 0;
        for (const oportunidade of response.oportunidades) {
          try {
            await apiRequest("POST", "/api/oportunidades-crescimento", {
              ...oportunidade,
              empresaId: empresa.id,
            });
            adicionadas++;
          } catch (err: any) {
            console.error(`Erro ao salvar oportunidade ${oportunidade.tipo}:`, err);
          }
        }

        queryClient.invalidateQueries({ queryKey: [`/api/oportunidades-crescimento/${empresa.id}`] });
        toast({
          title: "Oportunidades geradas!",
          description: `${adicionadas} oportunidade(s) de crescimento foram adicionadas com IA.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar oportunidades",
        description: error.message || "Não foi possível gerar as oportunidades.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    return tipos.find((t) => t.value === tipo)?.label || tipo;
  };

  const getTipoDesc = (tipo: string) => {
    return tipos.find((t) => t.value === tipo)?.desc || "";
  };

  const oportunidadesPorTipo = {
    penetracao_mercado: oportunidades.filter((o) => o.tipo === "penetracao_mercado"),
    desenvolvimento_mercado: oportunidades.filter((o) => o.tipo === "desenvolvimento_mercado"),
    desenvolvimento_produto: oportunidades.filter((o) => o.tipo === "desenvolvimento_produto"),
    diversificacao: oportunidades.filter((o) => o.tipo === "diversificacao"),
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <PageHeader
          icon={TrendingUp}
          title="Oportunidades de Crescimento"
          subtitle="Matriz de Ansoff: Explore caminhos para expandir seu negócio"
        />
        <div className="mt-6">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <PageHeader
        icon={TrendingUp}
        title="Oportunidades de Crescimento"
        subtitle="Matriz de Ansoff: Explore caminhos para expandir seu negócio"
      />

      <div className="mt-6 flex gap-3">
        <Button 
          onClick={handleGenerateOpportunities} 
          disabled={isGenerating}
          data-testid="button-gerar-ai"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? "Gerando..." : "Gerar com IA"}
        </Button>
        
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-adicionar">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-oportunidade">
            <DialogHeader>
              <DialogTitle>
                {editandoId ? "Editar Oportunidade" : "Nova Oportunidade de Crescimento"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo (Matriz de Ansoff)</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger id="tipo" data-testid="select-tipo">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value} data-testid={`option-tipo-${tipo.value}`}>
                        <div>
                          <div className="font-medium">{tipo.label}</div>
                          <div className="text-xs text-muted-foreground">{tipo.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.tipo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {tipos.find((t) => t.value === formData.tipo)?.fullDesc}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="titulo">Título da Oportunidade</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Expandir para região sul..."
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  data-testid="input-titulo"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva a oportunidade de crescimento em detalhes..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={4}
                  data-testid="textarea-descricao"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="potencial">Potencial de Crescimento</Label>
                  <Select
                    value={formData.potencial}
                    onValueChange={(value) => setFormData({ ...formData, potencial: value as any })}
                  >
                    <SelectTrigger id="potencial" data-testid="select-potencial">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alto" data-testid="option-potencial-alto">Alto</SelectItem>
                      <SelectItem value="médio" data-testid="option-potencial-medio">Médio</SelectItem>
                      <SelectItem value="baixo" data-testid="option-potencial-baixo">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="risco">Nível de Risco</Label>
                  <Select
                    value={formData.risco}
                    onValueChange={(value) => setFormData({ ...formData, risco: value as any })}
                  >
                    <SelectTrigger id="risco" data-testid="select-risco">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixo" data-testid="option-risco-baixo">Baixo</SelectItem>
                      <SelectItem value="médio" data-testid="option-risco-medio">Médio</SelectItem>
                      <SelectItem value="alto" data-testid="option-risco-alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => handleCloseDialog(false)} data-testid="button-cancelar">
                  Cancelar
                </Button>
                <Button onClick={handleSaveOportunidade} data-testid="button-salvar">
                  {editandoId ? "Salvar Alterações" : "Adicionar Oportunidade"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {oportunidades.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<TrendingUp className="h-16 w-16" />}
            title="Nenhuma oportunidade identificada ainda"
            description="Comece gerando oportunidades com IA ou adicione manualmente."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ExampleCard
              title="Penetração de Mercado"
              description="Aumentar vendas dos produtos atuais no mercado atual"
              example="Programa de fidelidade para clientes existentes aumentarem suas compras"
            />
            <ExampleCard
              title="Desenvolvimento de Mercado"
              description="Levar produtos atuais para novos mercados"
              example="Expandir operação para estados vizinhos ou regiões não atendidas"
            />
            <ExampleCard
              title="Desenvolvimento de Produto"
              description="Criar novos produtos para mercados existentes"
              example="Lançar linha premium dos produtos atuais para clientes existentes"
            />
            <ExampleCard
              title="Diversificação"
              description="Novos produtos em novos mercados (maior risco)"
              example="Criar nova linha de negócio em segmento complementar"
            />
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {Object.entries(oportunidadesPorTipo).map(([tipo, oportunidadesList]) => {
            if (oportunidadesList.length === 0) return null;
            
            return (
              <div key={tipo}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TipoIcon tipo={tipo} />
                  {getTipoLabel(tipo)}
                  <span className="text-sm font-normal text-muted-foreground">({getTipoDesc(tipo)})</span>
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {oportunidadesList.map((oportunidade) => (
                    <Card key={oportunidade.id} className="p-4 hover-elevate" data-testid={`card-oportunidade-${oportunidade.id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <TipoIcon tipo={oportunidade.tipo} />
                          <h4 className="font-semibold" data-testid={`text-titulo-${oportunidade.id}`}>{oportunidade.titulo}</h4>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditOportunidade(oportunidade)}
                            data-testid={`button-editar-${oportunidade.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deletarOportunidadeMutation.mutate(oportunidade.id)}
                            data-testid={`button-deletar-${oportunidade.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3" data-testid={`text-descricao-${oportunidade.id}`}>
                        {oportunidade.descricao}
                      </p>
                      <div className="flex gap-2">
                        <PotencialBadge potencial={oportunidade.potencial} />
                        <RiscoBadge risco={oportunidade.risco} />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

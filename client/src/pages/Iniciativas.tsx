import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { Briefcase, Plus, Sparkles, Trash2, Pencil, Clock, User, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIniciativaSchema, type Iniciativa, type InsertIniciativa } from "@shared/schema";
import { z } from "zod/v4";

const formSchema = insertIniciativaSchema.extend({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
});

const statusLabels = {
  planejada: "Planejada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  pausada: "Pausada",
};

const prioridadeLabels = {
  alta: "Alta",
  média: "Média",
  baixa: "Baixa",
};

const impactoLabels = {
  alto: "Alto",
  médio: "Médio",
  baixo: "Baixo",
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  planejada: "secondary",
  em_andamento: "default",
  concluida: "outline",
  pausada: "secondary",
};

const prioridadeVariants: Record<string, "default" | "secondary" | "outline"> = {
  alta: "default",
  média: "secondary",
  baixa: "outline",
};

const impactoVariants: Record<string, "default" | "secondary" | "outline"> = {
  alto: "default",
  médio: "secondary",
  baixo: "outline",
};

export default function Iniciativas() {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIniciativa, setEditingIniciativa] = useState<Iniciativa | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: empresa } = useQuery<{ id: string; nome: string }>({
    queryKey: ["/api/empresa"],
  });

  const { data: iniciativas = [], isLoading } = useQuery<Iniciativa[]>({
    queryKey: ["/api/iniciativas", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: estrategias = [] } = useQuery<any[]>({
    queryKey: ["/api/estrategias", empresa?.id],
    enabled: !!empresa?.id,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      empresaId: empresa?.id || "",
      titulo: "",
      descricao: "",
      status: "planejada",
      prioridade: "média",
      prazo: "",
      responsavel: "",
      impacto: "médio",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertIniciativa) => {
      return apiRequest("POST", "/api/iniciativas", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
      toast({
        title: "Sucesso!",
        description: "Iniciativa criada com sucesso.",
      });
      setOpenDialog(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a iniciativa.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertIniciativa> }) => {
      return apiRequest("PATCH", `/api/iniciativas/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
      toast({
        title: "Sucesso!",
        description: "Iniciativa atualizada com sucesso.",
      });
      setOpenDialog(false);
      setEditingIniciativa(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a iniciativa.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/iniciativas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
      toast({
        title: "Sucesso!",
        description: "Iniciativa excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a iniciativa.",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation<{ iniciativas: InsertIniciativa[] }, Error, void>({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/ai/gerar-iniciativas", {
        empresaId: empresa?.id,
      });
    },
    onSuccess: (data: { iniciativas: InsertIniciativa[] }) => {
      if (data.iniciativas && data.iniciativas.length > 0) {
        Promise.all(
          data.iniciativas.map((iniciativa) =>
            apiRequest("POST", "/api/iniciativas", {
              ...iniciativa,
              empresaId: empresa?.id,
            })
          )
        ).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
          setIsGenerating(false);
          toast({
            title: "Sucesso!",
            description: `${data.iniciativas.length} iniciativas geradas com sucesso.`,
          });
        }).catch(() => {
          setIsGenerating(false);
          toast({
            title: "Erro",
            description: "Não foi possível salvar as iniciativas geradas.",
            variant: "destructive",
          });
        });
      } else {
        setIsGenerating(false);
        toast({
          title: "Nenhuma iniciativa gerada",
          description: "A IA não conseguiu gerar novas iniciativas. Tente novamente.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Erro",
        description: "Não foi possível gerar as iniciativas.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateWithAI = () => {
    setIsGenerating(true);
    generateMutation.mutate();
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingIniciativa) {
      updateMutation.mutate({
        id: editingIniciativa.id,
        data: values,
      });
    } else {
      createMutation.mutate({
        ...values,
        empresaId: empresa?.id || "",
      });
    }
  };

  const handleEdit = (iniciativa: Iniciativa) => {
    setEditingIniciativa(iniciativa);
    form.reset({
      empresaId: iniciativa.empresaId,
      titulo: iniciativa.titulo,
      descricao: iniciativa.descricao,
      status: iniciativa.status,
      prioridade: iniciativa.prioridade,
      prazo: iniciativa.prazo,
      responsavel: iniciativa.responsavel,
      impacto: iniciativa.impacto,
    });
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta iniciativa?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setOpenDialog(open);
    if (!open) {
      setEditingIniciativa(null);
      form.reset();
    }
  };

  const sortedIniciativas = [...iniciativas].sort((a, b) => {
    const prioridadeOrder = { alta: 1, média: 2, baixa: 3 };
    return prioridadeOrder[a.prioridade as keyof typeof prioridadeOrder] - 
           prioridadeOrder[b.prioridade as keyof typeof prioridadeOrder];
  });

  const altaPrioridade = sortedIniciativas.filter(i => i.prioridade === "alta");
  const mediaPrioridade = sortedIniciativas.filter(i => i.prioridade === "média");
  const baixaPrioridade = sortedIniciativas.filter(i => i.prioridade === "baixa");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando iniciativas...</p>
      </div>
    );
  }

  const semEstategias = empresa && estrategias.length === 0 && iniciativas.length === 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {semEstategias && (
        <PrerequisiteWarning
          titulo="Recomendado: crie estratégias antes de definir iniciativas"
          descricao="As iniciativas devem derivar das estratégias definidas na Matriz TOWS. Definir as estratégias primeiro garante que as iniciativas estejam alinhadas com os objetivos estratégicos."
          linkLabel="Ir para Estratégias"
          linkHref="/estrategias"
          variante="info"
        />
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Iniciativas Prioritárias</h1>
        <p className="text-muted-foreground">
          Gerencie o portfólio de projetos e ações estratégicas para executar sua estratégia
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            O que são Iniciativas Prioritárias?
          </CardTitle>
          <CardDescription>
            Iniciativas são projetos e ações concretas que você vai executar para alcançar seus objetivos estratégicos.
            Elas transformam estratégia em execução prática, com responsáveis, prazos e métricas de impacto claras.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex gap-3 mb-6">
        <Button
          onClick={handleGenerateWithAI}
          disabled={!empresa?.id || isGenerating}
          className="gap-2"
          data-testid="button-generate-ai"
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Gerando..." : "Gerar com IA"}
        </Button>

        <Dialog open={openDialog} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-add-manual">
              <Plus className="h-4 w-4" />
              Adicionar Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIniciativa ? "Editar Iniciativa" : "Nova Iniciativa"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Iniciativa</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Lançar programa de fidelidade digital"
                          {...field}
                          data-testid="input-titulo"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição e Objetivos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva a iniciativa e o que você espera alcançar..."
                          {...field}
                          rows={4}
                          data-testid="input-descricao"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="planejada">Planejada</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluida">Concluída</SelectItem>
                            <SelectItem value="pausada">Pausada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prioridade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-prioridade">
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="média">Média</SelectItem>
                            <SelectItem value="baixa">Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prazo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Q1 2025 ou Mar/2025"
                            {...field}
                            data-testid="input-prazo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="impacto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impacto Esperado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-impacto">
                              <SelectValue placeholder="Selecione o impacto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="alto">Alto</SelectItem>
                            <SelectItem value="médio">Médio</SelectItem>
                            <SelectItem value="baixo">Baixo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Gerente de Marketing ou Time Comercial"
                          {...field}
                          data-testid="input-responsavel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingIniciativa ? "Salvar Alterações" : "Criar Iniciativa"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isGenerating && (
        <Card className="mb-6 border-primary/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Gerando iniciativas com IA...</p>
                <p className="text-sm text-muted-foreground">
                  Já existem {iniciativas.length} iniciativa(s). A IA está criando 5 novas iniciativas únicas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {iniciativas.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Briefcase className="h-16 w-16" />}
            title="Coloque a estratégia em movimento"
            description="Iniciativas são projetos e ações concretas que executam suas estratégias. Cada iniciativa tem responsável, prazo, prioridade e impacto esperado. A IA sugere iniciativas práticas derivadas diretamente das estratégias que você definiu, ordenadas por prioridade estratégica."
            actionLabel="Criar Primeira Iniciativa"
            onAction={() => setOpenDialog(true)}
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ExampleCard>
              <strong>Programa de Fidelidade Digital:</strong> Criar um app de fidelidade com pontos, recompensas e ofertas personalizadas para aumentar a retenção de clientes. <strong>Status:</strong> Planejada | <strong>Prioridade:</strong> Alta | <strong>Prazo:</strong> Q2 2025
            </ExampleCard>
            <ExampleCard>
              <strong>Expansão para E-commerce:</strong> Desenvolver plataforma de vendas online integrada com estoque e logística para ampliar canais de venda. <strong>Status:</strong> Em Andamento | <strong>Prioridade:</strong> Alta | <strong>Prazo:</strong> Q1 2025
            </ExampleCard>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {altaPrioridade.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-destructive" />
                Prioridade Alta
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {altaPrioridade.map((iniciativa) => (
                  <Card key={iniciativa.id} className="hover-elevate" data-testid={`card-iniciativa-${iniciativa.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{iniciativa.titulo}</CardTitle>
                          <CardDescription className="mt-2">
                            {iniciativa.descricao}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(iniciativa)}
                            data-testid={`button-edit-${iniciativa.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(iniciativa.id)}
                            data-testid={`button-delete-${iniciativa.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={statusVariants[iniciativa.status]} data-testid={`badge-status-${iniciativa.id}`}>
                            {statusLabels[iniciativa.status as keyof typeof statusLabels]}
                          </Badge>
                          <Badge variant={prioridadeVariants[iniciativa.prioridade]} data-testid={`badge-prioridade-${iniciativa.id}`}>
                            {prioridadeLabels[iniciativa.prioridade as keyof typeof prioridadeLabels]}
                          </Badge>
                          <Badge variant={impactoVariants[iniciativa.impacto]} data-testid={`badge-impacto-${iniciativa.id}`}>
                            Impacto {impactoLabels[iniciativa.impacto as keyof typeof impactoLabels]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{iniciativa.prazo}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{iniciativa.responsavel}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {mediaPrioridade.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Prioridade Média
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {mediaPrioridade.map((iniciativa) => (
                  <Card key={iniciativa.id} className="hover-elevate" data-testid={`card-iniciativa-${iniciativa.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{iniciativa.titulo}</CardTitle>
                          <CardDescription className="mt-2">
                            {iniciativa.descricao}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(iniciativa)}
                            data-testid={`button-edit-${iniciativa.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(iniciativa.id)}
                            data-testid={`button-delete-${iniciativa.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={statusVariants[iniciativa.status]} data-testid={`badge-status-${iniciativa.id}`}>
                            {statusLabels[iniciativa.status as keyof typeof statusLabels]}
                          </Badge>
                          <Badge variant={prioridadeVariants[iniciativa.prioridade]} data-testid={`badge-prioridade-${iniciativa.id}`}>
                            {prioridadeLabels[iniciativa.prioridade as keyof typeof prioridadeLabels]}
                          </Badge>
                          <Badge variant={impactoVariants[iniciativa.impacto]} data-testid={`badge-impacto-${iniciativa.id}`}>
                            Impacto {impactoLabels[iniciativa.impacto as keyof typeof impactoLabels]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{iniciativa.prazo}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{iniciativa.responsavel}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {baixaPrioridade.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Prioridade Baixa
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {baixaPrioridade.map((iniciativa) => (
                  <Card key={iniciativa.id} className="hover-elevate" data-testid={`card-iniciativa-${iniciativa.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{iniciativa.titulo}</CardTitle>
                          <CardDescription className="mt-2">
                            {iniciativa.descricao}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(iniciativa)}
                            data-testid={`button-edit-${iniciativa.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(iniciativa.id)}
                            data-testid={`button-delete-${iniciativa.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={statusVariants[iniciativa.status]} data-testid={`badge-status-${iniciativa.id}`}>
                            {statusLabels[iniciativa.status as keyof typeof statusLabels]}
                          </Badge>
                          <Badge variant={prioridadeVariants[iniciativa.prioridade]} data-testid={`badge-prioridade-${iniciativa.id}`}>
                            {prioridadeLabels[iniciativa.prioridade as keyof typeof prioridadeLabels]}
                          </Badge>
                          <Badge variant={impactoVariants[iniciativa.impacto]} data-testid={`badge-impacto-${iniciativa.id}`}>
                            Impacto {impactoLabels[iniciativa.impacto as keyof typeof impactoLabels]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{iniciativa.prazo}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{iniciativa.responsavel}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

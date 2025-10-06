import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ExampleCard } from "@/components/ExampleCard";
import { Plus, Sparkles, Target as TargetIcon, Loader2, Trash2, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Objetivo, ResultadoChave } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function OKRs() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoObjetivo, setEditandoObjetivo] = useState<Objetivo | null>(null);
  const [novoObjetivo, setNovoObjetivo] = useState({ titulo: "", descricao: "", prazo: "" });
  const [objetivoExpandido, setObjetivoExpandido] = useState<string | null>(null);
  const [editandoResultado, setEditandoResultado] = useState<ResultadoChave | null>(null);
  const [novoResultado, setNovoResultado] = useState({
    metrica: "",
    valorInicial: "",
    valorAlvo: "",
    valorAtual: "",
    owner: "",
    prazo: "",
  });
  const [dialogResultadoOpen, setDialogResultadoOpen] = useState(false);

  // Buscar empresa
  const { data: empresa } = useQuery<any>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  // Buscar objetivos
  const { data: objetivos = [], isLoading } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  // Buscar resultados-chave para objetivo expandido
  const { data: resultadosChave = [] } = useQuery<ResultadoChave[]>({
    queryKey: ["/api/resultados-chave", objetivoExpandido],
    enabled: !!objetivoExpandido,
  });

  // Gerar objetivos com IA
  const gerarObjetivosMutation = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/ai/gerar-objetivos", { empresaId });
    },
    onSuccess: (data) => {
      if (data.objetivos && data.objetivos.length > 0) {
        toast({
          title: "Objetivos Gerados!",
          description: `${data.objetivos.length} objetivo(s) sugerido(s) pela IA. Revise e ajuste conforme necessário.`,
        });
        data.objetivos.forEach(async (obj: any) => {
          await criarObjetivoMutation.mutateAsync({
            empresaId,
            titulo: obj.titulo,
            descricao: obj.descricao,
            prazo: obj.prazo,
          });
        });
      } else {
        toast({
          title: "Nenhum objetivo novo",
          description: "Todos os objetivos sugeridos já existem ou são muito similares.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao gerar objetivos",
        description: "Não foi possível gerar objetivos com IA. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Gerar resultados-chave com IA
  const gerarResultadosMutation = useMutation({
    mutationFn: async (objetivoId: string) => {
      return await apiRequest("POST", "/api/ai/gerar-resultados-chave", { objetivoId });
    },
    onSuccess: (data, objetivoId) => {
      if (data.resultados && data.resultados.length > 0) {
        toast({
          title: "Resultados-Chave Gerados!",
          description: `${data.resultados.length} resultado(s)-chave sugerido(s) pela IA.`,
        });
        data.resultados.forEach(async (res: any) => {
          await criarResultadoMutation.mutateAsync({
            objetivoId,
            metrica: res.metrica,
            valorInicial: res.valorInicial.toString(),
            valorAlvo: res.valorAlvo.toString(),
            valorAtual: res.valorAtual.toString(),
            owner: res.owner,
            prazo: res.prazo,
          });
        });
      } else {
        toast({
          title: "Nenhum resultado novo",
          description: "Todos os resultados sugeridos já existem ou são similares.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao gerar resultados",
        description: "Não foi possível gerar resultados-chave. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Criar objetivo
  const criarObjetivoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/objetivos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
    },
  });

  // Editar objetivo
  const editarObjetivoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/objetivos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
      toast({
        title: "Objetivo atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
  });

  // Deletar objetivo
  const deletarObjetivoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/objetivos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
      toast({
        title: "Objetivo removido",
        description: "O objetivo foi removido com sucesso.",
      });
    },
  });

  // Criar resultado-chave
  const criarResultadoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/resultados-chave", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resultados-chave", objetivoExpandido] });
    },
  });

  // Editar resultado-chave
  const editarResultadoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/resultados-chave/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resultados-chave", objetivoExpandido] });
      toast({
        title: "Resultado atualizado",
        description: "As alterações foram salvas.",
      });
    },
  });

  // Deletar resultado-chave
  const deletarResultadoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/resultados-chave/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resultados-chave", objetivoExpandido] });
      toast({
        title: "Resultado removido",
        description: "O resultado-chave foi removido.",
      });
    },
  });

  const handleCriarObjetivo = async () => {
    if (!novoObjetivo.titulo || !novoObjetivo.prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e prazo do objetivo.",
        variant: "destructive",
      });
      return;
    }

    await criarObjetivoMutation.mutateAsync({
      empresaId,
      ...novoObjetivo,
    });

    setNovoObjetivo({ titulo: "", descricao: "", prazo: "" });
    setIsDialogOpen(false);
    toast({
      title: "Objetivo criado!",
      description: "Novo objetivo adicionado com sucesso.",
    });
  };

  const handleEditarObjetivo = async () => {
    if (!editandoObjetivo) return;

    if (!editandoObjetivo.titulo || !editandoObjetivo.prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e prazo do objetivo.",
        variant: "destructive",
      });
      return;
    }

    await editarObjetivoMutation.mutateAsync({
      id: editandoObjetivo.id,
      data: {
        titulo: editandoObjetivo.titulo,
        descricao: editandoObjetivo.descricao,
        prazo: editandoObjetivo.prazo,
      },
    });

    setEditandoObjetivo(null);
  };

  const handleCriarResultado = async () => {
    if (!objetivoExpandido) return;

    if (!novoResultado.metrica || !novoResultado.valorInicial || !novoResultado.valorAlvo || !novoResultado.owner || !novoResultado.prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do resultado-chave.",
        variant: "destructive",
      });
      return;
    }

    await criarResultadoMutation.mutateAsync({
      objetivoId: objetivoExpandido,
      ...novoResultado,
    });

    setNovoResultado({
      metrica: "",
      valorInicial: "",
      valorAlvo: "",
      valorAtual: "",
      owner: "",
      prazo: "",
    });
    setDialogResultadoOpen(false);
    toast({
      title: "Resultado-chave criado!",
      description: "Novo resultado adicionado ao objetivo.",
    });
  };

  const handleEditarResultado = async () => {
    if (!editandoResultado) return;

    await editarResultadoMutation.mutateAsync({
      id: editandoResultado.id,
      data: {
        metrica: editandoResultado.metrica,
        valorInicial: editandoResultado.valorInicial,
        valorAlvo: editandoResultado.valorAlvo,
        valorAtual: editandoResultado.valorAtual,
        owner: editandoResultado.owner,
        prazo: editandoResultado.prazo,
      },
    });

    setEditandoResultado(null);
  };

  const calcularProgresso = (inicial: string, atual: string, alvo: string): number => {
    const ini = parseFloat(inicial);
    const atu = parseFloat(atual);
    const alv = parseFloat(alvo);
    
    if (isNaN(ini) || isNaN(atu) || isNaN(alv)) return 0;
    if (alv === ini) return 100;
    
    const progresso = ((atu - ini) / (alv - ini)) * 100;
    return Math.max(0, Math.min(100, progresso));
  };

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
        title="Objetivos e Resultados-Chave"
        description="Defina objetivos claros e os resultados concretos que você quer atingir. A IA ajuda a transformar suas apostas estratégicas em objetivos mensuráveis."
        tooltip="Esta ferramenta conecta seus objetivos ambiciosos (onde você quer chegar) com resultados concretos e mensuráveis (como você vai saber que chegou lá)."
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => gerarObjetivosMutation.mutate()}
              disabled={gerarObjetivosMutation.isPending}
              variant="outline"
              data-testid="button-gerar-objetivos"
            >
              {gerarObjetivosMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar com IA
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-okr">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Objetivo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Objetivo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="titulo">Título do Objetivo</Label>
                    <Input
                      id="titulo"
                      placeholder="Ex: Aumentar a rentabilidade do negócio"
                      value={novoObjetivo.titulo}
                      onChange={(e) => setNovoObjetivo({ ...novoObjetivo, titulo: e.target.value })}
                      data-testid="input-objetivo-titulo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Por que este objetivo é importante?"
                      value={novoObjetivo.descricao || ""}
                      onChange={(e) => setNovoObjetivo({ ...novoObjetivo, descricao: e.target.value })}
                      rows={3}
                      data-testid="input-objetivo-descricao"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prazo">Prazo</Label>
                    <Input
                      id="prazo"
                      placeholder="Ex: Q4 2025, Anual 2025"
                      value={novoObjetivo.prazo}
                      onChange={(e) => setNovoObjetivo({ ...novoObjetivo, prazo: e.target.value })}
                      data-testid="input-objetivo-prazo"
                    />
                  </div>
                  <Button
                    onClick={handleCriarObjetivo}
                    className="w-full"
                    disabled={criarObjetivoMutation.isPending}
                    data-testid="button-criar-objetivo"
                  >
                    {criarObjetivoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Criar Objetivo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <ExampleCard>
        <strong>Objetivo:</strong> Aumentar a rentabilidade do negócio<br />
        <strong>Resultados esperados:</strong> (1) Margem bruta sair de 38% para 42%; (2) Perda de material cair de 3,2% para 2,0%; (3) Contratos com reajuste automático subir de 45% para 70%
      </ExampleCard>

      {objetivos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <TargetIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum objetivo criado</h3>
            <p className="text-sm text-muted-foreground">
              Comece gerando objetivos com IA baseados nas suas apostas estratégicas ou crie manualmente.
            </p>
            <Button
              onClick={() => gerarObjetivosMutation.mutate()}
              disabled={gerarObjetivosMutation.isPending}
              data-testid="button-gerar-objetivos-empty"
            >
              {gerarObjetivosMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar Objetivos com IA
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6 mt-6">
          {objetivos.map((objetivo) => {
            const isExpanded = objetivoExpandido === objetivo.id;
            const isEditing = editandoObjetivo?.id === objetivo.id;

            return (
              <Card key={objetivo.id} className="p-6" data-testid={`card-objetivo-${objetivo.id}`}>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TargetIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3 mb-4">
                        <div>
                          <Label>Título do Objetivo</Label>
                          <Input
                            value={editandoObjetivo.titulo}
                            onChange={(e) => setEditandoObjetivo({ ...editandoObjetivo, titulo: e.target.value })}
                            data-testid={`input-edit-titulo-${objetivo.id}`}
                          />
                        </div>
                        <div>
                          <Label>Descrição (opcional)</Label>
                          <Textarea
                            value={editandoObjetivo.descricao || ""}
                            onChange={(e) => setEditandoObjetivo({ ...editandoObjetivo, descricao: e.target.value })}
                            rows={2}
                            data-testid={`input-edit-descricao-${objetivo.id}`}
                          />
                        </div>
                        <div>
                          <Label>Prazo</Label>
                          <Input
                            value={editandoObjetivo.prazo}
                            onChange={(e) => setEditandoObjetivo({ ...editandoObjetivo, prazo: e.target.value })}
                            data-testid={`input-edit-prazo-${objetivo.id}`}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleEditarObjetivo}
                            disabled={editarObjetivoMutation.isPending}
                            size="sm"
                            data-testid={`button-save-objetivo-${objetivo.id}`}
                          >
                            Salvar
                          </Button>
                          <Button
                            onClick={() => setEditandoObjetivo(null)}
                            variant="outline"
                            size="sm"
                            data-testid={`button-cancel-objetivo-${objetivo.id}`}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-semibold mb-1" data-testid={`text-objetivo-${objetivo.id}`}>
                              {objetivo.titulo}
                            </h3>
                            {objetivo.descricao && (
                              <p className="text-sm text-muted-foreground mb-2">{objetivo.descricao}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Prazo: {objetivo.prazo}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditandoObjetivo(objetivo)}
                              data-testid={`button-edit-objetivo-${objetivo.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletarObjetivoMutation.mutate(objetivo.id)}
                              data-testid={`button-delete-objetivo-${objetivo.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setObjetivoExpandido(isExpanded ? null : objetivo.id)}
                            className="w-full"
                            data-testid={`button-toggle-resultados-${objetivo.id}`}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-2" />
                                Ocultar Resultados-Chave
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-2" />
                                Ver Resultados-Chave
                              </>
                            )}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">Resultados-Chave</h4>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => gerarResultadosMutation.mutate(objetivo.id)}
                                  disabled={gerarResultadosMutation.isPending}
                                  data-testid={`button-gerar-resultados-${objetivo.id}`}
                                >
                                  {gerarResultadosMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4 mr-2" />
                                  )}
                                  Gerar com IA
                                </Button>
                                <Dialog open={dialogResultadoOpen} onOpenChange={setDialogResultadoOpen}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" data-testid={`button-add-resultado-${objetivo.id}`}>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Adicionar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Novo Resultado-Chave</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div>
                                        <Label>Métrica</Label>
                                        <Input
                                          placeholder="Ex: Margem bruta"
                                          value={novoResultado.metrica}
                                          onChange={(e) => setNovoResultado({ ...novoResultado, metrica: e.target.value })}
                                          data-testid="input-resultado-metrica"
                                        />
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <Label>Inicial</Label>
                                          <Input
                                            placeholder="38.5"
                                            value={novoResultado.valorInicial}
                                            onChange={(e) => setNovoResultado({ ...novoResultado, valorInicial: e.target.value })}
                                            data-testid="input-resultado-inicial"
                                          />
                                        </div>
                                        <div>
                                          <Label>Alvo</Label>
                                          <Input
                                            placeholder="42.0"
                                            value={novoResultado.valorAlvo}
                                            onChange={(e) => setNovoResultado({ ...novoResultado, valorAlvo: e.target.value })}
                                            data-testid="input-resultado-alvo"
                                          />
                                        </div>
                                        <div>
                                          <Label>Atual</Label>
                                          <Input
                                            placeholder="38.5"
                                            value={novoResultado.valorAtual}
                                            onChange={(e) => setNovoResultado({ ...novoResultado, valorAtual: e.target.value })}
                                            data-testid="input-resultado-atual"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <Label>Responsável</Label>
                                        <Input
                                          placeholder="Ex: CFO"
                                          value={novoResultado.owner}
                                          onChange={(e) => setNovoResultado({ ...novoResultado, owner: e.target.value })}
                                          data-testid="input-resultado-owner"
                                        />
                                      </div>
                                      <div>
                                        <Label>Prazo</Label>
                                        <Input
                                          placeholder="Ex: Q4 2025"
                                          value={novoResultado.prazo}
                                          onChange={(e) => setNovoResultado({ ...novoResultado, prazo: e.target.value })}
                                          data-testid="input-resultado-prazo"
                                        />
                                      </div>
                                      <Button
                                        onClick={handleCriarResultado}
                                        className="w-full"
                                        disabled={criarResultadoMutation.isPending}
                                        data-testid="button-criar-resultado"
                                      >
                                        Criar
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>

                            {resultadosChave.length === 0 ? (
                              <div className="text-center py-8 text-sm text-muted-foreground">
                                <p>Nenhum resultado-chave definido ainda.</p>
                                <p className="mt-2">Gere com IA ou adicione manualmente.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {resultadosChave.map((resultado) => {
                                  const isEditingRes = editandoResultado?.id === resultado.id;
                                  const progresso = calcularProgresso(
                                    resultado.valorInicial,
                                    resultado.valorAtual,
                                    resultado.valorAlvo
                                  );

                                  return (
                                    <Card key={resultado.id} className="p-4" data-testid={`card-resultado-${resultado.id}`}>
                                      {isEditingRes ? (
                                        <div className="space-y-3">
                                          <div>
                                            <Label>Métrica</Label>
                                            <Input
                                              value={editandoResultado.metrica}
                                              onChange={(e) => setEditandoResultado({ ...editandoResultado, metrica: e.target.value })}
                                            />
                                          </div>
                                          <div className="grid grid-cols-3 gap-2">
                                            <div>
                                              <Label>Inicial</Label>
                                              <Input
                                                value={editandoResultado.valorInicial}
                                                onChange={(e) => setEditandoResultado({ ...editandoResultado, valorInicial: e.target.value })}
                                              />
                                            </div>
                                            <div>
                                              <Label>Alvo</Label>
                                              <Input
                                                value={editandoResultado.valorAlvo}
                                                onChange={(e) => setEditandoResultado({ ...editandoResultado, valorAlvo: e.target.value })}
                                              />
                                            </div>
                                            <div>
                                              <Label>Atual</Label>
                                              <Input
                                                value={editandoResultado.valorAtual}
                                                onChange={(e) => setEditandoResultado({ ...editandoResultado, valorAtual: e.target.value })}
                                              />
                                            </div>
                                          </div>
                                          <div>
                                            <Label>Responsável</Label>
                                            <Input
                                              value={editandoResultado.owner}
                                              onChange={(e) => setEditandoResultado({ ...editandoResultado, owner: e.target.value })}
                                            />
                                          </div>
                                          <div>
                                            <Label>Prazo</Label>
                                            <Input
                                              value={editandoResultado.prazo}
                                              onChange={(e) => setEditandoResultado({ ...editandoResultado, prazo: e.target.value })}
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button onClick={handleEditarResultado} size="sm">
                                              Salvar
                                            </Button>
                                            <Button onClick={() => setEditandoResultado(null)} variant="outline" size="sm">
                                              Cancelar
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                              <h5 className="font-semibold text-sm mb-1">{resultado.metrica}</h5>
                                              <p className="text-xs text-muted-foreground">
                                                {resultado.valorInicial} → {resultado.valorAlvo} (Atual: {resultado.valorAtual})
                                              </p>
                                            </div>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditandoResultado(resultado)}
                                                data-testid={`button-edit-resultado-${resultado.id}`}
                                              >
                                                <Edit2 className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deletarResultadoMutation.mutate(resultado.id)}
                                                data-testid={`button-delete-resultado-${resultado.id}`}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                          <Progress value={progresso} className="h-2 mb-2" />
                                          <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Owner: {resultado.owner}</span>
                                            <span>Prazo: {resultado.prazo}</span>
                                          </div>
                                        </>
                                      )}
                                    </Card>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import { Plus, Sparkles, Target as TargetIcon, Loader2, Trash2, Edit2, TrendingUp, Users, Cog, GraduationCap, DollarSign } from "lucide-react";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const perspectivas = [
  { valor: "Financeira", label: "Financeira", icon: DollarSign, cor: "bg-green-500" },
  { valor: "Clientes", label: "Clientes", icon: Users, cor: "bg-blue-500" },
  { valor: "Processos Internos", label: "Processos Internos", icon: Cog, cor: "bg-orange-500" },
  { valor: "Aprendizado e Crescimento", label: "Aprendizado e Crescimento", icon: GraduationCap, cor: "bg-purple-500" },
];

export default function OKRs() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoObjetivo, setNovoObjetivo] = useState({ titulo: "", descricao: "", prazo: "", perspectiva: "Financeira" });
  const [objetivoSelecionado, setObjetivoSelecionado] = useState<Objetivo | null>(null);
  const [dialogResultadosOpen, setDialogResultadosOpen] = useState(false);
  const [editandoResultado, setEditandoResultado] = useState<ResultadoChave | null>(null);
  const [novoResultado, setNovoResultado] = useState({
    metrica: "",
    valorInicial: "",
    valorAlvo: "",
    valorAtual: "",
    owner: "",
    prazo: "",
  });
  const [dialogNovoResultadoOpen, setDialogNovoResultadoOpen] = useState(false);
  const [editandoObjetivo, setEditandoObjetivo] = useState(false);
  const [objetivoEditado, setObjetivoEditado] = useState({ titulo: "", descricao: "", prazo: "", perspectiva: "Financeira" });

  const { data: empresa } = useQuery<any>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  const { data: estrategias = [] } = useQuery<any[]>({
    queryKey: ["/api/estrategias", empresaId],
    enabled: !!empresaId,
  });

  const { data: objetivos = [], isLoading } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  const { data: resultadosChave = [] } = useQuery<ResultadoChave[]>({
    queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`],
    enabled: !!objetivoSelecionado?.id,
  });

  const [gerandoPerspectiva, setGerandoPerspectiva] = useState<string | null>(null);

  const gerarObjetivosMutation = useMutation({
    mutationFn: async (perspectiva?: string) => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/ai/gerar-objetivos", { empresaId, perspectiva });
    },
    onSuccess: async (data, perspectiva) => {
      if (data.objetivos && data.objetivos.length > 0) {
        const label = perspectiva ? `perspectiva ${perspectiva}` : "todas as perspectivas";
        toast({
          title: "Objetivo(s) Gerado(s)!",
          description: `${data.objetivos.length} objetivo(s) sugerido(s) pela IA para ${label}.`,
        });
        for (const obj of data.objetivos) {
          await criarObjetivoMutation.mutateAsync({
            empresaId,
            titulo: obj.titulo,
            descricao: obj.descricao,
            prazo: obj.prazo,
            perspectiva: obj.perspectiva || perspectiva || "Financeira",
          });
        }
      } else {
        toast({
          title: "Nenhum objetivo novo",
          description: "Todos os objetivos sugeridos já existem ou são muito similares.",
          variant: "destructive",
        });
      }
      setGerandoPerspectiva(null);
    },
    onError: () => {
      toast({
        title: "Erro ao gerar objetivos",
        description: "Não foi possível gerar objetivos com IA. Tente novamente.",
        variant: "destructive",
      });
      setGerandoPerspectiva(null);
    },
  });

  const handleGerarParaPerspectiva = (perspectiva: string) => {
    setGerandoPerspectiva(perspectiva);
    gerarObjetivosMutation.mutate(perspectiva);
  };

  const gerarResultadosMutation = useMutation({
    mutationFn: async (objetivoId: string) => {
      return await apiRequest("POST", "/api/ai/gerar-resultados-chave", { objetivoId });
    },
    onSuccess: async (data, objetivoId) => {
      if (data.resultados && data.resultados.length > 0) {
        toast({
          title: "Resultados-Chave Gerados!",
          description: `${data.resultados.length} resultado(s)-chave sugerido(s) pela IA.`,
        });
        for (const res of data.resultados) {
          await criarResultadoMutation.mutateAsync({
            objetivoId,
            metrica: res.metrica,
            valorInicial: res.valorInicial.toString(),
            valorAlvo: res.valorAlvo.toString(),
            valorAtual: res.valorAtual.toString(),
            owner: res.owner,
            prazo: res.prazo,
          });
        }
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

  const criarObjetivoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/objetivos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
    },
  });

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

  const editarObjetivoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/objetivos/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
      setObjetivoSelecionado(prev => prev ? { ...prev, ...variables.data } : prev);
      setEditandoObjetivo(false);
      toast({
        title: "Objetivo atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
  });

  const criarResultadoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/resultados-chave", data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${vars.objetivoId}`] });
    },
  });

  const editarResultadoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/resultados-chave/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`] });
      toast({
        title: "Resultado atualizado",
        description: "As alterações foram salvas.",
      });
    },
  });

  const deletarResultadoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/resultados-chave/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`] });
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

    setNovoObjetivo({ titulo: "", descricao: "", prazo: "", perspectiva: "Financeira" });
    setIsDialogOpen(false);
    toast({
      title: "Objetivo criado!",
      description: "Novo objetivo adicionado com sucesso.",
    });
  };

  const handleCriarResultado = async () => {
    if (!objetivoSelecionado) return;

    if (!novoResultado.metrica || !novoResultado.valorInicial || !novoResultado.valorAlvo || !novoResultado.owner || !novoResultado.prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do resultado-chave.",
        variant: "destructive",
      });
      return;
    }

    await criarResultadoMutation.mutateAsync({
      objetivoId: objetivoSelecionado.id,
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
    setDialogNovoResultadoOpen(false);
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

  const objetivosPorPerspectiva = (perspectiva: string) => {
    return objetivos.filter(obj => obj.perspectiva === perspectiva);
  };

  const iniciarEdicaoObjetivo = () => {
    if (objetivoSelecionado) {
      setObjetivoEditado({
        titulo: objetivoSelecionado.titulo,
        descricao: objetivoSelecionado.descricao || "",
        prazo: objetivoSelecionado.prazo,
        perspectiva: objetivoSelecionado.perspectiva,
      });
      setEditandoObjetivo(true);
    }
  };

  const salvarEdicaoObjetivo = async () => {
    if (!objetivoSelecionado) return;
    
    await editarObjetivoMutation.mutateAsync({
      id: objetivoSelecionado.id,
      data: objetivoEditado,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const semEstategias = empresa && estrategias.length === 0 && objetivos.length === 0;

  return (
    <div>
      {semEstategias && (
        <PrerequisiteWarning
          titulo="Recomendado: defina estratégias antes de criar OKRs"
          descricao="OKRs são mais eficazes quando derivam das estratégias definidas na Matriz TOWS. Complete as Estratégias primeiro para que seus objetivos estejam alinhados."
          linkLabel="Ir para Estratégias"
          linkHref="/estrategias"
          variante="info"
        />
      )}
      <PageHeader
        title="OKRs — Objetivos e Resultados-Chave"
        description="Defina onde quer chegar e como vai medir o progresso. Cada objetivo tem resultados-chave com meta de 0–100% dentro de um prazo."
        tooltip="OKRs (Objectives & Key Results) são metas ambiciosas com prazo definido e progresso mensurável. São diferentes dos KPIs, que medem a saúde contínua do negócio — acesse 'KPIs — Indicadores' para isso."
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => gerarObjetivosMutation.mutate(undefined)}
              disabled={gerarObjetivosMutation.isPending}
              variant="outline"
              data-testid="button-gerar-objetivos"
            >
              {gerarObjetivosMutation.isPending && !gerandoPerspectiva ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar para todas as perspectivas
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
                  <div>
                    <Label htmlFor="perspectiva">Perspectiva BSC</Label>
                    <Select
                      value={novoObjetivo.perspectiva}
                      onValueChange={(value) => setNovoObjetivo({ ...novoObjetivo, perspectiva: value })}
                    >
                      <SelectTrigger data-testid="select-perspectiva">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {perspectivas.map((p) => (
                          <SelectItem key={p.valor} value={p.valor}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

      {/* Educational callout: OKR vs KPI */}
      <Card className="p-4 bg-muted/30" data-testid="card-educational-okr">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <TargetIcon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">OKRs — Mudança e crescimento (esta página)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Definem onde você quer chegar em um ciclo. Têm prazo e progresso de 0–100%.
              Clique em um objetivo para gerenciar seus resultados-chave (KRs).
            </p>
          </div>
          <div className="hidden sm:flex items-center text-muted-foreground/40">
            <span className="text-lg font-light">vs</span>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">KPIs — Saúde contínua do negócio</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Medem o que já está em operação com status verde/amarelo/vermelho. Sem prazo de encerramento — monitorados permanentemente.
            </p>
          </div>
        </div>
      </Card>

      {objetivos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <TargetIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Defina onde você quer chegar</h3>
            <p className="text-sm text-muted-foreground">
              OKRs (Objectives & Key Results) traduzem a estratégia em metas claras e mensuráveis. Cada Objetivo é inspirador e ambicioso; os Resultados-Chave são indicadores concretos de progresso. A IA cria OKRs alinhados às suas iniciativas e estratégias, garantindo execução focada e rastreável.
            </p>
            <Button
              onClick={() => gerarObjetivosMutation.mutate(undefined)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {perspectivas.map((perspectiva) => {
            const Icon = perspectiva.icon;
            const objs = objetivosPorPerspectiva(perspectiva.valor);
            
            return (
              <Card key={perspectiva.valor} className="p-6" data-testid={`card-perspectiva-${perspectiva.valor}`}>
                <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${perspectiva.cor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{perspectiva.label}</h3>
                      <p className="text-sm text-muted-foreground">{objs.length} objetivo(s)</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGerarParaPerspectiva(perspectiva.valor)}
                    disabled={gerarObjetivosMutation.isPending}
                    data-testid={`button-gerar-perspectiva-${perspectiva.valor}`}
                  >
                    {gerandoPerspectiva === perspectiva.valor ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Gerar com IA
                  </Button>
                </div>

                <div className="space-y-3">
                  {objs.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum objetivo nesta perspectiva
                    </div>
                  ) : (
                    objs.map((objetivo) => (
                      <Card
                        key={objetivo.id}
                        className="p-4 hover-elevate cursor-pointer"
                        onClick={() => {
                          setObjetivoSelecionado(objetivo);
                          setDialogResultadosOpen(true);
                        }}
                        data-testid={`card-objetivo-${objetivo.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{objetivo.titulo}</h4>
                            {objetivo.descricao && (
                              <p className="text-xs text-muted-foreground mb-2">{objetivo.descricao}</p>
                            )}
                            <p className="text-xs text-muted-foreground">Prazo: {objetivo.prazo}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletarObjetivoMutation.mutate(objetivo.id);
                            }}
                            data-testid={`button-delete-objetivo-${objetivo.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogResultadosOpen} onOpenChange={(open) => {
        setDialogResultadosOpen(open);
        if (!open) {
          setEditandoObjetivo(false);
          setObjetivoEditado({ titulo: "", descricao: "", prazo: "", perspectiva: "Financeira" });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoObjetivo ? "Editar Objetivo" : objetivoSelecionado?.titulo}
            </DialogTitle>
          </DialogHeader>
          {objetivoSelecionado && (
            <div className="space-y-6 py-4">
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Detalhes do Objetivo</h4>
                  {!editandoObjetivo ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={iniciarEdicaoObjetivo}
                      data-testid="button-editar-objetivo"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditandoObjetivo(false)}
                        data-testid="button-cancelar-objetivo"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={salvarEdicaoObjetivo}
                        disabled={editarObjetivoMutation.isPending}
                        data-testid="button-salvar-objetivo"
                      >
                        {editarObjetivoMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>
                
                {editandoObjetivo ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={objetivoEditado.titulo}
                        onChange={(e) => setObjetivoEditado({ ...objetivoEditado, titulo: e.target.value })}
                        placeholder="Título do objetivo"
                        data-testid="input-editar-titulo"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={objetivoEditado.descricao}
                        onChange={(e) => setObjetivoEditado({ ...objetivoEditado, descricao: e.target.value })}
                        placeholder="Descrição do objetivo (opcional)"
                        rows={3}
                        data-testid="input-editar-descricao"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prazo</Label>
                        <Input
                          value={objetivoEditado.prazo}
                          onChange={(e) => setObjetivoEditado({ ...objetivoEditado, prazo: e.target.value })}
                          placeholder="Ex: Q4 2025"
                          data-testid="input-editar-prazo"
                        />
                      </div>
                      <div>
                        <Label>Perspectiva BSC</Label>
                        <Select
                          value={objetivoEditado.perspectiva}
                          onValueChange={(value) => setObjetivoEditado({ ...objetivoEditado, perspectiva: value })}
                        >
                          <SelectTrigger data-testid="select-editar-perspectiva">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {perspectivas.map((p) => (
                              <SelectItem key={p.valor} value={p.valor}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Título:</p>
                      <p className="text-sm text-muted-foreground">{objetivoSelecionado.titulo}</p>
                    </div>
                    {objetivoSelecionado.descricao && (
                      <div>
                        <p className="text-sm font-medium">Descrição:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.descricao}</p>
                      </div>
                    )}
                    <div className="flex gap-6">
                      <div>
                        <p className="text-sm font-medium">Prazo:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.prazo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Perspectiva:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.perspectiva}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Resultados-Chave</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => gerarResultadosMutation.mutate(objetivoSelecionado.id)}
                    disabled={gerarResultadosMutation.isPending}
                    data-testid={`button-gerar-resultados-${objetivoSelecionado.id}`}
                  >
                    {gerarResultadosMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Gerar com IA
                  </Button>
                  <Dialog open={dialogNovoResultadoOpen} onOpenChange={setDialogNovoResultadoOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid={`button-add-resultado-${objetivoSelecionado.id}`}>
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
                            placeholder="Ex: Taxa de conversão"
                            value={novoResultado.metrica}
                            onChange={(e) => setNovoResultado({ ...novoResultado, metrica: e.target.value })}
                            data-testid="input-resultado-metrica"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Valor Inicial</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={novoResultado.valorInicial}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorInicial: e.target.value })}
                              data-testid="input-resultado-inicial"
                            />
                          </div>
                          <div>
                            <Label>Valor Atual</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={novoResultado.valorAtual}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorAtual: e.target.value })}
                              data-testid="input-resultado-atual"
                            />
                          </div>
                          <div>
                            <Label>Valor Alvo</Label>
                            <Input
                              type="number"
                              placeholder="100"
                              value={novoResultado.valorAlvo}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorAlvo: e.target.value })}
                              data-testid="input-resultado-alvo"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Responsável</Label>
                            <Input
                              placeholder="Nome do responsável"
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
                        </div>
                        <Button
                          onClick={handleCriarResultado}
                          className="w-full"
                          disabled={criarResultadoMutation.isPending}
                          data-testid="button-criar-resultado"
                        >
                          {criarResultadoMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Criar Resultado-Chave
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {resultadosChave.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum resultado-chave definido ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {resultadosChave.map((resultado) => {
                    const isEditing = editandoResultado?.id === resultado.id;
                    const progresso = calcularProgresso(resultado.valorInicial, resultado.valorAtual, resultado.valorAlvo);

                    return (
                      <Card key={resultado.id} className="p-4" data-testid={`card-resultado-${resultado.id}`}>
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <Label>Métrica</Label>
                              <Input
                                value={editandoResultado.metrica}
                                onChange={(e) => setEditandoResultado({ ...editandoResultado, metrica: e.target.value })}
                                data-testid={`input-edit-metrica-${resultado.id}`}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Inicial</Label>
                                <Input
                                  type="number"
                                  value={editandoResultado.valorInicial}
                                  onChange={(e) => setEditandoResultado({ ...editandoResultado, valorInicial: e.target.value })}
                                  data-testid={`input-edit-inicial-${resultado.id}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Atual</Label>
                                <Input
                                  type="number"
                                  value={editandoResultado.valorAtual}
                                  onChange={(e) => setEditandoResultado({ ...editandoResultado, valorAtual: e.target.value })}
                                  data-testid={`input-edit-atual-${resultado.id}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Alvo</Label>
                                <Input
                                  type="number"
                                  value={editandoResultado.valorAlvo}
                                  onChange={(e) => setEditandoResultado({ ...editandoResultado, valorAlvo: e.target.value })}
                                  data-testid={`input-edit-alvo-${resultado.id}`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Responsável</Label>
                                <Input
                                  value={editandoResultado.owner}
                                  onChange={(e) => setEditandoResultado({ ...editandoResultado, owner: e.target.value })}
                                  data-testid={`input-edit-owner-${resultado.id}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Prazo</Label>
                                <Input
                                  value={editandoResultado.prazo}
                                  onChange={(e) => setEditandoResultado({ ...editandoResultado, prazo: e.target.value })}
                                  data-testid={`input-edit-prazo-${resultado.id}`}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleEditarResultado}
                                disabled={editarResultadoMutation.isPending}
                                size="sm"
                                data-testid={`button-save-resultado-${resultado.id}`}
                              >
                                Salvar
                              </Button>
                              <Button
                                onClick={() => setEditandoResultado(null)}
                                variant="outline"
                                size="sm"
                                data-testid={`button-cancel-resultado-${resultado.id}`}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h5 className="font-semibold text-sm mb-1">{resultado.metrica}</h5>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Inicial: {resultado.valorInicial}</span>
                                  <span>Atual: {resultado.valorAtual}</span>
                                  <span>Alvo: {resultado.valorAlvo}</span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setEditandoResultado(resultado)}
                                  data-testid={`button-edit-resultado-${resultado.id}`}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => deletarResultadoMutation.mutate(resultado.id)}
                                  data-testid={`button-delete-resultado-${resultado.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-semibold">{Math.round(progresso)}%</span>
                              </div>
                              <Progress value={progresso} className="h-2" data-testid={`progress-resultado-${resultado.id}`} />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                              <span>Responsável: {resultado.owner}</span>
                              <span>Prazo: {resultado.prazo}</span>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

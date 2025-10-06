import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { SemaphoreBadge } from "@/components/SemaphoreBadge";
import { ExampleCard } from "@/components/ExampleCard";
import { Plus, Sparkles, Target as TargetIcon, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Objetivo } from "@shared/schema";
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
  const [novoObjetivo, setNovoObjetivo] = useState({ titulo: "", descricao: "", prazo: "" });

  // Buscar empresa
  const { data: empresa } = useQuery({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  // Buscar objetivos
  const { data: objetivos = [], isLoading } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
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
        // Criar objetivos automaticamente
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

  // Criar objetivo
  const criarObjetivoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/objetivos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
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
          {objetivos.map((objetivo) => (
            <Card key={objetivo.id} className="p-6" data-testid={`card-objetivo-${objetivo.id}`}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TargetIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletarObjetivoMutation.mutate(objetivo.id)}
                      data-testid={`button-delete-objetivo-${objetivo.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Próximo passo:</strong> Defina resultados-chave mensuráveis para este objetivo. 
                      Por exemplo: se o objetivo é "Aumentar rentabilidade", um resultado-chave poderia ser "Margem bruta crescer de 38% para 42%".
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

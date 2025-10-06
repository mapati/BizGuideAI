import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Save, Edit } from "lucide-react";
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

const blocosPadrao = [
  { 
    value: "parcerias_principais", 
    label: "Parcerias Principais", 
    hint: "Quem te ajuda?",
    description: "Liste seus principais parceiros e fornecedores estratégicos"
  },
  { 
    value: "atividades_principais", 
    label: "Atividades Principais", 
    hint: "O que você precisa fazer?",
    description: "Descreva as atividades mais importantes para operar"
  },
  { 
    value: "recursos_principais", 
    label: "Recursos Principais", 
    hint: "O que você precisa ter?",
    description: "Liste os recursos essenciais (físicos, financeiros, humanos)"
  },
  { 
    value: "proposta_valor", 
    label: "Proposta de Valor", 
    hint: "O que você oferece?",
    description: "Descreva o valor único que você entrega aos clientes"
  },
  { 
    value: "relacionamento_clientes", 
    label: "Relacionamento com Clientes", 
    hint: "Como se relaciona?",
    description: "Explique como você mantém relacionamento com clientes"
  },
  { 
    value: "canais", 
    label: "Canais", 
    hint: "Como entrega valor?",
    description: "Liste os canais de comunicação, venda e distribuição"
  },
  { 
    value: "segmentos_clientes", 
    label: "Segmentos de Clientes", 
    hint: "Quem são seus clientes?",
    description: "Identifique os diferentes grupos de clientes que você atende"
  },
  { 
    value: "estrutura_custos", 
    label: "Estrutura de Custos", 
    hint: "Quais são os custos?",
    description: "Liste os principais custos para operar o negócio"
  },
  { 
    value: "fontes_receita", 
    label: "Fontes de Receita", 
    hint: "Como ganha dinheiro?",
    description: "Descreva como você gera receita com cada segmento"
  },
];

export default function ModeloNegocio() {
  const { toast } = useToast();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [editingBloco, setEditingBloco] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSavingBlock, setIsSavingBlock] = useState(false);

  const { data: empresa } = useQuery<Empresa>({
    queryKey: ["/api/empresa"],
  });

  const { data: blocosData = [], isLoading } = useQuery<ModeloNegocio[]>({
    queryKey: [`/api/modelo-negocio/${empresa?.id}`],
    enabled: !!empresa?.id,
  });

  useEffect(() => {
    if (blocosData.length > 0) {
      const valores: Record<string, string> = {};
      blocosData.forEach((bloco) => {
        valores[bloco.bloco] = bloco.descricao;
      });
      setFormValues(valores);
    }
  }, [blocosData]);

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
      const novosValores: Record<string, string> = { ...formValues };
      
      sugestoes.forEach((sugestao: { bloco: string; descricao: string }) => {
        novosValores[sugestao.bloco] = sugestao.descricao;
      });

      setFormValues(novosValores);
      
      for (const sugestao of sugestoes) {
        const blocoExistente = blocosData.find(b => b.bloco === sugestao.bloco);
        
        if (blocoExistente) {
          await apiRequest("PATCH", `/api/modelo-negocio/${blocoExistente.id}`, {
            descricao: sugestao.descricao,
          });
        } else {
          await apiRequest("POST", "/api/modelo-negocio", {
            empresaId: empresa.id,
            bloco: sugestao.bloco,
            descricao: sugestao.descricao,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: [`/api/modelo-negocio/${empresa.id}`] });
      
      toast({
        title: "Modelo gerado!",
        description: "A IA preencheu os blocos com sucesso.",
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

  const handleOpenEdit = (blocoValue: string) => {
    setEditingBloco(blocoValue);
    setEditValue(formValues[blocoValue] || "");
  };

  const handleCloseEdit = () => {
    setEditingBloco(null);
    setEditValue("");
  };

  const handleSaveBlock = async () => {
    if (!empresa?.id || !editingBloco) return;

    setIsSavingBlock(true);
    try {
      const blocoExistente = blocosData.find(b => b.bloco === editingBloco);
      
      if (blocoExistente) {
        await apiRequest("PATCH", `/api/modelo-negocio/${blocoExistente.id}`, {
          descricao: editValue,
        });
      } else {
        await apiRequest("POST", "/api/modelo-negocio", {
          empresaId: empresa.id,
          bloco: editingBloco,
          descricao: editValue,
        });
      }

      setFormValues(prev => ({
        ...prev,
        [editingBloco]: editValue,
      }));

      queryClient.invalidateQueries({ queryKey: [`/api/modelo-negocio/${empresa.id}`] });
      
      toast({
        title: "Bloco salvo!",
        description: "As alterações foram salvas com sucesso.",
      });

      handleCloseEdit();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingBlock(false);
    }
  };

  const renderBlocoCard = (blocoValue: string, className?: string) => {
    const bloco = blocosPadrao.find(b => b.value === blocoValue);
    if (!bloco) return null;

    const conteudo = formValues[bloco.value];
    const isEmpty = !conteudo || conteudo.trim() === "";

    return (
      <Card 
        className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${className}`}
        onClick={() => handleOpenEdit(bloco.value)}
        data-testid={`card-bloco-${bloco.value}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">{bloco.label}</CardTitle>
              <CardDescription className="text-xs mt-1">{bloco.hint}</CardDescription>
            </div>
            <Edit className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <p className="text-sm text-muted-foreground italic">
              Clique para adicionar conteúdo...
            </p>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{conteudo}</p>
          )}
        </CardContent>
      </Card>
    );
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

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Carregando modelo...</p>
      </div>
    );
  }

  const blocosPreenchidos = blocosPadrao.filter(
    bloco => formValues[bloco.value] && formValues[bloco.value].trim() !== ""
  ).length;

  const editingBlocoInfo = blocosPadrao.find(b => b.value === editingBloco);

  return (
    <div>
      <PageHeader
        title="Modelo de Negócio (Canvas)"
        description="Visualize e edite os 9 blocos do Business Model Canvas. Clique em qualquer bloco para editar."
        tooltip="O Business Model Canvas é uma ferramenta visual para descrever, analisar e desenvolver modelos de negócio. Clique em cada bloco para adicionar ou editar o conteúdo."
        action={
          <Button
            variant="outline"
            onClick={handleSuggest}
            disabled={isSuggesting}
            data-testid="button-suggest-blocos"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isSuggesting ? "Gerando..." : "Gerar com IA"}
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Progresso: {blocosPreenchidos} de 9 blocos preenchidos
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {blocosPreenchidos === 9 
                  ? "✓ Todos os blocos preenchidos!"
                  : "Clique nos blocos para adicionar conteúdo."}
              </p>
            </div>
            <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(blocosPreenchidos / 9) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout responsivo: vertical em mobile/tablet, grid clássico do Canvas em desktop */}
      <div className="space-y-4 lg:hidden mb-6">
        {blocosPadrao.map((bloco) => (
          <div key={bloco.value}>
            {renderBlocoCard(bloco.value)}
          </div>
        ))}
      </div>

      <div 
        className="hidden lg:grid gap-4 mb-6"
        style={{
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "auto auto auto",
        }}
      >
        <div style={{ gridColumn: "1", gridRow: "1 / 3" }}>
          {renderBlocoCard("parcerias_principais", "h-full")}
        </div>

        <div style={{ gridColumn: "2", gridRow: "1" }}>
          {renderBlocoCard("atividades_principais")}
        </div>

        <div style={{ gridColumn: "3", gridRow: "1 / 3" }}>
          {renderBlocoCard("proposta_valor", "h-full")}
        </div>

        <div style={{ gridColumn: "4", gridRow: "1" }}>
          {renderBlocoCard("relacionamento_clientes")}
        </div>

        <div style={{ gridColumn: "5", gridRow: "1 / 3" }}>
          {renderBlocoCard("segmentos_clientes", "h-full")}
        </div>

        <div style={{ gridColumn: "2", gridRow: "2" }}>
          {renderBlocoCard("recursos_principais")}
        </div>

        <div style={{ gridColumn: "4", gridRow: "2" }}>
          {renderBlocoCard("canais")}
        </div>

        <div style={{ gridColumn: "1 / 3", gridRow: "3" }}>
          {renderBlocoCard("estrutura_custos")}
        </div>

        <div style={{ gridColumn: "3 / 6", gridRow: "3" }}>
          {renderBlocoCard("fontes_receita")}
        </div>
      </div>

      {/* Modal de edição */}
      <Dialog open={!!editingBloco} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-bloco">
          <DialogHeader>
            <DialogTitle>{editingBlocoInfo?.label}</DialogTitle>
            <DialogDescription>
              {editingBlocoInfo?.hint} - {editingBlocoInfo?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={`${editingBlocoInfo?.description}...`}
              className="min-h-[200px] resize-none"
              data-testid="textarea-edit-bloco"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEdit}
              disabled={isSavingBlock}
              data-testid="button-cancel-edit"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveBlock}
              disabled={isSavingBlock}
              data-testid="button-save-bloco"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSavingBlock ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

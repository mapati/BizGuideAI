import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save } from "lucide-react";
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
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

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
      
      toast({
        title: "Modelo gerado!",
        description: "A IA preencheu os blocos. Revise e salve as alterações.",
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

  const handleSave = async () => {
    if (!empresa?.id) {
      toast({
        title: "Erro",
        description: "Empresa não encontrada.",
        variant: "destructive",
      });
      return;
    }

    const blocosVazios = blocosPadrao.filter(
      bloco => !formValues[bloco.value] || formValues[bloco.value].trim() === ""
    );

    if (blocosVazios.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: `Por favor, preencha todos os 9 blocos do Canvas. Faltam: ${blocosVazios.map(b => b.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      for (const bloco of blocosPadrao) {
        const blocoExistente = blocosData.find(b => b.bloco === bloco.value);
        
        if (blocoExistente) {
          await apiRequest("PATCH", `/api/modelo-negocio/${blocoExistente.id}`, {
            descricao: formValues[bloco.value],
          });
        } else {
          await apiRequest("POST", "/api/modelo-negocio", {
            empresaId: empresa.id,
            bloco: bloco.value,
            descricao: formValues[bloco.value],
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: [`/api/modelo-negocio/${empresa.id}`] });
      
      toast({
        title: "Modelo salvo!",
        description: "Todos os blocos do seu modelo de negócio foram salvos com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (blocoValue: string, valor: string) => {
    setFormValues(prev => ({
      ...prev,
      [blocoValue]: valor,
    }));
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

  return (
    <div>
      <PageHeader
        title="Modelo de Negócio (Canvas)"
        description="Preencha os 9 blocos do Business Model Canvas para estruturar como sua empresa cria, entrega e captura valor."
        tooltip="O Business Model Canvas é uma ferramenta visual para descrever, analisar e desenvolver modelos de negócio. Todos os 9 blocos devem ser preenchidos."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSuggest}
              disabled={isSuggesting || isSaving}
              data-testid="button-suggest-blocos"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSuggesting ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isSuggesting}
              data-testid="button-save-modelo"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Modelo"}
            </Button>
          </div>
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
                  ? "✓ Todos os blocos preenchidos! Clique em Salvar para confirmar."
                  : "Preencha todos os 9 blocos para ter um modelo completo."}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {blocosPadrao.slice(0, 3).map((bloco) => (
            <Card key={bloco.value} data-testid={`card-bloco-${bloco.value}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bloco.label}</CardTitle>
                <CardDescription className="text-xs">{bloco.hint}</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor={bloco.value} className="text-xs text-muted-foreground">
                  {bloco.description}
                </Label>
                <Textarea
                  id={bloco.value}
                  placeholder={`Descreva ${bloco.label.toLowerCase()}...`}
                  value={formValues[bloco.value] || ""}
                  onChange={(e) => handleChange(bloco.value, e.target.value)}
                  className="min-h-[120px] mt-2"
                  data-testid={`textarea-${bloco.value}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {blocosPadrao.slice(3, 7).map((bloco) => (
            <Card key={bloco.value} data-testid={`card-bloco-${bloco.value}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bloco.label}</CardTitle>
                <CardDescription className="text-xs">{bloco.hint}</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor={bloco.value} className="text-xs text-muted-foreground">
                  {bloco.description}
                </Label>
                <Textarea
                  id={bloco.value}
                  placeholder={`Descreva ${bloco.label.toLowerCase()}...`}
                  value={formValues[bloco.value] || ""}
                  onChange={(e) => handleChange(bloco.value, e.target.value)}
                  className="min-h-[120px] mt-2"
                  data-testid={`textarea-${bloco.value}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {blocosPadrao.slice(7, 9).map((bloco) => (
            <Card key={bloco.value} data-testid={`card-bloco-${bloco.value}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bloco.label}</CardTitle>
                <CardDescription className="text-xs">{bloco.hint}</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor={bloco.value} className="text-xs text-muted-foreground">
                  {bloco.description}
                </Label>
                <Textarea
                  id={bloco.value}
                  placeholder={`Descreva ${bloco.label.toLowerCase()}...`}
                  value={formValues[bloco.value] || ""}
                  onChange={(e) => handleChange(bloco.value, e.target.value)}
                  className="min-h-[120px] mt-2"
                  data-testid={`textarea-${bloco.value}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          size="lg"
          onClick={handleSave}
          disabled={isSaving || isSuggesting || blocosPreenchidos < 9}
          data-testid="button-save-modelo-bottom"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Modelo Completo"}
        </Button>
      </div>
    </div>
  );
}

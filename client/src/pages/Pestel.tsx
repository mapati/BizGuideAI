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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { Compass, Plus, Sparkles, Trash2, Pencil, Globe, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
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

interface DimPesquisa {
  resumo: string;
  fontes: string[];
}

interface CenarioExterno {
  politico: DimPesquisa;
  economico: DimPesquisa;
  social: DimPesquisa;
  tecnologico: DimPesquisa;
  ambiental: DimPesquisa;
  legal: DimPesquisa;
}

type SuggestPhase = "idle" | "searching" | "generating";

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

const dimLabels: Record<string, string> = {
  politico: "Político",
  economico: "Econômico",
  social: "Social",
  tecnologico: "Tecnológico",
  ambiental: "Ambiental",
  legal: "Legal",
};

export default function Pestel() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [suggestPhase, setSuggestPhase] = useState<SuggestPhase>("idle");
  const [cenarioExterno, setCenarioExterno] = useState<CenarioExterno | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
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

    try {
      // Phase 1: Search external scenario
      setSuggestPhase("searching");
      setCenarioExterno(null);

      const cenario: CenarioExterno = await apiRequest("POST", "/api/ai/pesquisar-cenario-externo", {
        nomeEmpresa: empresa.nome,
        setor: empresa.setor,
        descricao: empresa.descricao,
      });

      setCenarioExterno(cenario);

      // Phase 2: Generate PESTEL factors using research context
      setSuggestPhase("generating");

      const response = await apiRequest("POST", "/api/ai/sugerir-pestel", {
        nomeEmpresa: empresa.nome,
        setor: empresa.setor,
        descricao: empresa.descricao,
        cenarioExterno: cenario,
      });

      const sugestoes = response.fatores || [];

      for (const sugestao of sugestoes) {
        await apiRequest("POST", "/api/fatores-pestel", {
          ...sugestao,
          empresaId: empresa.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/fatores-pestel", empresa.id] });
      setSourcesOpen(false);
      toast({
        title: "Análise concluída!",
        description: `${sugestoes.length} fatores gerados com base em pesquisa atual.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar análise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSuggestPhase("idle");
    }
  };

  const isSuggesting = suggestPhase !== "idle";

  const suggestButtonLabel = () => {
    if (suggestPhase === "searching") return "Pesquisando cenário...";
    if (suggestPhase === "generating") return "Gerando fatores...";
    return "Analisar com IA";
  };

  const suggestButtonIcon = () => {
    if (suggestPhase === "searching") return <Globe className="h-4 w-4 mr-2 animate-pulse" />;
    if (suggestPhase === "generating") return <Loader2 className="h-4 w-4 mr-2 animate-spin" />;
    return <Sparkles className="h-4 w-4 mr-2" />;
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
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleSuggest}
              disabled={isSuggesting || !empresa}
              data-testid="button-suggest-pestel"
            >
              {suggestButtonIcon()}
              {suggestButtonLabel()}
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

      {/* Progress indicator during AI analysis */}
      {isSuggesting && (
        <Card className="mt-6 p-6" data-testid="card-suggest-progress">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                suggestPhase === "searching"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}>
                <Globe className={`h-4 w-4 ${suggestPhase === "searching" ? "animate-pulse" : ""}`} />
                <span>Pesquisando notícias e tendências</span>
                {suggestPhase === "searching" && (
                  <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                )}
                {suggestPhase === "generating" && (
                  <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-semibold">Concluído</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                suggestPhase === "generating"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}>
                <Sparkles className={`h-4 w-4 ${suggestPhase === "generating" ? "animate-pulse" : ""}`} />
                <span>Gerando análise do cenário externo com IA</span>
                {suggestPhase === "generating" && (
                  <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {suggestPhase === "searching"
                ? "A IA está pesquisando notícias recentes sobre o cenário macroeconômico e setorial..."
                : "Usando a pesquisa para criar fatores relevantes e atualizados para sua empresa..."}
            </p>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="mt-6 p-8">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </Card>
      ) : fatores.length === 0 && !isSuggesting ? (
        <Card className="mt-6">
          <EmptyState
            icon={<Compass className="h-16 w-16" />}
            title="Comece mapeando o cenário externo"
            description="Identifique os fatores externos que impactam seu negócio: políticos, econômicos, sociais, tecnológicos, ambientais e legais. Entender o ambiente ao redor é o primeiro passo para decisões estratégicas fundamentadas. A IA pesquisa notícias e tendências atuais para gerar fatores relevantes para o seu setor automaticamente."
            actionLabel="Adicionar Primeiro Fator"
            onAction={() => setIsDialogOpen(true)}
          />
        </Card>
      ) : fatores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {fatores.map((fator) => (
            <Card key={fator.id} className="p-6 hover-elevate" data-testid={`card-fator-${fator.id}`}>
              <div className="flex items-start justify-between mb-3 gap-1">
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
      ) : null}

      {/* Research sources panel — rendered below the factors list */}
      {cenarioExterno && !isSuggesting && (
        <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen} className="mt-6">
          <Card className="p-0 overflow-hidden">
            <CollapsibleTrigger asChild>
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium hover-elevate text-left"
                data-testid="button-toggle-sources"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Ver fontes pesquisadas pela IA</span>
                  <Badge variant="secondary" className="text-xs">
                    {Object.keys(cenarioExterno).length} dimensões
                  </Badge>
                </div>
                {sourcesOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6 pt-0 border-t">
                <p className="text-xs text-muted-foreground mb-4 pt-4">
                  Resumo do cenário externo pesquisado pela IA e usado como base para identificar os fatores relevantes para a sua empresa.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(cenarioExterno).map(([dim, data]) => (
                    <div key={dim} className="rounded-md border bg-muted/20 p-4" data-testid={`source-dim-${dim}`}>
                      <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                        {dimLabels[dim] || dim}
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed mb-3 line-clamp-4">
                        {data.resumo}
                      </p>
                      {data.fontes && data.fontes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {data.fontes.map((fonte, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-background/60 border rounded px-2 py-0.5"
                              data-testid={`source-tag-${dim}-${i}`}
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              {fonte}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}

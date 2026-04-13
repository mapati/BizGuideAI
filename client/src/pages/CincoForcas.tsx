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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import {
  Layers, Plus, Sparkles, Trash2, Pencil,
  Globe, ChevronDown, ChevronUp, ExternalLink, Loader2,
} from "lucide-react";
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

interface ForcaPesquisa {
  resumo: string;
  fontes: string[];
}

type ForcaKey =
  | "rivalidade_concorrentes"
  | "poder_fornecedores"
  | "poder_clientes"
  | "ameaca_novos_entrantes"
  | "ameaca_substitutos";

type MercadoPesquisado = Record<ForcaKey, ForcaPesquisa>;

type SuggestPhase = "idle" | "searching" | "generating";

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

const forcaLabels: Record<ForcaKey, string> = {
  rivalidade_concorrentes: "Rivalidade entre Concorrentes",
  poder_fornecedores: "Poder dos Fornecedores",
  poder_clientes: "Poder dos Clientes",
  ameaca_novos_entrantes: "Ameaça de Novos Entrantes",
  ameaca_substitutos: "Ameaça de Substitutos",
};

export default function CincoForcasPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [suggestPhase, setSuggestPhase] = useState<SuggestPhase>("idle");
  const [mercadoPesquisado, setMercadoPesquisado] = useState<MercadoPesquisado | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [formData, setFormData] = useState({
    forca: "",
    descricao: "",
    intensidade: "média" as "alta" | "média" | "baixa",
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

    try {
      // Fase 1 — pesquisar mercado e concorrentes em tempo real
      setSuggestPhase("searching");
      setMercadoPesquisado(null);

      const mercado: MercadoPesquisado = await apiRequest("POST", "/api/ai/pesquisar-mercado", {
        nomeEmpresa: empresa.nome,
        setor: empresa.setor,
        descricao: empresa.descricao,
      });

      setMercadoPesquisado(mercado);

      // Fase 2 — gerar as cinco forças usando o contexto pesquisado
      setSuggestPhase("generating");

      const response = await apiRequest("POST", "/api/ai/sugerir-cinco-forcas", {
        nomeEmpresa: empresa.nome,
        setor: empresa.setor,
        descricao: empresa.descricao,
        mercadoPesquisado: mercado,
      });

      const sugestoes: Array<{
        forca: string;
        descricao: string;
        intensidade: "alta" | "média" | "baixa";
        impacto: string;
      }> = response.forcas || [];

      for (const sugestao of sugestoes) {
        await apiRequest("POST", "/api/cinco-forcas", {
          ...sugestao,
          empresaId: empresa.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/cinco-forcas", empresa.id] });
      setSourcesOpen(false);
      toast({
        title: "Análise concluída!",
        description: `${sugestoes.length} forças geradas com base em pesquisa atual do mercado.`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao gerar análise";
      toast({
        title: "Erro ao gerar análise",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSuggestPhase("idle");
    }
  };

  const isSuggesting = suggestPhase !== "idle";

  const suggestButtonLabel = () => {
    if (suggestPhase === "searching") return "Pesquisando mercado...";
    if (suggestPhase === "generating") return "Gerando análise...";
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
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleSuggest}
              disabled={isSuggesting}
              data-testid="button-suggest-forcas"
            >
              {suggestButtonIcon()}
              {suggestButtonLabel()}
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
                <span>Pesquisando concorrentes e mercado</span>
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
                <span>Gerando análise das Cinco Forças com IA</span>
                {suggestPhase === "generating" && (
                  <Loader2 className="h-3 w-3 ml-auto animate-spin" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {suggestPhase === "searching"
                ? "Pesquisando concorrentes e mercado..."
                : "Gerando análise com base na pesquisa..."}
            </p>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando análises...</p>
        </div>
      ) : forcasData.length === 0 && !isSuggesting ? (
        <EmptyState
          icon={<Layers className="h-16 w-16" />}
          title="Analise as forças que moldam seu mercado"
          description="O modelo de Cinco Forças de Porter avalia rivalidade entre concorrentes, ameaça de novos entrantes, poder de fornecedores e clientes, e ameaça de substitutos. Essa análise revela onde sua empresa tem vantagem e onde está vulnerável. A IA pesquisa concorrentes e tendências do setor para gerar uma análise completa e embasada."
        />
      ) : forcasData.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 mt-6">
          {forcasData.map((forca) => (
            <Card key={forca.id} className="p-6 hover-elevate" data-testid={`card-forca-${forca.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
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
      ) : null}

      {/* Research sources panel — rendered below the forces list */}
      {mercadoPesquisado && !isSuggesting && (
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
                    {Object.keys(mercadoPesquisado).length} forças
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
                  Resumo do contexto de mercado e concorrência pesquisado pela IA e usado como base para gerar as Cinco Forças da sua empresa.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(mercadoPesquisado) as Array<[ForcaKey, ForcaPesquisa]>).map(([forca, dados]) => (
                    <div key={forca} className="rounded-md border bg-muted/20 p-4" data-testid={`source-forca-${forca}`}>
                      <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                        {forcaLabels[forca] || forca}
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed mb-3 line-clamp-4">
                        {dados.resumo}
                      </p>
                      {dados.fontes && dados.fontes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {dados.fontes.map((fonte, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-background/60 border rounded px-2 py-0.5"
                              data-testid={`source-tag-${forca}-${i}`}
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

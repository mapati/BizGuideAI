import { useState, useEffect } from "react";
import { useDeepLinkDialog } from "@/hooks/useDeepLinkDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { Target, Plus, Sparkles, Trash2, TrendingUp, TrendingDown, AlertTriangle, Zap, Pencil, FileText, Settings2, Lock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";

interface AnaliseSwot {
  id: string;
  empresaId: string;
  tipo: "forca" | "fraqueza" | "oportunidade" | "ameaca";
  descricao: string;
  impacto: "alto" | "médio" | "baixo";
}

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

const SWOT_THEME: Record<
  TipoSwot,
  {
    label: string;
    sublabel: string;
    icon: typeof TrendingUp;
    iconBg: string;
    iconText: string;
    borderTop: string;
    headerBg: string;
    accentText: string;
  }
> = {
  forca: {
    label: "Forças",
    sublabel: "Pontos fortes internos",
    icon: TrendingUp,
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    iconText: "text-emerald-700 dark:text-emerald-300",
    borderTop: "border-t-4 border-t-emerald-500 dark:border-t-emerald-600",
    headerBg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    accentText: "text-emerald-700 dark:text-emerald-300",
  },
  fraqueza: {
    label: "Fraquezas",
    sublabel: "Pontos a melhorar internamente",
    icon: TrendingDown,
    iconBg: "bg-rose-100 dark:bg-rose-950",
    iconText: "text-rose-700 dark:text-rose-300",
    borderTop: "border-t-4 border-t-rose-500 dark:border-t-rose-600",
    headerBg: "bg-rose-50/60 dark:bg-rose-950/30",
    accentText: "text-rose-700 dark:text-rose-300",
  },
  oportunidade: {
    label: "Oportunidades",
    sublabel: "Tendências externas favoráveis",
    icon: Zap,
    iconBg: "bg-sky-100 dark:bg-sky-950",
    iconText: "text-sky-700 dark:text-sky-300",
    borderTop: "border-t-4 border-t-sky-500 dark:border-t-sky-600",
    headerBg: "bg-sky-50/60 dark:bg-sky-950/30",
    accentText: "text-sky-700 dark:text-sky-300",
  },
  ameaca: {
    label: "Ameaças",
    sublabel: "Riscos e ameaças do mercado",
    icon: AlertTriangle,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconText: "text-amber-700 dark:text-amber-300",
    borderTop: "border-t-4 border-t-amber-500 dark:border-t-amber-600",
    headerBg: "bg-amber-50/60 dark:bg-amber-950/30",
    accentText: "text-amber-700 dark:text-amber-300",
  },
};

const TIPOS_SWOT = [
  { value: "forca",        label: "Forças",        desc: "Pontos fortes internos" },
  { value: "fraqueza",     label: "Fraquezas",     desc: "Pontos fracos internos" },
  { value: "oportunidade", label: "Oportunidades", desc: "Oportunidades externas" },
  { value: "ameaca",       label: "Ameaças",       desc: "Riscos externos" },
] as const;

type TipoSwot = typeof TIPOS_SWOT[number]["value"];

type FonteId = "documento" | "pestel" | "cincoForcas" | "modeloNegocio" | "indicadores" | "objetivos" | "estrategias";

const FONTES_CONFIG: { id: FonteId; label: string; desc: string; grupo: "interna" | "externa" }[] = [
  { id: "documento",      label: "Documento estratégico",     desc: "PDF carregado",             grupo: "interna" },
  { id: "modeloNegocio",  label: "Modelo de Negócio",         desc: "Estrutura do negócio",      grupo: "interna" },
  { id: "indicadores",    label: "Indicadores",               desc: "Métricas e metas",          grupo: "interna" },
  { id: "objetivos",      label: "Metas e Resultados",        desc: "Objetivos estratégicos",    grupo: "interna" },
  { id: "estrategias",    label: "Estratégias e Iniciativas", desc: "Plano de ação",             grupo: "interna" },
  { id: "pestel",         label: "Cenário Externo",           desc: "Fatores macro",             grupo: "externa" },
  { id: "cincoForcas",    label: "Mercado e concorrência",    desc: "Análise de mercado",        grupo: "externa" },
];

const FONTES_INTERNAS = FONTES_CONFIG.filter((f) => f.grupo === "interna");
const FONTES_EXTERNAS = FONTES_CONFIG.filter((f) => f.grupo === "externa");

export default function Swot() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isSuggestingComplete, setIsSuggestingComplete] = useState(false);
  const [isSuggestingModal, setIsSuggestingModal] = useState(false);
  const [formData, setFormData] = useState<{
    tipo: string;
    descricao: string;
    impacto: "alto" | "médio" | "baixo";
  }>({
    tipo: "",
    descricao: "",
    impacto: "médio",
  });

  const [isAiParamsOpen, setIsAiParamsOpen] = useState(false);
  const [tiposSelecionados, setTiposSelecionados] = useState<Record<TipoSwot, boolean>>({
    forca: true,
    fraqueza: true,
    oportunidade: true,
    ameaca: true,
  });
  const [quantidadePorTipo, setQuantidadePorTipo] = useState<Record<TipoSwot, number>>({
    forca: 1,
    fraqueza: 1,
    oportunidade: 1,
    ameaca: 1,
  });
  const [instrucaoAdicional, setInstrucaoAdicional] = useState("");
  const [fontesContexto, setFontesContexto] = useState<Record<FonteId, boolean>>({
    documento: true,
    pestel: true,
    cincoForcas: true,
    modeloNegocio: true,
    indicadores: true,
    objetivos: true,
    estrategias: true,
  });

  const tipos = [
    { value: "forca", label: "Força", desc: "Algo que sua empresa faz bem" },
    { value: "fraqueza", label: "Fraqueza", desc: "Algo que precisa melhorar" },
    { value: "oportunidade", label: "Oportunidade", desc: "Possibilidade externa favorável" },
    { value: "ameaca", label: "Ameaça", desc: "Risco externo ao negócio" },
  ];

  const { data: empresa } = useQuery<{ id: string; nome: string; setor: string; tamanho: string; descricao?: string | null }>({
    queryKey: ["/api/empresa"],
  });

  const { data: analises = [], isLoading } = useQuery<AnaliseSwot[]>({
    queryKey: ["/api/analise-swot", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: fatoresPestel = [] } = useQuery<any[]>({
    queryKey: ["/api/fatores-pestel", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: cincoForcasData = [] } = useQuery<any[]>({
    queryKey: ["/api/cinco-forcas", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: contextSummary } = useQuery<{
    counts: Record<FonteId, number>;
    temDocumento: boolean;
    nomeDocumento: string | null;
  }>({
    queryKey: ["/api/ai/swot-context-summary"],
    enabled: !!empresa?.id,
  });

  useEffect(() => {
    if (contextSummary) {
      setFontesContexto((prev) => {
        const next = { ...prev };
        FONTES_CONFIG.forEach((fonte) => {
          if (fonte.id === "documento") {
            if (!contextSummary.temDocumento) next[fonte.id] = false;
          } else {
            if ((contextSummary.counts?.[fonte.id] ?? 0) === 0) {
              next[fonte.id] = false;
            }
          }
        });
        return next;
      });
    }
  }, [contextSummary]);

  const criarAnaliseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/analise-swot", { ...data, empresaId: empresa.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa?.id] });
      toast({
        title: "Item adicionado!",
        description: "A análise foi salva com sucesso.",
      });
      setFormData({ tipo: "", descricao: "", impacto: "médio" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editarAnaliseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/analise-swot/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa?.id] });
      toast({
        title: "Item atualizado!",
        description: "A análise foi atualizada com sucesso.",
      });
      setFormData({ tipo: "", descricao: "", impacto: "médio" });
      setEditandoId(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarAnaliseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/analise-swot/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa?.id] });
      toast({
        title: "Item removido",
        description: "A análise foi excluída.",
      });
    },
  });

  const handleSaveAnalise = () => {
    if (!formData.tipo || !formData.descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    if (editandoId) {
      editarAnaliseMutation.mutate({ id: editandoId, data: formData });
    } else {
      criarAnaliseMutation.mutate(formData);
    }
  };

  const handleEditAnalise = (analise: AnaliseSwot) => {
    setEditandoId(analise.id);
    setFormData({
      tipo: analise.tipo,
      descricao: analise.descricao,
      impacto: analise.impacto,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditandoId(null);
      setFormData({ tipo: "", descricao: "", impacto: "médio" });
    }
  };

  useDeepLinkDialog(!!empresa?.id && !isLoading, ({ editar }) => {
    if (!editar) return;
    const found = analises.find((a) => a.id === editar);
    if (!found) return false;
    handleEditAnalise(found);
    return true;
  });

  const handleSuggestModal = async () => {
    if (!empresa) {
      toast({
        title: "Perfil não encontrado",
        description: "Complete o perfil da empresa primeiro.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tipo) {
      toast({
        title: "Tipo não selecionado",
        description: "Selecione o tipo de análise primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsSuggestingModal(true);
    try {
      const response = await apiRequest("POST", "/api/ai/sugerir-swot-individual", {
        empresaId: empresa.id,
        tipo: formData.tipo,
      });

      if (response.descricao) {
        setFormData(prev => ({
          ...prev,
          descricao: response.descricao,
          impacto: response.impacto || "médio",
        }));
        
        toast({
          title: "Sugestão gerada!",
          description: "Revise o texto e ajuste se necessário antes de salvar.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar sugestão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSuggestingModal(false);
    }
  };

  const handleSuggestComplete = async () => {
    if (!empresa) {
      toast({
        title: "Perfil não encontrado",
        description: "Complete o perfil da empresa primeiro.",
        variant: "destructive",
      });
      return;
    }

    const tiposSelecionadosArray = (Object.keys(tiposSelecionados) as TipoSwot[]).filter(
      (t) => tiposSelecionados[t]
    );

    if (tiposSelecionadosArray.length === 0) {
      toast({
        title: "Nenhum quadrante selecionado",
        description: "Selecione pelo menos um tipo de análise para gerar.",
        variant: "destructive",
      });
      return;
    }

    setIsAiParamsOpen(false);
    setIsSuggestingComplete(true);
    try {
      const fontesArray: string[] = [
        "perfil",
        ...(Object.keys(fontesContexto) as FonteId[]).filter((f) => fontesContexto[f]),
      ];
      const response = await apiRequest("POST", "/api/ai/sugerir-swot-completo", {
        empresaId: empresa.id,
        tiposSelecionados: tiposSelecionadosArray,
        quantidadePorTipo,
        instrucaoAdicional: instrucaoAdicional.trim(),
        fontesContexto: fontesArray,
      });

      const itens = response.itens || [];

      if (itens.length === 0) {
        throw new Error("A IA não retornou nenhum item.");
      }

      const analiseExistente = analises.map(a => a.descricao.toLowerCase().trim());
      const itensNaoduplicados = itens.filter((item: any) =>
        !analiseExistente.includes(item.descricao.toLowerCase().trim())
      );

      if (itensNaoduplicados.length === 0) {
        toast({
          title: "Nenhum item novo",
          description: "Todos os itens sugeridos pela IA já existem na análise.",
          variant: "destructive",
        });
        return;
      }

      let adicionados = 0;
      const adicionadosPorTipo: Record<string, number> = {};
      for (const item of itensNaoduplicados) {
        try {
          await apiRequest("POST", "/api/analise-swot", {
            ...item,
            empresaId: empresa.id,
          });
          adicionados++;
          adicionadosPorTipo[item.tipo] = (adicionadosPorTipo[item.tipo] || 0) + 1;
        } catch (err: any) {
          console.error(`Erro ao salvar item ${item.tipo}:`, err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/analise-swot", empresa.id] });

      if (adicionados > 0) {
        const resumoTipos = Object.entries(adicionadosPorTipo)
          .map(([tipo, n]) => {
            const label = { forca: "força", fraqueza: "fraqueza", oportunidade: "oportunidade", ameaca: "ameaça" }[tipo];
            return `${n} ${label}`;
          })
          .join(", ");
        toast({
          title: "Análise gerada com sucesso!",
          description: `Adicionados: ${resumoTipos}.`,
        });
      } else {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar os itens sugeridos.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar análise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSuggestingComplete(false);
    }
  };

  const agruparPorTipo = () => {
    return {
      forca: analises.filter((a) => a.tipo === "forca"),
      fraqueza: analises.filter((a) => a.tipo === "fraqueza"),
      oportunidade: analises.filter((a) => a.tipo === "oportunidade"),
      ameaca: analises.filter((a) => a.tipo === "ameaca"),
    };
  };

  if (!empresa) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Complete seu perfil primeiro</h2>
          <p className="text-muted-foreground mb-6">
            Para começar a análise de forças e fraquezas, você precisa completar o perfil da sua empresa.
          </p>
          <Button onClick={() => window.location.href = "/onboarding"} data-testid="button-ir-onboarding">
            Ir para Onboarding
          </Button>
        </Card>
      </div>
    );
  }

  const grupos = agruparPorTipo();

  const semExternos = empresa && fatoresPestel.length === 0 && cincoForcasData.length === 0 && analises.length === 0;

  return (
    <div className="max-w-6xl mx-auto">
      {semExternos && (
        <PrerequisiteWarning
          titulo="Enriqueça seu diagnóstico com dados do ambiente externo"
          descricao="Você ainda não tem fatores do cenário externo nem análise de mercado. Preencher essas seções antes ajuda a identificar oportunidades e ameaças com mais precisão."
          linkLabel="Analisar cenário externo"
          linkHref="/pestel"
          variante="info"
        />
      )}
      <PageHeader
        title="Forças e Fraquezas"
        description="Identifique o que sua empresa faz bem (forças), o que precisa melhorar (fraquezas), oportunidades externas e ameaças que você enfrenta."
        tooltip="Esta análise ajuda a entender seus pontos fortes internos e fracos, além das oportunidades e riscos do mercado."
        action={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setIsAiParamsOpen(true)}
              disabled={isSuggestingComplete}
              data-testid="button-suggest-complete"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSuggestingComplete ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-analise">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editandoId ? "Editar Análise" : "Nova Análise"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="tipo">Tipo de Análise</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger data-testid="select-tipo-analise">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label} - {tipo.desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.tipo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestModal}
                      disabled={isSuggestingModal}
                      className="mt-2 w-full"
                      data-testid="button-suggest-modal"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isSuggestingModal ? "Gerando sugestão..." : "Gerar com IA"}
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descreva de forma clara e objetiva"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="min-h-[100px]"
                    data-testid="textarea-descricao-analise"
                  />
                </div>

                <div>
                  <Label htmlFor="impacto">Nível de Impacto</Label>
                  <Select value={formData.impacto} onValueChange={(value: any) => setFormData({ ...formData, impacto: value })}>
                    <SelectTrigger data-testid="select-impacto-analise">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="médio">Médio</SelectItem>
                      <SelectItem value="baixo">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleCloseDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAnalise}
                  disabled={criarAnaliseMutation.isPending || editarAnaliseMutation.isPending}
                  data-testid="button-salvar-analise"
                >
                  {editandoId ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <Dialog open={isAiParamsOpen} onOpenChange={setIsAiParamsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Gerar diagnóstico com IA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2 overflow-y-auto max-h-[70vh] pr-1">
            {contextSummary?.temDocumento && (
              <Alert data-testid="alert-documento-disponivel">
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Documento estratégico disponível:</span> {contextSummary.nomeDocumento}. Use as instruções abaixo para direcionar a IA às seções mais relevantes.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label className="text-sm font-medium mb-3 block">Quadrantes a gerar</Label>
              <div className="space-y-3">
                {TIPOS_SWOT.map((tipo) => (
                  <div key={tipo.value} className="flex items-center justify-between gap-4" data-testid={`row-tipo-${tipo.value}`}>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`check-${tipo.value}`}
                        checked={tiposSelecionados[tipo.value]}
                        onCheckedChange={(checked) =>
                          setTiposSelecionados((prev) => ({ ...prev, [tipo.value]: !!checked }))
                        }
                        data-testid={`checkbox-tipo-${tipo.value}`}
                      />
                      <label htmlFor={`check-${tipo.value}`} className="text-sm cursor-pointer select-none">
                        <span className="font-medium">{tipo.label}</span>
                        <span className="text-muted-foreground ml-1">— {tipo.desc}</span>
                      </label>
                    </div>
                    {tiposSelecionados[tipo.value] && (
                      <Select
                        value={String(quantidadePorTipo[tipo.value])}
                        onValueChange={(val) =>
                          setQuantidadePorTipo((prev) => ({ ...prev, [tipo.value]: Number(val) }))
                        }
                      >
                        <SelectTrigger className="w-20 shrink-0" data-testid={`select-qtd-${tipo.value}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? "item" : "itens"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium block mb-3">
                Focos da análise
                {!contextSummary && <span className="ml-2 text-xs font-normal text-muted-foreground">(carregando…)</span>}
              </Label>

              {/* Helper to render a fonte row */}
              {(() => {
                const renderFonteRow = (fonte: typeof FONTES_CONFIG[number]) => {
                  const isDocumento = fonte.id === "documento";
                  const isDisabled = isDocumento
                    ? !contextSummary?.temDocumento
                    : (contextSummary?.counts?.[fonte.id] ?? 0) === 0;
                  const count = isDocumento ? null : (contextSummary?.counts?.[fonte.id] ?? 0);
                  if (isDocumento && !contextSummary?.temDocumento) return null;
                  return (
                    <div
                      key={fonte.id}
                      className={`flex items-center justify-between gap-2 py-1 ${isDisabled ? "opacity-50" : ""}`}
                      data-testid={`row-fonte-${fonte.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`fonte-${fonte.id}`}
                          checked={fontesContexto[fonte.id] && !isDisabled}
                          disabled={isDisabled}
                          onCheckedChange={(checked) =>
                            !isDisabled && setFontesContexto((prev) => ({ ...prev, [fonte.id]: !!checked }))
                          }
                          data-testid={`checkbox-fonte-${fonte.id}`}
                        />
                        <label
                          htmlFor={`fonte-${fonte.id}`}
                          className={`text-sm select-none ${isDisabled ? "cursor-default" : "cursor-pointer"}`}
                        >
                          <span className="font-medium">{fonte.label}</span>
                          <span className="text-muted-foreground ml-1">— {fonte.desc}</span>
                        </label>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {isDocumento ? "disponível" : `${count} ${count === 1 ? "item" : "itens"}`}
                      </Badge>
                    </div>
                  );
                };

                const toggleGrupo = (fontes: typeof FONTES_CONFIG, value: boolean) =>
                  setFontesContexto((prev) => {
                    const next = { ...prev };
                    fontes.forEach((f) => {
                      const isEmpty = f.id === "documento"
                        ? !contextSummary?.temDocumento
                        : (contextSummary?.counts?.[f.id] ?? 0) === 0;
                      if (!isEmpty) next[f.id] = value;
                    });
                    return next;
                  });

                return (
                  <div className="space-y-4">
                    {/* ── GRUPO INTERNO ── */}
                    <div className="rounded-md border p-3 space-y-1">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Análise Interna</p>
                          <p className="text-xs text-muted-foreground">Forças e Fraquezas (fatores internos)</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => toggleGrupo(FONTES_INTERNAS, false)} data-testid="button-limpar-internas">Limpar</Button>
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => toggleGrupo(FONTES_INTERNAS, true)} data-testid="button-selecionar-internas">Selecionar todas</Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-1" data-testid="row-fonte-perfil">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">Perfil da empresa</span>
                          <span className="text-xs text-muted-foreground">— sempre incluído</span>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">ativo</Badge>
                      </div>
                      {FONTES_INTERNAS.map(renderFonteRow)}
                    </div>

                    {/* ── GRUPO EXTERNO ── */}
                    <div className="rounded-md border p-3 space-y-1">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Análise Externa</p>
                          <p className="text-xs text-muted-foreground">Oportunidades e Ameaças (fatores externos)</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => toggleGrupo(FONTES_EXTERNAS, false)} data-testid="button-limpar-externas">Limpar</Button>
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => toggleGrupo(FONTES_EXTERNAS, true)} data-testid="button-selecionar-externas">Selecionar todas</Button>
                        </div>
                      </div>
                      {FONTES_EXTERNAS.map(renderFonteRow)}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <Label htmlFor="instrucao-adicional" className="text-sm font-medium mb-1 block">
                Instruções adicionais <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="instrucao-adicional"
                placeholder={contextSummary?.temDocumento
                  ? "Ex: Identifique fraquezas mencionadas no documento estratégico, especialmente nas seções de riscos financeiros e operacionais."
                  : "Ex: Foque em riscos relacionados à dependência de poucos clientes e à falta de processos documentados."}
                value={instrucaoAdicional}
                onChange={(e) => setInstrucaoAdicional(e.target.value)}
                className="min-h-[90px] resize-none text-sm"
                data-testid="textarea-instrucao-adicional"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAiParamsOpen(false)} data-testid="button-cancelar-ai-params">
              Cancelar
            </Button>
            <Button
              onClick={handleSuggestComplete}
              disabled={isSuggestingComplete || !Object.values(tiposSelecionados).some(Boolean)}
              data-testid="button-confirmar-gerar-ia"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isSuggestingComplete ? "Gerando..." : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExampleCard>
        <strong>Força:</strong> Temos uma equipe técnica altamente qualificada com 15 anos de experiência média. <strong>Impacto: Alto</strong>
      </ExampleCard>

      {isLoading ? (
        <Card className="mt-6 p-8">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </Card>
      ) : analises.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<Target className="h-16 w-16" />}
            title="Identifique o que diferencia sua empresa"
            description="Mapeie o que sua empresa faz bem (forças), o que precisa melhorar (fraquezas), as tendências favoráveis (oportunidades) e os riscos do mercado (ameaças). É a síntese estratégica mais importante do planejamento. A IA cruza seus dados de cenário externo, mercado e modelo de negócio para sugerir itens altamente contextualizados."
            actionLabel="Adicionar Primeiro Item"
            onAction={() => setIsDialogOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          {(["forca", "fraqueza", "oportunidade", "ameaca"] as TipoSwot[]).map((tipo) => {
            const theme = SWOT_THEME[tipo];
            const items = grupos[tipo];
            const Icon = theme.icon;
            return (
              <Card
                key={tipo}
                className={`overflow-hidden ${theme.borderTop} flex flex-col`}
                data-testid={`card-grupo-${tipo}`}
              >
                <div className={`flex items-center gap-3 px-5 py-4 border-b ${theme.headerBg}`}>
                  <div
                    className={`h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0 ${theme.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${theme.iconText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-semibold ${theme.accentText}`}>
                        {theme.label}
                      </h3>
                      <Badge variant="outline" className="font-normal">
                        {items.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {theme.sublabel}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-2.5 flex-1">
                  {items.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6">
                      Nenhum item adicionado ainda
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-card border rounded-md hover-elevate group"
                        data-testid={`item-analise-${item.id}`}
                      >
                        <p className="text-sm leading-relaxed break-words" data-testid={`text-analise-${item.id}`}>
                          {item.descricao}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-2.5 flex-wrap">
                          <ImpactBadge impact={item.impacto} />
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditAnalise(item)}
                              data-testid={`button-edit-analise-${item.id}`}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => deletarAnaliseMutation.mutate(item.id)}
                              data-testid={`button-delete-analise-${item.id}`}
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

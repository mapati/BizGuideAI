import { useState } from "react";
import { useDeepLinkDialog } from "@/hooks/useDeepLinkDialog";
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
import { TrendingUp, Plus, Sparkles, Trash2, Pencil, Target, Users, Package, Rocket, Wand2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";
import { OrigemSelector } from "@/components/OrigemSelector";
import { CascataBlock } from "@/components/CascataBlock";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import type { Estrategia, Iniciativa, OportunidadeCrescimento as OportunidadeCrescimentoType, AIGenerationParams } from "@shared/schema";

interface OportunidadeCrescimento {
  id: string;
  empresaId: string;
  tipo: "penetracao_mercado" | "desenvolvimento_mercado" | "desenvolvimento_produto" | "diversificacao";
  titulo: string;
  descricao: string;
  potencial: "alto" | "médio" | "baixo";
  risco: "alto" | "médio" | "baixo";
  estrategiaId?: string | null;
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

type TipoAnsoff = "penetracao_mercado" | "desenvolvimento_mercado" | "desenvolvimento_produto" | "diversificacao";

const ANSOFF_THEME: Record<
  TipoAnsoff,
  {
    icon: typeof Target;
    iconBg: string;
    iconText: string;
    borderTop: string;
    headerBg: string;
    accentText: string;
  }
> = {
  penetracao_mercado: {
    icon: Target,
    iconBg: "bg-sky-100 dark:bg-sky-950",
    iconText: "text-sky-700 dark:text-sky-300",
    borderTop: "border-t-4 border-t-sky-500 dark:border-t-sky-600",
    headerBg: "bg-sky-50/60 dark:bg-sky-950/30",
    accentText: "text-sky-700 dark:text-sky-300",
  },
  desenvolvimento_mercado: {
    icon: Users,
    iconBg: "bg-violet-100 dark:bg-violet-950",
    iconText: "text-violet-700 dark:text-violet-300",
    borderTop: "border-t-4 border-t-violet-500 dark:border-t-violet-600",
    headerBg: "bg-violet-50/60 dark:bg-violet-950/30",
    accentText: "text-violet-700 dark:text-violet-300",
  },
  desenvolvimento_produto: {
    icon: Package,
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    iconText: "text-emerald-700 dark:text-emerald-300",
    borderTop: "border-t-4 border-t-emerald-500 dark:border-t-emerald-600",
    headerBg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    accentText: "text-emerald-700 dark:text-emerald-300",
  },
  diversificacao: {
    icon: Rocket,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconText: "text-amber-700 dark:text-amber-300",
    borderTop: "border-t-4 border-t-amber-500 dark:border-t-amber-600",
    headerBg: "bg-amber-50/60 dark:bg-amber-950/30",
    accentText: "text-amber-700 dark:text-amber-300",
  },
};

const TipoIcon = ({ tipo, className = "h-5 w-5" }: { tipo: string; className?: string }) => {
  const cfg = ANSOFF_THEME[tipo as TipoAnsoff];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return <Icon className={`${className} ${cfg.iconText}`} />;
};

export default function OportunidadesCrescimento() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    tipo: string;
    titulo: string;
    descricao: string;
    potencial: "alto" | "médio" | "baixo";
    risco: "alto" | "médio" | "baixo";
    estrategiaId: string;
  }>({
    tipo: "",
    titulo: "",
    descricao: "",
    potencial: "médio",
    risco: "médio",
    estrategiaId: "",
  });
  const { jornadaConcluida } = useJornadaProgresso();
  const origemObrigatoria = !jornadaConcluida;

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

  const { data: empresa } = useQuery<{ id: string; nome: string; setor: string; tamanho: string; descricao?: string | null }>({
    queryKey: ["/api/empresa"],
  });

  const { data: oportunidades = [], isLoading } = useQuery<OportunidadeCrescimento[]>({
    queryKey: ["/api/oportunidades-crescimento", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: estrategias = [] } = useQuery<Estrategia[]>({
    queryKey: ["/api/estrategias", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: iniciativasAll = [] } = useQuery<Iniciativa[]>({
    queryKey: ["/api/iniciativas", empresa?.id],
    enabled: !!empresa?.id,
  });

  const criarOportunidadeMutation = useMutation({
    mutationFn: async (data: Omit<typeof formData, "estrategiaId"> & { estrategiaId: string | null }) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/oportunidades-crescimento", { ...data, empresaId: empresa.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oportunidades-crescimento", empresa?.id] });
      toast({
        title: "Frente adicionada!",
        description: "A frente de crescimento foi salva com sucesso.",
      });
      setFormData({ tipo: "", titulo: "", descricao: "", potencial: "médio", risco: "médio", estrategiaId: "" });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar frente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editarOportunidadeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<typeof formData, "estrategiaId">> & { estrategiaId?: string | null } }) => {
      return await apiRequest("PATCH", `/api/oportunidades-crescimento/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oportunidades-crescimento", empresa?.id] });
      toast({
        title: "Frente atualizada!",
        description: "A frente foi atualizada com sucesso.",
      });
      setFormData({ tipo: "", titulo: "", descricao: "", potencial: "médio", risco: "médio", estrategiaId: "" });
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
      return await apiRequest("DELETE", `/api/oportunidades-crescimento/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oportunidades-crescimento", empresa?.id] });
      toast({
        title: "Frente removida",
        description: "A frente foi excluída.",
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
    if (origemObrigatoria && !formData.estrategiaId) {
      toast({
        title: "Origem obrigatória",
        description: "Durante a primeira jornada, escolha a Estratégia de origem.",
        variant: "destructive",
      });
      return;
    }

    const payload = { ...formData, estrategiaId: formData.estrategiaId || null };
    if (editandoId) {
      editarOportunidadeMutation.mutate({ id: editandoId, data: payload });
    } else {
      criarOportunidadeMutation.mutate(payload);
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
      estrategiaId: oportunidade.estrategiaId || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditandoId(null);
      setFormData({ tipo: "", titulo: "", descricao: "", potencial: "médio", risco: "médio", estrategiaId: "" });
    }
  };

  useDeepLinkDialog(!!empresa?.id && !isLoading, ({ novo, editar, params }) => {
    if (editar) {
      const found = oportunidades.find((o) => o.id === editar);
      if (!found) return false;
      handleEditOportunidade(found);
      setFormData((prev) => {
        const next = { ...prev };
        if (params.tipo) next.tipo = params.tipo;
        if (params.titulo) next.titulo = params.titulo;
        if (params.descricao) next.descricao = params.descricao;
        if (params.potencial === "alto" || params.potencial === "médio" || params.potencial === "baixo")
          next.potencial = params.potencial;
        if (params.risco === "alto" || params.risco === "médio" || params.risco === "baixo")
          next.risco = params.risco;
        if (params.estrategiaId) next.estrategiaId = params.estrategiaId;
        return next;
      });
      return true;
    }
    if (novo) {
      setEditandoId(null);
      const potencial: "alto" | "médio" | "baixo" =
        params.potencial === "alto" || params.potencial === "médio" || params.potencial === "baixo"
          ? params.potencial
          : "médio";
      const risco: "alto" | "médio" | "baixo" =
        params.risco === "alto" || params.risco === "médio" || params.risco === "baixo"
          ? params.risco
          : "médio";
      setFormData({
        tipo: params.tipo || "",
        titulo: params.titulo || "",
        descricao: params.descricao || "",
        potencial,
        risco,
        estrategiaId: params.estrategiaId || "",
      });
      setIsDialogOpen(true);
    }
  });

  const handleGenerateFromEstrategia = async (estrategiaId: string) => {
    if (!empresa) return;
    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/gerar-oportunidades-crescimento", { empresaId: empresa.id, estrategiaId });
      if (response.oportunidades && response.oportunidades.length > 0) {
        let adicionadas = 0;
        for (const op of response.oportunidades) {
          try {
            await apiRequest("POST", "/api/oportunidades-crescimento", { ...op, empresaId: empresa.id });
            adicionadas++;
          } catch (err) { console.error(err); }
        }
        queryClient.invalidateQueries({ queryKey: ["/api/oportunidades-crescimento", empresa.id] });
        toast({ title: "Oportunidades geradas!", description: `${adicionadas} oportunidade(s) criadas a partir desta estratégia.` });
      }
    } catch (error: any) {
      toast({ title: "Erro ao gerar", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenAIModal = () => {
    if (!empresa) {
      toast({
        title: "Perfil não encontrado",
        description: "Complete o perfil da empresa primeiro.",
        variant: "destructive",
      });
      return;
    }
    setIsAIModalOpen(true);
  };

  const handleGenerateOpportunities = async (params: AIGenerationParams) => {
    if (!empresa) return;
    setIsAIModalOpen(false);
    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/gerar-oportunidades-crescimento", {
        empresaId: empresa.id,
        ...params,
      });

      if (response.oportunidades && response.oportunidades.length > 0) {
        let adicionadas = 0;
        for (const oportunidade of response.oportunidades) {
          try {
            // A IA pode anexar `estrategiaId` quando a frente tem aderência clara
            // a uma estratégia ofensiva (FO/DO) específica. Caso contrário,
            // a frente é salva sem vínculo direto (continua aparecendo na cascata
            // de Frentes na visão geral).
            await apiRequest("POST", "/api/oportunidades-crescimento", {
              ...oportunidade,
              estrategiaId: oportunidade.estrategiaId || undefined,
              empresaId: empresa.id,
            });
            adicionadas++;
          } catch (err: any) {
            console.error(`Erro ao salvar oportunidade ${oportunidade.tipo}:`, err);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["/api/oportunidades-crescimento", empresa.id] });
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
          title="Frentes de Crescimento"
          description="Caminhos Ansoff para desdobrar suas estratégias ofensivas"
        />
        <div className="mt-6">Carregando...</div>
      </div>
    );
  }

  const semEstategias = !!empresa && estrategias.length === 0 && oportunidades.length === 0;

  return (
    <div className="container mx-auto p-6">
      {semEstategias && (
        <PrerequisiteWarning
          titulo="Recomendado: defina estratégias antes de mapear frentes"
          descricao="As frentes de crescimento ficam mais claras quando derivam das estratégias ofensivas (FO/DO) definidas. Crie as estratégias primeiro para uma análise mais coerente."
          linkLabel="Ir para Estratégias"
          linkHref="/estrategias"
          variante="info"
        />
      )}
      <PageHeader
        title="Frentes de Crescimento"
        description="Aplicação da Matriz de Ansoff sobre suas estratégias ofensivas (FO/DO) — qual rota faz mais sentido agora"
      />

      <div className="mt-6 flex gap-3">
        <Button 
          onClick={handleOpenAIModal} 
          disabled={isGenerating}
          data-testid="button-gerar-ai"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? "Gerando..." : "Gerar com IA"}
        </Button>

        <AIGenerationModal
          open={isAIModalOpen}
          onOpenChange={setIsAIModalOpen}
          onConfirm={handleGenerateOpportunities}
          title="Gerar frentes de crescimento com IA"
          description="A IA gera automaticamente uma Matriz de Ansoff a partir de todas as suas estratégias ofensivas (FO/DO). Escolha quantas frentes por quadrante, em quais quadrantes focar e quais fontes de contexto considerar."
          isGenerating={isGenerating}
          testIdPrefix="ai-oportunidades"
          quantidade={{
            label: "Por quadrante",
            default: 1,
            min: 1,
            max: 3,
            suffixSingular: "oportunidade",
            suffixPlural: "oportunidades",
          }}
          foco={{
            label: "Quadrantes da Matriz de Ansoff",
            description: "Selecione quais tipos de crescimento a IA deve gerar.",
            items: tipos.map((t) => ({ value: t.value, label: t.label, desc: t.desc })),
          }}
          fontesContexto={{
            label: "Fontes de contexto",
            items: [
              { id: "swot", label: "SWOT", desc: "Forças e oportunidades identificadas" },
              { id: "estrategias", label: "Estratégias TOWS", desc: "Apostas estratégicas já definidas" },
              { id: "modeloNegocio", label: "Modelo de Negócio (BMC)", desc: "Proposta de valor, segmentos e canais" },
            ],
            defaultSelected: ["swot"],
          }}
          instrucaoAdicional={{
            placeholder: "Ex: Foque em ações com baixo investimento e que possam ser executadas no próximo trimestre.",
          }}
        />
        
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-adicionar">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Frente
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-oportunidade">
            <DialogHeader>
              <DialogTitle>
                {editandoId ? "Editar Frente" : "Nova Frente de Crescimento"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo de Crescimento</Label>
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

              <OrigemSelector
                label="Estratégia ofensiva de origem"
                obrigatorio={origemObrigatoria}
                ajuda={origemObrigatoria
                  ? "Durante a 1ª jornada, toda Frente precisa derivar de uma Estratégia ofensiva (FO/DO)."
                  : "Apenas estratégias ofensivas (FO/DO) admitem Frentes Ansoff."}
                opcoes={estrategias
                  .filter((e) => e.tipo === "FO" || e.tipo === "DO")
                  .map((e) => ({ id: e.id, label: `[${e.tipo}] ${e.titulo}` }))}
                value={formData.estrategiaId}
                onChange={(v) => setFormData({ ...formData, estrategiaId: v })}
                placeholder="Selecione a Estratégia ofensiva que origina esta frente"
                testId="select-origem-estrategia"
              />

              <div>
                <Label htmlFor="titulo">Título da Frente</Label>
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
                  placeholder="Descreva a frente de crescimento em detalhes..."
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
                  {editandoId ? "Salvar Alterações" : "Adicionar Frente"}
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
            title="Nenhuma frente de crescimento identificada ainda"
            description="Comece gerando frentes com IA a partir de uma estratégia ofensiva (FO/DO) ou adicione manualmente."
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
            const cfg = ANSOFF_THEME[tipo as TipoAnsoff];

            return (
              <div key={tipo}>
                <div className={`flex items-center gap-3 mb-3 px-3 py-2 rounded-md ${cfg?.headerBg ?? ""}`}>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${cfg?.iconBg ?? ""}`}>
                    <TipoIcon tipo={tipo} />
                  </span>
                  <div className="flex flex-col">
                    <h3 className={`text-lg font-semibold leading-tight ${cfg?.accentText ?? ""}`}>{getTipoLabel(tipo)}</h3>
                    <span className="text-xs text-muted-foreground">{getTipoDesc(tipo)}</span>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {oportunidadesList.map((oportunidade) => (
                    <Card
                      key={oportunidade.id}
                      className={`p-4 hover-elevate ${ANSOFF_THEME[oportunidade.tipo as TipoAnsoff]?.borderTop ?? ""}`}
                      data-testid={`card-oportunidade-${oportunidade.id}`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <TipoIcon tipo={oportunidade.tipo} className="h-4 w-4 shrink-0" />
                          <h4 className="font-semibold truncate" data-testid={`text-titulo-${oportunidade.id}`}>{oportunidade.titulo}</h4>
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
                      <div className="flex gap-2 flex-wrap">
                        <PotencialBadge potencial={oportunidade.potencial} />
                        <RiscoBadge risco={oportunidade.risco} />
                      </div>
                      {(() => {
                        const est = estrategias.find((e) => e.id === oportunidade.estrategiaId);
                        const derivadas = iniciativasAll.filter((i) => i.oportunidadeId === oportunidade.id);
                        const orfao = !!jornadaConcluida && !oportunidade.estrategiaId;
                        return (
                          <CascataBlock
                            upstream={est ? { id: est.id, titulo: est.titulo, href: "/estrategias", rotulo: "Estratégia" } : null}
                            downstream={[{ rotulo: "Iniciativas derivadas", itens: derivadas.map((i) => ({ id: i.id, titulo: i.titulo, href: "/iniciativas", rotulo: "Iniciativa" })) }]}
                            orfao={orfao}
                            orfaoMensagem="Esta oportunidade não está conectada a uma Estratégia."
                          />
                        );
                      })()}
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isGenerating}
                          onClick={async () => {
                            if (!empresa) return;
                            setIsGenerating(true);
                            try {
                              const response = await apiRequest("POST", "/api/ai/gerar-iniciativas", { empresaId: empresa.id, oportunidadeId: oportunidade.id });
                              if (response.iniciativas?.length > 0) {
                                let count = 0;
                                for (const ini of response.iniciativas) {
                                  try { await apiRequest("POST", "/api/iniciativas", { ...ini, empresaId: empresa.id }); count++; } catch (e) { console.error(e); }
                                }
                                queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa.id] });
                                toast({ title: "Iniciativas geradas!", description: `${count} iniciativa(s) criadas a partir desta oportunidade.` });
                              }
                            } catch (e) {
                              toast({ title: "Erro ao gerar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
                            } finally {
                              setIsGenerating(false);
                            }
                          }}
                          data-testid={`button-gerar-iniciativas-${oportunidade.id}`}
                        >
                          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                          Gerar iniciativas
                        </Button>
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

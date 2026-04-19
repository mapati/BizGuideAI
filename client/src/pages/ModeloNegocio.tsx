import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sparkles, LayoutGrid, Loader2, Save, Trash2,
  Handshake, Activity, Boxes, Gift, Heart, Truck, Users, TrendingDown, TrendingUp,
  type LucideIcon,
} from "lucide-react";
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

interface BlocoDef {
  value: string;
  label: string;
  hint: string;
  description: string;
  alimenta: string[];
  icon: LucideIcon;
  // Tailwind color classes para o chip do ícone
  iconBg: string;
  iconText: string;
  borderTint: string; // borda lateral sutil
}

const blocosPadrao: BlocoDef[] = [
  {
    value: "parcerias_principais", label: "Parcerias Principais", hint: "Quem te ajuda?",
    description: "Liste seus principais parceiros e fornecedores estratégicos",
    alimenta: ["Estratégias", "Iniciativas"], icon: Handshake,
    iconBg: "bg-sky-100 dark:bg-sky-950", iconText: "text-sky-700 dark:text-sky-300",
    borderTint: "border-l-sky-400 dark:border-l-sky-600",
  },
  {
    value: "atividades_principais", label: "Atividades Principais", hint: "O que você precisa fazer?",
    description: "Descreva as atividades mais importantes para operar",
    alimenta: ["OKRs", "Iniciativas"], icon: Activity,
    iconBg: "bg-amber-100 dark:bg-amber-950", iconText: "text-amber-700 dark:text-amber-300",
    borderTint: "border-l-amber-400 dark:border-l-amber-600",
  },
  {
    value: "recursos_principais", label: "Recursos Principais", hint: "O que você precisa ter?",
    description: "Liste os recursos essenciais (físicos, financeiros, humanos)",
    alimenta: ["Iniciativas"], icon: Boxes,
    iconBg: "bg-orange-100 dark:bg-orange-950", iconText: "text-orange-700 dark:text-orange-300",
    borderTint: "border-l-orange-400 dark:border-l-orange-600",
  },
  {
    value: "proposta_valor", label: "Proposta de Valor", hint: "O que você oferece?",
    description: "Descreva o valor único que você entrega aos clientes",
    alimenta: ["Estratégias", "OKRs", "Diagnóstico"], icon: Gift,
    iconBg: "bg-violet-100 dark:bg-violet-950", iconText: "text-violet-700 dark:text-violet-300",
    borderTint: "border-l-violet-400 dark:border-l-violet-600",
  },
  {
    value: "relacionamento_clientes", label: "Relacionamento com Clientes", hint: "Como se relaciona?",
    description: "Explique como você mantém relacionamento com clientes",
    alimenta: ["Estratégias"], icon: Heart,
    iconBg: "bg-rose-100 dark:bg-rose-950", iconText: "text-rose-700 dark:text-rose-300",
    borderTint: "border-l-rose-400 dark:border-l-rose-600",
  },
  {
    value: "canais", label: "Canais", hint: "Como entrega valor?",
    description: "Liste os canais de comunicação, venda e distribuição",
    alimenta: ["Estratégias"], icon: Truck,
    iconBg: "bg-cyan-100 dark:bg-cyan-950", iconText: "text-cyan-700 dark:text-cyan-300",
    borderTint: "border-l-cyan-400 dark:border-l-cyan-600",
  },
  {
    value: "segmentos_clientes", label: "Segmentos de Clientes", hint: "Quem são seus clientes?",
    description: "Identifique os diferentes grupos de clientes que você atende",
    alimenta: ["Estratégias", "OKRs", "Diagnóstico"], icon: Users,
    iconBg: "bg-emerald-100 dark:bg-emerald-950", iconText: "text-emerald-700 dark:text-emerald-300",
    borderTint: "border-l-emerald-400 dark:border-l-emerald-600",
  },
  {
    value: "estrutura_custos", label: "Estrutura de Custos", hint: "Quais são os custos?",
    description: "Liste os principais custos para operar o negócio",
    alimenta: ["Diagnóstico"], icon: TrendingDown,
    iconBg: "bg-red-100 dark:bg-red-950", iconText: "text-red-700 dark:text-red-300",
    borderTint: "border-l-red-400 dark:border-l-red-600",
  },
  {
    value: "fontes_receita", label: "Fontes de Receita", hint: "Como ganha dinheiro?",
    description: "Descreva como você gera receita com cada segmento",
    alimenta: ["Estratégias", "Diagnóstico"], icon: TrendingUp,
    iconBg: "bg-green-100 dark:bg-green-950", iconText: "text-green-700 dark:text-green-300",
    borderTint: "border-l-green-400 dark:border-l-green-600",
  },
];

export default function ModeloNegocio() {
  const { toast } = useToast();
  const [isSuggestingAll, setIsSuggestingAll] = useState(false);
  const [isSuggestingBloco, setIsSuggestingBloco] = useState(false);
  const [isSavingBloco, setIsSavingBloco] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [blocoSelecionado, setBlocoSelecionado] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [mobileEditOpen, setMobileEditOpen] = useState(false);
  const lastSavedRef = useRef<Record<string, string>>({});
  const inFlightRef = useRef<Set<string>>(new Set());
  const blocosDataRef = useRef<ModeloNegocio[]>([]);

  const { data: empresa } = useQuery<Empresa>({ queryKey: ["/api/empresa"] });

  const { data: blocosData = [], isLoading } = useQuery<ModeloNegocio[]>({
    queryKey: ["/api/modelo-negocio", empresa?.id],
    enabled: !!empresa?.id,
  });
  blocosDataRef.current = blocosData;

  useEffect(() => {
    const valores: Record<string, string> = {};
    blocosData.forEach((b) => { valores[b.bloco] = b.descricao; });
    setFormValues(valores);
    lastSavedRef.current = { ...valores };
  }, [blocosData]);

  useEffect(() => {
    if (blocoSelecionado) {
      setEditValue(formValues[blocoSelecionado] || "");
    } else {
      setEditValue("");
    }
  }, [blocoSelecionado, formValues]);

  const saveBloco = useCallback(async (blocoValue: string, valor: string) => {
    if (!empresa?.id) return;
    const valorTrim = valor.trim();
    const valorAnterior = (lastSavedRef.current[blocoValue] || "").trim();
    if (valorTrim === valorAnterior) return;
    if (inFlightRef.current.has(blocoValue)) return;

    inFlightRef.current.add(blocoValue);
    setIsSavingBloco(true);
    try {
      const blocoExistente = blocosDataRef.current.find((b) => b.bloco === blocoValue);
      if (blocoExistente) {
        await apiRequest("PATCH", `/api/modelo-negocio/${blocoExistente.id}`, { descricao: valorTrim });
      } else {
        await apiRequest("POST", "/api/modelo-negocio", {
          empresaId: empresa.id,
          bloco: blocoValue,
          descricao: valorTrim,
        });
      }
      lastSavedRef.current = { ...lastSavedRef.current, [blocoValue]: valorTrim };
      setFormValues((prev) => ({ ...prev, [blocoValue]: valorTrim }));
      queryClient.invalidateQueries({ queryKey: ["/api/modelo-negocio", empresa.id] });
      toast({ title: "Bloco salvo", description: "Alterações salvas automaticamente." });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      inFlightRef.current.delete(blocoValue);
      setIsSavingBloco(false);
    }
  }, [empresa?.id, toast]);

  const handleAutoSave = useCallback(async () => {
    if (!blocoSelecionado) return;
    await saveBloco(blocoSelecionado, editValue);
  }, [blocoSelecionado, editValue, saveBloco]);

  const handleSelectBloco = async (value: string) => {
    if (blocoSelecionado && blocoSelecionado !== value) {
      await saveBloco(blocoSelecionado, editValue);
    }
    setBlocoSelecionado(value);
  };

  const handleSelectBlocoMobile = (value: string) => {
    setBlocoSelecionado(value);
    setMobileEditOpen(true);
  };

  const handleCloseMobile = async () => {
    if (blocoSelecionado) {
      await saveBloco(blocoSelecionado, editValue);
    }
    setMobileEditOpen(false);
    setBlocoSelecionado(null);
  };

  const handleSuggestAll = async () => {
    if (!empresa) {
      toast({ title: "Perfil não encontrado", description: "Complete o perfil da empresa primeiro.", variant: "destructive" });
      return;
    }
    setIsSuggestingAll(true);
    try {
      const response = await apiRequest("POST", "/api/ai/sugerir-modelo-negocio", {
        nomeEmpresa: empresa.nome, setor: empresa.setor, descricao: empresa.descricao,
      });
      const sugestoes: { bloco: string; descricao: string }[] = response.blocos || [];
      for (const s of sugestoes) {
        const existente = blocosDataRef.current.find((b) => b.bloco === s.bloco);
        if (existente) {
          await apiRequest("PATCH", `/api/modelo-negocio/${existente.id}`, { descricao: s.descricao });
        } else {
          await apiRequest("POST", "/api/modelo-negocio", {
            empresaId: empresa.id, bloco: s.bloco, descricao: s.descricao,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/modelo-negocio", empresa.id] });
      toast({ title: "Modelo gerado!", description: "A IA preencheu os blocos." });
    } catch (error: any) {
      toast({ title: "Erro ao gerar modelo", description: error.message, variant: "destructive" });
    } finally {
      setIsSuggestingAll(false);
    }
  };

  const handleSuggestBloco = async () => {
    if (!blocoSelecionado) return;
    setIsSuggestingBloco(true);
    try {
      const response = await apiRequest("POST", "/api/ai/sugerir-bloco-bmc", { bloco: blocoSelecionado });
      if (response.descricao) {
        setEditValue(response.descricao);
        toast({ title: "Sugestão gerada", description: "Revise e ajuste se desejar — salva ao sair do campo." });
      }
    } catch (error: any) {
      toast({ title: "Erro ao gerar sugestão", description: error.message, variant: "destructive" });
    } finally {
      setIsSuggestingBloco(false);
    }
  };

  const handleResetAll = async () => {
    if (!empresa?.id) return;
    setIsResetting(true);
    try {
      const blocosExistentes = blocosDataRef.current;
      for (const b of blocosExistentes) {
        await apiRequest("DELETE", `/api/modelo-negocio/${b.id}`);
      }
      lastSavedRef.current = {};
      setFormValues({});
      setBlocoSelecionado(null);
      setEditValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/modelo-negocio", empresa.id] });
      toast({ title: "BMC limpo", description: "Todos os blocos foram resetados." });
    } catch (error: any) {
      toast({ title: "Erro ao limpar", description: error.message, variant: "destructive" });
    } finally {
      setIsResetting(false);
      setResetDialogOpen(false);
    }
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
    (b) => formValues[b.value] && formValues[b.value].trim() !== ""
  ).length;

  const blocoInfo = blocosPadrao.find((b) => b.value === blocoSelecionado);

  // ── Card individual do canvas ────────────────────────────────────────────
  const renderBlocoCard = (blocoValue: string, className?: string, onClick?: () => void) => {
    const bloco = blocosPadrao.find((b) => b.value === blocoValue);
    if (!bloco) return null;
    const Icon = bloco.icon;
    const conteudo = formValues[bloco.value];
    const isEmpty = !conteudo || conteudo.trim() === "";
    const isSelecionado = blocoSelecionado === bloco.value;

    return (
      <Card
        className={`cursor-pointer transition-all hover-elevate active-elevate-2 border-l-4 ${bloco.borderTint} ${
          isSelecionado ? "ring-2 ring-primary ring-offset-1" : ""
        } ${className || ""}`}
        onClick={onClick}
        data-testid={`card-bloco-${bloco.value}`}
      >
        <CardContent className="p-3 h-full flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-md ${bloco.iconBg} ${bloco.iconText} flex-shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{bloco.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{bloco.hint}</p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {isEmpty ? (
              <p className="text-xs text-muted-foreground italic">Clique para editar</p>
            ) : (
              <p className="text-xs whitespace-pre-wrap line-clamp-5">{conteudo}</p>
            )}
          </div>

          {bloco.alimenta.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
              {bloco.alimenta.map((dest) => (
                <Badge key={dest} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  {dest}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const headerAction = (
    <div className="flex items-center gap-2 flex-wrap">
      {blocosPreenchidos > 0 && (
        <Button
          variant="outline"
          onClick={() => setResetDialogOpen(true)}
          disabled={isResetting}
          data-testid="button-reset-bmc"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar tudo
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Modelo de Negócio"
        description="Visualize e edite os 9 elementos do seu modelo de negócio. Ele alimenta as Estratégias, OKRs, Iniciativas e Diagnóstico."
        tooltip="Uma visão completa do seu modelo de negócio: proposta de valor, clientes, canais, receitas, custos, parceiros e mais. Clique em cada bloco para adicionar ou editar."
        action={headerAction}
      />

      {/* ── DESKTOP: vista dividida (canvas + editor) ──────────────────────── */}
      <div className="hidden lg:flex flex-1 gap-4 min-h-0">
        <div className="flex-1 lg:basis-3/5 min-h-0 overflow-auto">
          <div
            className="grid gap-3 h-full min-h-[600px]"
            style={{
              gridTemplateColumns: "repeat(5, 1fr)",
              gridTemplateRows: "1fr 1fr 1fr",
            }}
          >
            <div style={{ gridColumn: "1", gridRow: "1 / 3" }}>
              {renderBlocoCard("parcerias_principais", "h-full", () => handleSelectBloco("parcerias_principais"))}
            </div>
            <div style={{ gridColumn: "2", gridRow: "1" }}>
              {renderBlocoCard("atividades_principais", "h-full", () => handleSelectBloco("atividades_principais"))}
            </div>
            <div style={{ gridColumn: "3", gridRow: "1 / 3" }}>
              {renderBlocoCard("proposta_valor", "h-full", () => handleSelectBloco("proposta_valor"))}
            </div>
            <div style={{ gridColumn: "4", gridRow: "1" }}>
              {renderBlocoCard("relacionamento_clientes", "h-full", () => handleSelectBloco("relacionamento_clientes"))}
            </div>
            <div style={{ gridColumn: "5", gridRow: "1 / 3" }}>
              {renderBlocoCard("segmentos_clientes", "h-full", () => handleSelectBloco("segmentos_clientes"))}
            </div>
            <div style={{ gridColumn: "2", gridRow: "2" }}>
              {renderBlocoCard("recursos_principais", "h-full", () => handleSelectBloco("recursos_principais"))}
            </div>
            <div style={{ gridColumn: "4", gridRow: "2" }}>
              {renderBlocoCard("canais", "h-full", () => handleSelectBloco("canais"))}
            </div>
            <div style={{ gridColumn: "1 / 3", gridRow: "3" }}>
              {renderBlocoCard("estrutura_custos", "h-full", () => handleSelectBloco("estrutura_custos"))}
            </div>
            <div style={{ gridColumn: "3 / 6", gridRow: "3" }}>
              {renderBlocoCard("fontes_receita", "h-full", () => handleSelectBloco("fontes_receita"))}
            </div>
          </div>
        </div>

        {/* Painel direito — editor (40%) */}
        <div className="lg:basis-2/5 min-h-0 overflow-auto">
          <Card className="h-full flex flex-col">
            <CardContent className="p-5 flex flex-col h-full">
              {!blocoInfo ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <LayoutGrid className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium mb-1">
                      Progresso: {blocosPreenchidos} de 9 blocos
                    </p>
                    <div className="h-1.5 w-48 bg-muted rounded-full overflow-hidden mx-auto mb-3">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(blocosPreenchidos / 9) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Clique em um bloco para começar, ou gere um modelo completo com IA.
                    </p>
                  </div>
                  <Button
                    onClick={handleSuggestAll}
                    disabled={isSuggestingAll}
                    data-testid="button-suggest-blocos"
                  >
                    {isSuggestingAll ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {isSuggestingAll ? "Gerando..." : "Gerar todos com IA"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-md ${blocoInfo.iconBg} ${blocoInfo.iconText} flex-shrink-0`}>
                      <blocoInfo.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold leading-tight" data-testid="text-bloco-titulo">
                        {blocoInfo.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">{blocoInfo.hint}</p>
                    </div>
                  </div>

                  {blocoInfo.alimenta.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5" data-testid="text-bloco-alimenta">
                      <span className="text-xs text-muted-foreground">Alimenta:</span>
                      {blocoInfo.alimenta.map((dest) => (
                        <Badge key={dest} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                          {dest}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleAutoSave}
                    placeholder={blocoInfo.description}
                    className="flex-1 min-h-[200px] resize-none"
                    data-testid="textarea-edit-bloco"
                  />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-muted-foreground">
                      {isSavingBloco ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Save className="h-3 w-3" /> Salva ao sair do campo
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestBloco}
                      disabled={isSuggestingBloco}
                      data-testid="button-suggest-bloco"
                    >
                      {isSuggestingBloco ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {isSuggestingBloco ? "Gerando..." : "Sugestão da IA"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── MOBILE: lista vertical + dialog ──────────────────────────────── */}
      <div className="lg:hidden flex flex-col gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium">{blocosPreenchidos} de 9 blocos</p>
                <div className="h-1.5 w-40 bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(blocosPreenchidos / 9) * 100}%` }}
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSuggestAll}
                disabled={isSuggestingAll}
                data-testid="button-suggest-blocos-mobile"
              >
                {isSuggestingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isSuggestingAll ? "Gerando..." : "Gerar com IA"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {blocosPadrao.map((b) => (
            <div key={b.value}>
              {renderBlocoCard(b.value, "", () => handleSelectBlocoMobile(b.value))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal mobile ─────────────────────────────────────────────────── */}
      <Dialog open={mobileEditOpen} onOpenChange={(open) => { if (!open) handleCloseMobile(); }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-bloco">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {blocoInfo && (
                <span className={`flex items-center justify-center w-8 h-8 rounded-md ${blocoInfo.iconBg} ${blocoInfo.iconText}`}>
                  <blocoInfo.icon className="h-4 w-4" />
                </span>
              )}
              {blocoInfo?.label}
            </DialogTitle>
            <DialogDescription>
              {blocoInfo?.hint}
            </DialogDescription>
            {blocoInfo && blocoInfo.alimenta.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">Alimenta:</span>
                {blocoInfo.alimenta.map((dest) => (
                  <Badge key={dest} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                    {dest}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={blocoInfo?.description}
              className="min-h-[200px] resize-none"
              data-testid="textarea-edit-bloco-mobile"
            />
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleSuggestBloco}
              disabled={isSuggestingBloco}
              data-testid="button-suggest-bloco-mobile"
            >
              {isSuggestingBloco ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isSuggestingBloco ? "Gerando..." : "Sugestão da IA"}
            </Button>
            <Button onClick={handleCloseMobile} disabled={isSavingBloco} data-testid="button-save-bloco-mobile">
              {isSavingBloco ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isSavingBloco ? "Salvando..." : "Salvar e fechar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmação de reset ─────────────────────────────────────────── */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent data-testid="dialog-reset-bmc">
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os blocos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação vai apagar o conteúdo de todos os {blocosPreenchidos} bloco{blocosPreenchidos === 1 ? "" : "s"} preenchido{blocosPreenchidos === 1 ? "" : "s"} do seu Modelo de Negócio. Você poderá começar do zero ou gerar um novo modelo com IA. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting} data-testid="button-cancel-reset">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAll}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-reset"
            >
              {isResetting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Limpando...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Limpar tudo</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

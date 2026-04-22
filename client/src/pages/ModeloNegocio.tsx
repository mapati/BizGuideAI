import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sparkles, Loader2, Save, Trash2, X,
  Handshake, Activity, Boxes, Gift, Heart, Truck, Users, TrendingDown, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDeepLinkDialog } from "@/hooks/useDeepLinkDialog";

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
  iconBg: string;
  iconText: string;
  borderTint: string;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [blocoSelecionado, setBlocoSelecionado] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: empresa } = useQuery<Empresa>({ queryKey: ["/api/empresa"] });

  const { data: blocosData = [], isLoading } = useQuery<ModeloNegocio[]>({
    queryKey: ["/api/modelo-negocio", empresa?.id],
    enabled: !!empresa?.id,
  });

  useEffect(() => {
    const valores: Record<string, string> = {};
    blocosData.forEach((b) => { valores[b.bloco] = b.descricao; });
    setFormValues(valores);
  }, [blocosData]);

  const openEditor = (blocoValue: string) => {
    setBlocoSelecionado(blocoValue);
    setEditValue(formValues[blocoValue] || "");
    setEditDialogOpen(true);
  };

  useDeepLinkDialog(!!empresa?.id && !isLoading, ({ editar }) => {
    if (!editar) return false;
    const byId = blocosData.find((b) => b.id === editar);
    const blocoValue = byId?.bloco
      ?? (blocosPadrao.find((b) => b.value === editar)?.value);
    if (!blocoValue) return false;
    setBlocoSelecionado(blocoValue);
    setEditValue(byId?.descricao ?? formValues[blocoValue] ?? "");
    setEditDialogOpen(true);
    return true;
  });

  const closeEditor = () => {
    setEditDialogOpen(false);
    setBlocoSelecionado(null);
    setEditValue("");
  };

  const handleSaveBloco = async () => {
    if (!blocoSelecionado || !empresa?.id) return;
    const valorTrim = editValue.trim();
    setIsSavingBloco(true);
    try {
      const blocoExistente = blocosData.find((b) => b.bloco === blocoSelecionado);
      if (blocoExistente) {
        await apiRequest("PATCH", `/api/modelo-negocio/${blocoExistente.id}`, { descricao: valorTrim });
      } else {
        await apiRequest("POST", "/api/modelo-negocio", {
          empresaId: empresa.id,
          bloco: blocoSelecionado,
          descricao: valorTrim,
        });
      }
      setFormValues((prev) => ({ ...prev, [blocoSelecionado]: valorTrim }));
      queryClient.invalidateQueries({ queryKey: ["/api/modelo-negocio", empresa.id] });
      toast({ title: "Bloco salvo", description: "Suas alterações foram gravadas." });
      closeEditor();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingBloco(false);
    }
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
        const existente = blocosData.find((b) => b.bloco === s.bloco);
        if (existente) {
          await apiRequest("PATCH", `/api/modelo-negocio/${existente.id}`, { descricao: s.descricao });
        } else {
          await apiRequest("POST", "/api/modelo-negocio", {
            empresaId: empresa.id, bloco: s.bloco, descricao: s.descricao,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/modelo-negocio", empresa.id] });
      toast({ title: "Modelo gerado!", description: "A IA preencheu todos os blocos." });
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
        toast({ title: "Sugestão gerada", description: "Revise e clique em Salvar para gravar." });
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
      for (const b of blocosData) {
        await apiRequest("DELETE", `/api/modelo-negocio/${b.id}`);
      }
      setFormValues({});
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
  const renderBlocoCard = (blocoValue: string, className?: string) => {
    const bloco = blocosPadrao.find((b) => b.value === blocoValue);
    if (!bloco) return null;
    const Icon = bloco.icon;
    const conteudo = formValues[bloco.value];
    const isEmpty = !conteudo || conteudo.trim() === "";

    return (
      <Card
        className={`cursor-pointer transition-all hover-elevate active-elevate-2 border-l-4 ${bloco.borderTint} ${className || ""}`}
        onClick={() => openEditor(bloco.value)}
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

          <div className="flex-1 overflow-auto">
            {isEmpty ? (
              <p className="text-xs text-muted-foreground italic">Clique para editar</p>
            ) : (
              <p className="text-xs whitespace-pre-wrap leading-snug">{conteudo}</p>
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
      <Button
        variant="outline"
        onClick={handleSuggestAll}
        disabled={isSuggestingAll}
        data-testid="button-suggest-blocos"
      >
        {isSuggestingAll ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        {isSuggestingAll ? "Gerando..." : blocosPreenchidos > 0 ? "Regerar com IA" : "Gerar todos com IA"}
      </Button>
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
        tooltip="Clique em qualquer bloco para abrir o editor. O Modelo de Negócio é usado como contexto pela IA em outras áreas do sistema."
        action={headerAction}
      />

      {/* Barra de progresso compacta */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-xs">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(blocosPreenchidos / 9) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground" data-testid="text-progresso-bmc">
          {blocosPreenchidos} de 9 blocos preenchidos
        </span>
      </div>

      {/* ── DESKTOP: canvas BMC em página inteira ─────────────────────────── */}
      <div className="hidden lg:block flex-1 min-h-0">
        <div
          className="grid gap-3 h-full min-h-[700px]"
          style={{
            gridTemplateColumns: "repeat(5, 1fr)",
            gridTemplateRows: "1fr 1fr 1fr",
          }}
        >
          <div style={{ gridColumn: "1", gridRow: "1 / 3" }}>
            {renderBlocoCard("parcerias_principais", "h-full")}
          </div>
          <div style={{ gridColumn: "2", gridRow: "1" }}>
            {renderBlocoCard("atividades_principais", "h-full")}
          </div>
          <div style={{ gridColumn: "3", gridRow: "1 / 3" }}>
            {renderBlocoCard("proposta_valor", "h-full")}
          </div>
          <div style={{ gridColumn: "4", gridRow: "1" }}>
            {renderBlocoCard("relacionamento_clientes", "h-full")}
          </div>
          <div style={{ gridColumn: "5", gridRow: "1 / 3" }}>
            {renderBlocoCard("segmentos_clientes", "h-full")}
          </div>
          <div style={{ gridColumn: "2", gridRow: "2" }}>
            {renderBlocoCard("recursos_principais", "h-full")}
          </div>
          <div style={{ gridColumn: "4", gridRow: "2" }}>
            {renderBlocoCard("canais", "h-full")}
          </div>
          <div style={{ gridColumn: "1 / 3", gridRow: "3" }}>
            {renderBlocoCard("estrutura_custos", "h-full")}
          </div>
          <div style={{ gridColumn: "3 / 6", gridRow: "3" }}>
            {renderBlocoCard("fontes_receita", "h-full")}
          </div>
        </div>
      </div>

      {/* ── MOBILE: lista vertical ──────────────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {blocosPadrao.map((b) => (
          <div key={b.value}>
            {renderBlocoCard(b.value)}
          </div>
        ))}
      </div>

      {/* ── Janela de edição (compartilhada desktop/mobile) ─────────────── */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isSavingBloco) closeEditor();
        }}
      >
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

          <div className="py-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={blocoInfo?.description}
              className="min-h-[220px] resize-none"
              data-testid="textarea-edit-bloco"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 flex-wrap sm:justify-between">
            <Button
              variant="outline"
              onClick={handleSuggestBloco}
              disabled={isSuggestingBloco || isSavingBloco}
              data-testid="button-suggest-bloco"
            >
              {isSuggestingBloco ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isSuggestingBloco ? "Gerando..." : "Sugestão da IA"}
            </Button>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={closeEditor}
                disabled={isSavingBloco}
                data-testid="button-cancel-bloco"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSaveBloco}
                disabled={isSavingBloco}
                data-testid="button-save-bloco"
              >
                {isSavingBloco ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSavingBloco ? "Salvando..." : "Salvar"}
              </Button>
            </div>
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

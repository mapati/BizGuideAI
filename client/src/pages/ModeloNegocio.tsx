import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, LayoutGrid, Loader2, Save } from "lucide-react";
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
}

const blocosPadrao: BlocoDef[] = [
  { value: "parcerias_principais", label: "Parcerias Principais", hint: "Quem te ajuda?", description: "Liste seus principais parceiros e fornecedores estratégicos", alimenta: ["Estratégias", "Iniciativas"] },
  { value: "atividades_principais", label: "Atividades Principais", hint: "O que você precisa fazer?", description: "Descreva as atividades mais importantes para operar", alimenta: ["OKRs", "Iniciativas"] },
  { value: "recursos_principais", label: "Recursos Principais", hint: "O que você precisa ter?", description: "Liste os recursos essenciais (físicos, financeiros, humanos)", alimenta: ["Iniciativas"] },
  { value: "proposta_valor", label: "Proposta de Valor", hint: "O que você oferece?", description: "Descreva o valor único que você entrega aos clientes", alimenta: ["Estratégias", "OKRs", "Diagnóstico"] },
  { value: "relacionamento_clientes", label: "Relacionamento com Clientes", hint: "Como se relaciona?", description: "Explique como você mantém relacionamento com clientes", alimenta: ["Estratégias"] },
  { value: "canais", label: "Canais", hint: "Como entrega valor?", description: "Liste os canais de comunicação, venda e distribuição", alimenta: ["Estratégias"] },
  { value: "segmentos_clientes", label: "Segmentos de Clientes", hint: "Quem são seus clientes?", description: "Identifique os diferentes grupos de clientes que você atende", alimenta: ["Estratégias", "OKRs", "Diagnóstico"] },
  { value: "estrutura_custos", label: "Estrutura de Custos", hint: "Quais são os custos?", description: "Liste os principais custos para operar o negócio", alimenta: ["Diagnóstico"] },
  { value: "fontes_receita", label: "Fontes de Receita", hint: "Como ganha dinheiro?", description: "Descreva como você gera receita com cada segmento", alimenta: ["Estratégias", "Diagnóstico"] },
];

export default function ModeloNegocio() {
  const { toast } = useToast();
  const [isSuggestingAll, setIsSuggestingAll] = useState(false);
  const [isSuggestingBloco, setIsSuggestingBloco] = useState(false);
  const [isSavingBloco, setIsSavingBloco] = useState(false);
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

  // Sincroniza editValue quando bloco selecionado muda
  useEffect(() => {
    if (blocoSelecionado) {
      setEditValue(formValues[blocoSelecionado] || "");
    } else {
      setEditValue("");
    }
  }, [blocoSelecionado, formValues]);

  // Salva um bloco específico com valor explícito. Idempotente via inFlightRef
  // e usa snapshot mais recente de blocosData (ref) para evitar duplicações.
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

  // Salva o bloco atualmente selecionado (uso pelo onBlur do textarea)
  const handleAutoSave = useCallback(async () => {
    if (!blocoSelecionado) return;
    await saveBloco(blocoSelecionado, editValue);
  }, [blocoSelecionado, editValue, saveBloco]);

  const handleSelectBloco = async (value: string) => {
    // Salva o bloco anterior (com snapshot de valores) antes de trocar
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

  // ── Card individual do canvas (desktop e mobile) ─────────────────────────
  const renderBlocoCard = (blocoValue: string, className?: string, onClick?: () => void) => {
    const bloco = blocosPadrao.find((b) => b.value === blocoValue);
    if (!bloco) return null;
    const conteudo = formValues[bloco.value];
    const isEmpty = !conteudo || conteudo.trim() === "";
    const isSelecionado = blocoSelecionado === bloco.value;

    return (
      <Card
        className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
          isSelecionado ? "border-primary ring-2 ring-primary/20" : ""
        } ${className || ""}`}
        onClick={onClick}
        data-testid={`card-bloco-${bloco.value}`}
      >
        <CardContent className="p-3 h-full flex flex-col">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide">{bloco.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{bloco.hint}</p>
          </div>
          <div className="flex-1 overflow-hidden relative">
            {isEmpty ? (
              <p className="text-xs text-muted-foreground italic">Clique para editar</p>
            ) : (
              <p className="text-xs whitespace-pre-wrap line-clamp-6">{conteudo}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Modelo de Negócio"
        description="Visualize e edite os 9 elementos do seu modelo de negócio. Ele alimenta as Estratégias, OKRs, Iniciativas e Diagnóstico."
        tooltip="Uma visão completa do seu modelo de negócio: proposta de valor, clientes, canais, receitas, custos, parceiros e mais. Clique em cada bloco para adicionar ou editar."
      />

      {/* ── DESKTOP: vista dividida (canvas + editor) ──────────────────────── */}
      <div className="hidden lg:flex flex-1 gap-4 min-h-0">
        {/* Painel esquerdo — canvas (60%) */}
        <div className="flex-1 lg:basis-3/5 min-h-0 overflow-auto">
          <div
            className="grid gap-3 h-full min-h-[560px]"
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
                /* Estado inicial: nenhum bloco selecionado */
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
                  <LayoutGrid className="h-12 w-12 text-muted-foreground/40" />
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
                /* Estado: bloco selecionado */
                <div className="flex flex-col h-full gap-3">
                  <div>
                    <h3 className="text-base font-semibold" data-testid="text-bloco-titulo">
                      {blocoInfo.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">{blocoInfo.hint}</p>
                    {blocoInfo.alimenta.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5" data-testid="text-bloco-alimenta">
                        Alimenta: {blocoInfo.alimenta.join(" · ")}
                      </p>
                    )}
                  </div>

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
            <DialogTitle>{blocoInfo?.label}</DialogTitle>
            <DialogDescription>
              {blocoInfo?.hint}
              {blocoInfo && blocoInfo.alimenta.length > 0 && (
                <span className="block mt-1 text-xs">Alimenta: {blocoInfo.alimenta.join(" · ")}</span>
              )}
            </DialogDescription>
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
    </div>
  );
}

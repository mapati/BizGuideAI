import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Loader2,
  Edit2,
  TrendingDown,
  Minus,
  TrendingUp,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Cenario } from "@shared/schema";

// ── config ────────────────────────────────────────────────────────────────────

const TIPOS = ["pessimista", "base", "otimista"] as const;
type TipoCenario = typeof TIPOS[number];

const tipoConfig: Record<TipoCenario, {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  cardBg: string;
  cardBorder: string;
  badge: string;
}> = {
  pessimista: {
    label: "Pessimista",
    icon: TrendingDown,
    iconColor: "text-red-500",
    cardBg: "bg-red-50/60 dark:bg-red-950/20",
    cardBorder: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
  base: {
    label: "Base",
    icon: Minus,
    iconColor: "text-yellow-600",
    cardBg: "bg-yellow-50/60 dark:bg-yellow-950/20",
    cardBorder: "border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300",
  },
  otimista: {
    label: "Otimista",
    icon: TrendingUp,
    iconColor: "text-green-600",
    cardBg: "bg-green-50/60 dark:bg-green-950/20",
    cardBorder: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  },
};

// ── types ─────────────────────────────────────────────────────────────────────

interface FormFields {
  titulo: string;
  descricao: string;
  premissas: string;
  respostaEstrategica: string;
}

const emptyForm = (): FormFields => ({
  titulo: "",
  descricao: "",
  premissas: "",
  respostaEstrategica: "",
});

function cenarioToForm(c: Cenario): FormFields {
  let premissas = "";
  try {
    premissas = (JSON.parse(c.premissas || "[]") as string[]).join("\n");
  } catch {
    premissas = c.premissas || "";
  }
  return {
    titulo: c.titulo || "",
    descricao: c.descricao || "",
    premissas,
    respostaEstrategica: c.respostaEstrategica || "",
  };
}

function parsePremissas(raw: string): string {
  return JSON.stringify(raw.split("\n").map((l) => l.trim()).filter(Boolean));
}

// ── sub-components ────────────────────────────────────────────────────────────

function PremissasList({ premissas }: { premissas: string }) {
  const list: string[] = (() => {
    try { return JSON.parse(premissas || "[]"); } catch { return premissas ? [premissas] : []; }
  })();
  if (!list.filter(Boolean).length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Premissas</p>
      <ul className="space-y-1">
        {list.filter(Boolean).map((p, i) => (
          <li key={i} className="flex gap-2 items-start text-xs">
            <span className="text-muted-foreground mt-0.5">•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Cenarios() {
  const { toast } = useToast();

  // edit dialog
  const [editDialog, setEditDialog] = useState<{ open: boolean; tipo: TipoCenario | null; existing: Cenario | null }>({
    open: false, tipo: null, existing: null,
  });
  const [editForm, setEditForm] = useState<FormFields>(emptyForm());

  // AI generation review dialog
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewForms, setReviewForms] = useState<Record<TipoCenario, FormFields>>({
    pessimista: emptyForm(),
    base: emptyForm(),
    otimista: emptyForm(),
  });

  // per-card "Sugerir IA para resposta" loading state
  const [suggestingTipo, setSuggestingTipo] = useState<TipoCenario | null>(null);

  const { data: cenarios = [], isLoading } = useQuery<Cenario[]>({ queryKey: ["/api/cenarios"] });

  const inv = () => queryClient.invalidateQueries({ queryKey: ["/api/cenarios"] });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiRequest("PATCH", `/api/cenarios/${id}`, body),
    onSuccess: () => { inv(); },
    onError: () => toast({ title: "Erro ao salvar cenário", variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/cenarios", body),
    onSuccess: () => { inv(); },
    onError: () => toast({ title: "Erro ao criar cenário", variant: "destructive" }),
  });

  const gerarMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/gerar-cenarios", {}),
    onSuccess: (d: any) => {
      const novo: Record<TipoCenario, FormFields> = {
        pessimista: emptyForm(),
        base: emptyForm(),
        otimista: emptyForm(),
      };
      for (const c of d?.cenarios || []) {
        const tipo = c.tipo as TipoCenario;
        if (!TIPOS.includes(tipo)) continue;
        novo[tipo] = {
          titulo: c.titulo || "",
          descricao: c.descricao || "",
          premissas: (c.premissas || []).join("\n"),
          respostaEstrategica: c.resposta_estrategica || "",
        };
      }
      setReviewForms(novo);
      setReviewDialog(true);
    },
    onError: () => toast({ title: "Erro ao gerar cenários com IA", variant: "destructive" }),
  });

  async function salvarRevisao() {
    const existing = Object.fromEntries(
      cenarios.map((c) => [c.tipo as TipoCenario, c]),
    ) as Record<TipoCenario, Cenario | undefined>;

    const promises = TIPOS.map((tipo) => {
      const f = reviewForms[tipo];
      if (!f.titulo) return Promise.resolve();
      const body = {
        tipo,
        titulo: f.titulo,
        descricao: f.descricao,
        premissas: parsePremissas(f.premissas),
        respostaEstrategica: f.respostaEstrategica,
      };
      const exst = existing[tipo];
      if (exst) {
        return apiRequest("PATCH", `/api/cenarios/${exst.id}`, body);
      } else {
        return apiRequest("POST", "/api/cenarios", body);
      }
    });
    await Promise.all(promises);
    inv();
    setReviewDialog(false);
    toast({ title: "Cenários salvos com sucesso!" });
  }

  function abrirEditar(tipo: TipoCenario, existing: Cenario | null) {
    setEditDialog({ open: true, tipo, existing });
    setEditForm(existing ? cenarioToForm(existing) : emptyForm());
  }

  async function salvarEdicao() {
    if (!editDialog.tipo) return;
    const body = {
      tipo: editDialog.tipo,
      titulo: editForm.titulo,
      descricao: editForm.descricao,
      premissas: parsePremissas(editForm.premissas),
      respostaEstrategica: editForm.respostaEstrategica,
    };
    if (editDialog.existing) {
      await updateMut.mutateAsync({ id: editDialog.existing.id, body });
    } else {
      await createMut.mutateAsync(body);
    }
    setEditDialog({ open: false, tipo: null, existing: null });
    toast({ title: "Cenário salvo!" });
  }

  async function sugerirResposta(tipo: TipoCenario) {
    const c = cenarios.find((x) => x.tipo === tipo);
    setSuggestingTipo(tipo);
    try {
      const d: any = await apiRequest("POST", "/api/ai/sugerir-resposta-cenario", {
        tipo,
        titulo: c?.titulo || "",
        descricao: c?.descricao || "",
        premissas: c?.premissas || "[]",
      });
      if (d?.respostaEstrategica) {
        const body = {
          respostaEstrategica: d.respostaEstrategica,
        };
        if (c) {
          await updateMut.mutateAsync({ id: c.id, body });
          toast({ title: "Resposta estratégica sugerida e salva!" });
        }
      }
    } catch {
      toast({ title: "Erro ao sugerir resposta", variant: "destructive" });
    } finally {
      setSuggestingTipo(null);
    }
  }

  const cenarioByTipo = Object.fromEntries(
    cenarios.map((c) => [c.tipo, c]),
  ) as Record<TipoCenario, Cenario | undefined>;

  const isSaving = updateMut.isPending || createMut.isPending;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Planejamento de Cenários"
        description="Mapeie os cenários pessimista, base e otimista para antecipar mudanças e preparar respostas estratégicas."
        action={
          <Button
            variant="outline"
            onClick={() => gerarMut.mutate()}
            disabled={gerarMut.isPending}
            data-testid="button-gerar-cenarios-ia"
          >
            {gerarMut.isPending
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar com IA
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIPOS.map((tipo) => {
            const cfg = tipoConfig[tipo];
            const Icon = cfg.icon;
            const c = cenarioByTipo[tipo];

            return (
              <div key={tipo} className="flex flex-col gap-3">
                {/* Column header */}
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 flex-shrink-0 ${cfg.iconColor}`} />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    {cfg.label}
                  </h3>
                  {c && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto flex-shrink-0" />
                  )}
                </div>

                {/* Fixed card */}
                <Card
                  className={`flex-1 border ${cfg.cardBg} ${cfg.cardBorder}`}
                  data-testid={`card-cenario-${tipo}`}
                >
                  {c ? (
                    <>
                      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold leading-tight">
                          {c.titulo}
                        </CardTitle>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => abrirEditar(tipo, c)}
                          data-testid={`button-edit-cenario-${tipo}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {c.descricao && (
                          <p className="text-muted-foreground leading-relaxed text-xs">{c.descricao}</p>
                        )}
                        <PremissasList premissas={c.premissas} />
                        {c.respostaEstrategica ? (
                          <div className="bg-background/70 rounded-md p-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Como a empresa se adapta</p>
                            <p className="text-xs leading-relaxed">{c.respostaEstrategica}</p>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => sugerirResposta(tipo)}
                            disabled={suggestingTipo === tipo}
                            data-testid={`button-sugerir-resposta-${tipo}`}
                          >
                            {suggestingTipo === tipo
                              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                            Sugerir resposta com IA
                          </Button>
                        )}
                        {c.respostaEstrategica && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground"
                            onClick={() => sugerirResposta(tipo)}
                            disabled={suggestingTipo === tipo}
                            data-testid={`button-sugerir-resposta-${tipo}`}
                          >
                            {suggestingTipo === tipo
                              ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                              : <Sparkles className="h-3 w-3 mr-1.5" />}
                            Nova sugestão de resposta
                          </Button>
                        )}
                      </CardContent>
                    </>
                  ) : (
                    <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Cenário {cfg.label.toLowerCase()} ainda não definido
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEditar(tipo, null)}
                        data-testid={`button-preencher-cenario-${tipo}`}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Preencher manualmente
                      </Button>
                    </CardContent>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Dialog ── */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(v) => setEditDialog((s) => ({ ...s, open: v }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editDialog.tipo && (
                <span className="flex items-center gap-2">
                  Cenário{" "}
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${editDialog.tipo ? tipoConfig[editDialog.tipo].badge : ""}`}>
                    {editDialog.tipo ? tipoConfig[editDialog.tipo].label : ""}
                  </span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-titulo">Título do cenário</Label>
              <Input
                id="edit-titulo"
                value={editForm.titulo}
                onChange={(e) => setEditForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder={
                  editDialog.tipo === "pessimista"
                    ? "Ex: Retração econômica severa"
                    : editDialog.tipo === "otimista"
                    ? "Ex: Expansão de mercado acelerada"
                    : "Ex: Crescimento moderado e estável"
                }
                data-testid="input-titulo-cenario"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-descricao">Descrição do contexto</Label>
              <Textarea
                id="edit-descricao"
                value={editForm.descricao}
                onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o contexto e as condições deste cenário..."
                rows={3}
                data-testid="textarea-descricao-cenario"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-premissas">Premissas (uma por linha)</Label>
              <Textarea
                id="edit-premissas"
                value={editForm.premissas}
                onChange={(e) => setEditForm((f) => ({ ...f, premissas: e.target.value }))}
                placeholder={"PIB cai 3%\nTaxa de juros acima de 15%\nDesemprego cresce 2pp"}
                rows={3}
                data-testid="textarea-premissas-cenario"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-resposta">Como a empresa se adapta</Label>
              <Textarea
                id="edit-resposta"
                value={editForm.respostaEstrategica}
                onChange={(e) => setEditForm((f) => ({ ...f, respostaEstrategica: e.target.value }))}
                placeholder="Quais ações a empresa deve tomar neste cenário..."
                rows={3}
                data-testid="textarea-resposta-cenario"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, tipo: null, existing: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={salvarEdicao}
              disabled={isSaving || !editForm.titulo.trim()}
              data-testid="button-salvar-cenario"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── IA Review Dialog ── */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle>Cenários sugeridos pela IA</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground pt-1">
              Revise as sugestões geradas, faça ajustes se necessário e confirme para salvar.
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {TIPOS.map((tipo) => {
              const cfg = tipoConfig[tipo];
              const f = reviewForms[tipo];
              return (
                <div key={tipo} className={`rounded-lg border p-4 space-y-3 ${cfg.cardBg} ${cfg.cardBorder}`}>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={f.titulo}
                        onChange={(e) =>
                          setReviewForms((r) => ({ ...r, [tipo]: { ...r[tipo], titulo: e.target.value } }))
                        }
                        className="text-sm"
                        data-testid={`review-titulo-${tipo}`}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Descrição</Label>
                      <Textarea
                        value={f.descricao}
                        onChange={(e) =>
                          setReviewForms((r) => ({ ...r, [tipo]: { ...r[tipo], descricao: e.target.value } }))
                        }
                        rows={2}
                        className="text-sm resize-none"
                        data-testid={`review-descricao-${tipo}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Premissas (uma por linha)</Label>
                      <Textarea
                        value={f.premissas}
                        onChange={(e) =>
                          setReviewForms((r) => ({ ...r, [tipo]: { ...r[tipo], premissas: e.target.value } }))
                        }
                        rows={3}
                        className="text-sm resize-none"
                        data-testid={`review-premissas-${tipo}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Como a empresa se adapta</Label>
                      <Textarea
                        value={f.respostaEstrategica}
                        onChange={(e) =>
                          setReviewForms((r) => ({
                            ...r,
                            [tipo]: { ...r[tipo], respostaEstrategica: e.target.value },
                          }))
                        }
                        rows={3}
                        className="text-sm resize-none"
                        data-testid={`review-resposta-${tipo}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Descartar
            </Button>
            <Button onClick={salvarRevisao} disabled={isSaving} data-testid="button-confirmar-cenarios-ia">
              {isSaving
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

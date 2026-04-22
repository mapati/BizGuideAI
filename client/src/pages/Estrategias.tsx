import { useState } from "react";
import { useDeepLinkDialog } from "@/hooks/useDeepLinkDialog";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import { StrategyPicker } from "@/components/StrategyPicker";
import { Target, Plus, Sparkles, Trash2, Pencil, ArrowUpRight, Shield, TrendingUp, AlertCircle, Tag, CheckCircle2, Clock, Play, Briefcase, Target as TargetIcon, Link2, Settings2, ExternalLink, Wand2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";
import { CascataBlock } from "@/components/CascataBlock";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import type { AIGenerationParams } from "@shared/schema";

interface Estrategia {
  id: string;
  empresaId: string;
  tipo: "FO" | "FA" | "DO" | "DA";
  titulo: string;
  descricao: string;
  prioridade: "alta" | "média" | "baixa";
  status: "planejada" | "em_andamento" | "concluida";
  swotOrigemIds: string[] | null;
}

interface Candidata {
  tipo: "FO" | "FA" | "DO" | "DA";
  titulo: string;
  descricao: string;
  prioridade: "alta" | "média" | "baixa";
  potencial: "alto" | "medio";
  selecionada: boolean;
  swotOrigemIds: string[];
  swotOrigemTextos: string[];
}

interface SwotItem {
  id: string;
  tipo: "forca" | "fraqueza" | "oportunidade" | "ameaca";
  descricao: string;
}

const STATUS_CONFIG = {
  planejada: { label: "Planejada", icon: Clock, className: "text-muted-foreground" },
  em_andamento: { label: "Em andamento", icon: Play, className: "text-blue-600 dark:text-blue-400" },
  concluida: { label: "Concluída", icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
};

const PrioridadeBadge = ({ prioridade }: { prioridade: "alta" | "média" | "baixa" }) => {
  const variants = {
    alta: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    média: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    baixa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  return (
    <Badge className={variants[prioridade]} data-testid={`badge-prioridade-${prioridade}`}>
      {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
    </Badge>
  );
};

const TipoIcon = ({ tipo }: { tipo: string }) => {
  const icons = {
    FO: <ArrowUpRight className="h-5 w-5 text-green-600" />,
    FA: <Shield className="h-5 w-5 text-blue-600" />,
    DO: <TrendingUp className="h-5 w-5 text-purple-600" />,
    DA: <AlertCircle className="h-5 w-5 text-orange-600" />,
  };
  return icons[tipo as keyof typeof icons] || null;
};

interface Vinculado {
  iniciativas: Array<{ id: string; titulo: string; status: string; prioridade: string; progresso: number }>;
  okrs: Array<{ id: string; titulo: string; perspectiva: string; encerrado: boolean; progresso: number }>;
}

function ProgressBar({ value, className = "", "data-testid": testId }: { value: number; className?: string; "data-testid"?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid={testId}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{value}%</span>
    </div>
  );
}

const INICIATIVA_STATUS_LABELS: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const INICIATIVA_PRIORIDADE_CLASSES: Record<string, string> = {
  alta: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  média: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  baixa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

function VinculadosSheet({
  open,
  onClose,
  estrategia,
}: {
  open: boolean;
  onClose: () => void;
  estrategia: Estrategia | null;
}) {
  const [, navigate] = useLocation();
  const { data: vinculados, isLoading, isError } = useQuery<Vinculado>({
    queryKey: ["/api/estrategias", estrategia?.id, "vinculados"],
    queryFn: async () => {
      const res = await fetch(`/api/estrategias/${estrategia!.id}/vinculados`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar itens vinculados");
      return res.json();
    },
    enabled: open && !!estrategia?.id,
    staleTime: 30000,
  });

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-vinculados">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Vinculados à estratégia
          </SheetTitle>
          {estrategia && (
            <p className="text-sm text-muted-foreground line-clamp-2">{estrategia.titulo}</p>
          )}
        </SheetHeader>

        {isError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center" data-testid="error-vinculados">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Não foi possível carregar os itens vinculados. Tente fechar e abrir novamente.</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">
                  Iniciativas{" "}
                  <span className="text-muted-foreground font-normal">
                    ({vinculados?.iniciativas.length ?? 0})
                  </span>
                </h3>
              </div>
              {!vinculados?.iniciativas.length ? (
                <p className="text-sm text-muted-foreground py-2 pl-1" data-testid="empty-iniciativas">
                  Nenhuma iniciativa vinculada a esta estratégia.
                </p>
              ) : (
                <div className="space-y-2">
                  {vinculados.iniciativas.map(ini => (
                    <div
                      key={ini.id}
                      className="rounded-md border p-3"
                      data-testid={`vinculado-iniciativa-${ini.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium leading-tight">{ini.titulo}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => { onClose(); navigate("/iniciativas"); }}
                          data-testid={`link-iniciativa-${ini.id}`}
                          title="Ir para Iniciativas"
                          aria-label="Ir para Iniciativas"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge
                          className={INICIATIVA_PRIORIDADE_CLASSES[ini.prioridade] ?? ""}
                          data-testid={`badge-prioridade-ini-${ini.id}`}
                        >
                          {ini.prioridade.charAt(0).toUpperCase() + ini.prioridade.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {ini.status === "concluida" ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : ini.status === "em_andamento" ? (
                            <Play className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {INICIATIVA_STATUS_LABELS[ini.status] ?? ini.status}
                        </span>
                      </div>
                      <ProgressBar value={ini.progresso} data-testid={`progress-iniciativa-${ini.id}`} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <TargetIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">
                  OKRs{" "}
                  <span className="text-muted-foreground font-normal">
                    ({vinculados?.okrs.length ?? 0})
                  </span>
                </h3>
              </div>
              {!vinculados?.okrs.length ? (
                <p className="text-sm text-muted-foreground py-2 pl-1" data-testid="empty-okrs">
                  Nenhum OKR vinculado a esta estratégia.
                </p>
              ) : (
                <div className="space-y-2">
                  {vinculados.okrs.map(okr => (
                    <div
                      key={okr.id}
                      className="rounded-md border p-3"
                      data-testid={`vinculado-okr-${okr.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium leading-tight">{okr.titulo}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => { onClose(); navigate("/okrs"); }}
                          data-testid={`link-okr-${okr.id}`}
                          title="Ir para OKRs"
                          aria-label="Ir para OKRs"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {okr.perspectiva}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {okr.encerrado ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <Play className="h-3 w-3 text-blue-500" />
                          )}
                          {okr.encerrado ? "Encerrado" : "Em andamento"}
                        </span>
                      </div>
                      <ProgressBar value={okr.progresso} data-testid={`progress-okr-${okr.id}`} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EstrategiaCard({
  item,
  swotItens,
  oportunidades,
  onEdit,
  onDelete,
  onStatusChange,
  onGerarOportunidades,
  isGenerating,
}: {
  item: Estrategia;
  swotItens: SwotItem[];
  oportunidades: Array<{ id: string; titulo: string; estrategiaId?: string | null }>;
  onEdit: (e: Estrategia) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onGerarOportunidades: (estrategiaId: string) => void;
  isGenerating: boolean;
}) {
  const [vinculadosOpen, setVinculadosOpen] = useState(false);

  const { data: contadores } = useQuery<{ iniciativas: number; okrs: number }>({
    queryKey: ["/api/estrategias", item.id, "contadores"],
    queryFn: () => fetch(`/api/estrategias/${item.id}/contadores`, { credentials: "include" }).then(r => r.json()),
    staleTime: 30000,
  });

  const swotLabels: Record<string, string> = {
    forca: "Força",
    fraqueza: "Fraqueza",
    oportunidade: "Oportunidade",
    ameaca: "Ameaça",
  };

  const swotOrigemTextos = (item.swotOrigemIds ?? [])
    .map(id => swotItens.find(s => s.id === id))
    .filter(Boolean)
    .map(s => `${swotLabels[s!.tipo]}: ${s!.descricao}`);

  const statusKey = (item.status ?? "planejada") as keyof typeof STATUS_CONFIG;
  const statusCfg = STATUS_CONFIG[statusKey];
  const StatusIcon = statusCfg.icon;

  const hasVinculados = contadores && (contadores.iniciativas > 0 || contadores.okrs > 0);

  return (
    <>
      <VinculadosSheet
        open={vinculadosOpen}
        onClose={() => setVinculadosOpen(false)}
        estrategia={vinculadosOpen ? item : null}
      />
      <Card className="p-4" data-testid={`estrategia-${item.id}`}>
        <div className="flex justify-between items-start gap-2 mb-2">
          <h4 className="font-medium text-sm flex-1">{item.titulo}</h4>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
              data-testid={`button-edit-${item.id}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              data-testid={`button-delete-${item.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3">{item.descricao}</p>

        {swotOrigemTextos.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {swotOrigemTextos.map((texto, j) => (
              <span
                key={j}
                className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded px-2 py-0.5"
              >
                <Tag className="h-2.5 w-2.5 shrink-0" />
                {texto.length > 45 ? texto.slice(0, 45) + "…" : texto}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <PrioridadeBadge prioridade={item.prioridade} />

          <div className="flex items-center gap-3">
            {contadores && (
              <button
                onClick={() => setVinculadosOpen(true)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover-elevate rounded px-1.5 py-1"
                data-testid={`button-ver-vinculados-${item.id}`}
                title="Ver vinculados"
                aria-label="Ver vinculados"
              >
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {contadores.iniciativas}
                </span>
                <span className="flex items-center gap-1">
                  <TargetIcon className="h-3 w-3" />
                  {contadores.okrs}
                </span>
                {hasVinculados && <Link2 className="h-3 w-3 opacity-60" />}
              </button>
            )}

            <Select
              value={item.status ?? "planejada"}
              onValueChange={(v) => onStatusChange(item.id, v)}
            >
              <SelectTrigger
                className="h-7 text-xs w-auto gap-1 border-0 bg-transparent px-1 focus:ring-0"
                data-testid={`select-status-${item.id}`}
              >
                <StatusIcon className={`h-3 w-3 ${statusCfg.className}`} />
                <span className={statusCfg.className}>{statusCfg.label}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejada">
                  <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Planejada</span>
                </SelectItem>
                <SelectItem value="em_andamento">
                  <span className="flex items-center gap-1.5"><Play className="h-3 w-3" /> Em andamento</span>
                </SelectItem>
                <SelectItem value="concluida">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Concluída</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CascataBlock
          downstream={[{
            rotulo: "Oportunidades derivadas",
            itens: oportunidades.filter(o => o.estrategiaId === item.id).map(o => ({ id: o.id, titulo: o.titulo, href: "/oportunidades-crescimento", rotulo: "Oportunidade" })),
          }]}
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={isGenerating}
            onClick={() => onGerarOportunidades(item.id)}
            data-testid={`button-gerar-oportunidades-${item.id}`}
          >
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            Gerar oportunidades
          </Button>
        </div>
      </Card>
    </>
  );
}

export default function Estrategias() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [candidatas, setCandidatas] = useState<Candidata[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingCandidatas, setIsSavingCandidatas] = useState(false);
  const [isPreGenOpen, setIsPreGenOpen] = useState(false);
  const [generationController, setGenerationController] = useState<AbortController | null>(null);
  const [formData, setFormData] = useState({
    tipo: "",
    titulo: "",
    descricao: "",
    prioridade: "média" as "alta" | "média" | "baixa",
    swotOrigemIds: [] as string[],
  });

  const tipos = [
    { value: "FO", label: "FO - Ofensiva", desc: "Força + Oportunidade (Crescimento)", fullDesc: "Combine uma força interna com uma oportunidade externa para crescer" },
    { value: "FA", label: "FA - Confronto", desc: "Força + Ameaça (Proteção)", fullDesc: "Use uma força interna para neutralizar ou reduzir uma ameaça externa" },
    { value: "DO", label: "DO - Reorientação", desc: "Fraqueza + Oportunidade (Melhoria)", fullDesc: "Supere uma fraqueza interna aproveitando uma oportunidade externa" },
    { value: "DA", label: "DA - Defensiva", desc: "Fraqueza + Ameaça (Sobrevivência)", fullDesc: "Minimize uma fraqueza interna para evitar uma ameaça externa" },
  ];

  const swotLabels: Record<string, string> = {
    forca: "Força",
    fraqueza: "Fraqueza",
    oportunidade: "Oportunidade",
    ameaca: "Ameaça",
  };

  const { data: empresa } = useQuery<{ id: string; nome: string; setor: string; tamanho: string; descricao?: string | null }>({ queryKey: ["/api/empresa"] });

  const { data: oportunidades = [] } = useQuery<Array<{ id: string; titulo: string; estrategiaId?: string | null }>>({
    queryKey: ["/api/oportunidades-crescimento", undefined],
  });

  const { data: estrategias = [], isLoading } = useQuery<Estrategia[]>({
    queryKey: ["/api/estrategias", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: swotItens = [] } = useQuery<SwotItem[]>({
    queryKey: ["/api/analise-swot", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: estrategiasContextSummary } = useQuery<{
    counts: { swot: number; pestel: number; cincoForcas: number; modeloNegocio: number };
  }>({
    queryKey: ["/api/ai/estrategias-context-summary", empresa?.id],
    enabled: !!empresa?.id,
  });

  const criarEstrategiaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!empresa?.id) throw new Error("Empresa não encontrada");
      return await apiRequest("POST", "/api/estrategias", { ...data, empresaId: empresa.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa?.id] });
      toast({ title: "Estratégia adicionada!", description: "A estratégia foi salva com sucesso." });
      setFormData({ tipo: "", titulo: "", descricao: "", prioridade: "média", swotOrigemIds: [] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar estratégia", description: error.message, variant: "destructive" });
    },
  });

  const editarEstrategiaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/estrategias/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa?.id] });
      toast({ title: "Estratégia atualizada!" });
      setFormData({ tipo: "", titulo: "", descricao: "", prioridade: "média", swotOrigemIds: [] });
      setEditandoId(null);
      setIsDialogOpen(false);
    },
  });

  const deletarEstrategiaMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/estrategias/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa?.id] });
      toast({ title: "Estratégia removida" });
    },
  });

  const atualizarStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/estrategias/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa?.id] });
    },
  });

  const handleSaveEstrategia = () => {
    if (!formData.tipo || !formData.titulo || !formData.descricao) {
      toast({ title: "Campos obrigatórios", description: "Por favor, preencha todos os campos.", variant: "destructive" });
      return;
    }
    if (editandoId) {
      editarEstrategiaMutation.mutate({ id: editandoId, data: formData });
    } else {
      criarEstrategiaMutation.mutate(formData);
    }
  };

  const handleGerarOportunidades = async (estrategiaId: string) => {
    if (!empresa) return;
    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/gerar-oportunidades-crescimento", { empresaId: empresa.id, estrategiaId });
      if (response.oportunidades?.length > 0) {
        let count = 0;
        for (const op of response.oportunidades) {
          try { await apiRequest("POST", "/api/oportunidades-crescimento", { ...op, empresaId: empresa.id }); count++; } catch (e) { console.error(e); }
        }
        queryClient.invalidateQueries({ queryKey: ["/api/oportunidades-crescimento", undefined] });
        toast({ title: "Oportunidades geradas!", description: `${count} oportunidade(s) criadas a partir desta estratégia.` });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao gerar", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditEstrategia = (estrategia: Estrategia) => {
    setEditandoId(estrategia.id);
    setFormData({
      tipo: estrategia.tipo,
      titulo: estrategia.titulo,
      descricao: estrategia.descricao,
      prioridade: estrategia.prioridade,
      swotOrigemIds: estrategia.swotOrigemIds ?? [],
    });
    setIsDialogOpen(true);
  };

  useDeepLinkDialog(!!empresa?.id && !isLoading, ({ novo, editar, params }) => {
    if (editar) {
      const found = estrategias.find((e) => e.id === editar);
      if (!found) return false;
      handleEditEstrategia(found);
      setFormData((prev) => {
        const next = { ...prev };
        if (params.tipo) next.tipo = params.tipo;
        if (params.titulo) next.titulo = params.titulo;
        if (params.descricao) next.descricao = params.descricao;
        if (params.prioridade) {
          const p = params.prioridade === "media" ? "média" : params.prioridade;
          if (p === "alta" || p === "média" || p === "baixa") next.prioridade = p;
        }
        return next;
      });
      return true;
    }
    if (novo) {
      setEditandoId(null);
      setFormData({
        tipo: params.tipo || "",
        titulo: params.titulo || "",
        descricao: params.descricao || "",
        prioridade:
          params.prioridade === "alta" || params.prioridade === "média" || params.prioridade === "media" || params.prioridade === "baixa"
            ? (params.prioridade === "media" ? "média" : params.prioridade)
            : "média",
        swotOrigemIds: [],
      });
      setIsDialogOpen(true);
    }
  });

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditandoId(null);
      setFormData({ tipo: "", titulo: "", descricao: "", prioridade: "média", swotOrigemIds: [] });
    }
  };

  const handleGenerateStrategies = async (params: {
    quantidadePorQuadrante: number;
    quadrantesSelecionados: string[];
    instrucaoAdicional: string;
    fontesContexto: string[];
  }) => {
    if (!empresa) {
      toast({ title: "Perfil não encontrado", description: "Complete o perfil da empresa primeiro.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setIsPreGenOpen(false);
    setIsPickerOpen(true);
    const controller = new AbortController();
    setGenerationController(controller);
    try {
      const res = await fetch("/api/ai/gerar-estrategias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          empresaId: empresa.id,
          quantidadePorQuadrante: params.quantidadePorQuadrante,
          quadrantesSelecionados: params.quadrantesSelecionados,
          instrucaoAdicional: params.instrucaoAdicional,
          fontesContexto: params.fontesContexto,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const response = await res.json();
      const candidatasRecebidas: Candidata[] = response.candidatas ?? [];
      if (candidatasRecebidas.length === 0) {
        toast({ title: "Sem candidatas", description: "A IA não retornou candidatas. Tente novamente.", variant: "destructive" });
        setIsPickerOpen(false);
      } else {
        setCandidatas(candidatasRecebidas);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        toast({ title: "Geração cancelada", description: "A criação do cardápio foi interrompida." });
        setIsPickerOpen(false);
      } else {
        toast({ title: "Erro ao gerar estratégias", description: error.message, variant: "destructive" });
        setIsPickerOpen(false);
      }
    } finally {
      setIsGenerating(false);
      setGenerationController(null);
    }
  };

  const handleAbortGeneration = () => {
    if (generationController) {
      generationController.abort();
    }
  };

  const handleSaveCandidatas = async (selecionadas: Candidata[]) => {
    if (!empresa?.id) return;
    setIsSavingCandidatas(true);
    let adicionadas = 0;
    for (const c of selecionadas) {
      try {
        await apiRequest("POST", "/api/estrategias", {
          tipo: c.tipo,
          titulo: c.titulo,
          descricao: c.descricao,
          prioridade: c.prioridade,
          status: "planejada",
          swotOrigemIds: c.swotOrigemIds,
          empresaId: empresa.id,
        });
        adicionadas++;
      } catch (err) {
        console.error("Erro ao salvar candidata:", err);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/estrategias", empresa.id] });
    setIsSavingCandidatas(false);
    setIsPickerOpen(false);
    setCandidatas([]);
    if (adicionadas > 0) {
      toast({
        title: "Estratégias salvas!",
        description: `${adicionadas} ${adicionadas === 1 ? "estratégia adicionada" : "estratégias adicionadas"} ao seu plano.`,
      });
    }
  };

  const toggleSwotOrigem = (swotId: string) => {
    setFormData(prev => ({
      ...prev,
      swotOrigemIds: prev.swotOrigemIds.includes(swotId)
        ? prev.swotOrigemIds.filter(id => id !== swotId)
        : [...prev.swotOrigemIds, swotId],
    }));
  };

  const agruparPorTipo = () => ({
    FO: estrategias.filter(e => e.tipo === "FO"),
    FA: estrategias.filter(e => e.tipo === "FA"),
    DO: estrategias.filter(e => e.tipo === "DO"),
    DA: estrategias.filter(e => e.tipo === "DA"),
  });

  if (!empresa) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Complete seu perfil primeiro</h2>
          <p className="text-muted-foreground mb-6">Para criar estratégias, você precisa completar o perfil da sua empresa.</p>
          <Button onClick={() => window.location.href = "/onboarding"} data-testid="button-ir-onboarding">
            Ir para Onboarding
          </Button>
        </Card>
      </div>
    );
  }

  const grupos = agruparPorTipo();
  const semSwot = empresa && swotItens.length < 4 && estrategias.length === 0;

  const emExecucao = estrategias.filter(e => e.status === "em_andamento").length;
  const concluidas = estrategias.filter(e => e.status === "concluida").length;
  const total = estrategias.length;

  const quadrantesConfig = [
    { value: "FO", label: "FO — Ofensiva", desc: "Força + Oportunidade (crescimento)" },
    { value: "FA", label: "FA — Confronto", desc: "Força + Ameaça (proteção)" },
    { value: "DO", label: "DO — Reorientação", desc: "Fraqueza + Oportunidade (melhoria)" },
    { value: "DA", label: "DA — Defensiva", desc: "Fraqueza + Ameaça (sobrevivência)" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <AIGenerationModal
        open={isPreGenOpen}
        onOpenChange={setIsPreGenOpen}
        onConfirm={(params: AIGenerationParams) => {
          const fontes = (params.fontesContexto ?? []).filter((f) => f !== "swot");
          handleGenerateStrategies({
            quantidadePorQuadrante: params.quantidade ?? 3,
            quadrantesSelecionados: params.foco ?? [],
            instrucaoAdicional: params.instrucaoAdicional ?? "",
            fontesContexto: fontes,
          });
        }}
        title="Gerar cardápio de estratégias com IA"
        description="Configure os quadrantes, fontes de contexto e instruções para a IA."
        isGenerating={isGenerating}
        testIdPrefix="estrategias"
        quantidade={{
          label: "Opções por quadrante",
          default: 3,
          min: 1,
          max: 5,
          suffixSingular: "opção",
          suffixPlural: "opções",
        }}
        foco={{
          label: "Quadrantes a gerar",
          description: "Selecione quais tipos de estratégia incluir.",
          items: quadrantesConfig.map((q) => ({ value: q.value, label: q.label, desc: q.desc })),
          defaultSelected: quadrantesConfig.map((q) => q.value),
          requireAtLeastOne: true,
        }}
        fontesContexto={{
          label: "Fontes de contexto",
          items: [
            {
              id: "swot",
              label: "SWOT",
              desc: "Diagnóstico estratégico",
              count: estrategiasContextSummary?.counts?.swot ?? 0,
              alwaysIncluded: true,
            },
            {
              id: "pestel",
              label: "Cenário Externo",
              desc: "Fatores PESTEL",
              count: estrategiasContextSummary?.counts?.pestel ?? 0,
            },
            {
              id: "cincoForcas",
              label: "Mercado e concorrência",
              desc: "5 Forças de Porter",
              count: estrategiasContextSummary?.counts?.cincoForcas ?? 0,
            },
            {
              id: "modeloNegocio",
              label: "Modelo de Negócio",
              desc: "Estrutura do negócio",
              count: estrategiasContextSummary?.counts?.modeloNegocio ?? 0,
            },
          ],
        }}
        instrucaoAdicional={{
          placeholder: "Ex: Priorize estratégias que não exijam investimento imediato e que possam ser executadas pela equipe atual.",
        }}
      />

      <StrategyPicker
        open={isPickerOpen}
        onClose={() => { setIsPickerOpen(false); setCandidatas([]); }}
        onSave={handleSaveCandidatas}
        onAbort={handleAbortGeneration}
        candidatas={candidatas}
        isLoading={isGenerating}
        isSaving={isSavingCandidatas}
      />

      {semSwot && (
        <PrerequisiteWarning
          titulo="Recomendado: mapeie forças e fraquezas antes de criar estratégias"
          descricao="Suas estratégias ficam mais precisas quando combinam pontos fortes, fraquezas, oportunidades e ameaças."
          linkLabel="Ir para Forças e Fraquezas"
          linkHref="/swot"
          variante="info"
        />
      )}

      <PageHeader
        title="Estratégias de Ação"
        description="Combine forças, fraquezas, oportunidades e ameaças para criar estratégias práticas e acionáveis."
        tooltip="Estratégias que cruzam seus pontos fortes e fracos com oportunidades e ameaças do mercado — transformando o diagnóstico em um plano concreto."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPreGenOpen(true)}
              disabled={isGenerating}
              data-testid="button-generate-strategies"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-estrategia">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Estratégia
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-w-2xl max-h-[90vh] overflow-y-auto"
                hideClose
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>{editandoId ? "Editar Estratégia" : "Nova Estratégia"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Tipo de Estratégia</Label>
                    <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                      <SelectTrigger data-testid="select-tipo-estrategia">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label} - {t.desc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.tipo && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {tipos.find(t => t.value === formData.tipo)?.fullDesc}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Título da Estratégia</Label>
                    <Input
                      placeholder="Ex: Expandir para mercado internacional usando experiência técnica"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      data-testid="input-titulo-estrategia"
                    />
                  </div>

                  <div>
                    <Label>Descrição Detalhada</Label>
                    <Textarea
                      placeholder="Descreva como essa estratégia será implementada..."
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="min-h-[100px]"
                      data-testid="textarea-descricao-estrategia"
                    />
                  </div>

                  <div>
                    <Label>Nível de Prioridade</Label>
                    <Select value={formData.prioridade} onValueChange={(v: "alta" | "média" | "baixa") => setFormData({ ...formData, prioridade: v })}>
                      <SelectTrigger data-testid="select-prioridade-estrategia">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="média">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {swotItens.length > 0 && (
                    <div>
                      <Label>Itens SWOT Relacionados (opcional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">Selecione os itens do diagnóstico que embasam esta estratégia</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                        {swotItens.map(s => (
                          <label
                            key={s.id}
                            className="flex items-start gap-2 cursor-pointer rounded px-1 py-0.5 hover:bg-muted/50"
                            data-testid={`swot-item-${s.id}`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.swotOrigemIds.includes(s.id)}
                              onChange={() => toggleSwotOrigem(s.id)}
                              className="mt-0.5 shrink-0"
                            />
                            <span className="text-xs">
                              <span className="text-muted-foreground font-medium">{swotLabels[s.tipo]}: </span>
                              {s.descricao}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleCloseDialog(false)}>Cancelar</Button>
                  <Button
                    onClick={handleSaveEstrategia}
                    disabled={criarEstrategiaMutation.isPending || editarEstrategiaMutation.isPending}
                    data-testid="button-salvar-estrategia"
                  >
                    {editandoId ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {total > 0 && (
        <div className="flex items-center gap-4 mb-4 px-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Play className="h-3.5 w-3.5 text-blue-500" />
            <span data-testid="indicador-em-execucao">
              {emExecucao} de {total} estratégias em execução
            </span>
          </div>
          {concluidas > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>{concluidas} concluída{concluidas !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      <ExampleCard>
        <strong>FO (Ofensiva):</strong> Use nossa equipe técnica experiente para atender a crescente demanda por soluções digitais no mercado. <strong>Prioridade: Alta</strong>
      </ExampleCard>

      {isLoading ? (
        <Card className="mt-6 p-8">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </Card>
      ) : estrategias.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<Target className="h-16 w-16" />}
            title="Transforme o diagnóstico em estratégias práticas"
            description="A IA gera um cardápio de opções para você escolher — combinando seus pontos fortes com as oportunidades do mercado, e neutralizando fraquezas e ameaças."
            actionLabel="Gerar com IA"
            onAction={() => setIsPreGenOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {[
            { tipo: "FO", label: "Ofensivas (FO)", items: grupos.FO, desc: "Força + Oportunidade" },
            { tipo: "FA", label: "Confronto (FA)", items: grupos.FA, desc: "Força + Ameaça" },
            { tipo: "DO", label: "Reorientação (DO)", items: grupos.DO, desc: "Fraqueza + Oportunidade" },
            { tipo: "DA", label: "Defensivas (DA)", items: grupos.DA, desc: "Fraqueza + Ameaça" },
          ].map((grupo) => (
            <Card key={grupo.tipo} className="p-6" data-testid={`card-grupo-${grupo.tipo}`}>
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <TipoIcon tipo={grupo.tipo} />
                  <div>
                    <h3 className="text-lg font-semibold">{grupo.label}</h3>
                    <p className="text-xs text-muted-foreground">{grupo.desc}</p>
                  </div>
                  <Badge variant="outline">{grupo.items.length}</Badge>
                </div>
              </div>
              <div className="space-y-3">
                {grupo.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma estratégia {grupo.label.toLowerCase()} ainda
                  </p>
                ) : (
                  grupo.items.map(item => (
                    <EstrategiaCard
                      key={item.id}
                      item={item}
                      swotItens={swotItens}
                      oportunidades={oportunidades}
                      onEdit={handleEditEstrategia}
                      onDelete={(id) => deletarEstrategiaMutation.mutate(id)}
                      onStatusChange={(id, status) => atualizarStatusMutation.mutate({ id, status })}
                      onGerarOportunidades={handleGerarOportunidades}
                      isGenerating={isGenerating}
                    />
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

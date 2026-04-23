import { useState, useEffect, useMemo, useCallback } from "react";
import { useDeepLinkDialog } from "@/hooks/useDeepLinkDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/EmptyState";
import { ExampleCard } from "@/components/ExampleCard";
import {
  Briefcase, Plus, Sparkles, Trash2, Pencil, Clock, User, TrendingUp, Link2, Wand2,
  Target, CheckCircle2, PauseCircle, XCircle, Search, X, ListFilter, LayoutGrid, List as ListIcon, MoreVertical, ChevronDown,
  Table as TableIcon, GanttChart, ArrowUp, ArrowDown, ArrowUpDown, CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parse as parseDateFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";
import { OrigemSelector } from "@/components/OrigemSelector";
import { CascataBlock } from "@/components/CascataBlock";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Iniciativa, type InsertIniciativa, type AIGenerationParams } from "@shared/schema";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { z } from "zod";

interface Estrategia {
  id: string;
  tipo: string;
  titulo: string;
}

interface Membro {
  id: string;
  nome: string;
  email: string;
}

const formSchema = z.object({
  empresaId: z.string(),
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  status: z.string(),
  prioridade: z.string(),
  prazo: z.string(),
  // Task #263 — data normalizada (YYYY-MM-DD) opcional vinculada ao prazo.
  prazoData: z.string().optional().nullable(),
  responsavel: z.string(),
  responsavelId: z.string().optional().nullable(),
  impacto: z.string(),
  estrategiaId: z.string().optional().nullable(),
  oportunidadeId: z.string().optional().nullable(),
  // Task #250 — 5W2H (opcionais; complementam o quê/quem/quando)
  porque: z.string().optional().nullable(),
  onde: z.string().optional().nullable(),
  como: z.string().optional().nullable(),
  quanto: z.string().optional().nullable(),
});

const statusLabels = {
  planejada: "Planejada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const prioridadeLabels = {
  alta: "Alta",
  média: "Média",
  baixa: "Baixa",
};

const impactoLabels = {
  alto: "Alto",
  médio: "Médio",
  baixo: "Baixo",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  planejada: "secondary",
  em_andamento: "default",
  concluida: "outline",
  pausada: "secondary",
  cancelada: "destructive",
};

const prioridadeVariants: Record<string, "default" | "secondary" | "outline"> = {
  alta: "default",
  média: "secondary",
  baixa: "outline",
};

const impactoVariants: Record<string, "default" | "secondary" | "outline"> = {
  alto: "default",
  médio: "secondary",
  baixo: "outline",
};

function EncerramentoBlock({ iniciativa, testIdSuffix }: { iniciativa: Pick<Iniciativa, "id" | "status" | "notaEncerramento" | "encerradaEm">; testIdSuffix?: string }) {
  const encerrada = ["concluida", "pausada", "cancelada"].includes(iniciativa.status);
  if (!encerrada || (!iniciativa.notaEncerramento && !iniciativa.encerradaEm)) return null;
  const Icon = iniciativa.status === "concluida" ? CheckCircle2 : iniciativa.status === "pausada" ? PauseCircle : XCircle;
  const tituloMap: Record<string, string> = {
    concluida: "Encerramento da iniciativa",
    pausada: "Iniciativa pausada",
    cancelada: "Iniciativa cancelada",
  };
  const dataFormatada = iniciativa.encerradaEm
    ? new Date(iniciativa.encerradaEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  const sufix = testIdSuffix ?? iniciativa.id;
  return (
    <div
      className="rounded-md border bg-muted/40 p-3 space-y-1.5"
      data-testid={`section-encerramento-${sufix}`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{tituloMap[iniciativa.status]}</span>
        {dataFormatada && (
          <span
            className="text-xs text-muted-foreground font-normal"
            data-testid={`text-encerrada-em-${sufix}`}
          >
            em {dataFormatada}
          </span>
        )}
      </div>
      {iniciativa.notaEncerramento && (
        <p
          className="text-sm text-muted-foreground whitespace-pre-wrap"
          data-testid={`text-nota-encerramento-${sufix}`}
        >
          {iniciativa.notaEncerramento}
        </p>
      )}
    </div>
  );
}

interface IniciativaCardProps {
  iniciativa: Iniciativa;
  estrategias: Estrategia[];
  oportunidades: Array<{ id: string; titulo: string }>;
  objetivos: Array<{ id: string; titulo: string; iniciativaId?: string | null }>;
  indicadores: Array<{ id: string; nome: string }>;
  jornadaConcluida: boolean;
  onGerarObjetivos: (iniciativaId: string) => void;
  isGenerating: boolean;
  onEdit: (iniciativa: Iniciativa) => void;
  onDelete: (id: string) => void;
}

function IniciativaCard({ iniciativa, estrategias, oportunidades, objetivos, indicadores, jornadaConcluida, onGerarObjetivos, isGenerating, onEdit, onDelete }: IniciativaCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-iniciativa-${iniciativa.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{iniciativa.titulo}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(iniciativa)}
              data-testid={`button-edit-${iniciativa.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(iniciativa.id)}
              data-testid={`button-delete-${iniciativa.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariants[iniciativa.status]} data-testid={`badge-status-${iniciativa.id}`}>
              {statusLabels[iniciativa.status as keyof typeof statusLabels]}
            </Badge>
            <Badge variant={prioridadeVariants[iniciativa.prioridade]} data-testid={`badge-prioridade-${iniciativa.id}`}>
              {prioridadeLabels[iniciativa.prioridade as keyof typeof prioridadeLabels]}
            </Badge>
            <Badge variant={impactoVariants[iniciativa.impacto]} data-testid={`badge-impacto-${iniciativa.id}`}>
              Impacto {impactoLabels[iniciativa.impacto as keyof typeof impactoLabels]}
            </Badge>
            {iniciativa.estrategiaId && (() => {
              const est = estrategias.find(e => e.id === iniciativa.estrategiaId);
              return est ? (
                <Badge variant="outline" className="gap-1" data-testid={`badge-estrategia-${iniciativa.id}`}>
                  <Link2 className="h-3 w-3" />
                  {est.tipo} — {est.titulo.length > 35 ? est.titulo.slice(0, 35) + "…" : est.titulo}
                </Badge>
              ) : null;
            })()}
            {/* Task #208 — Badge "Atacando: KPI X" quando a iniciativa está
                vinculada a um indicador via indicadorFonteId. */}
            {iniciativa.indicadorFonteId && (() => {
              const ind = indicadores.find(i => i.id === iniciativa.indicadorFonteId);
              return ind ? (
                <Badge variant="outline" className="gap-1" data-testid={`badge-indicador-fonte-${iniciativa.id}`}>
                  <Target className="h-3 w-3" />
                  Atacando: {ind.nome.length > 35 ? ind.nome.slice(0, 35) + "…" : ind.nome}
                </Badge>
              ) : null;
            })()}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{iniciativa.prazo}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{iniciativa.responsavel}</span>
            </div>
          </div>
          {(() => {
            const op = oportunidades.find(o => o.id === iniciativa.oportunidadeId);
            const est = estrategias.find(e => e.id === iniciativa.estrategiaId);
            const upstream = op
              ? { id: op.id, titulo: op.titulo, href: "/oportunidades-crescimento", rotulo: "Oportunidade" }
              : est
              ? { id: est.id, titulo: est.titulo, href: "/estrategias", rotulo: "Estratégia" }
              : null;
            const derivados = objetivos.filter(o => o.iniciativaId === iniciativa.id);
            const orfao = jornadaConcluida && !iniciativa.oportunidadeId && !iniciativa.estrategiaId;
            return (
              <CascataBlock
                upstream={upstream}
                downstream={[{ rotulo: "Objetivos derivados", itens: derivados.map(o => ({ id: o.id, titulo: o.titulo, href: "/okrs", rotulo: "Objetivo" })) }]}
                orfao={orfao}
                orfaoMensagem="Esta iniciativa não está conectada a uma Estratégia ou Oportunidade."
              />
            );
          })()}
          <EncerramentoBlock iniciativa={iniciativa} />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={isGenerating}
              onClick={() => onGerarObjetivos(iniciativa.id)}
              data-testid={`button-gerar-objetivos-${iniciativa.id}`}
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Gerar objetivos
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Task #253 — Filtros combináveis + visualização Kanban
// =============================================================================

const STATUS_VALUES = ["planejada", "em_andamento", "concluida", "pausada", "cancelada"] as const;
type StatusValue = typeof STATUS_VALUES[number];
const PRIORIDADE_VALUES = ["alta", "média", "baixa"] as const;
const IMPACTO_VALUES = ["alto", "médio", "baixo"] as const;

const NO_RESPONSAVEL = "__SEM_RESPONSAVEL__";
const NO_ORIGEM = "__SEM_ORIGEM__";

const VIEW_MODES = ["lista", "kanban", "tabela", "gantt"] as const;
type ViewMode = typeof VIEW_MODES[number];

interface IniciativasView {
  status: string[];
  prioridade: string[];
  impacto: string[];
  prazo: string[];
  responsavel: string[];
  origem: string[]; // ids: estrategia ids, oportunidade ids, ou NO_ORIGEM
  busca: string;
  modo: ViewMode;
}

type IniciativasViewArrayKey =
  | "status" | "prioridade" | "impacto" | "prazo" | "responsavel" | "origem";

const VIEW_DEFAULT: IniciativasView = {
  status: [], prioridade: [], impacto: [], prazo: [], responsavel: [], origem: [],
  busca: "", modo: "lista",
};

function viewStorageKey(empresaId?: string) {
  return empresaId ? `iniciativas:view:${empresaId}` : null;
}

function useIniciativasView(empresaId?: string) {
  const [view, setView] = useState<IniciativasView>(VIEW_DEFAULT);

  // Hidrata do localStorage quando a empresa fica disponível.
  useEffect(() => {
    const key = viewStorageKey(empresaId);
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const modo: ViewMode = (VIEW_MODES as readonly string[]).includes(parsed?.modo)
          ? (parsed.modo as ViewMode)
          : "lista";
        setView({ ...VIEW_DEFAULT, ...parsed, modo });
      } else {
        setView(VIEW_DEFAULT);
      }
    } catch {
      setView(VIEW_DEFAULT);
    }
  }, [empresaId]);

  // Persiste mudanças (debounce-less; payload é minúsculo).
  useEffect(() => {
    const key = viewStorageKey(empresaId);
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(view)); } catch { /* ignora quota */ }
  }, [empresaId, view]);

  const update = useCallback(<K extends keyof IniciativasView>(k: K, v: IniciativasView[K]) => {
    setView((prev) => ({ ...prev, [k]: v }));
  }, []);

  const toggle = useCallback((k: IniciativasViewArrayKey, value: string) => {
    setView((prev) => {
      const arr = prev[k];
      const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...prev, [k]: next };
    });
  }, []);

  const clearGroup = useCallback((k: IniciativasViewArrayKey) => {
    setView((prev) => ({ ...prev, [k]: [] }));
  }, []);

  const clearFilters = useCallback(() => {
    setView((prev) => ({ ...VIEW_DEFAULT, modo: prev.modo }));
  }, []);

  return { view, setView, update, toggle, clearGroup, clearFilters };
}

interface FilterOption { value: string; label: string }

function MultiSelectFilter({
  label, options, selected, onToggle, onClear, testId, withSearch = true,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  testId: string;
  withSearch?: boolean;
}) {
  const count = selected.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          data-testid={`button-filter-${testId}`}
        >
          <span>{label}</span>
          {count > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 px-1.5 text-xs"
              data-testid={`badge-filter-count-${testId}`}
            >
              {count}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          {withSearch && options.length > 3 && (
            <CommandInput placeholder={`Buscar ${label.toLowerCase()}…`} />
          )}
          <CommandList>
            <CommandEmpty>Nenhum item.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => onToggle(opt.value)}
                    className="gap-2"
                    data-testid={`option-filter-${testId}-${opt.value}`}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <span className="flex-1 truncate">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {count > 0 && (
              <>
                <DropdownMenuSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={onClear}
                    className="text-muted-foreground"
                    data-testid={`button-filter-clear-${testId}`}
                  >
                    Limpar seleção
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface FilterBarProps {
  view: IniciativasView;
  totalAtivos: number;
  onToggleFilter: (k: IniciativasViewArrayKey, value: string) => void;
  onClearGroup: (k: IniciativasViewArrayKey) => void;
  onSearch: (s: string) => void;
  onClearAll: () => void;
  options: {
    status: FilterOption[]; prioridade: FilterOption[]; impacto: FilterOption[];
    prazo: FilterOption[]; responsavel: FilterOption[]; origem: FilterOption[];
  };
}

function FiltersGrid({ view, options, onToggleFilter, onClearGroup }: Pick<FilterBarProps, "view" | "options" | "onToggleFilter" | "onClearGroup">) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelectFilter label="Status" options={options.status} selected={view.status}
        onToggle={(v) => onToggleFilter("status", v)} onClear={() => onClearGroup("status")} testId="status" withSearch={false} />
      <MultiSelectFilter label="Prioridade" options={options.prioridade} selected={view.prioridade}
        onToggle={(v) => onToggleFilter("prioridade", v)} onClear={() => onClearGroup("prioridade")} testId="prioridade" withSearch={false} />
      <MultiSelectFilter label="Impacto" options={options.impacto} selected={view.impacto}
        onToggle={(v) => onToggleFilter("impacto", v)} onClear={() => onClearGroup("impacto")} testId="impacto" withSearch={false} />
      <MultiSelectFilter label="Prazo" options={options.prazo} selected={view.prazo}
        onToggle={(v) => onToggleFilter("prazo", v)} onClear={() => onClearGroup("prazo")} testId="prazo" />
      <MultiSelectFilter label="Responsável" options={options.responsavel} selected={view.responsavel}
        onToggle={(v) => onToggleFilter("responsavel", v)} onClear={() => onClearGroup("responsavel")} testId="responsavel" />
      <MultiSelectFilter label="Origem" options={options.origem} selected={view.origem}
        onToggle={(v) => onToggleFilter("origem", v)} onClear={() => onClearGroup("origem")} testId="origem" />
    </div>
  );
}

function IniciativasFilterBar(props: FilterBarProps & {
  modo: ViewMode;
  onChangeModo: (m: ViewMode) => void;
}) {
  const { view, totalAtivos, onSearch, onClearAll, modo, onChangeModo } = props;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={view.busca}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar título ou descrição…"
            className="pl-8"
            data-testid="input-iniciativas-busca"
          />
        </div>

        {/* Desktop: filtros inline */}
        <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <FiltersGrid {...props} />
          {totalAtivos > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="gap-1 text-muted-foreground"
              data-testid="button-clear-all-filters"
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros ({totalAtivos})
            </Button>
          )}
        </div>

        {/* Mobile: tudo num sheet */}
        <div className="sm:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-open-filters-mobile">
                <ListFilter className="h-4 w-4" />
                Filtros
                {totalAtivos > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">{totalAtivos}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-3">
                <FiltersGrid {...props} />
                {totalAtivos > 0 && (
                  <Button variant="ghost" size="sm" onClick={onClearAll} className="gap-1 self-start text-muted-foreground" data-testid="button-clear-all-filters-mobile">
                    <X className="h-3.5 w-3.5" />
                    Limpar filtros ({totalAtivos})
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <ToggleGroup
        type="single"
        value={modo}
        onValueChange={(v) => {
          if ((VIEW_MODES as readonly string[]).includes(v)) onChangeModo(v as ViewMode);
        }}
        className="self-start sm:self-auto"
        aria-label="Modo de visualização"
      >
        <ToggleGroupItem value="lista" size="sm" aria-label="Visualização em lista" data-testid="button-view-lista">
          <ListIcon className="h-4 w-4" />
          <span className="ml-1 hidden md:inline">Lista</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="kanban" size="sm" aria-label="Visualização em kanban" data-testid="button-view-kanban">
          <LayoutGrid className="h-4 w-4" />
          <span className="ml-1 hidden md:inline">Kanban</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="tabela" size="sm" aria-label="Visualização em tabela" data-testid="button-view-tabela">
          <TableIcon className="h-4 w-4" />
          <span className="ml-1 hidden md:inline">Tabela</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="gantt" size="sm" aria-label="Visualização em gantt" data-testid="button-view-gantt">
          <GanttChart className="h-4 w-4" />
          <span className="ml-1 hidden md:inline">Gantt</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

interface KanbanCardProps {
  iniciativa: Iniciativa;
  estrategias: Estrategia[];
  oportunidades: Array<{ id: string; titulo: string }>;
  onMove: (id: string, status: StatusValue) => void;
  onEdit: (i: Iniciativa) => void;
  onDelete: (id: string) => void;
}

function IniciativaKanbanCard({
  iniciativa, estrategias, oportunidades, onMove, onEdit, onDelete,
  draggable = false, dragging = false, overlay = false,
}: KanbanCardProps & { draggable?: boolean; dragging?: boolean; overlay?: boolean }) {
  const est = estrategias.find((e) => e.id === iniciativa.estrategiaId);
  const op = oportunidades.find((o) => o.id === iniciativa.oportunidadeId);
  const origem = est ? `${est.tipo} — ${est.titulo}` : op ? op.titulo : null;
  const outros = STATUS_VALUES.filter((s) => s !== iniciativa.status);

  const draggableState = useDraggable({ id: iniciativa.id, disabled: !draggable });
  const setNodeRef = draggable ? draggableState.setNodeRef : undefined;
  const listeners = draggable ? draggableState.listeners : undefined;
  const attributes = draggable ? draggableState.attributes : undefined;

  const cardClassName = [
    "hover-elevate",
    draggable ? "touch-none cursor-grab active:cursor-grabbing" : "",
    dragging ? "opacity-40" : "",
    overlay ? "shadow-lg ring-1 ring-border cursor-grabbing" : "",
  ].filter(Boolean).join(" ");

  return (
    <Card
      ref={setNodeRef}
      className={cardClassName}
      data-testid={`card-kanban-${iniciativa.id}`}
      {...listeners}
      {...attributes}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onEdit(iniciativa)}
            className="flex-1 cursor-pointer text-left text-sm font-medium leading-snug hover:underline"
            data-testid={`kanban-titulo-${iniciativa.id}`}
          >
            {iniciativa.titulo}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="-mr-1.5 -mt-1 h-7 w-7" data-testid={`button-kanban-menu-${iniciativa.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mover para…</DropdownMenuLabel>
              {outros.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => onMove(iniciativa.id, s)}
                  data-testid={`menu-mover-${iniciativa.id}-${s}`}
                >
                  {statusLabels[s]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(iniciativa)} data-testid={`menu-edit-${iniciativa.id}`}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(iniciativa.id)} className="text-destructive" data-testid={`menu-delete-${iniciativa.id}`}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Badge variant={prioridadeVariants[iniciativa.prioridade]} data-testid={`kanban-prioridade-${iniciativa.id}`}>
            {prioridadeLabels[iniciativa.prioridade as keyof typeof prioridadeLabels]}
          </Badge>
          <Badge variant={impactoVariants[iniciativa.impacto]}>
            Impacto {impactoLabels[iniciativa.impacto as keyof typeof impactoLabels]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {iniciativa.prazo && (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{iniciativa.prazo}</span>
          )}
          {iniciativa.responsavel && (
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{iniciativa.responsavel}</span>
          )}
        </div>

        {origem && (
          <Badge variant="outline" className="max-w-full gap-1 truncate">
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{origem}</span>
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  status, items, activeId, estrategias, oportunidades, onMove, onEdit, onDelete,
}: {
  status: StatusValue;
  items: Iniciativa[];
  activeId: string | null;
  estrategias: Estrategia[];
  oportunidades: Array<{ id: string; titulo: string }>;
  onMove: (id: string, status: StatusValue) => void;
  onEdit: (i: Iniciativa) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: status });
  const activeIsFromAnotherColumn =
    !!active && items.every((it) => it.id !== active.id);
  const showPlaceholder = isOver && activeIsFromAnotherColumn;

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col gap-2 rounded-md border p-2 transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : "bg-muted/30"
      }`}
      data-testid={`kanban-column-${status}`}
      aria-label={`Coluna ${statusLabels[status]}`}
    >
      <div className="flex items-center justify-between px-1 py-1">
        <h3 className="text-sm font-semibold">{statusLabels[status]}</h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs" data-testid={`kanban-count-${status}`}>
          {items.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && !showPlaceholder ? (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nenhuma iniciativa
          </div>
        ) : (
          <>
            {items.map((it) => (
              <IniciativaKanbanCard
                key={it.id}
                iniciativa={it}
                estrategias={estrategias}
                oportunidades={oportunidades}
                onMove={onMove}
                onEdit={onEdit}
                onDelete={onDelete}
                draggable
                dragging={activeId === it.id}
              />
            ))}
            {showPlaceholder && (
              <div
                className="rounded-md border-2 border-dashed border-primary/50 bg-primary/5 p-4 text-center text-xs text-primary"
                data-testid={`kanban-placeholder-${status}`}
              >
                Soltar para mover para {statusLabels[status]}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KanbanBoard({
  iniciativas, estrategias, oportunidades, onMove, onEdit, onDelete,
}: {
  iniciativas: Iniciativa[];
  estrategias: Estrategia[];
  oportunidades: Array<{ id: string; titulo: string }>;
  onMove: (id: string, status: StatusValue) => void;
  onEdit: (i: Iniciativa) => void;
  onDelete: (id: string) => void;
}) {
  const grupos = useMemo(() => {
    const map: Record<StatusValue, Iniciativa[]> = {
      planejada: [], em_andamento: [], concluida: [], pausada: [], cancelada: [],
    };
    for (const it of iniciativas) {
      const s = (STATUS_VALUES as readonly string[]).includes(it.status)
        ? (it.status as StatusValue) : "planejada";
      map[s].push(it);
    }
    return map;
  }, [iniciativas]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIniciativa = activeId
    ? iniciativas.find((i) => i.id === activeId) ?? null
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = String(over.id);
    if (!(STATUS_VALUES as readonly string[]).includes(newStatus)) return;
    const it = iniciativas.find((i) => i.id === active.id);
    if (!it || it.status === newStatus) return;
    onMove(it.id, newStatus as StatusValue);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-2" data-testid="kanban-board">
        {STATUS_VALUES.map((s) => (
          <KanbanColumn
            key={s}
            status={s}
            items={grupos[s]}
            activeId={activeId}
            estrategias={estrategias}
            oportunidades={oportunidades}
            onMove={onMove}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeIniciativa ? (
          <div className="w-72">
            <IniciativaKanbanCard
              iniciativa={activeIniciativa}
              estrategias={estrategias}
              oportunidades={oportunidades}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// =============================================================================
// Task #259 — Visualização em Tabela
// =============================================================================

type TabelaSortKey = "status" | "titulo" | "responsavel" | "prazo" | "prioridade" | "impacto" | "origem";
type TabelaSortDir = "asc" | "desc";

const PRIORIDADE_RANK: Record<string, number> = { alta: 1, "média": 2, baixa: 3 };
const IMPACTO_RANK: Record<string, number> = { alto: 1, "médio": 2, baixo: 3 };
const STATUS_RANK: Record<string, number> = {
  em_andamento: 1, planejada: 2, pausada: 3, concluida: 4, cancelada: 5,
};

function origemLabel(
  iniciativa: Iniciativa,
  estrategias: Estrategia[],
  oportunidades: Array<{ id: string; titulo: string }>,
): string {
  const est = estrategias.find((e) => e.id === iniciativa.estrategiaId);
  if (est) return `${est.tipo} — ${est.titulo}`;
  const op = oportunidades.find((o) => o.id === iniciativa.oportunidadeId);
  if (op) return `Frente — ${op.titulo}`;
  return "";
}

function IniciativasTabela({
  iniciativas, estrategias, oportunidades, onEdit,
}: {
  iniciativas: Iniciativa[];
  estrategias: Estrategia[];
  oportunidades: Array<{ id: string; titulo: string }>;
  onEdit: (i: Iniciativa) => void;
}) {
  const [sortKey, setSortKey] = useState<TabelaSortKey>("prioridade");
  const [sortDir, setSortDir] = useState<TabelaSortDir>("asc");

  const handleSort = (k: TabelaSortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const data = [...iniciativas];
    const cmp = (a: Iniciativa, b: Iniciativa) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "status":
          return ((STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99)) * dir;
        case "titulo":
          return a.titulo.localeCompare(b.titulo, "pt-BR") * dir;
        case "responsavel":
          return (a.responsavel || "").localeCompare(b.responsavel || "", "pt-BR") * dir;
        case "prazo": {
          const pa = parsePrazo(a.prazo, a.createdAt, a.prazoData);
          const pb = parsePrazo(b.prazo, b.createdAt, b.prazoData);
          const va = pa ? pa.end.getTime() : Number.POSITIVE_INFINITY;
          const vb = pb ? pb.end.getTime() : Number.POSITIVE_INFINITY;
          if (va === vb) return (a.prazo || "").localeCompare(b.prazo || "", "pt-BR") * dir;
          return (va - vb) * dir;
        }
        case "prioridade":
          return ((PRIORIDADE_RANK[a.prioridade] ?? 99) - (PRIORIDADE_RANK[b.prioridade] ?? 99)) * dir;
        case "impacto":
          return ((IMPACTO_RANK[a.impacto] ?? 99) - (IMPACTO_RANK[b.impacto] ?? 99)) * dir;
        case "origem":
          return origemLabel(a, estrategias, oportunidades)
            .localeCompare(origemLabel(b, estrategias, oportunidades), "pt-BR") * dir;
      }
    };
    data.sort(cmp);
    return data;
  }, [iniciativas, sortKey, sortDir, estrategias, oportunidades]);

  const SortBtn = ({ label, k }: { label: string; k: TabelaSortKey }) => {
    const Icon = sortKey !== k ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => handleSort(k)}
        className="inline-flex items-center gap-1 text-left font-medium hover:underline"
        data-testid={`sort-${k}`}
      >
        <span>{label}</span>
        <Icon className="h-3 w-3 opacity-60" />
      </button>
    );
  };

  return (
    <div className="rounded-md border overflow-x-auto" data-testid="iniciativas-tabela">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortBtn label="Status" k="status" /></TableHead>
            <TableHead><SortBtn label="Título" k="titulo" /></TableHead>
            <TableHead><SortBtn label="Responsável" k="responsavel" /></TableHead>
            <TableHead><SortBtn label="Prazo" k="prazo" /></TableHead>
            <TableHead><SortBtn label="Prioridade" k="prioridade" /></TableHead>
            <TableHead><SortBtn label="Impacto" k="impacto" /></TableHead>
            <TableHead><SortBtn label="Origem" k="origem" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((it) => {
            const origem = origemLabel(it, estrategias, oportunidades);
            return (
              <TableRow
                key={it.id}
                onClick={() => onEdit(it)}
                className="cursor-pointer"
                data-testid={`row-iniciativa-${it.id}`}
              >
                <TableCell>
                  <Badge variant={statusVariants[it.status]} data-testid={`tabela-status-${it.id}`}>
                    {statusLabels[it.status as keyof typeof statusLabels] ?? it.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[24rem]">
                  <div className="font-medium truncate" data-testid={`tabela-titulo-${it.id}`}>{it.titulo}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {it.responsavel || "—"}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {it.prazo || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={prioridadeVariants[it.prioridade]}>
                    {prioridadeLabels[it.prioridade as keyof typeof prioridadeLabels] ?? it.prioridade}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={impactoVariants[it.impacto]}>
                    {impactoLabels[it.impacto as keyof typeof impactoLabels] ?? it.impacto}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[18rem]">
                  {origem ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Link2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{origem}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// Task #259 — Visualização em Gantt
// =============================================================================

const MESES_PT_SHORT: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

function endOfMonth(year: number, monthIdx: number) {
  return new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
}

/**
 * Parser tolerante para o campo `prazo`. Retorna a janela `[start, end]` da
 * iniciativa. Quando não conseguir interpretar o prazo, retorna null.
 * Aceita: dd/mm/yyyy, yyyy-mm-dd, "Mar/2025", "Q1 2025", "1T/2025", "2025".
 *
 * Task #263 — quando `prazoData` (YYYY-MM-DD normalizado) estiver definido,
 * tem precedência sobre o parser de texto livre.
 */
function parsePrazo(
  prazo: string | null | undefined,
  createdAt: Date | string,
  prazoData?: string | null,
): { start: Date; end: Date } | null {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const start = isNaN(created.getTime()) ? new Date() : created;
  if (prazoData) {
    const m = String(prazoData).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const end = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 23, 59, 59);
      if (!isNaN(end.getTime())) return { start, end };
    }
  }
  if (!prazo) return null;
  const txt = String(prazo).trim();
  if (!txt) return null;

  // dd/mm/yyyy ou dd/mm/yy
  let m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    const end = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10), 23, 59, 59);
    if (!isNaN(end.getTime())) return { start, end };
  }
  // yyyy-mm-dd
  m = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const end = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 23, 59, 59);
    if (!isNaN(end.getTime())) return { start, end };
  }
  // mes/yyyy ou mes-yyyy (ex: Mar/2025, mar 2025)
  m = txt.match(/^([a-zçãéê]{3,})[\s./-]+(\d{4})$/i);
  if (m) {
    const mes = m[1].slice(0, 3).toLowerCase();
    if (mes in MESES_PT_SHORT) {
      const y = parseInt(m[2], 10);
      return { start, end: endOfMonth(y, MESES_PT_SHORT[mes]) };
    }
  }
  // mm/yyyy
  m = txt.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mIdx = parseInt(m[1], 10) - 1;
    const y = parseInt(m[2], 10);
    if (mIdx >= 0 && mIdx <= 11) return { start, end: endOfMonth(y, mIdx) };
  }
  // Q1 2025, Q2/2025, 1T 2025, 2T/2025
  m = txt.match(/^(?:Q|T)?\s*([1-4])\s*(?:T|º|o)?[\s/-]+(\d{4})$/i)
    || txt.match(/^([1-4])\s*[TQ][\s/-]+(\d{4})$/i)
    || txt.match(/^Q([1-4])[\s/-]+(\d{4})$/i);
  if (m) {
    const q = parseInt(m[1], 10);
    const y = parseInt(m[2], 10);
    return { start, end: endOfMonth(y, q * 3 - 1) };
  }
  // Apenas ano
  m = txt.match(/^(\d{4})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    return { start, end: new Date(y, 11, 31, 23, 59, 59) };
  }
  // Última tentativa: Date.parse
  const t = Date.parse(txt);
  if (!isNaN(t)) {
    return { start, end: new Date(t) };
  }
  return null;
}

const GANTT_STATUS_COLORS: Record<string, string> = {
  planejada: "bg-slate-400 dark:bg-slate-500",
  em_andamento: "bg-primary",
  concluida: "bg-emerald-500 dark:bg-emerald-600",
  pausada: "bg-amber-500 dark:bg-amber-600",
  cancelada: "bg-destructive",
};

type GanttZoom = "mes" | "trimestre" | "ano";

function IniciativasGantt({
  iniciativas, onEdit,
}: {
  iniciativas: Iniciativa[];
  onEdit: (i: Iniciativa) => void;
}) {
  const [zoom, setZoom] = useState<GanttZoom>("trimestre");

  const parsed = useMemo(() => {
    return iniciativas.map((it) => ({
      iniciativa: it,
      janela: parsePrazo(it.prazo, it.createdAt, it.prazoData),
    }));
  }, [iniciativas]);

  // Agrupa visualmente por status (mesma cor fica junta) e dentro do grupo
  // por data de fim ascendente.
  const comPrazo = useMemo(() => {
    return parsed.filter((p) => p.janela).sort((a, b) => {
      const sa = STATUS_RANK[a.iniciativa.status] ?? 99;
      const sb = STATUS_RANK[b.iniciativa.status] ?? 99;
      if (sa !== sb) return sa - sb;
      return (a.janela!.end.getTime()) - (b.janela!.end.getTime());
    });
  }, [parsed]);
  const semPrazo = parsed.filter((p) => !p.janela);

  // Calcula janela de tempo com base nas iniciativas + zoom
  const escala = useMemo(() => {
    const now = new Date();
    let min = now.getTime();
    let max = now.getTime();
    for (const p of comPrazo) {
      if (!p.janela) continue;
      min = Math.min(min, p.janela.start.getTime());
      max = Math.max(max, p.janela.end.getTime());
    }
    // Padding
    const startDate = new Date(min);
    const endDate = new Date(max);
    if (zoom === "mes") {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(endDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (zoom === "trimestre") {
      const sQ = Math.floor(startDate.getMonth() / 3);
      startDate.setMonth(sQ * 3, 1);
      startDate.setHours(0, 0, 0, 0);
      const eQ = Math.floor(endDate.getMonth() / 3);
      endDate.setMonth(eQ * 3 + 3, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(11, 31);
      endDate.setHours(23, 59, 59, 999);
    }
    // Build buckets para o header
    const buckets: Array<{ label: string; start: Date; end: Date }> = [];
    const cur = new Date(startDate);
    while (cur.getTime() <= endDate.getTime()) {
      if (zoom === "mes") {
        const e = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
        buckets.push({
          label: cur.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
          start: new Date(cur),
          end: e,
        });
        cur.setMonth(cur.getMonth() + 1, 1);
      } else if (zoom === "trimestre") {
        const q = Math.floor(cur.getMonth() / 3) + 1;
        const e = new Date(cur.getFullYear(), q * 3, 0, 23, 59, 59, 999);
        buckets.push({
          label: `Q${q}/${cur.getFullYear()}`,
          start: new Date(cur),
          end: e,
        });
        cur.setMonth(q * 3, 1);
      } else {
        const e = new Date(cur.getFullYear(), 11, 31, 23, 59, 59, 999);
        buckets.push({
          label: String(cur.getFullYear()),
          start: new Date(cur),
          end: e,
        });
        cur.setFullYear(cur.getFullYear() + 1, 0, 1);
      }
    }
    return {
      startMs: startDate.getTime(),
      endMs: endDate.getTime(),
      totalMs: Math.max(1, endDate.getTime() - startDate.getTime()),
      buckets,
    };
  }, [comPrazo, zoom]);

  const minColWidth = zoom === "mes" ? 80 : zoom === "trimestre" ? 110 : 140;
  const trackMinWidth = Math.max(640, escala.buckets.length * minColWidth);

  return (
    <div className="space-y-4" data-testid="iniciativas-gantt">
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Zoom:</span>
        <ToggleGroup
          type="single"
          value={zoom}
          onValueChange={(v) => { if (v === "mes" || v === "trimestre" || v === "ano") setZoom(v); }}
          aria-label="Zoom do gráfico"
        >
          <ToggleGroupItem value="mes" size="sm" data-testid="gantt-zoom-mes">Mês</ToggleGroupItem>
          <ToggleGroupItem value="trimestre" size="sm" data-testid="gantt-zoom-trimestre">Trimestre</ToggleGroupItem>
          <ToggleGroupItem value="ano" size="sm" data-testid="gantt-zoom-ano">Ano</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {comPrazo.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <div className="flex" style={{ minWidth: trackMinWidth + 240 }}>
            {/* Coluna de títulos (sticky) */}
            <div className="w-60 shrink-0 border-r bg-muted/30">
              <div className="h-9 border-b px-3 flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Iniciativa
              </div>
              {comPrazo.map(({ iniciativa }) => (
                <button
                  type="button"
                  key={iniciativa.id}
                  onClick={() => onEdit(iniciativa)}
                  className="block w-full h-10 border-b px-3 text-left text-sm truncate hover-elevate"
                  data-testid={`gantt-titulo-${iniciativa.id}`}
                >
                  {iniciativa.titulo}
                </button>
              ))}
            </div>
            {/* Trilho do gráfico */}
            <div className="flex-1 relative">
              {/* Header escala */}
              <div className="flex h-9 border-b bg-muted/20">
                {escala.buckets.map((b, idx) => (
                  <div
                    key={idx}
                    className="border-r last:border-r-0 px-2 text-xs flex items-center text-muted-foreground"
                    style={{ flex: `1 1 ${100 / escala.buckets.length}%` }}
                  >
                    {b.label}
                  </div>
                ))}
              </div>
              {/* Linhas */}
              {comPrazo.map(({ iniciativa, janela }) => {
                if (!janela) return null;
                const startMs = Math.max(janela.start.getTime(), escala.startMs);
                const endMs = Math.min(janela.end.getTime(), escala.endMs);
                const leftPct = ((startMs - escala.startMs) / escala.totalMs) * 100;
                const widthPct = Math.max(1, ((endMs - startMs) / escala.totalMs) * 100);
                const cor = GANTT_STATUS_COLORS[iniciativa.status] ?? "bg-primary";
                return (
                  <div
                    key={iniciativa.id}
                    className="relative h-10 border-b"
                    data-testid={`gantt-row-${iniciativa.id}`}
                  >
                    {/* Grade vertical */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {escala.buckets.map((_, idx) => (
                        <div
                          key={idx}
                          className="border-r border-border/50 last:border-r-0"
                          style={{ flex: `1 1 ${100 / escala.buckets.length}%` }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(iniciativa)}
                      className={`absolute top-1.5 bottom-1.5 rounded ${cor} hover:opacity-80 active:opacity-70 transition-opacity flex items-center px-2 text-xs text-white truncate`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${iniciativa.titulo} — ${statusLabels[iniciativa.status as keyof typeof statusLabels] ?? iniciativa.status}`}
                      data-testid={`gantt-bar-${iniciativa.id}`}
                    >
                      <span className="truncate">{iniciativa.titulo}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-6 text-center text-sm text-muted-foreground" data-testid="gantt-sem-prazo-valido">
          Nenhuma iniciativa com prazo interpretável. Veja abaixo as iniciativas sem prazo definido.
        </Card>
      )}

      {/* Legenda */}
      {comPrazo.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" data-testid="gantt-legenda">
          {STATUS_VALUES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${GANTT_STATUS_COLORS[s]}`} />
              {statusLabels[s]}
            </span>
          ))}
        </div>
      )}

      {semPrazo.length > 0 && (
        <div className="rounded-md border" data-testid="gantt-sem-prazo">
          <div className="border-b px-3 py-2 text-sm font-medium">
            Sem prazo definido
            <span className="ml-2 text-xs text-muted-foreground">({semPrazo.length})</span>
          </div>
          <div className="divide-y">
            {semPrazo.map(({ iniciativa }) => (
              <button
                type="button"
                key={iniciativa.id}
                onClick={() => onEdit(iniciativa)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover-elevate"
                data-testid={`gantt-sem-prazo-item-${iniciativa.id}`}
              >
                <Badge variant={statusVariants[iniciativa.status]} className="shrink-0">
                  {statusLabels[iniciativa.status as keyof typeof statusLabels] ?? iniciativa.status}
                </Badge>
                <span className="flex-1 text-sm truncate">{iniciativa.titulo}</span>
                {iniciativa.prazo && (
                  <span className="text-xs text-muted-foreground truncate">{iniciativa.prazo}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Iniciativas() {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIniciativa, setEditingIniciativa] = useState<Iniciativa | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const { data: empresa } = useQuery<{ id: string; nome: string }>({
    queryKey: ["/api/empresa"],
  });

  const { data: iniciativas = [], isLoading } = useQuery<Iniciativa[]>({
    queryKey: ["/api/iniciativas", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: estrategias = [] } = useQuery<Estrategia[]>({
    queryKey: ["/api/estrategias", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: oportunidades = [] } = useQuery<Array<{ id: string; titulo: string; tipo: string }>>({
    queryKey: ["/api/oportunidades-crescimento", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: objetivos = [] } = useQuery<Array<{ id: string; titulo: string; iniciativaId?: string | null }>>({
    queryKey: ["/api/objetivos", empresa?.id],
    enabled: !!empresa?.id,
  });

  // Task #208 — usado para exibir o badge "Atacando: KPI X" quando a
  // iniciativa estiver vinculada a um indicador.
  const { data: indicadoresLista = [] } = useQuery<Array<{ id: string; nome: string }>>({
    queryKey: ["/api/indicadores", empresa?.id],
    enabled: !!empresa?.id,
  });

  const { data: membros = [] } = useQuery<Membro[]>({
    queryKey: ["/api/membros"],
  });

  const { jornadaConcluida } = useJornadaProgresso();
  const origemObrigatoria = !jornadaConcluida;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      empresaId: empresa?.id || "",
      titulo: "",
      descricao: "",
      status: "planejada",
      prioridade: "média",
      prazo: "",
      prazoData: null,
      responsavel: "",
      responsavelId: null,
      impacto: "médio",
      estrategiaId: null,
      oportunidadeId: null,
      porque: "",
      onde: "",
      como: "",
      quanto: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertIniciativa) => {
      return apiRequest("POST", "/api/iniciativas", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
      toast({
        title: "Sucesso!",
        description: "Iniciativa criada com sucesso.",
      });
      setOpenDialog(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a iniciativa.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertIniciativa> }) => {
      return apiRequest("PATCH", `/api/iniciativas/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
      toast({
        title: "Sucesso!",
        description: "Iniciativa atualizada com sucesso.",
      });
      setOpenDialog(false);
      setEditingIniciativa(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a iniciativa.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/iniciativas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
      toast({
        title: "Sucesso!",
        description: "Iniciativa excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a iniciativa.",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation<{ iniciativas: InsertIniciativa[] }, Error, AIGenerationParams>({
    mutationFn: async (params: AIGenerationParams) => {
      // Modo MATRIZ: o backend já estampa estrategiaId/oportunidadeId conforme o alvo.
      const data = await apiRequest("POST", "/api/ai/gerar-iniciativas", {
        empresaId: empresa?.id,
        ...params,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.iniciativas && data.iniciativas.length > 0) {
        Promise.all(
          data.iniciativas.map((iniciativa) =>
            apiRequest("POST", "/api/iniciativas", {
              ...iniciativa,
              empresaId: empresa?.id,
            })
          )
        ).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
          setIsGenerating(false);
          toast({
            title: "Sucesso!",
            description: `${data.iniciativas.length} iniciativas geradas com sucesso.`,
          });
        }).catch(() => {
          setIsGenerating(false);
          toast({
            title: "Erro",
            description: "Não foi possível salvar as iniciativas geradas.",
            variant: "destructive",
          });
        });
      } else {
        setIsGenerating(false);
        toast({
          title: "Nenhuma iniciativa gerada",
          description: "A IA não conseguiu gerar novas iniciativas. Tente novamente.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Erro",
        description: "Não foi possível gerar as iniciativas.",
        variant: "destructive",
      });
    },
  });

  const handleConfirmAIGeneration = (params: AIGenerationParams) => {
    setIsAIModalOpen(false);
    setIsGenerating(true);
    generateMutation.mutate(params);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (origemObrigatoria && !values.estrategiaId && !values.oportunidadeId) {
      toast({
        title: "Origem obrigatória",
        description: "Durante a primeira jornada, escolha a Estratégia ou Oportunidade de origem.",
        variant: "destructive",
      });
      return;
    }
    if (editingIniciativa) {
      updateMutation.mutate({
        id: editingIniciativa.id,
        data: values,
      });
    } else {
      createMutation.mutate({
        ...values,
        empresaId: empresa?.id || "",
      });
    }
  };

  const handleEdit = (iniciativa: Iniciativa) => {
    setEditingIniciativa(iniciativa);
    form.reset({
      empresaId: iniciativa.empresaId,
      titulo: iniciativa.titulo,
      descricao: iniciativa.descricao,
      status: iniciativa.status,
      prioridade: iniciativa.prioridade,
      prazo: iniciativa.prazo,
      prazoData: iniciativa.prazoData ?? null,
      responsavel: iniciativa.responsavel,
      responsavelId: iniciativa.responsavelId ?? null,
      impacto: iniciativa.impacto,
      estrategiaId: iniciativa.estrategiaId ?? null,
      oportunidadeId: iniciativa.oportunidadeId ?? null,
      porque: iniciativa.porque ?? "",
      onde: iniciativa.onde ?? "",
      como: iniciativa.como ?? "",
      quanto: iniciativa.quanto ?? "",
    });
    setOpenDialog(true);
  };

  const handleGerarObjetivosFromIniciativa = async (iniciativaId: string) => {
    if (!empresa) return;
    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/gerar-objetivos", { empresaId: empresa.id, iniciativaId });
      if (response.objetivos?.length > 0) {
        let count = 0;
        for (const obj of response.objetivos) {
          try { await apiRequest("POST", "/api/objetivos", { ...obj, empresaId: empresa.id }); count++; } catch (e) { console.error(e); }
        }
        queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresa.id] });
        toast({ title: "Objetivos gerados!", description: `${count} objetivo(s) criados a partir desta iniciativa.` });
      }
    } catch (e: any) {
      toast({ title: "Erro ao gerar", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta iniciativa?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setOpenDialog(open);
    if (!open) {
      setEditingIniciativa(null);
      form.reset();
    }
  };

  useDeepLinkDialog(!!empresa?.id && !isLoading, ({ novo, editar, params }) => {
    if (editar) {
      const found = iniciativas.find((i) => i.id === editar);
      if (!found) return false;
      handleEdit(found);
      // Apply any extra overrides from query params on top of the loaded entity
      const overrides: Partial<z.infer<typeof formSchema>> = {};
      if (params.titulo) overrides.titulo = params.titulo;
      if (params.descricao) overrides.descricao = params.descricao;
      if (params.status) overrides.status = params.status;
      if (params.prioridade) {
        const p = params.prioridade === "media" ? "média" : params.prioridade;
        if (p === "alta" || p === "média" || p === "baixa") overrides.prioridade = p;
      }
      if (params.prazo) overrides.prazo = params.prazo;
      if (params.prazoData) overrides.prazoData = params.prazoData;
      if (params.responsavel) overrides.responsavel = params.responsavel;
      if (params.impacto) overrides.impacto = params.impacto;
      if (Object.keys(overrides).length > 0) {
        form.reset({ ...form.getValues(), ...overrides });
      }
      return true;
    }
    if (novo) {
      setEditingIniciativa(null);
      form.reset({
        empresaId: empresa?.id || "",
        titulo: params.titulo || "",
        descricao: params.descricao || "",
        status: params.status || "planejada",
        prioridade:
          params.prioridade === "alta" || params.prioridade === "média" || params.prioridade === "media" || params.prioridade === "baixa"
            ? (params.prioridade === "media" ? "média" : params.prioridade)
            : "média",
        prazo: params.prazo || "",
        prazoData: params.prazoData || null,
        responsavel: params.responsavel || "",
        responsavelId: null,
        impacto: params.impacto || "médio",
        estrategiaId: params.estrategiaId || null,
        oportunidadeId: params.oportunidadeId || null,
      });
      setOpenDialog(true);
    }
  });

  const sortedIniciativas = useMemo(() => {
    const prioridadeOrder = { alta: 1, média: 2, baixa: 3 } as const;
    return [...iniciativas].sort((a, b) =>
      (prioridadeOrder[a.prioridade as keyof typeof prioridadeOrder] ?? 9) -
      (prioridadeOrder[b.prioridade as keyof typeof prioridadeOrder] ?? 9));
  }, [iniciativas]);

  // Task #274 — alvos da matriz: agora são os Objetivos (Metas e Resultados)
  // já cadastrados. A IA gera iniciativas para cada Objetivo existente.
  const totalObjetivos = objetivos.length;

  // ---- Task #253: filtros + view mode --------------------------------------
  const { view, update, toggle, clearGroup, clearFilters } = useIniciativasView(empresa?.id);

  const filterOptions = useMemo(() => {
    const prazos = Array.from(new Set(iniciativas.map((i) => i.prazo).filter(Boolean))).sort();
    const responsaveisDistintos = Array.from(
      new Set(iniciativas.map((i) => (i.responsavel || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
    const responsaveis: FilterOption[] = responsaveisDistintos.map((r) => ({ value: r, label: r }));
    const temSemResp = iniciativas.some((i) => !i.responsavel || !i.responsavel.trim());
    if (temSemResp) responsaveis.push({ value: NO_RESPONSAVEL, label: "Sem responsável" });

    const origem: FilterOption[] = [
      ...estrategias.map((e) => ({
        value: e.id,
        label: `${e.tipo} — ${e.titulo.length > 40 ? e.titulo.slice(0, 40) + "…" : e.titulo}`,
      })),
      ...oportunidades.map((o) => ({
        value: o.id,
        label: `Frente — ${o.titulo.length > 40 ? o.titulo.slice(0, 40) + "…" : o.titulo}`,
      })),
      { value: NO_ORIGEM, label: "Sem origem" },
    ];

    return {
      status: STATUS_VALUES.map((s) => ({ value: s, label: statusLabels[s] })),
      prioridade: PRIORIDADE_VALUES.map((p) => ({ value: p, label: prioridadeLabels[p] })),
      impacto: IMPACTO_VALUES.map((p) => ({ value: p, label: impactoLabels[p] })),
      prazo: prazos.map((p) => ({ value: p, label: p })),
      responsavel: responsaveis,
      origem,
    };
  }, [iniciativas, estrategias, oportunidades]);

  const filteredIniciativas = useMemo(() => {
    const buscaNorm = view.busca.trim().toLowerCase();
    return sortedIniciativas.filter((it) => {
      if (view.status.length && !view.status.includes(it.status)) return false;
      if (view.prioridade.length && !view.prioridade.includes(it.prioridade)) return false;
      if (view.impacto.length && !view.impacto.includes(it.impacto)) return false;
      if (view.prazo.length && !view.prazo.includes(it.prazo)) return false;
      if (view.responsavel.length) {
        const r = (it.responsavel || "").trim();
        const matches = (r && view.responsavel.includes(r)) || (!r && view.responsavel.includes(NO_RESPONSAVEL));
        if (!matches) return false;
      }
      if (view.origem.length) {
        const semOrigem = !it.estrategiaId && !it.oportunidadeId;
        const matches =
          (it.estrategiaId && view.origem.includes(it.estrategiaId)) ||
          (it.oportunidadeId && view.origem.includes(it.oportunidadeId)) ||
          (semOrigem && view.origem.includes(NO_ORIGEM));
        if (!matches) return false;
      }
      if (buscaNorm) {
        const hay = `${it.titulo} ${it.descricao}`.toLowerCase();
        if (!hay.includes(buscaNorm)) return false;
      }
      return true;
    });
  }, [sortedIniciativas, view]);

  const totalFiltrosAtivos =
    view.status.length + view.prioridade.length + view.impacto.length +
    view.prazo.length + view.responsavel.length + view.origem.length +
    (view.busca.trim() ? 1 : 0);

  const altaPrioridade = filteredIniciativas.filter((i) => i.prioridade === "alta");
  const mediaPrioridade = filteredIniciativas.filter((i) => i.prioridade === "média");
  const baixaPrioridade = filteredIniciativas.filter((i) => i.prioridade === "baixa");

  const moveStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusValue }) =>
      apiRequest("PATCH", `/api/iniciativas/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/iniciativas", empresa?.id] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível mover a iniciativa.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando iniciativas...</p>
      </div>
    );
  }

  const semEstategias = empresa && estrategias.length === 0 && iniciativas.length === 0;
  // Task #274 — para o modo matriz precisamos de pelo menos 1 Objetivo cadastrado.
  const semObjetivos = !!empresa && totalObjetivos === 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {semEstategias && (
        <PrerequisiteWarning
          titulo="Recomendado: crie estratégias antes de definir iniciativas"
          descricao="As iniciativas devem derivar das estratégias definidas na Matriz TOWS. Definir as estratégias primeiro garante que as iniciativas estejam alinhadas com os objetivos estratégicos."
          linkLabel="Ir para Estratégias"
          linkHref="/estrategias"
          variante="info"
        />
      )}
      {!semEstategias && semObjetivos && (
        <PrerequisiteWarning
          titulo="Para gerar iniciativas, crie primeiro seus Objetivos"
          descricao="As Iniciativas são a camada de execução abaixo dos Objetivos: a IA gera projetos concretos (5W2H) para CADA Objetivo já cadastrado. Defina suas Metas e Resultados antes de habilitar a geração em matriz."
          linkLabel="Ir para Metas e Resultados"
          linkHref="/okrs"
          variante="info"
        />
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Iniciativas Prioritárias</h1>
        <p className="text-muted-foreground">
          Gerencie o portfólio de projetos e ações estratégicas para executar sua estratégia
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            O que são Iniciativas Prioritárias?
          </CardTitle>
          <CardDescription>
            Iniciativas são projetos e ações concretas que você vai executar para alcançar seus objetivos estratégicos.
            Elas transformam estratégia em execução prática, com responsáveis, prazos e métricas de impacto claras.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => setIsAIModalOpen(true)}
          disabled={!empresa?.id || isGenerating || totalObjetivos === 0}
          className="gap-2"
          data-testid="button-generate-ai"
          title={
            totalObjetivos === 0
              ? "Crie ao menos um Objetivo (Meta) em 'Metas e Resultados' para gerar iniciativas em matriz."
              : undefined
          }
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Gerando..." : "Gerar com IA"}
        </Button>

        <AIGenerationModal
          open={isAIModalOpen}
          onOpenChange={setIsAIModalOpen}
          onConfirm={handleConfirmAIGeneration}
          title="Gerar iniciativas com IA"
          description={`A IA gera iniciativas (5W2H) para CADA Objetivo (Meta) já cadastrado, criando a camada de execução abaixo dos Objetivos. Total de Objetivos hoje: ${totalObjetivos}.`}
          isGenerating={isGenerating}
          testIdPrefix="ai-iniciativas"
          quantidade={{
            label: "Iniciativas por alvo",
            default: 2,
            min: 1,
            max: 3,
            suffixSingular: "por alvo",
            suffixPlural: "por alvo",
          }}
          foco={{
            label: "Prioridades",
            description: "Selecione as prioridades que a IA deve considerar.",
            items: [
              { value: "alta", label: "Alta", desc: "Crítico para a estratégia" },
              { value: "média", label: "Média", desc: "Importante mas não urgente" },
              { value: "baixa", label: "Baixa", desc: "Pode aguardar próximos ciclos" },
            ],
          }}
          focoSecundario={{
            label: "Horizonte de prazo",
            description: "Opcional. Filtre por horizonte de execução. Sem seleção, a IA equilibra prazos.",
            items: [
              { value: "curto", label: "Curto prazo", desc: "Até 1 trimestre" },
              { value: "médio", label: "Médio prazo", desc: "2 a 3 trimestres" },
              { value: "longo", label: "Longo prazo", desc: "4 trimestres ou mais" },
            ],
            defaultSelected: [],
          }}
          fontesContexto={{
            label: "Fontes de contexto",
            items: [
              { id: "modeloNegocio", label: "Modelo de Negócio (Canvas)", desc: "Atividades, recursos e parcerias", alwaysIncluded: true },
              { id: "swot", label: "SWOT", desc: "Forças, fraquezas, oportunidades e ameaças" },
              { id: "indicadores", label: "Indicadores atuais", desc: "KPIs cadastrados na empresa" },
            ],
            defaultSelected: ["modeloNegocio"],
          }}
          instrucaoAdicional={{
            placeholder: "Ex: Priorize iniciativas que possam ser executadas pela equipe atual.",
          }}
        />

        <Dialog open={openDialog} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-add-manual">
              <Plus className="h-4 w-4" />
              Adicionar Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIniciativa ? "Editar Iniciativa" : "Nova Iniciativa"}
              </DialogTitle>
            </DialogHeader>
            {editingIniciativa && (
              <div className="mb-4">
                <EncerramentoBlock
                  iniciativa={editingIniciativa}
                  testIdSuffix="dialog"
                />
              </div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Iniciativa</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Lançar programa de fidelidade digital"
                          {...field}
                          data-testid="input-titulo"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição e Objetivos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva a iniciativa e o que você espera alcançar..."
                          {...field}
                          rows={4}
                          data-testid="input-descricao"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="planejada">Planejada</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluida">Concluída</SelectItem>
                            <SelectItem value="pausada">Pausada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prioridade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-prioridade">
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="média">Média</SelectItem>
                            <SelectItem value="baixa">Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prazoData"
                    render={({ field }) => {
                      const prazoTexto = form.watch("prazo") || "";
                      const dateValue = field.value ? parseDateFn(field.value, "yyyy-MM-dd", new Date()) : null;
                      const validDate = dateValue && !isNaN(dateValue.getTime()) ? dateValue : null;
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>Prazo</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={`w-full justify-start font-normal ${!validDate ? "text-muted-foreground" : ""}`}
                                  data-testid="button-prazo-data"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {validDate
                                    ? format(validDate, "dd/MM/yyyy", { locale: ptBR })
                                    : "Escolha uma data"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={validDate ?? undefined}
                                onSelect={(d) => {
                                  if (d) {
                                    const iso = format(d, "yyyy-MM-dd");
                                    field.onChange(iso);
                                    form.setValue("prazo", format(d, "dd/MM/yyyy"));
                                  } else {
                                    field.onChange(null);
                                  }
                                }}
                                locale={ptBR}
                                initialFocus
                              />
                              {validDate && (
                                <div className="flex justify-end border-t p-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange(null);
                                      // Mantém o texto livre apenas se não for derivado da data.
                                      if (validDate && form.getValues("prazo") === format(validDate, "dd/MM/yyyy")) {
                                        form.setValue("prazo", "");
                                      }
                                    }}
                                    data-testid="button-prazo-data-limpar"
                                  >
                                    Limpar data
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Selecione uma data ou use o campo livre abaixo (ex.: "Q1 2025").
                          </FormDescription>
                          <Input
                            placeholder="Ou texto livre: Q1 2025, Mar/2025…"
                            value={prazoTexto}
                            onChange={(e) => {
                              form.setValue("prazo", e.target.value);
                              // Texto livre digitado manualmente desfaz a data normalizada.
                              if (field.value) field.onChange(null);
                            }}
                            data-testid="input-prazo"
                          />
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="impacto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impacto Esperado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-impacto">
                              <SelectValue placeholder="Selecione o impacto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="alto">Alto</SelectItem>
                            <SelectItem value="médio">Médio</SelectItem>
                            <SelectItem value="baixo">Baixo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="responsavelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          if (v === "__none__") {
                            field.onChange(null);
                          } else {
                            field.onChange(v);
                            const m = membros.find(x => x.id === v);
                            if (m) form.setValue("responsavel", m.nome);
                          }
                        }}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-responsavel">
                            <SelectValue placeholder="Selecione um responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            {form.getValues("responsavel")
                              ? `Não atribuído (texto: ${form.getValues("responsavel")})`
                              : "Não atribuído"}
                          </SelectItem>
                          {membros.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <OrigemSelector
                  label="Oportunidade de origem"
                  obrigatorio={origemObrigatoria && !form.watch("estrategiaId")}
                  ajuda={origemObrigatoria ? "Durante a 1ª jornada, escolha uma Oportunidade (preferencial) ou Estratégia." : undefined}
                  opcoes={oportunidades.map(o => ({ id: o.id, label: `[${o.tipo}] ${o.titulo}` }))}
                  value={form.watch("oportunidadeId") || ""}
                  onChange={(v) => form.setValue("oportunidadeId", v || null)}
                  testId="select-origem-oportunidade"
                />

                {estrategias.length > 0 && (
                  <OrigemSelector
                    label="Estratégia relacionada"
                    obrigatorio={origemObrigatoria && !form.watch("oportunidadeId")}
                    opcoes={estrategias.map(e => ({ id: e.id, label: `[${e.tipo}] ${e.titulo}` }))}
                    value={form.watch("estrategiaId") || ""}
                    onChange={(v) => form.setValue("estrategiaId", v || null)}
                    testId="select-estrategia"
                  />
                )}

                {/* Task #250 — Plano 5W2H (campos opcionais) */}
                <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Plano de ação 5W2H (opcional)</p>
                    <p className="text-xs text-muted-foreground">
                      Os campos abaixo complementam o "O quê" (título/descrição), "Quem" (responsável)
                      e "Quando" (prazo). Preencha conforme o nível de detalhe necessário.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="porque"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Por quê</FormLabel>
                        <FormDescription>
                          Justificativa estratégica: qual problema/oportunidade esta iniciativa endereça e o impacto esperado.
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="Ex: Reduzir churn em 15% atacando a fraqueza identificada na pesquisa de NPS."
                            rows={2}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            data-testid="input-porque"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="onde"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Onde</FormLabel>
                        <FormDescription>
                          Local, área, canal ou processo onde a iniciativa será executada.
                        </FormDescription>
                        <FormControl>
                          <Input
                            placeholder="Ex: Time de Sucesso do Cliente; canal de WhatsApp Business"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            data-testid="input-onde"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="como"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Como</FormLabel>
                        <FormDescription>
                          Passos práticos de execução. Liste 2 a 5 ações concretas.
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="Ex: 1) Mapear jornada; 2) Implantar playbook de retenção; 3) Treinar equipe."
                            rows={2}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            data-testid="input-como"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quanto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quanto</FormLabel>
                        <FormDescription>
                          Custo estimado e/ou esforço (R$, horas, FTE).
                        </FormDescription>
                        <FormControl>
                          <Input
                            placeholder="Ex: R$ 20-50k + 2 meses do PM atual"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            data-testid="input-quanto"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingIniciativa ? "Salvar Alterações" : "Criar Iniciativa"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isGenerating && (
        <Card className="mb-6 border-primary/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Gerando iniciativas com IA...</p>
                <p className="text-sm text-muted-foreground">
                  Já existem {iniciativas.length} iniciativa(s). A IA está criando novas iniciativas para cada Estratégia FA/DA e Frente de Crescimento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {iniciativas.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Briefcase className="h-16 w-16" />}
            title="Coloque a estratégia em movimento"
            description="Iniciativas são projetos e ações concretas que executam suas estratégias. Cada iniciativa tem responsável, prazo, prioridade e impacto esperado. A IA sugere iniciativas práticas derivadas diretamente das estratégias que você definiu, ordenadas por prioridade estratégica."
            actionLabel="Criar Primeira Iniciativa"
            onAction={() => setOpenDialog(true)}
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ExampleCard>
              <strong>Programa de Fidelidade Digital:</strong> Criar um app de fidelidade com pontos, recompensas e ofertas personalizadas para aumentar a retenção de clientes. <strong>Status:</strong> Planejada | <strong>Prioridade:</strong> Alta | <strong>Prazo:</strong> Q2 2025
            </ExampleCard>
            <ExampleCard>
              <strong>Expansão para E-commerce:</strong> Desenvolver plataforma de vendas online integrada com estoque e logística para ampliar canais de venda. <strong>Status:</strong> Em Andamento | <strong>Prioridade:</strong> Alta | <strong>Prazo:</strong> Q1 2025
            </ExampleCard>
          </div>
        </div>
      ) : (
        <>
          <IniciativasFilterBar
            view={view}
            options={filterOptions}
            totalAtivos={totalFiltrosAtivos}
            onToggleFilter={toggle}
            onClearGroup={clearGroup}
            onSearch={(s) => update("busca", s)}
            onClearAll={clearFilters}
            modo={view.modo}
            onChangeModo={(m) => update("modo", m)}
          />

          {filteredIniciativas.length === 0 ? (
            <Card className="p-8 text-center" data-testid="empty-filtered">
              <p className="text-sm text-muted-foreground">
                Nenhuma iniciativa corresponde aos filtros aplicados.
              </p>
              {totalFiltrosAtivos > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={clearFilters}
                  data-testid="button-clear-filters-empty"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar filtros
                </Button>
              )}
            </Card>
          ) : view.modo === "kanban" ? (
            <KanbanBoard
              iniciativas={filteredIniciativas}
              estrategias={estrategias}
              oportunidades={oportunidades}
              onMove={(id, status) => moveStatusMutation.mutate({ id, status })}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : view.modo === "tabela" ? (
            <IniciativasTabela
              iniciativas={filteredIniciativas}
              estrategias={estrategias}
              oportunidades={oportunidades}
              onEdit={handleEdit}
            />
          ) : view.modo === "gantt" ? (
            <IniciativasGantt
              iniciativas={filteredIniciativas}
              onEdit={handleEdit}
            />
          ) : (
            <div className="space-y-6">
              {([
                { label: "Prioridade Alta",  items: altaPrioridade,   iconClass: "text-destructive" },
                { label: "Prioridade Média", items: mediaPrioridade,  iconClass: "text-primary" },
                { label: "Prioridade Baixa", items: baixaPrioridade,  iconClass: "text-muted-foreground" },
              ] as const).filter(({ items }) => items.length > 0).map(({ label, items, iconClass }) => (
                <div key={label}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className={`h-5 w-5 ${iconClass}`} />
                    {label}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {items.map((iniciativa) => (
                      <IniciativaCard
                        key={iniciativa.id}
                        iniciativa={iniciativa}
                        estrategias={estrategias}
                        oportunidades={oportunidades}
                        objetivos={objetivos}
                        indicadores={indicadoresLista}
                        jornadaConcluida={!!jornadaConcluida}
                        onGerarObjetivos={handleGerarObjetivosFromIniciativa}
                        isGenerating={isGenerating}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

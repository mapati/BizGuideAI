import { useState } from "react";
import { useDeepLinkDialog } from "@/hooks/useDeepLinkDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import { Plus, Sparkles, Target as TargetIcon, Loader2, Trash2, Edit2, TrendingUp, Users, Cog, GraduationCap, DollarSign, BookOpen, UserCheck, Link2, CheckCircle2, AlertCircle, History, Wand2, Layers, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse as parseDateFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Objetivo, ResultadoChave, AIGenerationParams, KrCheckin } from "@shared/schema";
import { OrigemSelector } from "@/components/OrigemSelector";
import { CascataBlock } from "@/components/CascataBlock";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const perspectivas = [
  {
    valor: "Financeira",
    label: "Financeira",
    icon: DollarSign,
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    iconText: "text-emerald-700 dark:text-emerald-300",
    borderTop: "border-t-4 border-t-emerald-500 dark:border-t-emerald-600",
    headerBg: "bg-emerald-50/60 dark:bg-emerald-950/30",
  },
  {
    valor: "Clientes",
    label: "Clientes",
    icon: Users,
    iconBg: "bg-sky-100 dark:bg-sky-950",
    iconText: "text-sky-700 dark:text-sky-300",
    borderTop: "border-t-4 border-t-sky-500 dark:border-t-sky-600",
    headerBg: "bg-sky-50/60 dark:bg-sky-950/30",
  },
  {
    valor: "Processos Internos",
    label: "Processos Internos",
    icon: Cog,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconText: "text-amber-700 dark:text-amber-300",
    borderTop: "border-t-4 border-t-amber-500 dark:border-t-amber-600",
    headerBg: "bg-amber-50/60 dark:bg-amber-950/30",
  },
  {
    valor: "Aprendizado e Crescimento",
    label: "Aprendizado e Crescimento",
    icon: GraduationCap,
    iconBg: "bg-violet-100 dark:bg-violet-950",
    iconText: "text-violet-700 dark:text-violet-300",
    borderTop: "border-t-4 border-t-violet-500 dark:border-t-violet-600",
    headerBg: "bg-violet-50/60 dark:bg-violet-950/30",
  },
];

type Membro = { id: string; nome: string; email: string };
type EstrategiaBasica = { id: string; tipo: string; titulo: string };
type IniciativaBasica = { id: string; titulo: string };

// Task #264 — Picker de prazo com data normalizada (YYYY-MM-DD) e fallback
// para texto livre (ex.: "Q4 2025"). Espelha o padrão usado em Iniciativas
// (Task #263) para que toda a cascata estratégica tenha prazos confiáveis.
interface PrazoDatePickerProps {
  prazo: string;
  prazoData: string | null;
  onChange: (next: { prazo: string; prazoData: string | null }) => void;
  testIdPrefix?: string;
}

function PrazoDatePicker({ prazo, prazoData, onChange, testIdPrefix = "prazo" }: PrazoDatePickerProps) {
  const dateValue = prazoData ? parseDateFn(prazoData, "yyyy-MM-dd", new Date()) : null;
  const validDate = dateValue && !isNaN(dateValue.getTime()) ? dateValue : null;
  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`w-full justify-start font-normal ${!validDate ? "text-muted-foreground" : ""}`}
            data-testid={`button-${testIdPrefix}-data`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {validDate ? format(validDate, "dd/MM/yyyy", { locale: ptBR }) : "Escolha uma data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={validDate ?? undefined}
            onSelect={(d) => {
              if (d) {
                onChange({ prazo: format(d, "dd/MM/yyyy"), prazoData: format(d, "yyyy-MM-dd") });
              } else {
                onChange({ prazo, prazoData: null });
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
                  // Mantém o texto livre apenas se não for derivado da data.
                  const derivado = format(validDate, "dd/MM/yyyy") === prazo;
                  onChange({ prazo: derivado ? "" : prazo, prazoData: null });
                }}
                data-testid={`button-${testIdPrefix}-data-limpar`}
              >
                Limpar data
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <Input
        placeholder="Ou texto livre: Q4 2025, Mar/2026…"
        value={prazo}
        onChange={(e) => {
          // Texto livre digitado manualmente desfaz a data normalizada.
          onChange({ prazo: e.target.value, prazoData: null });
        }}
        data-testid={`input-${testIdPrefix}`}
      />
      <p className="text-xs text-muted-foreground">
        Selecione uma data ou use o campo livre (ex.: "Q4 2025").
      </p>
    </div>
  );
}

function calcularProgresso(inicial: string, atual: string, alvo: string): number {
  const ini = parseFloat(inicial);
  const atu = parseFloat(atual);
  const alv = parseFloat(alvo);
  if (isNaN(ini) || isNaN(atu) || isNaN(alv)) return 0;
  if (alv === ini) return 100;
  const progresso = ((atu - ini) / (alv - ini)) * 100;
  return Math.max(0, Math.min(100, progresso));
}

interface ObjetivoCardProps {
  objetivo: Objetivo;
  membros: Membro[];
  estrategias: EstrategiaBasica[];
  iniciativas: IniciativaBasica[];
  resultadosChave: ResultadoChave[];
  jornadaConcluida: boolean;
  onSelect: (obj: Objetivo) => void;
  onRetro: (obj: Objetivo) => void;
  onDelete: (id: string) => void;
}

function ObjetivoCard({ objetivo, membros, estrategias, iniciativas, resultadosChave, jornadaConcluida, onSelect, onRetro, onDelete }: ObjetivoCardProps) {
  return (
    <Card
      className="p-4 hover-elevate cursor-pointer"
      onClick={() => onSelect(objetivo)}
      data-testid={`card-objetivo-${objetivo.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-2 break-words">{objetivo.titulo}</h4>
          <div className="flex items-center flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">Prazo: {objetivo.prazo}</p>
            {objetivo.responsavelId && (() => {
              const m = membros.find(m => m.id === objetivo.responsavelId);
              return m ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <UserCheck className="h-3 w-3" />
                  {m.nome}
                </span>
              ) : null;
            })()}
            {objetivo.estrategiaId && (() => {
              const est = estrategias.find(e => e.id === objetivo.estrategiaId);
              return est ? (
                <Badge variant="outline" className="gap-1 text-xs max-w-full" data-testid={`badge-estrategia-objetivo-${objetivo.id}`}>
                  <Link2 className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{est.tipo} — {est.titulo}</span>
                </Badge>
              ) : null;
            })()}
          </div>
          {(() => {
            const ini = iniciativas.find(i => i.id === objetivo.iniciativaId);
            const est = estrategias.find(e => e.id === objetivo.estrategiaId);
            const upstream = ini
              ? { id: ini.id, titulo: ini.titulo, href: "/iniciativas", rotulo: "Iniciativa" }
              : est
              ? { id: est.id, titulo: est.titulo, href: "/estrategias", rotulo: "Estratégia" }
              : null;
            const orfao = jornadaConcluida && !objetivo.iniciativaId && !objetivo.estrategiaId;
            const krs = resultadosChave.filter((kr) => kr.objetivoId === objetivo.id);
            const downstream = krs.length > 0
              ? [{ rotulo: "Resultados-chave", itens: krs.map((kr) => ({ id: kr.id, titulo: kr.metrica, rotulo: "KR" })) }]
              : [];
            return (
              <CascataBlock
                upstream={upstream}
                downstream={downstream}
                orfao={orfao}
                orfaoMensagem="Este objetivo não está conectado a uma Iniciativa ou Estratégia."
              />
            );
          })()}
        </div>
        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            title="Registrar Retrospectiva"
            onClick={(e) => { e.stopPropagation(); onRetro(objetivo); }}
            data-testid={`button-retro-objetivo-${objetivo.id}`}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(objetivo.id); }}
            data-testid={`button-delete-objetivo-${objetivo.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Task #257 — Helper para rodar quality-check do KR via API, reutilizável
// tanto no clique do usuário quanto no fluxo automático (gerar com IA / salvar).
async function fetchKrQualityCheck(input: {
  metrica: string;
  valorInicial?: string | number | null;
  valorAlvo?: string | number | null;
  prazo?: string | null;
}): Promise<QualityCheckResult> {
  return await apiRequest("POST", "/api/ai/kr-quality-check", {
    metrica: input.metrica,
    valorInicial: input.valorInicial ?? null,
    valorAlvo: input.valorAlvo ?? null,
    prazo: input.prazo ?? null,
  }) as unknown as QualityCheckResult;
}

// Task #257 — utilitários de confiança do check-in.
type Confianca = "verde" | "amarelo" | "vermelho";

const confiancaConfig: Record<Confianca, { label: string; descricao: string; classes: string; dot: string }> = {
  verde:    { label: "No caminho", descricao: "Vamos bater a meta no prazo.",                     classes: "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300",   dot: "bg-green-500" },
  amarelo:  { label: "Atenção",    descricao: "Algum risco — precisa ajuste.",                    classes: "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300", dot: "bg-yellow-500" },
  vermelho: { label: "Em risco",   descricao: "Provavelmente não bate sem mudança importante.",   classes: "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300",                 dot: "bg-red-500" },
};

function diasDesde(iso: string | Date | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

interface QualityCheckResult {
  veredito: "ok" | "precisa_ajuste";
  problemas: Array<"parece_tarefa" | "sem_metrica" | "sem_prazo" | "vago">;
  explicacao: string;
  sugestaoMetrica: string;
  sugestaoValorInicial: number | null;
  sugestaoValorAlvo: number | null;
  sugestaoPrazo: string;
}

interface KrQualityCheckProps {
  metrica: string;
  valorInicial: string;
  valorAlvo: string;
  prazo: string;
  testIdPrefix?: string;
  onAplicarSugestao?: (s: { metrica?: string; valorInicial?: string; valorAlvo?: string; prazo?: string }) => void;
}

function KrQualityCheck({ metrica, valorInicial, valorAlvo, prazo, testIdPrefix = "kr-quality", onAplicarSugestao }: KrQualityCheckProps) {
  const [resultado, setResultado] = useState<QualityCheckResult | null>(null);
  const { toast } = useToast();
  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/kr-quality-check", {
        metrica,
        valorInicial: valorInicial || null,
        valorAlvo: valorAlvo || null,
        prazo: prazo || null,
      });
      return res as unknown as QualityCheckResult;
    },
    onSuccess: (data) => setResultado(data),
    onError: () => toast({ title: "Não foi possível revisar", variant: "destructive" }),
  });

  if (!metrica || metrica.trim().length < 3) return null;

  const problemasLabel: Record<string, string> = {
    parece_tarefa: "Parece tarefa, não resultado",
    sem_metrica:   "Sem métrica numérica",
    sem_prazo:     "Sem prazo concreto",
    vago:          "Linguagem vaga",
  };

  return (
    <div className="rounded-md border border-dashed border-muted-foreground/30 p-3 space-y-2" data-testid={`${testIdPrefix}-block`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wand2 className="h-3.5 w-3.5" />
          <span>Revisar qualidade deste KR antes de salvar</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => checkMutation.mutate()}
          disabled={checkMutation.isPending}
          data-testid={`${testIdPrefix}-button-revisar`}
        >
          {checkMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
          Revisar com IA
        </Button>
      </div>
      {resultado && (
        resultado.veredito === "ok" ? (
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400" data-testid={`${testIdPrefix}-veredito-ok`}>
            <CheckCircle2 className="h-4 w-4" />
            KR está bem formulado.
          </div>
        ) : (
          <div className="space-y-2" data-testid={`${testIdPrefix}-veredito-ajuste`}>
            <div className="flex items-start gap-2 text-xs">
              <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="space-y-1">
                <div className="font-medium">Sugestão de melhoria</div>
                <p className="text-muted-foreground">{resultado.explicacao}</p>
                {resultado.problemas.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {resultado.problemas.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">{problemasLabel[p] ?? p}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {(resultado.sugestaoMetrica || resultado.sugestaoPrazo || resultado.sugestaoValorAlvo != null) && (
              <div className="rounded bg-muted/40 p-2 text-xs space-y-1">
                {resultado.sugestaoMetrica && (
                  <div><span className="font-medium">Métrica:</span> {resultado.sugestaoMetrica}</div>
                )}
                {(resultado.sugestaoValorInicial != null || resultado.sugestaoValorAlvo != null) && (
                  <div>
                    <span className="font-medium">Baseline → Alvo:</span>{" "}
                    {resultado.sugestaoValorInicial ?? (valorInicial || "?")} → {resultado.sugestaoValorAlvo ?? (valorAlvo || "?")}
                  </div>
                )}
                {resultado.sugestaoPrazo && (
                  <div><span className="font-medium">Prazo:</span> {resultado.sugestaoPrazo}</div>
                )}
                {onAplicarSugestao && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={() => {
                        onAplicarSugestao({
                          metrica: resultado.sugestaoMetrica || undefined,
                          valorInicial: resultado.sugestaoValorInicial != null ? String(resultado.sugestaoValorInicial) : undefined,
                          valorAlvo: resultado.sugestaoValorAlvo != null ? String(resultado.sugestaoValorAlvo) : undefined,
                          prazo: resultado.sugestaoPrazo || undefined,
                        });
                        setResultado(null);
                      }}
                      data-testid={`${testIdPrefix}-button-aplicar`}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Aplicar sugestão
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultado: ResultadoChave;
}

function CheckinDialog({ open, onOpenChange, resultado }: CheckinDialogProps) {
  const { toast } = useToast();
  const [valor, setValor] = useState<string>(resultado.valorAtual);
  const [confianca, setConfianca] = useState<Confianca>((resultado.confiancaAtual as Confianca) || "verde");
  const [comentario, setComentario] = useState<string>("");

  const checkinMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/resultados-chave/${resultado.id}/checkin`, {
        valor,
        confianca,
        comentario: comentario || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${resultado.objetivoId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${resultado.id}/checkins`] });
      toast({ title: "Check-in registrado", description: "Progresso, confiança e comentário salvos." });
      setComentario("");
      onOpenChange(false);
    },
    onError: () => toast({ title: "Não foi possível registrar o check-in", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-in do KR</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <div className="font-medium">{resultado.metrica}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Inicial {resultado.valorInicial} → Alvo {resultado.valorAlvo}
            </div>
          </div>
          <div>
            <Label>Valor atual</Label>
            <Input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              data-testid={`input-checkin-valor-${resultado.id}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confiança em bater a meta</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(confiancaConfig) as Confianca[]).map((c) => {
                const cfg = confiancaConfig[c];
                const ativo = confianca === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setConfianca(c)}
                    className={`rounded-md border p-2 text-xs text-left hover-elevate active-elevate-2 ${ativo ? cfg.classes : "border-border bg-background text-foreground"}`}
                    data-testid={`button-checkin-confianca-${c}-${resultado.id}`}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </div>
                    <div className="mt-0.5 text-[11px] opacity-80">{cfg.descricao}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Comentário (opcional)</Label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="O que mudou desde o último check-in? Bloqueios? Próximo passo?"
              rows={3}
              data-testid={`textarea-checkin-comentario-${resultado.id}`}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => checkinMutation.mutate()}
              disabled={checkinMutation.isPending || valor === ""}
              data-testid={`button-checkin-submit-${resultado.id}`}
            >
              {checkinMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Registrar check-in
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ResultadoChaveCardProps {
  resultado: ResultadoChave;
  isEditing: boolean;
  editingData: ResultadoChave | null;
  onStartEdit: (r: ResultadoChave) => void;
  onChangeEdit: (r: ResultadoChave) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  // Task #208 — usado para exibir o badge "Atacando: KPI X" no KR.
  indicadores?: Array<{ id: string; nome: string }>;
  membros?: Membro[];
}

function ResultadoChaveCard({ resultado, isEditing, editingData, onStartEdit, onChangeEdit, onSave, onCancelEdit, onDelete, isSaving, indicadores = [], membros = [] }: ResultadoChaveCardProps) {
  const progresso = calcularProgresso(resultado.valorInicial, resultado.valorAtual, resultado.valorAlvo);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const { data: checkins = [] } = useQuery<KrCheckin[]>({
    queryKey: [`/api/resultados-chave/${resultado.id}/checkins`],
    enabled: historicoOpen,
  });
  const responsavel = resultado.responsavelId
    ? membros.find((m) => m.id === resultado.responsavelId)
    : undefined;
  const responsavelLabel = (responsavel?.nome ?? resultado.owner) || "—";
  const confianca = (resultado.confiancaAtual as Confianca) || null;
  const dias = diasDesde(resultado.ultimoCheckinEm);

  return (
    <Card className="p-4" data-testid={`card-resultado-${resultado.id}`}>
      {isEditing && editingData ? (
        <div className="space-y-3">
          <div>
            <Label>Métrica (resultado mensurável)</Label>
            <Input
              value={editingData.metrica}
              onChange={(e) => onChangeEdit({ ...editingData, metrica: e.target.value })}
              data-testid={`input-edit-metrica-${resultado.id}`}
            />
          </div>
          {/* Calibragem: edita só baseline e meta. O valor atual (progresso) é
              registrado via Check-in (botão dedicado) e não deve ser
              confundido com a meta-alvo. */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Valor inicial</Label>
              <Input type="number" value={editingData.valorInicial} onChange={(e) => onChangeEdit({ ...editingData, valorInicial: e.target.value })} data-testid={`input-edit-inicial-${resultado.id}`} />
            </div>
            <div>
              <Label className="text-xs">Valor-alvo</Label>
              <Input type="number" value={editingData.valorAlvo} onChange={(e) => onChangeEdit({ ...editingData, valorAlvo: e.target.value })} data-testid={`input-edit-alvo-${resultado.id}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Responsável</Label>
              <Select
                value={editingData.responsavelId || "__none__"}
                onValueChange={(v) => onChangeEdit({ ...editingData, responsavelId: v === "__none__" ? null : v })}
              >
                <SelectTrigger data-testid={`select-edit-responsavel-${resultado.id}`}>
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {membros.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prazo</Label>
              <PrazoDatePicker
                prazo={editingData.prazo}
                prazoData={editingData.prazoData ?? null}
                onChange={(next) => onChangeEdit({ ...editingData, prazo: next.prazo, prazoData: next.prazoData })}
                testIdPrefix={`edit-prazo-${resultado.id}`}
              />
            </div>
          </div>
          <KrQualityCheck
            metrica={editingData.metrica}
            valorInicial={editingData.valorInicial}
            valorAlvo={editingData.valorAlvo}
            prazo={editingData.prazo}
            testIdPrefix={`kr-quality-edit-${resultado.id}`}
            onAplicarSugestao={(s) => onChangeEdit({
              ...editingData,
              metrica: s.metrica ?? editingData.metrica,
              valorInicial: s.valorInicial ?? editingData.valorInicial,
              valorAlvo: s.valorAlvo ?? editingData.valorAlvo,
              prazo: s.prazo ?? editingData.prazo,
            })}
          />
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={isSaving} size="sm" data-testid={`button-save-resultado-${resultado.id}`}>
              Salvar
            </Button>
            <Button onClick={onCancelEdit} variant="outline" size="sm" data-testid={`button-cancel-resultado-${resultado.id}`}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-sm mb-1 break-words">{resultado.metrica}</h5>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>Inicial: {resultado.valorInicial}</span>
                <span>Atual: {resultado.valorAtual}</span>
                <span>Alvo: {resultado.valorAlvo}</span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStartEdit(resultado)} data-testid={`button-edit-resultado-${resultado.id}`}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(resultado.id)} data-testid={`button-delete-resultado-${resultado.id}`}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold">{Math.round(progresso)}%</span>
            </div>
            <Progress value={progresso} className="h-2" data-testid={`progress-resultado-${resultado.id}`} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setCheckinOpen(true)}
              data-testid={`button-checkin-${resultado.id}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Check-in
            </Button>
            {confianca && (
              <Badge variant="outline" className={`gap-1.5 ${confiancaConfig[confianca].classes}`} data-testid={`badge-confianca-${resultado.id}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${confiancaConfig[confianca].dot}`} />
                {confiancaConfig[confianca].label}
              </Badge>
            )}
            {dias != null ? (
              <span className={`text-xs ${dias > 14 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`} data-testid={`text-ultimo-checkin-${resultado.id}`}>
                Último check-in {dias === 0 ? "hoje" : `há ${dias} dia(s)`}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground" data-testid={`text-ultimo-checkin-${resultado.id}`}>
                Sem check-in registrado
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => setHistoricoOpen((v) => !v)}
              data-testid={`button-toggle-historico-${resultado.id}`}
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              {historicoOpen ? "Ocultar" : "Histórico"}
            </Button>
          </div>
          {resultado.ultimoCheckinComentario && (
            <p className="mt-2 text-xs text-muted-foreground italic" data-testid={`text-ultimo-comentario-${resultado.id}`}>
              "{resultado.ultimoCheckinComentario}"
            </p>
          )}
          {historicoOpen && (
            <div className="mt-3 rounded-md border bg-muted/30 p-2 space-y-1.5" data-testid={`historico-${resultado.id}`}>
              {checkins.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem registros ainda.</p>
              ) : (
                checkins.map((c) => {
                  const cfg = confiancaConfig[(c.confianca as Confianca)] ?? confiancaConfig.verde;
                  return (
                    <div key={c.id} className="text-xs flex items-start gap-2" data-testid={`historico-item-${c.id}`}>
                      <span className={`inline-block h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-x-2 gap-y-0">
                          <span className="font-medium">{c.valor}</span>
                          <span className="text-muted-foreground">— {cfg.label}</span>
                          <span className="text-muted-foreground">· {new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        {c.comentario && <p className="text-muted-foreground mt-0.5 break-words">{c.comentario}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span data-testid={`text-responsavel-${resultado.id}`}>Responsável: {responsavelLabel}</span>
            <span>Prazo: {resultado.prazo}</span>
          </div>
          {/* Task #208 — Badge "Atacando: KPI X" quando o KR está vinculado
              a um indicador via indicadorFonteId. */}
          {resultado.indicadorFonteId && (() => {
            const ind = indicadores.find(i => i.id === resultado.indicadorFonteId);
            return ind ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1" data-testid={`badge-indicador-fonte-kr-${resultado.id}`}>
                  <TargetIcon className="h-3 w-3" />
                  Atacando: {ind.nome.length > 35 ? ind.nome.slice(0, 35) + "…" : ind.nome}
                </Badge>
              </div>
            ) : null;
          })()}
        </div>
      )}
      <CheckinDialog open={checkinOpen} onOpenChange={setCheckinOpen} resultado={resultado} />
    </Card>
  );
}

export default function OKRs() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoObjetivo, setNovoObjetivo] = useState<{
    titulo: string;
    descricao: string;
    prazo: string;
    prazoData: string | null;
    perspectiva: string;
    responsavelId: string;
    estrategiaId: string | null;
    iniciativaId: string | null;
  }>({ titulo: "", descricao: "", prazo: "", prazoData: null, perspectiva: "Financeira", responsavelId: "", estrategiaId: null, iniciativaId: null });
  const [objetivoSelecionado, setObjetivoSelecionado] = useState<Objetivo | null>(null);
  const [dialogResultadosOpen, setDialogResultadosOpen] = useState(false);
  const [editandoResultado, setEditandoResultado] = useState<ResultadoChave | null>(null);
  const [novoResultado, setNovoResultado] = useState<{
    metrica: string;
    valorInicial: string;
    valorAlvo: string;
    valorAtual: string;
    owner: string;
    prazo: string;
    prazoData: string | null;
    responsavelId: string;
  }>({
    metrica: "",
    valorInicial: "",
    valorAlvo: "",
    valorAtual: "",
    owner: "",
    prazo: "",
    prazoData: null,
    responsavelId: "",
  });
  const [dialogNovoResultadoOpen, setDialogNovoResultadoOpen] = useState(false);
  const [editandoObjetivo, setEditandoObjetivo] = useState(false);
  const [objetivoEditado, setObjetivoEditado] = useState<{
    titulo: string;
    descricao: string;
    prazo: string;
    prazoData: string | null;
    perspectiva: string;
  }>({ titulo: "", descricao: "", prazo: "", prazoData: null, perspectiva: "Financeira" });

  const [retroDialogOpen, setRetroDialogOpen] = useState(false);
  const [retroObjetivo, setRetroObjetivo] = useState<Objetivo | null>(null);
  const [retroForm, setRetroForm] = useState({ conquistas: "", falhas: "", aprendizados: "", ajustes: "", periodoInicio: "", periodoFim: "" });

  const { data: empresa } = useQuery<any>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  const { data: estrategias = [] } = useQuery<EstrategiaBasica[]>({
    queryKey: ["/api/estrategias", empresaId],
    enabled: !!empresaId,
  });

  const { data: iniciativas = [] } = useQuery<IniciativaBasica[]>({
    queryKey: ["/api/iniciativas", empresaId],
    enabled: !!empresaId,
  });

  const { jornadaConcluida } = useJornadaProgresso();
  const origemObrigatoria = !jornadaConcluida;

  const { data: objetivos = [], isLoading } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  const { data: resultadosChave = [] } = useQuery<ResultadoChave[]>({
    queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`],
    enabled: !!objetivoSelecionado?.id,
  });

  const { data: membros = [] } = useQuery<Membro[]>({ queryKey: ["/api/membros"] });

  // Task #208 — usado para exibir o badge "Atacando: KPI X" nos KRs.
  const { data: indicadoresLista = [] } = useQuery<Array<{ id: string; nome: string }>>({
    queryKey: ["/api/indicadores", empresaId],
    enabled: !!empresaId,
  });

  const [gerandoPerspectiva, setGerandoPerspectiva] = useState<string | null>(null);
  const [aiObjetivosOpen, setAiObjetivosOpen] = useState(false);
  const [aiObjetivosPerspectivaInicial, setAiObjetivosPerspectivaInicial] = useState<string | null>(null);
  const [aiResultadosOpen, setAiResultadosOpen] = useState(false);
  const [aiResultadosObjetivoId, setAiResultadosObjetivoId] = useState<string | null>(null);

  const gerarObjetivosMutation = useMutation({
    mutationFn: async (vars: { perspectiva?: string; params?: AIGenerationParams }) => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      const { perspectiva, params } = vars;
      return await apiRequest("POST", "/api/ai/gerar-objetivos", {
        empresaId,
        perspectiva,
        ...(params || {}),
      });
    },
    onSuccess: async (data, vars) => {
      const perspectiva = vars.perspectiva;
      const qtdMetricas = vars.params?.quantidadeSecundaria;
      if (data.objetivos && data.objetivos.length > 0) {
        const label = perspectiva ? `perspectiva ${perspectiva}` : "todas as perspectivas";
        toast({
          title: "Objetivo(s) Gerado(s)!",
          description: `${data.objetivos.length} objetivo(s) sugerido(s) pela IA para ${label}.`,
        });
        // Backend já escolhe a iniciativa/estratégia de origem para cada objetivo.
        let totalMetricasGeradas = 0;
        for (const obj of data.objetivos) {
          const novoObjetivo = await criarObjetivoMutation.mutateAsync({
            empresaId,
            titulo: obj.titulo,
            descricao: obj.descricao,
            prazo: obj.prazo,
            perspectiva: obj.perspectiva || perspectiva || "Financeira",
            estrategiaId: obj.estrategiaId ?? null,
            iniciativaId: obj.iniciativaId ?? null,
          }) as unknown as Objetivo;

          // Geração automática de métricas (KRs) para o objetivo recém-criado.
          if (qtdMetricas && novoObjetivo?.id) {
            try {
              const krResp = await apiRequest("POST", "/api/ai/gerar-resultados-chave", {
                objetivoId: novoObjetivo.id,
                quantidade: qtdMetricas,
              });
              const krs = krResp?.resultados ?? [];
              for (const res of krs) {
                const membroAi = membros.find(m =>
                  m.nome.toLowerCase() === (res.owner || "").toLowerCase()
                  || m.email?.toLowerCase() === (res.owner || "").toLowerCase()
                );
                await criarResultadoMutation.mutateAsync({
                  objetivoId: novoObjetivo.id,
                  metrica: res.metrica,
                  valorInicial: res.valorInicial.toString(),
                  valorAlvo: res.valorAlvo.toString(),
                  valorAtual: res.valorAtual.toString(),
                  owner: membroAi?.nome || res.owner || "—",
                  responsavelId: membroAi?.id ?? null,
                  prazo: res.prazo,
                });
                totalMetricasGeradas++;
              }
            } catch {
              // não bloqueia o restante do fluxo se a geração de KRs falhar para um objetivo
            }
          }
        }
        if (qtdMetricas && totalMetricasGeradas > 0) {
          toast({
            title: "Métricas geradas",
            description: `${totalMetricasGeradas} resultado(s)-chave criado(s) automaticamente.`,
          });
        }
      } else {
        toast({
          title: "Nada para adicionar",
          description: "A IA decidiu não criar novos objetivos — o BSC atual já cobre bem o contexto selecionado.",
        });
      }
      setGerandoPerspectiva(null);
    },
    onError: () => {
      toast({
        title: "Erro ao gerar objetivos",
        description: "Não foi possível gerar objetivos com IA. Tente novamente.",
        variant: "destructive",
      });
      setGerandoPerspectiva(null);
    },
  });

  const handleAbrirModalObjetivos = (perspectivaInicial: string | null) => {
    setAiObjetivosPerspectivaInicial(perspectivaInicial);
    setAiObjetivosOpen(true);
  };

  const handleConfirmAIObjetivos = (params: AIGenerationParams) => {
    setAiObjetivosOpen(false);
    if (aiObjetivosPerspectivaInicial) {
      setGerandoPerspectiva(aiObjetivosPerspectivaInicial);
    }
    gerarObjetivosMutation.mutate({
      perspectiva: aiObjetivosPerspectivaInicial ?? undefined,
      params,
    });
  };

  const handleAbrirModalResultados = (objetivoId: string) => {
    setAiResultadosObjetivoId(objetivoId);
    setAiResultadosOpen(true);
  };

  const handleConfirmAIResultados = (params: AIGenerationParams) => {
    if (!aiResultadosObjetivoId) return;
    setAiResultadosOpen(false);
    gerarResultadosMutation.mutate({ objetivoId: aiResultadosObjetivoId, params });
  };

  const gerarResultadosMutation = useMutation({
    mutationFn: async (vars: { objetivoId: string; params?: AIGenerationParams }) => {
      const { objetivoId, params } = vars;
      return await apiRequest("POST", "/api/ai/gerar-resultados-chave", {
        objetivoId,
        ...(params || {}),
      });
    },
    onSuccess: async (data, vars) => {
      const objetivoId = vars.objetivoId;
      if (data.resultados && data.resultados.length > 0) {
        toast({
          title: "Resultados-chave gerados",
          description: `${data.resultados.length} KR(s) salvo(s). Rodando revisão de qualidade...`,
        });
        // Task #257 — `responsavelId` é a fonte de verdade. Tenta casar
        // o `owner` textual sugerido pela IA com um membro real e
        // persiste já com o id do responsável.
        const novosKrs: ResultadoChave[] = [];
        for (const res of data.resultados) {
          const membroAi = membros.find(m =>
            m.nome.toLowerCase() === (res.owner || "").toLowerCase()
            || m.email?.toLowerCase() === (res.owner || "").toLowerCase()
          );
          const created = await criarResultadoMutation.mutateAsync({
            objetivoId,
            metrica: res.metrica,
            valorInicial: res.valorInicial.toString(),
            valorAlvo: res.valorAlvo.toString(),
            valorAtual: res.valorAtual.toString(),
            owner: membroAi?.nome || res.owner || "—",
            responsavelId: membroAi?.id ?? null,
            prazo: res.prazo,
          }) as unknown as ResultadoChave;
          if (created?.id) novosKrs.push(created);
        }
        // Task #257 — Quality-check inline (não-bloqueante) sobre cada KR
        // recém-salvo. Os achados aparecem no banner com botão 1-clique
        // "Aplicar sugestão" que dispara o update do KR persistido.
        const avisos: Array<{ krId: string; metrica: string; verdict: QualityCheckResult }> = [];
        for (const kr of novosKrs) {
          try {
            const verdict = await fetchKrQualityCheck({
              metrica: kr.metrica,
              valorInicial: kr.valorInicial,
              valorAlvo: kr.valorAlvo,
              prazo: kr.prazo,
            });
            if (verdict.veredito === "precisa_ajuste") {
              avisos.push({ krId: kr.id, metrica: kr.metrica, verdict });
            }
          } catch {
            // ignora falhas do quality-check; é orientativo.
          }
        }
        if (avisos.length > 0) setAiKrAvisos(avisos);
      } else {
        toast({
          title: "Nenhum resultado novo",
          description: "Todos os resultados sugeridos já existem ou são similares.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao gerar resultados",
        description: "Não foi possível gerar resultados-chave. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const criarRetroMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/retrospectivas", data),
    onSuccess: () => {
      setRetroDialogOpen(false);
      setRetroForm({ conquistas: "", falhas: "", aprendizados: "", ajustes: "", periodoInicio: "", periodoFim: "" });
      toast({ title: "Retrospectiva registrada!", description: "O aprendizado deste ciclo foi salvo." });
    },
    onError: () => toast({ title: "Erro ao salvar retrospectiva", variant: "destructive" }),
  });

  const criarObjetivoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/objetivos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
    },
  });

  const deletarObjetivoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/objetivos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
      toast({
        title: "Objetivo removido",
        description: "O objetivo foi removido com sucesso.",
      });
    },
  });

  const editarObjetivoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/objetivos/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
      setObjetivoSelecionado(prev => prev ? { ...prev, ...variables.data } : prev);
      setEditandoObjetivo(false);
      toast({
        title: "Objetivo atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
  });

  const criarResultadoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/resultados-chave", data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${vars.objetivoId}`] });
    },
  });

  const editarResultadoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/resultados-chave/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`] });
      toast({
        title: "Resultado atualizado",
        description: "As alterações foram salvas.",
      });
    },
  });

  const deletarResultadoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/resultados-chave/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`] });
      toast({
        title: "Resultado removido",
        description: "A métrica foi removida.",
      });
    },
  });

  const handleCriarObjetivo = async () => {
    if (!novoObjetivo.titulo || !novoObjetivo.prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e prazo do objetivo.",
        variant: "destructive",
      });
      return;
    }

    if (origemObrigatoria && !novoObjetivo.iniciativaId && !novoObjetivo.estrategiaId) {
      toast({
        title: "Origem obrigatória",
        description: "Durante a 1ª jornada, escolha uma Iniciativa (preferencial) ou Estratégia que origina este objetivo. Você pode criar uma na página de Iniciativas.",
        variant: "destructive",
      });
      return;
    }

    try {
      await criarObjetivoMutation.mutateAsync({
        empresaId,
        ...novoObjetivo,
      });
    } catch (e) {
      toast({
        title: "Não foi possível criar o objetivo",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      return;
    }

    setNovoObjetivo({ titulo: "", descricao: "", prazo: "", prazoData: null, perspectiva: "Financeira", responsavelId: "", estrategiaId: null, iniciativaId: null });
    setIsDialogOpen(false);
    toast({
      title: "Objetivo criado!",
      description: "Novo objetivo adicionado com sucesso.",
    });
  };

  // Task #257 — Quality-check é APENAS orientativo: nunca gateia o save.
  // O componente <KrQualityCheck/> roda inline no formulário (manual via
  // botão "Revisar com IA"). Após o save de KRs gerados pela IA, rodamos
  // a revisão em background e exibimos um banner advisor com aplicação
  // 1-clique — o KR já está persistido nesse momento.
  const [aiKrAvisos, setAiKrAvisos] = useState<Array<{ krId: string; metrica: string; verdict: QualityCheckResult }>>([]);

  const handleCriarResultado = async () => {
    if (!objetivoSelecionado) return;

    // Task #257 — `responsavelId` passa a ser a fonte de verdade do dono do KR.
    // O campo legado `owner` (NOT NULL no banco) é sintetizado a partir do nome
    // do membro selecionado para manter compatibilidade até a migração final.
    const membro = membros.find(m => m.id === novoResultado.responsavelId);
    const ownerSint = membro?.nome || novoResultado.owner || "—";

    if (!novoResultado.metrica || !novoResultado.valorInicial || !novoResultado.valorAlvo || !novoResultado.responsavelId || !novoResultado.prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Métrica, valores, responsável e prazo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const created = await criarResultadoMutation.mutateAsync({
      objetivoId: objetivoSelecionado.id,
      ...novoResultado,
      owner: ownerSint,
      responsavelId: novoResultado.responsavelId,
      // valor_atual é NOT NULL no banco; quando o usuário (ou o Assistente
      // via "ajustar") não informa, assume o valor inicial — o KR começa
      // com 0% de progresso, o que é o comportamento esperado.
      valorAtual: novoResultado.valorAtual?.trim() ? novoResultado.valorAtual : novoResultado.valorInicial,
    }) as unknown as ResultadoChave;

    setNovoResultado({
      metrica: "",
      valorInicial: "",
      valorAlvo: "",
      valorAtual: "",
      owner: "",
      prazo: "",
      prazoData: null,
      responsavelId: "",
    });
    setDialogNovoResultadoOpen(false);
    toast({
      title: "Resultado-chave criado!",
      description: "Novo resultado adicionado ao objetivo.",
    });
    // Task #257 — Quality-check automático e não-bloqueante após salvar.
    // Se a IA detectar problemas, surfaceia inline no banner advisor com
    // botão 1-clique para aplicar a sugestão sobre o KR já persistido.
    if (created?.id) {
      void runQualityCheckPosSave(created);
    }
  };

  // Helper: dispara quality-check sobre um KR persistido e empurra o
  // resultado para o banner de avisos (não-bloqueante).
  const runQualityCheckPosSave = async (kr: ResultadoChave) => {
    try {
      const verdict = await fetchKrQualityCheck({
        metrica: kr.metrica,
        valorInicial: kr.valorInicial,
        valorAlvo: kr.valorAlvo,
        prazo: kr.prazo,
      });
      if (verdict.veredito === "precisa_ajuste") {
        setAiKrAvisos((prev) => {
          const semDup = prev.filter((a) => a.krId !== kr.id);
          return [...semDup, { krId: kr.id, metrica: kr.metrica, verdict }];
        });
      }
    } catch {
      // ignora — orientativo
    }
  };

  const handleEditarResultado = async () => {
    if (!editandoResultado) return;

    // Calibragem da meta: não enviamos valorAtual. O progresso só muda pelo
    // fluxo dedicado (atualizar_progresso_kr), evitando ambiguidade entre
    // ajustar a meta-alvo e registrar o avanço atual.
    // Task #257 — sincroniza `owner` (legado, NOT NULL) com o nome do membro
    // selecionado em `responsavelId` (fonte de verdade).
    const membroEd = membros.find(m => m.id === editandoResultado.responsavelId);
    const ownerSintEd = membroEd?.nome || editandoResultado.owner || "—";

    const krAtualizado = editandoResultado;
    await editarResultadoMutation.mutateAsync({
      id: editandoResultado.id,
      data: {
        metrica: editandoResultado.metrica,
        valorInicial: editandoResultado.valorInicial,
        valorAlvo: editandoResultado.valorAlvo,
        owner: ownerSintEd,
        responsavelId: editandoResultado.responsavelId,
        prazo: editandoResultado.prazo,
        prazoData: editandoResultado.prazoData ?? null,
      },
    });

    setEditandoResultado(null);
    // Task #257 — Quality-check automático e não-bloqueante após editar.
    void runQualityCheckPosSave(krAtualizado);
  };

  const objetivosPorPerspectiva = (perspectiva: string) => {
    return objetivos.filter(obj => obj.perspectiva === perspectiva);
  };

  // Quando um deep-link `?editar=<krId>&tipo=kr` chega antes do KR estar
  // carregado em cache (ex.: tool atualizar_kr, sem objetivoId no payload),
  // disparamos um lookup pelo próprio id para descobrir o objetivo pai.
  const [krLookupId, setKrLookupId] = useState<string | null>(null);
  const { data: krLookup } = useQuery<ResultadoChave>({
    queryKey: ["/api/resultados-chave/by-id", krLookupId],
    enabled: !!krLookupId,
    queryFn: async () => {
      const res = await fetch(`/api/resultados-chave/by-id/${krLookupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Não foi possível localizar a meta.");
      return await res.json();
    },
  });

  useDeepLinkDialog(!!empresa?.id && !isLoading, ({ novo, editar, params }) => {
    const isKR = params.tipo === "kr" || params.tipo === "resultado-chave";
    const isNovoKR = params.tipo === "novo-kr";
    if (editar) {
      // Tool adicionar_kr_a_okr: abre o objetivo e já abre o sub-formulário
      // de "Adicionar Métrica" pré-preenchido com os campos vindos da IA.
      if (isNovoKR) {
        const parent = objetivos.find((o) => o.id === editar);
        if (!parent) return false;
        setObjetivoSelecionado(parent);
        setDialogResultadosOpen(true);
        setNovoResultado({
          metrica: params.metrica || "",
          valorInicial: params.valorInicial || "",
          valorAtual: params.valorAtual || "",
          valorAlvo: params.valorAlvo || "",
          owner: params.owner || "",
          prazo: params.prazo || "",
          prazoData: null,
          responsavelId: params.responsavelId || "",
        });
        setDialogNovoResultadoOpen(true);
        return true;
      }
      if (isKR) {
        // 1) Tentar localizar o KR já carregado.
        let kr: ResultadoChave | undefined = resultadosChave.find((r) => r.id === editar);
        let parent: Objetivo | null = kr ? (objetivos.find((o) => o.id === kr!.objetivoId) ?? null) : null;
        // 2) Se não está carregado mas o backend nos passou o objetivoId
        //    (caso da tool abrir_entidade), abrimos o objetivo agora para
        //    disparar a query de KRs e voltamos depois (return false) para
        //    completar a abertura do KR no próximo render.
        if (!kr && params.objetivoId) {
          parent = objetivos.find((o) => o.id === params.objetivoId) ?? null;
          if (!parent) return false;
          if (objetivoSelecionado?.id !== parent.id) {
            setObjetivoSelecionado(parent);
          }
          if (!dialogResultadosOpen) setDialogResultadosOpen(true);
          return false;
        }
        // 3) Sem objetivoId no payload (caso da tool atualizar_kr): pedimos
        //    ao backend o KR pelo seu próprio id para descobrir o pai.
        if (!kr && krLookup && krLookup.id === editar) {
          kr = krLookup;
          parent = objetivos.find((o) => o.id === krLookup.objetivoId) ?? null;
        }
        if (!kr) {
          if (krLookupId !== editar) setKrLookupId(editar);
          return false;
        }
        if (!parent) return false;
        setObjetivoSelecionado(parent);
        setDialogResultadosOpen(true);
        setEditandoResultado({
          ...kr,
          metrica: params.metrica || kr.metrica,
          valorInicial: params.valorInicial || kr.valorInicial,
          valorAtual: params.valorAtual || kr.valorAtual,
          valorAlvo: params.valorAlvo || kr.valorAlvo,
          owner: params.owner || kr.owner,
          prazo: params.prazo || kr.prazo,
        });
        return true;
      }
      const found = objetivos.find((o) => o.id === editar);
      if (!found) return false;
      setObjetivoSelecionado(found);
      setObjetivoEditado({
        titulo: params.titulo || found.titulo,
        descricao: params.descricao || found.descricao || "",
        prazo: params.prazo || found.prazo,
        prazoData: found.prazoData ?? null,
        perspectiva: params.perspectiva || found.perspectiva,
      });
      setEditandoObjetivo(true);
      // Sem isto, o usuário fica olhando a lista de OKRs sem feedback visual
      // (o estado de edição existe mas o modal de detalhes nunca abre).
      setDialogResultadosOpen(true);
      return true;
    }
    if (novo) {
      if (isKR) {
        const objetivoId = params.objetivoId;
        const parent = objetivoId ? objetivos.find((o) => o.id === objetivoId) : null;
        if (!parent) return false;
        setObjetivoSelecionado(parent);
        setNovoResultado({
          metrica: params.metrica || "",
          valorInicial: params.valorInicial || "",
          valorAtual: params.valorAtual || "",
          valorAlvo: params.valorAlvo || "",
          owner: params.owner || "",
          prazo: params.prazo || "",
          prazoData: null,
          responsavelId: params.responsavelId || "",
        });
        setDialogResultadosOpen(true);
        return true;
      }
      setNovoObjetivo({
        titulo: params.titulo || "",
        descricao: params.descricao || "",
        prazo: params.prazo || "",
        prazoData: null,
        perspectiva: params.perspectiva || "Financeira",
        responsavelId: "",
        estrategiaId: params.estrategiaId || null,
        iniciativaId: params.iniciativaId || null,
      });
      setIsDialogOpen(true);
      return true;
    }
    return false;
  });

  const iniciarEdicaoObjetivo = () => {
    if (objetivoSelecionado) {
      setObjetivoEditado({
        titulo: objetivoSelecionado.titulo,
        descricao: objetivoSelecionado.descricao || "",
        prazo: objetivoSelecionado.prazo,
        prazoData: objetivoSelecionado.prazoData ?? null,
        perspectiva: objetivoSelecionado.perspectiva,
      });
      setEditandoObjetivo(true);
    }
  };

  const salvarEdicaoObjetivo = async () => {
    if (!objetivoSelecionado) return;
    
    await editarObjetivoMutation.mutateAsync({
      id: objetivoSelecionado.id,
      data: objetivoEditado,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const semEstategias = empresa && estrategias.length === 0 && objetivos.length === 0;

  return (
    <div>
      {semEstategias && (
        <PrerequisiteWarning
          titulo="Recomendado: defina estratégias antes de criar suas metas"
          descricao="Suas metas ficam mais poderosas quando derivam das estratégias definidas. Complete as Estratégias primeiro para que seus objetivos estejam alinhados ao plano."
          linkLabel="Ir para Estratégias"
          linkHref="/estrategias"
          variante="info"
        />
      )}
      {/* Task #257 — Reposiciona OKRs como camada TÁTICA do BSC. Cabeçalho
          explicativo com o microcopy oficial: BSC define o "para onde",
          os Objetivos táticos quebram em Resultados-Chave mensuráveis,
          que por sua vez ATACAM os KPIs do dashboard. */}
      <Card className="mb-4 p-4 border-l-4 border-l-primary" data-testid="banner-bsc-okr">
        <div className="flex items-start gap-3">
          <Layers className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <div className="text-sm font-semibold">Camada tática da sua estratégia BSC</div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Objetivo BSC</span> → <span className="font-medium text-foreground">Objetivos táticos</span> → <span className="font-medium text-foreground">Resultados-chave mensuráveis</span> → <span className="font-medium text-foreground">KPI atacado</span>.
              Esta página executa o BSC: a cada quinzena, registre um <em>check-in</em> em cada Resultado-chave (valor + nível de confiança).
            </p>
          </div>
        </div>
      </Card>
      <PageHeader
        title="Objetivos e Metas"
        description="Defina onde quer chegar e como vai medir o progresso. Cada objetivo tem métricas de acompanhamento com prazo definido."
        tooltip="Metas ambiciosas com prazo e progresso mensurável (0–100%). Diferente dos Indicadores, que monitoram a saúde contínua do negócio com status verde/amarelo/vermelho."
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => handleAbrirModalObjetivos(null)}
              disabled={gerarObjetivosMutation.isPending}
              variant="outline"
              data-testid="button-gerar-objetivos"
            >
              {gerarObjetivosMutation.isPending && !gerandoPerspectiva ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar para todas as áreas
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-okr">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Objetivo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Objetivo tático</DialogTitle>
                  <DialogDescription>
                    Etapa de execução do Objetivo BSC. Resultados-chave abaixo dele medirão o progresso e atacarão os KPIs.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="titulo">Título do Objetivo</Label>
                    <Input
                      id="titulo"
                      placeholder="Ex: Aumentar a rentabilidade do negócio"
                      value={novoObjetivo.titulo}
                      onChange={(e) => setNovoObjetivo({ ...novoObjetivo, titulo: e.target.value })}
                      data-testid="input-objetivo-titulo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Por que este objetivo é importante?"
                      value={novoObjetivo.descricao || ""}
                      onChange={(e) => setNovoObjetivo({ ...novoObjetivo, descricao: e.target.value })}
                      rows={3}
                      data-testid="input-objetivo-descricao"
                    />
                  </div>
                  <div>
                    <Label>Prazo</Label>
                    <PrazoDatePicker
                      prazo={novoObjetivo.prazo}
                      prazoData={novoObjetivo.prazoData}
                      onChange={(next) => setNovoObjetivo({ ...novoObjetivo, ...next })}
                      testIdPrefix="objetivo-prazo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="perspectiva">Área do Negócio</Label>
                    <Select
                      value={novoObjetivo.perspectiva}
                      onValueChange={(value) => setNovoObjetivo({ ...novoObjetivo, perspectiva: value })}
                    >
                      <SelectTrigger data-testid="select-perspectiva">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {perspectivas.map((p) => (
                          <SelectItem key={p.valor} value={p.valor}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {membros.length > 0 && (
                    <div>
                      <Label>Responsável</Label>
                      <Select
                        value={novoObjetivo.responsavelId || "__none__"}
                        onValueChange={(v) => setNovoObjetivo({ ...novoObjetivo, responsavelId: v === "__none__" ? "" : v })}
                      >
                        <SelectTrigger data-testid="select-responsavel-objetivo">
                          <SelectValue placeholder="Sem responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem responsável</SelectItem>
                          {membros.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <OrigemSelector
                    label="Iniciativa de origem"
                    obrigatorio={origemObrigatoria && !novoObjetivo.estrategiaId}
                    ajuda={origemObrigatoria ? "Durante a 1ª jornada, escolha uma Iniciativa (preferencial) ou Estratégia." : undefined}
                    opcoes={iniciativas.map(i => ({ id: i.id, label: i.titulo }))}
                    value={novoObjetivo.iniciativaId || ""}
                    onChange={(v) => setNovoObjetivo({ ...novoObjetivo, iniciativaId: v || null })}
                    testId="select-origem-iniciativa-objetivo"
                  />
                  {estrategias.length > 0 && (
                    <OrigemSelector
                      label="Estratégia relacionada"
                      obrigatorio={origemObrigatoria && !novoObjetivo.iniciativaId}
                      opcoes={estrategias.map(e => ({ id: e.id, label: `[${e.tipo}] ${e.titulo}` }))}
                      value={novoObjetivo.estrategiaId || ""}
                      onChange={(v) => setNovoObjetivo({ ...novoObjetivo, estrategiaId: v || null })}
                      testId="select-estrategia-objetivo"
                    />
                  )}
                  <Button
                    onClick={handleCriarObjetivo}
                    className="w-full"
                    disabled={criarObjetivoMutation.isPending}
                    data-testid="button-criar-objetivo"
                  >
                    {criarObjetivoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Criar Objetivo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Educational callout: Metas vs Indicadores */}
      <Card className="p-4 bg-muted/30" data-testid="card-educational-okr">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <TargetIcon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Metas — O que queremos conquistar (esta página)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Definem onde você quer chegar em um ciclo. Têm prazo e progresso de 0–100%.
              Clique em um objetivo para gerenciar suas métricas de progresso.
            </p>
          </div>
          <div className="hidden sm:flex items-center text-muted-foreground/40">
            <span className="text-lg font-light">vs</span>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Indicadores — Saúde contínua do negócio</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Medem o que já está em operação com status verde/amarelo/vermelho. Sem prazo de encerramento — monitorados permanentemente.
            </p>
          </div>
        </div>
      </Card>

      {objetivos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <TargetIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Defina onde você quer chegar</h3>
            <p className="text-sm text-muted-foreground">
              Metas claras e mensuráveis traduzem a estratégia em ação. Cada objetivo é ambicioso e tem métricas concretas de progresso com prazo definido. A IA cria metas alinhadas às suas iniciativas e estratégias, garantindo execução focada e rastreável.
            </p>
            <Button
              onClick={() => handleAbrirModalObjetivos(null)}
              disabled={gerarObjetivosMutation.isPending}
              data-testid="button-gerar-objetivos-empty"
            >
              {gerarObjetivosMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar Objetivos com IA
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mt-6">
          {perspectivas.map((perspectiva) => {
            const Icon = perspectiva.icon;
            const objs = objetivosPorPerspectiva(perspectiva.valor);
            
            return (
              <Card
                key={perspectiva.valor}
                className={`min-w-0 overflow-hidden ${perspectiva.borderTop}`}
                data-testid={`card-perspectiva-${perspectiva.valor}`}
              >
                <div className={`flex items-center justify-between gap-2 flex-wrap p-4 sm:p-5 border-b ${perspectiva.headerBg}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${perspectiva.iconBg} flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${perspectiva.iconText}`} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{perspectiva.label}</h3>
                      <p className="text-sm text-muted-foreground">{objs.length} objetivo(s)</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAbrirModalObjetivos(perspectiva.valor)}
                    disabled={gerarObjetivosMutation.isPending}
                    data-testid={`button-gerar-perspectiva-${perspectiva.valor}`}
                  >
                    {gerandoPerspectiva === perspectiva.valor ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    <span className="hidden sm:inline">Gerar com IA</span>
                    <span className="sm:hidden">IA</span>
                  </Button>
                </div>

                <div className="space-y-3 p-4 sm:p-5">
                  {objs.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum objetivo nesta perspectiva
                    </div>
                  ) : (
                    objs.map((objetivo) => (
                      <ObjetivoCard
                        key={objetivo.id}
                        objetivo={objetivo}
                        membros={membros}
                        estrategias={estrategias}
                        iniciativas={iniciativas}
                        resultadosChave={resultadosChave}
                        jornadaConcluida={!!jornadaConcluida}
                        onSelect={(obj) => { setObjetivoSelecionado(obj); setDialogResultadosOpen(true); }}
                        onRetro={(obj) => { setRetroObjetivo(obj); setRetroDialogOpen(true); }}
                        onDelete={(id) => deletarObjetivoMutation.mutate(id)}
                      />
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Retrospectiva Dialog */}
      <Dialog open={retroDialogOpen} onOpenChange={setRetroDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Retrospectiva do Ciclo
            </DialogTitle>
          </DialogHeader>
          {retroObjetivo && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Objetivo: <span className="font-medium text-foreground">{retroObjetivo.titulo}</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Início do Ciclo</Label>
                  <Input type="date" value={retroForm.periodoInicio} onChange={e => setRetroForm(f => ({ ...f, periodoInicio: e.target.value }))} data-testid="input-retro-inicio" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim do Ciclo</Label>
                  <Input type="date" value={retroForm.periodoFim} onChange={e => setRetroForm(f => ({ ...f, periodoFim: e.target.value }))} data-testid="input-retro-fim" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-green-700 dark:text-green-400">O que conquistamos?</Label>
                <Textarea value={retroForm.conquistas} onChange={e => setRetroForm(f => ({ ...f, conquistas: e.target.value }))} placeholder="Principais vitórias e resultados alcançados..." rows={2} data-testid="textarea-retro-conquistas" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-red-700 dark:text-red-400">O que não funcionou?</Label>
                <Textarea value={retroForm.falhas} onChange={e => setRetroForm(f => ({ ...f, falhas: e.target.value }))} placeholder="Obstáculos, erros e o que ficou para trás..." rows={2} data-testid="textarea-retro-falhas" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-blue-700 dark:text-blue-400">O que aprendemos?</Label>
                <Textarea value={retroForm.aprendizados} onChange={e => setRetroForm(f => ({ ...f, aprendizados: e.target.value }))} placeholder="Insights e lições para os próximos ciclos..." rows={2} data-testid="textarea-retro-aprendizados" />
              </div>
              <div className="space-y-1.5">
                <Label>Ajustes para o próximo ciclo</Label>
                <Textarea value={retroForm.ajustes} onChange={e => setRetroForm(f => ({ ...f, ajustes: e.target.value }))} placeholder="O que mudamos na estratégia ou nas metas?" rows={2} data-testid="textarea-retro-ajustes" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setRetroDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => criarRetroMutation.mutate({ objetivoId: retroObjetivo.id, ...retroForm })}
                  disabled={criarRetroMutation.isPending || (!retroForm.conquistas && !retroForm.falhas && !retroForm.aprendizados)}
                  data-testid="button-salvar-retro"
                >
                  {criarRetroMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Registrar Retrospectiva
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogResultadosOpen} onOpenChange={(open) => {
        setDialogResultadosOpen(open);
        if (!open) {
          setEditandoObjetivo(false);
          setObjetivoEditado({ titulo: "", descricao: "", prazo: "", prazoData: null, perspectiva: "Financeira" });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoObjetivo ? "Editar Objetivo" : objetivoSelecionado?.titulo}
            </DialogTitle>
          </DialogHeader>
          {objetivoSelecionado && (
            <div className="space-y-6 py-4">
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Detalhes do Objetivo</h4>
                  {!editandoObjetivo ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={iniciarEdicaoObjetivo}
                      data-testid="button-editar-objetivo"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditandoObjetivo(false)}
                        data-testid="button-cancelar-objetivo"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={salvarEdicaoObjetivo}
                        disabled={editarObjetivoMutation.isPending}
                        data-testid="button-salvar-objetivo"
                      >
                        {editarObjetivoMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>
                
                {editandoObjetivo ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={objetivoEditado.titulo}
                        onChange={(e) => setObjetivoEditado({ ...objetivoEditado, titulo: e.target.value })}
                        placeholder="Título do objetivo"
                        data-testid="input-editar-titulo"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={objetivoEditado.descricao}
                        onChange={(e) => setObjetivoEditado({ ...objetivoEditado, descricao: e.target.value })}
                        placeholder="Descrição do objetivo (opcional)"
                        rows={3}
                        data-testid="input-editar-descricao"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prazo</Label>
                        <PrazoDatePicker
                          prazo={objetivoEditado.prazo}
                          prazoData={objetivoEditado.prazoData}
                          onChange={(next) => setObjetivoEditado({ ...objetivoEditado, ...next })}
                          testIdPrefix="editar-objetivo-prazo"
                        />
                      </div>
                      <div>
                        <Label>Área do Negócio</Label>
                        <Select
                          value={objetivoEditado.perspectiva}
                          onValueChange={(value) => setObjetivoEditado({ ...objetivoEditado, perspectiva: value })}
                        >
                          <SelectTrigger data-testid="select-editar-perspectiva">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {perspectivas.map((p) => (
                              <SelectItem key={p.valor} value={p.valor}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Título:</p>
                      <p className="text-sm text-muted-foreground">{objetivoSelecionado.titulo}</p>
                    </div>
                    {objetivoSelecionado.descricao && (
                      <div>
                        <p className="text-sm font-medium">Descrição:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.descricao}</p>
                      </div>
                    )}
                    <div className="flex gap-6">
                      <div>
                        <p className="text-sm font-medium">Prazo:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.prazo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Perspectiva:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.perspectiva}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Métricas de Progresso</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirModalResultados(objetivoSelecionado.id)}
                    disabled={gerarResultadosMutation.isPending}
                    data-testid={`button-gerar-resultados-${objetivoSelecionado.id}`}
                  >
                    {gerarResultadosMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Gerar com IA
                  </Button>
                  <Dialog open={dialogNovoResultadoOpen} onOpenChange={setDialogNovoResultadoOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid={`button-add-resultado-${objetivoSelecionado.id}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Resultado-chave</DialogTitle>
                        <DialogDescription>
                          Métrica mensurável que evidencia o avanço do Objetivo tático e ataca um KPI do BSC.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Métrica</Label>
                          <Input
                            placeholder="Ex: Taxa de conversão"
                            value={novoResultado.metrica}
                            onChange={(e) => setNovoResultado({ ...novoResultado, metrica: e.target.value })}
                            data-testid="input-resultado-metrica"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Valor Inicial</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={novoResultado.valorInicial}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorInicial: e.target.value })}
                              data-testid="input-resultado-inicial"
                            />
                          </div>
                          <div>
                            <Label>Valor Atual</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={novoResultado.valorAtual}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorAtual: e.target.value })}
                              data-testid="input-resultado-atual"
                            />
                          </div>
                          <div>
                            <Label>Valor Alvo</Label>
                            <Input
                              type="number"
                              placeholder="100"
                              value={novoResultado.valorAlvo}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorAlvo: e.target.value })}
                              data-testid="input-resultado-alvo"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Responsável</Label>
                            <Select
                              value={novoResultado.responsavelId || ""}
                              onValueChange={(v) => setNovoResultado({ ...novoResultado, responsavelId: v })}
                            >
                              <SelectTrigger data-testid="select-resultado-responsavel">
                                <SelectValue placeholder="Selecione um membro" />
                              </SelectTrigger>
                              <SelectContent>
                                {membros.map(m => (
                                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Prazo</Label>
                            <PrazoDatePicker
                              prazo={novoResultado.prazo}
                              prazoData={novoResultado.prazoData}
                              onChange={(next) => setNovoResultado({ ...novoResultado, ...next })}
                              testIdPrefix="resultado-prazo"
                            />
                          </div>
                        </div>
                        <KrQualityCheck
                          metrica={novoResultado.metrica}
                          valorInicial={novoResultado.valorInicial}
                          valorAlvo={novoResultado.valorAlvo}
                          prazo={novoResultado.prazo}
                          testIdPrefix="kr-quality-novo"
                          onAplicarSugestao={(s) => setNovoResultado({
                            ...novoResultado,
                            metrica: s.metrica ?? novoResultado.metrica,
                            valorInicial: s.valorInicial ?? novoResultado.valorInicial,
                            valorAlvo: s.valorAlvo ?? novoResultado.valorAlvo,
                            prazo: s.prazo ?? novoResultado.prazo,
                          })}
                        />
                        <Button
                          onClick={handleCriarResultado}
                          className="w-full"
                          disabled={criarResultadoMutation.isPending}
                          data-testid="button-criar-resultado"
                        >
                          {criarResultadoMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Criar Resultado-chave
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {aiKrAvisos.length > 0 ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950 space-y-3" data-testid="banner-ai-quality-avisos">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-amber-900 dark:text-amber-200">
                        Revisão de qualidade dos KRs gerados pela IA
                      </div>
                      <div className="text-amber-900/80 dark:text-amber-200/80">
                        {aiKrAvisos.length} resultado-chave precisa(m) de atenção. Aplicar a sugestão atualiza o KR salvo.
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setAiKrAvisos([])} data-testid="button-fechar-avisos-ai">
                      Dispensar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {aiKrAvisos.map(({ krId, metrica, verdict }) => (
                      <div key={krId} className="rounded border border-amber-200 bg-white p-2 dark:border-amber-800 dark:bg-amber-900/40" data-testid={`aviso-ai-${krId}`}>
                        <div className="text-xs text-muted-foreground">KR salvo</div>
                        <div className="font-medium">{metrica}</div>
                        {verdict.problemas.length > 0 && (
                          <ul className="mt-1 ml-4 list-disc text-xs text-amber-900 dark:text-amber-200">
                            {verdict.problemas.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        )}
                        {verdict.sugestaoMetrica && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={async () => {
                                await editarResultadoMutation.mutateAsync({
                                  id: krId,
                                  data: {
                                    metrica: verdict.sugestaoMetrica ?? undefined,
                                    valorInicial: verdict.sugestaoValorInicial != null ? String(verdict.sugestaoValorInicial) : undefined,
                                    valorAlvo: verdict.sugestaoValorAlvo != null ? String(verdict.sugestaoValorAlvo) : undefined,
                                    prazo: verdict.sugestaoPrazo ?? undefined,
                                  },
                                });
                                setAiKrAvisos((prev) => prev.filter((a) => a.krId !== krId));
                              }}
                              data-testid={`button-aplicar-sugestao-ai-${krId}`}
                            >
                              Aplicar sugestão
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAiKrAvisos((prev) => prev.filter((a) => a.krId !== krId))}
                              data-testid={`button-ignorar-aviso-ai-${krId}`}
                            >
                              Ignorar
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {resultadosChave.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma métrica de progresso definida ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {resultadosChave.map((resultado) => (
                    <ResultadoChaveCard
                      key={resultado.id}
                      resultado={resultado}
                      isEditing={editandoResultado?.id === resultado.id}
                      editingData={editandoResultado}
                      onStartEdit={setEditandoResultado}
                      onChangeEdit={setEditandoResultado}
                      onSave={handleEditarResultado}
                      onCancelEdit={() => setEditandoResultado(null)}
                      onDelete={(id) => deletarResultadoMutation.mutate(id)}
                      isSaving={editarResultadoMutation.isPending}
                      indicadores={indicadoresLista}
                      membros={membros}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AIGenerationModal
        open={aiObjetivosOpen}
        onOpenChange={setAiObjetivosOpen}
        onConfirm={handleConfirmAIObjetivos}
        title={
          aiObjetivosPerspectivaInicial
            ? `Gerar objetivos com IA — ${aiObjetivosPerspectivaInicial}`
            : "Gerar objetivos com IA"
        }
        description={
          aiObjetivosPerspectivaInicial
            ? "Defina quantos objetivos quer nesta perspectiva. A IA escolhe automaticamente as iniciativas/estratégias de origem com base no contexto."
            : "Defina quantos objetivos quer por perspectiva. A IA escolhe automaticamente as iniciativas/estratégias de origem com base no contexto e prioriza o que é mais crítico."
        }
        isGenerating={gerarObjetivosMutation.isPending}
        testIdPrefix="ai-objetivos"
        quantidade={{
          label: "Quantidade por perspectiva",
          default: 1,
          min: 1,
          max: 5,
          suffixSingular: "objetivo",
          suffixPlural: "objetivos",
        }}
        quantidadeSecundaria={{
          label: "Métricas por objetivo",
          description: "Quantos resultados-chave (KRs) a IA deve gerar automaticamente para cada objetivo criado.",
          default: 3,
          min: 1,
          max: 5,
          suffixSingular: "métrica",
          suffixPlural: "métricas",
        }}
        foco={{
          label: "Perspectivas do BSC",
          description: "Opcional. Sem seleção, a IA equilibra todas as 4 perspectivas conforme o contexto.",
          requireAtLeastOne: false,
          items: perspectivas.map((p) => ({ value: p.valor, label: p.label })),
          defaultSelected: aiObjetivosPerspectivaInicial
            ? [aiObjetivosPerspectivaInicial]
            : perspectivas.map((p) => p.valor),
        }}
        fontesContexto={{
          label: "Fontes de contexto",
          items: [
            { id: "estrategias", label: "Estratégias TOWS", desc: "Apostas estratégicas já definidas" },
            { id: "oportunidades", label: "Frentes de Crescimento", desc: "Quadrantes da Matriz de Ansoff" },
            { id: "iniciativas", label: "Iniciativas", desc: "Iniciativas prioritárias" },
            { id: "modeloNegocio", label: "Modelo de Negócio (BMC)", desc: "Proposta de valor, segmentos e atividades" },
          ],
        }}
        instrucaoAdicional={{
          placeholder: "Ex: Foque em objetivos relacionados à expansão digital e fidelização.",
        }}
      />

      <AIGenerationModal
        open={aiResultadosOpen}
        onOpenChange={setAiResultadosOpen}
        onConfirm={handleConfirmAIResultados}
        title="Gerar métricas de progresso com IA"
        description="Configure quantas métricas a IA deve gerar para este objetivo."
        isGenerating={gerarResultadosMutation.isPending}
        testIdPrefix="ai-resultados-chave"
        origemId={aiResultadosObjetivoId ?? undefined}
        quantidade={{
          label: "Quantidade",
          default: 3,
          min: 1,
          max: 5,
          suffixSingular: "métrica",
          suffixPlural: "métricas",
        }}
        foco={{
          label: "Tipo de métrica",
          description: "Opcional. Filtre por tipo de métrica. Sem seleção, a IA equilibra os tipos.",
          requireAtLeastOne: false,
          items: [
            { value: "financeira", label: "Financeira", desc: "Receita, margem, custo, ROI" },
            { value: "operacional", label: "Operacional", desc: "Volumes, produtividade, capacidade" },
            { value: "satisfacao", label: "Satisfação", desc: "NPS, CSAT, retenção, churn" },
            { value: "processo", label: "Processo / Qualidade", desc: "SLA, defeitos, conformidade" },
          ],
          defaultSelected: [],
        }}
        instrucaoAdicional={{
          placeholder: "Ex: Priorize métricas com fontes de dados já disponíveis.",
        }}
      />
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import AdminGuard from "@/components/AdminGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";

interface ContextoMacro {
  categoria: string;
  titulo: string;
  textoAtivo: string | null;
  rascunho: string | null;
  ativo: boolean;
  ultimaAtualizacao: string | null;
  agendadorAtivo: boolean;
  agendadorFrequencia: string | null;
  proximoAgendamento: string | null;
  alertaDias: number;
  queryBusca: string | null;
  queryEfetiva: string;
}

interface ExecLog {
  timestamp: string;
  modo: "web_search" | "fallback";
  resultado: "sucesso" | "erro";
  mensagem: string;
}

const CATEGORIAS_ICONS: Record<string, string> = {
  cambio_politica_monetaria: "💱",
  inflacao_custos: "📈",
  cenario_politico_regulatorio: "🏛️",
  geopolitica_comercio_exterior: "🌐",
  crises_setoriais: "⚠️",
  tendencias_mercado: "🚀",
  contexto_geral: "🇧🇷",
};

function diasDesdeAtualizacao(ultimaAtualizacao: string | null): number | null {
  if (!ultimaAtualizacao) return null;
  const diff = Date.now() - new Date(ultimaAtualizacao).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function StatusBadge({ cat }: { cat: ContextoMacro }) {
  if (!cat.textoAtivo) {
    return (
      <Badge variant="secondary" data-testid={`badge-status-${cat.categoria}`}>
        Sem conteúdo
      </Badge>
    );
  }
  const dias = diasDesdeAtualizacao(cat.ultimaAtualizacao);
  if (!cat.ativo) {
    return (
      <Badge variant="secondary" data-testid={`badge-status-${cat.categoria}`}>
        Inativo
      </Badge>
    );
  }
  if (dias !== null && dias > cat.alertaDias * 2) {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30" data-testid={`badge-status-${cat.categoria}`}>
        <AlertCircle className="h-3 w-3 mr-1" />
        Crítico ({dias}d)
      </Badge>
    );
  }
  if (dias !== null && dias > cat.alertaDias) {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30" data-testid={`badge-status-${cat.categoria}`}>
        <AlertCircle className="h-3 w-3 mr-1" />
        Desatualizado ({dias}d)
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30" data-testid={`badge-status-${cat.categoria}`}>
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Ativo
    </Badge>
  );
}

function CategoriaCard({
  cat,
  onRefetch,
  webSearchAtivo,
}: {
  cat: ContextoMacro;
  onRefetch: () => void;
  webSearchAtivo: boolean | undefined;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editingTexto, setEditingTexto] = useState(false);
  const [textoEdit, setTextoEdit] = useState(cat.textoAtivo ?? "");
  const [editingRascunho, setEditingRascunho] = useState(false);
  const [rascunhoEdit, setRascunhoEdit] = useState(cat.rascunho ?? "");
  const [editingQuery, setEditingQuery] = useState(false);
  const [queryEdit, setQueryEdit] = useState(cat.queryBusca ?? "");

  const { data: execLogs } = useQuery<ExecLog[]>({
    queryKey: ["/api/admin/contexto-macro", cat.categoria, "log"],
    queryFn: () => apiRequest("GET", `/api/admin/contexto-macro/${cat.categoria}/log`),
    enabled: expanded,
    refetchInterval: expanded ? 30_000 : false,
  });

  const patchMutation = useMutation({
    mutationFn: (data: Partial<ContextoMacro>) =>
      apiRequest("PATCH", `/api/admin/contexto-macro/${cat.categoria}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contexto-macro"] });
      onRefetch();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const gerarMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/contexto-macro/${cat.categoria}/gerar`, {}),
    onSuccess: (data: any) => {
      const mode = data.mode === "auto_aprovado" ? "Auto-aprovado e ativado." : "Salvo como rascunho para revisão.";
      toast({ title: "Geração concluída", description: mode });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contexto-macro"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contexto-macro", cat.categoria, "log"] });
      onRefetch();
    },
    onError: (e: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contexto-macro", cat.categoria, "log"] });
      toast({ title: "Erro ao gerar", description: e.message, variant: "destructive" });
    },
  });

  const aprovarMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/contexto-macro/${cat.categoria}/aprovar`, {}),
    onSuccess: () => {
      toast({ title: "Rascunho aprovado", description: "Texto ativo atualizado." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contexto-macro"] });
      onRefetch();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const descartarMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/contexto-macro/${cat.categoria}/rascunho`),
    onSuccess: () => {
      toast({ title: "Rascunho descartado" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contexto-macro"] });
      onRefetch();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const dias = diasDesdeAtualizacao(cat.ultimaAtualizacao);
  const isStale = dias !== null && dias > cat.alertaDias;
  const isAnyPending = patchMutation.isPending || gerarMutation.isPending || aprovarMutation.isPending || descartarMutation.isPending;

  return (
    <Card data-testid={`card-categoria-${cat.categoria}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">{CATEGORIAS_ICONS[cat.categoria] ?? "📊"}</span>
          <CardTitle className="text-base">{cat.titulo}</CardTitle>
          <StatusBadge cat={cat} />
          {cat.rascunho && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-rascunho-${cat.categoria}`}>
              Rascunho pendente
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            checked={cat.ativo}
            onCheckedChange={(v) => patchMutation.mutate({ ativo: v })}
            data-testid={`switch-ativo-${cat.categoria}`}
            disabled={isAnyPending || !cat.textoAtivo}
          />
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            {cat.ativo ? "Ativo" : "Inativo"}
          </Label>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
            data-testid={`button-expand-${cat.categoria}`}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!expanded && cat.textoAtivo && (
        <CardContent className="pt-0 pb-3">
          <p className="text-xs text-muted-foreground line-clamp-3" data-testid={`preview-texto-${cat.categoria}`}>
            {cat.textoAtivo}
          </p>
        </CardContent>
      )}

      {expanded && (
        <CardContent className="space-y-4">
          {/* Metadata row */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {cat.ultimaAtualizacao && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Atualizado: {new Date(cat.ultimaAtualizacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                {dias !== null && <span className={isStale ? "text-amber-600 dark:text-amber-400 font-medium" : ""}> ({dias}d atrás)</span>}
              </span>
            )}
            {cat.agendadorAtivo && cat.proximoAgendamento && (
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Próxima geração: {new Date(cat.proximoAgendamento).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Texto ativo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Texto Ativo</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTextoEdit(cat.textoAtivo ?? "");
                  setEditingTexto((v) => !v);
                }}
                data-testid={`button-edit-texto-${cat.categoria}`}
              >
                {editingTexto ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {editingTexto ? "Cancelar" : "Editar"}
              </Button>
            </div>
            {editingTexto ? (
              <div className="space-y-2">
                <Textarea
                  value={textoEdit}
                  onChange={(e) => setTextoEdit(e.target.value)}
                  className="min-h-[200px] text-sm font-mono"
                  data-testid={`textarea-texto-${cat.categoria}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      patchMutation.mutate({ textoAtivo: textoEdit });
                      setEditingTexto(false);
                    }}
                    disabled={isAnyPending}
                    data-testid={`button-salvar-texto-${cat.categoria}`}
                  >
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingTexto(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto"
                data-testid={`text-ativo-${cat.categoria}`}
              >
                {cat.textoAtivo || (
                  <span className="text-muted-foreground italic">Nenhum texto ativo. Gere ou escreva um conteúdo.</span>
                )}
              </div>
            )}
          </div>

          {/* Rascunho */}
          {cat.rascunho && (
            <div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <span className="text-amber-600 dark:text-amber-400">Rascunho Pendente</span>
                </Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRascunhoEdit(cat.rascunho ?? "");
                    setEditingRascunho((v) => !v);
                  }}
                  data-testid={`button-edit-rascunho-${cat.categoria}`}
                >
                  {editingRascunho ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {editingRascunho ? "Cancelar" : "Editar"}
                </Button>
              </div>
              {editingRascunho ? (
                <div className="space-y-2">
                  <Textarea
                    value={rascunhoEdit}
                    onChange={(e) => setRascunhoEdit(e.target.value)}
                    className="min-h-[200px] text-sm font-mono"
                    data-testid={`textarea-rascunho-${cat.categoria}`}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        patchMutation.mutate({ rascunho: rascunhoEdit });
                        setEditingRascunho(false);
                      }}
                      disabled={isAnyPending}
                      data-testid={`button-salvar-rascunho-${cat.categoria}`}
                    >
                      Salvar rascunho
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingRascunho(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto"
                  data-testid={`text-rascunho-${cat.categoria}`}
                >
                  {cat.rascunho}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => aprovarMutation.mutate()}
                  disabled={isAnyPending}
                  data-testid={`button-aprovar-${cat.categoria}`}
                >
                  {aprovarMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span className="ml-1">Aprovar e ativar</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => descartarMutation.mutate()}
                  disabled={isAnyPending}
                  data-testid={`button-descartar-${cat.categoria}`}
                >
                  {descartarMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  <span className="ml-1">Descartar</span>
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Query de busca */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                Query de busca Google
              </Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQueryEdit(cat.queryBusca ?? "");
                  setEditingQuery((v) => !v);
                }}
                data-testid={`button-edit-query-${cat.categoria}`}
              >
                {editingQuery ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {editingQuery ? "Cancelar" : "Editar"}
              </Button>
            </div>
            {editingQuery ? (
              <div className="space-y-2">
                <Input
                  value={queryEdit}
                  onChange={(e) => setQueryEdit(e.target.value)}
                  placeholder="Deixe em branco para usar a query padrão do código"
                  className="text-sm font-mono"
                  data-testid={`input-query-${cat.categoria}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      patchMutation.mutate({ queryBusca: queryEdit || null });
                      setEditingQuery(false);
                    }}
                    disabled={isAnyPending}
                    data-testid={`button-salvar-query-${cat.categoria}`}
                  >
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingQuery(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-md bg-muted/50 p-3 text-sm font-mono text-muted-foreground"
                data-testid={`text-query-${cat.categoria}`}
              >
                <span>{cat.queryEfetiva}</span>
                {!cat.queryBusca && (
                  <span className="block text-xs mt-1 italic text-muted-foreground/60">(padrão do código — personalize acima)</span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => gerarMutation.mutate()}
              disabled={isAnyPending}
              data-testid={`button-gerar-${cat.categoria}`}
            >
              {gerarMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <BrainCircuit className="h-3.5 w-3.5 mr-1" />
              )}
              {gerarMutation.isPending ? "Gerando..." : "Gerar com IA"}
            </Button>
            {webSearchAtivo === true && (
              <span
                className="flex items-center gap-1 text-[11px] text-green-700 dark:text-green-400"
                data-testid={`badge-websearch-ativo-${cat.categoria}`}
              >
                <Globe className="h-3 w-3" />
                busca na web ativa
              </span>
            )}
            {webSearchAtivo === false && (
              <span
                className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400"
                data-testid={`badge-websearch-fallback-${cat.categoria}`}
              >
                <AlertTriangle className="h-3 w-3" />
                fallback — sem web search
              </span>
            )}
          </div>

          <Separator />

          {/* Scheduler */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Agendador automático
            </Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={cat.agendadorAtivo}
                  onCheckedChange={(v) => {
                    patchMutation.mutate({ agendadorAtivo: v });
                  }}
                  data-testid={`switch-agendador-${cat.categoria}`}
                  disabled={isAnyPending}
                />
                <Label className="text-sm">Ativar agendador</Label>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Frequência</Label>
                <Select
                  value={cat.agendadorFrequencia ?? ""}
                  onValueChange={(v) => patchMutation.mutate({ agendadorFrequencia: v })}
                  disabled={isAnyPending}
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    data-testid={`select-frequencia-${cat.categoria}`}
                  >
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4h">A cada 4 horas</SelectItem>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Próxima geração</Label>
                <Input
                  type="datetime-local"
                  className="h-8 text-sm"
                  value={
                    cat.proximoAgendamento
                      ? new Date(cat.proximoAgendamento).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    patchMutation.mutate({
                      proximoAgendamento: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  data-testid={`input-proximo-agendamento-${cat.categoria}`}
                  disabled={isAnyPending}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Alerta de desatualização (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  className="h-8 text-sm"
                  value={cat.alertaDias}
                  onChange={(e) =>
                    patchMutation.mutate({ alertaDias: parseInt(e.target.value, 10) || 7 })
                  }
                  data-testid={`input-alerta-dias-${cat.categoria}`}
                  disabled={isAnyPending}
                />
              </div>
            </div>
          </div>

          {/* Execution log */}
          {execLogs && execLogs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Histórico de execuções
                </Label>
                <div className="space-y-1" data-testid={`log-historico-${cat.categoria}`}>
                  {execLogs.slice(0, 5).map((log, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs rounded-md px-2 py-1.5 bg-muted/40"
                      data-testid={`log-entry-${cat.categoria}-${i}`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {log.resultado === "sucesso" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                        )}
                      </span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {new Date(log.timestamp).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className={`flex items-center gap-0.5 shrink-0 font-medium ${log.modo === "web_search" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {log.modo === "web_search" ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {log.modo === "web_search" ? "web search" : "fallback"}
                      </span>
                      <span className="text-foreground/80 break-words min-w-0">{log.mensagem}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {execLogs && execLogs.length === 0 && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground" data-testid={`log-vazio-${cat.categoria}`}>
                Nenhuma execução registrada ainda. Use o botão "Gerar com IA" para registrar a primeira.
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ContextoMacroPage() {
  const { user } = useAuth();

  const { data: categorias, isLoading, refetch } = useQuery<ContextoMacro[]>({
    queryKey: ["/api/admin/contexto-macro"],
    enabled: !!user?.isAdmin,
  });

  const { data: aiStatus } = useQuery<{ webSearchAtivo: boolean }>({
    queryKey: ["/api/admin/ai-status"],
    enabled: !!user?.isAdmin,
  });


  const ativosCount = categorias?.filter((c) => c.ativo).length ?? 0;
  const pendentesCount = categorias?.filter((c) => c.rascunho).length ?? 0;
  const staleCategorias = categorias?.filter((c) => {
    const dias = diasDesdeAtualizacao(c.ultimaAtualizacao);
    return c.ativo && dias !== null && dias > c.alertaDias;
  }).length ?? 0;

  return (
    <AdminGuard>
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Motor de Contexto Macro</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Curadoria do cenário macroeconômico injetado automaticamente em todas as análises de IA.
          Esta página é acessível apenas para o super-administrador.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-ativos-count">{ativosCount}</p>
                <p className="text-xs text-muted-foreground">Categorias ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-pendentes-count">{pendentesCount}</p>
                <p className="text-xs text-muted-foreground">Rascunhos pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stale-count">{staleCategorias}</p>
                <p className="text-xs text-muted-foreground">Desatualizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categorias */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando...
        </div>
      ) : (
        <div className="space-y-3">
          {(categorias ?? []).map((cat) => (
            <CategoriaCard
              key={cat.categoria}
              cat={cat}
              onRefetch={() => refetch()}
              webSearchAtivo={aiStatus?.webSearchAtivo}
            />
          ))}
        </div>
      )}
    </div>
    </AdminGuard>
  );
}

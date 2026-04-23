import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Pencil, Trash2, Check, X, MessagesSquare } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConversaItem {
  id: string;
  titulo: string;
  criadaEm: string;
  ultimaInteracaoEm: string;
  encerradaEm: string | null;
  previaUltimaMensagem: string | null;
  totalMensagens: number;
}

const SESSION_KEY = "bizzy:conversaId";

function dataRelativa(iso: string): string {
  try {
    const data = new Date(iso);
    const diff = Date.now() - data.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `há ${d} d`;
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

type Grupo = "hoje" | "ontem" | "semana" | "antigos";

function classificar(iso: string): Grupo {
  const d = new Date(iso);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const seteDias = new Date(hoje);
  seteDias.setDate(seteDias.getDate() - 7);
  if (d >= hoje) return "hoje";
  if (d >= ontem) return "ontem";
  if (d >= seteDias) return "semana";
  return "antigos";
}

const GRUPOS_ORDEM: Array<{ key: Grupo; label: string }> = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "semana", label: "Últimos 7 dias" },
  { key: "antigos", label: "Mais antigas" },
];

export function ConversasHistorico({
  onAbrir,
}: {
  // Trocar para a aba Chat com a conversa carregada (parent gerencia isso).
  onAbrir: (conversaId: string) => void;
}) {
  const { toast } = useToast();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoTitulo, setEditandoTitulo] = useState("");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ conversas: ConversaItem[] }>({
    queryKey: ["/api/ai/conversas"],
  });
  const conversas = useMemo(() => data?.conversas ?? [], [data]);

  const grupos = useMemo(() => {
    const buckets: Record<Grupo, ConversaItem[]> = { hoje: [], ontem: [], semana: [], antigos: [] };
    for (const c of conversas) {
      buckets[classificar(c.ultimaInteracaoEm)].push(c);
    }
    return buckets;
  }, [conversas]);

  const salvarTitulo = async (id: string) => {
    const titulo = editandoTitulo.trim();
    if (!titulo) {
      setEditandoId(null);
      return;
    }
    try {
      await apiRequest("PATCH", `/api/ai/conversas/${id}`, { titulo });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversas"] });
      setEditandoId(null);
    } catch (err) {
      toast({
        title: "Erro ao renomear",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const excluir = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/ai/conversas/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversas"] });
      try {
        if (sessionStorage.getItem(SESSION_KEY) === id) {
          sessionStorage.removeItem(SESSION_KEY);
          window.dispatchEvent(new CustomEvent("biz-assistant:conversa-removida", { detail: { id } }));
        }
      } catch {}
      toast({ title: "Conversa excluída" });
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setExcluindoId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversas…
      </div>
    );
  }

  if (conversas.length === 0) {
    return (
      <div className="text-center py-10 px-4 space-y-2" data-testid="text-conversas-vazio">
        <MessagesSquare className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          Você ainda não tem conversas. Comece uma agora pela aba Chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4" data-testid="lista-conversas-historico">
      {GRUPOS_ORDEM.map(({ key, label }) => {
        const items = grupos[key];
        if (items.length === 0) return null;
        return (
          <div key={key} className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-1">
              {label}
            </p>
            <div className="space-y-1.5">
              {items.map((c) => {
                const sessionAtiva = (() => {
                  try {
                    return sessionStorage.getItem(SESSION_KEY) === c.id;
                  } catch {
                    return false;
                  }
                })();
                return (
                  <div
                    key={c.id}
                    className="rounded-md border p-2.5 space-y-1.5"
                    data-testid={`row-conversa-${c.id}`}
                  >
                    {editandoId === c.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editandoTitulo}
                          onChange={(e) => setEditandoTitulo(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") salvarTitulo(c.id);
                            if (e.key === "Escape") setEditandoId(null);
                          }}
                          autoFocus
                          className="h-8 text-sm"
                          data-testid={`input-conversa-titulo-${c.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => salvarTitulo(c.id)}
                          data-testid={`button-conversa-salvar-${c.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditandoId(null)}
                          data-testid={`button-conversa-cancelar-${c.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onAbrir(c.id)}
                          className="flex-1 text-left min-w-0 hover-elevate rounded-sm py-0.5 px-1 -mx-1"
                          data-testid={`button-conversa-abrir-${c.id}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {c.titulo || "Sem título"}
                            </span>
                            {sessionAtiva && (
                              <span className="text-[10px] text-violet-600">• atual</span>
                            )}
                          </div>
                          {c.previaUltimaMensagem && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {c.previaUltimaMensagem}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{dataRelativa(c.ultimaInteracaoEm)}</span>
                            <span>·</span>
                            <span>{c.totalMensagens} mensagens</span>
                          </div>
                        </button>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditandoId(c.id);
                              setEditandoTitulo(c.titulo);
                            }}
                            title="Renomear"
                            data-testid={`button-conversa-renomear-${c.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setExcluindoId(c.id)}
                            title="Excluir"
                            data-testid={`button-conversa-excluir-${c.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <AlertDialog open={!!excluindoId} onOpenChange={(o) => !o && setExcluindoId(null)}>
        <AlertDialogContent data-testid="dialog-excluir-conversa">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as mensagens desta conversa serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-excluir-cancelar">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => excluindoId && excluir(excluindoId)}
              data-testid="button-excluir-confirmar"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Send,
  User,
  Loader2,
  ArrowRight,
  Plus,
  Pencil,
  Clock,
  MessageSquarePlus,
  ArrowDownToLine,
  Square,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { BizzyAvatar } from "@/components/BizzyAvatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Alerta } from "@/hooks/useAssistantStatus";
import { AssistantMarkdown } from "@/components/AssistantMarkdown";
import { dismissBriefingForToday } from "@/lib/briefingDismiss";
import { PropostaCard, type Proposta, type ContinuacaoPlano } from "@/components/PropostaCard";
import { PlanoAgenticoCard, type PlanoAgenticoView, type PlanoAgenticoPassoView } from "@/components/PlanoAgenticoCard";
import { useQuery } from "@tanstack/react-query";

export interface AssistantAcao {
  label: string;
  tipo: "criar" | "editar" | "abrir" | "dispensar";
  rota?: string;
  icon?: string;
  params?: Record<string, string>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  acoes?: AssistantAcao[];
  propostas?: Proposta[];
  interrompido?: boolean;
}

interface AssistantChatProps {
  alertas: Alerta[];
  initialContext?: string;
  proactiveMessage?: { content: string; acoes?: AssistantAcao[]; propostas?: Proposta[] } | null;
  onProactiveConsumed?: () => void;
  onContextUsed?: () => void;
  onCloseDrawer?: () => void;
  // Task #313 — id de conversa pedida pela aba Histórico para "abrir".
  loadConversaId?: string | null;
  onConversaLoaded?: () => void;
}

interface AssistanteResponse {
  resposta: string;
  acoes?: AssistantAcao[];
  propostas?: Proposta[];
  planoAtivo?: { plano: PlanoAgenticoView; passos: PlanoAgenticoPassoView[] } | null;
  conversaId?: string;
}

interface ConversaMensagensResponse {
  conversa: { id: string; titulo: string } | null;
  mensagens: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    propostas?: Proposta[] | null;
  }>;
}

const SESSION_KEY = "bizzy:conversaId";

function buildHrefFromAcao(acao: AssistantAcao): string {
  if (!acao.rota) return "";
  const params = new URLSearchParams();
  if (acao.tipo === "criar") {
    params.set("novo", "1");
  } else if (acao.tipo === "editar" && acao.params?.id) {
    params.set("editar", acao.params.id);
  }
  if (acao.params) {
    for (const [k, v] of Object.entries(acao.params)) {
      if (k === "id" && acao.tipo === "editar") continue;
      params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `${acao.rota}?${qs}` : acao.rota;
}

function ActionIcon({ tipo }: { tipo: AssistantAcao["tipo"] }) {
  if (tipo === "criar") return <Plus className="h-3.5 w-3.5" />;
  if (tipo === "editar") return <Pencil className="h-3.5 w-3.5" />;
  if (tipo === "dispensar") return <Clock className="h-3.5 w-3.5" />;
  return <ArrowRight className="h-3.5 w-3.5" />;
}

function MessageBubble({
  msg,
  onAcaoClick,
  onContinuacao,
  streaming,
  statusLabel,
}: {
  msg: Message;
  onAcaoClick: (acao: AssistantAcao) => void;
  onContinuacao?: (cont: ContinuacaoPlano) => void;
  streaming?: boolean;
  statusLabel?: string | null;
}) {
  const { toast } = useToast();
  const [copiado, setCopiado] = useState(false);
  const isUser = msg.role === "user";
  const showStatusChip = !!streaming && !isUser && msg.content === "" && !!statusLabel;
  const showCursor = !!streaming && !isUser && msg.content !== "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiado(true);
      toast({ title: "Mensagem copiada" });
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  return (
    <div className={cn("group flex gap-2.5 text-sm", isUser ? "flex-row-reverse" : "flex-row")}>
      {isUser ? (
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      ) : (
        <div className="mt-0.5">
          <BizzyAvatar size="sm" mode="assistente" showModeBadge={false} />
        </div>
      )}
      <div className={cn("flex flex-col gap-2 max-w-[82%]", isUser ? "items-end" : "items-start")}>
        {showStatusChip && (
          <div
            className="bg-muted text-muted-foreground rounded-xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5 text-xs"
            data-testid="status-chip-bizzy"
            aria-live="polite"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
            <span>{statusLabel}</span>
          </div>
        )}
        {(msg.content !== "" || !streaming) && (
          <div
            className={cn(
              "rounded-xl px-3.5 py-2.5 leading-relaxed break-words",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap"
                : "bg-muted text-foreground rounded-tl-sm",
            )}
          >
            {isUser ? (
              msg.content
            ) : (
              <>
                <AssistantMarkdown content={msg.content} />
                {showCursor && (
                  <span
                    className="inline-block ml-0.5 w-1.5 h-3.5 align-[-1px] bg-foreground/70 animate-pulse motion-reduce:animate-none"
                    data-testid="cursor-streaming"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </div>
        )}
        {!isUser && msg.content && !streaming && (
          // Visibility:hidden para evitar layout shift no hover (diretrizes).
          <div className="invisible group-hover:visible pl-1 -mt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 gap-1 text-xs text-muted-foreground"
              data-testid="button-copy-message"
              title="Copiar mensagem"
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
        )}
        {!isUser && msg.interrompido && (
          <span className="text-xs text-muted-foreground pl-1" data-testid="text-interrompido">
            Interrompido por você
          </span>
        )}
        {!isUser && msg.propostas && msg.propostas.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            {msg.propostas.map((p) => (
              <PropostaCard key={p.logId} proposta={p} onContinuacao={onContinuacao} />
            ))}
          </div>
        )}
        {!isUser && msg.acoes && msg.acoes.filter((a) => a.tipo !== "dispensar").length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {msg.acoes.filter((a) => a.tipo !== "dispensar").slice(0, 3).map((acao, idx) => (
              <Button
                key={`${acao.rota}-${idx}`}
                size="sm"
                variant="outline"
                onClick={() => onAcaoClick(acao)}
                data-testid={`button-assistant-acao-${acao.tipo}-${idx}`}
                className="gap-1.5 text-xs"
              >
                <ActionIcon tipo={acao.tipo} />
                {acao.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PROMPTS_SUGERIDOS = [
  "Resumir meu plano estratégico atual",
  "Quais resultados-chave estão em risco?",
  "Sugerir próximas iniciativas",
  "Fazer diagnóstico estratégico rápido",
];

function ThinkingIndicator() {
  return (
    <div className="flex gap-2.5 text-sm" data-testid="indicator-thinking">
      <div className="mt-0.5">
        <BizzyAvatar size="sm" mode="assistente" showModeBadge={false} />
      </div>
      <div className="bg-muted text-muted-foreground rounded-xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1">
        <span className="text-xs mr-1">Bizzy está pensando</span>
        <span className="inline-flex gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce motion-reduce:animate-none [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce motion-reduce:animate-none [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce motion-reduce:animate-none" />
        </span>
      </div>
    </div>
  );
}

export function AssistantChat({
  alertas: _alertas,
  initialContext,
  proactiveMessage,
  onProactiveConsumed,
  onContextUsed,
  onCloseDrawer,
  loadConversaId,
  onConversaLoaded,
}: AssistantChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [conversaTitulo, setConversaTitulo] = useState<string>("");
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloRascunho, setTituloRascunho] = useState("");
  const [encerrando, setEncerrando] = useState(false);
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);
  const proactiveAppliedRef = useRef(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const planoAtivoQuery = useQuery<{ plano: (PlanoAgenticoView & { passos: PlanoAgenticoPassoView[] }) | null }>({
    queryKey: ["/api/ai/planos/ativo"],
    refetchInterval: 30000,
  });
  const planoAtivo = planoAtivoQuery.data?.plano ?? null;

  // Scroll automático suave; se o usuário rolou para cima, não força.
  const scrollToBottom = useCallback(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Detecta se o usuário está perto do fim para decidir auto-scroll.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
      setAutoScroll(dist < 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Carrega uma conversa específica do servidor (usado pela inicialização
  // via sessionStorage e pela ação "Abrir" da aba Histórico).
  const carregarConversa = useCallback(async (id: string): Promise<boolean> => {
    try {
      const json = (await apiRequest("GET", `/api/ai/conversas/${id}/mensagens`)) as ConversaMensagensResponse;
      if (!json.conversa) return false;
      setConversaId(json.conversa.id);
      setConversaTitulo(json.conversa.titulo);
      setMessages(
        json.mensagens.map((m) => ({
          role: m.role,
          content: m.content,
          propostas: m.propostas ?? undefined,
        })),
      );
      try {
        sessionStorage.setItem(SESSION_KEY, json.conversa.id);
      } catch {}
      return true;
    } catch {
      return false;
    }
  }, []);

  // Task #313 — Sessão limpa por login: lê apenas sessionStorage. Se houver,
  // hidrata; senão mostra tela de boas-vindas vazia.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let cancelado = false;
    (async () => {
      let id: string | null = null;
      try {
        id = sessionStorage.getItem(SESSION_KEY);
      } catch {}
      if (id) {
        const ok = await carregarConversa(id);
        if (cancelado) return;
        if (!ok) {
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch {}
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [carregarConversa]);

  // Reage a pedidos da aba Histórico para abrir uma conversa específica.
  useEffect(() => {
    if (!loadConversaId) return;
    (async () => {
      const ok = await carregarConversa(loadConversaId);
      if (ok) onConversaLoaded?.();
    })();
  }, [loadConversaId, carregarConversa, onConversaLoaded]);

  // Limpa o estado se outra aba/comp removeu a conversa atual.
  useEffect(() => {
    const onRemovida = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id && detail.id === conversaId) {
        setConversaId(null);
        setConversaTitulo("");
        setMessages([]);
      }
    };
    window.addEventListener("biz-assistant:conversa-removida", onRemovida as EventListener);
    return () =>
      window.removeEventListener("biz-assistant:conversa-removida", onRemovida as EventListener);
  }, [conversaId]);

  useEffect(() => {
    if (!proactiveMessage || proactiveAppliedRef.current) return;
    proactiveAppliedRef.current = true;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: proactiveMessage.content,
        acoes: proactiveMessage.acoes,
        propostas: proactiveMessage.propostas,
      },
    ]);
    onProactiveConsumed?.();
  }, [proactiveMessage, onProactiveConsumed]);

  useEffect(() => {
    if (initialContext) {
      const contextMsg = `Com base nesta análise:\n${initialContext}\n\nO que devo fazer para melhorar esses pontos?`;
      sendMessage(contextMsg);
      onContextUsed?.();
    }
  }, [initialContext]);

  useEffect(() => {
    const onSeed = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string }>).detail;
      const text = detail?.text;
      if (typeof text === "string" && text.trim()) sendMessage(text);
    };
    window.addEventListener("biz-assistant:send", onSeed as EventListener);
    return () => window.removeEventListener("biz-assistant:send", onSeed as EventListener);
  }, []);

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setIsLoading(true);
    setStatusLabel(null);
    setAutoScroll(true);

    const newUserMsg: Message = { role: "user", content: trimmed };
    const placeholder: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, newUserMsg, placeholder]);
    setInput("");

    const idxBalao = messages.length + 1;
    setStreamingIndex(idxBalao);

    const historico = [...messages, newUserMsg]
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let lastFinalArrived = false;
    let conversaIdLocal = conversaId;
    try {
      const resp = await fetch("/api/ai/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        credentials: "include",
        body: JSON.stringify({ pergunta: trimmed, historico, conversaId }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) {
        throw new Error(`Falha HTTP ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (event: string, dataRaw: string) => {
        let data: unknown = null;
        try {
          data = JSON.parse(dataRaw);
        } catch {
          /* ignore */
        }
        if (event === "meta") {
          const m = data as { conversaId?: string };
          if (m?.conversaId) {
            setConversaId(m.conversaId);
            conversaIdLocal = m.conversaId;
            try {
              sessionStorage.setItem(SESSION_KEY, m.conversaId);
            } catch {}
          }
        } else if (event === "status") {
          const s = data as { label?: string };
          if (s?.label) setStatusLabel(s.label);
        } else if (event === "delta") {
          const d = data as { text?: string };
          if (d?.text) {
            setMessages((prev) => {
              const next = [...prev];
              const cur = next[idxBalao];
              if (cur && cur.role === "assistant") {
                next[idxBalao] = { ...cur, content: cur.content + d.text };
              }
              return next;
            });
          }
        } else if (event === "final") {
          lastFinalArrived = true;
          const f = data as AssistanteResponse;
          if (f?.conversaId) {
            setConversaId(f.conversaId);
            conversaIdLocal = f.conversaId;
            try {
              sessionStorage.setItem(SESSION_KEY, f.conversaId);
            } catch {}
          }
          setMessages((prev) => {
            const next = [...prev];
            const cur = next[idxBalao];
            if (cur && cur.role === "assistant") {
              next[idxBalao] = {
                ...cur,
                content: f.resposta || cur.content,
                acoes: f.acoes,
                propostas: f.propostas,
              };
            }
            return next;
          });
          planoAtivoQuery.refetch();
          // Atualiza lista de conversas (nova conversa pode ter sido criada).
          queryClient.invalidateQueries({ queryKey: ["/api/ai/conversas"] });
        } else if (event === "error") {
          const e = data as { message?: string };
          setMessages((prev) => {
            const next = [...prev];
            const cur = next[idxBalao];
            if (cur && cur.role === "assistant") {
              next[idxBalao] = {
                ...cur,
                content:
                  cur.content ||
                  `Desculpe, ocorreu um erro ao processar sua pergunta${
                    e?.message ? `: ${e.message}` : ""
                  }. Tente novamente.`,
              };
            }
            return next;
          });
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sepIdx: number;
        while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          let evName = "message";
          const dataLines: string[] = [];
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event:")) evName = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
          }
          if (dataLines.length > 0) handleEvent(evName, dataLines.join("\n"));
        }
      }
      // Se o título ainda está vazio e a conversa foi criada, pega da
      // primeira mensagem do usuário (igual ao backend faz).
      if (conversaIdLocal && !conversaTitulo) {
        setConversaTitulo(trimmed.slice(0, 80));
      }
    } catch (err) {
      const isAbort = (err as { name?: string })?.name === "AbortError";
      if (isAbort) {
        setMessages((prev) => {
          const next = [...prev];
          const cur = next[idxBalao];
          if (cur && cur.role === "assistant") {
            next[idxBalao] = {
              ...cur,
              content: cur.content || "Resposta interrompida.",
              interrompido: true,
            };
          }
          return next;
        });
      } else if (!lastFinalArrived) {
        setMessages((prev) => {
          const next = [...prev];
          const cur = next[idxBalao];
          if (cur && cur.role === "assistant") {
            next[idxBalao] = {
              ...cur,
              content:
                cur.content ||
                "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.",
            };
          }
          return next;
        });
      }
    } finally {
      abortRef.current = null;
      setIsLoading(false);
      setStreamingIndex(null);
      setStatusLabel(null);
    }
  };

  const handleContinuacao = (cont: ContinuacaoPlano) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: cont.mensagem || (cont.finalizado ? "Plano concluído." : "Próximo passo proposto."),
        propostas: cont.proximasPropostas,
      },
    ]);
    planoAtivoQuery.refetch();
  };

  const handleAcaoClick = (acao: AssistantAcao) => {
    if (acao.tipo === "dispensar") {
      dismissBriefingForToday();
      onCloseDrawer?.();
      return;
    }
    const href = buildHrefFromAcao(acao);
    if (!href) return;
    navigate(href);
    onCloseDrawer?.();
  };

  const iniciarNovaConversa = useCallback(async () => {
    if (encerrando) return;
    setEncerrando(true);
    try {
      if (conversaId) {
        try {
          await apiRequest("POST", "/api/ai/conversas/encerrar", { conversaId });
        } catch {}
      }
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
      setConversaId(null);
      setConversaTitulo("");
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversas"] });
      // Foco no textarea para começar a digitar imediatamente.
      setTimeout(() => textareaRef.current?.focus(), 50);
    } finally {
      setEncerrando(false);
    }
  }, [encerrando, conversaId]);

  // Atalhos de teclado: Esc fecha drawer, Ctrl/⌘+Shift+O = nova conversa.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        !!target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT");
      if (e.key === "Escape" && !inField) {
        onCloseDrawer?.();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "O" || e.key === "o")) {
        e.preventDefault();
        iniciarNovaConversa();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iniciarNovaConversa, onCloseDrawer]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const salvarTitulo = async () => {
    const novo = tituloRascunho.trim();
    setEditandoTitulo(false);
    if (!conversaId || !novo || novo === conversaTitulo) return;
    const anterior = conversaTitulo;
    setConversaTitulo(novo);
    try {
      await apiRequest("PATCH", `/api/ai/conversas/${conversaId}`, { titulo: novo });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversas"] });
    } catch (err) {
      setConversaTitulo(anterior);
      toast({
        title: "Erro ao renomear",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const telaVazia = messages.length === 0 && !conversaId && !isLoading;
  // Indicador "pensando" só quando aguardando primeiro delta (placeholder vazio).
  const aguardandoPrimeiroDelta =
    isLoading &&
    streamingIndex !== null &&
    messages[streamingIndex]?.role === "assistant" &&
    messages[streamingIndex]?.content === "" &&
    !statusLabel;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-1 px-3 pt-2 min-w-0">
        {conversaId && (
          <div className="flex-1 min-w-0 mr-1">
            {editandoTitulo ? (
              <Input
                value={tituloRascunho}
                onChange={(e) => setTituloRascunho(e.target.value)}
                onBlur={salvarTitulo}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    salvarTitulo();
                  }
                  if (e.key === "Escape") setEditandoTitulo(false);
                }}
                autoFocus
                className="h-8 text-sm"
                data-testid="input-conversa-titulo-atual"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTituloRascunho(conversaTitulo || "");
                  setEditandoTitulo(true);
                }}
                className="text-sm font-medium truncate w-full text-left hover-elevate rounded-sm px-2 py-1"
                title="Clique para renomear"
                data-testid="button-editar-titulo-atual"
              >
                {conversaTitulo || "Conversa sem título"}
              </button>
            )}
          </div>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const container = scrollContainerRef.current;
            if (!container) return;
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
          }}
          disabled={isLoading || messages.filter((m) => m.role === "assistant").length === 0}
          className="gap-1.5 text-xs"
          data-testid="button-ultima-mensagem"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Última mensagem
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={iniciarNovaConversa}
          disabled={encerrando || isLoading}
          className="gap-1.5 text-xs"
          data-testid="button-nova-conversa"
          title="Nova conversa (Ctrl/⌘+Shift+O)"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Nova conversa
        </Button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        {planoAtivo && (
          <PlanoAgenticoCard
            plano={planoAtivo}
            passos={planoAtivo.passos}
            compacto
            onCancelado={() => planoAtivoQuery.refetch()}
            onContinuacao={handleContinuacao}
          />
        )}

        {telaVazia ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4 min-h-[60%]" data-testid="tela-boas-vindas">
            <BizzyAvatar size="lg" mode="assistente" showModeBadge={false} />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold" data-testid="text-boas-vindas">
                Como posso te ajudar hoje{user?.nome ? `, ${user.nome.split(" ")[0]}` : ""}?
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm">
                Eu sou o Bizzy, seu agente estratégico. Posso analisar dados da empresa, propor iniciativas e revisar OKRs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md pt-2">
              {PROMPTS_SUGERIDOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendMessage(p)}
                  className="text-left text-xs rounded-md border p-2.5 hover-elevate active-elevate-2"
                  data-testid={`button-prompt-sugerido-${p.slice(0, 20)}`}
                >
                  <div className="flex items-start gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" />
                    <span className="text-foreground">{p}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                data-message-role={msg.role}
                data-message-index={i}
                data-testid={`message-${msg.role}-${i}`}
              >
                <MessageBubble
                  msg={msg}
                  onAcaoClick={handleAcaoClick}
                  onContinuacao={handleContinuacao}
                  streaming={i === streamingIndex && isLoading}
                  statusLabel={i === streamingIndex ? statusLabel : null}
                />
              </div>
            ))}
            {aguardandoPrimeiroDelta && <ThinkingIndicator />}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 pb-3 pt-2 border-t flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          placeholder="Pergunte sobre sua empresa..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[44px] max-h-[120px] resize-none text-sm"
          rows={1}
          data-testid="textarea-ai-input"
        />
        {isLoading ? (
          <Button
            size="icon"
            variant="outline"
            onClick={stopStreaming}
            data-testid="button-ai-stop"
            aria-label="Parar resposta"
            title="Parar resposta"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            data-testid="button-ai-submit"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

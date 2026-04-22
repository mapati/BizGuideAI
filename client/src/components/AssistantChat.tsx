import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, Loader2, ArrowRight, Plus, Pencil, Clock, MessageSquarePlus, ArrowDownToLine, Square } from "lucide-react";
import { BizzyAvatar } from "@/components/BizzyAvatar";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
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
  // Task #284 — quando true, este balão foi interrompido pelo usuário no meio
  // do streaming (botão Parar). Mostra rótulo discreto abaixo do texto.
  interrompido?: boolean;
}

interface AssistantChatProps {
  alertas: Alerta[];
  initialContext?: string;
  proactiveMessage?: { content: string; acoes?: AssistantAcao[]; propostas?: Proposta[] } | null;
  onProactiveConsumed?: () => void;
  onContextUsed?: () => void;
  onCloseDrawer?: () => void;
}

interface AssistanteResponse {
  resposta: string;
  acoes?: AssistantAcao[];
  propostas?: Proposta[];
  planoAtivo?: { plano: PlanoAgenticoView; passos: PlanoAgenticoPassoView[] } | null;
  conversaId?: string;
}

// Task #221 — payload da hidratação da conversa ativa.
interface ConversaAtivaResponse {
  conversa: { id: string; titulo: string } | null;
  mensagens: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    propostas?: Proposta[] | null;
  }>;
}

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
  // Task #284 — quando true este é o balão atual recebendo deltas SSE.
  // Mostra cursor ▍ ao final do texto e (se ainda sem texto) o chip de status.
  streaming?: boolean;
  statusLabel?: string | null;
}) {
  const isUser = msg.role === "user";
  const showStatusChip = !!streaming && !isUser && msg.content === "" && !!statusLabel;
  const showCursor = !!streaming && !isUser && msg.content !== "";
  return (
    <div className={cn("flex gap-2.5 text-sm", isUser ? "flex-row-reverse" : "flex-row")}>
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
                : "bg-muted text-foreground rounded-tl-sm"
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

function buildSuggestedQuestions(alertas: Alerta[]): string[] {
  const questions: string[] = [];

  for (const alerta of alertas) {
    if (alerta.tipo === "indicador") {
      questions.push("Quais indicadores estão no vermelho e o que fazer?");
    } else if (alerta.tipo === "iniciativa") {
      questions.push("Como recuperar as iniciativas com prazo vencido?");
    } else if (alerta.tipo === "okr") {
      questions.push("Por que meus OKRs estão com progresso baixo?");
    }
  }

  const defaults = [
    "Como estão meus OKRs hoje?",
    "Qual é o ponto mais fraco da minha empresa?",
    "Quais são as prioridades estratégicas agora?",
    "Onde devo focar meus esforços esta semana?",
  ];

  const combined = Array.from(new Set([...questions, ...defaults]));
  return combined.slice(0, 4);
}

export function AssistantChat({
  alertas,
  initialContext,
  proactiveMessage,
  onProactiveConsumed,
  onContextUsed,
  onCloseDrawer,
}: AssistantChatProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  // Task #284 — streaming SSE: índice do balão atual (último assistant) e
  // último rótulo de status recebido. Quando deltas começam a chegar o chip
  // some e cede lugar ao texto + cursor.
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const proactiveAppliedRef = useRef(false);

  // Task #189 — Plano agêntico ativo (renderiza no topo do chat).
  const planoAtivoQuery = useQuery<{ plano: (PlanoAgenticoView & { passos: PlanoAgenticoPassoView[] }) | null }>({
    queryKey: ["/api/ai/planos/ativo"],
    refetchInterval: 30000,
  });
  const planoAtivo = planoAtivoQuery.data?.plano ?? null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Task #221 — hidrata a conversa ativa do servidor (<12h) e cai para a
  // mensagem de boas-vindas só se não houver conversa.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let cancelado = false;
    (async () => {
      try {
        const json = (await apiRequest("GET", "/api/ai/conversas/ativa")) as ConversaAtivaResponse;
        if (cancelado) return;
        if (json.conversa && json.mensagens.length > 0) {
          setConversaId(json.conversa.id);
          setMessages(
            json.mensagens.map((m) => ({
              role: m.role,
              content: m.content,
              propostas: m.propostas ?? undefined,
            })),
          );
          return;
        }
      } catch {
        // se falhar, segue para boas-vindas
      }
      if (cancelado) return;
      setMessages([
        {
          role: "assistant",
          content: `Olá${user?.nome ? `, ${user.nome.split(" ")[0]}` : ""}! Eu sou o Bizzy, seu agente estratégico. Tenho acesso a todos os dados da sua empresa — perfil, cenário externo, OKRs, indicadores, iniciativas e mais. Como posso ajudar?`,
        },
      ]);
    })();
    return () => { cancelado = true; };
  }, []);

  // Apply proactive briefing once
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

  // Task #284 — botão Parar: aborta o fetch streaming em andamento. O cleanup
  // do balão (marcar interrompido, encerrar loading) é feito no catch do
  // sendMessage quando o AbortError é detectado.
  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    // Setamos isLoading antes de qualquer outra coisa para fechar a janela
    // de race em cliques rápidos consecutivos.
    setIsLoading(true);
    setStatusLabel(null);

    // Acrescenta a mensagem do usuário e um placeholder vazio do assistente
    // que será preenchido pelos `delta` SSE.
    const newUserMsg: Message = { role: "user", content: trimmed };
    const placeholder: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, newUserMsg, placeholder]);
    setInput("");

    // O índice é definido após o setMessages aplicar — usamos o tamanho
    // anterior para calcular sem depender do callback.
    const idxBalao = messages.length + 1;
    setStreamingIndex(idxBalao);

    const historico = [...messages, newUserMsg]
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let lastFinalArrived = false;
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
        try { data = JSON.parse(dataRaw); } catch { /* ignore */ }
        if (event === "meta") {
          const m = data as { conversaId?: string };
          if (m?.conversaId) setConversaId(m.conversaId);
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
          if (f?.conversaId) setConversaId(f.conversaId);
          setMessages((prev) => {
            const next = [...prev];
            const cur = next[idxBalao];
            if (cur && cur.role === "assistant") {
              next[idxBalao] = {
                ...cur,
                // Usamos o texto final autoritativo do servidor (cobre o
                // fallback "Preparei algumas ações…" quando o modelo só
                // chamou tools sem narrar).
                content: f.resposta || cur.content,
                acoes: f.acoes,
                propostas: f.propostas,
              };
            }
            return next;
          });
          planoAtivoQuery.refetch();
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

      // Parser SSE: divide por delimitador "\n\n", cada evento é um conjunto
      // de linhas "event: …" + "data: …".
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
    } catch (err) {
      const isAbort = (err as { name?: string })?.name === "AbortError";
      if (isAbort) {
        // Marca o balão como interrompido (preserva o texto parcial recebido).
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

  // Task #221 — encerra a conversa atual e reseta o chat para novo início.
  const iniciarNovaConversa = async () => {
    if (encerrando) return;
    setEncerrando(true);
    try {
      if (conversaId) {
        try {
          await apiRequest("POST", "/api/ai/conversas/encerrar", { conversaId });
        } catch {}
      }
      setConversaId(null);
      setMessages([
        {
          role: "assistant",
          content: `Nova conversa iniciada. Como posso ajudar?`,
        },
      ]);
    } finally {
      setEncerrando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const suggestedQuestions = buildSuggestedQuestions(alertas);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-end gap-1 px-3 pt-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const container = messagesEndRef.current?.parentElement;
            if (!container) return;
            const bubbles = container.querySelectorAll<HTMLElement>(
              '[data-message-role="assistant"]',
            );
            const ultimo = bubbles[bubbles.length - 1];
            if (ultimo) {
              ultimo.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          disabled={isLoading || messages.filter((m) => m.role === "assistant").length === 0}
          className="gap-1.5 text-xs text-muted-foreground"
          data-testid="button-ultima-mensagem"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Última mensagem
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={iniciarNovaConversa}
          disabled={encerrando || isLoading}
          className="gap-1.5 text-xs text-muted-foreground"
          data-testid="button-nova-conversa"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Nova conversa
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {planoAtivo && (
          <PlanoAgenticoCard
            plano={planoAtivo}
            passos={planoAtivo.passos}
            compacto
            onCancelado={() => planoAtivoQuery.refetch()}
            onContinuacao={handleContinuacao}
          />
        )}
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

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && !isLoading && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs border rounded-full px-2.5 py-1 text-muted-foreground hover-elevate"
              data-testid={`button-suggested-${q.slice(0, 20)}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 pb-3 pt-2 border-t flex gap-2 items-end">
        <Textarea
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

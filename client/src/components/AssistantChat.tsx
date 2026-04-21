import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Loader2, ArrowRight, Plus, Pencil, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { Alerta } from "@/hooks/useAssistantStatus";
import { AssistantMarkdown } from "@/components/AssistantMarkdown";
import { dismissBriefingForToday } from "@/lib/briefingDismiss";

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
}

interface AssistantChatProps {
  alertas: Alerta[];
  initialContext?: string;
  proactiveMessage?: { content: string; acoes?: AssistantAcao[] } | null;
  onProactiveConsumed?: () => void;
  onContextUsed?: () => void;
  onCloseDrawer?: () => void;
}

interface AssistanteResponse {
  resposta: string;
  acoes?: AssistantAcao[];
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
}: {
  msg: Message;
  onAcaoClick: (acao: AssistantAcao) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2.5 text-sm", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          isUser ? "bg-primary" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary-foreground" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className={cn("flex flex-col gap-2 max-w-[82%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-xl px-3.5 py-2.5 leading-relaxed break-words",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap"
              : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {isUser ? msg.content : <AssistantMarkdown content={msg.content} />}
        </div>
        {!isUser && msg.acoes && msg.acoes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {msg.acoes.slice(0, 3).map((acao, idx) => (
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const proactiveAppliedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setMessages([
        {
          role: "assistant",
          content: `Olá${user?.nome ? `, ${user.nome.split(" ")[0]}` : ""}! Sou o seu Assistente Estratégico. Tenho acesso a todos os dados da sua empresa — perfil, cenário externo, OKRs, indicadores, iniciativas e mais. Como posso ajudar?`,
        },
      ]);
    }
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

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const newUserMsg: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const historico = updatedMessages
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));
      const json = await apiRequest("POST", "/api/ai/assistente", {
        pergunta: trimmed,
        historico,
      });
      const typed = json as AssistanteResponse;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: typed.resposta, acoes: typed.acoes },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const suggestedQuestions = buildSuggestedQuestions(alertas);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} onAcaoClick={handleAcaoClick} />
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Analisando seus dados...</span>
            </div>
          </div>
        )}

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
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          data-testid="button-ai-submit"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

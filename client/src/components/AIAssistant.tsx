import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, Send, Bot, User, Loader2, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Como estão meus OKRs hoje?",
  "Quais indicadores estão em risco?",
  "Quais iniciativas estão atrasadas?",
  "Qual é o ponto mais fraco da minha empresa?",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2.5 text-sm", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-primary" : "bg-muted"
      )}>
        {isUser
          ? <User className="h-3.5 w-3.5 text-primary-foreground" />
          : <Bot className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </div>
      <div className={cn(
        "rounded-xl px-3.5 py-2.5 max-w-[82%] leading-relaxed whitespace-pre-wrap break-words",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm"
      )}>
        {msg.content}
      </div>
    </div>
  );
}

export function AIAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Olá${user?.nome ? `, ${user.nome.split(" ")[0]}` : ""}! Sou o seu Assistente Estratégico. Tenho acesso a todos os dados da sua empresa — perfil, cenário externo, OKRs, indicadores, iniciativas e mais. Como posso ajudar?`,
      }]);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const newUserMsg: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const historico = updatedMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
      const json = await apiRequest("POST", "/api/ai/assistente", {
        pergunta: trimmed,
        historico,
      });
      setMessages(prev => [...prev, { role: "assistant", content: json.resposta }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) {
    return (
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
        data-testid="button-ai-assistant-open"
        title="Assistente Estratégico"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 w-[380px] sm:w-[440px] flex flex-col rounded-xl border bg-background shadow-2xl"
      style={{ height: "560px", zIndex: 9999 }}
      data-testid="component-ai-assistant"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Assistente Estratégico</p>
            <p className="text-xs text-muted-foreground mt-0.5">Baseado nos dados da sua empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            data-testid="button-ai-assistant-close"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIsOpen(false); setMessages([]); }}
            data-testid="button-ai-assistant-x"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
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

      {/* Suggested questions (show only on first open) */}
      {messages.length === 1 && !isLoading && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map(q => (
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

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          placeholder="Pergunte sobre sua empresa..."
          value={input}
          onChange={e => setInput(e.target.value)}
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

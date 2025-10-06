import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, X, MessageCircle, Lightbulb, RefreshCw, CheckCircle2 } from "lucide-react";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("explicar");

  const handleSubmit = () => {
    console.log("AI Assistant:", activeTab, input);
    setInput("");
  };

  if (!isOpen) {
    return (
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg animate-pulse"
        onClick={() => setIsOpen(true)}
        data-testid="button-ai-assistant-open"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[480px] h-[600px] shadow-xl flex flex-col" data-testid="component-ai-assistant">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Assistente Estratégico</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          data-testid="button-ai-assistant-close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
          <TabsTrigger value="explicar" data-testid="tab-explicar">
            <MessageCircle className="h-4 w-4 mr-1" />
            Explicar
          </TabsTrigger>
          <TabsTrigger value="sugerir" data-testid="tab-sugerir">
            <Lightbulb className="h-4 w-4 mr-1" />
            Sugerir
          </TabsTrigger>
          <TabsTrigger value="reescrever" data-testid="tab-reescrever">
            <RefreshCw className="h-4 w-4 mr-1" />
            Reescrever
          </TabsTrigger>
          <TabsTrigger value="revisar" data-testid="tab-revisar">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Revisar
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto p-4">
          <TabsContent value="explicar" className="m-0">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Digite um conceito ou termo estratégico e receba uma explicação clara e objetiva, sem jargões.</p>
              <div className="bg-muted/50 p-3 rounded-md text-xs">
                <strong>Exemplo:</strong> "O que é PESTEL?"
              </div>
            </div>
          </TabsContent>
          <TabsContent value="sugerir" className="m-0">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Descreva sua situação e receba sugestões práticas e contextualizadas para sua estratégia.</p>
              <div className="bg-muted/50 p-3 rounded-md text-xs">
                <strong>Exemplo:</strong> "Quero aumentar a margem bruta"
              </div>
            </div>
          </TabsContent>
          <TabsContent value="reescrever" className="m-0">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Cole um texto e receba uma versão mais objetiva e executiva.</p>
              <div className="bg-muted/50 p-3 rounded-md text-xs">
                <strong>Exemplo:</strong> Cole um objetivo vago para torná-lo mensurável
              </div>
            </div>
          </TabsContent>
          <TabsContent value="revisar" className="m-0">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Cole seu texto e receba feedback sobre clareza e consistência.</p>
              <div className="bg-muted/50 p-3 rounded-md text-xs">
                <strong>Exemplo:</strong> Cole seus OKRs para verificar se estão claros
              </div>
            </div>
          </TabsContent>
        </div>

        <div className="p-4 border-t space-y-2">
          <Textarea
            placeholder={`Digite sua pergunta ou texto...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[80px] resize-none"
            data-testid="textarea-ai-input"
          />
          <Button onClick={handleSubmit} className="w-full" data-testid="button-ai-submit">
            <Sparkles className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      </Tabs>
    </Card>
  );
}

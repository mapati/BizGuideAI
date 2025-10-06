import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SemaphoreBadge } from "@/components/SemaphoreBadge";
import { ExampleCard } from "@/components/ExampleCard";
import { Plus, Sparkles, Target as TargetIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface KeyResult {
  id: string;
  metrica: string;
  valorInicial: number;
  valorAlvo: number;
  valorAtual: number;
  owner: string;
  prazo: string;
}

interface OKR {
  id: string;
  objetivo: string;
  keyResults: KeyResult[];
}

export default function OKRs() {
  const [okrs, setOkrs] = useState<OKR[]>([
    {
      id: "1",
      objetivo: "Melhorar eficiência operacional",
      keyResults: [
        {
          id: "1-1",
          metrica: "Eficiência dos equipamentos",
          valorInicial: 68,
          valorAlvo: 74,
          valorAtual: 72,
          owner: "João Silva",
          prazo: "2025-03-31",
        },
        {
          id: "1-2",
          metrica: "Tempo de troca de ferramentas (min)",
          valorInicial: 45,
          valorAlvo: 31,
          valorAtual: 38,
          owner: "Maria Santos",
          prazo: "2025-03-31",
        },
        {
          id: "1-3",
          metrica: "Perda de material (%)",
          valorInicial: 3.2,
          valorAlvo: 2.0,
          valorAtual: 2.4,
          owner: "Pedro Costa",
          prazo: "2025-03-31",
        },
      ],
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoObjetivo, setNovoObjetivo] = useState("");

  const calcularProgresso = (kr: KeyResult) => {
    const range = kr.valorAlvo - kr.valorInicial;
    const atual = kr.valorAtual - kr.valorInicial;
    return Math.round((atual / range) * 100);
  };

  const getStatus = (progresso: number): "verde" | "amarelo" | "vermelho" => {
    if (progresso >= 70) return "verde";
    if (progresso >= 40) return "amarelo";
    return "vermelho";
  };

  const handleSuggestKRs = () => {
    console.log("Sugerindo resultados-chave com IA para:", novoObjetivo);
  };

  return (
    <div>
      <PageHeader
        title="Objetivos e Resultados-Chave"
        description="Defina objetivos claros e os resultados concretos que você quer atingir. A IA ajuda a transformar seus objetivos em metas mensuráveis."
        tooltip="Esta ferramenta conecta seus objetivos ambiciosos (onde você quer chegar) com resultados concretos e mensuráveis (como você vai saber que chegou lá)."
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-okr">
                <Plus className="h-4 w-4 mr-2" />
                Novo Objetivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Objetivo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="objetivo">O que você quer alcançar?</Label>
                  <Input
                    id="objetivo"
                    placeholder="Ex: Aumentar a rentabilidade do negócio"
                    value={novoObjetivo}
                    onChange={(e) => setNovoObjetivo(e.target.value)}
                    data-testid="input-objetivo"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Escreva de forma simples. A IA vai sugerir resultados mensuráveis.
                  </p>
                </div>
                <Button onClick={handleSuggestKRs} variant="outline" className="w-full" data-testid="button-suggest-krs">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sugerir Resultados Mensuráveis
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <ExampleCard>
        <strong>Objetivo:</strong> Aumentar a rentabilidade do negócio<br />
        <strong>Resultados esperados:</strong> (1) Margem bruta sair de 38% para 42%; (2) Perda de material cair de 3,2% para 2,0%; (3) Contratos com reajuste automático subir de 45% para 70%
      </ExampleCard>

      <div className="space-y-6 mt-6">
        {okrs.map((okr) => (
          <Card key={okr.id} className="p-6" data-testid={`card-okr-${okr.id}`}>
            <div className="flex items-start gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TargetIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1" data-testid={`text-objetivo-${okr.id}`}>{okr.objetivo}</h3>
                <p className="text-sm text-muted-foreground">
                  {okr.keyResults.length} Resultados esperados · 1º Trimestre 2025
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {okr.keyResults.map((kr) => {
                const progresso = calcularProgresso(kr);
                const status = getStatus(progresso);

                return (
                  <div
                    key={kr.id}
                    className="p-4 border rounded-lg space-y-3"
                    data-testid={`card-kr-${kr.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium mb-1">{kr.metrica}</div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-mono">{kr.valorInicial}</span>
                          {" → "}
                          <span className="font-mono font-semibold">{kr.valorAlvo}</span>
                          {" · Atual: "}
                          <span className="font-mono text-foreground font-semibold">{kr.valorAtual}</span>
                        </div>
                      </div>
                      <SemaphoreBadge status={status} />
                    </div>
                    <Progress value={progresso} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Owner: {kr.owner}</span>
                      <span>Prazo: {new Date(kr.prazo).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

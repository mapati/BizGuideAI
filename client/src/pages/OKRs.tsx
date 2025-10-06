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
          metrica: "OEE",
          valorInicial: 68,
          valorAlvo: 74,
          valorAtual: 72,
          owner: "João Silva",
          prazo: "2025-03-31",
        },
        {
          id: "1-2",
          metrica: "Tempo de Setup (min)",
          valorInicial: 45,
          valorAlvo: 31,
          valorAtual: 38,
          owner: "Maria Santos",
          prazo: "2025-03-31",
        },
        {
          id: "1-3",
          metrica: "Scrap (%)",
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
    console.log("Sugerindo KRs com IA para:", novoObjetivo);
  };

  return (
    <div>
      <PageHeader
        title="OKR Studio"
        description="Defina objetivos claros e resultados-chave mensuráveis. A IA ajuda a traduzir seus objetivos em métricas específicas."
        tooltip="OKR significa Objectives and Key Results. É uma metodologia que conecta objetivos ambiciosos a resultados concretos e mensuráveis."
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-okr">
                <Plus className="h-4 w-4 mr-2" />
                Novo OKR
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo OKR</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="objetivo">Objetivo (O)</Label>
                  <Input
                    id="objetivo"
                    placeholder="Ex: Aumentar rentabilidade do negócio"
                    value={novoObjetivo}
                    onChange={(e) => setNovoObjetivo(e.target.value)}
                    data-testid="input-objetivo"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Escreva em linguagem natural. A IA sugerirá Key Results.
                  </p>
                </div>
                <Button onClick={handleSuggestKRs} variant="outline" className="w-full" data-testid="button-suggest-krs">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sugerir Key Results
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <ExampleCard>
        <strong>O:</strong> Elevar rentabilidade do negócio<br />
        <strong>KRs:</strong> (1) Margem bruta 38%→42%; (2) Scrap 3,2%→2,0%; (3) % contratos indexados 45%→70%
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
                  {okr.keyResults.length} Key Results · Q1 2025
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

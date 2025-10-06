import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImpactBadge } from "@/components/ImpactBadge";
import { ExampleCard } from "@/components/ExampleCard";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Sparkles, Compass } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FatorPESTEL {
  id: string;
  tipo: string;
  descricao: string;
  impacto: "alto" | "médio" | "baixo";
  evidencia: string;
}

export default function Pestel() {
  const [fatores, setFatores] = useState<FatorPESTEL[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoFator, setNovoFator] = useState({
    tipo: "",
    descricao: "",
    impacto: "médio" as const,
    evidencia: "",
  });

  const tipos = [
    { value: "politico", label: "Político" },
    { value: "economico", label: "Econômico" },
    { value: "social", label: "Social" },
    { value: "tecnologico", label: "Tecnológico" },
    { value: "ambiental", label: "Ambiental" },
    { value: "legal", label: "Legal" },
  ];

  const handleAddFator = () => {
    const fator: FatorPESTEL = {
      id: Date.now().toString(),
      ...novoFator,
    };
    setFatores([...fatores, fator]);
    setNovoFator({ tipo: "", descricao: "", impacto: "médio", evidencia: "" });
    setIsDialogOpen(false);
  };

  const handleSuggest = () => {
    console.log("Gerando sugestões PESTEL com IA...");
  };

  return (
    <div>
      <PageHeader
        title="Análise PESTEL"
        description="Identifique os principais fatores externos que impactam seu negócio: Políticos, Econômicos, Sociais, Tecnológicos, Ambientais e Legais."
        tooltip="PESTEL é uma ferramenta que ajuda você a mapear o ambiente externo da sua empresa e antecipar mudanças importantes."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSuggest} data-testid="button-suggest-pestel">
              <Sparkles className="h-4 w-4 mr-2" />
              Sugerir Fatores
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-fator">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Fator
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Fator PESTEL</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="tipo">Tipo de Fator</Label>
                    <Select value={novoFator.tipo} onValueChange={(value) => setNovoFator({ ...novoFator, tipo: value })}>
                      <SelectTrigger data-testid="select-tipo-fator">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição do Fator</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Ex: Novas regulamentações ambientais para emissões"
                      value={novoFator.descricao}
                      onChange={(e) => setNovoFator({ ...novoFator, descricao: e.target.value })}
                      data-testid="textarea-descricao-fator"
                    />
                  </div>

                  <div>
                    <Label htmlFor="impacto">Impacto no Negócio</Label>
                    <Select value={novoFator.impacto} onValueChange={(value: any) => setNovoFator({ ...novoFator, impacto: value })}>
                      <SelectTrigger data-testid="select-impacto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alto">Alto</SelectItem>
                        <SelectItem value="médio">Médio</SelectItem>
                        <SelectItem value="baixo">Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="evidencia">Evidência/Justificativa</Label>
                    <Textarea
                      id="evidencia"
                      placeholder="Por que este fator é importante? Que dados ou fatos suportam?"
                      value={novoFator.evidencia}
                      onChange={(e) => setNovoFator({ ...novoFator, evidencia: e.target.value })}
                      data-testid="textarea-evidencia"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddFator} data-testid="button-save-fator">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <ExampleCard>
        <strong>Econômico:</strong> Alta do dólar pressiona custos de matéria-prima importada. Nossa margem pode cair 3-5% se não repassarmos aos clientes. <strong>Impacto: Alto</strong>
      </ExampleCard>

      {fatores.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<Compass className="h-16 w-16" />}
            title="Nenhum fator identificado ainda"
            description="Adicione fatores externos que impactam seu negócio ou use a IA para gerar sugestões baseadas no perfil da sua empresa."
            actionLabel="Adicionar Primeiro Fator"
            onAction={() => setIsDialogOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {fatores.map((fator) => (
            <Card key={fator.id} className="p-6 hover-elevate" data-testid={`card-fator-${fator.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-sm font-semibold text-primary uppercase tracking-wide">
                  {tipos.find((t) => t.value === fator.tipo)?.label}
                </div>
                <ImpactBadge impact={fator.impacto} />
              </div>
              <p className="text-sm mb-3">{fator.descricao}</p>
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
                <strong>Evidência:</strong> {fator.evidencia}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/ProgressBar";
import { ExampleCard } from "@/components/ExampleCard";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    nomeEmpresa: "",
    setor: "",
    oquevende: "",
    quemCompra: "",
    principaisDores: "",
  });

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      console.log("Onboarding completo:", formData);
      setLocation("/pestel");
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Perfil da Empresa"
        description="Conte-nos sobre seu negócio em linguagem simples. Não se preocupe com termos técnicos."
        tooltip="Estas informações ajudarão a personalizar todas as análises e sugestões ao longo da jornada."
      />

      <div className="mb-8">
        <ProgressBar current={step} total={totalSteps} label="Etapa do perfil" />
      </div>

      <Card className="p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Informações Básicas</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Vamos começar conhecendo sua empresa.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                <Input
                  id="nomeEmpresa"
                  placeholder="Ex: TechParts Indústria"
                  value={formData.nomeEmpresa}
                  onChange={(e) => setFormData({ ...formData, nomeEmpresa: e.target.value })}
                  data-testid="input-nome-empresa"
                />
              </div>

              <div>
                <Label htmlFor="setor">Setor de Atuação</Label>
                <Input
                  id="setor"
                  placeholder="Ex: Indústria de autopeças"
                  value={formData.setor}
                  onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                  data-testid="input-setor"
                />
              </div>
            </div>

            <ExampleCard>
              <strong>TechParts Indústria</strong> · Setor: Indústria de autopeças para linha leve
            </ExampleCard>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Seu Negócio</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Descreva o que você faz de forma simples.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="oquevende">O que você vende ou produz?</Label>
                <Textarea
                  id="oquevende"
                  placeholder="Ex: Peças metálicas usinadas para montadoras automotivas"
                  value={formData.oquevende}
                  onChange={(e) => setFormData({ ...formData, oquevende: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="textarea-o-que-vende"
                />
              </div>

              <div>
                <Label htmlFor="quemCompra">Quem são seus principais clientes?</Label>
                <Textarea
                  id="quemCompra"
                  placeholder="Ex: Montadoras de veículos leves (Tier 1) no Brasil"
                  value={formData.quemCompra}
                  onChange={(e) => setFormData({ ...formData, quemCompra: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="textarea-quem-compra"
                />
              </div>
            </div>

            <ExampleCard>
              Produzimos componentes de suspensão e frenagem para montadoras. Nossos principais clientes são Fiat, GM e Volkswagen.
            </ExampleCard>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Desafios Atuais</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Quais são suas principais dores ou preocupações hoje?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="principaisDores">Principais Desafios</Label>
                <Textarea
                  id="principaisDores"
                  placeholder="Ex: Margem apertada devido ao custo do aço, dificuldade em manter prazos de entrega"
                  value={formData.principaisDores}
                  onChange={(e) => setFormData({ ...formData, principaisDores: e.target.value })}
                  className="min-h-[150px]"
                  data-testid="textarea-principais-dores"
                />
              </div>
            </div>

            <ExampleCard>
              Nossa margem está sendo pressionada pelo aumento do custo de matéria-prima. Além disso, temos problemas recorrentes de setup que impactam nossa capacidade de entrega.
            </ExampleCard>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleNext} data-testid="button-next">
            {step === totalSteps ? "Concluir e Continuar" : "Próximo"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

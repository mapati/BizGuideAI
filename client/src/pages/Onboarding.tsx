import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/ProgressBar";
import { ExampleCard } from "@/components/ExampleCard";
import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Empresa } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    nome: "",
    setor: "",
    tamanho: "",
    descricao: "",
  });

  const { data: empresaExistente } = useQuery<Empresa | null>({
    queryKey: ["/api/empresa"],
  });

  useEffect(() => {
    if (empresaExistente) {
      setFormData({
        nome: empresaExistente.nome || "",
        setor: empresaExistente.setor || "",
        tamanho: empresaExistente.tamanho || "",
        descricao: empresaExistente.descricao || "",
      });
    }
  }, [empresaExistente]);

  const criarEmpresaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/empresa", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresa"] });
      toast({
        title: "Perfil criado com sucesso!",
        description: "Agora vamos começar a análise estratégica.",
      });
      setLocation("/pestel");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const atualizarEmpresaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("PATCH", `/api/empresa/${empresaExistente?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresa"] });
      toast({
        title: "Perfil atualizado com sucesso!",
        description: "As informações da sua empresa foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      if (!formData.nome || !formData.setor || !formData.tamanho) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }
      if (empresaExistente) {
        atualizarEmpresaMutation.mutate(formData);
      } else {
        criarEmpresaMutation.mutate(formData);
      }
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
        title={empresaExistente ? "Editar Perfil da Empresa" : "Perfil da Empresa"}
        description={
          empresaExistente
            ? "Seu perfil já está completo. Você pode revisar e editar as informações abaixo."
            : "Conte-nos sobre seu negócio em linguagem simples. Não se preocupe com termos técnicos."
        }
        tooltip="Estas informações ajudarão a personalizar todas as análises e sugestões ao longo da jornada."
      />

      {empresaExistente ? (
        <div className="mb-8">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="font-semibold text-primary">Perfil Completo</div>
                <div className="text-sm text-muted-foreground">
                  Use as setas de navegação para revisar todas as informações
                </div>
              </div>
              <Badge variant="default" className="bg-primary" data-testid="badge-perfil-completo">
                100%
              </Badge>
            </div>
          </Card>
        </div>
      ) : (
        <div className="mb-8">
          <ProgressBar current={step} total={totalSteps} label="Etapa do perfil" />
        </div>
      )}

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
                <Label htmlFor="nome">Nome da Empresa *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: TechParts Indústria"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  data-testid="input-nome-empresa"
                />
              </div>

              <div>
                <Label htmlFor="setor">Setor de Atuação *</Label>
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
              <h3 className="text-xl font-semibold mb-4">Tamanho da Empresa</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Isso nos ajuda a calibrar as análises e sugestões.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { value: "micro", label: "Microempresa (até 19 funcionários)" },
                { value: "pequena", label: "Pequena empresa (20-99 funcionários)" },
                { value: "media", label: "Média empresa (100-499 funcionários)" },
                { value: "grande", label: "Grande empresa (500+ funcionários)" },
              ].map((opcao) => (
                <Card
                  key={opcao.value}
                  className={`p-4 cursor-pointer hover-elevate ${
                    formData.tamanho === opcao.value ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setFormData({ ...formData, tamanho: opcao.value })}
                  data-testid={`card-tamanho-${opcao.value}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        formData.tamanho === opcao.value
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {formData.tamanho === opcao.value && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-medium">{opcao.label}</span>
                  </div>
                </Card>
              ))}
            </div>

            <ExampleCard>
              Exemplo: Uma fábrica com 180 funcionários seria classificada como <strong>Média empresa</strong>
            </ExampleCard>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Sobre o Negócio</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Descreva brevemente o que sua empresa faz.
              </p>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição do Negócio</Label>
              <Textarea
                id="descricao"
                placeholder="Ex: Fabricamos peças metálicas usinadas de alta precisão para montadoras automotivas. Nossos principais produtos são componentes de motor e transmissão."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="min-h-[150px]"
                data-testid="textarea-descricao"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Dica: Descreva o que você faz, para quem vende e quais são seus principais produtos ou serviços.
              </p>
            </div>

            <ExampleCard>
              <strong>Exemplo:</strong> Somos uma indústria de embalagens plásticas para o setor alimentício. Produzimos desde potes pequenos até tambores industriais. Atendemos desde pequenas empresas locais até grandes redes de supermercados.
            </ExampleCard>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            data-testid="button-voltar"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={handleNext}
            disabled={criarEmpresaMutation.isPending || atualizarEmpresaMutation.isPending}
            data-testid="button-proximo"
          >
            {step === totalSteps ? (empresaExistente ? "Atualizar Perfil" : "Finalizar") : "Próximo"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

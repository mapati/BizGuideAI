import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SemaphoreBadge } from "@/components/SemaphoreBadge";
import { ExampleCard } from "@/components/ExampleCard";
import { Plus, DollarSign, Users, Zap, Target } from "lucide-react";

interface KPI {
  id: string;
  nome: string;
  meta: string;
  atual: string;
  status: "verde" | "amarelo" | "vermelho";
  owner: string;
}

interface Perspectiva {
  nome: string;
  icon: any;
  kpis: KPI[];
}

export default function BSC() {
  const perspectivas: Perspectiva[] = [
    {
      nome: "Finanças",
      icon: DollarSign,
      kpis: [
        { id: "f1", nome: "Margem Bruta", meta: "42%", atual: "41,5%", status: "amarelo", owner: "Diretoria" },
        { id: "f2", nome: "Lucro Operacional", meta: "18%", atual: "19,2%", status: "verde", owner: "Diretoria" },
      ],
    },
    {
      nome: "Clientes",
      icon: Users,
      kpis: [
        { id: "c1", nome: "Entregas no Prazo", meta: "95%", atual: "92%", status: "amarelo", owner: "Comercial" },
        { id: "c2", nome: "Satisfação do Cliente", meta: "70", atual: "68", status: "amarelo", owner: "Comercial" },
        { id: "c3", nome: "Defeitos por Milhão", meta: "<50", atual: "42", status: "verde", owner: "Qualidade" },
      ],
    },
    {
      nome: "Processos",
      icon: Zap,
      kpis: [
        { id: "p1", nome: "Eficiência dos Equipamentos", meta: "75%", atual: "74%", status: "amarelo", owner: "Produção" },
        { id: "p2", nome: "Perda de Material", meta: "2,0%", atual: "2,4%", status: "vermelho", owner: "Produção" },
        { id: "p3", nome: "Tempo de Produção", meta: "12 dias", atual: "11 dias", status: "verde", owner: "Planejamento" },
      ],
    },
    {
      nome: "Pessoas",
      icon: Target,
      kpis: [
        { id: "pe1", nome: "Horas de Treinamento", meta: "40h/ano", atual: "34h", status: "amarelo", owner: "RH" },
        { id: "pe2", nome: "Rotatividade de Pessoal", meta: "<8%", atual: "6,5%", status: "verde", owner: "RH" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Indicadores de Desempenho"
        description="Acompanhe os principais indicadores do seu negócio organizados em 4 áreas: Finanças, Clientes, Processos e Pessoas."
        tooltip="Esta visão equilibrada ajuda você a monitorar não apenas os resultados financeiros, mas também o que está levando a esses resultados: satisfação dos clientes, eficiência dos processos e desenvolvimento da equipe."
        action={
          <Button data-testid="button-add-kpi">
            <Plus className="h-4 w-4 mr-2" />
            Novo Indicador
          </Button>
        }
      />

      <ExampleCard>
        <strong>Finanças:</strong> Margem Bruta 42% (meta) | <strong>Clientes:</strong> Entregas no prazo 95% | <strong>Processos:</strong> Eficiência 75% | <strong>Pessoas:</strong> 40h treinamento/ano
      </ExampleCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {perspectivas.map((perspectiva) => {
          const Icon = perspectiva.icon;
          return (
            <Card key={perspectiva.nome} className="p-6" data-testid={`card-perspectiva-${perspectiva.nome.toLowerCase()}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{perspectiva.nome}</h3>
              </div>

              <div className="space-y-4">
                {perspectiva.kpis.map((kpi) => (
                  <div
                    key={kpi.id}
                    className="p-4 border rounded-lg hover-elevate"
                    data-testid={`card-kpi-${kpi.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{kpi.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          Owner: {kpi.owner}
                        </div>
                      </div>
                      <SemaphoreBadge status={kpi.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Meta: </span>
                        <span className="font-mono font-semibold">{kpi.meta}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Atual: </span>
                        <span className="font-mono font-bold text-foreground">{kpi.atual}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

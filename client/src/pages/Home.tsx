import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Users, DollarSign, Zap, ArrowRight, FileText } from "lucide-react";
import { ExampleCard } from "@/components/ExampleCard";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-home-title">
            Bem-vindo de volta!
          </h1>
          <p className="text-muted-foreground">
            Acompanhe sua estratégia e veja o progresso dos seus objetivos.
          </p>
        </div>
        <Link href="/exportar">
          <Button data-testid="button-export">
            <FileText className="h-4 w-4 mr-2" />
            Exportar Estratégia
          </Button>
        </Link>
      </div>

      <Card className="p-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-primary uppercase tracking-wide">
              Métrica Norte (NSM)
            </div>
            <div className="text-5xl font-bold font-mono" data-testid="text-nsm-value">R$ 142,50</div>
            <div className="text-lg text-muted-foreground">Margem Bruta por Peça</div>
            <div className="flex items-center gap-2 mt-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-green-600 font-semibold">+8,5%</span>
              <span className="text-muted-foreground text-sm">vs. trimestre anterior</span>
            </div>
          </div>
          <Target className="h-16 w-16 text-primary/30" />
        </div>
      </Card>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Principais Drivers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Finanças"
            value="74%"
            trend={5}
            icon={<DollarSign className="h-5 w-5" />}
            description="Eficiência Atual"
          />
          <MetricCard
            title="Clientes"
            value="92%"
            trend={3}
            icon={<Users className="h-5 w-5" />}
            description="Entregas no Prazo"
          />
          <MetricCard
            title="Processos"
            value="2,1%"
            trend={-12}
            icon={<Zap className="h-5 w-5" />}
            description="Perda de Material"
          />
          <MetricCard
            title="Pessoas"
            value="85%"
            trend={7}
            icon={<Target className="h-5 w-5" />}
            description="Treinamentos"
          />
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">O que mudou esta semana?</h3>
            <p className="text-sm text-muted-foreground">Resumo gerado pela IA</p>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <div className="h-2 w-2 rounded-full bg-green-600 mt-2 flex-shrink-0" />
            <div>
              <span className="font-medium">Eficiência atingiu 74%:</span>{" "}
              <span className="text-muted-foreground">
                Superou a meta de 73% pela primeira vez no trimestre. Principal contribuição veio da redução do tempo de troca de ferramentas em 28% nas máquinas A, B e C.
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-2 w-2 rounded-full bg-yellow-600 mt-2 flex-shrink-0" />
            <div>
              <span className="font-medium">Perda de material ainda acima da meta:</span>{" "}
              <span className="text-muted-foreground">
                Apesar da melhoria de 12%, continua em 2,1% (meta: 2,0%). Recomenda-se revisar o plano de ação na próxima reunião mensal.
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-2 w-2 rounded-full bg-green-600 mt-2 flex-shrink-0" />
            <div>
              <span className="font-medium">Entregas no prazo mantêm tendência positiva:</span>{" "}
              <span className="text-muted-foreground">
                92% de entregas no prazo, +3% vs. semana anterior. Cliente Alfa destacou a melhoria em suas últimas reuniões.
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Próximos Passos</h2>
          <Link href="/ritos">
            <Button variant="ghost" data-testid="button-view-all-ritos">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 hover-elevate cursor-pointer" data-testid="card-checkin">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-accent uppercase tracking-wide mb-1">
                  Amanhã · 9h00
                </div>
                <h3 className="text-lg font-semibold">Revisão Semanal de Objetivos</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Atualizar o progresso dos resultados esperados e identificar obstáculos.
            </p>
          </Card>

          <Card className="p-6 hover-elevate cursor-pointer" data-testid="card-reuniao-bsc">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-primary uppercase tracking-wide mb-1">
                  15 Jan · 14h00
                </div>
                <h3 className="text-lg font-semibold">Reunião Mensal de Indicadores</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Revisar todos os indicadores, analisar desvios e definir plano de correção.
            </p>
          </Card>
        </div>
      </div>

      <ExampleCard>
        Este é um exemplo de como a Home pode aparecer com dados reais da sua empresa. Os números e textos serão atualizados automaticamente conforme você preenche as etapas da jornada estratégica.
      </ExampleCard>
    </div>
  );
}

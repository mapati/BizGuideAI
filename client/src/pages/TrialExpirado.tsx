import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Users,
  Zap,
  Building2,
  ArrowRight,
} from "lucide-react";

const WHATSAPP_NUMBER = "5511950377286";
const CONTACT_EMAIL = "atendimento.jundiai@consultingnow.com.br";

function makeWhatsAppUrl(plano: string) {
  const msg = encodeURIComponent(
    `Olá! Meu período de testes do BizGuideAI encerrou e gostaria de contratar o plano ${plano}. Podem me ajudar?`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
}

const planos = [
  {
    id: "start",
    nome: "Start",
    preco: "R$ 97",
    periodo: "/mês",
    descricao: "Para empreendedores individuais que querem estruturar sua estratégia.",
    icon: Target,
    destaque: false,
    features: [
      "1 usuário",
      "IA para SWOT, PESTEL, BMC, OKRs e KPIs",
      "Dashboard executivo",
      "Relatórios e exportações",
    ],
    cta: "Contratar Start",
  },
  {
    id: "pro",
    nome: "Pro",
    preco: "R$ 297",
    periodo: "/mês",
    descricao: "Para equipes que querem planejamento estratégico colaborativo com IA avançada.",
    icon: Zap,
    destaque: true,
    features: [
      "Usuários ilimitados",
      "IA premium (GPT-4.1) em todas as análises",
      "Todas as ferramentas de planejamento",
      "Treinamento e suporte especializado",
      "Consultoria estratégica incluída",
    ],
    cta: "Contratar Pro",
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    preco: "Sob consulta",
    periodo: "",
    descricao: "Para empresas que precisam de personalização e suporte dedicado.",
    icon: Building2,
    destaque: false,
    features: [
      "Tudo do plano Pro",
      "IA com máxima capacidade",
      "Onboarding dedicado",
      "SLA personalizado",
      "Integração sob medida",
    ],
    cta: "Falar com consultor",
  },
];

export default function TrialExpirado() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">BizGuideAI</span>
          </div>
          <Link href="/login">
            <Button variant="ghost" size="sm" data-testid="nav-link-login">
              Fazer Login
            </Button>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16">
        <div className="max-w-2xl w-full text-center flex flex-col items-center gap-6 mb-12">
          <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="flex flex-col gap-3">
            <Badge
              variant="secondary"
              className="mx-auto text-sm px-4 py-1"
              data-testid="badge-trial-expirado"
            >
              Período de testes encerrado
            </Badge>
            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              data-testid="heading-trial-expirado"
            >
              Seu período de testes chegou ao fim
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Escolha o plano ideal para sua empresa e continue usando o BizGuideAI com todos os recursos estratégicos.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 w-full">
            <Link href="/assinar">
              <Button
                size="lg"
                className="gap-2 text-base"
                data-testid="button-assinar-plano"
              >
                Escolher meu plano
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href={makeWhatsAppUrl("completo")} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base"
                data-testid="button-whatsapp-contact"
              >
                <Phone className="h-5 w-5" />
                Falar no WhatsApp
              </Button>
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Button
                size="lg"
                variant="ghost"
                className="gap-2 text-base"
                data-testid="button-email-contact"
              >
                <Mail className="h-5 w-5" />
                Enviar e-mail
              </Button>
            </a>
          </div>
        </div>

        <div className="max-w-5xl w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planos.map((plano) => {
              const Icon = plano.icon;
              return (
                <Card
                  key={plano.id}
                  className={plano.destaque ? "border-primary shadow-md" : ""}
                  data-testid={`card-plano-${plano.id}`}
                >
                  {plano.destaque && (
                    <div className="flex justify-center -mb-3 pt-4">
                      <Badge className="text-xs px-3" data-testid={`badge-recomendado-${plano.id}`}>
                        Mais popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3 pt-6">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{plano.nome}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1 mt-2 mb-1" data-testid={`preco-plano-${plano.id}`}>
                      <span className="text-2xl font-bold">{plano.preco}</span>
                      {plano.periodo && (
                        <span className="text-sm text-muted-foreground">{plano.periodo}</span>
                      )}
                    </div>
                    <CardDescription className="text-sm leading-relaxed mt-1">
                      {plano.descricao}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <ul className="space-y-2">
                      {plano.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-2 pt-2">
                      <Link href="/assinar">
                        <Button
                          className="w-full gap-2"
                          variant={plano.destaque ? "default" : "outline"}
                          data-testid={`button-contratar-${plano.id}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {plano.cta}
                        </Button>
                      </Link>
                      <a
                        href={makeWhatsAppUrl(plano.nome)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full gap-2 text-muted-foreground"
                          data-testid={`button-whatsapp-${plano.id}`}
                        >
                          <Phone className="h-3 w-3" />
                          Tirar dúvidas
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              Treinamento para a equipe
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Suporte especializado
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary" />
              IA estratégica completa
            </span>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href={makeWhatsAppUrl("completo")} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="gap-2 text-muted-foreground" data-testid="button-whatsapp-footer">
                <Phone className="h-4 w-4" />
                Falar via WhatsApp
              </Button>
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Button size="sm" variant="ghost" className="gap-2 text-muted-foreground" data-testid="button-email-footer">
                <Mail className="h-4 w-4" />
                Enviar e-mail
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta ativa?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

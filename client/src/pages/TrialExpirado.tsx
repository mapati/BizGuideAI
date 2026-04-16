import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Clock,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  Users,
  Brain,
  BarChart3,
  Shield,
} from "lucide-react";

const benefits = [
  {
    icon: Brain,
    title: "IA Estratégica completa",
    desc: "PESTEL, SWOT, OKRs e BSC gerados automaticamente com inteligência artificial.",
  },
  {
    icon: BarChart3,
    title: "Dashboard executivo",
    desc: "Acompanhe todos os seus indicadores, iniciativas e OKRs em tempo real.",
  },
  {
    icon: Users,
    title: "Treinamento e suporte",
    desc: "Capacitação da equipe e suporte especializado para garantir a adoção e resultados.",
  },
  {
    icon: Shield,
    title: "Consultoria estratégica",
    desc: "Acesso a consultores experientes para apoiar seu planejamento e execução.",
  },
];

const WHATSAPP_NUMBER = "5511950377286";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Olá! Meu período de testes do BizGuideAI encerrou e gostaria de contratar o plano completo. Podem me ajudar?"
);
const CONTACT_EMAIL = "atendimento.jundiai@consultingnow.com.br";

export default function TrialExpirado() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

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

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-2xl w-full text-center flex flex-col items-center gap-8">
          <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="flex flex-col gap-4">
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
              Os seus 7 dias de acesso completo encerraram. Para continuar usando
              o BizGuideAI com todos os recursos, basta contratar o plano
              completo — com treinamento, suporte e consultoria incluídos.
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
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
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

        <div className="max-w-3xl w-full mt-16">
          <h2 className="text-xl font-semibold text-center mb-8">
            O que está incluído no plano completo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card
                  key={benefit.title}
                  data-testid={`card-benefit-${benefit.title.replace(/\s/g, "-").toLowerCase()}`}
                >
                  <CardContent className="p-5 flex gap-4">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">{benefit.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {benefit.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Acesso a todas as ferramentas
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Treinamento para a equipe
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Suporte especializado
            </span>
          </div>
        </div>

        <div className="mt-12 text-center">
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

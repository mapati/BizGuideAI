import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Target,
  Brain,
  BarChart3,
  TrendingUp,
  Layers,
  ClipboardList,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Users,
  LineChart,
  Globe,
  Crosshair,
  Network,
  ChevronRight,
  MessageCircle,
  Phone,
  Mail,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Análise PESTEL",
    desc: "Mapeie os fatores políticos, econômicos, sociais e tecnológicos que impactam seu negócio, com insights gerados por IA.",
  },
  {
    icon: Network,
    title: "Cinco Forças de Porter",
    desc: "Entenda a dinâmica competitiva do seu setor e identifique oportunidades de posicionamento estratégico.",
  },
  {
    icon: Layers,
    title: "Análise SWOT",
    desc: "Identifique forças, fraquezas, oportunidades e ameaças de forma estruturada e conectada à sua realidade.",
  },
  {
    icon: Crosshair,
    title: "OKRs",
    desc: "Defina objetivos ambiciosos e resultados-chave mensuráveis. Acompanhe o progresso em tempo real.",
  },
  {
    icon: BarChart3,
    title: "BSC e Indicadores",
    desc: "Gerencie KPIs nas quatro perspectivas do Balanced Scorecard: Financeiro, Clientes, Processos e Pessoas.",
  },
  {
    icon: TrendingUp,
    title: "Iniciativas Prioritárias",
    desc: "Organize e priorize seus projetos estratégicos com visibilidade de status, prazo e responsáveis.",
  },
  {
    icon: Calendar,
    title: "Ritos de Gestão",
    desc: "Cadências diárias, semanais, mensais e trimestrais com checklists e registro de decisões.",
  },
  {
    icon: Brain,
    title: "IA Estratégica",
    desc: "Diagnóstico automático da empresa com recomendações personalizadas baseadas nos seus dados.",
  },
];

const steps = [
  {
    number: "01",
    title: "Cadastre sua empresa",
    desc: "Crie sua conta e informe o site da empresa. Nossa IA gera automaticamente o perfil estratégico inicial.",
  },
  {
    number: "02",
    title: "Configure com IA",
    desc: "Responda perguntas simples e deixe a inteligência artificial estruturar seu planejamento completo.",
  },
  {
    number: "03",
    title: "Gerencie e acompanhe",
    desc: "Monitore OKRs, indicadores e iniciativas em um dashboard unificado. Execute seus ritos de gestão com método.",
  },
];

const pains = [
  {
    icon: ClipboardList,
    problem: "Planejamento manual em planilhas",
    solution: "Frameworks profissionais gerados por IA",
  },
  {
    icon: Users,
    problem: "Sem método nem estrutura",
    solution: "OKRs, BSC e PESTEL automáticos",
  },
  {
    icon: LineChart,
    problem: "Sem tempo para análises longas",
    solution: "Diagnóstico estratégico em minutos",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">BizGuideAI</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="nav-link-login">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="nav-link-register">
                Começar Período de Testes
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
          <div className="flex flex-col items-center text-center gap-8">
            <Badge
              variant="secondary"
              className="bg-primary/20 text-primary-foreground border-primary/30 text-sm px-4 py-1"
              data-testid="badge-hero-tag"
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Inteligência Artificial aplicada à estratégia
            </Badge>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl"
              data-testid="heading-hero"
            >
              Planejamento estratégico{" "}
              <span className="text-primary">com IA</span> para pequenas e
              médias empresas
            </h1>

            <p
              className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed"
              data-testid="text-hero-subtitle"
            >
              Transforme informações simples da sua empresa em frameworks
              profissionais: PESTEL, SWOT, OKRs e Balanced Scorecard — tudo
              gerado e estruturado por inteligência artificial, em minutos.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="gap-2 text-base"
                  data-testid="button-hero-cta-register"
                >
                  Começar Período de Testes
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 text-base bg-white/10 border-white/20 text-white hover:bg-white/20"
                  data-testid="button-hero-cta-login"
                >
                  Fazer Login
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Completo e fácil de usar
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Configuração em minutos
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Dados 100% seguros
              </span>
            </div>

            <div
              className="mt-8 w-full max-w-4xl rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 grid grid-cols-2 sm:grid-cols-4 gap-4"
              data-testid="section-hero-stats"
            >
              {[
                { label: "Ferramentas de Gestão", value: "14+" },
                { label: "Base Acadêmica", value: "Metodologias Validadas" },
                { label: "IA integrada", value: "GPT-4o" },
                { label: "Suporte", value: "Remoto ou Presencial" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30" data-testid="section-pains">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              O problema que resolvemos
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A maioria dos empresários sabe que precisa de planejamento
              estratégico, mas não tem tempo, método ou equipe para isso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pains.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.problem}
                  className="border"
                  data-testid={`card-pain-${item.problem.replace(/\s/g, "-").toLowerCase()}`}
                >
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="h-12 w-12 rounded-md bg-destructive/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground line-through mb-1">
                        {item.problem}
                      </p>
                      <p className="text-base font-semibold text-foreground flex items-start gap-2">
                        <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        {item.solution}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20" data-testid="section-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">
              Ferramentas incluídas
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa para gerir com estratégia
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma plataforma completa com os principais frameworks de gestão
              estratégica, todos potencializados por inteligência artificial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="hover-elevate"
                  data-testid={`card-feature-${feature.title.replace(/\s/g, "-").toLowerCase()}`}
                >
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="py-20 bg-muted/30"
        data-testid="section-how-it-works"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">
              Como funciona
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Do zero ao plano estratégico em 3 passos
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sem consultores caros. Sem planilhas infinitas. Sem semanas de
              trabalho.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-border" />

            {steps.map((step, index) => (
              <div
                key={step.number}
                className="flex flex-col items-center text-center gap-4"
                data-testid={`step-${index + 1}`}
              >
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-20 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden"
        data-testid="section-cta"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-8">
          <div className="flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 text-primary-foreground/80" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
            Comece a gerir sua empresa com estratégia hoje mesmo
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-2xl">
            Junte-se aos empresários que já usam inteligência artificial para
            tomar decisões mais rápidas e com mais clareza.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 text-base font-semibold"
                data-testid="button-cta-final"
              >
                Começar Período de Testes
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Completo e fácil de usar
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Configuração em minutos
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Cancele quando quiser
            </span>
          </div>
        </div>
      </section>

      <section
        className="py-16 bg-muted/30 border-t"
        data-testid="section-contato"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Dúvidas? Fale com um consultor</h2>
          <p className="text-muted-foreground mb-10">
            Nossa equipe está pronta para ajudar você a dar o próximo passo no planejamento estratégico da sua empresa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/5511950377286?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20BizGuideAI"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-whatsapp-contato"
            >
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <MessageCircle className="h-5 w-5" />
                WhatsApp: (11) 95037-7286
              </Button>
            </a>
            <a
              href="tel:+5511950377286"
              data-testid="link-telefone-contato"
            >
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Phone className="h-5 w-5" />
                (11) 95037-7286
              </Button>
            </a>
            <a
              href="mailto:atendimento.jundiai@consultingnow.com.br"
              data-testid="link-email-contato"
            >
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Mail className="h-5 w-5" />
                Enviar e-mail
              </Button>
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            atendimento.jundiai@consultingnow.com.br
          </p>
        </div>
      </section>

      <footer
        className="border-t bg-background py-8"
        data-testid="section-footer"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">BizGuideAI</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} BizGuideAI. Todos os direitos
            reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href="/login"
              className="hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="hover:text-foreground transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

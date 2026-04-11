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
  Sparkles,
  Activity,
  PieChart,
  GitBranch,
  Star,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Globe,
    title: "Análise PESTEL",
    desc: "Mapeie os fatores políticos, econômicos, sociais e tecnológicos com insights gerados por IA.",
  },
  {
    icon: Network,
    title: "Cinco Forças de Porter",
    desc: "Entenda a dinâmica competitiva do seu setor e identifique oportunidades de posicionamento.",
  },
  {
    icon: Layers,
    title: "Análise SWOT",
    desc: "Identifique forças, fraquezas, oportunidades e ameaças de forma estruturada e automática.",
  },
  {
    icon: Crosshair,
    title: "OKRs",
    desc: "Defina objetivos ambiciosos e resultados-chave mensuráveis com acompanhamento em tempo real.",
  },
  {
    icon: BarChart3,
    title: "BSC e Indicadores",
    desc: "Gerencie KPIs nas quatro perspectivas do Balanced Scorecard com dashboards automáticos.",
  },
  {
    icon: TrendingUp,
    title: "Iniciativas Prioritárias",
    desc: "Organize e priorize projetos estratégicos com visibilidade de status, prazo e responsáveis.",
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
    desc: "Monitore OKRs, indicadores e iniciativas em um dashboard unificado. Execute ritos de gestão com método.",
  },
];

function DashboardMockupHome() {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-primary/20 bg-slate-950 text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border-b border-white/10">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-slate-500 text-[10px]">BizGuideAI — Dashboard</span>
      </div>
      <div className="flex min-h-[300px]">
        <div className="w-36 bg-slate-900/80 border-r border-white/5 p-3 flex flex-col gap-1 flex-shrink-0">
          {["Início", "Mapa", "OKRs", "BSC", "Indicadores", "Ritos"].map((item, i) => (
            <div key={item} className={`px-2 py-1.5 rounded text-[10px] font-medium ${i === 0 ? "bg-primary/20 text-primary" : "text-slate-500"}`}>
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-slate-300 font-semibold text-[11px]">Visão Geral Estratégica</p>
            <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-none">IA Ativa</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "OKRs ativos", value: "4", sub: "+1 este mês", color: "text-emerald-400" },
              { label: "Iniciativas", value: "7", sub: "3 em progresso", color: "text-blue-400" },
              { label: "Indicadores", value: "12", sub: "2 em alerta", color: "text-amber-400" },
            ].map(c => (
              <div key={c.label} className="bg-slate-800/60 rounded-lg p-2.5 border border-white/5">
                <p className="text-slate-500 text-[9px]">{c.label}</p>
                <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                <p className="text-slate-600 text-[9px]">{c.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 border border-white/5">
            <p className="text-slate-400 text-[10px] font-medium mb-2">Progresso dos OKRs</p>
            {[
              { name: "Aumentar receita", pct: 72, color: "bg-emerald-500" },
              { name: "Expansão de clientes", pct: 45, color: "bg-blue-500" },
              { name: "NPS acima de 70", pct: 88, color: "bg-purple-500" },
            ].map(okr => (
              <div key={okr.name} className="mb-1.5">
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-400 text-[9px]">{okr.name}</span>
                  <span className="text-slate-300 text-[9px] font-medium">{okr.pct}%</span>
                </div>
                <div className="h-1 bg-slate-700 rounded-full">
                  <div className={`h-full ${okr.color} rounded-full`} style={{ width: `${okr.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-800/40 rounded-lg p-2.5 border border-white/5 flex items-start gap-2">
            <Sparkles className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-400 leading-relaxed">
              <span className="text-primary font-medium">IA:</span> Sua meta de receita está 72% concluída. Recomendo revisar as iniciativas de vendas para acelerar o fechamento do trimestre.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardMockupBSC() {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/20 bg-slate-950 text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border-b border-white/10">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-slate-500 text-[10px]">BizGuideAI — Balanced Scorecard</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-slate-300 font-semibold text-[11px]">Indicadores — BSC</p>
          <span className="text-[9px] text-slate-500">Q2 2025</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Financeiro", items: ["Receita: R$ 1.2M", "Margem: 28%", "CAC: R$ 380"], color: "border-emerald-500/40 bg-emerald-500/5", dot: "bg-emerald-500" },
            { label: "Clientes", items: ["NPS: 74", "Churn: 2.1%", "Novos: 34/mês"], color: "border-blue-500/40 bg-blue-500/5", dot: "bg-blue-500" },
            { label: "Processos", items: ["Lead Time: 3d", "SLA: 96%", "Retrabalho: 4%"], color: "border-purple-500/40 bg-purple-500/5", dot: "bg-purple-500" },
            { label: "Pessoas", items: ["eNPS: 61", "Turnover: 8%", "T&D: 12h/tri"], color: "border-amber-500/40 bg-amber-500/5", dot: "bg-amber-500" },
          ].map(q => (
            <div key={q.label} className={`rounded-lg p-2.5 border ${q.color}`}>
              <div className="flex items-center gap-1 mb-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${q.dot}`} />
                <p className="text-[9px] font-semibold text-slate-300">{q.label}</p>
              </div>
              {q.items.map(item => (
                <p key={item} className="text-[9px] text-slate-500">{item}</p>
              ))}
            </div>
          ))}
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2.5 border border-white/5 flex items-start gap-2">
          <Sparkles className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-slate-400 leading-relaxed">
            <span className="text-blue-400 font-medium">IA:</span> O churn de 2.1% está dentro da meta, mas o eNPS de Pessoas merece atenção — considere ações de engajamento.
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardMockupSwot() {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/20 bg-slate-950 text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border-b border-white/10">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-slate-500 text-[10px]">BizGuideAI — Análise SWOT</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-slate-300 font-semibold text-[11px]">SWOT — Gerado por IA</p>
          <Badge className="text-[9px] px-1.5 py-0 bg-purple-500/20 text-purple-400 border-none">Auto-gerado</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Forças", emoji: "S", items: ["Equipe especializada", "Produto consolidado", "Alta retenção"], color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" },
            { label: "Fraquezas", emoji: "W", items: ["Marketing incipiente", "Processo manual", "Dependência de sócios"], color: "border-red-500/30 bg-red-500/5 text-red-400" },
            { label: "Oportunidades", emoji: "O", items: ["Mercado em expansão", "Digitalização setorial", "Parcerias potenciais"], color: "border-blue-500/30 bg-blue-500/5 text-blue-400" },
            { label: "Ameaças", emoji: "T", items: ["Concorrentes maiores", "Câmbio instável", "Regulação setorial"], color: "border-amber-500/30 bg-amber-500/5 text-amber-400" },
          ].map(q => (
            <div key={q.label} className={`rounded-lg p-2.5 border ${q.color}`}>
              <p className={`text-[9px] font-bold mb-1.5 ${q.color.split(" ")[2]}`}>{q.emoji} — {q.label}</p>
              {q.items.map(item => (
                <p key={item} className="text-[9px] text-slate-500 flex items-start gap-1">
                  <span className="mt-0.5 flex-shrink-0">·</span>{item}
                </p>
              ))}
            </div>
          ))}
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2.5 border border-white/5 flex items-start gap-2">
          <Sparkles className="h-3 w-3 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-slate-400 leading-relaxed">
            <span className="text-purple-400 font-medium">IA:</span> Identifiquei 3 cruzamentos SO estratégicos — use sua equipe especializada para capturar o mercado em expansão.
          </p>
        </div>
      </div>
    </div>
  );
}

const showcaseTabs = [
  { id: "home", label: "Dashboard", icon: Activity, component: DashboardMockupHome },
  { id: "bsc", label: "BSC & KPIs", icon: PieChart, component: DashboardMockupBSC },
  { id: "swot", label: "SWOT com IA", icon: GitBranch, component: DashboardMockupSwot },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("home");
  const ActiveMockup = showcaseTabs.find(t => t.id === activeTab)?.component ?? DashboardMockupHome;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">BizGuideAI</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 hidden sm:inline-flex">
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              Powered by AI
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="nav-link-login">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="nav-link-register">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(var(--primary-rgb),0.3),rgba(255,255,255,0))] pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — text */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/20 text-primary border-primary/30 text-sm px-3 py-1"
                  data-testid="badge-hero-tag"
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  IA aplicada à estratégia empresarial
                </Badge>
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-5xl font-bold text-white leading-tight"
                data-testid="heading-hero"
              >
                Planejamento estratégico{" "}
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, #60a5fa 100%)" }}
                >
                  inteligente
                </span>{" "}
                para PMEs
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed" data-testid="text-hero-subtitle">
                Transforme dados simples da sua empresa em PESTEL, SWOT, OKRs e Balanced Scorecard — estruturados por GPT-4o em minutos, não em semanas.
              </p>

              <div className="flex flex-wrap gap-3">
                {["PESTEL", "SWOT", "OKRs", "BSC", "Cinco Forças", "Iniciativas"].map(tag => (
                  <span key={tag} className="text-xs text-slate-400 border border-slate-700 rounded-full px-2.5 py-1">{tag}</span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
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
                    className="gap-2 text-base border-slate-600 text-slate-300 bg-transparent"
                    data-testid="button-hero-cta-login"
                  >
                    Fazer Login
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />7 dias grátis</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Sem cartão de crédito</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Configuração em minutos</span>
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-2xl opacity-30 blur-2xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse, hsl(var(--primary)) 0%, transparent 70%)" }}
              />
              <div className="relative">
                <DashboardMockupHome />
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div
            className="mt-16 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur p-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
            data-testid="section-hero-stats"
          >
            {[
              { label: "Ferramentas de Gestão", value: "14+" },
              { label: "Metodologias Validadas", value: "Acadêmicas" },
              { label: "IA Integrada", value: "GPT-4o" },
              { label: "Suporte", value: "Remoto & Presencial" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUTO EM AÇÃO */}
      <section className="py-20 bg-slate-950 border-t border-white/5" data-testid="section-showcase">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-sm px-4 py-1 bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Veja o produto em ação
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Um sistema completo, guiado por IA
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Cada tela foi projetada para tornar o planejamento estratégico simples, visual e accionável.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {showcaseTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                      : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300"
                  }`}
                  data-testid={`tab-showcase-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <div
              className="absolute -inset-6 rounded-3xl opacity-20 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse, hsl(var(--primary)) 0%, transparent 70%)" }}
            />
            <div className="relative max-w-3xl mx-auto">
              <ActiveMockup />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA / SOLUÇÃO */}
      <section className="py-20 bg-background" data-testid="section-pains">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">O problema que resolvemos</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A maioria dos empresários sabe que precisa de planejamento estratégico, mas não tem tempo, método ou equipe para isso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pains.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.problem} className="border" data-testid={`card-pain-${item.problem.replace(/\s/g, "-").toLowerCase()}`}>
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="h-12 w-12 rounded-md bg-destructive/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground line-through mb-1">{item.problem}</p>
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

      {/* FEATURES */}
      <section className="py-20 bg-muted/30" data-testid="section-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Ferramentas incluídas</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tudo que você precisa para gerir com estratégia</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma plataforma completa com os principais frameworks de gestão estratégica, todos potencializados por inteligência artificial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="hover-elevate" data-testid={`card-feature-${feature.title.replace(/\s/g, "-").toLowerCase()}`}>
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* POWERED BY AI — DESTAQUE */}
      <section className="py-20 bg-slate-950 relative overflow-hidden" data-testid="section-ai-highlight">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-blue-600/10 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <Badge className="bg-primary/20 text-primary border-primary/30 w-fit text-sm px-3 py-1">
                <Brain className="h-3.5 w-3.5 mr-1.5" />
                Powered by GPT-4o
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                A IA que trabalha para a sua empresa, não o contrário
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Nossa integração com GPT-4o vai além de textos genéricos. A IA do BizGuideAI lê os dados reais do seu negócio e gera análises estratégicas customizadas, recomendações priorizadas e diagnósticos em linguagem executiva.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Analisa o site da empresa e gera o perfil estratégico automaticamente",
                  "Sugere OKRs, iniciativas e KPIs alinhados ao contexto do seu setor",
                  "Identifica cruzamentos estratégicos no SWOT e prioriza ações",
                  "Gera insights contextuais em cada etapa do planejamento",
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-slate-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -inset-4 rounded-2xl opacity-25 blur-2xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse, #60a5fa 0%, transparent 70%)" }}
              />
              <div className="relative space-y-3">
                {[
                  { title: "Análise de Site", desc: "IA lê seu site e gera perfil estratégico", tag: "Auto", color: "text-emerald-400" },
                  { title: "Geração de OKRs", desc: "Objetivos e KRs alinhados ao seu contexto real", tag: "Contextual", color: "text-blue-400" },
                  { title: "SWOT Inteligente", desc: "Cruzamentos SO, WO, ST, WT automáticos", tag: "Estratégico", color: "text-purple-400" },
                  { title: "Diagnóstico Executivo", desc: "Relatório em linguagem de C-level, não em jargão técnico", tag: "Executivo", color: "text-amber-400" },
                ].map(item => (
                  <div key={item.title} className="flex items-center gap-3 bg-slate-900/80 border border-white/10 rounded-xl p-4">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{item.title}</p>
                      <p className="text-slate-500 text-xs truncate">{item.desc}</p>
                    </div>
                    <span className={`text-xs font-medium ${item.color} flex-shrink-0`}>{item.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 bg-background" data-testid="section-how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Como funciona</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Do zero ao plano estratégico em 3 passos</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sem consultores caros. Sem planilhas infinitas. Sem semanas de trabalho.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-border" />
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center text-center gap-4" data-testid={`step-${index + 1}`}>
                <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <span className="text-2xl font-bold text-primary-foreground">{step.number}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS / PROVA SOCIAL */}
      <section className="py-20 bg-muted/30" data-testid="section-testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Por que empresas escolhem o BizGuideAI</Badge>
            <h2 className="text-3xl font-bold mb-3">Gestão estratégica ao alcance de qualquer PME</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Combinamos as melhores metodologias acadêmicas com a velocidade da inteligência artificial.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "Frameworks de classe mundial",
                desc: "PESTEL, SWOT, BSC, OKR, Cinco Forças e Modelo de Negócio Canvas — metodologias usadas pelas maiores empresas do mundo, acessíveis à sua PME.",
              },
              {
                icon: Zap,
                title: "Velocidade com IA",
                desc: "O que antes levava semanas de consultoria agora leva minutos. A IA estrutura, sugere e valida tudo com base nos dados reais da sua empresa.",
              },
              {
                icon: Shield,
                title: "Consultoria por trás da plataforma",
                desc: "A Consulting Now está por trás do BizGuideAI, trazendo expertise de consultoria estratégica real para dentro do software.",
              },
            ].map(item => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        className="py-20 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden"
        data-testid="section-cta"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6">
          <Badge className="bg-white/20 text-white border-white/30 text-sm px-4 py-1">
            <Star className="h-3.5 w-3.5 mr-1.5" />
            7 dias de acesso completo, grátis
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
            Comece a gerir sua empresa com estratégia hoje mesmo
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-2xl">
            Junte-se aos empresários que já usam inteligência artificial para tomar decisões mais rápidas e com mais clareza.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold" data-testid="button-cta-final">
                Começar Período de Testes
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Completo e fácil de usar</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Configuração em minutos</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Cancele quando quiser</span>
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section className="py-16 bg-muted/30 border-t" data-testid="section-contato">
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
            <a href="tel:+5511950377286" data-testid="link-telefone-contato">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Phone className="h-5 w-5" />
                (11) 95037-7286
              </Button>
            </a>
            <a href="mailto:atendimento.jundiai@consultingnow.com.br" data-testid="link-email-contato">
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

      {/* FOOTER */}
      <footer className="border-t bg-background py-8" data-testid="section-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">BizGuideAI</span>
            <span className="text-xs text-muted-foreground ml-1">by Consulting Now</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} BizGuideAI. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Entrar</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

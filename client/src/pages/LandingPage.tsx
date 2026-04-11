import { Link } from "wouter";
import aiDiagramImg from "@assets/1775934540417_1775934559877.png";
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
  Star,
  DollarSign,
  Cog,
  GraduationCap,
  AlertCircle,
  XCircle,
  AlertTriangle,
  Home,
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

function InlineCircularProgress({ value, size = 64, strokeWidth = 7 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const color =
    value < 30 ? "#f87171" :
    value < 50 ? "#fb923c" :
    value < 70 ? "#eab308" :
    "#16a34a";
  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold" style={{ color }}>{value}%</span>
      </div>
    </div>
  );
}

function MockupSidebar({ active }: { active: "inicio" | "okrs" | "kpis" }) {
  const nav = [
    { id: "inicio", label: "Início" },
    { id: "mapa", label: "Mapa Estratégico" },
    { id: "pestel", label: "Cenário Externo", section: "DIAGNÓSTICO" },
    { id: "forcas", label: "Mercado e Concorrência" },
    { id: "bmc", label: "Modelo de Negócio" },
    { id: "swot", label: "Forças e Fraquezas" },
    { id: "estrategias", label: "Estratégias", section: "APOSTAS" },
    { id: "oportunidades", label: "Oportunidades" },
    { id: "iniciativas", label: "Iniciativas Prioritárias" },
    { id: "okrs", label: "OKRs — Objetivos", section: "MARCHA" },
    { id: "kpis", label: "KPIs — Indicadores" },
    { id: "bsc", label: "Performance dos OKRs" },
    { id: "ritos", label: "Acompanhamento" },
  ];

  let currentSection = "";

  return (
    <div className="w-[108px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
      <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-100">
        <div className="h-4 w-4 rounded bg-primary flex items-center justify-center flex-shrink-0">
          <Target className="h-2.5 w-2.5 text-white" />
        </div>
        <span className="text-[9px] font-bold text-gray-800">BizGuideAI</span>
      </div>
      <div className="flex flex-col p-1.5 gap-px overflow-hidden">
        {nav.map((item) => {
          const showSection = item.section && item.section !== currentSection;
          if (item.section) currentSection = item.section;
          const isActive = item.id === active;
          return (
            <div key={item.id}>
              {showSection && (
                <p className="text-[7px] font-semibold text-gray-400 uppercase tracking-wider px-1.5 pt-2 pb-0.5">
                  {item.section}
                </p>
              )}
              <div className={`px-1.5 py-[3px] rounded text-[8.5px] font-medium ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-500"
              }`}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrowserChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-2xl shadow-slate-900/30 bg-white text-xs">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border-b border-gray-200">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <div className="ml-2 flex-1 bg-white rounded px-2 py-0.5 text-[9px] text-gray-400 border border-gray-200">
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function MockupHome() {
  const perspectivas = [
    { label: "Financeira", icon: DollarSign, cor: "text-green-600 bg-green-50", pct: 72 },
    { label: "Clientes", icon: Users, cor: "text-blue-600 bg-blue-50", pct: 58 },
    { label: "Processos", icon: Cog, cor: "text-orange-600 bg-orange-50", pct: 45 },
    { label: "Pessoas", icon: GraduationCap, cor: "text-purple-600 bg-purple-50", pct: 83 },
  ];

  return (
    <BrowserChrome title="bizguideai.app — Início">
      <div className="flex bg-gray-50" style={{ minHeight: 400 }}>
        <MockupSidebar active="inicio" />
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden min-w-0">
          <div>
            <h1 className="text-[11px] font-bold text-gray-900">Olá, Tecno Sul Comércio</h1>
            <p className="text-[9px] text-gray-400">sábado, 11 de abril de 2026</p>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
            <div className="col-span-2 bg-white rounded-lg border border-gray-100 p-3 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-1 text-[9px] font-medium text-gray-500 self-start">
                <TrendingUp className="h-3 w-3" />
                Performance Geral dos OKRs
              </div>
              <InlineCircularProgress value={68} size={72} strokeWidth={7} />
              <p className="text-[8px] text-gray-400 text-center">5 objetivos · 14 resultados-chave</p>
            </div>

            <div className="col-span-3 grid grid-cols-2 gap-2">
              {perspectivas.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.label} className="bg-white rounded-lg border border-gray-100 p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${p.cor}`}>
                        <Icon className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-[9px] font-medium text-gray-700">{p.label}</span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-[13px] font-bold text-gray-900">{p.pct}%</span>
                      <span className="text-[8px] text-gray-400 mb-0.5">progresso</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full" style={{ height: 4 }}>
                      <div className="bg-primary rounded-full" style={{ height: 4, width: `${p.pct}%` }} />
                    </div>
                    <p className="text-[8px] text-gray-400">2 objetivos</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg border border-gray-100 p-2.5">
              <div className="flex items-center gap-1 mb-2">
                <BarChart3 className="h-3 w-3 text-gray-400" />
                <span className="text-[9px] font-semibold text-gray-700">Indicadores BSC (KPIs)</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-[9px] font-semibold text-gray-800">7</span>
                  <span className="text-[8px] text-gray-400">verde</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-[9px] font-semibold text-gray-800">2</span>
                  <span className="text-[8px] text-gray-400">atenção</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-semibold text-gray-800">1</span>
                  <span className="text-[8px] text-gray-400">crítico</span>
                </div>
              </div>
              <p className="text-[7.5px] font-semibold text-red-600 uppercase tracking-wide mb-1">Indicadores críticos</p>
              <div className="flex items-center justify-between bg-red-50 rounded p-1.5">
                <span className="text-[8.5px] font-medium text-gray-800">Inadimplência</span>
                <span className="text-[8px] text-gray-500">3.2% / 1%</span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-2.5">
              <div className="flex items-center gap-1 mb-2">
                <AlertTriangle className="h-3 w-3 text-gray-400" />
                <span className="text-[9px] font-semibold text-gray-700">Alertas Ativos</span>
              </div>
              <div className="flex items-center gap-1.5 py-3 justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-[8.5px] text-green-600 font-medium">Sem alertas de alta severidade</span>
              </div>
              <div className="mt-1 border border-gray-100 rounded p-1.5 flex items-start gap-1.5 bg-primary/5">
                <Sparkles className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-[7.5px] text-gray-600 leading-relaxed">
                  <span className="text-primary font-semibold">IA:</span> Sua Margem Bruta está 4pp abaixo da meta. Revise a precificação dos serviços de maior volume.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function MockupOKRs() {
  const okrs = [
    {
      perspectiva: "Financeira",
      icon: DollarSign,
      cor: "text-green-600",
      dot: "bg-green-500",
      objetivos: [
        {
          titulo: "Crescer receita bruta em 30%",
          prazo: "dez/2025",
          krs: [
            { metrica: "Receita mensal de R$ 180k", pct: 72 },
            { metrica: "Margem bruta acima de 28%", pct: 60 },
          ],
        },
        {
          titulo: "Reduzir inadimplência para 1%",
          prazo: "jun/2025",
          krs: [
            { metrica: "Inadimplência ≤ 1% ao mês", pct: 45 },
          ],
        },
      ],
    },
    {
      perspectiva: "Clientes",
      icon: Users,
      cor: "text-blue-600",
      dot: "bg-blue-500",
      objetivos: [
        {
          titulo: "NPS acima de 75 pontos",
          prazo: "dez/2025",
          krs: [
            { metrica: "Pesquisa mensal com 100+ respostas", pct: 88 },
            { metrica: "Resolver 95% reclamações em 24h", pct: 55 },
          ],
        },
      ],
    },
  ];

  return (
    <BrowserChrome title="bizguideai.app — OKRs">
      <div className="flex bg-gray-50" style={{ minHeight: 400 }}>
        <MockupSidebar active="okrs" />
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-[11px] font-bold text-gray-900">OKRs — Objetivos e Resultados-Chave</h1>
              <p className="text-[9px] text-gray-400">Defina objetivos ambiciosos e acompanhe resultados mensuráveis</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="flex items-center gap-0.5 bg-primary text-white rounded px-1.5 py-1 text-[8px] font-medium">
                <Sparkles className="h-2.5 w-2.5" />
                Gerar com IA
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {okrs.map((persp) => {
              const Icon = persp.icon;
              return (
                <div key={persp.perspectiva} className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded-full flex-shrink-0 ${persp.dot}`} />
                    <Icon className={`h-3 w-3 ${persp.cor}`} />
                    <span className={`text-[9px] font-semibold ${persp.cor}`}>{persp.perspectiva}</span>
                  </div>
                  {persp.objetivos.map((obj, oi) => (
                    <div key={oi} className="bg-white rounded-lg border border-gray-100 p-2.5 flex flex-col gap-1.5">
                      <p className="text-[9px] font-semibold text-gray-800 leading-tight">{obj.titulo}</p>
                      <p className="text-[7.5px] text-gray-400">Prazo: {obj.prazo}</p>
                      <div className="flex flex-col gap-1.5 mt-0.5">
                        {obj.krs.map((kr, ki) => (
                          <div key={ki}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[7.5px] text-gray-500 truncate pr-2">{kr.metrica}</span>
                              <span className="text-[8px] font-semibold text-gray-700 flex-shrink-0">{kr.pct}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full" style={{ height: 4 }}>
                              <div className="bg-primary rounded-full transition-all" style={{ height: 4, width: `${kr.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <div className="text-[7.5px] text-gray-400 border border-dashed border-gray-200 rounded px-1.5 py-1 flex items-center gap-1">
                      + Novo Objetivo
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function MockupIndicadores() {
  const secoes = [
    {
      label: "Finanças",
      icon: DollarSign,
      headerCor: "text-green-600 bg-green-50",
      indicadores: [
        { nome: "Receita Bruta Mensal", atual: "R$ 147k", meta: "R$ 180k", status: "verde" as const },
        { nome: "Margem Bruta", atual: "24%", meta: "28%", status: "amarelo" as const },
        { nome: "Inadimplência", atual: "3.2%", meta: "1%", status: "vermelho" as const },
      ],
    },
    {
      label: "Clientes",
      icon: Users,
      headerCor: "text-blue-600 bg-blue-50",
      indicadores: [
        { nome: "NPS — Net Promoter Score", atual: "74", meta: "75", status: "verde" as const },
        { nome: "Churn Rate", atual: "2.1%", meta: "2%", status: "verde" as const },
      ],
    },
  ];

  const statusConfig = {
    verde: {
      badge: "bg-green-100 text-green-800",
      label: "No Alvo",
      icon: CheckCircle2,
    },
    amarelo: {
      badge: "bg-yellow-100 text-yellow-800",
      label: "Atenção",
      icon: AlertCircle,
    },
    vermelho: {
      badge: "bg-red-100 text-red-800",
      label: "Crítico",
      icon: XCircle,
    },
  };

  return (
    <BrowserChrome title="bizguideai.app — KPIs — Indicadores">
      <div className="flex bg-gray-50" style={{ minHeight: 400 }}>
        <MockupSidebar active="kpis" />
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-[11px] font-bold text-gray-900">KPIs — Indicadores de Performance</h1>
              <p className="text-[9px] text-gray-400">Balanced Scorecard — monitoramento das 4 perspectivas</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="flex items-center gap-0.5 border border-gray-200 bg-white rounded px-1.5 py-1 text-[8px] text-gray-600">
                + Novo KPI
              </div>
              <div className="flex items-center gap-0.5 bg-primary text-white rounded px-1.5 py-1 text-[8px] font-medium">
                <Sparkles className="h-2.5 w-2.5" />
                Gerar com IA
              </div>
            </div>
          </div>

          {secoes.map((secao) => {
            const Icon = secao.icon;
            return (
              <div key={secao.label} className="flex flex-col gap-1.5">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${secao.headerCor} w-fit`}>
                  <Icon className="h-3 w-3" />
                  <span className="text-[9px] font-semibold">{secao.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {secao.indicadores.map((ind) => {
                    const cfg = statusConfig[ind.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={ind.nome} className="bg-white rounded-lg border border-gray-100 p-2.5 flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[8.5px] font-semibold text-gray-800 leading-tight">{ind.nome}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[8px] text-gray-500">
                          <span className="font-medium text-gray-700">{ind.atual}</span>
                          <ArrowRight className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                          <span>{ind.meta}</span>
                        </div>
                        <div className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7.5px] font-medium ${cfg.badge} w-fit`}>
                          <StatusIcon className="h-2.5 w-2.5 flex-shrink-0" />
                          {cfg.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BrowserChrome>
  );
}

const showcaseTabs = [
  { id: "home", label: "Início", icon: Home, component: MockupHome },
  { id: "okrs", label: "OKRs", icon: Target, component: MockupOKRs },
  { id: "indicadores", label: "Indicadores", icon: BarChart3, component: MockupIndicadores },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("home");
  const ActiveMockup = showcaseTabs.find(t => t.id === activeTab)?.component ?? MockupHome;

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

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="flex flex-col items-center text-center gap-6">
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
                Responda perguntas simples sobre o seu negócio e receba um plano estratégico completo — com metas, indicadores de desempenho e as ações mais importantes para crescer. Tudo gerado em minutos pela inteligência artificial.
              </p>

              <div className="flex flex-wrap gap-3">
                {["PESTEL", "SWOT", "OKRs", "BSC", "Cinco Forças", "Iniciativas"].map(tag => (
                  <span key={tag} className="text-xs text-slate-400 border border-slate-700 rounded-full px-2.5 py-1">{tag}</span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/register">
                  <Button size="lg" className="gap-2 text-base" data-testid="button-hero-cta-register">
                    Começar Período de Testes
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="gap-2 text-base border-slate-600 text-slate-300 bg-transparent" data-testid="button-hero-cta-login">
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

      {/* DIAGRAMA IA */}
      <section className="bg-slate-950 border-t border-white/5 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          <img
            src={aiDiagramImg}
            alt="Da análise ao plano estratégico inteligente com IA"
            className="w-full max-w-3xl rounded-xl"
            data-testid="img-ai-diagram"
          />
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

      {/* POWERED BY AI */}
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

      {/* PROVA SOCIAL */}
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
      <section className="py-20 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden" data-testid="section-cta">
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
            <a href="https://wa.me/5511950377286?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20BizGuideAI" target="_blank" rel="noopener noreferrer" data-testid="link-whatsapp-contato">
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

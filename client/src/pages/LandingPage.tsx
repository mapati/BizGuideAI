import { Link } from "wouter";
import { HeroDiagramaIA } from "@/components/HeroDiagramaIA";
import { EnterpriseContactModal } from "@/components/EnterpriseContactModal";
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
  Globe2,
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
  Swords,
  LayoutGrid,
  GitBranch,
  Flag,
  Rocket,
  Activity,
  Briefcase,
  Map,
  Circle,
  CircleDot,
  Compass,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Compass,
    title: "Guia que vira Assistente",
    desc: "No início, o Guia conduz cada etapa da jornada. Quando você termina, ele se transforma em Assistente que monitora seu plano e sugere o próximo passo.",
  },
  {
    icon: Globe,
    title: "Cenário externo decifrado pela IA",
    desc: "PESTEL pronto: a IA traduz política, economia, tecnologia e regulação no que de fato muda o seu negócio.",
  },
  {
    icon: Network,
    title: "Concorrência mapeada de verdade",
    desc: "Cinco Forças aplicado ao seu mercado: quem são os players, onde está a pressão e onde estão as brechas.",
  },
  {
    icon: Layers,
    title: "Diagnóstico que vira plano",
    desc: "SWOT cruzado: forças, fraquezas, oportunidades e ameaças viram estratégias priorizadas — não ficam no papel.",
  },
  {
    icon: Crosshair,
    title: "Metas que saem da gaveta",
    desc: "OKRs com resultados-chave mensuráveis, conectados às estratégias e aos indicadores. Acabou o achismo.",
  },
  {
    icon: BarChart3,
    title: "BSC com alerta automático",
    desc: "Indicadores nas 4 perspectivas do Balanced Scorecard. Tudo em um painel só, com semáforo e alerta de desvio.",
  },
  {
    icon: TrendingUp,
    title: "Iniciativas com dono e prazo",
    desc: "Cada projeto prioritário sai do planejamento com responsável, prazo e impacto esperado. Plano que executa.",
  },
  {
    icon: Calendar,
    title: "Rituais de gestão prontos",
    desc: "Reunião semanal, mensal e trimestral com pauta gerada pela IA. O plano fica vivo, sem virar PDF esquecido.",
  },
];

const pains = [
  {
    icon: ClipboardList,
    problem: "Você planeja na cabeça, mas nunca sai do papel",
    solution: "Um roteiro de 12 passos transforma ideias soltas em estratégia documentada, com a IA preenchendo o trabalho pesado a cada etapa",
  },
  {
    icon: Users,
    problem: "A equipe corre muito, mas ninguém sabe se está no caminho certo",
    solution: "Metas, indicadores e iniciativas conectados em um painel único — todo mundo vê o mesmo norte e o mesmo placar",
  },
  {
    icon: LineChart,
    problem: "Consultoria estratégica custa caro e demora meses",
    solution: "As mesmas metodologias de SWOT, PESTEL, OKR e BSC entregues em horas — pelo preço de uma assinatura, não de um projeto",
  },
];

const steps = [
  {
    number: "01",
    title: "Cadastre sua empresa",
    desc: "Informe o site da sua empresa. A inteligência artificial lê as informações e monta o perfil do seu negócio automaticamente.",
  },
  {
    number: "02",
    title: "Siga o roteiro guiado",
    desc: "Um passo a passo com 12 etapas leva você do diagnóstico ao plano de ação completo. Sem pular nada, sem se perder.",
  },
  {
    number: "03",
    title: "Acompanhe os resultados",
    desc: "Veja se as metas estão sendo atingidas, acompanhe os projetos em andamento e mantenha a equipe alinhada.",
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

type MockupSidebarActive = "inicio" | "okrs" | "kpis" | "jornada";

function MockupSidebar({ active }: { active: MockupSidebarActive }) {
  const nav: { id: string; label: string; section?: string }[] = [
    { id: "inicio", label: "Início" },
    { id: "perfil", label: "Perfil da Empresa" },
    { id: "diagnostico", label: "Diagnóstico Atual" },
    { id: "bmc", label: "Modelo de Negócio", section: "MAPA" },
    { id: "pestel", label: "Cenário Externo" },
    { id: "cinco-forcas", label: "Mercado e Concorrência" },
    { id: "swot", label: "Forças e Fraquezas" },
    { id: "estrategias", label: "Estratégias", section: "PLANO DE AÇÃO" },
    { id: "oportunidades", label: "Oportunidades de Crescimento" },
    { id: "iniciativas", label: "Iniciativas Prioritárias" },
    { id: "okrs", label: "Metas e Resultados", section: "EXECUÇÃO" },
    { id: "bsc", label: "Performance das Metas" },
    { id: "kpis", label: "Indicadores" },
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

function BrowserChrome({
  title,
  children,
  showGuiaChip = true,
}: {
  title: string;
  children: React.ReactNode;
  showGuiaChip?: boolean;
}) {
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
      <div className="relative">
        {children}
        {showGuiaChip && (
          <div
            className="absolute top-2 right-2 flex items-center gap-1 rounded-full border border-sky-300 bg-sky-300 px-2 py-1 text-[8px] font-semibold text-sky-950 shadow-md z-10"
            data-testid="mockup-guia-chip"
          >
            <Compass className="h-2.5 w-2.5" />
            Guia Estratégico
          </div>
        )}
      </div>
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
          <div className="pr-28">
            <h1 className="text-[11px] font-bold text-gray-900">Olá, Tecno Sul Comércio</h1>
            <p className="text-[9px] text-gray-400">sábado, 11 de abril de 2026</p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-md px-2 py-1.5 flex items-start gap-1.5">
            <Compass className="h-2.5 w-2.5 text-primary flex-shrink-0 mt-px" />
            <p className="text-[8px] text-gray-600 leading-snug">
              <span className="font-semibold text-gray-800">Comece pelo Guia Estratégico</span> no canto superior direito — ele mostra a próxima etapa e leva você direto para ela.
            </p>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
            <div className="col-span-2 bg-white rounded-lg border border-gray-100 p-3 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-1 text-[9px] font-medium text-gray-500 self-start">
                <TrendingUp className="h-3 w-3" />
                Performance Geral
              </div>
              <InlineCircularProgress value={68} size={72} strokeWidth={7} />
              <p className="text-[8px] text-gray-400 text-center">5 objetivos · 14 metas de resultado</p>
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
                <span className="text-[9px] font-semibold text-gray-700">Indicadores do Negócio</span>
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
                  <span className="text-primary font-semibold">IA:</span> Sua margem de lucro está abaixo da meta. Revise os preços dos serviços de maior volume.
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
    <BrowserChrome title="bizguideai.app — Metas e Resultados">
      <div className="flex bg-gray-50" style={{ minHeight: 400 }}>
        <MockupSidebar active="okrs" />
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-[11px] font-bold text-gray-900">Metas e Resultados</h1>
              <p className="text-[9px] text-gray-400">Defina objetivos claros e acompanhe o progresso em tempo real</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 mt-6">
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
        { nome: "Satisfação do Cliente", atual: "74", meta: "75", status: "verde" as const },
        { nome: "Cancelamentos", atual: "2.1%", meta: "2%", status: "verde" as const },
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
    <BrowserChrome title="bizguideai.app — Indicadores">
      <div className="flex bg-gray-50" style={{ minHeight: 400 }}>
        <MockupSidebar active="kpis" />
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-[11px] font-bold text-gray-900">Indicadores de Performance</h1>
              <p className="text-[9px] text-gray-400">Os números mais importantes do seu negócio, organizados por área</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 mt-6">
              <div className="flex items-center gap-0.5 border border-gray-200 bg-white rounded px-1.5 py-1 text-[8px] text-gray-600">
                + Novo Indicador
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

function MockupJornada() {
  const grupos = [
    {
      label: "DIAGNÓSTICO",
      etapas: [
        { nome: "Perfil da Empresa", icone: Target, status: "concluido" as const },
        { nome: "Diagnóstico Atual", icone: BarChart3, status: "concluido" as const },
      ],
    },
    {
      label: "MAPA",
      etapas: [
        { nome: "Modelo de Negócio", icone: LayoutGrid, status: "concluido" as const },
        { nome: "Cenário Externo", icone: Globe2, status: "iniciado" as const },
        { nome: "Mercado e Concorrência", icone: Swords, status: "pendente" as const },
        { nome: "Forças e Fraquezas", icone: GitBranch, status: "pendente" as const },
      ],
    },
    {
      label: "PLANO DE AÇÃO",
      etapas: [
        { nome: "Estratégias", icone: Flag, status: "pendente" as const },
        { nome: "Oportunidades de Crescimento", icone: TrendingUp, status: "pendente" as const },
        { nome: "Iniciativas Prioritárias", icone: Briefcase, status: "pendente" as const },
      ],
    },
    {
      label: "EXECUÇÃO",
      etapas: [
        { nome: "Metas e Resultados", icone: Rocket, status: "pendente" as const },
        { nome: "Indicadores", icone: BarChart3, status: "pendente" as const },
        { nome: "Acompanhamento", icone: Activity, status: "pendente" as const },
      ],
    },
  ];

  const totalConcluidas = 3;
  const total = 12;
  const pct = Math.round((totalConcluidas / total) * 100);
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <BrowserChrome title="bizguideai.app — Jornada Estratégica" showGuiaChip={false}>
      <div className="flex bg-gray-50" style={{ minHeight: 400 }}>
        <MockupSidebar active="inicio" />
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[11px] font-bold text-gray-900">Jornada Estratégica</h1>
              <p className="text-[9px] text-gray-400">Seu roteiro guiado passo a passo — do diagnóstico à execução</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5">
              <div className="relative inline-flex items-center justify-center flex-shrink-0">
                <svg width={48} height={48} className="-rotate-90">
                  <circle cx={24} cy={24} r={22} stroke="#e5e7eb" strokeWidth={5} fill="none" />
                  <circle cx={24} cy={24} r={22} stroke="#2563eb" strokeWidth={5} fill="none"
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-blue-600">{pct}%</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-gray-800">{totalConcluidas}/{total} etapas</p>
                <p className="text-[8px] text-gray-400">concluídas</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-2 flex items-center gap-2">
            <ArrowRight className="h-3 w-3 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-[8.5px] font-semibold text-blue-800">Próxima etapa</p>
              <p className="text-[8px] text-blue-600">Cenário Externo</p>
            </div>
            <div className="ml-auto flex-shrink-0 bg-blue-600 text-white text-[7.5px] font-medium rounded px-1.5 py-0.5">
              Continuar
            </div>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 260 }}>
            {grupos.map((grupo) => (
              <div key={grupo.label}>
                <p className="text-[7.5px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{grupo.label}</p>
                <div className="flex flex-col gap-1">
                  {grupo.etapas.map((etapa) => {
                    const Icon = etapa.icone;
                    const isConcluido = etapa.status === "concluido";
                    const isIniciado = etapa.status === "iniciado";
                    return (
                      <div
                        key={etapa.nome}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 border ${
                          isIniciado
                            ? "bg-blue-50 border-blue-100"
                            : isConcluido
                            ? "bg-white border-gray-100"
                            : "bg-white border-gray-100 opacity-60"
                        }`}
                      >
                        {isConcluido ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        ) : isIniciado ? (
                          <CircleDot className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                        )}
                        <Icon className={`h-3 w-3 flex-shrink-0 ${isConcluido ? "text-green-500" : isIniciado ? "text-blue-500" : "text-gray-300"}`} />
                        <span className={`text-[8.5px] font-medium truncate ${isConcluido ? "text-gray-500 line-through" : isIniciado ? "text-blue-700" : "text-gray-400"}`}>
                          {etapa.nome}
                        </span>
                        {isConcluido && (
                          <span className="ml-auto text-[7px] text-green-600 font-semibold flex-shrink-0">Concluído</span>
                        )}
                        {isIniciado && (
                          <span className="ml-auto text-[7px] text-blue-600 font-semibold flex-shrink-0">Em progresso</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

const showcaseTabs = [
  { id: "jornada", label: "Roteiro Guiado", icon: Map, component: MockupJornada },
  { id: "home", label: "Painel Inicial", icon: Home, component: MockupHome },
  { id: "okrs", label: "Metas", icon: Target, component: MockupOKRs },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("jornada");
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
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
      <section className="relative overflow-hidden bg-[#020817]">
        {/* Aurora gradients — radial-gradient direto, sem filter:blur (evita clip do overflow-hidden) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 75% 70% at 5% 5%, rgba(99,102,241,0.55) 0%, transparent 70%),
              radial-gradient(ellipse 70% 65% at 95% 0%, rgba(56,189,248,0.45) 0%, transparent 70%),
              radial-gradient(ellipse 60% 70% at 50% 100%, rgba(168,85,247,0.38) 0%, transparent 70%)
            `,
            animation: "hero-orb-pulse 9s ease-in-out infinite",
          }}
        />
        {/* Dot grid sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='14' cy='14' r='1.5' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Scan line horizontal */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.35) 30%, rgba(56,189,248,0.35) 70%, transparent 100%)",
            animation: "hero-scan 10s ease-in-out infinite",
            animationDelay: "1s",
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
                  Consultoria estratégica embarcada na sua empresa
                </Badge>
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-5xl font-bold text-white leading-tight"
                data-testid="heading-hero"
              >
                O plano estratégico da sua empresa{" "}
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, #60a5fa 100%)" }}
                >
                  pronto em horas
                </span>
                , não em meses
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed" data-testid="text-hero-subtitle">Um Guia Estratégico conduz você por 12 passos — do diagnóstico ao acompanhamento — e a IA faz o trabalho pesado. Quando termina, ele se transforma no seu Assistente de gestão, monitorando o plano todo dia.</p>

              <div className="flex flex-wrap gap-3">
                {["SWOT", "PESTEL", "Cinco Forças", "BMC", "OKRs", "BSC"].map(tag => (
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
                <a href="#precos" data-testid="link-hero-ver-planos">
                  <Button size="lg" variant="outline" className="gap-2 text-base border-slate-600 text-slate-300 bg-transparent">
                    Ver planos
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
                <Link href="/login">
                  <Button size="lg" variant="ghost" className="gap-2 text-base text-slate-400" data-testid="button-hero-cta-login">
                    Fazer Login
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />7 dias grátis</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Sem cartão de crédito</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Configuração em minutos</span>
              </div>

              <div className="w-full mt-2">
                <HeroDiagramaIA />
              </div>
          </div>

          {/* Stats bar */}
          <div
            className="mt-16 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur p-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
            data-testid="section-hero-stats"
          >
            <div className="text-center">
              <div className="text-xl font-bold text-white">12 passos</div>
              <div className="text-xs text-slate-400 mt-0.5">Do diagnóstico à execução</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">7 frameworks</div>
              <div className="text-xs text-slate-400 mt-0.5">SWOT, PESTEL, BMC, OKR…</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">IA integrada</div>
              <div className="text-xs text-slate-400 mt-0.5">Em cada etapa do plano</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">100% PT-BR</div>
              <div className="text-xs text-slate-400 mt-0.5">Linguagem de empresário</div>
            </div>
          </div>
        </div>
      </section>
      {/* JORNADA ESTRATÉGICA */}
      <section className="py-20 bg-background" data-testid="section-jornada">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">
              <Map className="h-3.5 w-3.5 mr-1.5" />
              Roteiro completo em 12 passos
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Cada passo no lugar certo, na hora certa
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Você não precisa saber por onde começar. O sistema te guia do início ao fim — e a IA cuida da parte difícil.
            </p>
          </div>

          {/* Phase connector strip — desktop only */}
          <div className="hidden lg:flex items-center justify-center mb-8 gap-0 flex-wrap">
            {[
              { label: "Diagnóstico", num: "01", bg: "bg-blue-600", count: "2 etapas" },
              { label: "Mapa", num: "02", bg: "bg-amber-600", count: "4 etapas" },
              { label: "Plano de Ação", num: "03", bg: "bg-purple-600", count: "3 etapas" },
              { label: "Execução", num: "04", bg: "bg-green-600", count: "3 etapas" },
            ].map((fase, i, arr) => (
              <div key={fase.label} className="flex items-center">
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${fase.bg} text-white`}>
                  <span className="text-xs font-bold opacity-70">{fase.num}</span>
                  <span className="font-semibold text-sm">{fase.label}</span>
                  <span className="text-xs opacity-70 bg-white/20 rounded-full px-2 py-0.5">{fase.count}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex items-center">
                    <div className="h-px w-6 bg-border" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="h-px w-6 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="jornada-stepper">
            {[
              {
                faseNum: "01",
                faseLabel: "Diagnóstico",
                bg: "bg-blue-600",
                corBorda: "border-blue-100",
                corFundo: "bg-blue-50/40 dark:bg-blue-950/20",
                corIcone: "text-blue-600 bg-blue-100",
                corLinha: "bg-blue-200",
                etapas: [
                  { num: 1, nome: "Perfil da Empresa", icone: Target, desc: "A IA lê seu site e monta o perfil do negócio em minutos — toda análise dali em diante já sai personalizada para você" },
                  { num: 2, nome: "Diagnóstico Atual", icone: ClipboardList, desc: "Receita, crescimento, margem e satisfação na mesa: você descobre rapidamente onde a empresa realmente está hoje" },
                ],
              },
              {
                faseNum: "02",
                faseLabel: "Mapa",
                bg: "bg-amber-600",
                corBorda: "border-amber-100",
                corFundo: "bg-amber-50/40 dark:bg-amber-950/20",
                corIcone: "text-amber-600 bg-amber-100",
                corLinha: "bg-amber-200",
                etapas: [
                  { num: 3, nome: "Modelo de Negócio", icone: LayoutGrid, desc: "BMC pronto: clareza sobre como sua empresa gera valor, para quem e por qual canal — base para todas as decisões seguintes" },
                  { num: 4, nome: "Cenário Externo", icone: Globe2, desc: "PESTEL automatizado: a IA mostra o que mudou no mercado e o que isso significa em risco e oportunidade para você" },
                  { num: 5, nome: "Mercado e Concorrência", icone: Swords, desc: "Cinco Forças aplicado ao seu setor: descubra quem disputa seu cliente e onde está a brecha competitiva" },
                  { num: 6, nome: "Forças e Fraquezas", icone: GitBranch, desc: "SWOT consolidado de tudo que veio antes — pronto para virar plano, não relatório de gaveta" },
                ],
              },
              {
                faseNum: "03",
                faseLabel: "Plano de Ação",
                bg: "bg-purple-600",
                corBorda: "border-purple-100",
                corFundo: "bg-purple-50/40 dark:bg-purple-950/20",
                corIcone: "text-purple-600 bg-purple-100",
                corLinha: "bg-purple-200",
                etapas: [
                  { num: 7, nome: "Estratégias", icone: Flag, desc: "A IA cruza seu SWOT e propõe estratégias priorizadas — você só decide quais entram no plano" },
                  { num: 8, nome: "Oportunidades de Crescimento", icone: TrendingUp, desc: "Matriz de Ansoff aplicada: penetração, novos mercados ou novos produtos. Qual rota faz mais sentido para você agora" },
                  { num: 9, nome: "Iniciativas Prioritárias", icone: Briefcase, desc: "Estratégia vira execução: cada projeto sai com responsável, prazo e impacto esperado. Plano que de fato roda" },
                ],
              },
              {
                faseNum: "04",
                faseLabel: "Execução",
                bg: "bg-green-600",
                corBorda: "border-green-100",
                corFundo: "bg-green-50/40 dark:bg-green-950/20",
                corIcone: "text-green-600 bg-green-100",
                corLinha: "bg-green-200",
                etapas: [
                  { num: 10, nome: "Metas e Resultados", icone: Rocket, desc: "OKRs gerados pela IA, conectados às suas estratégias. Cada meta com resultado-chave mensurável e dono claro" },
                  { num: 11, nome: "Indicadores de Performance", icone: BarChart3, desc: "Balanced Scorecard nas 4 perspectivas: Finanças, Clientes, Processos e Pessoas. Semáforo automático mostra onde agir primeiro" },
                  { num: 12, nome: "Acompanhamento", icone: Activity, desc: "Rituais semanais, mensais e trimestrais com pauta gerada pela IA. O plano fica vivo — e o Guia vira seu Assistente diário" },
                ],
              },
            ].map((grupo) => (
              <div key={grupo.faseLabel} className={`rounded-xl border ${grupo.corBorda} ${grupo.corFundo} p-5 flex flex-col gap-0`} data-testid={`stepper-fase-${grupo.faseNum}`}>
                {/* Mobile phase header */}
                <div className={`lg:hidden flex items-center gap-2 mb-4 ${grupo.bg} text-white rounded-lg px-3 py-2`}>
                  <span className="text-xs font-bold opacity-70">{grupo.faseNum}</span>
                  <span className="font-semibold text-sm">{grupo.faseLabel}</span>
                </div>

                {/* Steps with connecting vertical line */}
                <div className="flex flex-col">
                  {grupo.etapas.map((etapa, idx) => {
                    const Icon = etapa.icone;
                    const isLast = idx === grupo.etapas.length - 1;
                    return (
                      <div key={etapa.num} className="flex items-start gap-3">
                        {/* Connector column: step bullet + vertical line */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${grupo.corIcone}`}>
                            {etapa.num}
                          </div>
                          {!isLast && <div className={`w-px flex-1 min-h-[20px] mt-1 mb-1 ${grupo.corLinha}`} />}
                        </div>
                        {/* Step content */}
                        <div className={`flex items-start gap-2 ${isLast ? "pb-0" : "pb-4"}`}>
                          <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${grupo.corIcone.split(" ")[0]}`} />
                          <div>
                            <p className="text-sm font-medium leading-tight">{etapa.nome}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{etapa.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              A IA cuida da análise e das recomendações — você foca nas decisões que importam para o seu negócio.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2" data-testid="button-jornada-cta">
                Começar agora — é grátis por 7 dias
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      {/* PROBLEMA / SOLUÇÃO */}
      <section className="py-20 bg-muted/30" data-testid="section-pains">
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
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">O que está incluído</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tudo que você precisa para crescer com clareza</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma plataforma completa que organiza a gestão da sua empresa — da análise ao acompanhamento — com inteligência artificial em cada etapa.
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
      {/* PRODUTO EM AÇÃO */}
      <section className="py-20 bg-slate-950 border-t border-white/5" data-testid="section-showcase">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-sm px-4 py-1 bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Veja o produto em ação
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simples de usar, poderoso nos resultados
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              O sistema te conduz passo a passo — você responde, a IA trabalha, e no final você tem um plano estratégico completo para sua empresa.
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
            <div className="relative max-w-3xl mx-auto" style={{ zoom: 0.7 }}>
              <ActiveMockup />
            </div>
          </div>
        </div>
      </section>
      {/* COMO FUNCIONA */}
      <section className="py-20 bg-background" data-testid="section-how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Como funciona</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Do zero ao plano completo em 3 passos</h2>
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
            <h2 className="text-3xl font-bold mb-3">Planejamento profissional ao alcance de qualquer empresa</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Metodologias usadas pelas maiores empresas do mundo, agora acessíveis para o seu negócio — de forma simples e guiada.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Compass,
                title: "Consultoria estratégica embarcada",
                desc: "Em vez de contratar um consultor por meses, você ganha um Guia que te leva por todas as etapas — e depois um Assistente que continua te apoiando todo dia.",
              },
              {
                icon: Zap,
                title: "Metodologias que grandes empresas usam",
                desc: "SWOT, PESTEL, Cinco Forças, BMC, OKR e Balanced Scorecard aplicados ao seu negócio com a IA traduzindo cada framework em recomendações práticas — sem jargão.",
              },
              {
                icon: Shield,
                title: "Consulting Now por trás de cada análise",
                desc: "A plataforma é desenhada por consultores de gestão da Consulting Now. A experiência de quem já implantou planos estratégicos em centenas de empresas, agora dentro do seu computador.",
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
                Guia hoje, Assistente para sempre
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Uma IA que constrói o plano com você — e depois cuida dele todo dia
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Enquanto você monta a estratégia, o <span className="text-white font-medium">Guia Estratégico</span> indica o próximo passo, gera análises e preenche cada framework. Quando o plano está pronto, ele se transforma no seu <span className="text-white font-medium">Assistente</span>: lê seus indicadores, alerta sobre desvios e sugere a próxima decisão.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Lê o site da empresa e monta o perfil do negócio em minutos",
                  "Gera SWOT, PESTEL, Cinco Forças e BMC com recomendações priorizadas",
                  "Conecta estratégias, OKRs e indicadores para que tudo conversa entre si",
                  "Vira Assistente diário: monitora o plano, alerta desvios e propõe ajustes",
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
                  { title: "Perfil Automático", desc: "A IA lê seu site e monta o perfil do negócio", tag: "Automático", color: "text-emerald-400" },
                  { title: "Metas sob Medida", desc: "Objetivos e indicadores alinhados ao seu mercado", tag: "Personalizado", color: "text-blue-400" },
                  { title: "Diagnóstico Cruzado", desc: "Descobre oportunidades combinando diferentes análises", tag: "Estratégico", color: "text-purple-400" },
                  { title: "Linguagem Clara", desc: "Relatórios diretos, sem jargão — prontos para decidir", tag: "Executivo", color: "text-amber-400" },
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
      {/* PLANOS E PREÇOS */}
      <section id="precos" className="py-20 bg-background border-t" data-testid="section-precos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1">Planos e Preços</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Escolha o plano certo para o seu negócio</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Assine diretamente ou comece com 7 dias grátis. Sem cartão de crédito.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Start */}
            <Card className="flex flex-col" data-testid="card-plano-start">
              <CardContent className="p-6 flex flex-col gap-5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1">Start</Badge>
                </div>
                <div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold" data-testid="text-preco-start">R$ 187</span>
                    <span className="text-muted-foreground text-sm mb-1">/mês</span>
                  </div>
                  <p className="text-muted-foreground text-sm">Para o dono que está organizando a estratégia da empresa pela primeira vez — sai do achismo com método.</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {[
                    "1 usuário por empresa",
                    "Roteiro completo em 12 passos",
                    "IA com custo-benefício otimizado",
                    "SWOT, PESTEL, BMC, OKRs",
                    "Relatórios estratégicos em PDF",
                    "Suporte por e-mail",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register?plano=start">
                  <Button className="w-full gap-2" variant="outline" data-testid="button-plano-start-cta">
                    Assinar Start
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro — Highlighted */}
            <Card className="flex flex-col border-primary relative" data-testid="card-plano-pro">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="px-3 py-1 text-xs font-semibold shadow-sm" data-testid="badge-mais-popular">Mais popular</Badge>
              </div>
              <CardContent className="p-6 flex flex-col gap-5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge className="text-sm px-3 py-1 bg-primary text-primary-foreground">Pro</Badge>
                </div>
                <div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold" data-testid="text-preco-pro">R$ 490</span>
                    <span className="text-muted-foreground text-sm mb-1">/mês</span>
                  </div>
                  <p className="text-muted-foreground text-sm">Para empresas em crescimento que precisam alinhar diretoria, gerentes e equipe no mesmo plano — colaboração real e IA premium.</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {[
                    "Usuários ilimitados",
                    "Tudo do plano Start",
                    "Modelos de IA mais potentes (GPT-4 / análise profunda)",
                    "Colaboração em equipe",
                    "Benchmarking setorial avançado",
                    "Suporte prioritário",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register?plano=pro">
                  <Button className="w-full gap-2" size="lg" data-testid="button-plano-pro-cta">
                    Assinar Pro
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="flex flex-col" data-testid="card-plano-enterprise">
              <CardContent className="p-6 flex flex-col gap-5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1">Enterprise</Badge>
                </div>
                <div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold" data-testid="text-preco-enterprise">Sob consulta</span>
                  </div>
                  <p className="text-muted-foreground text-sm">Para corporações que precisam de infraestrutura dedicada, segurança máxima e atendimento sob medida com gerente de sucesso.</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {[
                    "Usuários ilimitados",
                    "Tudo do plano Pro",
                    "Infraestrutura dedicada (on-premise)",
                    "Segurança máxima de dados",
                    "SLA personalizado",
                    "Gerente de sucesso dedicado",
                    "Treinamento e onboarding",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => setEnterpriseOpen(true)}
                  data-testid="button-plano-enterprise-cta"
                >
                  <Phone className="h-4 w-4" />
                  Falar com especialista
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              Teste gratuito de 7 dias disponível ao criar uma conta — sem cartão de crédito
            </p>
            <p className="text-sm text-muted-foreground">
              Dúvidas?{" "}
              <a href="#contato" className="underline underline-offset-4 hover:text-foreground transition-colors" data-testid="link-precos-faq">
                Veja o FAQ
              </a>
              {" "}ou{" "}
              <a href="#contato" className="underline underline-offset-4 hover:text-foreground transition-colors" data-testid="link-precos-fale-conosco">
                fale conosco
              </a>
            </p>
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
            Sua próxima reunião pode ter um plano de verdade na mesa
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-2xl">
            Em uma tarde, o Guia Estratégico te leva do diagnóstico ao plano de ação. Em uma semana, vira o Assistente que mantém tudo rodando. Comece grátis e veja a diferença antes de pagar nada.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold" data-testid="button-cta-final">
                Começar Período de Testes
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <a href="#precos" className="text-primary-foreground/80 hover:text-primary-foreground text-sm flex items-center gap-1.5 transition-colors" data-testid="link-cta-ver-planos">
            Ver todos os planos
            <ArrowRight className="h-4 w-4" />
          </a>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Completo e fácil de usar</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Configuração em minutos</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Cancele quando quiser</span>
          </div>
        </div>
      </section>
      {/* CONTATO */}
      <section id="contato" className="py-16 bg-muted/30 border-t" data-testid="section-contato">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Quer conversar antes de começar?</h2>
          <p className="text-muted-foreground mb-10">
            Nossa equipe está pronta para tirar suas dúvidas e ajudar você a dar o próximo passo.
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

      <EnterpriseContactModal open={enterpriseOpen} onOpenChange={setEnterpriseOpen} />
    </div>
  );
}

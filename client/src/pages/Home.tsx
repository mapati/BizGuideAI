import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { JornadaEstrategica } from "@/components/JornadaEstrategica";
import { PulseMercado } from "@/components/PulseMercado";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CircularProgress } from "@/components/CircularProgress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  DollarSign,
  Users,
  Cog,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  Loader2,
  Target,
  BarChart3,
  Activity,
  ChevronRight,
  Compass,
  Map,
  Zap,
  Globe2,
  Clock,
} from "lucide-react";

import { Link } from "wouter";
import type { Empresa, Objetivo, ResultadoChave, Indicador, Evento, Ritual } from "@shared/schema";

const INTRO_DISMISSED_KEY = (userId: string) => `biz-guide-intro-dismissed-${userId}`;
// Data de lançamento desta feature de boas-vindas (17/04/2026).
// Usuários cujo createdAt é anterior a esta data são tratados como "legados":
// o painel nunca é exibido para eles (a chave de dismissal é gravada automaticamente).
// Não altere esta data — ela garante que usuários já ativos não vejam o painel retroativamente.
const INTRO_FEATURE_RELEASE_DATE = new Date("2026-04-17T00:00:00.000Z");

interface Diagnostico {
  saudePlano: number;
  resumoExecutivo: string;
  pontosFortes: string[];
  pontosAtencao: string[];
  riscos: string[];
  recomendacoes: string[];
}

const PERSPECTIVAS = [
  { nome: "Financeira", value: "Financeira", icon: DollarSign, cor: "text-green-600 bg-green-50 dark:bg-green-950/30" },
  { nome: "Clientes", value: "Clientes", icon: Users, cor: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  { nome: "Processos", value: "Processos Internos", icon: Cog, cor: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" },
  { nome: "Pessoas", value: "Aprendizado e Crescimento", icon: GraduationCap, cor: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
];

const TIPO_EVENTO_LABELS: Record<string, string> = {
  reuniao_conselho: "Reunião de Conselho",
  fato_relevante: "Fato Relevante",
  mudanca_estrategica: "Mudança Estratégica",
  marco_projeto: "Marco de Projeto",
  crise: "Crise",
  oportunidade: "Oportunidade",
  fato_excepcional: "Fato Excepcional",
  mudanca_estrategia: "Mudança de Estratégia",
  revisao_plano: "Revisão do Plano",
  outro: "Outro",
};

type LucideIcon = React.ComponentType<{ className?: string }>;

const RITUAIS_HOME_CONFIG: Record<string, { nome: string; icon: LucideIcon }> = {
  diario:      { nome: "Ritual Diário",      icon: Clock },
  semanal:     { nome: "Ritual Semanal",     icon: Calendar },
  mensal:      { nome: "Ritual Mensal",      icon: BarChart3 },
  trimestral:  { nome: "Ritual Trimestral",  icon: Target },
};

function calcularProgressoKR(kr: ResultadoChave): number {
  const inicial = parseFloat(kr.valorInicial);
  const atual = parseFloat(kr.valorAtual);
  const alvo = parseFloat(kr.valorAlvo);
  if (isNaN(inicial) || isNaN(atual) || isNaN(alvo)) return 0;
  if (inicial === alvo) return 100;
  return Math.max(0, Math.min(100, ((atual - inicial) / (alvo - inicial)) * 100));
}

function getSaudeCor(saude: number): { label: string; className: string } {
  if (saude >= 70) return { label: "Excelente", className: "text-green-600" };
  if (saude >= 30) return { label: "Atenção", className: "text-yellow-600" };
  return { label: "Crítico", className: "text-red-600" };
}

function JornadaEstrategicaCondicional() {
  const progresso = useJornadaProgresso();
  if (progresso.isLoading) return null;
  if (progresso.jornadaConcluida) {
    return <JornadaEstrategica progresso={progresso} defaultOpen={false} />;
  }
  if (progresso.totalConcluidas < 6) {
    return <JornadaEstrategica progresso={progresso} defaultOpen={false} />;
  }
  return <JornadaEstrategica progresso={progresso} defaultOpen={false} compact />;
}

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showIntroPanel, setShowIntroPanel] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      setShowWelcome(true);
      setLocation("/dashboard", { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const key = INTRO_DISMISSED_KEY(user.id);
    // Usuários já existentes (criados antes do lançamento da feature) não veem o painel.
    if (user.createdAt) {
      const createdAt = new Date(user.createdAt);
      if (createdAt < INTRO_FEATURE_RELEASE_DATE) {
        localStorage.setItem(key, "1");
        return;
      }
    }
    // Se o DB já registrou o dismissal, sincroniza no localStorage como cache
    if (user.introBoasVindasDismissed) {
      localStorage.setItem(key, "1");
      return;
    }
    if (!localStorage.getItem(key)) {
      setShowIntroPanel(true);
    }
  }, [user?.id, user?.introBoasVindasDismissed]);

  const dismissIntroPanel = () => {
    if (!user?.id) return;
    localStorage.setItem(INTRO_DISMISSED_KEY(user.id), "1");
    setShowIntroPanel(false);
    apiRequest("PATCH", "/api/auth/preferencias", { introBoasVindasDismissed: true }).catch((err) => {
      console.warn("[Home] Falha ao persistir dismissal do painel de boas-vindas:", err);
    });
  };

  const { data: empresa } = useQuery<Empresa>({ queryKey: ["/api/empresa"] });
  const empresaId = empresa?.id;

  const { data: objetivos = [], isLoading: loadingObjetivos } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  const { data: indicadores = [], isLoading: loadingIndicadores } = useQuery<Indicador[]>({
    queryKey: ["/api/indicadores"],
    enabled: !!empresaId,
  });

  const { data: eventos = [], isLoading: loadingEventos } = useQuery<Evento[]>({
    queryKey: ["/api/eventos"],
    enabled: !!empresaId,
  });

  const { data: rituais = [], isLoading: loadingRituais } = useQuery<Ritual[]>({
    queryKey: ["/api/rituais"],
    enabled: !!empresaId,
  });

  const { data: cenarioAtual, isLoading: loadingCenario } = useQuery<{ texto: string; atualizadoEm: string | null } | null>({
    queryKey: ["/api/contexto-macro/cenario-atual"],
    enabled: !!empresaId,
  });

  const krQueries = useQueries({
    queries: objetivos.map((obj) => ({
      queryKey: [`/api/resultados-chave/${obj.id}`],
      enabled: !!obj.id,
    })),
  });

  const allKRs: ResultadoChave[] = useMemo(
    () => krQueries.flatMap((q) => (q.data as ResultadoChave[]) || []),
    [krQueries]
  );

  const loadingKRs = krQueries.some((q) => q.isLoading);

  const calcularPerformanceObjetivo = (objId: string): number => {
    const krs = allKRs.filter((kr) => kr.objetivoId === objId);
    if (krs.length === 0) return 0;
    return krs.reduce((acc, kr) => acc + calcularProgressoKR(kr), 0) / krs.length;
  };

  const performanceGeral = useMemo(() => {
    const comKRs = objetivos.filter((obj) => allKRs.some((kr) => kr.objetivoId === obj.id));
    if (comKRs.length === 0) return 0;
    return Math.round(
      comKRs.reduce((acc, obj) => acc + calcularPerformanceObjetivo(obj.id), 0) / comKRs.length
    );
  }, [objetivos, allKRs]);

  const perspActivaData = useMemo(() =>
    PERSPECTIVAS.map((p) => {
      const objs = objetivos.filter((o) => o.perspectiva === p.value);
      const comKRs = objs.filter((o) => allKRs.some((kr) => kr.objetivoId === o.id));
      const media =
        comKRs.length === 0
          ? 0
          : Math.round(
              comKRs.reduce((acc, o) => acc + calcularPerformanceObjetivo(o.id), 0) / comKRs.length
            );
      return { ...p, numObjetivos: objs.length, comKRs: comKRs.length, media };
    }),
    [objetivos, allKRs]
  );

  const kpiVerde = indicadores.filter((i) => i.status === "verde").length;
  const kpiAmarelo = indicadores.filter((i) => i.status === "amarelo").length;
  const kpiVermelho = indicadores.filter((i) => i.status === "vermelho").length;
  const kpisCriticos = indicadores.filter((i) => i.status === "vermelho");

  const ultimoEvento = useMemo(
    () =>
      eventos.length > 0
        ? [...eventos].sort((a, b) => new Date(b.dataEvento).getTime() - new Date(a.dataEvento).getTime())[0]
        : null,
    [eventos]
  );

  const diagnosticoMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/ai/diagnostico-estrategico"),
    onSuccess: (data) => {
      if (data?.diagnostico) {
        setDiagnostico(data.diagnostico);
        toast({ title: "Diagnóstico gerado!", description: "Análise estratégica concluída pela IA." });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao gerar diagnóstico",
        description: "Não foi possível gerar o diagnóstico. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingObjetivos || loadingKRs || loadingIndicadores;

  const hoje = new Date();
  const saudeCor = diagnostico ? getSaudeCor(diagnostico.saudePlano) : null;

  const totalKRs = allKRs.length;
  const hasData = objetivos.length > 0 || indicadores.length > 0;

  return (
    <div className="space-y-6">
      {/* Header — sempre no topo */}
      <div className="flex flex-wrap items-center gap-5">
        {empresa?.logoUrl && (
          <div className="flex-shrink-0">
            <img
              src={empresa.logoUrl}
              alt={`Logotipo ${empresa.nome}`}
              className="object-contain w-auto"
              style={{ maxHeight: "56px", maxWidth: "160px" }}
              data-testid="img-empresa-logo"
            />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-home-title">
            {user ? `Olá, ${user.nome}` : "Início"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {hoje.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {showIntroPanel && (
        <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10" data-testid="card-intro-boas-vindas">
          <div className="p-6 space-y-5">
            {/* Saudação */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  Bem-vindo ao BizGuideAI{user?.nome ? `, ${user.nome.split(" ")[0]}` : ""}!
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Você está a poucos passos de construir a estratégia completa da sua empresa — de forma guiada e com apoio de inteligência artificial em cada etapa.
                </p>
              </div>
            </div>

            {/* Jornada Estratégica */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary flex-shrink-0" />
                <span>A Jornada Estratégica Guiada</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                A jornada é composta por <span className="font-medium text-foreground">12 etapas sequenciais</span>, cada uma construindo sobre a anterior. As etapas se desbloqueiam progressivamente conforme você avança — assim você segue um caminho estruturado, sem perder o fio da meada. Em cada etapa, a IA sugere benchmarks, identifica lacunas e gera diagnósticos automáticos para acelerar o seu trabalho.
              </p>
              <p className="text-sm text-muted-foreground pl-6">
                Você começa pelo <span className="font-medium text-foreground">Perfil da Empresa</span> e avança por diagnóstico, análise de mercado, modelo de negócio, estratégias, metas e acompanhamento. O painel de progresso acima da jornada mostra onde você está a qualquer momento.
              </p>
            </div>

            {/* Grupos da sidebar */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">O que você encontra nos menus da barra lateral:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0">
                <div className="flex items-start gap-3 rounded-md bg-background/60 p-3">
                  <Compass className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Mapa de Contexto</p>
                    <p className="text-xs text-muted-foreground">Cenário externo, mercado e concorrência, modelo de negócio e forças &amp; fraquezas.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-md bg-background/60 p-3">
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Apostas Estratégicas</p>
                    <p className="text-xs text-muted-foreground">Estratégias definidas, oportunidades de crescimento e iniciativas prioritárias.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-md bg-background/60 p-3">
                  <Map className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Execução e Marcha</p>
                    <p className="text-xs text-muted-foreground">Metas e resultados (OKRs), indicadores de performance e rituais de acompanhamento.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-md bg-background/60 p-3">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Análise Avançada</p>
                    <p className="text-xs text-muted-foreground">Cenários estratégicos, gestão de riscos, rastreabilidade, alertas e exportação.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkbox "Não mostrar isso novamente" */}
            <div className="pt-1 border-t">
              <label
                htmlFor="check-intro-dismiss"
                className="flex items-center gap-2.5 cursor-pointer w-fit"
                data-testid="label-nao-mostrar-novamente"
              >
                <Checkbox
                  id="check-intro-dismiss"
                  data-testid="checkbox-nao-mostrar-novamente"
                  onCheckedChange={(checked) => {
                    if (checked) dismissIntroPanel();
                  }}
                />
                <span className="text-sm text-muted-foreground select-none">
                  Não mostrar isso novamente
                </span>
              </label>
            </div>
          </div>
        </Card>
      )}

      {showWelcome && (
        <Card className="p-5 border-primary/20 bg-primary/5 dark:bg-primary/10" data-testid="card-boas-vindas">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-base">
                Bem-vindo à Jornada Estratégica, {user?.nome?.split(" ")[0] || ""}!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Seu perfil foi criado com sucesso. Agora siga as etapas abaixo para construir a estratégia completa da sua empresa — a IA estará com você em cada passo.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowWelcome(false)}
              data-testid="button-fechar-boas-vindas"
              className="flex-shrink-0"
            >
              ×
            </Button>
          </div>
        </Card>
      )}
      <PulseMercado />
      <JornadaEstrategicaCondicional />

      {/* Performance Geral + OKRs por Perspectiva */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Performance Geral */}
        <Card className="p-6 lg:col-span-2 flex flex-col items-center justify-center gap-4" data-testid="card-performance-geral">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground self-start w-full">
            <TrendingUp className="h-4 w-4" />
            <span>Performance Geral das Metas</span>
          </div>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : objetivos.length === 0 ? (
            <div className="text-center space-y-2">
              <Target className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum objetivo cadastrado</p>
              <Link href="/okrs">
                <Button size="sm" variant="outline" data-testid="button-go-okrs">
                  Criar Metas
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <CircularProgress value={performanceGeral} size={120} strokeWidth={12} />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {objetivos.length} objetivo{objetivos.length !== 1 ? "s" : ""} · {totalKRs} meta{totalKRs !== 1 ? "s" : ""} de resultado
                </p>
              </div>
            </>
          )}
        </Card>

        {/* OKRs por Perspectiva */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          {perspActivaData.map((p) => {
            const Icon = p.icon;
            return (
              <Card
                key={p.value}
                className="p-4 flex flex-col gap-3"
                data-testid={`card-perspectiva-${p.value}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${p.cor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">{p.nome}</span>
                </div>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : p.numObjetivos === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem objetivos</p>
                ) : (
                  <>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold" data-testid={`text-progresso-${p.value}`}>
                        {p.comKRs > 0 ? `${p.media}%` : "—"}
                      </span>
                      {p.comKRs > 0 && (
                        <span className="text-xs text-muted-foreground mb-1">progresso</span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{ width: `${p.comKRs > 0 ? p.media : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.numObjetivos} objetivo{p.numObjetivos !== 1 ? "s" : ""}
                      {p.comKRs < p.numObjetivos && ` · ${p.numObjetivos - p.comKRs} sem métricas`}
                    </p>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* KPIs + Cenário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPIs */}
        <Card className="p-5" data-testid="card-kpis">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Indicadores do Negócio</h3>
            </div>
            <Link href="/indicadores">
              <Button size="sm" variant="ghost" data-testid="button-ver-indicadores">
                Ver todos
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          {loadingIndicadores ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : indicadores.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">Nenhum indicador cadastrado</p>
              <Link href="/indicadores">
                <Button size="sm" variant="outline" data-testid="button-criar-indicadores">
                  Criar indicadores
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm font-semibold" data-testid="text-kpi-verde">{kpiVerde}</span>
                  <span className="text-xs text-muted-foreground">verde</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm font-semibold" data-testid="text-kpi-amarelo">{kpiAmarelo}</span>
                  <span className="text-xs text-muted-foreground">atenção</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold" data-testid="text-kpi-vermelho">{kpiVermelho}</span>
                  <span className="text-xs text-muted-foreground">crítico</span>
                </div>
              </div>
              {kpisCriticos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                    Indicadores críticos
                  </p>
                  {kpisCriticos.slice(0, 3).map((kpi) => (
                    <div
                      key={kpi.id}
                      className="flex items-start justify-between gap-2 text-sm p-2 rounded-md bg-red-50 dark:bg-red-950/20"
                      data-testid={`item-kpi-critico-${kpi.id}`}
                    >
                      <span className="font-medium text-sm leading-tight">{kpi.nome}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {kpi.atual} / {kpi.meta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Cenário Brasileiro Atual */}
        <Card className="p-5" data-testid="card-cenario-brasileiro">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Cenário Brasileiro Atual</h3>
            </div>
            <Link href="/contexto-macro">
              <Button size="sm" variant="ghost" data-testid="button-ver-contexto-macro">
                Motor de Contexto
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          {loadingCenario ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : !cenarioAtual ? (
            <div className="text-center py-4 space-y-2">
              <Globe2 className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Contexto macroeconômico ainda não gerado.</p>
              <Link href="/contexto-macro">
                <Button size="sm" variant="outline" data-testid="button-ir-motor-contexto">
                  Gerar no Motor de Contexto
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              {cenarioAtual.atualizadoEm && (
                <p className="text-xs text-muted-foreground mb-3">
                  Atualizado em{" "}
                  {new Date(cenarioAtual.atualizadoEm).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              <div className="max-h-48 overflow-y-auto pr-1">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line" data-testid="text-cenario-brasileiro">
                  {cenarioAtual.texto}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Rituais de Gestão */}
      <Card className="p-5" data-testid="card-rituais-gestao">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Rituais de Gestão</h3>
          </div>
          <Link href="/acompanhamento">
            <Button size="sm" variant="ghost" data-testid="button-ver-acompanhamento">
              Ver acompanhamento
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        {(loadingRituais || loadingEventos) ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : rituais.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <Circle className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum ritual de gestão configurado</p>
            <Link href="/acompanhamento">
              <Button size="sm" variant="outline" data-testid="button-configurar-rituais">
                Configurar rituais
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {rituais.map((ritual) => {
              const config = RITUAIS_HOME_CONFIG[ritual.tipo] ?? { nome: ritual.tipo, icon: Calendar };
              const RitualIcon = config.icon;
              const atrasado = ritual.dataProximo && new Date(ritual.dataProximo) < hoje;
              return (
                <div
                  key={ritual.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-muted/40"
                  data-testid={`item-ritual-${ritual.id}`}
                >
                  <RitualIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{config.nome}</span>
                      {atrasado && (
                        <Badge variant="destructive" className="text-xs">
                          Atrasado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Último:{" "}
                      {ritual.dataUltimo
                        ? new Date(ritual.dataUltimo).toLocaleDateString("pt-BR")
                        : "Nunca"}
                      {" · "}
                      Próximo:{" "}
                      {new Date(ritual.dataProximo).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {ultimoEvento && (
          <>
            <div className="my-4 border-t border-border" />
            <div className="flex items-start gap-3" data-testid={`item-ultimo-evento-${ultimoEvento.id}`}>
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Último evento estratégico</p>
                <p className="font-medium text-sm truncate">{ultimoEvento.titulo}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {TIPO_EVENTO_LABELS[ultimoEvento.tipo] || ultimoEvento.tipo}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ultimoEvento.dataEvento).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Diagnóstico IA */}
      <Card className="p-6" data-testid="card-diagnostico-ia">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Diagnóstico Estratégico com IA</h3>
              <p className="text-sm text-muted-foreground">
                Análise completa de metas, indicadores e eventos para um relatório executivo do plano
              </p>
            </div>
          </div>
          <Button
            onClick={() => diagnosticoMutation.mutate()}
            disabled={diagnosticoMutation.isPending || !hasData}
            data-testid="button-gerar-diagnostico"
          >
            {diagnosticoMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {diagnostico ? "Atualizar Diagnóstico" : "Gerar Diagnóstico"}
              </>
            )}
          </Button>
        </div>

        {!hasData && !diagnosticoMutation.isPending && (
          <div className="mt-4 p-4 rounded-md bg-muted/40 text-sm text-muted-foreground text-center">
            Cadastre objetivos ou indicadores para gerar o diagnóstico estratégico.
          </div>
        )}

        {diagnostico && (
          <div className="mt-6 space-y-6" data-testid="section-diagnostico-resultado">
            {/* Saúde do Plano */}
            <div className="flex items-center gap-4 p-4 rounded-md bg-muted/40">
              <CircularProgress value={diagnostico.saudePlano} size={80} strokeWidth={8} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Saúde do Plano
                </p>
                <p
                  className={`text-2xl font-bold ${saudeCor?.className}`}
                  data-testid="text-saude-plano"
                >
                  {diagnostico.saudePlano}% — {saudeCor?.label}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                  {diagnostico.resumoExecutivo}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pontos Fortes */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Pontos Fortes
                </p>
                <ul className="space-y-1.5" data-testid="list-pontos-fortes">
                  {diagnostico.pontosFortes.map((p, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pontos de Atenção */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Pontos de Atenção
                </p>
                <ul className="space-y-1.5" data-testid="list-pontos-atencao">
                  {diagnostico.pontosAtencao.map((p, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Riscos */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Riscos Identificados
                </p>
                <ul className="space-y-1.5" data-testid="list-riscos">
                  {diagnostico.riscos.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recomendações */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Recomendações Prioritárias
                </p>
                <ul className="space-y-1.5" data-testid="list-recomendacoes">
                  {diagnostico.recomendacoes.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="font-bold text-primary flex-shrink-0">{i + 1}.</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

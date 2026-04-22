import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PulseMercado } from "@/components/PulseMercado";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircularProgress } from "@/components/CircularProgress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  DollarSign,
  Users,
  Cog,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Check,
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
  Clock,
  FileDown,
  RefreshCw,
} from "lucide-react";
import jsPDF from "jspdf";

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

function exportarDiagnosticoPDF(
  diag: Diagnostico,
  nomeEmpresa: string,
  geradoEm: Date
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = (needed = 10) => {
    if (y + needed > 280) { doc.addPage(); y = margin; }
  };

  const addSection = (title: string, items: string[], bullet = "•") => {
    checkPage(14);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    items.forEach((item, idx) => {
      const prefix = bullet === "num" ? `${idx + 1}.  ` : `${bullet}  `;
      const lines = doc.splitTextToSize(`${prefix}${item}`, contentW - 4);
      checkPage(lines.length * 5 + 3);
      doc.text(lines, margin + 3, y);
      y += lines.length * 5 + 2;
    });
    y += 4;
  };

  // ── Header ──
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Diagnóstico Estratégico com IA", margin, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(nomeEmpresa, margin, 16.5);
  doc.text(
    `Gerado em ${geradoEm.toLocaleDateString("pt-BR")} às ${geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    pageW - margin,
    16.5,
    { align: "right" }
  );
  y = 32;

  // ── Saúde do Plano ──
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const saudeLbl = getSaudeCor(diag.saudePlano);
  doc.text(`Saúde do Plano: ${diag.saudePlano}% — ${saudeLbl.label}`, margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const resumoLines = doc.splitTextToSize(diag.resumoExecutivo, contentW);
  doc.text(resumoLines, margin, y);
  y += resumoLines.length * 5 + 8;

  addSection("Pontos Fortes", diag.pontosFortes);
  addSection("Pontos de Atenção", diag.pontosAtencao);
  addSection("Riscos Identificados", diag.riscos);
  addSection("Recomendações Prioritárias", diag.recomendacoes, "num");

  // ── Footer ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`BizGuideAI  ·  ${nomeEmpresa}  ·  Página ${p}/${pages}`, pageW / 2, 290, { align: "center" });
  }

  const fileName = `diagnostico-estrategico-${geradoEm.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showIntroPanel, setShowIntroPanel] = useState(false);
  const [, setLocation] = useLocation();
  const [concluirRitualId, setConcluirRitualId] = useState<string | null>(null);
  const [concluirData, setConcluirData] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [concluirNota, setConcluirNota] = useState<string>("");

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

  const concluirRitualMutation = useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: string }) => {
      const dataUltimo = new Date(concluirData + "T12:00:00");
      const dataProximo = new Date(dataUltimo);

      if (tipo === "diario") {
        dataProximo.setDate(dataProximo.getDate() + 1);
      } else if (tipo === "semanal") {
        dataProximo.setDate(dataProximo.getDate() + 7);
      } else if (tipo === "mensal") {
        dataProximo.setMonth(dataProximo.getMonth() + 1);
      } else if (tipo === "trimestral") {
        dataProximo.setMonth(dataProximo.getMonth() + 3);
      } else {
        dataProximo.setDate(dataProximo.getDate() + 30);
      }

      return apiRequest("PATCH", `/api/rituais/${id}`, {
        dataUltimo: dataUltimo.toISOString(),
        dataProximo: dataProximo.toISOString(),
        completado: "true",
        ...(concluirNota.trim() ? { notas: concluirNota.trim() } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rituais"] });
      setConcluirRitualId(null);
      setConcluirNota("");
      setConcluirData(new Date().toISOString().split("T")[0]);
      toast({ title: "Ritual concluído!", description: "O próximo agendamento foi atualizado." });
    },
    onError: () => {
      toast({ title: "Erro ao concluir ritual", variant: "destructive" });
    },
  });

  const isLoading = loadingObjetivos || loadingKRs || loadingIndicadores;

  const { etapas, isLoading: jornadaLoading } = useJornadaProgresso();

  const isEtapaBloqueada = (id: string): boolean => {
    if (jornadaLoading) return false;
    const etapa = etapas.find((e) => e.id === id);
    return !!(etapa?.bloqueadaPor && etapa.bloqueadaPor.length > 0);
  };

  const okrsBloqueado = isEtapaBloqueada("okrs");
  const indicadoresBloqueado = isEtapaBloqueada("indicadores");
  const acompanhamentoBloqueado = isEtapaBloqueada("acompanhamento");

  const hoje = new Date();

  const totalKRs = allKRs.length;

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
      <MeuPainelStrip />
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
                  O BizGuideAI transforma o planejamento estratégico em uma jornada guiada — do diagnóstico ao acompanhamento das metas — com inteligência artificial sugerindo, analisando e gerando conteúdo a cada passo.
                </p>
              </div>
            </div>

            {/* Como começar */}
            <div className="flex items-start gap-3 rounded-md bg-background/60 p-4">
              <Compass className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Comece pelo Guia Estratégico</p>
                <p className="text-sm text-muted-foreground">
                  No canto superior direito você verá o chip <span className="font-medium text-foreground">Guia Estratégico</span>. Clique nele a qualquer momento — ele mostra onde você está, qual é a próxima etapa e leva você direto para ela. As etapas se desbloqueiam à medida que você avança, então é só seguir o guia.
                </p>
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
              {okrsBloqueado ? (
                <Button size="sm" variant="outline" disabled data-testid="button-go-okrs" title="Conclua as etapas anteriores da jornada para acessar">
                  Criar Metas
                </Button>
              ) : (
                <Link href="/okrs">
                  <Button size="sm" variant="outline" data-testid="button-go-okrs">
                    Criar Metas
                  </Button>
                </Link>
              )}
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
      {/* KPIs + Rituais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* KPIs */}
        <Card className="p-5 order-2" data-testid="card-kpis">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Indicadores do Negócio</h3>
            </div>
            {indicadoresBloqueado ? (
              <Button size="sm" variant="ghost" disabled data-testid="button-ver-indicadores" title="Conclua as etapas anteriores da jornada para acessar">
                Ver todos
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Link href="/indicadores">
                <Button size="sm" variant="ghost" data-testid="button-ver-indicadores">
                  Ver todos
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
          {loadingIndicadores ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : indicadores.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">Nenhum indicador cadastrado</p>
              {indicadoresBloqueado ? (
                <Button size="sm" variant="outline" disabled data-testid="button-criar-indicadores" title="Conclua as etapas anteriores da jornada para acessar">
                  Criar indicadores
                </Button>
              ) : (
                <Link href="/indicadores">
                  <Button size="sm" variant="outline" data-testid="button-criar-indicadores">
                    Criar indicadores
                  </Button>
                </Link>
              )}
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

        {/* Rituais de Gestão */}
        <Card className="p-5 order-1" data-testid="card-rituais-gestao">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Rituais de Gestão</h3>
            </div>
            {acompanhamentoBloqueado ? (
              <Button size="sm" variant="ghost" disabled data-testid="button-ver-acompanhamento" title="Conclua as etapas anteriores da jornada para acessar">
                Ver acompanhamento
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Link href="/ritos">
                <Button size="sm" variant="ghost" data-testid="button-ver-acompanhamento">
                  Ver acompanhamento
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>

          {(loadingRituais || loadingEventos) ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : rituais.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <Circle className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum ritual de gestão configurado</p>
              {acompanhamentoBloqueado ? (
                <Button size="sm" variant="outline" disabled data-testid="button-configurar-rituais" title="Conclua as etapas anteriores da jornada para acessar">
                  Configurar rituais
                </Button>
              ) : (
                <Link href="/ritos">
                  <Button size="sm" variant="outline" data-testid="button-configurar-rituais">
                    Configurar rituais
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {rituais.map((ritual) => {
                const config = RITUAIS_HOME_CONFIG[ritual.tipo] ?? { nome: ritual.tipo, icon: Calendar };
                const RitualIcon = config.icon;
                const atrasado = ritual.dataProximo && new Date(ritual.dataProximo) < hoje;
                const isOpen = concluirRitualId === ritual.id;
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
                    <Popover
                      open={isOpen}
                      onOpenChange={(open) => {
                        if (open) {
                          setConcluirRitualId(ritual.id);
                          setConcluirData(new Date().toISOString().split("T")[0]);
                          setConcluirNota("");
                        } else {
                          setConcluirRitualId(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="flex-shrink-0"
                          data-testid={`button-concluir-ritual-${ritual.id}`}
                          title="Concluir ritual"
                        >
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold">Concluir: {config.nome}</p>
                          <div className="space-y-1.5">
                            <Label htmlFor={`data-ritual-${ritual.id}`} className="text-xs">Data de conclusão</Label>
                            <Input
                              id={`data-ritual-${ritual.id}`}
                              type="date"
                              value={concluirData}
                              onChange={(e) => setConcluirData(e.target.value)}
                              data-testid={`input-data-concluir-${ritual.id}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`nota-ritual-${ritual.id}`} className="text-xs">Nota (opcional)</Label>
                            <Input
                              id={`nota-ritual-${ritual.id}`}
                              placeholder="Adicione uma observação..."
                              value={concluirNota}
                              onChange={(e) => setConcluirNota(e.target.value)}
                              data-testid={`input-nota-concluir-${ritual.id}`}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConcluirRitualId(null)}
                              data-testid={`button-cancelar-concluir-${ritual.id}`}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => concluirRitualMutation.mutate({ id: ritual.id, tipo: ritual.tipo })}
                              disabled={!concluirData || concluirRitualMutation.isPending}
                              data-testid={`button-confirmar-concluir-${ritual.id}`}
                            >
                              {concluirRitualMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Confirmar
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
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
      </div>
    </div>
  );
}

function MeuPainelStrip() {
  const { data } = useQuery<{
    objetivos: number;
    resultadosChave: number;
    iniciativas: number;
    indicadores: number;
    total: number;
    totalAtrasados: number;
    indicadoresCriticos: number;
  }>({
    queryKey: ["/api/meu-painel/resumo"],
  });
  if (!data || data.total === 0) return null;
  const partes: string[] = [];
  if (data.objetivos) partes.push(`${data.objetivos} ${data.objetivos === 1 ? "objetivo" : "objetivos"}`);
  if (data.resultadosChave) partes.push(`${data.resultadosChave} ${data.resultadosChave === 1 ? "KR" : "KRs"}`);
  if (data.iniciativas) partes.push(`${data.iniciativas} ${data.iniciativas === 1 ? "iniciativa" : "iniciativas"}`);
  if (data.indicadores) partes.push(`${data.indicadores} ${data.indicadores === 1 ? "indicador" : "indicadores"}`);
  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10" data-testid="card-meu-painel-strip">
      <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium" data-testid="text-meu-painel-resumo">
              Você tem {partes.join(", ")} sob sua responsabilidade.
            </p>
            {(data.totalAtrasados > 0 || data.indicadoresCriticos > 0) && (
              <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-meu-painel-alertas">
                {data.totalAtrasados > 0 && `${data.totalAtrasados} atrasado(s)`}
                {data.totalAtrasados > 0 && data.indicadoresCriticos > 0 && " · "}
                {data.indicadoresCriticos > 0 && `${data.indicadoresCriticos} indicador(es) crítico(s)`}
              </p>
            )}
          </div>
        </div>
        <Link href="/meu-painel">
          <Button size="sm" variant="outline" className="gap-1" data-testid="link-meu-painel-strip">
            Ver Meu Painel <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

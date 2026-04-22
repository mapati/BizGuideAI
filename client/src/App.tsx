import { Switch, Route, useLocation, useSearch, Redirect, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { Target } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AssistantSidebar } from "@/components/AssistantSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AIModalLockProvider } from "@/contexts/ai-modal-lock";
import { Clock, Zap } from "lucide-react";

import Home from "@/pages/Home";
import MeuPainel from "@/pages/MeuPainel";
import Onboarding from "@/pages/Onboarding";
import Pestel from "@/pages/Pestel";
import CincoForcas from "@/pages/CincoForcas";
import Swot from "@/pages/Swot";
import ModeloNegocio from "@/pages/ModeloNegocio";
import Estrategias from "@/pages/Estrategias";
import OportunidadesCrescimento from "@/pages/OportunidadesCrescimento";
import Iniciativas from "@/pages/Iniciativas";
import OKRs from "@/pages/OKRs";
import BSC from "@/pages/BSC";
import Indicadores from "@/pages/Indicadores";
import DiagnosticoAtual from "@/pages/DiagnosticoAtual";
import DiagnosticoEstrategico from "@/pages/DiagnosticoEstrategico";
import Acompanhamento from "@/pages/Acompanhamento";
import Ritos from "@/pages/Ritos";
import Rastreabilidade from "@/pages/Rastreabilidade";
import Alertas from "@/pages/Alertas";
import Cenarios from "@/pages/Cenarios";
import Riscos from "@/pages/Riscos";
import MapaBSC from "@/pages/MapaBSC";
import Exportacao from "@/pages/Exportacao";
import PlanoPublico from "@/pages/PlanoPublico";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import LandingPage from "@/pages/LandingPage";
import TrialExpirado from "@/pages/TrialExpirado";
import Admin from "@/pages/Admin";
import ContextoMacro from "@/pages/ContextoMacro";
import Equipe from "@/pages/Equipe";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Assinar from "@/pages/Assinar";
import PagamentoSucesso from "@/pages/PagamentoSucesso";
import PagamentoCancelado from "@/pages/PagamentoCancelado";
import TermosDeUso from "@/pages/TermosDeUso";
import NotFound from "@/pages/not-found";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/termos-de-uso", "/trial-expirado", "/verify-email", "/forgot-password", "/reset-password", "/pagamento/sucesso", "/pagamento/cancelado"];
const PUBLIC_PREFIXES = ["/plano-publico/"];

function TrialBanner({ diasRestantes }: { diasRestantes: number }) {
  if (diasRestantes > 3) return null;
  const msg =
    diasRestantes === 0
      ? "Seu período de testes termina hoje!"
      : diasRestantes === 1
      ? "Seu período de testes termina amanhã."
      : `Seu período de testes termina em ${diasRestantes} dias.`;

  return (
    <div
      className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400 flex items-center justify-center gap-2"
      data-testid="banner-trial"
    >
      <Clock className="h-4 w-4 flex-shrink-0" />
      <span>
        {msg}{" "}
        <Link
          href="/assinar"
          className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-300"
        >
          Assinar agora
        </Link>
      </span>
    </div>
  );
}

function TrialStatusBanner({ diasRestantes }: { diasRestantes: number }) {
  if (diasRestantes > 3) {
    return (
      <div
        className="w-full bg-muted/50 border-b px-4 py-1.5 text-center text-xs text-muted-foreground flex items-center justify-center gap-2"
        data-testid="banner-trial"
      >
        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Período de testes: {diasRestantes} dias restantes</span>
      </div>
    );
  }
  return <TrialBanner diasRestantes={diasRestantes} />;
}

function UpgradeBanner() {
  return (
    <div
      className="w-full bg-primary/5 border-b border-primary/20 px-4 py-1.5 text-center text-xs text-muted-foreground flex items-center justify-center gap-2"
      data-testid="banner-upgrade-start"
    >
      <Zap className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
      <span>
        Upgrade para Pro: IA mais poderosa e equipe ilimitada.{" "}
        <Link href="/assinar?plano=pro" className="font-semibold text-primary underline">
          Ver planos
        </Link>
      </span>
    </div>
  );
}

function AppLayout() {
  const { user, trialInfo, empresa, isLoading } = useAuth();
  const [location] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);

  const { data: empresaQuery, isLoading: loadingEmpresa } = useQuery<any | null>({
    queryKey: ["/api/empresa"],
    enabled: !!user,
    retry: false,
  });

  if (isLoading || (!!user && loadingEmpresa)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const isPublic = PUBLIC_ROUTES.includes(location) || PUBLIC_PREFIXES.some((p) => location.startsWith(p));

  if (!user && !isPublic) {
    return <Redirect to="/" />;
  }

  if (user && (location === "/login" || location === "/register")) {
    const planoParam = searchParams.get("plano");
    const plano = planoParam === "start" || planoParam === "pro" ? planoParam : null;
    return <Redirect to={plano ? `/assinar?plano=${plano}` : "/dashboard"} />;
  }

  const PAYMENT_ROUTES = ["/assinar", "/pagamento/sucesso", "/pagamento/cancelado"];

  // PENDENTE_PAGAMENTO must run BEFORE semEmpresa/onboarding check to avoid redirect loop
  // (pendente_pagamento users have /api/empresa blocked by requireAuth → empresaQuery undefined)
  const isPendentePagamento = !user?.isAdmin && trialInfo?.planoStatus === "pendente_pagamento";
  if (user && isPendentePagamento && !PAYMENT_ROUTES.includes(location)) {
    const planoTipo = empresa?.planoTipo ?? "start";
    return <Redirect to={`/assinar?plano=${planoTipo}`} />;
  }
  if (user && isPendentePagamento && PAYMENT_ROUTES.includes(location)) {
    return (
      <Switch>
        <Route path="/assinar" component={Assinar} />
        <Route path="/pagamento/sucesso" component={PagamentoSucesso} />
        <Route path="/pagamento/cancelado" component={PagamentoCancelado} />
      </Switch>
    );
  }

  const rotasPublicasApp = ["/onboarding", "/trial-expirado", "/plano-publico/"];
  const naRotaRestrita = !rotasPublicasApp.some((r) => location.startsWith(r));
  const isAdminRoute = location.startsWith("/admin");
  const semEmpresa = !loadingEmpresa && !empresaQuery;
  if (user && semEmpresa && naRotaRestrita && !(isAdminRoute && user.isAdmin)) {
    return <Redirect to="/onboarding" />;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/termos-de-uso" component={TermosDeUso} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/trial-expirado" component={TrialExpirado} />
        <Route path="/plano-publico/:token" component={PlanoPublico} />
        <Route path="/pagamento/sucesso" component={PagamentoSucesso} />
        <Route path="/pagamento/cancelado" component={PagamentoCancelado} />
      </Switch>
    );
  }

  const isTrialBlocked =
    !user?.isAdmin &&
    (trialInfo?.trialExpirado === true ||
      trialInfo?.planoStatus === "expirado" ||
      trialInfo?.planoStatus === "suspenso");

  if (isTrialBlocked && !PAYMENT_ROUTES.includes(location)) {
    if (location !== "/trial-expirado") {
      return <Redirect to="/trial-expirado" />;
    }
    return <TrialExpirado />;
  }

  if (isTrialBlocked && PAYMENT_ROUTES.includes(location)) {
    return (
      <Switch>
        <Route path="/assinar" component={Assinar} />
        <Route path="/pagamento/sucesso" component={PagamentoSucesso} />
        <Route path="/pagamento/cancelado" component={PagamentoCancelado} />
      </Switch>
    );
  }

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  const LeftSidebarJornadaSync = () => {
    const { setOpen, isMobile } = useSidebar();
    const { jornadaConcluida, isLoading } = useJornadaProgresso();
    const appliedRef = useRef(false);
    useEffect(() => {
      if (isLoading || appliedRef.current) return;
      appliedRef.current = true;
      if (isMobile) return;
      setOpen(!jornadaConcluida);
    }, [isLoading, jornadaConcluida, isMobile, setOpen]);
    return null;
  };

  const MobileSidebarOpenButton = () => {
    const { openMobile, setOpenMobile, isMobile } = useSidebar();
    if (!isMobile || openMobile) return null;
    return (
      <Button
        size="icon"
        variant="default"
        onClick={() => setOpenMobile(true)}
        className="fixed bottom-4 left-4 rounded-full shadow-lg z-40"
        title="Abrir menu"
        data-testid="button-sidebar-toggle"
      >
        <Target className="h-4 w-4" />
      </Button>
    );
  };

  const showTrialBanner = trialInfo?.planoStatus === "trial" && trialInfo?.diasRestantes !== null;
  const showUpgradeBanner = trialInfo?.planoStatus === "ativo" && (empresa?.planoTipo === "start" || !empresa?.planoTipo);

  return (
    <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
      <LeftSidebarJornadaSync />
      <div className="flex h-screen w-full flex-col">
        {showTrialBanner && trialInfo!.diasRestantes !== null && (
          <TrialStatusBanner diasRestantes={trialInfo!.diasRestantes} />
        )}
        {showUpgradeBanner && <UpgradeBanner />}
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <MobileSidebarOpenButton />
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <main className="flex-1 overflow-auto p-8">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/dashboard" component={Home} />
                <Route path="/meu-painel" component={MeuPainel} />
                <Route path="/onboarding" component={Onboarding} />
                <Route path="/pestel" component={Pestel} />
                <Route path="/cinco-forcas" component={CincoForcas} />
                <Route path="/swot" component={Swot} />
                <Route path="/bmc" component={ModeloNegocio} />
                <Route path="/estrategias" component={Estrategias} />
                <Route path="/oportunidades-crescimento" component={OportunidadesCrescimento} />
                <Route path="/iniciativas" component={Iniciativas} />
                <Route path="/okrs" component={OKRs} />
                <Route path="/bsc" component={BSC} />
                <Route path="/diagnostico" component={DiagnosticoAtual} />
                <Route path="/diagnostico-estrategico" component={DiagnosticoEstrategico} />
                <Route path="/indicadores" component={Indicadores} />
                <Route path="/ritos" component={Acompanhamento} />
                <Route path="/ritos/gestao" component={Ritos} />
                <Route path="/rastreabilidade" component={Rastreabilidade} />
                <Route path="/alertas" component={Alertas} />
                <Route path="/cenarios" component={Cenarios} />
                <Route path="/riscos" component={Riscos} />
                <Route path="/mapa-bsc" component={MapaBSC} />
                <Route path="/exportacao" component={Exportacao} />
                <Route path="/plano-publico/:token" component={PlanoPublico} />
                <Route path="/trial-expirado" component={TrialExpirado} />
                <Route path="/admin" component={Admin} />
                <Route path="/admin/contexto-macro" component={ContextoMacro} />
                <Route path="/equipe" component={Equipe} />
                <Route path="/assinar" component={Assinar} />
                <Route path="/pagamento/sucesso" component={PagamentoSucesso} />
                <Route path="/pagamento/cancelado" component={PagamentoCancelado} />
                <Route path="/termos-de-uso" component={TermosDeUso} />
                {/* Auth routes: must remain accessible even when logged in */}
                <Route path="/reset-password" component={ResetPassword} />
                <Route path="/verify-email" component={VerifyEmail} />
                <Route path="/forgot-password" component={ForgotPassword} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
          <AssistantSidebar />
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <AIModalLockProvider>
              <AppLayout />
              <Toaster />
            </AIModalLockProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

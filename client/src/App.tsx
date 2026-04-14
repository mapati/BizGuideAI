import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AIAssistant } from "@/components/AIAssistant";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Clock } from "lucide-react";

import Home from "@/pages/Home";
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
import Acompanhamento from "@/pages/Acompanhamento";
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
import Equipe from "@/pages/Equipe";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/not-found";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/trial-expirado", "/verify-email", "/forgot-password", "/reset-password"];
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
        <a
          href="https://wa.me/5511950377286"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-300"
        >
          Solicitar plano completo
        </a>
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

function AppLayout() {
  const { user, trialInfo, isLoading } = useAuth();
  const [location] = useLocation();

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
    return <Redirect to="/dashboard" />;
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
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/trial-expirado" component={TrialExpirado} />
        <Route path="/plano-publico/:token" component={PlanoPublico} />
      </Switch>
    );
  }

  const isTrialBlocked =
    !user?.isAdmin &&
    (trialInfo?.trialExpirado === true ||
      trialInfo?.planoStatus === "expirado" ||
      trialInfo?.planoStatus === "suspenso");

  if (isTrialBlocked) {
    if (location !== "/trial-expirado") {
      return <Redirect to="/trial-expirado" />;
    }
    return <TrialExpirado />;
  }

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  const showTrialBanner = trialInfo?.planoStatus === "trial" && trialInfo?.diasRestantes !== null;

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full flex-col">
        {showTrialBanner && trialInfo.diasRestantes !== null && (
          <TrialStatusBanner diasRestantes={trialInfo.diasRestantes} />
        )}
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto p-8">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/dashboard" component={Home} />
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
                <Route path="/indicadores" component={Indicadores} />
                <Route path="/ritos" component={Acompanhamento} />
                <Route path="/rastreabilidade" component={Rastreabilidade} />
                <Route path="/alertas" component={Alertas} />
                <Route path="/cenarios" component={Cenarios} />
                <Route path="/riscos" component={Riscos} />
                <Route path="/mapa-bsc" component={MapaBSC} />
                <Route path="/exportacao" component={Exportacao} />
                <Route path="/plano-publico/:token" component={PlanoPublico} />
                <Route path="/trial-expirado" component={TrialExpirado} />
                <Route path="/admin" component={Admin} />
                <Route path="/equipe" component={Equipe} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </div>
      <AIAssistant />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <AppLayout />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

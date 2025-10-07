import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AIAssistant } from "@/components/AIAssistant";

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
import Acompanhamento from "@/pages/Acompanhamento";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
      <Route path="/ritos" component={Acompanhamento} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-8">
                  <Router />
                </main>
              </div>
            </div>
            <AIAssistant />
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

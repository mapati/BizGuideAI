import { Home, Map, Target, TrendingUp, CheckCircle, FileText, Compass, Layers, Grid3x3, ListChecks, Briefcase, LogOut, BarChart3, ShieldCheck, Users, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";

const mapItems = [
  { title: "Cenário Externo", url: "/pestel", icon: Compass, jornadaId: "pestel" },
  { title: "Mercado e Concorrência", url: "/cinco-forcas", icon: Layers, jornadaId: "cinco-forcas" },
  { title: "Modelo de Negócio", url: "/bmc", icon: Grid3x3, jornadaId: "bmc" },
  { title: "Forças e Fraquezas", url: "/swot", icon: Target, jornadaId: "swot" },
];

const apostasItems = [
  { title: "Estratégias", url: "/estrategias", icon: TrendingUp, jornadaId: "estrategias" },
  { title: "Oportunidades de Crescimento", url: "/oportunidades-crescimento", icon: Map, jornadaId: "oportunidades" },
  { title: "Iniciativas Prioritárias", url: "/iniciativas", icon: Briefcase, jornadaId: "iniciativas" },
];

const marchaItems = [
  { title: "OKRs — Objetivos", url: "/okrs", icon: Target, jornadaId: "okrs" },
  { title: "Performance dos OKRs", url: "/bsc", icon: ListChecks, jornadaId: null },
  { title: "Acompanhamento", url: "/ritos", icon: CheckCircle, jornadaId: "acompanhamento" },
];

function EtapaIndicador({ jornadaId, etapas, proximaEtapaId }: { jornadaId: string | null; etapas: ReturnType<typeof useJornadaProgresso>["etapas"]; proximaEtapaId?: string | null }) {
  if (!jornadaId) return null;
  const etapa = etapas.find((e) => e.id === jornadaId);
  if (!etapa) return null;
  if (etapa.concluida) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto flex-shrink-0" />;
  }
  if (proximaEtapaId === jornadaId) {
    return <ArrowRight className="h-3.5 w-3.5 text-primary ml-auto flex-shrink-0" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto flex-shrink-0" />;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, empresa, logout } = useAuth();
  const { etapas, isLoading: jornadaLoading, jornadaConcluida } = useJornadaProgresso();

  const initials = user?.nome
    ? user.nome
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  const proximaEtapa = !jornadaConcluida
    ? etapas.find((e) => !e.concluida && (!e.bloqueadaPor || e.bloqueadaPor.length === 0))
    : null;

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-6">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">BizGuideAI</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/" || location === "/dashboard"}
                  data-testid="link-home-sidebar"
                >
                  <Link href="/">
                    <Home />
                    <span>Início</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/onboarding"}
                  data-testid="link-onboarding"
                >
                  <Link href="/onboarding">
                    <FileText />
                    <span>Perfil da Empresa</span>
                    {!jornadaLoading && (
                      <EtapaIndicador jornadaId="perfil" etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/indicadores"}
                  data-testid="link-indicadores"
                >
                  <Link href="/indicadores">
                    <BarChart3 />
                    <span>KPIs — Indicadores</span>
                    {!jornadaLoading && (
                      <EtapaIndicador jornadaId="indicadores" etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(user?.role === "admin" || user?.isAdmin) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/equipe"}
                    data-testid="link-equipe"
                  >
                    <Link href="/equipe">
                      <Users />
                      <span>Equipe</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {user?.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin"}
                    data-testid="link-admin"
                  >
                    <Link href="/admin">
                      <ShieldCheck />
                      <span>Administração</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Mapa</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mapItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.url.slice(1)}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {!jornadaLoading && (
                        <EtapaIndicador jornadaId={item.jornadaId} etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Apostas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {apostasItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.url.slice(1)}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {!jornadaLoading && (
                        <EtapaIndicador jornadaId={item.jornadaId} etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Marcha</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marchaItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.url.slice(1)}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {!jornadaLoading && (
                        <EtapaIndicador jornadaId={item.jornadaId} etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-nome">
              {user?.nome}
            </p>
            {empresa && (
              <p className="text-xs text-muted-foreground truncate" data-testid="text-empresa-nome">
                {empresa.nome}
              </p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={logout}
            data-testid="button-logout"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

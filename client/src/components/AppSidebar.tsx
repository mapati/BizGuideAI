import { Home, Map, Target, TrendingUp, CheckCircle, FileText, Compass, Layers, Grid3x3, ListChecks, Briefcase } from "lucide-react";
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
} from "@/components/ui/sidebar";

const mapItems = [
  { title: "Cenário Externo", url: "/pestel", icon: Compass },
  { title: "Mercado e Concorrência", url: "/cinco-forcas", icon: Layers },
  { title: "Modelo de Negócio", url: "/bmc", icon: Grid3x3 },
  { title: "Forças e Fraquezas", url: "/swot", icon: Target },
];

const apostasItems = [
  { title: "Estratégias", url: "/estrategias", icon: TrendingUp },
  { title: "Oportunidades de Crescimento", url: "/oportunidades-crescimento", icon: Map },
  { title: "Iniciativas Prioritárias", url: "/iniciativas", icon: Briefcase },
];

const marchaItems = [
  { title: "Objetivos e Resultados", url: "/okrs", icon: Target },
  { title: "Indicadores de Desempenho", url: "/bsc", icon: ListChecks },
  { title: "Acompanhamento", url: "/ritos", icon: CheckCircle },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-6">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Estratégia Simples</span>
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
                  isActive={location === "/"}
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
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

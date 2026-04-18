import { Home, Map, Target, TrendingUp, CheckCircle, FileText, Compass, Layers, Grid3x3, ListChecks, Briefcase, LogOut, BarChart3, ShieldCheck, Users, CheckCircle2, Circle, ArrowRight, ClipboardList, CloudLightning, ShieldAlert, Network, Share2, GitBranch, Bell, Zap } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";

const mapItems = [
  { title: "Modelo de Negócio", url: "/bmc", icon: Grid3x3, jornadaId: "bmc" },
  { title: "Cenário Externo", url: "/pestel", icon: Compass, jornadaId: "pestel" },
  { title: "Mercado e Concorrência", url: "/cinco-forcas", icon: Layers, jornadaId: "cinco-forcas" },
  { title: "Forças e Fraquezas", url: "/swot", icon: Target, jornadaId: "swot" },
];

const apostasItems = [
  { title: "Estratégias", url: "/estrategias", icon: TrendingUp, jornadaId: "estrategias" },
  { title: "Oportunidades de Crescimento", url: "/oportunidades-crescimento", icon: Map, jornadaId: "oportunidades" },
  { title: "Iniciativas Prioritárias", url: "/iniciativas", icon: Briefcase, jornadaId: "iniciativas" },
];

const marchaItems = [
  { title: "Metas e Resultados", url: "/okrs", icon: Target, jornadaId: "okrs" },
  { title: "Performance das Metas", url: "/bsc", icon: ListChecks, jornadaId: null },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3, jornadaId: "indicadores" },
  { title: "Acompanhamento", url: "/ritos", icon: CheckCircle, jornadaId: "acompanhamento" },
];

function EtapaIndicador({ jornadaId, etapas, proximaEtapaId }: { jornadaId: string | null; etapas: ReturnType<typeof useJornadaProgresso>["etapas"]; proximaEtapaId?: string | null }) {
  if (!jornadaId) return null;
  const etapa = etapas.find((e) => e.id === jornadaId);
  if (!etapa) return null;
  const temDados = etapa.status !== "pendente";
  if (temDados) {
    return <CheckCircle2 className={`h-3.5 w-3.5 ml-auto flex-shrink-0 ${etapa.concluida ? "text-green-500" : "text-green-400/70"}`} />;
  }
  if (proximaEtapaId === jornadaId) {
    return <ArrowRight className="h-3.5 w-3.5 text-primary ml-auto flex-shrink-0" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto flex-shrink-0" />;
}

function isEtapaBloqueada(jornadaId: string | null, etapas: ReturnType<typeof useJornadaProgresso>["etapas"]): boolean {
  if (!jornadaId) return false;
  const etapa = etapas.find((e) => e.id === jornadaId);
  return !!(etapa?.bloqueadaPor && etapa.bloqueadaPor.length > 0);
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, empresa, trialInfo, logout } = useAuth();
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
                {!jornadaLoading && isEtapaBloqueada("diagnostico", etapas) ? (
                  <SidebarMenuButton
                    data-testid="link-diagnostico"
                    className="opacity-50 cursor-not-allowed pointer-events-none"
                  >
                    <ClipboardList />
                    <span>Métricas</span>
                    <EtapaIndicador jornadaId="diagnostico" etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/diagnostico"}
                    data-testid="link-diagnostico"
                  >
                    <Link href="/diagnostico">
                      <ClipboardList />
                      <span>Métricas</span>
                      {!jornadaLoading && (
                        <EtapaIndicador jornadaId="diagnostico" etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                      )}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Mapa</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mapItems.map((item) => {
                const bloqueada = !jornadaLoading && isEtapaBloqueada(item.jornadaId, etapas);
                return (
                  <SidebarMenuItem key={item.title}>
                    {bloqueada ? (
                      <SidebarMenuButton
                        data-testid={`link-${item.url.slice(1)}`}
                        className="opacity-50 cursor-not-allowed pointer-events-none"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        <EtapaIndicador jornadaId={item.jornadaId} etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                      </SidebarMenuButton>
                    ) : (
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
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Plano de Ação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {apostasItems.map((item) => {
                const bloqueada = !jornadaLoading && isEtapaBloqueada(item.jornadaId, etapas);
                return (
                  <SidebarMenuItem key={item.title}>
                    {bloqueada ? (
                      <SidebarMenuButton
                        data-testid={`link-${item.url.slice(1)}`}
                        className="opacity-50 cursor-not-allowed pointer-events-none"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        <EtapaIndicador jornadaId={item.jornadaId} etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                      </SidebarMenuButton>
                    ) : (
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
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Execução</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marchaItems.map((item) => {
                const bloqueada = !jornadaLoading && isEtapaBloqueada(item.jornadaId, etapas);
                return (
                  <SidebarMenuItem key={item.title}>
                    {bloqueada ? (
                      <SidebarMenuButton
                        data-testid={`link-${item.url.slice(1)}`}
                        className="opacity-50 cursor-not-allowed pointer-events-none"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        <EtapaIndicador jornadaId={item.jornadaId} etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                      </SidebarMenuButton>
                    ) : (
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
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Análise Avançada</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/cenarios"} data-testid="link-cenarios">
                  <Link href="/cenarios">
                    <CloudLightning />
                    <span>Cenários Estratégicos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/alertas"} data-testid="link-alertas">
                  <Link href="/alertas">
                    <Bell />
                    <span>Alertas por E-mail</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/rastreabilidade"} data-testid="link-rastreabilidade">
                  <Link href="/rastreabilidade">
                    <GitBranch />
                    <span>Rastreabilidade</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/riscos"} data-testid="link-riscos">
                  <Link href="/riscos">
                    <ShieldAlert />
                    <span>Gestão de Riscos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/mapa-bsc"} data-testid="link-mapa-bsc">
                  <Link href="/mapa-bsc">
                    <Network />
                    <span>Mapa de Performance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/exportacao"} data-testid="link-exportacao">
                  <Link href="/exportacao">
                    <Share2 />
                    <span>Exportar &amp; Compartilhar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(user?.role === "admin" || user?.isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Configurações</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        {trialInfo?.planoStatus === "ativo" && empresa?.planoTipo && !user?.isAdmin && (
          <div className="mb-3 px-1" data-testid="badge-plano-ativo-container">
            <Badge
              variant="secondary"
              className="w-full justify-center gap-1.5 py-1"
              data-testid="badge-plano-ativo"
            >
              <Zap className="h-3 w-3" />
              Plano {empresa.planoTipo.charAt(0).toUpperCase() + empresa.planoTipo.slice(1)} ativo
            </Badge>
          </div>
        )}
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

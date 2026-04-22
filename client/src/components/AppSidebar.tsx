import { useState } from "react";
import { Home, Map, Target, TrendingUp, CheckCircle, FileText, Compass, Layers, Grid3x3, ListChecks, Briefcase, LogOut, BarChart3, ShieldCheck, Users, CheckCircle2, Circle, ArrowRight, ClipboardList, CloudLightning, ShieldAlert, Network, Share2, GitBranch, Bell, Zap, UserCircle, Calendar, PanelLeftClose, PanelLeftOpen, Stethoscope } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserProfileDialog } from "@/components/UserProfileDialog";
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
  { title: "Objetivos e Metas", url: "/okrs", icon: Target, jornadaId: "okrs" },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3, jornadaId: "indicadores" },
  { title: "Acompanhamento", url: "/ritos", icon: CheckCircle, jornadaId: "acompanhamento" },
];

function EtapaIndicador({ jornadaId, etapas, proximaEtapaId }: { jornadaId: string | null; etapas: ReturnType<typeof useJornadaProgresso>["etapas"]; proximaEtapaId?: string | null }) {
  if (!jornadaId) return null;
  const etapa = etapas.find((e) => e.id === jornadaId);
  if (!etapa) return null;
  const temDados = etapa.status !== "pendente";
  if (temDados) {
    return (
      <CheckCircle2
        className={`h-3.5 w-3.5 ml-auto flex-shrink-0 group-data-[collapsible=icon]:hidden ${etapa.concluida ? "text-green-500" : "text-green-400/70"}`}
      />
    );
  }
  if (proximaEtapaId === jornadaId) {
    return <ArrowRight className="h-3.5 w-3.5 text-primary ml-auto flex-shrink-0 group-data-[collapsible=icon]:hidden" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto flex-shrink-0 group-data-[collapsible=icon]:hidden" />;
}

function isEtapaBloqueada(jornadaId: string | null, etapas: ReturnType<typeof useJornadaProgresso>["etapas"]): boolean {
  if (!jornadaId) return false;
  const etapa = etapas.find((e) => e.id === jornadaId);
  return !!(etapa?.bloqueadaPor && etapa.bloqueadaPor.length > 0);
}

function SidebarHeaderContent() {
  const { toggleSidebar, state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex flex-col items-center gap-3 py-3 w-full hover-elevate"
        title="Abrir menu"
        data-testid="button-sidebar-open"
      >
        <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
        <Target className="h-4 w-4 text-primary" />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
      <Link href="/" data-testid="link-home" className="flex-1 min-w-0">
        <div className="flex items-center gap-2 cursor-pointer min-w-0">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Target className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none truncate">BizGuideAI</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Estratégia</p>
          </div>
        </div>
      </Link>
      <Button
        size="icon"
        variant="ghost"
        onClick={toggleSidebar}
        title="Fechar menu"
        data-testid="button-sidebar-close"
      >
        <PanelLeftClose className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SidebarFooterContent() {
  const { user, empresa, trialInfo, logout } = useAuth();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = user?.nome
    ? user.nome
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  if (isCollapsed) {
    return (
      <>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            className="rounded-full hover-elevate active-elevate-2"
            data-testid="button-open-profile-collapsed"
            title="Editar perfil"
          >
            <Avatar className="h-8 w-8 shrink-0">
              {user?.fotoUrl && <AvatarImage src={user.fotoUrl} alt={user?.nome || ""} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
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
        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </>
    );
  }

  return (
    <>
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-3 flex-1 min-w-0 p-1 -m-1 rounded-md hover-elevate active-elevate-2 text-left"
          data-testid="button-open-profile"
          title="Editar perfil e preferências"
        >
          <Avatar className="h-8 w-8 shrink-0">
            {user?.fotoUrl && <AvatarImage src={user.fotoUrl} alt={user?.nome || ""} />}
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
        </button>
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
      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { etapas, isLoading: jornadaLoading, jornadaConcluida } = useJornadaProgresso();
  const { user } = useAuth();

  const proximaEtapa = !jornadaConcluida
    ? etapas.find((e) => !e.concluida && (!e.bloqueadaPor || e.bloqueadaPor.length === 0))
    : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-0 group-data-[collapsible=icon]:p-0">
        <SidebarHeaderContent />
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
                  tooltip="Início"
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
                  isActive={location === "/meu-painel"}
                  data-testid="link-meu-painel"
                  tooltip="Meu Painel"
                >
                  <Link href="/meu-painel">
                    <UserCircle />
                    <span>Meu Painel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/onboarding"}
                  data-testid="link-onboarding"
                  tooltip="Perfil da Empresa"
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
                    tooltip="Diagnóstico Atual"
                  >
                    <ClipboardList />
                    <span>Diagnóstico Atual</span>
                    <EtapaIndicador jornadaId="diagnostico" etapas={etapas} proximaEtapaId={proximaEtapa?.id} />
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/diagnostico"}
                    data-testid="link-diagnostico"
                    tooltip="Diagnóstico Atual"
                  >
                    <Link href="/diagnostico">
                      <ClipboardList />
                      <span>Diagnóstico Atual</span>
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
                        tooltip={item.title}
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
                        tooltip={item.title}
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
                        tooltip={item.title}
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
                        tooltip={item.title}
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
                        tooltip={item.title}
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
                        tooltip={item.title}
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/ritos/gestao" || location.startsWith("/ritos/gestao")}
                  data-testid="link-ritos-gestao"
                  tooltip="Rituais de Gestão"
                >
                  <Link href="/ritos/gestao">
                    <Calendar />
                    <span>Rituais de Gestão</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Análise Avançada</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "Diagnóstico Estratégico", url: "/diagnostico-estrategico", icon: Stethoscope, testId: "link-diagnostico-estrategico" },
                { title: "Performance das Metas", url: "/bsc", icon: ListChecks, testId: "link-bsc" },
                { title: "Cenários Estratégicos", url: "/cenarios", icon: CloudLightning, testId: "link-cenarios" },
                { title: "Rastreabilidade", url: "/rastreabilidade", icon: GitBranch, testId: "link-rastreabilidade" },
                { title: "Gestão de Riscos", url: "/riscos", icon: ShieldAlert, testId: "link-riscos" },
                { title: "Mapa de Performance", url: "/mapa-bsc", icon: Network, testId: "link-mapa-bsc" },
              ].map((item) => (
                <SidebarMenuItem key={item.title}>
                  {!jornadaLoading && !jornadaConcluida ? (
                    <SidebarMenuButton
                      data-testid={item.testId}
                      className="opacity-50 cursor-not-allowed pointer-events-none"
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={item.testId}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/alertas"}
                  data-testid="link-alertas"
                  tooltip="Alertas por E-mail"
                >
                  <Link href="/alertas">
                    <Bell />
                    <span>Alertas por E-mail</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/exportacao"}
                  data-testid="link-exportacao"
                  tooltip="Exportar & Compartilhar"
                >
                  <Link href="/exportacao">
                    <Share2 />
                    <span>Exportar & Compartilhar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(user?.role === "admin" || user?.isAdmin) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/equipe"}
                    data-testid="link-equipe"
                    tooltip="Equipe"
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
                    tooltip="Administração"
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
      </SidebarContent>
      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2">
        <SidebarFooterContent />
      </SidebarFooter>
    </Sidebar>
  );
}

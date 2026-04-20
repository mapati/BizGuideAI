import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, ListChecks, Briefcase, BarChart3, Clock, AlertTriangle, ArrowRight, UserCircle, Link2 } from "lucide-react";

interface MeuPainelObjetivo {
  id: string;
  titulo: string;
  prazo: string;
  perspectiva: string;
  encerrado: boolean;
  atrasado: boolean;
}

interface MeuPainelKR {
  id: string;
  metrica: string;
  objetivoId: string;
  objetivoTitulo: string;
  prazo: string;
  valorInicial: string;
  valorAtual: string;
  valorAlvo: string;
  atrasado: boolean;
}

interface MeuPainelIniciativa {
  id: string;
  titulo: string;
  prazo: string;
  status: string;
  prioridade: string;
  atrasado: boolean;
}

interface MeuPainelIndicador {
  id: string;
  nome: string;
  perspectiva: string;
  meta: string;
  atual: string;
  status: string;
  atrasado: boolean;
}

interface MeuPainelData {
  objetivos: MeuPainelObjetivo[];
  resultadosChave: MeuPainelKR[];
  iniciativas: MeuPainelIniciativa[];
  indicadores: MeuPainelIndicador[];
}

function calcularProgressoKR(kr: MeuPainelKR): number {
  const inicial = parseFloat(String(kr.valorInicial).replace(/[^\d.,-]/g, "").replace(",", "."));
  const atual = parseFloat(String(kr.valorAtual).replace(/[^\d.,-]/g, "").replace(",", "."));
  const alvo = parseFloat(String(kr.valorAlvo).replace(/[^\d.,-]/g, "").replace(",", "."));
  if (isNaN(inicial) || isNaN(atual) || isNaN(alvo) || alvo === inicial) return 0;
  const p = ((atual - inicial) / (alvo - inicial)) * 100;
  return Math.max(0, Math.min(100, Math.round(p)));
}

function StatusIndicador({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    verde: { label: "No alvo", className: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400" },
    amarelo: { label: "Atenção", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400" },
    vermelho: { label: "Crítico", className: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400" },
  };
  const cfg = map[status] ?? { label: status, className: "" };
  return <Badge className={cfg.className} data-testid={`badge-status-${status}`}>{cfg.label}</Badge>;
}

export default function MeuPainel() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<MeuPainelData>({
    queryKey: ["/api/meu-painel"],
  });

  const { data: orfaos } = useQuery<{ oportunidades: { id: string }[]; iniciativas: { id: string }[]; objetivos: { id: string }[] }>({
    queryKey: ["/api/cascata/orfaos"],
  });

  const totalOrfaos = (orfaos?.oportunidades?.length ?? 0) + (orfaos?.iniciativas?.length ?? 0) + (orfaos?.objetivos?.length ?? 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground" data-testid="text-loading">Carregando seu painel...</p>
      </div>
    );
  }

  const objetivos = data?.objetivos ?? [];
  const krs = data?.resultadosChave ?? [];
  const iniciativas = data?.iniciativas ?? [];
  const indicadores = data?.indicadores ?? [];
  const total = objetivos.length + krs.length + iniciativas.length + indicadores.length;

  const totalAtrasados =
    objetivos.filter(o => o.atrasado).length +
    krs.filter(k => k.atrasado).length +
    iniciativas.filter(i => i.atrasado).length;

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <UserCircle className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Meu Painel Pessoal</h1>
          <p className="text-muted-foreground mt-1">
            {user?.nome ? `${user.nome} — ` : ""}
            Tudo o que está sob sua responsabilidade neste plano estratégico.
          </p>
        </div>
      </div>

      {totalOrfaos > 0 && (
        <Card className="border-amber-300 bg-amber-50/30 dark:bg-amber-950/10" data-testid="card-orfaos-warning">
          <CardContent className="py-4 flex items-start gap-3">
            <Link2 className="h-5 w-5 text-amber-700 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {totalOrfaos} item(ns) sem conexão estratégica
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Você concluiu sua primeira jornada — agora pode ligar Oportunidades, Iniciativas e Objetivos sem origem à cascata estratégica para garantir alinhamento.
                {orfaos?.oportunidades?.length ? ` ${orfaos.oportunidades.length} oportunidade(s),` : ""}
                {orfaos?.iniciativas?.length ? ` ${orfaos.iniciativas.length} iniciativa(s),` : ""}
                {orfaos?.objetivos?.length ? ` ${orfaos.objetivos.length} objetivo(s)` : ""}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {total === 0 && (
        <Card data-testid="card-empty-state">
          <CardContent className="py-12 text-center space-y-3">
            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">Nada atribuído a você ainda</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Quando alguém da sua equipe definir você como responsável por um objetivo, resultado-chave, iniciativa ou indicador, ele aparecerá aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card data-testid="card-resumo-objetivos">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Objetivos</span>
              </div>
              <p className="text-2xl font-bold mt-1" data-testid="text-count-objetivos">{objetivos.length}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-resumo-krs">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Resultados-Chave</span>
              </div>
              <p className="text-2xl font-bold mt-1" data-testid="text-count-krs">{krs.length}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-resumo-iniciativas">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Iniciativas</span>
              </div>
              <p className="text-2xl font-bold mt-1" data-testid="text-count-iniciativas">{iniciativas.length}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-resumo-indicadores">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Indicadores</span>
              </div>
              <p className="text-2xl font-bold mt-1" data-testid="text-count-indicadores">{indicadores.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {totalAtrasados > 0 && (
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20" data-testid="card-alerta-atrasados">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">{totalAtrasados}</span> {totalAtrasados === 1 ? "item está atrasado" : "itens estão atrasados"}. Eles aparecem no topo de cada lista.
            </p>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <Card data-testid="card-secao-objetivos">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Meus Objetivos ({objetivos.length})
                </CardTitle>
                <CardDescription className="mt-1">Objetivos estratégicos sob sua responsabilidade.</CardDescription>
              </div>
              <Link href="/okrs">
                <Button variant="outline" size="sm" className="gap-1" data-testid="link-ver-okrs">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {objetivos.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-empty-objetivos">
                Nenhum objetivo sob sua responsabilidade no momento.
              </p>
            )}
            {objetivos.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-md hover-elevate" data-testid={`row-objetivo-${o.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{o.titulo}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-xs">{o.perspectiva}</Badge>
                    {o.prazo && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {o.prazo}
                      </span>
                    )}
                    {o.encerrado && <Badge variant="secondary" className="text-xs">Encerrado</Badge>}
                  </div>
                </div>
                {o.atrasado && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400" data-testid={`badge-atrasado-${o.id}`}>
                    Atrasado
                  </Badge>
                )}
                <Link href="/okrs">
                  <Button size="sm" variant="outline" data-testid={`button-abrir-objetivo-${o.id}`}>Abrir</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <Card data-testid="card-secao-krs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Meus Resultados-Chave ({krs.length})
            </CardTitle>
            <CardDescription className="mt-1">KRs vinculados a objetivos da empresa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {krs.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-empty-krs">
                Nenhum resultado-chave sob sua responsabilidade no momento.
              </p>
            )}
            {krs.map((k) => {
              const progresso = calcularProgressoKR(k);
              return (
                <div key={k.id} className="p-3 rounded-md hover-elevate space-y-2" data-testid={`row-kr-${k.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{k.metrica}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Objetivo: {k.objetivoTitulo}
                      </p>
                    </div>
                    {k.atrasado && (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">Atrasado</Badge>
                    )}
                    <Link href="/okrs">
                      <Button size="sm" variant="outline" data-testid={`button-abrir-kr-${k.id}`}>Abrir</Button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Inicial: <span className="text-foreground">{k.valorInicial}</span></span>
                    <span>→ Atual: <span className="text-foreground font-medium">{k.valorAtual}</span></span>
                    <span>→ Alvo: <span className="text-foreground">{k.valorAlvo}</span></span>
                    {k.prazo && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" /> {k.prazo}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${progresso}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{progresso}% concluído</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <Card data-testid="card-secao-iniciativas">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Minhas Iniciativas ({iniciativas.length})
                </CardTitle>
                <CardDescription className="mt-1">Projetos e ações que você está executando.</CardDescription>
              </div>
              <Link href="/iniciativas">
                <Button variant="outline" size="sm" className="gap-1" data-testid="link-ver-iniciativas">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {iniciativas.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-empty-iniciativas">
                Nenhuma iniciativa sob sua responsabilidade no momento.
              </p>
            )}
            {iniciativas.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-3 rounded-md hover-elevate" data-testid={`row-iniciativa-${i.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{i.titulo}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-xs">{i.status}</Badge>
                    <Badge variant="outline" className="text-xs">Prioridade {i.prioridade}</Badge>
                    {i.prazo && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {i.prazo}
                      </span>
                    )}
                  </div>
                </div>
                {i.atrasado && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">Atrasado</Badge>
                )}
                <Link href="/iniciativas">
                  <Button size="sm" variant="outline" data-testid={`button-abrir-iniciativa-${i.id}`}>Abrir</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <Card data-testid="card-secao-indicadores">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Meus Indicadores ({indicadores.length})
                </CardTitle>
                <CardDescription className="mt-1">KPIs sob sua responsabilidade.</CardDescription>
              </div>
              <Link href="/indicadores">
                <Button variant="outline" size="sm" className="gap-1" data-testid="link-ver-indicadores">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {indicadores.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-empty-indicadores">
                Nenhum indicador sob sua responsabilidade no momento.
              </p>
            )}
            {indicadores.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-3 p-3 rounded-md hover-elevate" data-testid={`row-indicador-${k.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{k.nome}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-xs">{k.perspectiva}</Badge>
                    <span>Atual: <span className="text-foreground font-medium">{k.atual}</span></span>
                    <span>Meta: <span className="text-foreground">{k.meta}</span></span>
                  </div>
                </div>
                <StatusIndicador status={k.status} />
                <Link href="/indicadores">
                  <Button size="sm" variant="outline" data-testid={`button-abrir-indicador-${k.id}`}>Abrir</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, TrendingUp, Lightbulb, Rocket, ShieldAlert, Building2 } from "lucide-react";

export default function PlanoPublico() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/plano-publico", token],
    queryFn: async () => {
      const res = await fetch(`/api/plano-publico/${token}`);
      if (!res.ok) throw new Error("Link não encontrado ou expirado");
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">Link inválido ou expirado</p>
          <p className="text-muted-foreground text-sm">Este plano estratégico não está mais disponível.</p>
        </div>
      </div>
    );
  }

  const { empresa, objetivos = [], indicadores = [], estrategias = [], iniciativas = [], riscos = [], cenarios = [] } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded-lg p-3">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{empresa?.nome || "Plano Estratégico"}</h1>
              {empresa?.setor && <p className="text-muted-foreground">{empresa.setor} · {empresa.tamanho}</p>}
              <p className="text-xs text-muted-foreground mt-1">Visualização somente leitura — BizGuideAI</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Objetivos OKR", value: objetivos.length, icon: Target },
            { label: "KPIs BSC", value: indicadores.length, icon: TrendingUp },
            { label: "Estratégias", value: estrategias.length, icon: Lightbulb },
            { label: "Iniciativas", value: iniciativas.length, icon: Rocket },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Estratégias */}
        {estrategias.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Estratégias</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {estrategias.map((e: any) => (
                <Card key={e.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-2 items-start">
                      <Badge variant="outline" className="text-xs flex-shrink-0">{e.tipo}</Badge>
                      <p className="text-sm">{e.descricao}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Objetivos OKR */}
        {objetivos.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Target className="h-5 w-5" /> Objetivos OKR</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {objetivos.map((o: any) => (
                <Card key={o.id}>
                  <CardHeader className="pb-1">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="text-xs flex-shrink-0">{o.perspectiva}</Badge>
                      <CardTitle className="text-sm font-semibold">{o.titulo}</CardTitle>
                    </div>
                  </CardHeader>
                  {o.descricao && <CardContent className="pt-0"><p className="text-xs text-muted-foreground">{o.descricao}</p></CardContent>}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Iniciativas */}
        {iniciativas.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Rocket className="h-5 w-5" /> Iniciativas</h2>
            <div className="space-y-2">
              {iniciativas.slice(0, 10).map((ini: any) => (
                <Card key={ini.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ini.titulo}</p>
                      {ini.responsavel && <p className="text-xs text-muted-foreground">Responsável: {ini.responsavel}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">{ini.status}</Badge>
                  </CardContent>
                </Card>
              ))}
              {iniciativas.length > 10 && <p className="text-xs text-muted-foreground text-center">+{iniciativas.length - 10} iniciativas adicionais</p>}
            </div>
          </section>
        )}

        {/* Riscos */}
        {riscos.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Riscos Identificados</h2>
            <div className="space-y-2">
              {riscos.slice(0, 6).map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm">{r.descricao}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">{r.categoria}</Badge>
                      <Badge variant="secondary" className="text-xs">{r.probabilidade * r.impacto}pts</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Cenários */}
        {cenarios.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Cenários Estratégicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["pessimista","base","otimista"] as const).map(tipo => {
                const c = cenarios.find((x: any) => x.tipo === tipo);
                if (!c) return null;
                return (
                  <Card key={tipo}>
                    <CardHeader className="pb-1">
                      <Badge variant="outline" className="w-fit capitalize">{tipo}</Badge>
                      <CardTitle className="text-sm">{c.titulo}</CardTitle>
                    </CardHeader>
                    {c.descricao && <CardContent className="pt-0"><p className="text-xs text-muted-foreground">{c.descricao}</p></CardContent>}
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <p className="text-xs text-center text-muted-foreground pb-4">
          Plano estratégico gerado com BizGuideAI · Visualização somente leitura
        </p>
      </div>
    </div>
  );
}

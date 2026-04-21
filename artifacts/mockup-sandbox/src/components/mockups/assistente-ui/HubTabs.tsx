import {
  Sparkles, AlertTriangle, Target, MessageSquare, Send, Calendar,
  ArrowRight, Activity, Lightbulb, Cpu, BookOpen, TrendingDown,
  ChevronRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function HubTabs() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Assistente Estratégico</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Consulting Now</div>
          </div>
          <Badge variant="secondary" className="ml-auto gap-1">
            <Calendar className="h-3 w-3" /> 21 abr
          </Badge>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <Tabs defaultValue="hoje" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="sinais" className="gap-1.5">
              Sinais
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">3</Badge>
            </TabsTrigger>
            <TabsTrigger value="conversa">Conversa</TabsTrigger>
          </TabsList>

          {/* HOJE */}
          <TabsContent value="hoje" className="mt-6 space-y-4">
            <Card className="overflow-hidden border-violet-200 dark:border-violet-900/50">
              <div className="bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className="bg-violet-600 text-white hover:bg-violet-600 gap-1 text-[10px] uppercase tracking-wide">
                          Briefing de hoje
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Cpu className="h-2.5 w-2.5" /> Gerado por IA
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">07:42</span>
                      </div>
                      <CardTitle className="text-xl leading-tight">
                        Bom dia, Marina. Um KPI crítico precisa da sua atenção.
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 space-y-2">
                    <p>
                      O <span className="font-medium">Índice de Implantação de Soluções Inovadoras</span> está em
                      vermelho há 9 dias (atual <span className="font-medium">38%</span>, meta 65%).
                    </p>
                    <p>
                      Em paralelo, a iniciativa <span className="font-medium">"Lançar 3 produtos beta"</span> está
                      atrasada em 18 dias e impacta o mesmo objetivo.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Ações sugeridas
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <button className="flex items-start gap-2.5 rounded-md border border-slate-200 dark:border-slate-800 p-3 text-left bg-white dark:bg-slate-900 hover-elevate">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Abrir o KPI crítico</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Indicadores → Inovação</div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 mt-1" />
                      </button>
                      <button className="flex items-start gap-2.5 rounded-md border border-slate-200 dark:border-slate-800 p-3 text-left bg-white dark:bg-slate-900 hover-elevate">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Sugerir 3 iniciativas</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">IA propõe ações concretas</div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 mt-1" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </TabsContent>

          {/* SINAIS */}
          <TabsContent value="sinais" className="mt-6 space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 px-1 mb-2">
              Detectado pela engine de regras · atualizado há 12 min
            </div>
            {[
              {
                icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10",
                title: "Índice de Inovação caiu de 41% para 38%",
                meta: "KPI · há 4 horas", source: "regra", action: "Investigar"
              },
              {
                icon: Target, color: "text-amber-500", bg: "bg-amber-500/10",
                title: "KR \"Lançar 3 produtos beta\" sem update há 18 dias",
                meta: "OKR · responsável: Pedro", source: "regra", action: "Cobrar update"
              },
              {
                icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10",
                title: "Risco \"Saída de talento sênior\" — prob × impacto = 16",
                meta: "Mapa de Riscos · sem mitigação", source: "regra", action: "Definir plano"
              },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover-elevate">
                <div className={`h-9 w-9 rounded-md ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{s.meta}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> via {s.source}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline">{s.action}</Button>
              </div>
            ))}
          </TabsContent>

          {/* CONVERSA */}
          <TabsContent value="conversa" className="mt-6">
            <Card className="flex flex-col h-[560px]">
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-violet-600" />
                  <CardTitle className="text-base">Conversa com o assistente</CardTitle>
                  <Badge variant="secondary" className="ml-auto text-xs">Contexto: KPI Inovação</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto py-4 space-y-4">
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm max-w-[80%]">
                    Posso decompor esse KR em entregas semanais ou propor 3 iniciativas concretas. Qual prefere?
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="rounded-md bg-violet-600 text-white px-3 py-2 text-sm max-w-[80%]">
                    Propor 3 iniciativas
                  </div>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs">MC</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 max-w-[80%]">
                    <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm">
                      Sugiro estas três iniciativas:
                    </div>
                    {[
                      "Programa interno \"Sandbox\" de 6 semanas",
                      "Parceria com 2 startups via aceleradora",
                      "OKR trimestral de adoção interna ≥ 60%",
                    ].map((it, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm bg-white dark:bg-slate-900">
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className="flex-1">{it}</span>
                        <Button size="sm" variant="ghost" className="h-7">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <Separator />
              <div className="p-3">
                <div className="relative">
                  <Input placeholder="Pergunte sobre a estratégia…" className="pr-10" />
                  <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Badge variant="secondary">Resumir trimestre</Badge>
                  <Badge variant="secondary">Pulso da equipe</Badge>
                  <Badge variant="secondary">Próxima ação</Badge>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Activity className="h-3 w-3" />
          Engine de sinais ativa · próximo refresh em 18 min
        </div>
      </div>
    </div>
  );
}

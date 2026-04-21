import {
  Sparkles, AlertTriangle, Target, TrendingDown, MessageSquare,
  Send, Calendar, Clock, ArrowRight, Activity,
  Lightbulb, FileText, BookOpen, Flame, ChevronRight, CheckCircle2, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

export function Hub() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top header bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">Assistente Estratégico</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Consulting Now · Hoje, 21 de abril</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3 w-3" /> 3 sinais ativos
            </Badge>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4" /> Histórico
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* TOP — Briefing (60%) + Sinais lateral (40%) */}
        <div className="grid grid-cols-12 gap-5">
          {/* Briefing hero */}
          <Card className="col-span-12 lg:col-span-7 overflow-hidden border-violet-200 dark:border-violet-900/50">
            <div className="bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge className="bg-violet-600 text-white hover:bg-violet-600 text-[10px] uppercase tracking-wide">
                        Briefing de hoje
                      </Badge>
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Sparkles className="h-2.5 w-2.5" /> via IA
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> 07:42
                      </span>
                    </div>
                    <CardTitle className="text-xl leading-tight">
                      Bom dia, Marina. Um KPI crítico precisa da sua atenção hoje.
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 space-y-2">
                  <p>
                    O <span className="font-medium">Índice de Implantação de Soluções Inovadoras</span> está em
                    vermelho há 9 dias — atual <span className="font-medium">38%</span>, meta 65%. Isso impacta
                    diretamente o objetivo de posicionar a consultoria como referência em inovação.
                  </p>
                  <p>
                    A iniciativa <span className="font-medium">"Lançar 3 produtos beta"</span> está atrasada em
                    18 dias e contribui para esse risco.
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

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="ghost">
                    <Clock className="h-4 w-4" /> Adiar p/ amanhã
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* SIDE — Sinais ao vivo */}
          <Card className="col-span-12 lg:col-span-5">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 space-y-0">
              <div>
                <CardTitle className="text-base">Sinais ao vivo</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> via regra
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Activity className="h-3 w-3" /> 3
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10",
                  title: "Inovação caiu de 41% → 38%",
                  meta: "KPI · há 4 horas"
                },
                {
                  icon: Target, color: "text-amber-500", bg: "bg-amber-500/10",
                  title: "KR \"3 produtos beta\" sem update",
                  meta: "OKR · 18 dias parado"
                },
                {
                  icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10",
                  title: "Risco \"saída de talento sênior\"",
                  meta: "prob × impacto = 16"
                },
              ].map((s, i) => (
                <button key={i} className="w-full flex items-center gap-3 p-2.5 rounded-md border border-slate-200 dark:border-slate-800 text-left hover-elevate">
                  <div className={`h-8 w-8 rounded-md ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.meta}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-1">
                Ver todos os sinais <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM — Chat persistente ancorado abaixo */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-600" />
              <CardTitle className="text-base">Conversa com o assistente</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">Contexto: KPI Inovação</Badge>
            </div>
          </CardHeader>
          <CardContent className="py-4">
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm max-w-[70%]">
                  Posso decompor esse KR em entregas semanais ou propor 3 iniciativas concretas. Qual prefere?
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="rounded-md bg-violet-600 text-white px-3 py-2 text-sm max-w-[70%]">
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
                <div className="space-y-2 max-w-[70%]">
                  <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm">
                    Sugiro estas três iniciativas com base no seu BMC e capacidade atual:
                  </div>
                  <div className="space-y-1.5">
                    {[
                      "Programa interno \"Sandbox\" de 6 semanas",
                      "Parceria com 2 startups via aceleradora",
                      "OKR trimestral de adoção interna ≥ 60%",
                    ].map((it, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm bg-white dark:bg-slate-900">
                        <Circle className="h-3.5 w-3.5 text-slate-400" />
                        <span className="flex-1">{it}</span>
                        <Button size="sm" variant="ghost" className="h-7">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline">
                    Criar como iniciativas <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <Separator />
          <div className="p-3">
            <div className="relative">
              <Input
                placeholder="Pergunte sobre a estratégia, peça análises ou ações…"
                className="pr-10"
              />
              <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              <Badge variant="secondary" className="cursor-pointer">Resumir trimestre</Badge>
              <Badge variant="secondary" className="cursor-pointer">Pulso da equipe</Badge>
              <Badge variant="secondary" className="cursor-pointer">Próxima ação</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

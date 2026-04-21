import {
  Sparkles, AlertTriangle, Target, TrendingDown, MessageSquare,
  Send, Calendar, Clock, ArrowRight, ChevronRight, Activity,
  Lightbulb, FileText, CheckCircle2, Circle, Flame
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

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        {/* LEFT — Briefing + Sinais */}
        <div className="col-span-8 space-y-6">
          {/* Briefing hero */}
          <Card className="overflow-hidden border-violet-200 dark:border-violet-900/50">
            <div className="bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <Calendar className="h-3 w-3" />
                      <span>Briefing diário · gerado às 07:42</span>
                    </div>
                    <CardTitle className="text-xl leading-tight">
                      Bom dia, Marina. Um KPI crítico precisa da sua atenção hoje.
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  O <span className="font-medium">Índice de Implantação de Soluções Inovadoras</span> está em
                  vermelho há 9 dias — atual <span className="font-medium">38%</span>, meta 65%. Isso impacta
                  diretamente o objetivo <span className="font-medium">"Posicionar a consultoria como referência em
                  inovação"</span>. Sugiro revisar as iniciativas associadas e talvez decompor o KR em ações mensais
                  menores.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" /> KPIs vermelhos
                    </div>
                    <div className="text-2xl font-semibold">1</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">de 7 monitorados</div>
                  </div>
                  <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <Target className="h-3 w-3 text-amber-500" /> KRs parados
                    </div>
                    <div className="text-2xl font-semibold">2</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">há mais de 14 dias</div>
                  </div>
                  <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <Flame className="h-3 w-3 text-orange-500" /> Riscos altos
                    </div>
                    <div className="text-2xl font-semibold">3</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">sem mitigação</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-600 text-white">
                    Ver KPI crítico <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Lightbulb className="h-4 w-4" /> Sugerir ações
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Clock className="h-4 w-4" /> Adiar p/ amanhã
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Sinais ao vivo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div>
                <CardTitle className="text-base">Sinais ao vivo</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  O que mudou desde ontem
                </p>
              </div>
              <Button variant="ghost" size="sm">Ver todos</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10",
                  title: "Índice de Inovação caiu de 41% para 38%",
                  meta: "KPI · há 4 horas", action: "Investigar"
                },
                {
                  icon: Target, color: "text-amber-500", bg: "bg-amber-500/10",
                  title: "KR \"Lançar 3 produtos beta\" sem update há 18 dias",
                  meta: "OKR · responsável: Pedro", action: "Cobrar update"
                },
                {
                  icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10",
                  title: "Risco \"Saída de talento sênior\" — prob × impacto = 16",
                  meta: "Mapa de Riscos · sem mitigação", action: "Definir plano"
                },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 hover-elevate">
                  <div className={`h-9 w-9 rounded-md ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{s.meta}</div>
                  </div>
                  <Button size="sm" variant="outline">{s.action}</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Histórico de briefings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Últimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { d: "20 abr", t: "OKR de receita avançou 12% — boa semana de fechamento" },
                { d: "19 abr", t: "Risco regulatório novo apareceu no PESTEL" },
                { d: "18 abr", t: "Iniciativa de marca com 3 entregas em atraso" },
                { d: "17 abr", t: "KPI de NPS bateu meta pela primeira vez no trimestre" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-md hover-elevate">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 w-14 shrink-0">{b.d}</div>
                  <div className="text-sm flex-1">{b.t}</div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Chat persistente */}
        <div className="col-span-4">
          <Card className="sticky top-20 flex flex-col h-[calc(100vh-7rem)]">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-violet-600" />
                <CardTitle className="text-base">Conversa</CardTitle>
                <Badge variant="secondary" className="ml-auto text-xs">Contexto: KPI Inovação</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Assistant message */}
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm max-w-[85%]">
                  Posso decompor esse KR em entregas semanais ou propor 3 iniciativas concretas. Qual prefere?
                </div>
              </div>
              {/* User message */}
              <div className="flex gap-2 justify-end">
                <div className="rounded-md bg-violet-600 text-white px-3 py-2 text-sm max-w-[85%]">
                  Propor 3 iniciativas
                </div>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs">MC</AvatarFallback>
                </Avatar>
              </div>
              {/* Assistant with actions */}
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 max-w-[85%]">
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
                  <Button size="sm" variant="outline" className="w-full">
                    Criar como iniciativas <ArrowRight className="h-4 w-4" />
                  </Button>
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
    </div>
  );
}

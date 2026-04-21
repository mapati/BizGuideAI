import {
  Sparkles, AlertTriangle, Target, TrendingUp, ArrowRight,
  ChevronRight, Activity, Clock, BarChart3, Users, MessageSquare,
  Lightbulb, Calendar, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function HomeCard() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="text-sm font-semibold">Consulting Now</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">/ Início</div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" /> 21 de abril, terça
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* HERO — Briefing card */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 text-white relative">
            {/* subtle pattern */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
            <CardContent className="relative p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-md bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/20">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-white/80 mb-1.5">
                    <span className="uppercase tracking-wide font-semibold">Briefing de hoje</span>
                    <span>·</span>
                    <span>gerado às 07:42</span>
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight mb-2">
                    Bom dia, Marina. Um ponto crítico precisa da sua atenção hoje.
                  </h2>
                  <p className="text-sm text-white/90 leading-relaxed max-w-2xl">
                    O <span className="font-semibold">Índice de Implantação de Soluções Inovadoras</span> está em
                    vermelho há 9 dias (38% / meta 65%). Isso ameaça o objetivo de posicionar a consultoria como
                    referência em inovação. Posso sugerir ações em 30 segundos.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button size="sm" className="bg-white text-violet-700 hover:bg-white border-white">
                      Ver KPI crítico <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur hover:bg-white/20">
                      <Lightbulb className="h-4 w-4" /> Sugerir ações
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                      Abrir hub completo
                    </Button>
                  </div>
                </div>

                {/* Mini sinais */}
                <div className="hidden md:flex flex-col gap-2 w-44 shrink-0">
                  <div className="rounded-md bg-white/10 backdrop-blur border border-white/15 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/70">
                      <AlertTriangle className="h-3 w-3" /> KPIs vermelhos
                    </div>
                    <div className="text-xl font-semibold">1</div>
                  </div>
                  <div className="rounded-md bg-white/10 backdrop-blur border border-white/15 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/70">
                      <Target className="h-3 w-3" /> KRs parados
                    </div>
                    <div className="text-xl font-semibold">2</div>
                  </div>
                  <div className="rounded-md bg-white/10 backdrop-blur border border-white/15 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/70">
                      <Activity className="h-3 w-3" /> Sinais novos
                    </div>
                    <div className="text-xl font-semibold">3</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Resto da home (resumido) */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Receita do trimestre</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">R$ 2,4M</div>
              <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                <TrendingUp className="h-3 w-3" /> +18% vs trim. anterior
              </div>
              <Progress value={72} className="mt-3 h-1.5" />
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">72% da meta</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">OKRs no trimestre</CardTitle>
              <Target className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">8 / 12</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">no caminho da meta</div>
              <Progress value={66} className="mt-3 h-1.5" />
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">66% concluídos</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Pulso da equipe</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">7,8</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">de 10 · 12 respostas</div>
              <Progress value={78} className="mt-3 h-1.5" />
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">acima da média histórica</div>
            </CardContent>
          </Card>
        </div>

        {/* Próximas ações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 space-y-0">
            <CardTitle className="text-base">Próximas ações sugeridas pelo assistente</CardTitle>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" /> Nova
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { t: "Decompor KR \"Lançar 3 produtos beta\" em entregas semanais", c: "OKRs", due: "vence quinta" },
              { t: "Definir mitigação para risco \"Saída de talento sênior\"", c: "Riscos", due: "esta semana" },
              { t: "Revisar PESTEL — risco regulatório novo identificado", c: "Análise externa", due: "" },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 hover-elevate">
                <div className="h-8 w-8 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.t}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{a.c}</span>
                    {a.due && (<><span>·</span><Clock className="h-3 w-3" /><span>{a.due}</span></>)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Floating chip preserved */}
        <div className="fixed bottom-6 right-6">
          <Button className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg hover:bg-violet-600 gap-2 rounded-full">
            <MessageSquare className="h-4 w-4" />
            Conversar com o assistente
          </Button>
        </div>
      </div>
    </div>
  );
}

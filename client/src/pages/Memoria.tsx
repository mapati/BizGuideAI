import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, AlertTriangle, Lightbulb, FileClock, Layers, Target, TrendingUp, Briefcase, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { BizzyResumoCiclo, ConteudoResumoCiclo } from "@shared/schema";

type Filtro = "todos" | "trimestre" | "objetivo" | "estrategia" | "iniciativa";

const TIPO_LABEL: Record<string, string> = {
  trimestre: "Trimestre",
  objetivo: "Objetivo",
  estrategia: "Estratégia",
  iniciativa: "Iniciativa",
};

const TIPO_ICON: Record<string, typeof Calendar> = {
  trimestre: Calendar,
  objetivo: Target,
  estrategia: TrendingUp,
  iniciativa: Briefcase,
};

function lerConteudo(row: BizzyResumoCiclo): ConteudoResumoCiclo {
  const c = (row.conteudo ?? {}) as Partial<ConteudoResumoCiclo>;
  return {
    resumoCurto: c.resumoCurto ?? "",
    conquistas: c.conquistas ?? [],
    atrasos: c.atrasos ?? [],
    licoes: c.licoes ?? [],
    decisoes: c.decisoes ?? [],
    kpisMovidos: c.kpisMovidos ?? [],
    iniciativasConcluidas: c.iniciativasConcluidas ?? [],
    iniciativasArquivadas: c.iniciativasArquivadas ?? [],
    okrsEncerrados: c.okrsEncerrados ?? [],
    retrospectivasIds: c.retrospectivasIds ?? [],
  };
}

function formatarData(value: string | Date | null | undefined): string {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function abrirBizzyComMensagem(text: string) {
  window.dispatchEvent(new CustomEvent("biz-assistant:open"));
  // pequeno delay para garantir que o chat esteja montado/aberto antes de seedar
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("biz-assistant:send", { detail: { text } }));
  }, 120);
}

function PilarLista({
  icon: Icon,
  label,
  itens,
  emptyHint,
  iconClass,
}: {
  icon: typeof CheckCircle2;
  label: string;
  itens: string[];
  emptyHint?: string;
  iconClass: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
        <span>{label}</span>
        <span className="text-[10px] text-muted-foreground/70">({itens.length})</span>
      </div>
      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 italic pl-5">{emptyHint ?? "Sem itens."}</p>
      ) : (
        <ul className="space-y-1 pl-5 text-sm list-disc marker:text-muted-foreground/60">
          {itens.map((it, idx) => (
            <li key={idx} className="text-foreground/90 leading-snug">{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResumoCard({
  resumo,
  onOpen,
}: {
  resumo: BizzyResumoCiclo;
  onOpen: () => void;
}) {
  const conteudo = lerConteudo(resumo);
  const Icon = TIPO_ICON[resumo.tipo] ?? FileClock;
  const tipoLabel = TIPO_LABEL[resumo.tipo] ?? resumo.tipo;
  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer"
      onClick={onOpen}
      data-testid={`card-resumo-${resumo.id}`}
    >
      <CardHeader className="pb-3 flex flex-row items-start gap-3 flex-wrap">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted flex-shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-semibold truncate" data-testid={`text-periodo-${resumo.id}`}>
              {tipoLabel} · {resumo.periodo}
            </CardTitle>
            <Badge variant="secondary" data-testid={`badge-versao-${resumo.id}`}>
              v{resumo.versao}
            </Badge>
            {resumo.imutavel && (
              <Badge variant="outline" className="text-[10px]">imutável</Badge>
            )}
          </div>
          <CardDescription className="text-xs mt-1">
            Gerado em {formatarData(resumo.criadoEm)} · origem {resumo.geradoPor}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {conteudo.resumoCurto && (
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">
            {conteudo.resumoCurto}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <PilarLista
            icon={CheckCircle2}
            label="Conquistas"
            iconClass="text-emerald-600 dark:text-emerald-400"
            itens={conteudo.conquistas.slice(0, 3)}
            emptyHint="Sem conquistas registradas."
          />
          <PilarLista
            icon={AlertTriangle}
            label="Atrasos"
            iconClass="text-amber-600 dark:text-amber-400"
            itens={conteudo.atrasos.slice(0, 3)}
            emptyHint="Sem atrasos registrados."
          />
          <PilarLista
            icon={Lightbulb}
            label="Lições"
            iconClass="text-sky-600 dark:text-sky-400"
            itens={conteudo.licoes.slice(0, 3)}
            emptyHint="Sem lições registradas."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DetalheResumo({ resumo }: { resumo: BizzyResumoCiclo }) {
  const c = lerConteudo(resumo);
  return (
    <div className="space-y-5">
      {c.resumoCurto && (
        <section>
          <h3 className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Resumo</h3>
          <p className="text-sm text-foreground/90 leading-relaxed" data-testid="text-resumo-curto">
            {c.resumoCurto}
          </p>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <PilarLista icon={CheckCircle2} label="Conquistas" iconClass="text-emerald-600 dark:text-emerald-400" itens={c.conquistas} />
        <PilarLista icon={AlertTriangle} label="Atrasos" iconClass="text-amber-600 dark:text-amber-400" itens={c.atrasos} />
        <PilarLista icon={Lightbulb} label="Lições" iconClass="text-sky-600 dark:text-sky-400" itens={c.licoes} />
      </section>

      {c.kpisMovidos.length > 0 && (
        <section>
          <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">KPIs movidos</h3>
          <div className="space-y-2">
            {c.kpisMovidos.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
                <span className="font-medium">{k.nome}</span>
                <span className="text-muted-foreground">
                  {k.de ?? "—"} → {k.para ?? "—"}
                  {k.statusFinal ? ` · ${k.statusFinal}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.decisoes.length > 0 && (
        <section>
          <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">Decisões</h3>
          <ul className="space-y-2 text-sm">
            {c.decisoes.map((d, i) => (
              <li key={i} className="rounded-md border p-2.5">
                <p className="font-medium">{d.titulo}</p>
                {d.escolha && <p className="text-muted-foreground text-xs mt-0.5">{d.escolha}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.iniciativasConcluidas.length > 0 && (
        <section>
          <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">Iniciativas concluídas</h3>
          <ul className="space-y-2 text-sm">
            {c.iniciativasConcluidas.map((it) => (
              <li key={it.id} className="rounded-md border p-2.5">
                <p className="font-medium">{it.titulo}</p>
                {it.nota && <p className="text-muted-foreground text-xs mt-0.5">{it.nota}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.iniciativasArquivadas.length > 0 && (
        <section>
          <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">Iniciativas arquivadas</h3>
          <ul className="space-y-2 text-sm">
            {c.iniciativasArquivadas.map((it) => (
              <li key={it.id} className="rounded-md border p-2.5">
                <p className="font-medium">{it.titulo}</p>
                {it.motivo && <p className="text-muted-foreground text-xs mt-0.5">Motivo: {it.motivo}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.okrsEncerrados.length > 0 && (
        <section>
          <h3 className="text-xs font-medium uppercase text-muted-foreground mb-2">OKRs encerrados</h3>
          <ul className="space-y-2 text-sm">
            {c.okrsEncerrados.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                <span className="font-medium">{o.titulo}</span>
                <span className="text-muted-foreground text-xs">
                  {o.pctMedio !== null ? `${Math.round(o.pctMedio)}% médio` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function Memoria() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [aberto, setAberto] = useState<BizzyResumoCiclo | null>(null);

  const { data, isLoading } = useQuery<{ resumos: BizzyResumoCiclo[] }>({
    queryKey: ["/api/resumos-ciclo", filtro],
    queryFn: async () => {
      const url = filtro === "todos" ? "/api/resumos-ciclo" : `/api/resumos-ciclo?tipo=${filtro}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar resumos.");
      return res.json();
    },
  });

  const resumos = data?.resumos ?? [];

  const contadores = useMemo(() => {
    const map: Record<string, number> = { trimestre: 0, objetivo: 0, estrategia: 0, iniciativa: 0 };
    for (const r of resumos) {
      if (filtro === "todos" && map[r.tipo] !== undefined) map[r.tipo]++;
    }
    return map;
  }, [resumos, filtro]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Memória do Bizzy"
        description="Resumos imutáveis dos ciclos da sua estratégia: trimestres encerrados, objetivos arquivados, estratégias revistas e iniciativas concluídas. Use para revisar o que aprendemos e o que ainda está em aberto."
      />

      <Card className="bg-muted/30">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <p>
              Os resumos são gerados automaticamente quando você fecha um ciclo, e ficam aqui para consulta. Para gerar um novo agora, peça ao Bizzy.
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => abrirBizzyComMensagem("Bizzy, por favor gere um resumo do trimestre atual com 'gerar_resumo_ciclo_manual' (tipo=trimestre).")}
            data-testid="button-gerar-resumo-trimestre"
          >
            <Sparkles className="h-4 w-4" />
            Gerar resumo do trimestre
          </Button>
        </CardContent>
      </Card>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList className="flex flex-wrap gap-1" data-testid="tabs-filtro-tipo">
          <TabsTrigger value="todos" data-testid="tab-todos">Todos</TabsTrigger>
          <TabsTrigger value="trimestre" data-testid="tab-trimestre">
            <Calendar className="h-3.5 w-3.5" /> Trimestres
            {filtro === "todos" && contadores.trimestre > 0 && (
              <Badge variant="secondary" className="ml-1">{contadores.trimestre}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="objetivo" data-testid="tab-objetivo">
            <Target className="h-3.5 w-3.5" /> Objetivos
            {filtro === "todos" && contadores.objetivo > 0 && (
              <Badge variant="secondary" className="ml-1">{contadores.objetivo}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="estrategia" data-testid="tab-estrategia">
            <TrendingUp className="h-3.5 w-3.5" /> Estratégias
            {filtro === "todos" && contadores.estrategia > 0 && (
              <Badge variant="secondary" className="ml-1">{contadores.estrategia}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="iniciativa" data-testid="tab-iniciativa">
            <Briefcase className="h-3.5 w-3.5" /> Iniciativas
            {filtro === "todos" && contadores.iniciativa > 0 && (
              <Badge variant="secondary" className="ml-1">{contadores.iniciativa}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filtro} className="mt-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : resumos.length === 0 ? (
            <Card className="text-center">
              <CardContent className="p-10 space-y-3">
                <div className="flex justify-center">
                  <Layers className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-vazio-memoria">
                  {filtro === "todos"
                    ? "Ainda não há resumos de ciclo na memória do Bizzy. Quando você fechar um trimestre, arquivar um objetivo ou registrar uma retrospectiva, os resumos aparecerão aqui."
                    : `Nenhum resumo do tipo ${TIPO_LABEL[filtro] ?? filtro} foi gerado ainda.`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    abrirBizzyComMensagem(
                      filtro === "todos" || filtro === "trimestre"
                        ? "Bizzy, gere um resumo do trimestre atual usando 'gerar_resumo_ciclo_manual' (tipo=trimestre)."
                        : `Bizzy, quero gerar um resumo de ${TIPO_LABEL[filtro]?.toLowerCase()} agora. Me ajude a escolher qual e use 'gerar_resumo_ciclo_manual'.`,
                    )
                  }
                  data-testid="button-pedir-resumo-bizzy"
                >
                  Pedir ao Bizzy
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3" data-testid="lista-resumos-ciclo">
              {resumos.map((r) => (
                <ResumoCard key={r.id} resumo={r} onOpen={() => setAberto(r)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {aberto && (
            <>
              <SheetHeader className="space-y-1">
                <SheetTitle data-testid="text-detalhe-titulo">
                  {TIPO_LABEL[aberto.tipo] ?? aberto.tipo} · {aberto.periodo}
                </SheetTitle>
                <SheetDescription>
                  Versão {aberto.versao} · gerado em {formatarData(aberto.criadoEm)} · origem {aberto.geradoPor}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5">
                <DetalheResumo resumo={aberto} />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    abrirBizzyComMensagem(
                      `Bizzy, me ajude a interpretar o resumo de ciclo ${aberto.id} (${TIPO_LABEL[aberto.tipo] ?? aberto.tipo} · ${aberto.periodo}). O que aprendemos e o que devemos fazer diferente agora?`,
                    )
                  }
                  data-testid="button-discutir-resumo-bizzy"
                >
                  Discutir com o Bizzy
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    abrirBizzyComMensagem(
                      aberto.tipo === "trimestre"
                        ? `Bizzy, gere uma nova versão do resumo do trimestre ${aberto.periodo} usando 'gerar_resumo_ciclo_manual' (tipo=trimestre, periodo='${aberto.periodo}').`
                        : `Bizzy, gere uma nova versão do resumo deste ${aberto.tipo} usando 'gerar_resumo_ciclo_manual' (tipo='${aberto.tipo}', referenciaId='${aberto.referenciaId ?? ""}').`,
                    )
                  }
                  data-testid="button-regenerar-resumo"
                >
                  Re-gerar versão
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

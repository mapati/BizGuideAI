import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Calendar, FileText, ListChecks, GitBranch } from "lucide-react";
import type { ReuniaoPauta, ReuniaoAta, DecisaoEstrategica, RevisaoAgendada } from "@shared/schema";

function abaFromQuery(): "pautas" | "atas" | "decisoes" | "revisoes" {
  if (typeof window === "undefined") return "pautas";
  const sp = new URLSearchParams(window.location.search);
  const a = sp.get("aba");
  if (a === "atas" || a === "decisoes" || a === "revisoes" || a === "pautas") return a;
  return "pautas";
}

function highlightedId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("id");
}

function fmtData(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR");
}

function PautasList({ highlightId }: { highlightId: string | null }) {
  const { data, isLoading } = useQuery<ReuniaoPauta[]>({ queryKey: ["/api/ritos/pautas"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground" data-testid="text-pautas-vazio">Nenhuma pauta gerada ainda. Peça ao Assistente: "Gere a pauta da reunião semanal de amanhã".</p>;
  return (
    <div className="space-y-3">
      {data.map((p) => {
        const c = (p.conteudo ?? {}) as any;
        const isHi = highlightId === p.id;
        return (
          <Card key={p.id} data-testid={`card-pauta-${p.id}`} className={isHi ? "ring-2 ring-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Badge>{p.tipo}</Badge>
                <CardTitle className="text-base">Pauta de {fmtData(p.dataAlvo)}</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">gerada {fmtData(p.geradaEm as unknown as string)}</span>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {c.resumo && <p data-testid={`text-pauta-resumo-${p.id}`}>{c.resumo}</p>}
              {Array.isArray(c.kpisCriticos) && c.kpisCriticos.length > 0 && (
                <div>
                  <p className="font-medium mb-1">KPIs críticos</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {c.kpisCriticos.map((k: any) => <li key={k.id}>{k.nome} — {k.atual} vs meta {k.meta} ({k.status})</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(c.iniciativasARevisar) && c.iniciativasARevisar.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Iniciativas a revisar</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {c.iniciativasARevisar.map((i: any) => <li key={i.id}>{i.titulo} — {i.status}{i.diasEmAtraso ? ` (atrasada ${i.diasEmAtraso}d)` : ""}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(c.krsProximosPrazo) && c.krsProximosPrazo.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Metas com prazo curto</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {c.krsProximosPrazo.map((k: any) => <li key={k.id}>{k.metrica} ({k.objetivo}) — prazo {fmtData(k.prazo)}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(c.decisoesPendentes) && c.decisoesPendentes.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Decisões pendentes</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {c.decisoesPendentes.map((d: any, idx: number) => <li key={idx}>{d.descricao}</li>)}
                  </ul>
                </div>
              )}
              {p.ataId && <p className="text-xs"><Badge variant="outline">Ata vinculada</Badge></p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AtasList({ highlightId }: { highlightId: string | null }) {
  const { data, isLoading } = useQuery<ReuniaoAta[]>({ queryKey: ["/api/ritos/atas"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground" data-testid="text-atas-vazio">Nenhuma ata registrada. Após a reunião, peça ao Assistente: "Registra a ata".</p>;
  return (
    <div className="space-y-3">
      {data.map((a) => {
        const decisoes = (a.decisoes ?? []) as Array<any>;
        const enc = (a.encaminhamentos ?? []) as Array<any>;
        const isHi = highlightId === a.id;
        return (
          <Card key={a.id} data-testid={`card-ata-${a.id}`} className={isHi ? "ring-2 ring-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-base">Ata de {fmtData(a.registradaEm as unknown as string)}</CardTitle>
              {a.pautaId && <Badge variant="outline">Pauta vinculada</Badge>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {decisoes.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Decisões</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {decisoes.map((d: any, idx: number) => <li key={idx}>{d.titulo}{d.justificativa ? ` — ${d.justificativa}` : ""}</li>)}
                  </ul>
                </div>
              )}
              {enc.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Encaminhamentos ({enc.length})</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {enc.map((e: any, idx: number) => <li key={idx}>{e.tipo}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DecisoesList({ highlightId }: { highlightId: string | null }) {
  const { data, isLoading } = useQuery<DecisaoEstrategica[]>({ queryKey: ["/api/ritos/decisoes"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground" data-testid="text-decisoes-vazio">Nenhuma decisão registrada. Use o Assistente: "Registra a decisão de…".</p>;
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const isHi = highlightId === d.id;
        const alts = (d.alternativas ?? []) as Array<any>;
        return (
          <Card key={d.id} data-testid={`card-decisao-${d.id}`} className={isHi ? "ring-2 ring-primary" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.titulo}</CardTitle>
              <p className="text-xs text-muted-foreground">{fmtData(d.registradaEm as unknown as string)}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {d.contexto && <p><span className="font-medium">Contexto:</span> {d.contexto}</p>}
              <p><span className="font-medium">Escolha:</span> {d.escolha}</p>
              {d.justificativa && <p className="text-muted-foreground">{d.justificativa}</p>}
              {alts.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Alternativas avaliadas</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {alts.map((a: any, idx: number) => <li key={idx}>{a.descricao}{a.prosContras ? ` — ${a.prosContras}` : ""}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RevisoesList({ highlightId }: { highlightId: string | null }) {
  const { data, isLoading } = useQuery<RevisaoAgendada[]>({ queryKey: ["/api/ritos/revisoes"] });
  const { toast } = useToast();
  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "concluida" | "cancelada" | "pendente" }) =>
      apiRequest("PATCH", `/api/ritos/revisoes/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ritos/revisoes"] });
      toast({ title: "Revisão atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message ?? "Falha ao atualizar", variant: "destructive" }),
  });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground" data-testid="text-revisoes-vazio">Nenhuma revisão agendada. Peça ao Assistente: "Agenda uma revisão da iniciativa X em 2 semanas".</p>;
  const hojeIso = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-3">
      {data.map((r) => {
        const isHi = highlightId === r.id;
        const vencida = r.status === "pendente" && r.dataAlvo <= hojeIso;
        return (
          <Card key={r.id} data-testid={`card-revisao-${r.id}`} className={isHi ? "ring-2 ring-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{r.escopo}</Badge>
                <CardTitle className="text-base">Revisão em {fmtData(r.dataAlvo)}</CardTitle>
                {vencida && <Badge variant="destructive">Vencida</Badge>}
                {r.status !== "pendente" && <Badge variant="outline">{r.status}</Badge>}
              </div>
              {r.status === "pendente" && (
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="outline" disabled={updateMut.isPending}
                    onClick={() => updateMut.mutate({ id: r.id, status: "concluida" })}
                    data-testid={`button-revisao-concluir-${r.id}`}>
                    <CheckCircle2 className="w-4 h-4" /> Concluir
                  </Button>
                  <Button size="sm" variant="ghost" disabled={updateMut.isPending}
                    onClick={() => updateMut.mutate({ id: r.id, status: "cancelada" })}
                    data-testid={`button-revisao-cancelar-${r.id}`}>
                    <XCircle className="w-4 h-4" /> Cancelar
                  </Button>
                </div>
              )}
            </CardHeader>
            {(r.foco || r.escopoId) && (
              <CardContent className="text-sm space-y-1">
                {r.escopoId && <p className="text-muted-foreground text-xs">item: {r.escopoId}</p>}
                {r.foco && <p>{r.foco}</p>}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default function Ritos() {
  const [, setLocation] = useLocation();
  const aba = useMemo(abaFromQuery, []);
  const hi = useMemo(highlightedId, []);

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4" data-testid="page-ritos-gestao">
      <header>
        <h1 className="text-2xl font-bold">Rituais de Gestão</h1>
        <p className="text-sm text-muted-foreground">Pautas, atas, decisões e revisões agendadas geradas pelo Assistente.</p>
      </header>
      <Tabs defaultValue={aba} onValueChange={(v) => setLocation(`/ritos/gestao?aba=${v}`)}>
        <TabsList>
          <TabsTrigger value="pautas" data-testid="tab-pautas"><Calendar className="w-4 h-4 mr-1" /> Pautas</TabsTrigger>
          <TabsTrigger value="atas" data-testid="tab-atas"><FileText className="w-4 h-4 mr-1" /> Atas</TabsTrigger>
          <TabsTrigger value="decisoes" data-testid="tab-decisoes"><GitBranch className="w-4 h-4 mr-1" /> Decisões</TabsTrigger>
          <TabsTrigger value="revisoes" data-testid="tab-revisoes"><ListChecks className="w-4 h-4 mr-1" /> Revisões</TabsTrigger>
        </TabsList>
        <TabsContent value="pautas" className="mt-4"><PautasList highlightId={hi} /></TabsContent>
        <TabsContent value="atas" className="mt-4"><AtasList highlightId={hi} /></TabsContent>
        <TabsContent value="decisoes" className="mt-4"><DecisoesList highlightId={hi} /></TabsContent>
        <TabsContent value="revisoes" className="mt-4"><RevisoesList highlightId={hi} /></TabsContent>
      </Tabs>
    </div>
  );
}

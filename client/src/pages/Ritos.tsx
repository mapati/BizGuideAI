import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Calendar, FileText, ListChecks, GitBranch, Pencil, Trash2 } from "lucide-react";
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

function EditarDecisaoDialog({ decisao, open, onOpenChange }: { decisao: DecisaoEstrategica; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [titulo, setTitulo] = useState(decisao.titulo);
  const [contexto, setContexto] = useState(decisao.contexto ?? "");
  const [escolha, setEscolha] = useState(decisao.escolha);
  const [justificativa, setJustificativa] = useState(decisao.justificativa ?? "");
  const mut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/ritos/decisoes/${decisao.id}`, { titulo, contexto, escolha, justificativa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ritos/decisoes"] });
      toast({ title: "Decisão atualizada" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message ?? "Falha ao atualizar", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={`dialog-editar-decisao-${decisao.id}`}>
        <DialogHeader>
          <DialogTitle>Editar decisão</DialogTitle>
          <DialogDescription>Ajuste título, contexto, escolha e justificativa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`dec-titulo-${decisao.id}`}>Título</Label>
            <Input id={`dec-titulo-${decisao.id}`} value={titulo} onChange={(e) => setTitulo(e.target.value)} data-testid={`input-decisao-titulo-${decisao.id}`} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`dec-contexto-${decisao.id}`}>Contexto</Label>
            <Textarea id={`dec-contexto-${decisao.id}`} value={contexto} onChange={(e) => setContexto(e.target.value)} rows={3} data-testid={`input-decisao-contexto-${decisao.id}`} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`dec-escolha-${decisao.id}`}>Escolha</Label>
            <Textarea id={`dec-escolha-${decisao.id}`} value={escolha} onChange={(e) => setEscolha(e.target.value)} rows={2} data-testid={`input-decisao-escolha-${decisao.id}`} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`dec-justif-${decisao.id}`}>Justificativa</Label>
            <Textarea id={`dec-justif-${decisao.id}`} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={3} data-testid={`input-decisao-justificativa-${decisao.id}`} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid={`button-decisao-cancelar-${decisao.id}`}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !titulo.trim() || !escolha.trim()} data-testid={`button-decisao-salvar-${decisao.id}`}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarRevisaoDialog({ revisao, open, onOpenChange }: { revisao: RevisaoAgendada; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [dataAlvo, setDataAlvo] = useState(revisao.dataAlvo);
  const [foco, setFoco] = useState(revisao.foco ?? "");
  const mut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/ritos/revisoes/${revisao.id}`, { dataAlvo, foco }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ritos/revisoes"] });
      toast({ title: "Revisão atualizada" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message ?? "Falha ao atualizar", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={`dialog-editar-revisao-${revisao.id}`}>
        <DialogHeader>
          <DialogTitle>Editar revisão</DialogTitle>
          <DialogDescription>Remarque a data ou ajuste o foco.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`rev-data-${revisao.id}`}>Data</Label>
            <Input id={`rev-data-${revisao.id}`} type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} data-testid={`input-revisao-data-${revisao.id}`} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`rev-foco-${revisao.id}`}>Foco</Label>
            <Textarea id={`rev-foco-${revisao.id}`} value={foco} onChange={(e) => setFoco(e.target.value)} rows={3} data-testid={`input-revisao-foco-${revisao.id}`} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid={`button-revisao-edit-cancelar-${revisao.id}`}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !dataAlvo} data-testid={`button-revisao-salvar-${revisao.id}`}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmarRemocao({ open, onOpenChange, onConfirm, descricao, isPending, testId }: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void; descricao: string; isPending: boolean; testId: string }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover registro?</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirm(); }} disabled={isPending} data-testid={`${testId}-confirmar`}>
            {isPending ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DecisaoCard({ d, isHi }: { d: DecisaoEstrategica; isHi: boolean }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const alts = (d.alternativas ?? []) as Array<any>;
  const delMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/ritos/decisoes/${d.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ritos/decisoes"] });
      toast({ title: "Decisão removida" });
      setConfirmOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message ?? "Falha ao remover", variant: "destructive" }),
  });
  return (
    <Card data-testid={`card-decisao-${d.id}`} className={isHi ? "ring-2 ring-primary" : ""}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base">{d.titulo}</CardTitle>
          <p className="text-xs text-muted-foreground">{fmtData(d.registradaEm as unknown as string)}</p>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)} data-testid={`button-decisao-editar-${d.id}`}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setConfirmOpen(true)} data-testid={`button-decisao-remover-${d.id}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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
      {editOpen && <EditarDecisaoDialog decisao={d} open={editOpen} onOpenChange={setEditOpen} />}
      <ConfirmarRemocao
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => delMut.mutate()}
        descricao={`A decisão "${d.titulo}" será removida permanentemente.`}
        isPending={delMut.isPending}
        testId={`alert-decisao-remover-${d.id}`}
      />
    </Card>
  );
}

function DecisoesList({ highlightId }: { highlightId: string | null }) {
  const { data, isLoading } = useQuery<DecisaoEstrategica[]>({ queryKey: ["/api/ritos/decisoes"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground" data-testid="text-decisoes-vazio">Nenhuma decisão registrada. Use o Assistente: "Registra a decisão de…".</p>;
  return (
    <div className="space-y-3">
      {data.map((d) => <DecisaoCard key={d.id} d={d} isHi={highlightId === d.id} />)}
    </div>
  );
}

function RevisaoCard({ r, isHi }: { r: RevisaoAgendada; isHi: boolean }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hojeIso = new Date().toISOString().slice(0, 10);
  const vencida = r.status === "pendente" && r.dataAlvo <= hojeIso;
  const updateMut = useMutation({
    mutationFn: ({ status }: { status: "concluida" | "cancelada" | "pendente" }) =>
      apiRequest("PATCH", `/api/ritos/revisoes/${r.id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ritos/revisoes"] });
      toast({ title: "Revisão atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message ?? "Falha ao atualizar", variant: "destructive" }),
  });
  const delMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/ritos/revisoes/${r.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ritos/revisoes"] });
      toast({ title: "Revisão removida" });
      setConfirmOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message ?? "Falha ao remover", variant: "destructive" }),
  });
  return (
    <Card data-testid={`card-revisao-${r.id}`} className={isHi ? "ring-2 ring-primary" : ""}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>{r.escopo}</Badge>
          <CardTitle className="text-base">Revisão em {fmtData(r.dataAlvo)}</CardTitle>
          {vencida && <Badge variant="destructive">Vencida</Badge>}
          {r.status !== "pendente" && <Badge variant="outline">{r.status}</Badge>}
        </div>
        <div className="flex gap-1 flex-wrap">
          {r.status === "pendente" && (
            <>
              <Button size="sm" variant="outline" disabled={updateMut.isPending}
                onClick={() => updateMut.mutate({ status: "concluida" })}
                data-testid={`button-revisao-concluir-${r.id}`}>
                <CheckCircle2 className="w-4 h-4" /> Concluir
              </Button>
              <Button size="sm" variant="ghost" disabled={updateMut.isPending}
                onClick={() => updateMut.mutate({ status: "cancelada" })}
                data-testid={`button-revisao-cancelar-${r.id}`}>
                <XCircle className="w-4 h-4" /> Cancelar
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)} data-testid={`button-revisao-editar-${r.id}`}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setConfirmOpen(true)} data-testid={`button-revisao-remover-${r.id}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      {(r.foco || r.escopoId) && (
        <CardContent className="text-sm space-y-1">
          {r.escopoId && <p className="text-muted-foreground text-xs">item: {r.escopoId}</p>}
          {r.foco && <p>{r.foco}</p>}
        </CardContent>
      )}
      {editOpen && <EditarRevisaoDialog revisao={r} open={editOpen} onOpenChange={setEditOpen} />}
      <ConfirmarRemocao
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => delMut.mutate()}
        descricao={`Esta revisão (${r.escopo}, ${fmtData(r.dataAlvo)}) será removida permanentemente.`}
        isPending={delMut.isPending}
        testId={`alert-revisao-remover-${r.id}`}
      />
    </Card>
  );
}

function RevisoesList({ highlightId }: { highlightId: string | null }) {
  const { data, isLoading } = useQuery<RevisaoAgendada[]>({ queryKey: ["/api/ritos/revisoes"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground" data-testid="text-revisoes-vazio">Nenhuma revisão agendada. Peça ao Assistente: "Agenda uma revisão da iniciativa X em 2 semanas".</p>;
  return (
    <div className="space-y-3">
      {data.map((r) => <RevisaoCard key={r.id} r={r} isHi={highlightId === r.id} />)}
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

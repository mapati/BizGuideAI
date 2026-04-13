import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Loader2, Trash2, Edit2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Risco } from "@shared/schema";

const categorias = ["estrategico", "operacional", "financeiro", "regulatorio", "tecnologico"];
const statusOpts = ["identificado", "em_mitigacao", "aceito", "eliminado"];
const statusLabels: Record<string, string> = {
  identificado: "Identificado",
  em_mitigacao: "Em Mitigação",
  aceito: "Aceito",
  eliminado: "Eliminado",
};
const statusColors: Record<string, string> = {
  identificado: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  em_mitigacao: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  aceito: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  eliminado: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
};

function matrizScore(prob: number, imp: number) {
  const score = prob * imp;
  if (score >= 16) return { label: "Crítico", cls: "bg-red-600 text-white" };
  if (score >= 9) return { label: "Alto", cls: "bg-orange-500 text-white" };
  if (score >= 4) return { label: "Médio", cls: "bg-yellow-400 text-yellow-900" };
  return { label: "Baixo", cls: "bg-green-500 text-white" };
}

const emptyForm = { descricao: "", categoria: "estrategico", probabilidade: "3", impacto: "3", status: "identificado", planoMitigacao: "" };

export default function Riscos() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Risco | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const { data: riscos = [], isLoading } = useQuery<Risco[]>({ queryKey: ["/api/riscos"] });

  const inv = () => queryClient.invalidateQueries({ queryKey: ["/api/riscos"] });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/riscos", body),
    onSuccess: () => { inv(); fechar(); toast({ title: "Risco registrado!" }); },
    onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/riscos/${id}`, body),
    onSuccess: () => { inv(); fechar(); toast({ title: "Risco atualizado!" }); },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/riscos/${id}`),
    onSuccess: () => { inv(); toast({ title: "Risco removido" }); },
  });

  const gerarMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/gerar-riscos", {}),
    onSuccess: (d) => { inv(); toast({ title: `${d?.riscos?.length ?? 0} riscos identificados com IA!` }); },
    onError: () => toast({ title: "Erro ao gerar", variant: "destructive" }),
  });

  function abrirCriar() { setEditando(null); setForm(emptyForm); setDialogOpen(true); }
  function abrirEditar(r: Risco) {
    setEditando(r);
    setForm({ descricao: r.descricao, categoria: r.categoria, probabilidade: String(r.probabilidade), impacto: String(r.impacto), status: r.status, planoMitigacao: r.planoMitigacao });
    setDialogOpen(true);
  }
  function fechar() { setDialogOpen(false); setEditando(null); }

  function salvar() {
    const body = { ...form, probabilidade: Number(form.probabilidade), impacto: Number(form.impacto) };
    if (editando) updateMut.mutate({ id: editando.id, body });
    else createMut.mutate(body);
  }

  const filtrados = filtroStatus === "todos" ? riscos : riscos.filter(r => r.status === filtroStatus);
  const sorted = [...filtrados].sort((a, b) => (b.probabilidade * b.impacto) - (a.probabilidade * a.impacto));
  const isPending = createMut.isPending || updateMut.isPending;

  const criticos = riscos.filter(r => r.probabilidade * r.impacto >= 16).length;
  const altos = riscos.filter(r => { const s = r.probabilidade * r.impacto; return s >= 9 && s < 16; }).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Gestão de Riscos"
        description="Identifique, avalie e mitigue riscos estratégicos com base na probabilidade e impacto."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => gerarMut.mutate()} disabled={gerarMut.isPending} data-testid="button-gerar-riscos-ia">
              {gerarMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar com IA
            </Button>
            <Button onClick={abrirCriar} data-testid="button-add-risco">
              <Plus className="h-4 w-4 mr-2" /> Novo Risco
            </Button>
          </div>
        }
      />

      {/* Resumo */}
      {riscos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["todos", "identificado", "em_mitigacao", "eliminado"] as const).map(s => {
            const count = s === "todos" ? riscos.length : riscos.filter(r => r.status === s).length;
            return (
              <Card key={s} className={`cursor-pointer transition-colors ${filtroStatus === s ? "ring-2 ring-primary" : ""}`} onClick={() => setFiltroStatus(s)} data-testid={`filter-status-${s}`}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s === "todos" ? "Total" : statusLabels[s]}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(criticos > 0 || altos > 0) && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-200 dark:border-red-800 rounded-md px-4 py-2.5 text-sm">
          <ShieldAlert className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span className="text-red-700 dark:text-red-400">
            {criticos > 0 && <strong>{criticos} risco(s) crítico(s)</strong>}
            {criticos > 0 && altos > 0 && " e "}
            {altos > 0 && <strong>{altos} risco(s) alto(s)</strong>}
            {" "} exigem atenção imediata.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum risco registrado ainda.</p>
            <p className="text-sm mt-1">Use "Gerar com IA" para identificar riscos automaticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(r => {
            const nivel = matrizScore(r.probabilidade, r.impacto);
            return (
              <Card key={r.id} data-testid={`card-risco-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center gap-1 min-w-[52px]">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${nivel.cls}`}>{nivel.label}</span>
                      <span className="text-xs text-muted-foreground">{r.probabilidade * r.impacto}pts</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-start justify-between">
                        <p className="text-sm font-medium leading-snug flex-1">{r.descricao}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge variant="outline" className={`text-xs border ${statusColors[r.status] || ""}`}>{statusLabels[r.status] || r.status}</Badge>
                          <Button size="icon" variant="ghost" onClick={() => abrirEditar(r)} data-testid={`button-edit-risco-${r.id}`}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(r.id)} disabled={deleteMut.isPending} data-testid={`button-delete-risco-${r.id}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>Categoria: <span className="capitalize font-medium">{r.categoria}</span></span>
                        <span>Probabilidade: <span className="font-medium">{r.probabilidade}/5</span></span>
                        <span>Impacto: <span className="font-medium">{r.impacto}/5</span></span>
                      </div>
                      {r.planoMitigacao && (
                        <p className="text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded px-2 py-1"><span className="font-medium text-foreground">Mitigação:</span> {r.planoMitigacao}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Risco" : "Novo Risco"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Descrição do Risco</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o risco de forma clara e objetiva..." rows={2} data-testid="textarea-descricao-risco" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger data-testid="select-categoria-risco"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-status-risco"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOpts.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Probabilidade (1-5)</Label>
                <Select value={form.probabilidade} onValueChange={v => setForm(f => ({ ...f, probabilidade: v }))}>
                  <SelectTrigger data-testid="select-prob-risco"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} — {["Muito Baixa","Baixa","Média","Alta","Muito Alta"][n-1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Impacto (1-5)</Label>
                <Select value={form.impacto} onValueChange={v => setForm(f => ({ ...f, impacto: v }))}>
                  <SelectTrigger data-testid="select-impacto-risco"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} — {["Muito Baixo","Baixo","Médio","Alto","Muito Alto"][n-1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Plano de Mitigação</Label>
              <Textarea value={form.planoMitigacao} onChange={e => setForm(f => ({ ...f, planoMitigacao: e.target.value }))} placeholder="Quais ações reduzem esta ameaça?" rows={2} data-testid="textarea-mitigacao-risco" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={fechar}>Cancelar</Button>
              <Button onClick={salvar} disabled={isPending || !form.descricao} data-testid="button-salvar-risco">
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editando ? "Salvar Alterações" : "Registrar Risco"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

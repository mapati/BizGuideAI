import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Loader2, Trash2, Edit2, TrendingDown, Minus, TrendingUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Cenario } from "@shared/schema";

const tipoConfig = {
  pessimista: { label: "Pessimista", icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10 border-red-200 dark:border-red-800" },
  base: { label: "Base", icon: Minus, color: "text-yellow-600", bg: "bg-yellow-500/10 border-yellow-200 dark:border-yellow-800" },
  otimista: { label: "Otimista", icon: TrendingUp, color: "text-green-600", bg: "bg-green-500/10 border-green-200 dark:border-green-800" },
};

export default function Cenarios() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Cenario | null>(null);
  const [form, setForm] = useState({ tipo: "base", titulo: "", descricao: "", premissas: "", respostaEstrategica: "" });

  const { data: cenarios = [], isLoading } = useQuery<Cenario[]>({ queryKey: ["/api/cenarios"] });

  const inv = () => queryClient.invalidateQueries({ queryKey: ["/api/cenarios"] });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/cenarios", body),
    onSuccess: () => { inv(); fechar(); toast({ title: "Cenário criado!" }); },
    onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/cenarios/${id}`, body),
    onSuccess: () => { inv(); fechar(); toast({ title: "Cenário atualizado!" }); },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cenarios/${id}`),
    onSuccess: () => { inv(); toast({ title: "Cenário removido" }); },
  });

  const gerarMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/gerar-cenarios", {}),
    onSuccess: (d) => { inv(); toast({ title: `${d?.cenarios?.length ?? 0} cenários gerados com IA!` }); },
    onError: () => toast({ title: "Erro ao gerar", variant: "destructive" }),
  });

  function abrirCriar() {
    setEditando(null);
    setForm({ tipo: "base", titulo: "", descricao: "", premissas: "", respostaEstrategica: "" });
    setDialogOpen(true);
  }

  function abrirEditar(c: Cenario) {
    setEditando(c);
    const premList = (() => { try { return (JSON.parse(c.premissas) as string[]).join("\n"); } catch { return c.premissas; } })();
    setForm({ tipo: c.tipo, titulo: c.titulo, descricao: c.descricao, premissas: premList, respostaEstrategica: c.respostaEstrategica });
    setDialogOpen(true);
  }

  function fechar() { setDialogOpen(false); setEditando(null); }

  function salvar() {
    const body = {
      tipo: form.tipo,
      titulo: form.titulo,
      descricao: form.descricao,
      premissas: JSON.stringify(form.premissas.split("\n").filter(Boolean)),
      respostaEstrategica: form.respostaEstrategica,
    };
    if (editando) updateMut.mutate({ id: editando.id, body });
    else createMut.mutate(body);
  }

  const isPending = createMut.isPending || updateMut.isPending;

  const grupos = (["pessimista", "base", "otimista"] as const).map(tipo => ({
    tipo,
    items: cenarios.filter(c => c.tipo === tipo),
  }));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Planejamento de Cenários"
        description="Mapeie os cenários pessimista, base e otimista para antecipar mudanças e preparar respostas estratégicas."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => gerarMut.mutate()} disabled={gerarMut.isPending} data-testid="button-gerar-cenarios-ia">
              {gerarMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar com IA
            </Button>
            <Button onClick={abrirCriar} data-testid="button-add-cenario">
              <Plus className="h-4 w-4 mr-2" /> Novo Cenário
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {grupos.map(({ tipo, items }) => {
            const cfg = tipoConfig[tipo];
            const Icon = cfg.icon;
            return (
              <div key={tipo} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${cfg.color}`} />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{cfg.label}</h3>
                  <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
                </div>
                {items.length === 0 && (
                  <Card className={`border-dashed ${cfg.bg}`}>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum cenário {cfg.label.toLowerCase()} definido
                    </CardContent>
                  </Card>
                )}
                {items.map(c => {
                  const premList: string[] = (() => { try { return JSON.parse(c.premissas); } catch { return [c.premissas]; } })();
                  return (
                    <Card key={c.id} className={`border ${cfg.bg}`} data-testid={`card-cenario-${c.id}`}>
                      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold leading-tight">{c.titulo || "Sem título"}</CardTitle>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => abrirEditar(c)} data-testid={`button-edit-cenario-${c.id}`}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(c.id)} disabled={deleteMut.isPending} data-testid={`button-delete-cenario-${c.id}`}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {c.descricao && <p className="text-muted-foreground leading-relaxed">{c.descricao}</p>}
                        {premList.filter(Boolean).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Premissas</p>
                            <ul className="space-y-1">
                              {premList.filter(Boolean).map((p, i) => (
                                <li key={i} className="flex gap-2 text-xs"><span className="text-muted-foreground">•</span>{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {c.respostaEstrategica && (
                          <div className="bg-background/60 rounded p-2">
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Resposta Estratégica</p>
                            <p className="text-xs leading-relaxed">{c.respostaEstrategica}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Cenário" : "Novo Cenário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger data-testid="select-tipo-cenario"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessimista">Pessimista</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="otimista">Otimista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Recessão econômica prolongada" data-testid="input-titulo-cenario" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o contexto deste cenário..." rows={3} data-testid="textarea-descricao-cenario" />
            </div>
            <div className="space-y-1.5">
              <Label>Premissas (uma por linha)</Label>
              <Textarea value={form.premissas} onChange={e => setForm(f => ({ ...f, premissas: e.target.value }))} placeholder="PIB cai 3%&#10;Taxa de juros acima de 15%&#10;Desemprego cresce 2pp" rows={3} data-testid="textarea-premissas-cenario" />
            </div>
            <div className="space-y-1.5">
              <Label>Resposta Estratégica</Label>
              <Textarea value={form.respostaEstrategica} onChange={e => setForm(f => ({ ...f, respostaEstrategica: e.target.value }))} placeholder="Como a empresa deve responder neste cenário..." rows={3} data-testid="textarea-resposta-cenario" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={fechar}>Cancelar</Button>
              <Button onClick={salvar} disabled={isPending || !form.titulo} data-testid="button-salvar-cenario">
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editando ? "Salvar Alterações" : "Criar Cenário"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

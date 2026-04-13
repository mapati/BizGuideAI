import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, DollarSign, Users, Cog, GraduationCap, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Objetivo, BscRelacao } from "@shared/schema";

const perspectivas = [
  { valor: "Financeira", icon: DollarSign, cor: "border-green-300 dark:border-green-700", bg: "bg-green-500/10", texto: "text-green-700 dark:text-green-400" },
  { valor: "Clientes", icon: Users, cor: "border-blue-300 dark:border-blue-700", bg: "bg-blue-500/10", texto: "text-blue-700 dark:text-blue-400" },
  { valor: "Processos Internos", icon: Cog, cor: "border-orange-300 dark:border-orange-700", bg: "bg-orange-500/10", texto: "text-orange-700 dark:text-orange-400" },
  { valor: "Aprendizado e Crescimento", icon: GraduationCap, cor: "border-purple-300 dark:border-purple-700", bg: "bg-purple-500/10", texto: "text-purple-700 dark:text-purple-400" },
];

export default function MapaBSC() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");

  const { data: objetivos = [] } = useQuery<Objetivo[]>({ queryKey: ["/api/objetivos"] });
  const { data: relacoes = [], isLoading } = useQuery<BscRelacao[]>({ queryKey: ["/api/bsc-relacoes"] });

  const inv = () => queryClient.invalidateQueries({ queryKey: ["/api/bsc-relacoes"] });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/bsc-relacoes", body),
    onSuccess: () => { inv(); setDialogOpen(false); setOrigemId(""); setDestinoId(""); toast({ title: "Relação criada!" }); },
    onError: () => toast({ title: "Erro ao criar relação", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bsc-relacoes/${id}`),
    onSuccess: () => { inv(); toast({ title: "Relação removida" }); },
  });

  const objetivosByPerspectiva = perspectivas.map(p => ({
    ...p,
    objetivos: objetivos.filter(o => o.perspectiva === p.valor),
  }));

  const getObj = (id: string) => objetivos.find(o => o.id === id);

  const relacoesMap = new Map<string, string[]>();
  for (const rel of relacoes) {
    const list = relacoesMap.get(rel.origemId) || [];
    list.push(rel.destinoId);
    relacoesMap.set(rel.origemId, list);
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Mapa Estratégico BSC"
        description="Visualize as relações de causa e efeito entre objetivos nas 4 perspectivas do Balanced Scorecard."
        action={
          <Button onClick={() => setDialogOpen(true)} disabled={objetivos.length < 2} data-testid="button-add-relacao">
            <Plus className="h-4 w-4 mr-2" /> Nova Relação
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : objetivos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p>Nenhum objetivo OKR cadastrado ainda.</p>
            <p className="text-sm mt-1">Crie objetivos na página de OKRs antes de visualizar o mapa.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Relações existentes */}
          {relacoes.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Relações Causa-Efeito ({relacoes.length})</p>
                <div className="space-y-2">
                  {relacoes.map(rel => {
                    const origem = getObj(rel.origemId);
                    const destino = getObj(rel.destinoId);
                    return (
                      <div key={rel.id} className="flex items-center gap-2 text-sm" data-testid={`relacao-${rel.id}`}>
                        <span className="font-medium truncate max-w-[200px]">{origem?.titulo || "?"}</span>
                        <ArrowDown className="h-3 w-3 text-muted-foreground flex-shrink-0 rotate-[-90deg]" />
                        <span className="truncate max-w-[200px]">{destino?.titulo || "?"}</span>
                        <Button size="icon" variant="ghost" className="ml-auto flex-shrink-0" onClick={() => deleteMut.mutate(rel.id)} data-testid={`button-delete-relacao-${rel.id}`}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mapa por perspectiva */}
          {objetivosByPerspectiva.map(p => {
            if (p.objetivos.length === 0) return null;
            const Icon = p.icon;
            return (
              <div key={p.valor} className={`border rounded-md ${p.cor} ${p.bg}`}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-inherit">
                  <Icon className={`h-4 w-4 ${p.texto}`} />
                  <span className={`text-sm font-semibold ${p.texto}`}>{p.valor}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">{p.objetivos.length}</Badge>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {p.objetivos.map(obj => {
                    const destinos = relacoesMap.get(obj.id) || [];
                    return (
                      <div key={obj.id} className="bg-background rounded-md p-3 border border-border/50" data-testid={`obj-card-${obj.id}`}>
                        <p className="text-sm font-medium leading-snug">{obj.titulo}</p>
                        {destinos.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {destinos.map(dId => {
                              const dest = getObj(dId);
                              return dest ? (
                                <div key={dId} className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ArrowDown className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{dest.titulo}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Relação Causa-Efeito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Defina que objetivo "causa" (origem) leva a qual objetivo "efeito" (destino).</p>
            <div className="space-y-1.5">
              <Label>Objetivo Origem (Causa)</Label>
              <Select value={origemId} onValueChange={setOrigemId}>
                <SelectTrigger data-testid="select-origem-bsc"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {objetivos.filter(o => o.id !== destinoId).map(o => (
                    <SelectItem key={o.id} value={o.id}>[{o.perspectiva}] {o.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center"><ArrowDown className="h-6 w-6 text-muted-foreground" /></div>
            <div className="space-y-1.5">
              <Label>Objetivo Destino (Efeito)</Label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger data-testid="select-destino-bsc"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {objetivos.filter(o => o.id !== origemId).map(o => (
                    <SelectItem key={o.id} value={o.id}>[{o.perspectiva}] {o.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => createMut.mutate({ origemId, destinoId })} disabled={!origemId || !destinoId || createMut.isPending} data-testid="button-salvar-relacao">
                {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Criar Relação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

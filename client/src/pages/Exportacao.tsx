import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Copy, Check, Link, ExternalLink, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Compartilhamento, Objetivo, Indicador, Estrategia, Iniciativa } from "@shared/schema";

export default function Exportacao() {
  const { toast } = useToast();
  const [copiado, setCopiado] = useState<string | null>(null);

  const { data: compartilhamentos = [], isLoading } = useQuery<Compartilhamento[]>({ queryKey: ["/api/compartilhamentos"] });
  const { data: objetivos = [] } = useQuery<Objetivo[]>({ queryKey: ["/api/objetivos"] });
  const { data: indicadores = [] } = useQuery<Indicador[]>({ queryKey: ["/api/indicadores"] });
  const { data: estrategias = [] } = useQuery<Estrategia[]>({ queryKey: ["/api/estrategias"] });
  const { data: iniciativas = [] } = useQuery<Iniciativa[]>({ queryKey: ["/api/iniciativas"] });

  const inv = () => queryClient.invalidateQueries({ queryKey: ["/api/compartilhamentos"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/compartilhamentos", { tipo: "completo" }),
    onSuccess: () => { inv(); toast({ title: "Link criado com sucesso!" }); },
    onError: () => toast({ title: "Erro ao criar link", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/compartilhamentos/${id}`),
    onSuccess: () => { inv(); toast({ title: "Link desativado" }); },
  });

  function copiarLink(token: string) {
    const url = `${window.location.origin}/plano-publico/${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(token);
    setTimeout(() => setCopiado(null), 2000);
    toast({ title: "Link copiado!" });
  }

  function abrirLink(token: string) {
    window.open(`/plano-publico/${token}`, "_blank");
  }

  function exportarJSON() {
    const data = { objetivos, indicadores, estrategias, iniciativas, exportadoEm: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plano-estrategico-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Exportação e Compartilhamento"
        description="Compartilhe seu plano estratégico com parceiros, investidores ou conselheiros através de links de leitura ou exportações."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link className="h-4 w-4" />
              Link de Leitura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Gere um link read-only com visão completa do seu plano. Ideal para compartilhar com conselhos, investidores ou parceiros.</p>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="w-full" data-testid="button-criar-link">
              {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Novo Link
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Exporte todos os dados do seu plano estratégico em formato estruturado para uso externo.</p>
            <Button variant="outline" onClick={exportarJSON} className="w-full" data-testid="button-exportar-json">
              <FileText className="h-4 w-4 mr-2" />
              Exportar como JSON
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Links ativos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>Links Ativos</span>
            <Badge variant="secondary">{compartilhamentos.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : compartilhamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum link criado ainda.</p>
          ) : (
            <div className="space-y-2">
              {compartilhamentos.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-md border" data-testid={`link-${c.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate text-muted-foreground">{`${window.location.origin}/plano-publico/${c.token}`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Criado em {new Date(c.criadoEm).toLocaleDateString("pt-BR")}
                      {c.criadoPor && ` por ${c.criadoPor}`}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => copiarLink(c.token)} data-testid={`button-copiar-${c.id}`}>
                      {copiado === c.token ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => abrirLink(c.token)} data-testid={`button-abrir-${c.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(c.id)} disabled={deleteMut.isPending} data-testid={`button-delete-link-${c.id}`}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do plano */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo do Plano Estratégico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Objetivos OKR", value: objetivos.length },
              { label: "KPIs BSC", value: indicadores.length },
              { label: "Estratégias", value: estrategias.length },
              { label: "Iniciativas", value: iniciativas.length },
            ].map(item => (
              <div key={item.label} className="text-center" data-testid={`summary-${item.label.toLowerCase().replace(/\s/g,"-")}`}>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

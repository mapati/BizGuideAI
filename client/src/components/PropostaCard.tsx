import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Sparkles, AlertTriangle, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface PropostaPreview {
  titulo: string;
  descricao: string;
  campos: Array<{ label: string; valor: string }>;
  ctaConfirmar?: string;
  ctaIgnorar?: string;
  ctaAjustar?: string;
}

export interface Proposta {
  logId: string;
  ferramenta: string;
  preview: PropostaPreview;
  parametros: Record<string, unknown>;
}

type Estado = "proposta" | "confirmada" | "ignorada" | "ajustada" | "falhou";

const FERRAMENTAS_LABEL: Record<string, string> = {
  criar_iniciativa: "Nova iniciativa",
  atualizar_iniciativa: "Atualizar iniciativa",
  criar_okr: "Novo OKR",
  atualizar_okr: "Atualizar OKR",
  atualizar_progresso_kr: "Atualizar KR",
  criar_indicador: "Novo indicador",
  atualizar_valor_indicador: "Registrar leitura",
  navegar_para: "Abrir página",
};

export function PropostaCard({ proposta }: { proposta: Proposta }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [estado, setEstado] = useState<Estado>("proposta");
  const [erro, setErro] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"confirmar" | "ignorar" | "ajustar" | null>(null);

  const { logId, ferramenta, preview, parametros } = proposta;

  const handleConfirmar = async () => {
    setSubmitting("confirmar");
    setErro(null);
    try {
      const r = (await apiRequest("POST", `/api/ai/proposta/${logId}/confirmar`, {})) as {
        ok: true;
        resultado: { resumo: string; rota?: string };
      };
      setEstado("confirmada");
      toast({ title: "Ação aplicada", description: r.resultado?.resumo ?? "Concluído." });
      const queries = ["/api/iniciativas", "/api/objetivos", "/api/indicadores", "/api/meu-painel/resumo", "/api/ai/propostas"];
      for (const q of queries) queryClient.invalidateQueries({ queryKey: [q] });
      if (r.resultado?.rota) {
        setTimeout(() => navigate(r.resultado.rota!), 600);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg);
      setEstado("falhou");
      toast({ title: "Não foi possível aplicar", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  };

  const handleIgnorar = async () => {
    setSubmitting("ignorar");
    try {
      await apiRequest("POST", `/api/ai/proposta/${logId}/ignorar`, {});
      setEstado("ignorada");
      queryClient.invalidateQueries({ queryKey: ["/api/ai/propostas"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro ao ignorar", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  };

  // Ajustar = marca proposta como `ajustada` no log e leva o usuário ao
  // formulário tradicional da entidade, com os parâmetros sugeridos passados
  // por sessionStorage para pré-preenchimento opcional pela página destino.
  const handleAjustar = async () => {
    setSubmitting("ajustar");
    try {
      const r = (await apiRequest("POST", `/api/ai/proposta/${logId}/ajustar`, {})) as {
        ok: true;
        formRota: string;
        parametros: Record<string, unknown>;
        ferramenta: string;
      };
      setEstado("ajustada");
      try {
        sessionStorage.setItem(
          `proposta-ajuste:${r.ferramenta}`,
          JSON.stringify({ logId, parametros: r.parametros, recebidoEm: Date.now() })
        );
      } catch { /* ignora se sessionStorage não disponível */ }
      queryClient.invalidateQueries({ queryKey: ["/api/ai/propostas"] });
      toast({
        title: "Vamos ajustar",
        description: "Abrindo o formulário com os campos sugeridos.",
      });
      setTimeout(() => navigate(r.formRota), 400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro ao ajustar", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card className="border-violet-200 dark:border-violet-900/50" data-testid={`card-proposta-${logId}`}>
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {FERRAMENTAS_LABEL[ferramenta] ?? ferramenta}
              </Badge>
              {estado === "confirmada" && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 gap-1 text-[10px]">
                  <CheckCircle2 className="h-2.5 w-2.5" /> confirmada
                </Badge>
              )}
              {estado === "ignorada" && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <XCircle className="h-2.5 w-2.5" /> ignorada
                </Badge>
              )}
              {estado === "ajustada" && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Pencil className="h-2.5 w-2.5" /> ajustada
                </Badge>
              )}
              {estado === "falhou" && (
                <Badge className="bg-destructive text-destructive-foreground gap-1 text-[10px]">
                  <AlertTriangle className="h-2.5 w-2.5" /> falhou
                </Badge>
              )}
            </div>
            <div className="text-sm font-semibold leading-snug" data-testid={`text-proposta-titulo-${logId}`}>
              {preview.titulo}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{preview.descricao}</div>
          </div>
        </div>

        {preview.campos?.length > 0 && (
          <div className="rounded-md border bg-muted/30 px-2.5 py-2 space-y-1">
            {preview.campos.map((c, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-muted-foreground min-w-[88px] shrink-0">{c.label}</span>
                <span className="font-medium break-words">{c.valor}</span>
              </div>
            ))}
          </div>
        )}

        {erro && (
          <div className="text-xs text-destructive" data-testid={`text-proposta-erro-${logId}`}>
            {erro}
          </div>
        )}

        {estado === "proposta" && (
          <div className="flex gap-2 flex-wrap pt-0.5">
            <Button
              size="sm"
              onClick={handleConfirmar}
              disabled={submitting !== null}
              data-testid={`button-proposta-confirmar-${logId}`}
              className="gap-1.5"
            >
              {submitting === "confirmar" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {preview.ctaConfirmar ?? "Confirmar"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAjustar}
              disabled={submitting !== null}
              data-testid={`button-proposta-ajustar-${logId}`}
              className="gap-1.5"
            >
              {submitting === "ajustar" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
              {preview.ctaAjustar ?? "Ajustar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleIgnorar}
              disabled={submitting !== null}
              data-testid={`button-proposta-ignorar-${logId}`}
              className="gap-1.5"
            >
              {submitting === "ignorar" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {preview.ctaIgnorar ?? "Ignorar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Sparkles, AlertTriangle, Pencil, ArrowRight } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface PropostaPreview {
  titulo: string;
  descricao: string;
  // valorAnterior é opcional e só vem quando a tool é de atualização e a
  // proposta de fato muda o campo (no-ops já são filtrados no backend —
  // ver enrichPreview em assistant-tools.ts). Quando presente, o card
  // renderiza "antes → depois" para o usuário enxergar a mudança.
  campos: Array<{ label: string; valor: string; valorAnterior?: string }>;
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

// Task #189 — Resposta de continuação após confirmação (loop agêntico).
export interface ContinuacaoPlano {
  plano: { plano: { id: string; titulo: string; status: string; passoAtual: number; totalPassos: number }; passos: Array<{ id: string; ordem: number; titulo: string; status: string }> } | null;
  passoConcluidoOrdem: number;
  proximasPropostas: Proposta[];
  mensagem: string;
  finalizado: boolean;
}

type Estado = "proposta" | "confirmada" | "ignorada" | "ajustada" | "falhou";

// Mapa tool → campo de identificação da entidade existente (para `?editar=<id>`).
// Tools de criação ficam fora do mapa e usam `?novo=1`.
const ENTIDADE_ID_PARAM: Record<string, { idField: string; extra?: Record<string, string> }> = {
  atualizar_iniciativa: { idField: "id" },
  encerrar_iniciativa: { idField: "id" },
  atualizar_okr: { idField: "objetivoId" },
  adicionar_kr_a_okr: { idField: "objetivoId", extra: { tipo: "novo-kr" } },
  atualizar_kr: { idField: "resultadoChaveId", extra: { tipo: "kr" } },
  atualizar_progresso_kr: { idField: "resultadoChaveId", extra: { tipo: "kr" } },
  atualizar_valor_indicador: { idField: "indicadorId" },
  atualizar_risco: { idField: "riscoId" },
  registrar_mitigacao: { idField: "riscoId" },
  // Task #287
  atualizar_estrategia: { idField: "estrategiaId" },
  arquivar_estrategia: { idField: "estrategiaId" },
  atualizar_bloco_bmc: { idField: "blocoId" },
  arquivar_bloco_bmc: { idField: "blocoId" },
  atualizar_cenario: { idField: "cenarioId" },
  arquivar_cenario: { idField: "cenarioId" },
  remover_relacao_bsc: { idField: "relacaoId" },
};

function construirUrlAjuste(
  formRota: string,
  ferramenta: string,
  parametros: Record<string, unknown>,
): string {
  // navegar_para não tem formulário a pré-preencher.
  if (ferramenta === "navegar_para") return formRota;

  const usp = new URLSearchParams();
  const cfg = ENTIDADE_ID_PARAM[ferramenta];
  if (cfg) {
    const id = parametros[cfg.idField];
    if (typeof id === "string" && id) {
      usp.set("editar", id);
    } else {
      // Sem ID → cai no formulário em modo "novo" para o usuário escolher.
      usp.set("novo", "1");
    }
    if (cfg.extra) for (const [k, v] of Object.entries(cfg.extra)) usp.set(k, v);
  } else {
    usp.set("novo", "1");
  }
  for (const [k, v] of Object.entries(parametros)) {
    if (cfg && k === cfg.idField) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      const str = String(v);
      if (str.length > 0) usp.set(k, str);
    }
  }
  const qs = usp.toString();
  return qs ? `${formRota}?${qs}` : formRota;
}

const FERRAMENTAS_LABEL: Record<string, string> = {
  criar_iniciativa: "Nova iniciativa",
  atualizar_iniciativa: "Atualizar iniciativa",
  encerrar_iniciativa: "Encerrar iniciativa",
  criar_okr: "Novo OKR",
  atualizar_okr: "Atualizar OKR",
  adicionar_kr_a_okr: "Adicionar meta",
  atualizar_kr: "Editar meta",
  atualizar_progresso_kr: "Atualizar KR",
  criar_indicador: "Novo indicador",
  atualizar_valor_indicador: "Registrar leitura",
  criar_risco: "Novo risco",
  atualizar_risco: "Atualizar risco",
  registrar_mitigacao: "Registrar mitigação",
  navegar_para: "Abrir página",
  abrir_entidade: "Abrir item",
  // Task #287
  criar_estrategia: "Nova estratégia",
  atualizar_estrategia: "Atualizar estratégia",
  arquivar_estrategia: "Arquivar estratégia",
  criar_bloco_bmc: "Bloco do BMC",
  atualizar_bloco_bmc: "Atualizar bloco BMC",
  arquivar_bloco_bmc: "Arquivar bloco BMC",
  criar_relacao_bsc: "Nova relação BSC",
  remover_relacao_bsc: "Remover relação BSC",
  criar_cenario: "Novo cenário",
  atualizar_cenario: "Atualizar cenário",
  arquivar_cenario: "Arquivar cenário",
};

// Tools cuja confirmação não cria/atualiza dado: o objetivo é apenas levar o
// usuário a uma página/modal. Para essas, ao confirmar, navegamos direto em vez
// de exigir um segundo clique no toast/botão "Abrir item".
const TOOLS_AUTO_NAVEGAR: ReadonlySet<string> = new Set(["abrir_entidade", "navegar_para"]);

// Tools que não têm "campos a ajustar" — o botão Ajustar não faz sentido.
const TOOLS_SEM_AJUSTE: ReadonlySet<string> = new Set(["abrir_entidade", "navegar_para"]);

export function PropostaCard({
  proposta,
  onContinuacao,
}: {
  proposta: Proposta;
  onContinuacao?: (cont: ContinuacaoPlano) => void;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [estado, setEstado] = useState<Estado>("proposta");
  const [erro, setErro] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"confirmar" | "ignorar" | "ajustar" | null>(null);
  const [resolvidoEm, setResolvidoEm] = useState<Date | null>(null);
  const [rotaEntidade, setRotaEntidade] = useState<string | null>(null);

  const { logId, ferramenta, preview, parametros } = proposta;

  const handleConfirmar = async () => {
    setSubmitting("confirmar");
    setErro(null);
    try {
      const r = (await apiRequest("POST", `/api/ai/proposta/${logId}/confirmar`, {})) as {
        ok: true;
        resultado: { resumo: string; rota?: string; entidadeTipo?: string; entidadeId?: string };
        continuacao?: ContinuacaoPlano | null;
      };
      setEstado("confirmada");
      setResolvidoEm(new Date());
      const rotaDestino = r.resultado?.rota ?? null;
      setRotaEntidade(rotaDestino);
      const autoNavegar = TOOLS_AUTO_NAVEGAR.has(ferramenta) && !!rotaDestino;
      toast({
        title: "Ação aplicada",
        description: r.resultado?.resumo ?? "Concluído.",
        action: rotaDestino && !autoNavegar ? (
          <ToastAction
            altText="Abrir item criado"
            onClick={() => navigate(rotaDestino)}
            data-testid={`toast-action-abrir-${logId}`}
          >
            Abrir
          </ToastAction>
        ) : undefined,
      });
      if (autoNavegar && rotaDestino) {
        // Tool de navegação pura (abrir_entidade / navegar_para): leva
        // o usuário direto, sem exigir um segundo clique.
        setTimeout(() => navigate(rotaDestino), 250);
      }
      const queries = ["/api/iniciativas", "/api/objetivos", "/api/indicadores", "/api/meu-painel/resumo", "/api/ai/propostas", "/api/ai/planos", "/api/ai/planos/ativo"];
      for (const q of queries) queryClient.invalidateQueries({ queryKey: [q] });
      if (r.continuacao && onContinuacao) onContinuacao(r.continuacao);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Mesma lógica do Ajustar: a proposta pode já ter sido resolvida em
      // outra aba/recarga. Sincroniza o estado local em vez de mostrar erro.
      if (/já está (confirmada|ajustada|ignorada)/i.test(msg)) {
        const novo = /confirmada/i.test(msg)
          ? "confirmada"
          : /ajustada/i.test(msg)
          ? "ajustada"
          : "ignorada";
        setEstado(novo);
        toast({ title: "Sugestão já resolvida", description: msg });
      } else {
        setErro(msg);
        setEstado("falhou");
        toast({ title: "Não foi possível aplicar", description: msg, variant: "destructive" });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const handleIgnorar = async () => {
    setSubmitting("ignorar");
    try {
      const r = (await apiRequest("POST", `/api/ai/proposta/${logId}/ignorar`, {})) as {
        ok: true;
        continuacao?: ContinuacaoPlano | null;
      };
      setEstado("ignorada");
      const queries = ["/api/ai/propostas", "/api/ai/planos", "/api/ai/planos/ativo"];
      for (const q of queries) queryClient.invalidateQueries({ queryKey: [q] });
      if (r.continuacao && onContinuacao) onContinuacao(r.continuacao);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/já está (confirmada|ajustada|ignorada)/i.test(msg)) {
        const novo = /confirmada/i.test(msg)
          ? "confirmada"
          : /ajustada/i.test(msg)
          ? "ajustada"
          : "ignorada";
        setEstado(novo);
        toast({ title: "Sugestão já resolvida", description: msg });
      } else {
        toast({ title: "Erro ao ignorar", description: msg, variant: "destructive" });
      }
    } finally {
      setSubmitting(null);
    }
  };

  // Ajustar: marca proposta como `ajustada` no log e leva o usuário ao
  // formulário tradicional da entidade. Pré-preenchemos via querystring
  // (?novo=1&campo=valor ou ?editar=<id>&campo=valor) — formato consumido pelo
  // hook useDeepLinkDialog em todas as páginas-alvo (Iniciativas, OKRs, Indicadores).
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
      queryClient.invalidateQueries({ queryKey: ["/api/ai/propostas"] });
      toast({
        title: "Vamos ajustar",
        description: "Abrindo o formulário com os campos sugeridos.",
      });
      const url = construirUrlAjuste(r.formRota, r.ferramenta, r.parametros);
      // Fecha o assistente para que o formulário de ajuste apareça sem
      // sobreposição. AIAssistant escuta este evento e baixa o drawer.
      window.dispatchEvent(new CustomEvent("biz-assistant:close"));
      setTimeout(() => navigate(url), 400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ao recarregar a conversa (ex.: trocar de aba e voltar), as
      // propostas reaparecem com o estado local "proposta" — mesmo que o
      // backend já as tenha registrado como ajustadas/confirmadas/ignoradas.
      // Se o usuário clicar de novo em Ajustar, o servidor responde 409
      // ("já está ajustada"). Tratamos isso como sucesso: sincroniza o
      // estado local e reabre o formulário com os parâmetros já conhecidos.
      if (/já está ajustada/i.test(msg)) {
        setEstado("ajustada");
        queryClient.invalidateQueries({ queryKey: ["/api/ai/propostas"] });
        const url = construirUrlAjuste("/dashboard", ferramenta, parametros);
        toast({
          title: "Esta sugestão já estava em ajuste",
          description: "Reabrindo o formulário para você concluir.",
        });
        window.dispatchEvent(new CustomEvent("biz-assistant:close"));
        setTimeout(() => navigate(url), 300);
      } else if (/já está (confirmada|ignorada)/i.test(msg)) {
        setEstado(msg.includes("confirmada") ? "confirmada" : "ignorada");
        toast({
          title: "Sugestão já resolvida",
          description: msg,
        });
      } else {
        toast({ title: "Erro ao ajustar", description: msg, variant: "destructive" });
      }
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
                <>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 gap-1 text-[10px]">
                    <CheckCircle2 className="h-2.5 w-2.5" /> confirmada
                  </Badge>
                  {resolvidoEm && (
                    <span
                      className="text-[10px] text-muted-foreground"
                      data-testid={`text-proposta-aplicado-em-${logId}`}
                    >
                      em {resolvidoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {rotaEntidade && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // Fecha o assistente para que o formulário/dialog
                        // de edição apareça sem sobreposição. AIAssistant
                        // escuta este evento e baixa o drawer.
                        window.dispatchEvent(new CustomEvent("biz-assistant:close"));
                        setTimeout(() => navigate(rotaEntidade), 200);
                      }}
                      data-testid={`button-proposta-abrir-${logId}`}
                      className="h-6 px-2 text-[10px] gap-1"
                    >
                      Abrir item
                    </Button>
                  )}
                </>
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
            {preview.campos.map((c, i) => {
              const temDiff =
                typeof c.valorAnterior === "string" && c.valorAnterior !== c.valor;
              return (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="text-muted-foreground min-w-[88px] shrink-0">{c.label}</span>
                  {temDiff ? (
                    <span
                      className="font-medium break-words flex flex-wrap items-baseline gap-1.5"
                      data-testid={`text-proposta-diff-${logId}-${i}`}
                    >
                      <span
                        className="line-through text-muted-foreground decoration-muted-foreground/60"
                        data-testid={`text-proposta-valor-anterior-${logId}-${i}`}
                      >
                        <span className="sr-only">Valor anterior: </span>
                        {c.valorAnterior}
                      </span>
                      <ArrowRight
                        className="h-3 w-3 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      <span data-testid={`text-proposta-valor-novo-${logId}-${i}`}>
                        <span className="sr-only">Novo valor: </span>
                        {c.valor}
                      </span>
                    </span>
                  ) : (
                    <span className="font-medium break-words">{c.valor}</span>
                  )}
                </div>
              );
            })}
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
            {!TOOLS_SEM_AJUSTE.has(ferramenta) && (
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
            )}
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

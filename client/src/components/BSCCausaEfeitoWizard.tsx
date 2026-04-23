import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Circle, ArrowUp, GitBranch } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Perspectiva = "Financeira" | "Clientes" | "Processos Internos" | "Aprendizado e Crescimento";

const PERSPECTIVAS_ORDEM: Perspectiva[] = [
  "Financeira",
  "Clientes",
  "Processos Internos",
  "Aprendizado e Crescimento",
];

const PERSPECTIVA_LABELS: Record<Perspectiva, string> = {
  "Financeira": "Financeira",
  "Clientes": "Clientes",
  "Processos Internos": "Processos Internos",
  "Aprendizado e Crescimento": "Aprendizado e Crescimento",
};

const PERSPECTIVA_DESC: Record<Perspectiva, string> = {
  "Financeira":
    "Topo do mapa. Ancorado nos seus indicadores de diagnóstico, define os resultados financeiros que tudo o resto vai habilitar.",
  "Clientes":
    "Pré-requisito da Financeira. Define o que precisa acontecer com os clientes para viabilizar os resultados financeiros.",
  "Processos Internos":
    "Pré-requisito de Clientes (e indiretamente da Financeira). Define os processos internos que sustentam a entrega de valor ao cliente.",
  "Aprendizado e Crescimento":
    "Base do mapa. Capital humano, cultura e tecnologia que tornam todos os processos acima possíveis.",
};

type ObjetivoGerado = {
  titulo: string;
  descricao?: string;
  prazo?: string;
  perspectiva: string;
  estrategiaId?: string | null;
  iniciativaId?: string | null;
  justificativaCausaEfeito?: string;
};

type ObjetivosPorPerspectiva = Partial<Record<Perspectiva, ObjetivoGerado[]>>;

type IndicadorDiagnostico = { id: string; nome: string; meta?: string; atual?: string; perspectiva: string };

export interface BSCCausaEfeitoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  // Lista de perspectivas exibidas em outros lugares da página de OKRs.
  // Aceita o `valor` como string solta para evitar acoplamento de tipo com
  // a página de OKRs (que mantém um array com outros campos).
  perspectivas: { valor: string; label: string }[];
  onComplete: () => void;
}

export function BSCCausaEfeitoWizard({
  open,
  onOpenChange,
  empresaId,
  onComplete,
}: BSCCausaEfeitoWizardProps) {
  const { toast } = useToast();
  // Etapa: 0..3 = perspectivas; 4 = mapa final
  const [etapa, setEtapa] = useState<number>(0);
  const [quantidadePorPerspectiva, setQuantidadePorPerspectiva] = useState<number>(2);
  const [instrucao, setInstrucao] = useState<string>("");
  const [objetivosPorPersp, setObjetivosPorPersp] = useState<ObjetivosPorPerspectiva>({});
  const [salvando, setSalvando] = useState(false);

  const { data: indicadoresDiag = [] } = useQuery<IndicadorDiagnostico[]>({
    queryKey: ["/api/indicadores", empresaId, "diagnostico-bsc-wizard"],
    queryFn: async () => {
      const all = (await apiRequest("GET", "/api/indicadores", undefined)) as IndicadorDiagnostico[];
      return (all || []).filter((i) => i.perspectiva === "diagnostico");
    },
    enabled: open,
  });

  const perspectivaAtual: Perspectiva | null =
    etapa >= 0 && etapa < PERSPECTIVAS_ORDEM.length ? PERSPECTIVAS_ORDEM[etapa] : null;

  const objetivosAnteriores = useMemo(() => {
    const out: { perspectiva: string; titulo: string; descricao?: string }[] = [];
    for (let i = 0; i < etapa; i++) {
      const persp = PERSPECTIVAS_ORDEM[i];
      const list = objetivosPorPersp[persp] || [];
      for (const o of list) {
        out.push({ perspectiva: persp, titulo: o.titulo, descricao: o.descricao });
      }
    }
    return out;
  }, [etapa, objetivosPorPersp]);

  const gerarMutation = useMutation({
    mutationFn: async () => {
      if (!perspectivaAtual) throw new Error("Etapa inválida");
      const body = {
        empresaId,
        modoBSC: true,
        quantidade: quantidadePorPerspectiva,
        foco: [perspectivaAtual],
        objetivosAnteriores,
        ...(instrucao.trim() ? { instrucaoAdicional: instrucao.trim() } : {}),
      };
      const resp = (await apiRequest("POST", "/api/ai/gerar-objetivos", body)) as { objetivos: ObjetivoGerado[] };
      return resp;
    },
    onSuccess: (data) => {
      if (!perspectivaAtual) return;
      const novos = (data.objetivos || []).map((o) => ({ ...o, perspectiva: perspectivaAtual }));
      setObjetivosPorPersp((prev) => ({ ...prev, [perspectivaAtual]: novos }));
      if (novos.length === 0) {
        toast({
          title: "Nada gerado",
          description: "A IA não retornou objetivos para esta perspectiva. Tente ajustar a quantidade ou as instruções.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao gerar",
        description: "Não foi possível gerar objetivos. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const objetivosDaEtapa = perspectivaAtual ? objetivosPorPersp[perspectivaAtual] || [] : [];

  const atualizarObjetivo = (idx: number, patch: Partial<ObjetivoGerado>) => {
    if (!perspectivaAtual) return;
    setObjetivosPorPersp((prev) => {
      const list = [...(prev[perspectivaAtual] || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, [perspectivaAtual]: list };
    });
  };

  const removerObjetivo = (idx: number) => {
    if (!perspectivaAtual) return;
    setObjetivosPorPersp((prev) => {
      const list = [...(prev[perspectivaAtual] || [])];
      list.splice(idx, 1);
      return { ...prev, [perspectivaAtual]: list };
    });
  };

  const podeAvancar = objetivosDaEtapa.length > 0;
  const isEtapaPerspectiva = perspectivaAtual !== null;
  const isEtapaMapa = etapa === PERSPECTIVAS_ORDEM.length;

  const reset = () => {
    setEtapa(0);
    setObjetivosPorPersp({});
    setInstrucao("");
    setQuantidadePorPerspectiva(2);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Se estiver no meio do fluxo com objetivos gerados, confirmar perda.
      const algumGerado = Object.values(objetivosPorPersp).some((arr) => (arr || []).length > 0);
      if (algumGerado) {
        const ok = window.confirm("Fechar o assistente vai descartar os objetivos gerados nesta sessão. Continuar?");
        if (!ok) return;
      }
      reset();
    }
    onOpenChange(next);
  };

  const persistirTudo = async () => {
    setSalvando(true);
    let total = 0;
    let erros = 0;
    try {
      for (const persp of PERSPECTIVAS_ORDEM) {
        const list = objetivosPorPersp[persp] || [];
        for (const o of list) {
          try {
            await apiRequest("POST", "/api/objetivos", {
              titulo: o.titulo,
              descricao: o.descricao || null,
              prazo: o.prazo || "Anual 2025",
              perspectiva: persp,
              estrategiaId: o.estrategiaId ?? null,
              iniciativaId: o.iniciativaId ?? null,
              origemModoBSC: true,
            });
            total++;
          } catch {
            erros++;
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/objetivos"] });
      if (total === 0) {
        // Falha total — não fechamos o wizard para que o usuário possa
        // revisar e tentar de novo, evitando perda silenciosa do trabalho.
        toast({
          title: "Nenhum objetivo foi registrado",
          description:
            erros > 0
              ? `Falha ao salvar ${erros} objetivo(s). Verifique os dados e tente novamente.`
              : "Não havia objetivos selecionados para salvar.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Mapa de Causa e Efeito criado!",
        description: `${total} objetivo(s) registrado(s)${erros ? `, ${erros} falhou(aram)` : ""}.`,
        variant: erros > 0 ? "destructive" : undefined,
      });
      onComplete();
      reset();
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" data-testid="dialog-bsc-causa-efeito">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            BSC Causa e Efeito
          </DialogTitle>
          <DialogDescription>
            Gere objetivos camada por camada, do resultado financeiro até a base de aprendizado, formando uma cadeia de
            causa e efeito.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-2 px-1" data-testid="stepper-bsc">
          {PERSPECTIVAS_ORDEM.map((p, idx) => {
            const concluida = idx < etapa;
            const ativa = idx === etapa;
            return (
              <div key={p} className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={
                    "flex items-center gap-2 min-w-0 " +
                    (ativa ? "text-foreground" : concluida ? "text-foreground" : "text-muted-foreground")
                  }
                  data-testid={`step-${idx}`}
                >
                  {concluida ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                  ) : (
                    <Circle
                      className={
                        "h-5 w-5 flex-shrink-0 " + (ativa ? "text-primary fill-primary/10" : "text-muted-foreground")
                      }
                    />
                  )}
                  <div className="text-xs font-medium truncate">{idx + 1}. {PERSPECTIVA_LABELS[p]}</div>
                </div>
                {idx < PERSPECTIVAS_ORDEM.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <div
              className={
                "text-xs font-medium " + (isEtapaMapa ? "text-foreground" : "text-muted-foreground")
              }
              data-testid="step-mapa"
            >
              Mapa final
            </div>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1 pr-2">
          {isEtapaPerspectiva && perspectivaAtual && (
            <div className="space-y-4 py-2" data-testid={`etapa-${perspectivaAtual}`}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">Etapa {etapa + 1} de 4</Badge>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="text-sm font-semibold">{PERSPECTIVA_LABELS[perspectivaAtual]}</div>
                    <p className="text-xs text-muted-foreground">{PERSPECTIVA_DESC[perspectivaAtual]}</p>
                  </div>
                </div>

                {perspectivaAtual === "Financeira" && (
                  <div className="mt-3 rounded-md border p-3 bg-muted/30">
                    <div className="text-xs font-medium mb-1">Indicadores de diagnóstico (âncora):</div>
                    {indicadoresDiag.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum indicador de diagnóstico cadastrado. A IA usará o perfil da empresa como âncora.
                      </p>
                    ) : (
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {indicadoresDiag.map((i) => (
                          <li key={i.id}>
                            • {i.nome}
                            {i.meta ? ` (referência: ${i.meta})` : ""}
                            {i.atual ? ` — atual: ${i.atual}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {perspectivaAtual !== "Financeira" && objetivosAnteriores.length > 0 && (
                  <div className="mt-3 rounded-md border p-3 bg-muted/30">
                    <div className="text-xs font-medium mb-1">
                      Objetivos da(s) camada(s) acima (a serem habilitados):
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {objetivosAnteriores.map((o, i) => (
                        <li key={i}>
                          <Badge variant="outline" className="mr-1 align-middle">{o.perspectiva}</Badge>
                          {o.titulo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {objetivosDaEtapa.length === 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="qtd-bsc">Quantidade de objetivos</Label>
                      <Input
                        id="qtd-bsc"
                        type="number"
                        min={1}
                        max={5}
                        value={quantidadePorPerspectiva}
                        onChange={(e) =>
                          setQuantidadePorPerspectiva(
                            Math.max(1, Math.min(5, Number(e.target.value) || 1))
                          )
                        }
                        data-testid="input-bsc-quantidade"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="instrucao-bsc">Instrução adicional (opcional)</Label>
                      <Textarea
                        id="instrucao-bsc"
                        rows={2}
                        placeholder="Ex.: priorize expansão para o nordeste."
                        value={instrucao}
                        onChange={(e) => setInstrucao(e.target.value)}
                        data-testid="input-bsc-instrucao"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        onClick={() => gerarMutation.mutate()}
                        disabled={gerarMutation.isPending}
                        data-testid="button-bsc-gerar"
                      >
                        {gerarMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Gerar com IA
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {objetivosDaEtapa.length > 0 && (
                <div className="space-y-3" data-testid="lista-objetivos-etapa">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">
                      Objetivos gerados ({objetivosDaEtapa.length})
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => gerarMutation.mutate()}
                      disabled={gerarMutation.isPending}
                      data-testid="button-bsc-regerar"
                    >
                      {gerarMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Regerar
                    </Button>
                  </div>
                  {objetivosDaEtapa.map((o, idx) => (
                    <Card key={idx} className="p-3 space-y-2" data-testid={`objetivo-card-${idx}`}>
                      <div className="flex items-start gap-2">
                        <Input
                          value={o.titulo}
                          onChange={(e) => atualizarObjetivo(idx, { titulo: e.target.value })}
                          className="font-medium"
                          data-testid={`input-objetivo-titulo-${idx}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerObjetivo(idx)}
                          data-testid={`button-remover-objetivo-${idx}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={o.descricao || ""}
                        onChange={(e) => atualizarObjetivo(idx, { descricao: e.target.value })}
                        rows={2}
                        placeholder="Descrição"
                        data-testid={`input-objetivo-desc-${idx}`}
                      />
                      {perspectivaAtual !== "Financeira" && (
                        <div className="rounded-md bg-muted/30 p-2 text-xs">
                          <span className="font-medium">Habilita: </span>
                          <span className="text-muted-foreground" data-testid={`text-justificativa-${idx}`}>
                            {o.justificativaCausaEfeito || "(sem justificativa retornada)"}
                          </span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {isEtapaMapa && (
            <div className="space-y-3 py-2" data-testid="etapa-mapa-final">
              <Card className="p-4">
                <div className="text-sm font-semibold mb-1">Mapa de Causa e Efeito</div>
                <p className="text-xs text-muted-foreground">
                  Revise a cadeia completa antes de registrar os objetivos. Cada camada habilita a camada acima.
                </p>
              </Card>

              {[...PERSPECTIVAS_ORDEM].map((persp, idx) => {
                const list = objetivosPorPersp[persp] || [];
                if (list.length === 0) return null;
                return (
                  <div key={persp} data-testid={`mapa-bloco-${persp}`}>
                    <Card className="p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-sm font-semibold">
                          {PERSPECTIVA_LABELS[persp]}
                        </div>
                        <Badge variant="outline">{list.length} objetivo(s)</Badge>
                      </div>
                      <div className="space-y-2">
                        {list.map((o, i) => (
                          <div key={i} className="rounded-md border p-2">
                            <div className="text-sm font-medium">{o.titulo}</div>
                            {o.descricao && (
                              <div className="text-xs text-muted-foreground mt-0.5">{o.descricao}</div>
                            )}
                            {persp !== "Financeira" && o.justificativaCausaEfeito && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium text-foreground">Habilita: </span>
                                {o.justificativaCausaEfeito}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                    {idx < PERSPECTIVAS_ORDEM.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowUp className="h-4 w-4 text-muted-foreground" aria-label="habilita a camada acima" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 flex-wrap">
          {isEtapaPerspectiva && (
            <>
              <Button
                variant="outline"
                onClick={() => setEtapa((e) => Math.max(0, e - 1))}
                disabled={etapa === 0 || gerarMutation.isPending}
                data-testid="button-bsc-voltar"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={() => setEtapa((e) => e + 1)}
                disabled={!podeAvancar || gerarMutation.isPending}
                data-testid="button-bsc-avancar"
              >
                {etapa === PERSPECTIVAS_ORDEM.length - 1 ? "Ver mapa final" : "Próxima camada"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          {isEtapaMapa && (
            <>
              <Button
                variant="outline"
                onClick={() => setEtapa(PERSPECTIVAS_ORDEM.length - 1)}
                disabled={salvando}
                data-testid="button-bsc-mapa-voltar"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={persistirTudo}
                disabled={salvando}
                data-testid="button-bsc-confirmar"
              >
                {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Registrar todos os objetivos
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

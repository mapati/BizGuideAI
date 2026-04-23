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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Circle, ArrowUp, GitBranch, Plus } from "lucide-react";
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
  // Task #310 — Títulos da camada acima que este objetivo habilita.
  // Devolvido pela IA e usado para criar bsc_relacoes após o save.
  habilita?: string[];
};

type ObjetivosPorPerspectiva = Partial<Record<Perspectiva, ObjetivoGerado[]>>;

// Task #318 — KR editável na etapa de revisão de métricas (antes de salvar).
type KrEditavel = {
  metrica: string;
  valorInicial: string;
  valorAlvo: string;
  valorAtual: string;
  owner: string;
  prazo: string;
};

type KrApi = {
  metrica: string;
  valorInicial: number | string;
  valorAlvo: number | string;
  valorAtual: number | string;
  owner?: string;
  prazo: string;
};

const krApiToEditavel = (r: KrApi): KrEditavel => ({
  metrica: r.metrica ?? "",
  valorInicial: r.valorInicial?.toString() ?? "0",
  valorAlvo: r.valorAlvo?.toString() ?? "0",
  valorAtual: (r.valorAtual ?? r.valorInicial)?.toString() ?? "0",
  owner: r.owner ?? "",
  prazo: r.prazo ?? "Q4 2025",
});

const objetivoKey = (perspectiva: Perspectiva, idx: number) => `${perspectiva}::${idx}`;

type IndicadorDiagnostico = { id: string; nome: string; meta?: string; atual?: string; perspectiva: string };

type Membro = { id: string; nome: string; email?: string };

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
  // Etapa: 0..3 = perspectivas; 4 = mapa final; 5 = revisão de métricas
  const [etapa, setEtapa] = useState<number>(0);
  const [quantidadePorPerspectiva, setQuantidadePorPerspectiva] = useState<number>(2);
  const [instrucao, setInstrucao] = useState<string>("");
  const [objetivosPorPersp, setObjetivosPorPersp] = useState<ObjetivosPorPerspectiva>({});
  const [salvando, setSalvando] = useState(false);
  // Task #311 — gerar métricas (KRs) automaticamente ao final do wizard.
  const [gerarMetricas, setGerarMetricas] = useState<boolean>(true);
  const [quantidadeMetricas, setQuantidadeMetricas] = useState<number>(2);
  // Task #318 — KRs gerados em prévia, editáveis antes de salvar.
  // Chave: `${perspectiva}::${idx do objetivo na lista da perspectiva}`.
  const [krsPorObjetivo, setKrsPorObjetivo] = useState<Record<string, KrEditavel[]>>({});
  const [gerandoMetricasPreview, setGerandoMetricasPreview] = useState<boolean>(false);
  const [regerandoKey, setRegerandoKey] = useState<string | null>(null);

  const { data: indicadoresDiag = [] } = useQuery<IndicadorDiagnostico[]>({
    queryKey: ["/api/indicadores", empresaId, "diagnostico-bsc-wizard"],
    queryFn: async () => {
      const all = (await apiRequest("GET", "/api/indicadores", undefined)) as IndicadorDiagnostico[];
      return (all || []).filter((i) => i.perspectiva === "diagnostico");
    },
    enabled: open,
  });

  const { data: membros = [] } = useQuery<Membro[]>({
    queryKey: ["/api/membros"],
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
  const isEtapaMetricas = etapa === PERSPECTIVAS_ORDEM.length + 1;

  const reset = () => {
    setEtapa(0);
    setObjetivosPorPersp({});
    setInstrucao("");
    setQuantidadePorPerspectiva(2);
    setGerarMetricas(true);
    setQuantidadeMetricas(2);
    setKrsPorObjetivo({});
    setGerandoMetricasPreview(false);
    setRegerandoKey(null);
  };

  // Task #318 — gera prévias de KRs (sem persistir) para cada objetivo confirmado no mapa.
  const gerarPreviewMetricas = async (
    options: { reusarExistente?: boolean } = {},
  ): Promise<Record<string, KrEditavel[]> | null> => {
    setGerandoMetricasPreview(true);
    try {
      const next: Record<string, KrEditavel[]> = options.reusarExistente
        ? { ...krsPorObjetivo }
        : {};
      let algumaFalha = false;
      for (const persp of PERSPECTIVAS_ORDEM) {
        const list = objetivosPorPersp[persp] || [];
        for (let i = 0; i < list.length; i++) {
          const obj = list[i];
          const key = objetivoKey(persp, i);
          if (options.reusarExistente && next[key]) continue;
          try {
            const resp = (await apiRequest("POST", "/api/ai/gerar-resultados-chave", {
              quantidade: quantidadeMetricas,
              objetivoPreview: {
                titulo: obj.titulo,
                descricao: obj.descricao || null,
                prazo: obj.prazo || "Anual 2025",
              },
            })) as { resultados?: KrApi[] };
            next[key] = (resp.resultados ?? []).map(krApiToEditavel);
          } catch {
            next[key] = [];
            algumaFalha = true;
          }
        }
      }
      setKrsPorObjetivo(next);
      if (algumaFalha) {
        toast({
          title: "Algumas métricas falharam",
          description: "Não foi possível gerar métricas para todos os objetivos. Você pode regerar individualmente.",
          variant: "destructive",
        });
      }
      return next;
    } finally {
      setGerandoMetricasPreview(false);
    }
  };

  const regerarMetricasObjetivo = async (
    perspectiva: Perspectiva,
    idx: number,
    objetivo: ObjetivoGerado,
  ) => {
    const key = objetivoKey(perspectiva, idx);
    setRegerandoKey(key);
    try {
      const resp = (await apiRequest("POST", "/api/ai/gerar-resultados-chave", {
        quantidade: quantidadeMetricas,
        objetivoPreview: {
          titulo: objetivo.titulo,
          descricao: objetivo.descricao || null,
          prazo: objetivo.prazo || "Anual 2025",
        },
      })) as { resultados?: KrApi[] };
      setKrsPorObjetivo((prev) => ({
        ...prev,
        [key]: (resp.resultados ?? []).map(krApiToEditavel),
      }));
    } catch {
      toast({
        title: "Erro ao regerar métricas",
        description: "Não foi possível gerar novas métricas para este objetivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRegerandoKey(null);
    }
  };

  const atualizarKr = (key: string, krIdx: number, patch: Partial<KrEditavel>) => {
    setKrsPorObjetivo((prev) => {
      const list = [...(prev[key] || [])];
      list[krIdx] = { ...list[krIdx], ...patch };
      return { ...prev, [key]: list };
    });
  };

  const removerKr = (key: string, krIdx: number) => {
    setKrsPorObjetivo((prev) => {
      const list = [...(prev[key] || [])];
      list.splice(krIdx, 1);
      return { ...prev, [key]: list };
    });
  };

  const adicionarKr = (key: string) => {
    setKrsPorObjetivo((prev) => ({
      ...prev,
      [key]: [
        ...(prev[key] || []),
        {
          metrica: "",
          valorInicial: "0",
          valorAlvo: "0",
          valorAtual: "0",
          owner: "",
          prazo: "Q4 2025",
        },
      ],
    }));
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
    let totalKrs = 0;
    let linksCriados = 0;
    let linksFalhos = 0;
    const objetivosCriados: { id: string; key: string }[] = [];
    try {
      // Task #310 — após persistir cada objetivo, guardamos o id resultante
      // indexado por (perspectiva, titulo-normalizado) para depois criar os
      // pares de causa-e-efeito (origem=objetivo desta camada, destino=
      // objetivo da camada acima cujo título foi listado em `habilita`).
      const titleKey = (perspectiva: string, titulo: string) =>
        `${perspectiva}::${titulo.toLowerCase().trim()}`;
      const idByTitulo = new Map<string, string>();
      // Lista plana com tudo que precisamos para criar os links depois.
      const objetivosPersistidos: { perspectiva: Perspectiva; original: ObjetivoGerado; id: string }[] = [];

      for (const persp of PERSPECTIVAS_ORDEM) {
        const list = objetivosPorPersp[persp] || [];
        for (let idxObj = 0; idxObj < list.length; idxObj++) {
          const o = list[idxObj];
          const key = objetivoKey(persp, idxObj);
          try {
            const criado = (await apiRequest("POST", "/api/objetivos", {
              titulo: o.titulo,
              descricao: o.descricao || null,
              prazo: o.prazo || "Anual 2025",
              perspectiva: persp,
              estrategiaId: o.estrategiaId ?? null,
              iniciativaId: o.iniciativaId ?? null,
              origemModoBSC: true,
              // Task #309 — persistir a justificativa para que o card e o
              // detalhe do Objetivo possam mostrar "Habilita: ..." depois
              // de salvo (antes ela só aparecia aqui no wizard).
              justificativaCausaEfeito:
                persp !== "Financeira" && o.justificativaCausaEfeito
                  ? o.justificativaCausaEfeito
                  : null,
            })) as { id: string };
            total++;
            if (criado?.id) {
              objetivosCriados.push({ id: criado.id, key });
              idByTitulo.set(titleKey(persp, o.titulo), criado.id);
              objetivosPersistidos.push({ perspectiva: persp, original: o, id: criado.id });
            }
          } catch {
            erros++;
          }
        }
      }

      // Task #318 — em vez de regerar as métricas após criar o objetivo,
      // persistimos os KRs já revisados/editados pelo usuário na etapa de
      // revisão. Mantemos compatibilidade: se o usuário desligou a geração de
      // métricas (gerarMetricas=false), nenhum KR é criado.
      if (gerarMetricas && objetivosCriados.length > 0) {
        for (const obj of objetivosCriados) {
          const krs = krsPorObjetivo[obj.key] || [];
          for (const res of krs) {
            const metricaTrim = res.metrica.trim();
            if (!metricaTrim) continue;
            const membroAi = membros.find(
              (m) =>
                m.nome.toLowerCase() === (res.owner || "").toLowerCase() ||
                (m.email?.toLowerCase() === (res.owner || "").toLowerCase()),
            );
            try {
              await apiRequest("POST", "/api/resultados-chave", {
                objetivoId: obj.id,
                metrica: metricaTrim,
                valorInicial: res.valorInicial || "0",
                valorAlvo: res.valorAlvo || "0",
                valorAtual: res.valorAtual || res.valorInicial || "0",
                owner: membroAi?.nome || res.owner || "—",
                responsavelId: membroAi?.id ?? null,
                prazo: res.prazo || "Q4 2025",
              });
              totalKrs++;
            } catch {
              // ignora KR específico que falhou
            }
          }
        }
        await queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey?.[0];
            return typeof key === "string" && key.startsWith("/api/resultados-chave");
          },
        });
      }

      // Task #310 — cria as bsc_relacoes (causa-efeito) para cada objetivo
      // não-Financeiro que veio com lista `habilita`. Procuramos o destino
      // entre as perspectivas REALMENTE acima da atual no mapa do BSC para
      // evitar links cruzados ou para a mesma camada.
      for (const item of objetivosPersistidos) {
        const habilita = item.original.habilita || [];
        if (habilita.length === 0) continue;
        const idxAtual = PERSPECTIVAS_ORDEM.indexOf(item.perspectiva);
        if (idxAtual <= 0) continue;
        const perspectivasAcima = PERSPECTIVAS_ORDEM.slice(0, idxAtual);
        const justificativa = item.original.justificativaCausaEfeito?.trim() || null;
        for (const tituloDestino of habilita) {
          let destinoId: string | undefined;
          for (const persp of perspectivasAcima) {
            const candidato = idByTitulo.get(titleKey(persp, tituloDestino));
            if (candidato) {
              destinoId = candidato;
              break;
            }
          }
          if (!destinoId || destinoId === item.id) continue;
          try {
            await apiRequest("POST", "/api/bsc-relacoes", {
              origemId: item.id,
              destinoId,
              tipo: "causa_efeito",
              justificativa,
            });
            linksCriados++;
          } catch {
            linksFalhos++;
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/objetivos"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/bsc-relacoes"] });
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
      const krsMsg = gerarMetricas ? ` e ${totalKrs} métrica(s) gerada(s)` : "";
      toast({
        title: "Mapa de Causa e Efeito criado!",
        description: `${total} objetivo(s) registrado(s)${krsMsg}${erros ? `, ${erros} falhou(aram)` : ""}${linksCriados > 0 ? ` · ${linksCriados} link(s) de causa-e-efeito` : ""}${linksFalhos > 0 ? `, ${linksFalhos} link(s) falhou(aram)` : ""}.`,
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
                "text-xs font-medium " +
                (isEtapaMapa ? "text-foreground" : etapa > PERSPECTIVAS_ORDEM.length ? "text-foreground" : "text-muted-foreground")
              }
              data-testid="step-mapa"
            >
              Mapa final
            </div>
          </div>
          {gerarMetricas && (
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <div
                className={
                  "text-xs font-medium " + (isEtapaMetricas ? "text-foreground" : "text-muted-foreground")
                }
                data-testid="step-metricas"
              >
                Métricas
              </div>
            </div>
          )}
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

              <Card className="p-4 space-y-3" data-testid="card-bsc-gerar-metricas">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor="switch-bsc-gerar-metricas" className="text-sm font-semibold">
                      Gerar métricas (KRs) automaticamente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ao registrar os objetivos, a IA cria também os resultados-chave para cada um, fechando o ciclo OKR.
                    </p>
                  </div>
                  <Switch
                    id="switch-bsc-gerar-metricas"
                    checked={gerarMetricas}
                    onCheckedChange={setGerarMetricas}
                    data-testid="switch-bsc-gerar-metricas"
                  />
                </div>
                {gerarMetricas && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="qtd-bsc-metricas">Métricas por objetivo</Label>
                      <Input
                        id="qtd-bsc-metricas"
                        type="number"
                        min={1}
                        max={5}
                        value={quantidadeMetricas}
                        onChange={(e) =>
                          setQuantidadeMetricas(
                            Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                          )
                        }
                        data-testid="input-bsc-quantidade-metricas"
                      />
                    </div>
                  </div>
                )}
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

          {isEtapaMetricas && (
            <div className="space-y-3 py-2" data-testid="etapa-metricas">
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-semibold">Revisar métricas geradas</div>
                    <p className="text-xs text-muted-foreground">
                      Ajuste o nome, valores, owner e prazo de cada KR ou regere a lista de um objetivo. Nada é salvo
                      até você confirmar.
                    </p>
                  </div>
                  {gerandoMetricasPreview && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando…
                    </div>
                  )}
                </div>
              </Card>

              {PERSPECTIVAS_ORDEM.map((persp) => {
                const list = objetivosPorPersp[persp] || [];
                if (list.length === 0) return null;
                return (
                  <div key={persp} className="space-y-2" data-testid={`metricas-bloco-${persp}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{PERSPECTIVA_LABELS[persp]}</Badge>
                    </div>
                    {list.map((obj, idxObj) => {
                      const key = objetivoKey(persp, idxObj);
                      const krs = krsPorObjetivo[key] || [];
                      const regerando = regerandoKey === key;
                      return (
                        <Card key={key} className="p-3 space-y-3" data-testid={`metricas-objetivo-${persp}-${idxObj}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold truncate">{obj.titulo}</div>
                              {obj.descricao && (
                                <div className="text-xs text-muted-foreground line-clamp-2">{obj.descricao}</div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => regerarMetricasObjetivo(persp, idxObj, obj)}
                              disabled={regerando || gerandoMetricasPreview || salvando}
                              data-testid={`button-regerar-metricas-${persp}-${idxObj}`}
                            >
                              {regerando ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                              )}
                              Regerar
                            </Button>
                          </div>
                          {krs.length === 0 && !regerando && (
                            <p className="text-xs text-muted-foreground">
                              Nenhuma métrica gerada para este objetivo. Adicione manualmente ou clique em Regerar.
                            </p>
                          )}
                          <div className="space-y-2">
                            {krs.map((kr, krIdx) => (
                              <div
                                key={krIdx}
                                className="rounded-md border p-2 space-y-2"
                                data-testid={`metrica-card-${persp}-${idxObj}-${krIdx}`}
                              >
                                <div className="flex items-start gap-2">
                                  <Input
                                    value={kr.metrica}
                                    onChange={(e) => atualizarKr(key, krIdx, { metrica: e.target.value })}
                                    placeholder="Métrica (ex.: Taxa de retenção)"
                                    className="font-medium"
                                    data-testid={`input-metrica-${persp}-${idxObj}-${krIdx}`}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removerKr(key, krIdx)}
                                    data-testid={`button-remover-metrica-${persp}-${idxObj}-${krIdx}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-xs">Valor inicial</Label>
                                    <Input
                                      value={kr.valorInicial}
                                      onChange={(e) =>
                                        atualizarKr(key, krIdx, { valorInicial: e.target.value })
                                      }
                                      data-testid={`input-valor-inicial-${persp}-${idxObj}-${krIdx}`}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Valor alvo</Label>
                                    <Input
                                      value={kr.valorAlvo}
                                      onChange={(e) =>
                                        atualizarKr(key, krIdx, { valorAlvo: e.target.value })
                                      }
                                      data-testid={`input-valor-alvo-${persp}-${idxObj}-${krIdx}`}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Valor atual</Label>
                                    <Input
                                      value={kr.valorAtual}
                                      onChange={(e) =>
                                        atualizarKr(key, krIdx, { valorAtual: e.target.value })
                                      }
                                      data-testid={`input-valor-atual-${persp}-${idxObj}-${krIdx}`}
                                    />
                                  </div>
                                  <div className="col-span-2 sm:col-span-2">
                                    <Label className="text-xs">Owner</Label>
                                    <Input
                                      value={kr.owner}
                                      onChange={(e) => atualizarKr(key, krIdx, { owner: e.target.value })}
                                      placeholder="Cargo, área ou nome"
                                      data-testid={`input-owner-${persp}-${idxObj}-${krIdx}`}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Prazo</Label>
                                    <Input
                                      value={kr.prazo}
                                      onChange={(e) => atualizarKr(key, krIdx, { prazo: e.target.value })}
                                      placeholder="Ex.: Q4 2025"
                                      data-testid={`input-prazo-${persp}-${idxObj}-${krIdx}`}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => adicionarKr(key)}
                            disabled={salvando}
                            data-testid={`button-adicionar-metrica-${persp}-${idxObj}`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar métrica
                          </Button>
                        </Card>
                      );
                    })}
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
                disabled={salvando || gerandoMetricasPreview}
                data-testid="button-bsc-mapa-voltar"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              {gerarMetricas ? (
                <Button
                  onClick={async () => {
                    const result = await gerarPreviewMetricas({ reusarExistente: false });
                    if (result) setEtapa(PERSPECTIVAS_ORDEM.length + 1);
                  }}
                  disabled={salvando || gerandoMetricasPreview}
                  data-testid="button-bsc-revisar-metricas"
                >
                  {gerandoMetricasPreview ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar e revisar métricas
                </Button>
              ) : (
                <Button
                  onClick={persistirTudo}
                  disabled={salvando}
                  data-testid="button-bsc-confirmar"
                >
                  {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Registrar todos os objetivos
                </Button>
              )}
            </>
          )}
          {isEtapaMetricas && (
            <>
              <Button
                variant="outline"
                onClick={() => setEtapa(PERSPECTIVAS_ORDEM.length)}
                disabled={salvando || gerandoMetricasPreview || regerandoKey !== null}
                data-testid="button-bsc-metricas-voltar"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao mapa
              </Button>
              <Button
                onClick={persistirTudo}
                disabled={salvando || gerandoMetricasPreview || regerandoKey !== null}
                data-testid="button-bsc-confirmar"
              >
                {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirmar e salvar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

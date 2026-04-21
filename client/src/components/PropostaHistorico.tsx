import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Pencil, Sparkles, History, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "proposta" | "confirmada" | "ajustada" | "ignorada" | "falhou";

interface PropostaLog {
  id: string;
  ferramenta: string;
  preview: { titulo: string; descricao: string };
  status: Status;
  origem: "chat" | "briefing";
  entidadeTipo: string | null;
  entidadeId: string | null;
  mensagemErro: string | null;
  criadoEm: string;
  resolvidoEm: string | null;
}

const STATUS_OPCOES: Array<{ valor: Status | "todas"; label: string }> = [
  { valor: "todas", label: "Todas" },
  { valor: "proposta", label: "Pendentes" },
  { valor: "confirmada", label: "Confirmadas" },
  { valor: "ajustada", label: "Ajustadas" },
  { valor: "ignorada", label: "Ignoradas" },
  { valor: "falhou", label: "Falharam" },
];

const STATUS_BADGE: Record<Status, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  proposta: { label: "pendente", className: "bg-violet-600 text-white hover:bg-violet-600", icon: Sparkles },
  confirmada: { label: "confirmada", className: "bg-emerald-600 text-white hover:bg-emerald-600", icon: CheckCircle2 },
  ajustada: { label: "ajustada", className: "", icon: Pencil },
  ignorada: { label: "ignorada", className: "", icon: XCircle },
  falhou: { label: "falhou", className: "bg-destructive text-destructive-foreground", icon: AlertTriangle },
};

// Mapeia entidadeTipo retornado pelas tools para a rota de detalhe correspondente.
function rotaParaEntidade(tipo: string | null, id: string | null): string | null {
  if (!tipo || !id) return null;
  switch (tipo) {
    case "iniciativa":
      return `/iniciativas?editar=${id}`;
    case "objetivo":
    case "resultado_chave":
      return `/okrs`;
    case "indicador":
    case "kpi_leitura":
      return `/indicadores`;
    case "navegacao":
      return id;
    default:
      return null;
  }
}

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

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function PropostaHistorico() {
  const [filtro, setFiltro] = useState<Status | "todas">("todas");
  const [pageSize, setPageSize] = useState<number>(25);

  const { data, isLoading, refetch, isRefetching } = useQuery<{ propostas: PropostaLog[] }>({
    queryKey: ["/api/ai/propostas", filtro, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      if (filtro !== "todas") params.set("status", filtro);
      const r = await fetch(`/api/ai/propostas?${params.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error("Falha ao carregar histórico");
      return r.json();
    },
  });

  const lista = useMemo(() => data?.propostas ?? [], [data]);

  return (
    <div className="flex flex-col h-full" data-testid="painel-historico-propostas">
      <div className="flex items-center gap-2 flex-wrap p-3 border-b">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Histórico de propostas</span>
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {STATUS_OPCOES.map((opt) => (
            <Button
              key={opt.valor}
              size="sm"
              variant={filtro === opt.valor ? "default" : "outline"}
              onClick={() => setFiltro(opt.valor)}
              data-testid={`button-filtro-${opt.valor}`}
              className="h-8"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico…
          </div>
        ) : lista.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center" data-testid="text-historico-vazio">
            Nenhuma proposta {filtro === "todas" ? "registrada ainda" : `com status "${filtro}"`}.
          </div>
        ) : (
          lista.map((p) => {
            const badge = STATUS_BADGE[p.status];
            const Icon = badge.icon;
            return (
              <div
                key={p.id}
                className="rounded-md border p-3 space-y-1.5"
                data-testid={`row-historico-${p.id}`}
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                    {FERRAMENTAS_LABEL[p.ferramenta] ?? p.ferramenta}
                  </Badge>
                  <Badge className={cn("gap-1 text-[10px]", badge.className)} variant={badge.className ? "default" : "outline"}>
                    <Icon className="h-2.5 w-2.5" /> {badge.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{p.origem}</Badge>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {formatarData(p.criadoEm)}
                  </span>
                </div>
                <div className="text-sm font-medium">{p.preview?.titulo}</div>
                {p.preview?.descricao && (
                  <div className="text-xs text-muted-foreground line-clamp-2">{p.preview.descricao}</div>
                )}
                {p.entidadeTipo && p.entidadeId && (() => {
                  const rota = rotaParaEntidade(p.entidadeTipo, p.entidadeId);
                  return (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>
                        Resultado: <code className="text-foreground">{p.entidadeTipo}</code>
                        {" "}#{p.entidadeId.slice(0, 8)}
                      </span>
                      {rota && (
                        <Link href={rota} data-testid={`link-historico-entidade-${p.id}`}>
                          <span className="inline-flex items-center gap-1 text-violet-600 hover:underline cursor-pointer">
                            <ExternalLink className="h-3 w-3" /> abrir
                          </span>
                        </Link>
                      )}
                    </div>
                  );
                })()}
                {p.mensagemErro && (
                  <div className="text-[11px] text-destructive">Erro: {p.mensagemErro}</div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t p-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-historico-refresh"
        >
          {isRefetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Atualizar"}
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lista.length} de {pageSize} máx
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPageSize((v) => Math.min(v + 25, 200))}
            disabled={pageSize >= 200}
            data-testid="button-historico-carregar-mais"
            className="h-7"
          >
            Carregar mais
          </Button>
        </div>
      </div>
    </div>
  );
}

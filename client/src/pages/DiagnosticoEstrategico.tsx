import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import jsPDF from "jspdf";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/CircularProgress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Empresa, Objetivo, Indicador } from "@shared/schema";

interface Diagnostico {
  saudePlano: number;
  resumoExecutivo: string;
  pontosFortes: string[];
  pontosAtencao: string[];
  riscos: string[];
  recomendacoes: string[];
}

interface EmpresaData extends Empresa {
  id: string;
}

function getSaudeCor(saude: number): { label: string; className: string } {
  if (saude >= 70) return { label: "Excelente", className: "text-green-600" };
  if (saude >= 30) return { label: "Atenção", className: "text-yellow-600" };
  return { label: "Crítico", className: "text-red-600" };
}

function exportarDiagnosticoPDF(
  diag: Diagnostico,
  nomeEmpresa: string,
  geradoEm: Date
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = (needed = 10) => {
    if (y + needed > 280) {
      doc.addPage();
      y = margin;
    }
  };

  const addSection = (title: string, items: string[], bullet = "•") => {
    checkPage(14);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    items.forEach((item, idx) => {
      const prefix = bullet === "num" ? `${idx + 1}.  ` : `${bullet}  `;
      const lines = doc.splitTextToSize(`${prefix}${item}`, contentW - 4);
      checkPage(lines.length * 5 + 3);
      doc.text(lines, margin + 3, y);
      y += lines.length * 5 + 2;
    });
    y += 4;
  };

  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Diagnóstico Estratégico com IA", margin, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(nomeEmpresa, margin, 16.5);
  doc.text(
    `Gerado em ${geradoEm.toLocaleDateString("pt-BR")} às ${geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    pageW - margin,
    16.5,
    { align: "right" }
  );
  y = 32;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const saudeLbl = getSaudeCor(diag.saudePlano);
  doc.text(`Saúde do Plano: ${diag.saudePlano}% — ${saudeLbl.label}`, margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const resumoLines = doc.splitTextToSize(diag.resumoExecutivo, contentW);
  doc.text(resumoLines, margin, y);
  y += resumoLines.length * 5 + 8;

  addSection("Pontos Fortes", diag.pontosFortes);
  addSection("Pontos de Atenção", diag.pontosAtencao);
  addSection("Riscos Identificados", diag.riscos);
  addSection("Recomendações Prioritárias", diag.recomendacoes, "num");

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `BizGuideAI  ·  ${nomeEmpresa}  ·  Página ${p}/${pages}`,
      pageW / 2,
      290,
      { align: "center" }
    );
  }

  const fileName = `diagnostico-estrategico-${geradoEm.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export default function DiagnosticoEstrategico() {
  const { toast } = useToast();
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [geradoEm, setGeradoEm] = useState<Date | null>(null);

  const { data: empresa } = useQuery<EmpresaData | null>({
    queryKey: ["/api/empresa"],
  });
  const empresaId = empresa?.id;

  const { data: objetivos = [] } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  const { data: indicadores = [] } = useQuery<Indicador[]>({
    queryKey: ["/api/indicadores"],
    enabled: !!empresaId,
  });

  const { data: diagnosticoSalvo } = useQuery<{
    diagnostico: Diagnostico;
    geradoEm: string;
  } | null>({
    queryKey: ["/api/diagnostico-ia"],
    enabled: !!empresaId,
  });

  useEffect(() => {
    if (diagnosticoSalvo && !diagnostico) {
      setDiagnostico(diagnosticoSalvo.diagnostico);
      setGeradoEm(new Date(diagnosticoSalvo.geradoEm));
    }
  }, [diagnosticoSalvo]);

  const diagnosticoMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/ai/diagnostico-estrategico"),
    onSuccess: (data) => {
      if (data?.diagnostico) {
        setDiagnostico(data.diagnostico);
        setGeradoEm(data.geradoEm ? new Date(data.geradoEm) : new Date());
        toast({
          title: "Análise gerada!",
          description: "Diagnóstico estratégico concluído pela IA.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao gerar diagnóstico",
        description: "Não foi possível gerar o diagnóstico. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const hasData = objetivos.length > 0 || indicadores.length > 0;
  const saudeCor = diagnostico ? getSaudeCor(diagnostico.saudePlano) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Diagnóstico Estratégico
        </h1>
        <p className="text-muted-foreground mt-1">
          Análise completa de metas, indicadores e eventos com inteligência artificial.
        </p>
      </div>

      <Card className="p-6" data-testid="card-diagnostico-ia">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Diagnóstico Estratégico com IA</h3>
              <p className="text-sm text-muted-foreground">
                {geradoEm
                  ? `Última análise em ${geradoEm.toLocaleDateString("pt-BR")} às ${geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : "Análise completa de metas, indicadores e eventos"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {diagnostico && geradoEm && (
              <Button
                variant="outline"
                onClick={() =>
                  exportarDiagnosticoPDF(diagnostico, empresa?.nome ?? "Empresa", geradoEm)
                }
                data-testid="button-exportar-pdf"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            )}
            <Button
              onClick={() => diagnosticoMutation.mutate()}
              disabled={diagnosticoMutation.isPending || !hasData}
              data-testid="button-gerar-diagnostico"
            >
              {diagnosticoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : diagnostico ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar Análise
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Análise
                </>
              )}
            </Button>
          </div>
        </div>

        {!hasData && !diagnosticoMutation.isPending && (
          <div className="mt-4 p-4 rounded-md bg-muted/40 text-sm text-muted-foreground text-center">
            Cadastre objetivos ou indicadores para gerar o diagnóstico estratégico.
          </div>
        )}

        {diagnostico && (
          <div className="mt-6 space-y-6" data-testid="section-diagnostico-resultado">
            <div className="flex items-center gap-4 p-4 rounded-md bg-muted/40">
              <CircularProgress value={diagnostico.saudePlano} size={80} strokeWidth={8} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Saúde do Plano
                </p>
                <p
                  className={`text-2xl font-bold ${saudeCor?.className}`}
                  data-testid="text-saude-plano"
                >
                  {diagnostico.saudePlano}% — {saudeCor?.label}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                  {diagnostico.resumoExecutivo}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Pontos Fortes
                </p>
                <ul className="space-y-1.5" data-testid="list-pontos-fortes">
                  {diagnostico.pontosFortes.map((p, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Pontos de Atenção
                </p>
                <ul className="space-y-1.5" data-testid="list-pontos-atencao">
                  {diagnostico.pontosAtencao.map((p, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Riscos Identificados
                </p>
                <ul className="space-y-1.5" data-testid="list-riscos">
                  {diagnostico.riscos.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Recomendações Prioritárias
                </p>
                <ul className="space-y-1.5" data-testid="list-recomendacoes">
                  {diagnostico.recomendacoes.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="font-bold text-primary flex-shrink-0">{i + 1}.</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

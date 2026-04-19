import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export type NivelStatus = "neutro" | "positivo" | "atencao" | "critico";

export interface Alerta {
  tipo: string;
  mensagem: string;
}

export interface AssistantStatus {
  nivel: NivelStatus;
  preview: string;
  alertas: Alerta[];
  pagina: string | null;
}

const ANALYSIS_PAGES: Record<string, string> = {
  "/okrs": "OKRs",
  "/indicadores": "Indicadores",
  "/iniciativas": "Iniciativas",
  "/estrategias": "Estratégias",
};

interface IndicadorItem {
  status?: string;
}

interface IniciativaItem {
  status?: string;
  prazo?: string;
}

function isExpiredDate(prazo: string): boolean {
  if (!prazo) return false;
  const d = new Date(prazo);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function useAssistantStatus(): AssistantStatus {
  const { empresa } = useAuth();
  const [location] = useLocation();
  const enabled = !!empresa?.id;
  const isAnalysisPage = location in ANALYSIS_PAGES;

  const { data: indicadores = [] } = useQuery<IndicadorItem[]>({
    queryKey: ["/api/indicadores"],
    enabled: enabled && isAnalysisPage,
    staleTime: 5 * 60 * 1000,
  });

  const { data: iniciativas = [] } = useQuery<IniciativaItem[]>({
    queryKey: ["/api/iniciativas", empresa?.id],
    enabled: enabled && isAnalysisPage,
    staleTime: 5 * 60 * 1000,
  });

  if (!isAnalysisPage) {
    return {
      nivel: "neutro",
      preview: "Assistente Estratégico",
      alertas: [],
      pagina: null,
    };
  }

  const alertas: Alerta[] = [];

  const vermelhosKpi = indicadores.filter((i) => i.status === "vermelho");

  if (vermelhosKpi.length > 0) {
    alertas.push({
      tipo: "indicador",
      mensagem: `${vermelhosKpi.length} indicador${vermelhosKpi.length > 1 ? "es" : ""} no vermelho`,
    });
  }

  const atrasadas = iniciativas.filter(
    (i) => i.status !== "concluida" && isExpiredDate(i.prazo ?? "")
  );

  if (atrasadas.length > 0) {
    alertas.push({
      tipo: "iniciativa",
      mensagem: `${atrasadas.length} iniciativa${atrasadas.length > 1 ? "s" : ""} com prazo vencido`,
    });
  }

  const hasData = indicadores.length > 0 || iniciativas.length > 0;

  const nivel: NivelStatus = !hasData
    ? "neutro"
    : alertas.length === 0
    ? "positivo"
    : alertas.length >= 2
    ? "critico"
    : "atencao";

  const preview =
    alertas.length === 0
      ? hasData
        ? "Tudo no caminho certo"
        : "Assistente Estratégico"
      : alertas.length === 1
      ? alertas[0].mensagem
      : `${alertas.length} alertas estratégicos`;

  const pagina = ANALYSIS_PAGES[location] ?? null;

  return { nivel, preview, alertas, pagina };
}

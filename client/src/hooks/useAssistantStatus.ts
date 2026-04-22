import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { filterAcompanhamento } from "@/lib/indicadores";

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
  perspectiva?: string;
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

// Derivação pura usada pelo hook. Exportada para permitir testes
// unitários sem React/RTL. Mantém Task #248: indicadores são filtrados
// por filterAcompanhamento antes de qualquer contagem.
export function deriveAssistantStatus(
  indicadores: IndicadorItem[],
  iniciativas: IniciativaItem[],
  location: string,
): AssistantStatus {
  const isAnalysisPage = location in ANALYSIS_PAGES;
  if (!isAnalysisPage) {
    return {
      nivel: "neutro",
      preview: "Bizzy",
      alertas: [],
      pagina: null,
    };
  }

  const alertas: Alerta[] = [];

  const indicadoresAcompanhamento = filterAcompanhamento(indicadores);
  const vermelhosKpi = indicadoresAcompanhamento.filter((i) => i.status === "vermelho");

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

  const hasData = indicadoresAcompanhamento.length > 0 || iniciativas.length > 0;

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
        : "Bizzy"
      : alertas.length === 1
      ? alertas[0].mensagem
      : `${alertas.length} alertas estratégicos`;

  const pagina = ANALYSIS_PAGES[location] ?? null;

  return { nivel, preview, alertas, pagina };
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

  return deriveAssistantStatus(indicadores, iniciativas, location);
}

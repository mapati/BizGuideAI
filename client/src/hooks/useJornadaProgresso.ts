import { useQuery } from "@tanstack/react-query";
import type { Empresa } from "@shared/schema";

export interface JornadaStep {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  url: string;
  concluido: boolean;
  bloqueadoPor?: string[];
}

export interface JornadaProgresso {
  steps: JornadaStep[];
  totalConcluidos: number;
  total: number;
  percentual: number;
  jornadaConcluida: boolean;
}

interface EmpresaComBlocos extends Empresa {
  id: string;
}

export function useJornadaProgresso(): JornadaProgresso & { isLoading: boolean } {
  const { data: empresa, isLoading: loadingEmpresa } = useQuery<EmpresaComBlocos | null>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  const { data: indicadores = [], isLoading: loadingIndicadores } = useQuery<any[]>({
    queryKey: ["/api/indicadores"],
    enabled: !!empresaId,
  });

  const { data: fatoresPestel = [], isLoading: loadingPestel } = useQuery<any[]>({
    queryKey: ["/api/fatores-pestel", empresaId],
    enabled: !!empresaId,
  });

  const { data: cincoForcas = [], isLoading: loadingForcas } = useQuery<any[]>({
    queryKey: ["/api/cinco-forcas", empresaId],
    enabled: !!empresaId,
  });

  const { data: modeloNegocio = [], isLoading: loadingBmc } = useQuery<any[]>({
    queryKey: ["/api/modelo-negocio", empresaId],
    enabled: !!empresaId,
  });

  const { data: swotItens = [], isLoading: loadingSwot } = useQuery<any[]>({
    queryKey: ["/api/analise-swot", empresaId],
    enabled: !!empresaId,
  });

  const { data: estrategias = [], isLoading: loadingEstategias } = useQuery<any[]>({
    queryKey: ["/api/estrategias", empresaId],
    enabled: !!empresaId,
  });

  const { data: oportunidades = [], isLoading: loadingOport } = useQuery<any[]>({
    queryKey: ["/api/oportunidades-crescimento", empresaId],
    enabled: !!empresaId,
  });

  const { data: iniciativas = [], isLoading: loadingIniciativas } = useQuery<any[]>({
    queryKey: ["/api/iniciativas", empresaId],
    enabled: !!empresaId,
  });

  const { data: objetivos = [], isLoading: loadingOkrs } = useQuery<any[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  const { data: rituais = [], isLoading: loadingRituais } = useQuery<any[]>({
    queryKey: ["/api/rituais", empresaId],
    enabled: !!empresaId,
  });

  const isLoading =
    loadingEmpresa ||
    loadingIndicadores ||
    loadingPestel ||
    loadingForcas ||
    loadingBmc ||
    loadingSwot ||
    loadingEstategias ||
    loadingOport ||
    loadingIniciativas ||
    loadingOkrs ||
    loadingRituais;

  const perfilCompleto = !!(empresa?.nome && empresa?.setor && empresa?.tamanho);

  const acompanhamentoConcluido = rituais.some(
    (r: any) => r.completado === true || (r.checklist && Array.isArray(r.checklist) && r.checklist.some((c: any) => c.done))
  );

  const steps: JornadaStep[] = [
    {
      id: "perfil",
      numero: 1,
      titulo: "Perfil da Empresa",
      descricao: "Defina os dados básicos da sua empresa para personalizar toda a análise estratégica com IA.",
      url: "/onboarding",
      concluido: perfilCompleto,
    },
    {
      id: "indicadores",
      numero: 2,
      titulo: "KPIs — Indicadores",
      descricao: "Configure os indicadores-chave para monitorar a saúde do negócio antes de analisar o ambiente.",
      url: "/indicadores",
      concluido: indicadores.length > 0,
      bloqueadoPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "pestel",
      numero: 3,
      titulo: "Cenário Externo (PESTEL)",
      descricao: "Mapeie fatores políticos, econômicos, sociais, tecnológicos, ambientais e legais que afetam o negócio.",
      url: "/pestel",
      concluido: fatoresPestel.length > 0,
      bloqueadoPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "cinco-forcas",
      numero: 4,
      titulo: "Mercado e Concorrência",
      descricao: "Analise as cinco forças que determinam a intensidade competitiva do seu setor.",
      url: "/cinco-forcas",
      concluido: cincoForcas.length > 0,
      bloqueadoPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "bmc",
      numero: 5,
      titulo: "Modelo de Negócio (Canvas)",
      descricao: "Visualize e documente os 9 blocos do Business Model Canvas para entender como sua empresa gera valor.",
      url: "/bmc",
      concluido: modeloNegocio.length >= 5,
      bloqueadoPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "swot",
      numero: 6,
      titulo: "Forças e Fraquezas (SWOT)",
      descricao: "Identifique pontos fortes, fraquezas internas, oportunidades e ameaças externas.",
      url: "/swot",
      concluido: swotItens.length >= 4,
      bloqueadoPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "estrategias",
      numero: 7,
      titulo: "Estratégias (Matriz TOWS)",
      descricao: "Combine as descobertas do SWOT para criar estratégias práticas de crescimento, proteção e melhoria.",
      url: "/estrategias",
      concluido: estrategias.length > 0,
      bloqueadoPor: swotItens.length >= 4 ? [] : ["swot"],
    },
    {
      id: "oportunidades",
      numero: 8,
      titulo: "Oportunidades de Crescimento",
      descricao: "Identifique e priorize as maiores oportunidades para expandir o negócio (Matriz de Ansoff).",
      url: "/oportunidades-crescimento",
      concluido: oportunidades.length > 0,
      bloqueadoPor: estrategias.length > 0 ? [] : ["estrategias"],
    },
    {
      id: "iniciativas",
      numero: 9,
      titulo: "Iniciativas Prioritárias",
      descricao: "Transforme estratégias em projetos concretos com responsáveis, prazos e impacto esperado.",
      url: "/iniciativas",
      concluido: iniciativas.length > 0,
      bloqueadoPor: estrategias.length > 0 ? [] : ["estrategias"],
    },
    {
      id: "okrs",
      numero: 10,
      titulo: "OKRs — Objetivos e Resultados-Chave",
      descricao: "Defina objetivos inspiradores e resultados mensuráveis para guiar a execução da estratégia.",
      url: "/okrs",
      concluido: objetivos.length > 0,
      bloqueadoPor: iniciativas.length > 0 ? [] : ["iniciativas"],
    },
    {
      id: "acompanhamento",
      numero: 11,
      titulo: "Acompanhamento (Ritos Estratégicos)",
      descricao: "Estabeleça uma cadência de revisão para garantir a execução consistente da estratégia.",
      url: "/ritos",
      concluido: acompanhamentoConcluido,
      bloqueadoPor: objetivos.length > 0 ? [] : ["okrs"],
    },
  ];

  const totalConcluidos = steps.filter((s) => s.concluido).length;
  const total = steps.length;
  const percentual = Math.round((totalConcluidos / total) * 100);
  const jornadaConcluida = totalConcluidos === total;

  return {
    steps,
    totalConcluidos,
    total,
    percentual,
    jornadaConcluida,
    isLoading,
  };
}

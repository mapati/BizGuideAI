import { useQuery } from "@tanstack/react-query";
import {
  Target,
  BarChart3,
  Globe2,
  Swords,
  LayoutGrid,
  GitBranch,
  Rocket,
  TrendingUp,
  Briefcase,
  Flag,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Empresa } from "@shared/schema";

export interface JornadaEtapa {
  id: string;
  nome: string;
  rota: string;
  concluida: boolean;
  icone: LucideIcon;
  descricao: string;
  valorIA: string;
  bloqueadaPor?: string[];
}

export interface JornadaProgresso {
  etapas: JornadaEtapa[];
  totalConcluidas: number;
  total: number;
  percentual: number;
  jornadaConcluida: boolean;
  isLoading: boolean;
}

interface EmpresaData extends Empresa {
  id: string;
}

export function useJornadaProgresso(): JornadaProgresso {
  const { data: empresa, isLoading: loadingEmpresa } = useQuery<EmpresaData | null>({
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
    (r: any) =>
      r.completado === true ||
      (r.checklist && Array.isArray(r.checklist) && r.checklist.some((c: any) => c.done))
  );

  const etapas: JornadaEtapa[] = [
    {
      id: "perfil",
      nome: "Perfil da Empresa",
      rota: "/onboarding",
      concluida: perfilCompleto,
      icone: Target,
      descricao:
        "Defina os dados básicos da sua empresa: nome, setor, tamanho e descrição. Esses dados personalizam toda a análise estratégica.",
      valorIA:
        "A IA usa o perfil como contexto para gerar análises, sugestões e relatórios específicos para o seu negócio.",
    },
    {
      id: "indicadores",
      nome: "KPIs — Indicadores",
      rota: "/indicadores",
      concluida: indicadores.length > 0,
      icone: BarChart3,
      descricao:
        "Configure os KPIs (Key Performance Indicators) para monitorar a saúde operacional da empresa antes de construir a estratégia.",
      valorIA:
        "A IA monitora seus indicadores e gera alertas automáticos quando métricas saem do esperado.",
      bloqueadaPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "pestel",
      nome: "Cenário Externo — PESTEL",
      rota: "/pestel",
      concluida: fatoresPestel.length > 0,
      icone: Globe2,
      descricao:
        "Mapeie fatores Políticos, Econômicos, Sociais, Tecnológicos, Ambientais e Legais que influenciam o seu mercado.",
      valorIA:
        "A IA pesquisa e sugere fatores PESTEL relevantes para o seu setor, enriquecendo a análise com dados reais.",
      bloqueadaPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "cinco-forcas",
      nome: "Mercado e Concorrência — Cinco Forças",
      rota: "/cinco-forcas",
      concluida: cincoForcas.length > 0,
      icone: Swords,
      descricao:
        "Analise as cinco forças de Porter: rivalidade, entrantes, substitutos, poder de clientes e poder de fornecedores.",
      valorIA:
        "A IA avalia cada força competitiva do seu setor e sugere estratégias de posicionamento com base no contexto PESTEL.",
      bloqueadaPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "bmc",
      nome: "Modelo de Negócio — Canvas",
      rota: "/bmc",
      concluida: modeloNegocio.length >= 5,
      icone: LayoutGrid,
      descricao:
        "Mapeie os 9 blocos do Business Model Canvas: proposta de valor, clientes, canais, receitas, custos e mais.",
      valorIA:
        "A IA analisa cada bloco do seu Canvas e identifica lacunas ou oportunidades de melhoria no modelo de negócio.",
      bloqueadaPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "swot",
      nome: "Forças e Fraquezas — SWOT",
      rota: "/swot",
      concluida: swotItens.length >= 4,
      icone: GitBranch,
      descricao:
        "Identifique Forças internas, Fraquezas, Oportunidades externas e Ameaças do mercado para ter uma visão completa.",
      valorIA:
        "A IA cruza PESTEL, Cinco Forças e Canvas para sugerir itens SWOT altamente contextualizados.",
      bloqueadaPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "estrategias",
      nome: "Estratégias — Matriz TOWS",
      rota: "/estrategias",
      concluida: estrategias.length > 0,
      icone: Flag,
      descricao:
        "Combine Forças, Fraquezas, Oportunidades e Ameaças do SWOT para criar estratégias práticas: SO, ST, WO e WT.",
      valorIA:
        "A IA gera estratégias TOWS personalizadas com base em todo o contexto que você construiu nas etapas anteriores.",
      bloqueadaPor: swotItens.length >= 4 ? [] : ["swot"],
    },
    {
      id: "oportunidades",
      nome: "Oportunidades de Crescimento",
      rota: "/oportunidades-crescimento",
      concluida: oportunidades.length > 0,
      icone: TrendingUp,
      descricao:
        "Use a Matriz de Ansoff para identificar caminhos de crescimento: penetração, desenvolvimento de mercado, de produto e diversificação.",
      valorIA:
        "A IA prioriza oportunidades com base nas estratégias definidas e no perfil de risco da sua empresa.",
      bloqueadaPor: estrategias.length > 0 ? [] : ["estrategias"],
    },
    {
      id: "iniciativas",
      nome: "Iniciativas Prioritárias",
      rota: "/iniciativas",
      concluida: iniciativas.length > 0,
      icone: Briefcase,
      descricao:
        "Transforme estratégias em projetos concretos com responsáveis, prazos e impacto esperado.",
      valorIA:
        "A IA sugere iniciativas práticas derivadas das suas estratégias e as ordena por prioridade.",
      bloqueadaPor: estrategias.length > 0 ? [] : ["estrategias"],
    },
    {
      id: "okrs",
      nome: "OKRs — Objetivos e Resultados-Chave",
      rota: "/okrs",
      concluida: objetivos.length > 0,
      icone: Rocket,
      descricao:
        "Defina Objetivos inspiradores com Resultados-Chave mensuráveis para guiar a execução da estratégia com foco e clareza.",
      valorIA:
        "A IA cria OKRs conectados às suas iniciativas e estratégias, garantindo alinhamento de cima a baixo.",
      bloqueadaPor: iniciativas.length > 0 ? [] : ["iniciativas"],
    },
    {
      id: "acompanhamento",
      nome: "Acompanhamento — Ritos Estratégicos",
      rota: "/ritos",
      concluida: acompanhamentoConcluido,
      icone: Activity,
      descricao:
        "Estabeleça uma cadência de revisão semanal, mensal e trimestral para garantir a execução consistente da estratégia.",
      valorIA:
        "A IA agenda os rituais e gera pautas automáticas para cada revisão, mantendo o time alinhado.",
      bloqueadaPor: objetivos.length > 0 ? [] : ["okrs"],
    },
  ];

  const totalConcluidas = etapas.filter((e) => e.concluida).length;
  const total = etapas.length;
  const percentual = Math.round((totalConcluidas / total) * 100);
  const jornadaConcluida = totalConcluidas === total;

  return {
    etapas,
    totalConcluidas,
    total,
    percentual,
    jornadaConcluida,
    isLoading,
  };
}

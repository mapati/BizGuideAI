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
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Empresa } from "@shared/schema";

export type EtapaStatus = "pendente" | "iniciado" | "concluido";

export interface JornadaEtapa {
  id: string;
  nome: string;
  rota: string;
  concluida: boolean;
  status: EtapaStatus;
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

  const { data: eventos = [], isLoading: loadingEventos } = useQuery<any[]>({
    queryKey: ["/api/eventos", empresaId],
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
    loadingRituais ||
    loadingEventos;

  // Empresas criadas antes desta data são tratadas como legadas e não exigem perfil completo estendido
  const PERFIL_COMPLETO_RELEASE_DATE = new Date("2026-04-18T00:00:00.000Z");
  const isLegacyCompany = empresa?.createdAt
    ? new Date(empresa.createdAt) < PERFIL_COMPLETO_RELEASE_DATE
    : false;

  const perfilBaseCompleto = !!(empresa?.nome && empresa?.setor && empresa?.tamanho && empresa?.descricao);
  const perfilEstendidoCompleto = !!(
    empresa?.nome &&
    empresa?.setor &&
    empresa?.tamanho &&
    empresa?.descricao &&
    empresa?.cnpj &&
    empresa?.endereco &&
    empresa?.cidade &&
    empresa?.estado &&
    empresa?.cep &&
    (empresa as any)?.nomeResponsavel &&
    (empresa as any)?.emailResponsavel &&
    (empresa as any)?.termoAceitoEm
  );
  const perfilCompleto = isLegacyCompany ? perfilBaseCompleto : perfilEstendidoCompleto;
  const perfilIniciado = !!(empresa?.nome && empresa?.setor && empresa?.tamanho);

  const indicadoresDiagnostico = indicadores.filter((i: any) => i.perspectiva === "diagnostico");
  const indicadoresBsc = indicadores.filter((i: any) => i.perspectiva !== "diagnostico");

  const acompanhamentoConcluido = (() => {
    const ritualConcluido = rituais.some((r: any) => {
      if (r.completado === true || r.completado === "true") return true;
      try {
        const checklist = typeof r.checklist === "string"
          ? JSON.parse(r.checklist)
          : r.checklist;
        return Array.isArray(checklist) && checklist.some((c: any) => c.done === true || c.done === "true");
      } catch {
        return false;
      }
    });
    return ritualConcluido || eventos.length > 0;
  })();

  function derivarStatus(concluida: boolean, iniciado: boolean): EtapaStatus {
    if (concluida) return "concluido";
    if (iniciado) return "iniciado";
    return "pendente";
  }

  const etapas: JornadaEtapa[] = [
    {
      id: "perfil",
      nome: "Perfil da Empresa",
      rota: "/onboarding",
      concluida: perfilCompleto,
      status: derivarStatus(perfilCompleto, perfilIniciado),
      icone: Target,
      descricao:
        "Defina os dados básicos da sua empresa: nome, setor, tamanho e descrição. Esses dados personalizam toda a análise estratégica.",
      valorIA:
        "A IA usa o perfil como contexto para gerar análises, sugestões e relatórios específicos para o seu negócio.",
    },
    {
      id: "diagnostico",
      nome: "Diagnóstico Atual",
      rota: "/diagnostico",
      concluida: indicadoresDiagnostico.length >= 3,
      status: derivarStatus(
        indicadoresDiagnostico.length >= 3,
        indicadoresDiagnostico.length > 0
      ),
      icone: ClipboardList,
      descricao:
        "Registre 3 a 5 métricas que descrevem o estado atual do negócio — receita, crescimento, margem e satisfação de clientes. Esse baseline será o ponto de partida para medir o impacto da estratégia.",
      valorIA:
        "A IA identifica quais métricas são mais relevantes para o seu setor e sugere valores de referência do mercado.",
      bloqueadaPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "bmc",
      nome: "Modelo de Negócio",
      rota: "/bmc",
      concluida: modeloNegocio.length >= 5,
      status: derivarStatus(modeloNegocio.length >= 5, modeloNegocio.length > 0),
      icone: LayoutGrid,
      descricao:
        "Mapeie os 9 blocos do seu modelo de negócio: proposta de valor, clientes, canais, fontes de receita, estrutura de custos e mais.",
      valorIA:
        "A IA analisa cada bloco do seu modelo de negócio e identifica lacunas ou oportunidades de melhoria.",
      bloqueadaPor: indicadoresDiagnostico.length >= 3 ? [] : ["diagnostico"],
    },
    {
      id: "pestel",
      nome: "Cenário Externo",
      rota: "/pestel",
      concluida: fatoresPestel.length >= 6,
      status: derivarStatus(fatoresPestel.length >= 6, fatoresPestel.length > 0),
      icone: Globe2,
      descricao:
        "Mapeie os fatores externos — políticos, econômicos, sociais, tecnológicos, ambientais e legais — que influenciam o seu mercado.",
      valorIA:
        "A IA pesquisa e sugere fatores externos relevantes para o seu setor, enriquecendo a análise com dados reais.",
      bloqueadaPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "cinco-forcas",
      nome: "Mercado e Concorrência",
      rota: "/cinco-forcas",
      concluida: cincoForcas.length >= 3,
      status: derivarStatus(cincoForcas.length >= 3, cincoForcas.length > 0),
      icone: Swords,
      descricao:
        "Analise as forças do seu mercado: rivalidade entre concorrentes, ameaça de entrantes, substitutos, poder de clientes e poder de fornecedores.",
      valorIA:
        "A IA avalia cada força competitiva do seu setor e sugere estratégias de posicionamento com base no cenário externo mapeado.",
      bloqueadaPor: perfilCompleto ? [] : ["perfil"],
    },
    {
      id: "swot",
      nome: "Forças e Fraquezas",
      rota: "/swot",
      concluida: swotItens.length >= 4,
      status: derivarStatus(swotItens.length >= 4, swotItens.length > 0),
      icone: GitBranch,
      descricao:
        "Identifique as forças internas, fraquezas, oportunidades externas e ameaças do mercado para ter uma visão completa da sua posição estratégica.",
      valorIA:
        "A IA cruza o cenário externo, análise de mercado e modelo de negócio para sugerir itens altamente contextualizados.",
      bloqueadaPor: (() => {
        const bloqueios: string[] = [];
        if (modeloNegocio.length < 5) bloqueios.push("bmc");
        if (fatoresPestel.length < 6) bloqueios.push("pestel");
        if (cincoForcas.length < 3) bloqueios.push("cinco-forcas");
        return bloqueios;
      })(),
    },
    {
      id: "estrategias",
      nome: "Estratégias",
      rota: "/estrategias",
      concluida: estrategias.length > 0,
      status: derivarStatus(estrategias.length > 0, false),
      icone: Flag,
      descricao:
        "Combine as forças, fraquezas, oportunidades e ameaças mapeadas para criar estratégias práticas e priorizadas.",
      valorIA:
        "A IA gera estratégias personalizadas com base em todo o contexto que você construiu nas etapas anteriores.",
      bloqueadaPor: swotItens.length >= 4 ? [] : ["swot"],
    },
    {
      id: "oportunidades",
      nome: "Oportunidades de Crescimento",
      rota: "/oportunidades-crescimento",
      concluida: oportunidades.length > 0,
      status: derivarStatus(oportunidades.length > 0, false),
      icone: TrendingUp,
      descricao:
        "Identifique caminhos de crescimento: conquistar mais do mercado atual, entrar em novos mercados, lançar produtos ou diversificar.",
      valorIA:
        "A IA prioriza oportunidades com base nas estratégias definidas e no perfil de risco da sua empresa.",
      bloqueadaPor: estrategias.length > 0 ? [] : ["estrategias"],
    },
    {
      id: "iniciativas",
      nome: "Iniciativas Prioritárias",
      rota: "/iniciativas",
      concluida: iniciativas.length > 0,
      status: derivarStatus(iniciativas.length > 0, false),
      icone: Briefcase,
      descricao:
        "Transforme estratégias em projetos concretos com responsáveis, prazos e impacto esperado.",
      valorIA:
        "A IA sugere iniciativas práticas derivadas das suas estratégias e as ordena por prioridade.",
      bloqueadaPor: estrategias.length > 0 ? [] : ["estrategias"],
    },
    {
      id: "okrs",
      nome: "Metas e Resultados",
      rota: "/okrs",
      concluida: objetivos.length > 0,
      status: derivarStatus(objetivos.length > 0, false),
      icone: Rocket,
      descricao:
        "Defina objetivos inspiradores com resultados-chave mensuráveis para guiar a execução da estratégia com foco e clareza.",
      valorIA:
        "A IA cria metas conectadas às suas iniciativas e estratégias, garantindo alinhamento de cima a baixo.",
      bloqueadaPor: estrategias.length > 0 ? [] : ["estrategias"],
    },
    {
      id: "indicadores",
      nome: "Indicadores de Performance",
      rota: "/indicadores",
      concluida: indicadoresBsc.length > 0,
      status: derivarStatus(indicadoresBsc.length > 0, false),
      icone: BarChart3,
      descricao:
        "Com a estratégia definida, construa um painel de indicadores nas 4 perspectivas — Finanças, Clientes, Processos e Pessoas — para monitorar a execução continuamente.",
      valorIA:
        "A IA gera indicadores estratégicos derivados das suas estratégias e metas, com alvos alinhados ao plano.",
      bloqueadaPor: objetivos.length > 0 ? [] : ["okrs"],
    },
    {
      id: "acompanhamento",
      nome: "Acompanhamento",
      rota: "/ritos",
      concluida: acompanhamentoConcluido,
      status: derivarStatus(acompanhamentoConcluido, rituais.length > 0),
      icone: Activity,
      descricao:
        "Estabeleça uma cadência de revisão semanal, mensal e trimestral para garantir a execução consistente da estratégia.",
      valorIA:
        "A IA agenda as revisões e gera pautas automáticas para cada encontro, mantendo o time alinhado.",
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

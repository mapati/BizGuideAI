import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  Eye,
  Edit
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ritual, Empresa } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Alerta {
  tipo: string;
  severidade: "alta" | "media";
  mensagem: string;
  detalhes: any;
}

interface RitualComStatus extends Ritual {
  pendente: boolean;
}

const RITUAIS_CONFIG = [
  {
    tipo: "diario",
    nome: "Ritual Diário",
    frequencia: "Diário",
    duracao: "5 min",
    descricao: "Check-in rápido das iniciativas em andamento",
    cor: "bg-blue-500",
    checklist: [
      "Revisar status das iniciativas em andamento",
      "Identificar bloqueios imediatos",
      "Atualizar progresso das atividades do dia"
    ],
    perguntas: [
      "O que foi concluído ontem?",
      "O que será feito hoje?",
      "Há algum bloqueio?"
    ]
  },
  {
    tipo: "semanal",
    nome: "Ritual Semanal",
    frequencia: "Segunda-feira, 10h",
    duracao: "30 min",
    descricao: "Revisão de progresso e atualização de resultados-chave",
    cor: "bg-green-500",
    checklist: [
      "Atualizar resultados-chave dos objetivos",
      "Revisar iniciativas prioritárias",
      "Registrar bloqueios e dependências",
      "Ajustar prioridades da semana"
    ],
    perguntas: [
      "Quais KRs avançaram esta semana?",
      "O que nos surpreendeu positivamente?",
      "Que bloqueios precisam ser resolvidos?"
    ]
  },
  {
    tipo: "mensal",
    nome: "Ritual Mensal",
    frequencia: "Primeira sexta do mês",
    duracao: "1h",
    descricao: "Análise estratégica e revisão de indicadores BSC",
    cor: "bg-orange-500",
    checklist: [
      "Revisar todos os indicadores BSC",
      "Analisar desvios significativos",
      "Ajustar OKRs se necessário",
      "Definir ações corretivas para indicadores críticos"
    ],
    perguntas: [
      "Quais indicadores estão fora do esperado?",
      "As iniciativas estão gerando os resultados desejados?",
      "Precisamos ajustar alguma meta?"
    ]
  },
  {
    tipo: "trimestral",
    nome: "Ritual Trimestral",
    frequencia: "A cada 3 meses",
    duracao: "2h",
    descricao: "Revisão estratégica completa e replanejamento",
    cor: "bg-purple-500",
    checklist: [
      "Revisar todas as apostas estratégicas",
      "Avaliar efetividade das estratégias",
      "Analisar cenário externo (PESTEL)",
      "Replanejar próximo trimestre",
      "Celebrar conquistas do período"
    ],
    perguntas: [
      "As estratégias ainda fazem sentido?",
      "O que aprendemos neste trimestre?",
      "Que ajustes devemos fazer no plano?"
    ]
  }
];

export default function Acompanhamento() {
  const { toast } = useToast();
  const [expandedRituais, setExpandedRituais] = useState<Set<string>>(new Set(["semanal"]));
  const [editandoNotas, setEditandoNotas] = useState<string | null>(null);
  const [editandoDecisoes, setEditandoDecisoes] = useState<string | null>(null);
  const [visualizandoDetalhes, setVisualizandoDetalhes] = useState<Set<string>>(new Set());
  const [notas, setNotas] = useState("");
  const [decisoes, setDecisoes] = useState("");

  const { data: empresa } = useQuery<Empresa>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  const { data: rituais = [], isLoading: loadingRituais } = useQuery<RitualComStatus[]>({
    queryKey: ["/api/rituais", empresaId],
    enabled: !!empresaId,
  });

  const { data: alertas = [], isLoading: loadingAlertas } = useQuery<Alerta[]>({
    queryKey: ["/api/alertas", empresaId],
    enabled: !!empresaId,
  });

  const completarRitualMutation = useMutation({
    mutationFn: async (ritualId: string) => {
      const res = await apiRequest("PATCH", `/api/rituais/${ritualId}`, {
        completado: "true",
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rituais", empresaId] });
      toast({
        title: "Ritual completado!",
        description: "O ritual foi marcado como concluído.",
      });
    },
  });

  const salvarNotasMutation = useMutation({
    mutationFn: async ({ id, notas }: { id: string; notas: string }) => {
      const res = await apiRequest("PATCH", `/api/rituais/${id}`, { notas });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rituais", empresaId] });
      setEditandoNotas(null);
      toast({
        title: "Notas salvas!",
        description: "As anotações foram salvas com sucesso.",
      });
    },
  });

  const salvarDecisoesMutation = useMutation({
    mutationFn: async ({ id, decisoes }: { id: string; decisoes: string }) => {
      const res = await apiRequest("PATCH", `/api/rituais/${id}`, { decisoes });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rituais", empresaId] });
      setEditandoDecisoes(null);
      toast({
        title: "Decisões salvas!",
        description: "As decisões foram registradas com sucesso.",
      });
    },
  });

  const toggleRitual = (tipo: string) => {
    const newExpanded = new Set(expandedRituais);
    if (newExpanded.has(tipo)) {
      newExpanded.delete(tipo);
    } else {
      newExpanded.add(tipo);
    }
    setExpandedRituais(newExpanded);
  };

  const toggleVisualizarDetalhes = (tipo: string) => {
    const newVisualizando = new Set(visualizandoDetalhes);
    if (newVisualizando.has(tipo)) {
      newVisualizando.delete(tipo);
    } else {
      newVisualizando.add(tipo);
    }
    setVisualizandoDetalhes(newVisualizando);
  };

  const getRitualData = (tipo: string) => {
    return rituais.find(r => r.tipo === tipo);
  };

  const alertasCriticos = useMemo(() => {
    return alertas.filter(a => a.severidade === "alta");
  }, [alertas]);

  const alertasAtencao = useMemo(() => {
    return alertas.filter(a => a.severidade === "media");
  }, [alertas]);

  const proximoRitual = useMemo(() => {
    const agora = new Date();
    const rituaisFuturos = rituais
      .filter(r => new Date(r.dataProximo) > agora && r.completado !== "true")
      .sort((a, b) => new Date(a.dataProximo).getTime() - new Date(b.dataProximo).getTime());
    return rituaisFuturos[0];
  }, [rituais]);

  if (loadingRituais || loadingAlertas) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Acompanhamento - Ritos"
        description="Organize a execução da estratégia através de rituais estruturados e mantenha o time alinhado."
        tooltip="Os rituais são encontros periódicos que garantem foco, alinhamento e correção de rumo. Use os alertas para identificar o que precisa de atenção imediata."
      />

      {/* Seção de Alertas */}
      {(alertasCriticos.length > 0 || alertasAtencao.length > 0) && (
        <Card className="border-orange-200 dark:border-orange-900" data-testid="card-alertas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas & Atenção
            </CardTitle>
            <CardDescription>
              Itens que precisam da sua atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertasCriticos.map((alerta, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                data-testid={`alerta-critico-${idx}`}
              >
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900 dark:text-red-100">
                    {alerta.mensagem}
                  </p>
                  {alerta.detalhes && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {alerta.tipo === "indicador_critico" && 
                        `${alerta.detalhes.perspectiva} • Meta: ${alerta.detalhes.meta} • Atual: ${alerta.detalhes.atual}`
                      }
                      {alerta.tipo === "iniciativa_atrasada" && 
                        `Prazo: ${new Date(alerta.detalhes.prazo).toLocaleDateString()} • Responsável: ${alerta.detalhes.responsavel}`
                      }
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {alertasAtencao.map((alerta, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900"
                data-testid={`alerta-atencao-${idx}`}
              >
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    {alerta.mensagem}
                  </p>
                  {alerta.detalhes && (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {alerta.tipo === "indicador_atencao" && 
                        `${alerta.detalhes.perspectiva} • Meta: ${alerta.detalhes.meta} • Atual: ${alerta.detalhes.atual}`
                      }
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Próximo Ritual */}
      {proximoRitual && (
        <Card className="border-primary/20" data-testid="card-proximo-ritual">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full ${RITUAIS_CONFIG.find(r => r.tipo === proximoRitual.tipo)?.cor} flex items-center justify-center`}>
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Próximo Ritual</h3>
                <p className="text-sm text-muted-foreground">
                  {RITUAIS_CONFIG.find(r => r.tipo === proximoRitual.tipo)?.nome} • {new Date(proximoRitual.dataProximo).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <Button 
                onClick={() => toggleRitual(proximoRitual.tipo)}
                data-testid="button-ver-proximo-ritual"
              >
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Rituais */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Rituais de Gestão</h2>
        
        {RITUAIS_CONFIG.map((config) => {
          const ritualData = getRitualData(config.tipo);
          const isExpanded = expandedRituais.has(config.tipo);
          const isPendente = ritualData?.pendente !== false;
          const mostrandoDetalhes = visualizandoDetalhes.has(config.tipo);

          return (
            <Card key={config.tipo} data-testid={`card-ritual-${config.tipo}`}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleRitual(config.tipo)}>
                <CardHeader className="cursor-pointer" onClick={() => toggleRitual(config.tipo)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`h-10 w-10 rounded-full ${config.cor} flex items-center justify-center`}>
                        {!isPendente ? (
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        ) : (
                          <Circle className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle>{config.nome}</CardTitle>
                          {!isPendente && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900">
                              Concluído
                            </Badge>
                          )}
                          {isPendente && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">
                              Pendente
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          <span className="inline-flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {config.frequencia} • {config.duracao}
                          </span>
                          <span className="block mt-1">{config.descricao}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-toggle-${config.tipo}`}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                    {!isPendente ? (
                      // Mensagem quando o ritual já foi completado
                      <div className="space-y-4">
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-lg p-6 text-center">
                          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                            Ritual já realizado! 🎉
                          </h3>
                          <p className="text-green-700 dark:text-green-300 mb-4">
                            {config.tipo === "diario" && "Você já completou o ritual diário de hoje. Volte amanhã para o próximo!"}
                            {config.tipo === "semanal" && "Você já completou o ritual semanal desta semana. Vejo você na próxima segunda-feira!"}
                            {config.tipo === "mensal" && "Você já completou o ritual mensal deste mês. Nos vemos no próximo mês!"}
                            {config.tipo === "trimestral" && "Você já completou o ritual trimestral deste período. Até o próximo trimestre!"}
                          </p>
                          {ritualData?.dataUltimo && (
                            <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                              Realizado em: {new Date(ritualData.dataUltimo).toLocaleDateString('pt-BR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                          <Button 
                            variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVisualizarDetalhes(config.tipo);
                            }}
                            data-testid={`button-ver-detalhes-${config.tipo}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {mostrandoDetalhes ? "Ocultar Detalhes" : "Ver Detalhes"}
                          </Button>
                        </div>

                        {mostrandoDetalhes && (
                          <div className="space-y-4 pt-2">
                            {/* Notas */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">Notas & Observações</h4>
                                {editandoNotas === config.tipo ? (
                                  <Button 
                                    size="sm" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      salvarNotasMutation.mutate({ id: ritualData?.id || "", notas });
                                    }}
                                    disabled={salvarNotasMutation.isPending}
                                    data-testid={`button-salvar-notas-${config.tipo}`}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Salvar
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditandoNotas(config.tipo);
                                      setNotas(ritualData?.notas || "");
                                    }}
                                    data-testid={`button-editar-notas-${config.tipo}`}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </Button>
                                )}
                              </div>
                              {editandoNotas === config.tipo ? (
                                <Textarea
                                  value={notas}
                                  onChange={(e) => setNotas(e.target.value)}
                                  placeholder="Registre observações importantes do ritual..."
                                  className="min-h-[100px]"
                                  data-testid={`textarea-notas-${config.tipo}`}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                                  {ritualData?.notas || "Nenhuma nota registrada ainda"}
                                </p>
                              )}
                            </div>

                            {/* Decisões */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">Decisões Tomadas</h4>
                                {editandoDecisoes === config.tipo ? (
                                  <Button 
                                    size="sm" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      salvarDecisoesMutation.mutate({ id: ritualData?.id || "", decisoes });
                                    }}
                                    disabled={salvarDecisoesMutation.isPending}
                                    data-testid={`button-salvar-decisoes-${config.tipo}`}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Salvar
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditandoDecisoes(config.tipo);
                                      setDecisoes(ritualData?.decisoes || "");
                                    }}
                                    data-testid={`button-editar-decisoes-${config.tipo}`}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </Button>
                                )}
                              </div>
                              {editandoDecisoes === config.tipo ? (
                                <Textarea
                                  value={decisoes}
                                  onChange={(e) => setDecisoes(e.target.value)}
                                  placeholder="Registre as decisões importantes tomadas neste ritual..."
                                  className="min-h-[100px]"
                                  data-testid={`textarea-decisoes-${config.tipo}`}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                                  {ritualData?.decisoes || "Nenhuma decisão registrada ainda"}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Checklist */}
                        <div>
                          <h4 className="font-semibold mb-3">Checklist</h4>
                          <div className="space-y-2">
                            {config.checklist.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-3" data-testid={`checklist-item-${config.tipo}-${idx}`}>
                                <Checkbox id={`${config.tipo}-${idx}`} />
                                <label htmlFor={`${config.tipo}-${idx}`} className="text-sm leading-relaxed cursor-pointer">
                                  {item}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Perguntas Guia */}
                        <div>
                          <h4 className="font-semibold mb-3">Perguntas-Guia</h4>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {config.perguntas.map((pergunta, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{pergunta}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notas */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Notas & Observações</h4>
                            {editandoNotas === config.tipo ? (
                              <Button 
                                size="sm" 
                                onClick={() => salvarNotasMutation.mutate({ id: ritualData?.id || "", notas })}
                                disabled={salvarNotasMutation.isPending}
                                data-testid={`button-salvar-notas-${config.tipo}`}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditandoNotas(config.tipo);
                                  setNotas(ritualData?.notas || "");
                                }}
                                data-testid={`button-editar-notas-${config.tipo}`}
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                          {editandoNotas === config.tipo ? (
                            <Textarea
                              value={notas}
                              onChange={(e) => setNotas(e.target.value)}
                              placeholder="Registre observações importantes do ritual..."
                              className="min-h-[100px]"
                              data-testid={`textarea-notas-${config.tipo}`}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                              {ritualData?.notas || "Nenhuma nota registrada ainda"}
                            </p>
                          )}
                        </div>

                        {/* Decisões */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Decisões Tomadas</h4>
                            {editandoDecisoes === config.tipo ? (
                              <Button 
                                size="sm" 
                                onClick={() => salvarDecisoesMutation.mutate({ id: ritualData?.id || "", decisoes })}
                                disabled={salvarDecisoesMutation.isPending}
                                data-testid={`button-salvar-decisoes-${config.tipo}`}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditandoDecisoes(config.tipo);
                                  setDecisoes(ritualData?.decisoes || "");
                                }}
                                data-testid={`button-editar-decisoes-${config.tipo}`}
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                          {editandoDecisoes === config.tipo ? (
                            <Textarea
                              value={decisoes}
                              onChange={(e) => setDecisoes(e.target.value)}
                              placeholder="Registre as decisões importantes tomadas neste ritual..."
                              className="min-h-[100px]"
                              data-testid={`textarea-decisoes-${config.tipo}`}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                              {ritualData?.decisoes || "Nenhuma decisão registrada ainda"}
                            </p>
                          )}
                        </div>

                        {/* Botão Completar */}
                        <Button 
                          onClick={() => completarRitualMutation.mutate(ritualData?.id || "")}
                          disabled={completarRitualMutation.isPending || !ritualData}
                          className="w-full"
                          data-testid={`button-completar-${config.tipo}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Marcar como Completo
                        </Button>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

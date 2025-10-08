import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Edit,
  Plus,
  Users,
  FileText,
  Sparkles,
  Target
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ritual, Empresa, Evento } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Alerta {
  tipo: string;
  severidade: "alta" | "media";
  mensagem: string;
  detalhes: any;
}

interface RitualComStatus extends Ritual {
  pendente: boolean;
}

type FeedItem = 
  | { type: 'ritual'; data: RitualComStatus; date: Date }
  | { type: 'evento'; data: Evento; date: Date };

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

const TIPOS_EVENTO = [
  { value: "reuniao_conselho", label: "Reunião de Conselho", icon: Users },
  { value: "fato_excepcional", label: "Fato Excepcional", icon: Sparkles },
  { value: "mudanca_estrategia", label: "Mudança de Estratégia", icon: Target },
  { value: "revisao_plano", label: "Revisão do Plano", icon: FileText },
  { value: "outro", label: "Outro", icon: Circle },
];

export default function Acompanhamento() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editandoNotas, setEditandoNotas] = useState<string | null>(null);
  const [editandoDecisoes, setEditandoDecisoes] = useState<string | null>(null);
  const [notas, setNotas] = useState("");
  const [decisoes, setDecisoes] = useState("");
  
  // Form de novo evento
  const [eventoForm, setEventoForm] = useState({
    tipo: "",
    titulo: "",
    descricao: "",
    participantes: "",
    decisoes: "",
    dataEvento: new Date().toISOString().split('T')[0],
  });

  const { data: empresa } = useQuery<Empresa>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  const { data: rituais = [], isLoading: loadingRituais } = useQuery<RitualComStatus[]>({
    queryKey: ["/api/rituais", empresaId],
    enabled: !!empresaId,
  });

  const { data: eventos = [], isLoading: loadingEventos } = useQuery<Evento[]>({
    queryKey: ["/api/eventos", empresaId],
    enabled: !!empresaId,
  });

  const { data: alertas = [], isLoading: loadingAlertas } = useQuery<Alerta[]>({
    queryKey: ["/api/alertas", empresaId],
    enabled: !!empresaId,
  });

  const createEventoMutation = useMutation({
    mutationFn: async (evento: any) => {
      const res = await apiRequest("POST", "/api/eventos", evento);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/eventos", empresaId] });
      setDialogOpen(false);
      setEventoForm({
        tipo: "",
        titulo: "",
        descricao: "",
        participantes: "",
        decisoes: "",
        dataEvento: new Date().toISOString().split('T')[0],
      });
      toast({
        title: "Evento criado!",
        description: "O evento foi registrado com sucesso.",
      });
    },
  });

  const salvarChecklistMutation = useMutation({
    mutationFn: async ({ id, checklist }: { id: string; checklist: string }) => {
      const res = await apiRequest("PATCH", `/api/rituais/${id}`, { checklist });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rituais", empresaId] });
      toast({
        title: "Checklist salvo!",
        description: "O checklist foi atualizado com sucesso.",
      });
    },
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

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getRitualConfig = (tipo: string) => {
    return RITUAIS_CONFIG.find(r => r.tipo === tipo);
  };

  // Combinar rituais e eventos em um feed ordenado
  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    
    // Adicionar rituais completados
    rituais
      .filter(r => r.dataUltimo)
      .forEach(r => {
        items.push({
          type: 'ritual',
          data: r,
          date: new Date(r.dataUltimo!)
        });
      });
    
    // Adicionar eventos
    eventos.forEach(e => {
      items.push({
        type: 'evento',
        data: e,
        date: new Date(e.dataEvento)
      });
    });
    
    // Ordenar por data (mais recente primeiro)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rituais, eventos]);

  const alertasCriticos = useMemo(() => {
    return alertas.filter(a => a.severidade === "alta");
  }, [alertas]);

  const alertasAtencao = useMemo(() => {
    return alertas.filter(a => a.severidade === "media");
  }, [alertas]);

  const rituaisPendentes = useMemo(() => {
    return rituais.filter(r => r.pendente !== false);
  }, [rituais]);

  const handleCreateEvento = () => {
    if (!eventoForm.tipo || !eventoForm.titulo || !eventoForm.descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha tipo, título e descrição do evento.",
        variant: "destructive",
      });
      return;
    }

    createEventoMutation.mutate({
      ...eventoForm,
      empresaId,
      dataEvento: eventoForm.dataEvento, // Envia como string ISO
    });
  };

  const handleChecklistChange = (ritual: RitualComStatus, index: number, checked: boolean) => {
    const config = getRitualConfig(ritual.tipo);
    if (!config) return;

    const checklistData = ritual.checklist ? JSON.parse(ritual.checklist) : {};
    checklistData[index] = checked;

    salvarChecklistMutation.mutate({
      id: ritual.id,
      checklist: JSON.stringify(checklistData),
    });
  };

  if (loadingRituais || loadingEventos || loadingAlertas) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Acompanhamento - Timeline"
        description="Registre eventos importantes e acompanhe a execução da estratégia através de uma linha do tempo."
        tooltip="Esta timeline funciona como um feed de notícias da sua empresa, registrando rituais, reuniões, decisões estratégicas e fatos relevantes."
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

      {/* Rituais Pendentes */}
      {rituaisPendentes.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900" data-testid="card-rituais-pendentes">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Rituais Pendentes
            </CardTitle>
            <CardDescription>
              Rituais que precisam ser realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rituaisPendentes.map((ritual) => {
                const config = getRitualConfig(ritual.tipo);
                if (!config) return null;

                return (
                  <div key={ritual.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${config.cor} flex items-center justify-center`}>
                        <Circle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{config.nome}</p>
                        <p className="text-sm text-muted-foreground">{config.frequencia}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => toggleItem(`ritual-${ritual.id}`)}
                      data-testid={`button-abrir-ritual-${ritual.tipo}`}
                    >
                      Realizar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Novo Evento */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Timeline de Eventos</h2>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-novo-evento">
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Registrar Novo Evento</DialogTitle>
              <DialogDescription>
                Registre reuniões, decisões estratégicas, fatos excepcionais ou outros eventos importantes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Evento</Label>
                <Select 
                  value={eventoForm.tipo} 
                  onValueChange={(value) => setEventoForm({...eventoForm, tipo: value})}
                >
                  <SelectTrigger id="tipo" data-testid="select-tipo-evento">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_EVENTO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={eventoForm.titulo}
                  onChange={(e) => setEventoForm({...eventoForm, titulo: e.target.value})}
                  placeholder="Ex: Reunião de Conselho - Q4 2025"
                  data-testid="input-titulo-evento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataEvento">Data do Evento</Label>
                <Input
                  id="dataEvento"
                  type="date"
                  value={eventoForm.dataEvento}
                  onChange={(e) => setEventoForm({...eventoForm, dataEvento: e.target.value})}
                  data-testid="input-data-evento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={eventoForm.descricao}
                  onChange={(e) => setEventoForm({...eventoForm, descricao: e.target.value})}
                  placeholder="Descreva o evento..."
                  className="min-h-[100px]"
                  data-testid="textarea-descricao-evento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="participantes">Participantes (opcional)</Label>
                <Input
                  id="participantes"
                  value={eventoForm.participantes}
                  onChange={(e) => setEventoForm({...eventoForm, participantes: e.target.value})}
                  placeholder="Ex: CEO, CFO, Conselho..."
                  data-testid="input-participantes-evento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="decisoes-evento">Decisões Tomadas (opcional)</Label>
                <Textarea
                  id="decisoes-evento"
                  value={eventoForm.decisoes}
                  onChange={(e) => setEventoForm({...eventoForm, decisoes: e.target.value})}
                  placeholder="Registre as principais decisões..."
                  className="min-h-[80px]"
                  data-testid="textarea-decisoes-evento"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                data-testid="button-cancelar-evento"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateEvento}
                disabled={createEventoMutation.isPending}
                data-testid="button-salvar-evento"
              >
                {createEventoMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Evento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Feed/Timeline */}
      <div className="space-y-4">
        {feedItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum evento registrado ainda. Comece criando um novo evento ou realizando um ritual.
              </p>
            </CardContent>
          </Card>
        ) : (
          feedItems.map((item, index) => {
            if (item.type === 'ritual') {
              const ritual = item.data;
              const config = getRitualConfig(ritual.tipo);
              if (!config) return null;

              const isExpanded = expandedItems.has(`ritual-${ritual.id}`);
              const checklistData = ritual.checklist ? JSON.parse(ritual.checklist) : {};

              return (
                <Card key={`ritual-${ritual.id}`} data-testid={`card-feed-ritual-${ritual.tipo}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleItem(`ritual-${ritual.id}`)}>
                    <CardHeader className="cursor-pointer" onClick={() => toggleItem(`ritual-${ritual.id}`)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`h-10 w-10 rounded-full ${config.cor} flex items-center justify-center shrink-0`}>
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <CardTitle>{config.nome}</CardTitle>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900">
                                Realizado
                              </Badge>
                            </div>
                            <CardDescription className="mt-1">
                              {item.date.toLocaleDateString('pt-BR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </CardDescription>
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-toggle-ritual-${ritual.tipo}`}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>

                    <CollapsibleContent>
                      <CardContent className="space-y-6 pt-0">
                        {/* Checklist */}
                        <div>
                          <h4 className="font-semibold mb-3">Checklist</h4>
                          <div className="space-y-2">
                            {config.checklist.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-3" data-testid={`checklist-item-${ritual.tipo}-${idx}`}>
                                <Checkbox 
                                  id={`${ritual.tipo}-${idx}`}
                                  checked={checklistData[idx] || false}
                                  onCheckedChange={(checked) => handleChecklistChange(ritual, idx, checked as boolean)}
                                />
                                <label htmlFor={`${ritual.tipo}-${idx}`} className="text-sm leading-relaxed cursor-pointer">
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
                            {editandoNotas === ritual.id ? (
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  salvarNotasMutation.mutate({ id: ritual.id, notas });
                                }}
                                disabled={salvarNotasMutation.isPending}
                                data-testid={`button-salvar-notas-${ritual.tipo}`}
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
                                  setEditandoNotas(ritual.id);
                                  setNotas(ritual.notas || "");
                                }}
                                data-testid={`button-editar-notas-${ritual.tipo}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                            )}
                          </div>
                          {editandoNotas === ritual.id ? (
                            <Textarea
                              value={notas}
                              onChange={(e) => setNotas(e.target.value)}
                              placeholder="Registre observações importantes do ritual..."
                              className="min-h-[100px]"
                              data-testid={`textarea-notas-${ritual.tipo}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                              {ritual.notas || "Nenhuma nota registrada ainda"}
                            </p>
                          )}
                        </div>

                        {/* Decisões */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Decisões Tomadas</h4>
                            {editandoDecisoes === ritual.id ? (
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  salvarDecisoesMutation.mutate({ id: ritual.id, decisoes });
                                }}
                                disabled={salvarDecisoesMutation.isPending}
                                data-testid={`button-salvar-decisoes-${ritual.tipo}`}
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
                                  setEditandoDecisoes(ritual.id);
                                  setDecisoes(ritual.decisoes || "");
                                }}
                                data-testid={`button-editar-decisoes-${ritual.tipo}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                            )}
                          </div>
                          {editandoDecisoes === ritual.id ? (
                            <Textarea
                              value={decisoes}
                              onChange={(e) => setDecisoes(e.target.value)}
                              placeholder="Registre as decisões importantes tomadas neste ritual..."
                              className="min-h-[100px]"
                              data-testid={`textarea-decisoes-${ritual.tipo}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                              {ritual.decisoes || "Nenhuma decisão registrada ainda"}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            } else {
              // Evento
              const evento = item.data;
              const tipoEvento = TIPOS_EVENTO.find(t => t.value === evento.tipo);
              const IconeEvento = tipoEvento?.icon || FileText;
              const isExpanded = expandedItems.has(`evento-${evento.id}`);

              return (
                <Card key={`evento-${evento.id}`} data-testid={`card-feed-evento-${evento.id}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleItem(`evento-${evento.id}`)}>
                    <CardHeader className="cursor-pointer" onClick={() => toggleItem(`evento-${evento.id}`)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                            <IconeEvento className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <CardTitle>{evento.titulo}</CardTitle>
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900">
                                {tipoEvento?.label || "Evento"}
                              </Badge>
                            </div>
                            <CardDescription className="mt-1">
                              {item.date.toLocaleDateString('pt-BR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric'
                              })}
                            </CardDescription>
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-toggle-evento-${evento.id}`}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>

                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <h4 className="font-semibold mb-2">Descrição</h4>
                          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">
                            {evento.descricao}
                          </p>
                        </div>

                        {evento.participantes && (
                          <div>
                            <h4 className="font-semibold mb-2">Participantes</h4>
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                              {evento.participantes}
                            </p>
                          </div>
                        )}

                        {evento.decisoes && (
                          <div>
                            <h4 className="font-semibold mb-2">Decisões Tomadas</h4>
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">
                              {evento.decisoes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            }
          })
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import { Plus, Sparkles, Target as TargetIcon, Loader2, Trash2, Edit2, TrendingUp, Users, Cog, GraduationCap, DollarSign, BookOpen, UserCheck, Link2 } from "lucide-react";
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Objetivo, ResultadoChave, AIGenerationParams } from "@shared/schema";
import { OrigemSelector } from "@/components/OrigemSelector";
import { CascataBlock } from "@/components/CascataBlock";
import { useJornadaProgresso } from "@/hooks/useJornadaProgresso";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const perspectivas = [
  { valor: "Financeira", label: "Financeira", icon: DollarSign, cor: "bg-green-500" },
  { valor: "Clientes", label: "Clientes", icon: Users, cor: "bg-blue-500" },
  { valor: "Processos Internos", label: "Processos Internos", icon: Cog, cor: "bg-orange-500" },
  { valor: "Aprendizado e Crescimento", label: "Aprendizado e Crescimento", icon: GraduationCap, cor: "bg-purple-500" },
];

type Membro = { id: string; nome: string; email: string };
type EstrategiaBasica = { id: string; tipo: string; titulo: string };
type IniciativaBasica = { id: string; titulo: string };

function calcularProgresso(inicial: string, atual: string, alvo: string): number {
  const ini = parseFloat(inicial);
  const atu = parseFloat(atual);
  const alv = parseFloat(alvo);
  if (isNaN(ini) || isNaN(atu) || isNaN(alv)) return 0;
  if (alv === ini) return 100;
  const progresso = ((atu - ini) / (alv - ini)) * 100;
  return Math.max(0, Math.min(100, progresso));
}

interface ObjetivoCardProps {
  objetivo: Objetivo;
  membros: Membro[];
  estrategias: EstrategiaBasica[];
  iniciativas: IniciativaBasica[];
  resultadosChave: ResultadoChave[];
  jornadaConcluida: boolean;
  onSelect: (obj: Objetivo) => void;
  onRetro: (obj: Objetivo) => void;
  onDelete: (id: string) => void;
}

function ObjetivoCard({ objetivo, membros, estrategias, iniciativas, resultadosChave, jornadaConcluida, onSelect, onRetro, onDelete }: ObjetivoCardProps) {
  return (
    <Card
      className="p-4 hover-elevate cursor-pointer"
      onClick={() => onSelect(objetivo)}
      data-testid={`card-objetivo-${objetivo.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{objetivo.titulo}</h4>
          {objetivo.descricao && (
            <p className="text-xs text-muted-foreground mb-2">{objetivo.descricao}</p>
          )}
          <div className="flex items-center flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">Prazo: {objetivo.prazo}</p>
            {objetivo.responsavelId && (() => {
              const m = membros.find(m => m.id === objetivo.responsavelId);
              return m ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <UserCheck className="h-3 w-3" />
                  {m.nome}
                </span>
              ) : null;
            })()}
            {objetivo.estrategiaId && (() => {
              const est = estrategias.find(e => e.id === objetivo.estrategiaId);
              return est ? (
                <Badge variant="outline" className="gap-1 text-xs" data-testid={`badge-estrategia-objetivo-${objetivo.id}`}>
                  <Link2 className="h-3 w-3" />
                  {est.tipo} — {est.titulo.length > 35 ? est.titulo.slice(0, 35) + "…" : est.titulo}
                </Badge>
              ) : null;
            })()}
          </div>
          {(() => {
            const ini = iniciativas.find(i => i.id === objetivo.iniciativaId);
            const est = estrategias.find(e => e.id === objetivo.estrategiaId);
            const upstream = ini
              ? { id: ini.id, titulo: ini.titulo, href: "/iniciativas", rotulo: "Iniciativa" }
              : est
              ? { id: est.id, titulo: est.titulo, href: "/estrategias", rotulo: "Estratégia" }
              : null;
            const orfao = jornadaConcluida && !objetivo.iniciativaId && !objetivo.estrategiaId;
            const krs = resultadosChave.filter((kr) => kr.objetivoId === objetivo.id);
            const downstream = krs.length > 0
              ? [{ rotulo: "Resultados-chave", itens: krs.map((kr) => ({ id: kr.id, titulo: kr.metrica, rotulo: "KR" })) }]
              : [];
            return (
              <CascataBlock
                upstream={upstream}
                downstream={downstream}
                orfao={orfao}
                orfaoMensagem="Este objetivo não está conectado a uma Iniciativa ou Estratégia."
              />
            );
          })()}
        </div>
        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            title="Registrar Retrospectiva"
            onClick={(e) => { e.stopPropagation(); onRetro(objetivo); }}
            data-testid={`button-retro-objetivo-${objetivo.id}`}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(objetivo.id); }}
            data-testid={`button-delete-objetivo-${objetivo.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface ResultadoChaveCardProps {
  resultado: ResultadoChave;
  isEditing: boolean;
  editingData: ResultadoChave | null;
  onStartEdit: (r: ResultadoChave) => void;
  onChangeEdit: (r: ResultadoChave) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}

function ResultadoChaveCard({ resultado, isEditing, editingData, onStartEdit, onChangeEdit, onSave, onCancelEdit, onDelete, isSaving }: ResultadoChaveCardProps) {
  const progresso = calcularProgresso(resultado.valorInicial, resultado.valorAtual, resultado.valorAlvo);
  return (
    <Card className="p-4" data-testid={`card-resultado-${resultado.id}`}>
      {isEditing && editingData ? (
        <div className="space-y-3">
          <div>
            <Label>Métrica</Label>
            <Input
              value={editingData.metrica}
              onChange={(e) => onChangeEdit({ ...editingData, metrica: e.target.value })}
              data-testid={`input-edit-metrica-${resultado.id}`}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Inicial</Label>
              <Input type="number" value={editingData.valorInicial} onChange={(e) => onChangeEdit({ ...editingData, valorInicial: e.target.value })} data-testid={`input-edit-inicial-${resultado.id}`} />
            </div>
            <div>
              <Label className="text-xs">Atual</Label>
              <Input type="number" value={editingData.valorAtual} onChange={(e) => onChangeEdit({ ...editingData, valorAtual: e.target.value })} data-testid={`input-edit-atual-${resultado.id}`} />
            </div>
            <div>
              <Label className="text-xs">Alvo</Label>
              <Input type="number" value={editingData.valorAlvo} onChange={(e) => onChangeEdit({ ...editingData, valorAlvo: e.target.value })} data-testid={`input-edit-alvo-${resultado.id}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Responsável</Label>
              <Input value={editingData.owner} onChange={(e) => onChangeEdit({ ...editingData, owner: e.target.value })} data-testid={`input-edit-owner-${resultado.id}`} />
            </div>
            <div>
              <Label className="text-xs">Prazo</Label>
              <Input value={editingData.prazo} onChange={(e) => onChangeEdit({ ...editingData, prazo: e.target.value })} data-testid={`input-edit-prazo-${resultado.id}`} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={isSaving} size="sm" data-testid={`button-save-resultado-${resultado.id}`}>
              Salvar
            </Button>
            <Button onClick={onCancelEdit} variant="outline" size="sm" data-testid={`button-cancel-resultado-${resultado.id}`}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h5 className="font-semibold text-sm mb-1">{resultado.metrica}</h5>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Inicial: {resultado.valorInicial}</span>
                <span>Atual: {resultado.valorAtual}</span>
                <span>Alvo: {resultado.valorAlvo}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStartEdit(resultado)} data-testid={`button-edit-resultado-${resultado.id}`}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(resultado.id)} data-testid={`button-delete-resultado-${resultado.id}`}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold">{Math.round(progresso)}%</span>
            </div>
            <Progress value={progresso} className="h-2" data-testid={`progress-resultado-${resultado.id}`} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Responsável: {resultado.owner}</span>
            <span>Prazo: {resultado.prazo}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function OKRs() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoObjetivo, setNovoObjetivo] = useState<{
    titulo: string;
    descricao: string;
    prazo: string;
    perspectiva: string;
    responsavelId: string;
    estrategiaId: string | null;
    iniciativaId: string | null;
  }>({ titulo: "", descricao: "", prazo: "", perspectiva: "Financeira", responsavelId: "", estrategiaId: null, iniciativaId: null });
  const [objetivoSelecionado, setObjetivoSelecionado] = useState<Objetivo | null>(null);
  const [dialogResultadosOpen, setDialogResultadosOpen] = useState(false);
  const [editandoResultado, setEditandoResultado] = useState<ResultadoChave | null>(null);
  const [novoResultado, setNovoResultado] = useState({
    metrica: "",
    valorInicial: "",
    valorAlvo: "",
    valorAtual: "",
    owner: "",
    prazo: "",
  });
  const [dialogNovoResultadoOpen, setDialogNovoResultadoOpen] = useState(false);
  const [editandoObjetivo, setEditandoObjetivo] = useState(false);
  const [objetivoEditado, setObjetivoEditado] = useState({ titulo: "", descricao: "", prazo: "", perspectiva: "Financeira" });

  const [retroDialogOpen, setRetroDialogOpen] = useState(false);
  const [retroObjetivo, setRetroObjetivo] = useState<Objetivo | null>(null);
  const [retroForm, setRetroForm] = useState({ conquistas: "", falhas: "", aprendizados: "", ajustes: "", periodoInicio: "", periodoFim: "" });

  const { data: empresa } = useQuery<any>({
    queryKey: ["/api/empresa"],
  });

  const empresaId = empresa?.id;

  const { data: estrategias = [] } = useQuery<EstrategiaBasica[]>({
    queryKey: ["/api/estrategias", empresaId],
    enabled: !!empresaId,
  });

  const { data: iniciativas = [] } = useQuery<IniciativaBasica[]>({
    queryKey: ["/api/iniciativas", empresaId],
    enabled: !!empresaId,
  });

  const { jornadaConcluida } = useJornadaProgresso();
  const origemObrigatoria = !jornadaConcluida;

  const { data: objetivos = [], isLoading } = useQuery<Objetivo[]>({
    queryKey: ["/api/objetivos", empresaId],
    enabled: !!empresaId,
  });

  const { data: resultadosChave = [] } = useQuery<ResultadoChave[]>({
    queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`],
    enabled: !!objetivoSelecionado?.id,
  });

  const { data: membros = [] } = useQuery<Membro[]>({ queryKey: ["/api/membros"] });

  const [gerandoPerspectiva, setGerandoPerspectiva] = useState<string | null>(null);
  const [aiObjetivosOpen, setAiObjetivosOpen] = useState(false);
  const [aiObjetivosPerspectivaInicial, setAiObjetivosPerspectivaInicial] = useState<string | null>(null);
  const [aiResultadosOpen, setAiResultadosOpen] = useState(false);
  const [aiResultadosObjetivoId, setAiResultadosObjetivoId] = useState<string | null>(null);

  const gerarObjetivosMutation = useMutation({
    mutationFn: async (vars: { perspectiva?: string; params?: AIGenerationParams }) => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      const { perspectiva, params } = vars;
      return await apiRequest("POST", "/api/ai/gerar-objetivos", {
        empresaId,
        perspectiva,
        ...(params || {}),
      });
    },
    onSuccess: async (data, vars) => {
      const perspectiva = vars.perspectiva;
      if (data.objetivos && data.objetivos.length > 0) {
        const label = perspectiva ? `perspectiva ${perspectiva}` : "todas as perspectivas";
        toast({
          title: "Objetivo(s) Gerado(s)!",
          description: `${data.objetivos.length} objetivo(s) sugerido(s) pela IA para ${label}.`,
        });
        // Garante o vínculo da cascata mesmo se a IA não estampou.
        const origemId = vars.params?.origemId || null;
        const isIniciativa = !!origemId && iniciativas.some((i) => i.id === origemId);
        for (const obj of data.objetivos) {
          await criarObjetivoMutation.mutateAsync({
            empresaId,
            titulo: obj.titulo,
            descricao: obj.descricao,
            prazo: obj.prazo,
            perspectiva: obj.perspectiva || perspectiva || "Financeira",
            estrategiaId: obj.estrategiaId || (isIniciativa ? null : origemId),
            iniciativaId: obj.iniciativaId || (isIniciativa ? origemId : null),
          });
        }
      } else {
        toast({
          title: "Nenhum objetivo novo",
          description: "Todos os objetivos sugeridos já existem ou são muito similares.",
          variant: "destructive",
        });
      }
      setGerandoPerspectiva(null);
    },
    onError: () => {
      toast({
        title: "Erro ao gerar objetivos",
        description: "Não foi possível gerar objetivos com IA. Tente novamente.",
        variant: "destructive",
      });
      setGerandoPerspectiva(null);
    },
  });

  const handleAbrirModalObjetivos = (perspectivaInicial: string | null) => {
    setAiObjetivosPerspectivaInicial(perspectivaInicial);
    setAiObjetivosOpen(true);
  };

  const handleConfirmAIObjetivos = (params: AIGenerationParams) => {
    setAiObjetivosOpen(false);
    if (aiObjetivosPerspectivaInicial) {
      setGerandoPerspectiva(aiObjetivosPerspectivaInicial);
    }
    gerarObjetivosMutation.mutate({
      perspectiva: aiObjetivosPerspectivaInicial ?? undefined,
      params,
    });
  };

  const handleAbrirModalResultados = (objetivoId: string) => {
    setAiResultadosObjetivoId(objetivoId);
    setAiResultadosOpen(true);
  };

  const handleConfirmAIResultados = (params: AIGenerationParams) => {
    if (!aiResultadosObjetivoId) return;
    setAiResultadosOpen(false);
    gerarResultadosMutation.mutate({ objetivoId: aiResultadosObjetivoId, params });
  };

  const gerarResultadosMutation = useMutation({
    mutationFn: async (vars: { objetivoId: string; params?: AIGenerationParams }) => {
      const { objetivoId, params } = vars;
      return await apiRequest("POST", "/api/ai/gerar-resultados-chave", {
        objetivoId,
        ...(params || {}),
      });
    },
    onSuccess: async (data, vars) => {
      const objetivoId = vars.objetivoId;
      if (data.resultados && data.resultados.length > 0) {
        toast({
          title: "Métricas Geradas!",
          description: `${data.resultados.length} métrica(s) de progresso sugerida(s) pela IA.`,
        });
        for (const res of data.resultados) {
          await criarResultadoMutation.mutateAsync({
            objetivoId,
            metrica: res.metrica,
            valorInicial: res.valorInicial.toString(),
            valorAlvo: res.valorAlvo.toString(),
            valorAtual: res.valorAtual.toString(),
            owner: res.owner,
            prazo: res.prazo,
          });
        }
      } else {
        toast({
          title: "Nenhum resultado novo",
          description: "Todos os resultados sugeridos já existem ou são similares.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao gerar resultados",
        description: "Não foi possível gerar resultados-chave. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const criarRetroMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/retrospectivas", data),
    onSuccess: () => {
      setRetroDialogOpen(false);
      setRetroForm({ conquistas: "", falhas: "", aprendizados: "", ajustes: "", periodoInicio: "", periodoFim: "" });
      toast({ title: "Retrospectiva registrada!", description: "O aprendizado deste ciclo foi salvo." });
    },
    onError: () => toast({ title: "Erro ao salvar retrospectiva", variant: "destructive" }),
  });

  const criarObjetivoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/objetivos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
    },
  });

  const deletarObjetivoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/objetivos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
      toast({
        title: "Objetivo removido",
        description: "O objetivo foi removido com sucesso.",
      });
    },
  });

  const editarObjetivoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/objetivos/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/objetivos", empresaId] });
      setObjetivoSelecionado(prev => prev ? { ...prev, ...variables.data } : prev);
      setEditandoObjetivo(false);
      toast({
        title: "Objetivo atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
  });

  const criarResultadoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/resultados-chave", data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${vars.objetivoId}`] });
    },
  });

  const editarResultadoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/resultados-chave/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`] });
      toast({
        title: "Resultado atualizado",
        description: "As alterações foram salvas.",
      });
    },
  });

  const deletarResultadoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/resultados-chave/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resultados-chave/${objetivoSelecionado?.id}`] });
      toast({
        title: "Resultado removido",
        description: "A métrica foi removida.",
      });
    },
  });

  const handleCriarObjetivo = async () => {
    if (!novoObjetivo.titulo || !novoObjetivo.prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e prazo do objetivo.",
        variant: "destructive",
      });
      return;
    }

    if (origemObrigatoria && !novoObjetivo.iniciativaId && !novoObjetivo.estrategiaId) {
      toast({
        title: "Origem obrigatória",
        description: "Durante a 1ª jornada, escolha uma Iniciativa (preferencial) ou Estratégia que origina este objetivo. Você pode criar uma na página de Iniciativas.",
        variant: "destructive",
      });
      return;
    }

    try {
      await criarObjetivoMutation.mutateAsync({
        empresaId,
        ...novoObjetivo,
      });
    } catch (e) {
      toast({
        title: "Não foi possível criar o objetivo",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      return;
    }

    setNovoObjetivo({ titulo: "", descricao: "", prazo: "", perspectiva: "Financeira", responsavelId: "", estrategiaId: null, iniciativaId: null });
    setIsDialogOpen(false);
    toast({
      title: "Objetivo criado!",
      description: "Novo objetivo adicionado com sucesso.",
    });
  };

  const handleCriarResultado = async () => {
    if (!objetivoSelecionado) return;

    if (!novoResultado.metrica || !novoResultado.valorInicial || !novoResultado.valorAlvo || !novoResultado.owner || !novoResultado.prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos da métrica.",
        variant: "destructive",
      });
      return;
    }

    await criarResultadoMutation.mutateAsync({
      objetivoId: objetivoSelecionado.id,
      ...novoResultado,
    });

    setNovoResultado({
      metrica: "",
      valorInicial: "",
      valorAlvo: "",
      valorAtual: "",
      owner: "",
      prazo: "",
    });
    setDialogNovoResultadoOpen(false);
    toast({
      title: "Resultado-chave criado!",
      description: "Novo resultado adicionado ao objetivo.",
    });
  };

  const handleEditarResultado = async () => {
    if (!editandoResultado) return;

    await editarResultadoMutation.mutateAsync({
      id: editandoResultado.id,
      data: {
        metrica: editandoResultado.metrica,
        valorInicial: editandoResultado.valorInicial,
        valorAlvo: editandoResultado.valorAlvo,
        valorAtual: editandoResultado.valorAtual,
        owner: editandoResultado.owner,
        prazo: editandoResultado.prazo,
      },
    });

    setEditandoResultado(null);
  };

  const objetivosPorPerspectiva = (perspectiva: string) => {
    return objetivos.filter(obj => obj.perspectiva === perspectiva);
  };

  const iniciarEdicaoObjetivo = () => {
    if (objetivoSelecionado) {
      setObjetivoEditado({
        titulo: objetivoSelecionado.titulo,
        descricao: objetivoSelecionado.descricao || "",
        prazo: objetivoSelecionado.prazo,
        perspectiva: objetivoSelecionado.perspectiva,
      });
      setEditandoObjetivo(true);
    }
  };

  const salvarEdicaoObjetivo = async () => {
    if (!objetivoSelecionado) return;
    
    await editarObjetivoMutation.mutateAsync({
      id: objetivoSelecionado.id,
      data: objetivoEditado,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const semEstategias = empresa && estrategias.length === 0 && objetivos.length === 0;

  return (
    <div>
      {semEstategias && (
        <PrerequisiteWarning
          titulo="Recomendado: defina estratégias antes de criar suas metas"
          descricao="Suas metas ficam mais poderosas quando derivam das estratégias definidas. Complete as Estratégias primeiro para que seus objetivos estejam alinhados ao plano."
          linkLabel="Ir para Estratégias"
          linkHref="/estrategias"
          variante="info"
        />
      )}
      <PageHeader
        title="Metas e Resultados"
        description="Defina onde quer chegar e como vai medir o progresso. Cada objetivo tem métricas de acompanhamento com prazo definido."
        tooltip="Metas ambiciosas com prazo e progresso mensurável (0–100%). Diferente dos Indicadores, que monitoram a saúde contínua do negócio com status verde/amarelo/vermelho."
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => handleAbrirModalObjetivos(null)}
              disabled={gerarObjetivosMutation.isPending}
              variant="outline"
              data-testid="button-gerar-objetivos"
            >
              {gerarObjetivosMutation.isPending && !gerandoPerspectiva ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar para todas as áreas
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-okr">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Objetivo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Objetivo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="titulo">Título do Objetivo</Label>
                    <Input
                      id="titulo"
                      placeholder="Ex: Aumentar a rentabilidade do negócio"
                      value={novoObjetivo.titulo}
                      onChange={(e) => setNovoObjetivo({ ...novoObjetivo, titulo: e.target.value })}
                      data-testid="input-objetivo-titulo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Por que este objetivo é importante?"
                      value={novoObjetivo.descricao || ""}
                      onChange={(e) => setNovoObjetivo({ ...novoObjetivo, descricao: e.target.value })}
                      rows={3}
                      data-testid="input-objetivo-descricao"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prazo">Prazo</Label>
                    <Input
                      id="prazo"
                      placeholder="Ex: Q4 2025, Anual 2025"
                      value={novoObjetivo.prazo}
                      onChange={(e) => setNovoObjetivo({ ...novoObjetivo, prazo: e.target.value })}
                      data-testid="input-objetivo-prazo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="perspectiva">Área do Negócio</Label>
                    <Select
                      value={novoObjetivo.perspectiva}
                      onValueChange={(value) => setNovoObjetivo({ ...novoObjetivo, perspectiva: value })}
                    >
                      <SelectTrigger data-testid="select-perspectiva">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {perspectivas.map((p) => (
                          <SelectItem key={p.valor} value={p.valor}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {membros.length > 0 && (
                    <div>
                      <Label>Responsável</Label>
                      <Select
                        value={novoObjetivo.responsavelId || "__none__"}
                        onValueChange={(v) => setNovoObjetivo({ ...novoObjetivo, responsavelId: v === "__none__" ? "" : v })}
                      >
                        <SelectTrigger data-testid="select-responsavel-objetivo">
                          <SelectValue placeholder="Sem responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem responsável</SelectItem>
                          {membros.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <OrigemSelector
                    label="Iniciativa de origem"
                    obrigatorio={origemObrigatoria && !novoObjetivo.estrategiaId}
                    ajuda={origemObrigatoria ? "Durante a 1ª jornada, escolha uma Iniciativa (preferencial) ou Estratégia." : undefined}
                    opcoes={iniciativas.map(i => ({ id: i.id, label: i.titulo }))}
                    value={novoObjetivo.iniciativaId || ""}
                    onChange={(v) => setNovoObjetivo({ ...novoObjetivo, iniciativaId: v || null })}
                    testId="select-origem-iniciativa-objetivo"
                  />
                  {estrategias.length > 0 && (
                    <OrigemSelector
                      label="Estratégia relacionada"
                      obrigatorio={origemObrigatoria && !novoObjetivo.iniciativaId}
                      opcoes={estrategias.map(e => ({ id: e.id, label: `[${e.tipo}] ${e.titulo}` }))}
                      value={novoObjetivo.estrategiaId || ""}
                      onChange={(v) => setNovoObjetivo({ ...novoObjetivo, estrategiaId: v || null })}
                      testId="select-estrategia-objetivo"
                    />
                  )}
                  <Button
                    onClick={handleCriarObjetivo}
                    className="w-full"
                    disabled={criarObjetivoMutation.isPending}
                    data-testid="button-criar-objetivo"
                  >
                    {criarObjetivoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Criar Objetivo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Educational callout: Metas vs Indicadores */}
      <Card className="p-4 bg-muted/30" data-testid="card-educational-okr">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <TargetIcon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Metas — O que queremos conquistar (esta página)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Definem onde você quer chegar em um ciclo. Têm prazo e progresso de 0–100%.
              Clique em um objetivo para gerenciar suas métricas de progresso.
            </p>
          </div>
          <div className="hidden sm:flex items-center text-muted-foreground/40">
            <span className="text-lg font-light">vs</span>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Indicadores — Saúde contínua do negócio</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-8">
              Medem o que já está em operação com status verde/amarelo/vermelho. Sem prazo de encerramento — monitorados permanentemente.
            </p>
          </div>
        </div>
      </Card>

      {objetivos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <TargetIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Defina onde você quer chegar</h3>
            <p className="text-sm text-muted-foreground">
              Metas claras e mensuráveis traduzem a estratégia em ação. Cada objetivo é ambicioso e tem métricas concretas de progresso com prazo definido. A IA cria metas alinhadas às suas iniciativas e estratégias, garantindo execução focada e rastreável.
            </p>
            <Button
              onClick={() => handleAbrirModalObjetivos(null)}
              disabled={gerarObjetivosMutation.isPending}
              data-testid="button-gerar-objetivos-empty"
            >
              {gerarObjetivosMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar Objetivos com IA
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {perspectivas.map((perspectiva) => {
            const Icon = perspectiva.icon;
            const objs = objetivosPorPerspectiva(perspectiva.valor);
            
            return (
              <Card key={perspectiva.valor} className="p-6" data-testid={`card-perspectiva-${perspectiva.valor}`}>
                <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${perspectiva.cor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{perspectiva.label}</h3>
                      <p className="text-sm text-muted-foreground">{objs.length} objetivo(s)</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAbrirModalObjetivos(perspectiva.valor)}
                    disabled={gerarObjetivosMutation.isPending}
                    data-testid={`button-gerar-perspectiva-${perspectiva.valor}`}
                  >
                    {gerandoPerspectiva === perspectiva.valor ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Gerar com IA
                  </Button>
                </div>

                <div className="space-y-3">
                  {objs.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum objetivo nesta perspectiva
                    </div>
                  ) : (
                    objs.map((objetivo) => (
                      <ObjetivoCard
                        key={objetivo.id}
                        objetivo={objetivo}
                        membros={membros}
                        estrategias={estrategias}
                        iniciativas={iniciativas}
                        resultadosChave={resultadosChave}
                        jornadaConcluida={!!jornadaConcluida}
                        onSelect={(obj) => { setObjetivoSelecionado(obj); setDialogResultadosOpen(true); }}
                        onRetro={(obj) => { setRetroObjetivo(obj); setRetroDialogOpen(true); }}
                        onDelete={(id) => deletarObjetivoMutation.mutate(id)}
                      />
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Retrospectiva Dialog */}
      <Dialog open={retroDialogOpen} onOpenChange={setRetroDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Retrospectiva do Ciclo
            </DialogTitle>
          </DialogHeader>
          {retroObjetivo && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Objetivo: <span className="font-medium text-foreground">{retroObjetivo.titulo}</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Início do Ciclo</Label>
                  <Input type="date" value={retroForm.periodoInicio} onChange={e => setRetroForm(f => ({ ...f, periodoInicio: e.target.value }))} data-testid="input-retro-inicio" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim do Ciclo</Label>
                  <Input type="date" value={retroForm.periodoFim} onChange={e => setRetroForm(f => ({ ...f, periodoFim: e.target.value }))} data-testid="input-retro-fim" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-green-700 dark:text-green-400">O que conquistamos?</Label>
                <Textarea value={retroForm.conquistas} onChange={e => setRetroForm(f => ({ ...f, conquistas: e.target.value }))} placeholder="Principais vitórias e resultados alcançados..." rows={2} data-testid="textarea-retro-conquistas" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-red-700 dark:text-red-400">O que não funcionou?</Label>
                <Textarea value={retroForm.falhas} onChange={e => setRetroForm(f => ({ ...f, falhas: e.target.value }))} placeholder="Obstáculos, erros e o que ficou para trás..." rows={2} data-testid="textarea-retro-falhas" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-blue-700 dark:text-blue-400">O que aprendemos?</Label>
                <Textarea value={retroForm.aprendizados} onChange={e => setRetroForm(f => ({ ...f, aprendizados: e.target.value }))} placeholder="Insights e lições para os próximos ciclos..." rows={2} data-testid="textarea-retro-aprendizados" />
              </div>
              <div className="space-y-1.5">
                <Label>Ajustes para o próximo ciclo</Label>
                <Textarea value={retroForm.ajustes} onChange={e => setRetroForm(f => ({ ...f, ajustes: e.target.value }))} placeholder="O que mudamos na estratégia ou nas metas?" rows={2} data-testid="textarea-retro-ajustes" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setRetroDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => criarRetroMutation.mutate({ objetivoId: retroObjetivo.id, ...retroForm })}
                  disabled={criarRetroMutation.isPending || (!retroForm.conquistas && !retroForm.falhas && !retroForm.aprendizados)}
                  data-testid="button-salvar-retro"
                >
                  {criarRetroMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Registrar Retrospectiva
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogResultadosOpen} onOpenChange={(open) => {
        setDialogResultadosOpen(open);
        if (!open) {
          setEditandoObjetivo(false);
          setObjetivoEditado({ titulo: "", descricao: "", prazo: "", perspectiva: "Financeira" });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoObjetivo ? "Editar Objetivo" : objetivoSelecionado?.titulo}
            </DialogTitle>
          </DialogHeader>
          {objetivoSelecionado && (
            <div className="space-y-6 py-4">
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Detalhes do Objetivo</h4>
                  {!editandoObjetivo ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={iniciarEdicaoObjetivo}
                      data-testid="button-editar-objetivo"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditandoObjetivo(false)}
                        data-testid="button-cancelar-objetivo"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={salvarEdicaoObjetivo}
                        disabled={editarObjetivoMutation.isPending}
                        data-testid="button-salvar-objetivo"
                      >
                        {editarObjetivoMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>
                
                {editandoObjetivo ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={objetivoEditado.titulo}
                        onChange={(e) => setObjetivoEditado({ ...objetivoEditado, titulo: e.target.value })}
                        placeholder="Título do objetivo"
                        data-testid="input-editar-titulo"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={objetivoEditado.descricao}
                        onChange={(e) => setObjetivoEditado({ ...objetivoEditado, descricao: e.target.value })}
                        placeholder="Descrição do objetivo (opcional)"
                        rows={3}
                        data-testid="input-editar-descricao"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prazo</Label>
                        <Input
                          value={objetivoEditado.prazo}
                          onChange={(e) => setObjetivoEditado({ ...objetivoEditado, prazo: e.target.value })}
                          placeholder="Ex: Q4 2025"
                          data-testid="input-editar-prazo"
                        />
                      </div>
                      <div>
                        <Label>Área do Negócio</Label>
                        <Select
                          value={objetivoEditado.perspectiva}
                          onValueChange={(value) => setObjetivoEditado({ ...objetivoEditado, perspectiva: value })}
                        >
                          <SelectTrigger data-testid="select-editar-perspectiva">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {perspectivas.map((p) => (
                              <SelectItem key={p.valor} value={p.valor}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Título:</p>
                      <p className="text-sm text-muted-foreground">{objetivoSelecionado.titulo}</p>
                    </div>
                    {objetivoSelecionado.descricao && (
                      <div>
                        <p className="text-sm font-medium">Descrição:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.descricao}</p>
                      </div>
                    )}
                    <div className="flex gap-6">
                      <div>
                        <p className="text-sm font-medium">Prazo:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.prazo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Perspectiva:</p>
                        <p className="text-sm text-muted-foreground">{objetivoSelecionado.perspectiva}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Métricas de Progresso</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirModalResultados(objetivoSelecionado.id)}
                    disabled={gerarResultadosMutation.isPending}
                    data-testid={`button-gerar-resultados-${objetivoSelecionado.id}`}
                  >
                    {gerarResultadosMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Gerar com IA
                  </Button>
                  <Dialog open={dialogNovoResultadoOpen} onOpenChange={setDialogNovoResultadoOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid={`button-add-resultado-${objetivoSelecionado.id}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Métrica de Progresso</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Métrica</Label>
                          <Input
                            placeholder="Ex: Taxa de conversão"
                            value={novoResultado.metrica}
                            onChange={(e) => setNovoResultado({ ...novoResultado, metrica: e.target.value })}
                            data-testid="input-resultado-metrica"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Valor Inicial</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={novoResultado.valorInicial}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorInicial: e.target.value })}
                              data-testid="input-resultado-inicial"
                            />
                          </div>
                          <div>
                            <Label>Valor Atual</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={novoResultado.valorAtual}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorAtual: e.target.value })}
                              data-testid="input-resultado-atual"
                            />
                          </div>
                          <div>
                            <Label>Valor Alvo</Label>
                            <Input
                              type="number"
                              placeholder="100"
                              value={novoResultado.valorAlvo}
                              onChange={(e) => setNovoResultado({ ...novoResultado, valorAlvo: e.target.value })}
                              data-testid="input-resultado-alvo"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Responsável</Label>
                            <Input
                              placeholder="Nome do responsável"
                              value={novoResultado.owner}
                              onChange={(e) => setNovoResultado({ ...novoResultado, owner: e.target.value })}
                              data-testid="input-resultado-owner"
                            />
                          </div>
                          <div>
                            <Label>Prazo</Label>
                            <Input
                              placeholder="Ex: Q4 2025"
                              value={novoResultado.prazo}
                              onChange={(e) => setNovoResultado({ ...novoResultado, prazo: e.target.value })}
                              data-testid="input-resultado-prazo"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleCriarResultado}
                          className="w-full"
                          disabled={criarResultadoMutation.isPending}
                          data-testid="button-criar-resultado"
                        >
                          {criarResultadoMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Criar Métrica
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {resultadosChave.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma métrica de progresso definida ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {resultadosChave.map((resultado) => (
                    <ResultadoChaveCard
                      key={resultado.id}
                      resultado={resultado}
                      isEditing={editandoResultado?.id === resultado.id}
                      editingData={editandoResultado}
                      onStartEdit={setEditandoResultado}
                      onChangeEdit={setEditandoResultado}
                      onSave={handleEditarResultado}
                      onCancelEdit={() => setEditandoResultado(null)}
                      onDelete={(id) => deletarResultadoMutation.mutate(id)}
                      isSaving={editarResultadoMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AIGenerationModal
        open={aiObjetivosOpen}
        onOpenChange={setAiObjetivosOpen}
        onConfirm={handleConfirmAIObjetivos}
        title={
          aiObjetivosPerspectivaInicial
            ? `Gerar objetivos com IA — ${aiObjetivosPerspectivaInicial}`
            : "Gerar objetivos com IA"
        }
        description="Configure quantas perspectivas e quantos objetivos por perspectiva a IA deve gerar."
        isGenerating={gerarObjetivosMutation.isPending}
        testIdPrefix="ai-objetivos"
        origem={{
          label: "Origem do objetivo",
          description: origemObrigatoria
            ? "Escolha de qual Iniciativa ou Estratégia derivar os objetivos. Obrigatório durante a primeira jornada."
            : "Opcional: vincule os objetivos a uma Iniciativa ou Estratégia para manter a cascata.",
          placeholder: "Selecione uma origem…",
          required: origemObrigatoria,
          items: [
            ...iniciativas.map((i) => ({ id: i.id, label: i.titulo, group: "Iniciativa" })),
            ...estrategias.map((e) => ({ id: e.id, label: e.titulo, group: `Estratégia · ${e.tipo}` })),
          ],
          emptyMessage: "Nenhuma Iniciativa ou Estratégia cadastrada. Crie uma antes de gerar objetivos.",
        }}
        quantidade={{
          label: "Por perspectiva",
          default: 1,
          min: 1,
          max: 3,
          suffixSingular: "objetivo",
          suffixPlural: "objetivos",
        }}
        foco={{
          label: "Perspectivas do BSC",
          description: "Selecione as perspectivas para as quais a IA deve criar objetivos.",
          items: perspectivas.map((p) => ({ value: p.valor, label: p.label })),
          defaultSelected: aiObjetivosPerspectivaInicial
            ? [aiObjetivosPerspectivaInicial]
            : perspectivas.map((p) => p.valor),
        }}
        fontesContexto={{
          label: "Fontes de contexto",
          items: [
            { id: "estrategias", label: "Estratégias TOWS", desc: "Apostas estratégicas já definidas" },
            { id: "oportunidades", label: "Oportunidades de Crescimento", desc: "Quadrantes da Matriz de Ansoff" },
            { id: "iniciativas", label: "Iniciativas", desc: "Iniciativas prioritárias" },
            { id: "modeloNegocio", label: "Modelo de Negócio (BMC)", desc: "Proposta de valor, segmentos e atividades" },
          ],
        }}
        instrucaoAdicional={{
          placeholder: "Ex: Foque em objetivos relacionados à expansão digital e fidelização.",
        }}
      />

      <AIGenerationModal
        open={aiResultadosOpen}
        onOpenChange={setAiResultadosOpen}
        onConfirm={handleConfirmAIResultados}
        title="Gerar métricas de progresso com IA"
        description="Configure quantas métricas a IA deve gerar para este objetivo."
        isGenerating={gerarResultadosMutation.isPending}
        testIdPrefix="ai-resultados-chave"
        origemId={aiResultadosObjetivoId ?? undefined}
        quantidade={{
          label: "Quantidade",
          default: 3,
          min: 1,
          max: 5,
          suffixSingular: "métrica",
          suffixPlural: "métricas",
        }}
        foco={{
          label: "Tipo de métrica",
          description: "Opcional. Filtre por tipo de métrica. Sem seleção, a IA equilibra os tipos.",
          requireAtLeastOne: false,
          items: [
            { value: "financeira", label: "Financeira", desc: "Receita, margem, custo, ROI" },
            { value: "operacional", label: "Operacional", desc: "Volumes, produtividade, capacidade" },
            { value: "satisfacao", label: "Satisfação", desc: "NPS, CSAT, retenção, churn" },
            { value: "processo", label: "Processo / Qualidade", desc: "SLA, defeitos, conformidade" },
          ],
          defaultSelected: [],
        }}
        instrucaoAdicional={{
          placeholder: "Ex: Priorize métricas com fontes de dados já disponíveis.",
        }}
      />
    </div>
  );
}

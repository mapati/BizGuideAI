import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  FileText,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  ShieldAlert,
  Brain,
  Save,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUsuario {
  id: string;
  nome: string;
  email: string;
  empresaId: string | null;
  empresaNome: string;
  planoStatus: string;
  diasRestantes: number | null;
  isAdmin: boolean;
  role: string;
  createdAt: string;
}

interface AdminEmpresa {
  id: string;
  nome: string;
  setor: string;
  tamanho: string;
  planoStatus: string;
  diasRestantes: number | null;
  totalUsuarios: number;
  trialStartedAt: string | null;
  planoAtivadoEm: string | null;
  createdAt: string;
}

interface AdminFatura {
  id: string;
  empresaId: string;
  valor: string;
  descricao: string;
  status: string;
  dataVencimento: string;
  dataPagamento: string | null;
  createdAt: string;
  empresa?: { id: string; nome: string } | null;
}

type FiltroUsuario = "todos" | "trial" | "expirado" | "ativo" | "suspenso";

const statusBadge = (status: string, diasRestantes?: number | null) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    trial: { label: diasRestantes != null ? `Trial — ${diasRestantes}d restante${diasRestantes !== 1 ? "s" : ""}` : "Trial", variant: "secondary" },
    expirado: { label: "Trial Vencido", variant: "destructive" },
    ativo: { label: "Ativo", variant: "default" },
    suspenso: { label: "Suspenso", variant: "destructive" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={cfg.variant} data-testid={`badge-status-${status}`}>{cfg.label}</Badge>;
};

const faturaStatusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pendente: { label: "Pendente", variant: "secondary" },
    pago: { label: "Pago", variant: "default" },
    cancelado: { label: "Cancelado", variant: "destructive" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

function NovaFaturaDialog({
  open,
  onClose,
  empresas,
}: {
  open: boolean;
  onClose: () => void;
  empresas: AdminEmpresa[];
}) {
  const { toast } = useToast();
  const [empresaId, setEmpresaId] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  const criarFatura = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/faturas", {
        empresaId,
        valor,
        descricao,
        status: "pendente",
        dataVencimento: new Date(dataVencimento).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faturas"] });
      toast({ title: "Fatura criada com sucesso" });
      onClose();
      setEmpresaId("");
      setValor("");
      setDescricao("");
      setDataVencimento("");
    },
    onError: (error: Error) => toast({ title: "Erro ao criar fatura", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger data-testid="select-empresa-fatura">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={e => setValor(e.target.value)}
              data-testid="input-valor-fatura"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Assinatura mensal — BizGuideAI Pro"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              data-testid="input-descricao-fatura"
            />
          </div>
          <div>
            <Label>Data de Vencimento</Label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={e => setDataVencimento(e.target.value)}
              data-testid="input-vencimento-fatura"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancelar-fatura">
            Cancelar
          </Button>
          <Button
            onClick={() => criarFatura.mutate()}
            disabled={!empresaId || !valor || !descricao || !dataVencimento || criarFatura.isPending}
            data-testid="button-salvar-fatura"
          >
            {criarFatura.isPending ? "Criando..." : "Criar Fatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TabEmpresas({ empresas, isLoading }: { empresas: AdminEmpresa[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [filtro, setFiltro] = useState<FiltroUsuario>("todos");

  const ativarPlano = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/empresas/${id}/ativar-plano`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/empresas"] });
      toast({ title: "Plano ativado para a empresa" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const suspender = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/empresas/${id}/suspender`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/empresas"] });
      toast({ title: "Empresa suspensa" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const filtradas = empresas.filter(e => {
    if (filtro === "todos") return true;
    if (filtro === "trial") return e.planoStatus === "trial";
    if (filtro === "expirado") return e.planoStatus === "expirado";
    if (filtro === "ativo") return e.planoStatus === "ativo";
    if (filtro === "suspenso") return e.planoStatus === "suspenso";
    return true;
  });

  const filtros: { key: FiltroUsuario; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "trial", label: "Em Trial" },
    { key: "expirado", label: "Trial Vencido" },
    { key: "ativo", label: "Plano Ativo" },
    { key: "suspenso", label: "Suspenso" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" data-testid="filtros-empresas">
        {filtros.map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={filtro === f.key ? "default" : "outline"}
            onClick={() => setFiltro(f.key)}
            data-testid={`filtro-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Carregando empresas...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Nenhuma empresa encontrada.</div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(e => (
            <div
              key={e.id}
              className="flex flex-wrap items-center gap-3 p-4 rounded-md border bg-card"
              data-testid={`row-empresa-${e.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" data-testid={`text-nome-empresa-${e.id}`}>
                  {e.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.setor} · {e.tamanho}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.totalUsuarios} usuário{e.totalUsuarios !== 1 ? "s" : ""}
                  <span className="mx-1.5 opacity-50">·</span>
                  Desde {format(new Date(e.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(e.planoStatus, e.diasRestantes)}
                {e.planoStatus !== "ativo" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => ativarPlano.mutate(e.id)}
                    disabled={ativarPlano.isPending}
                    data-testid={`button-ativar-${e.id}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Ativar Plano
                  </Button>
                )}
                {e.planoStatus !== "suspenso" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => suspender.mutate(e.id)}
                    disabled={suspender.isPending}
                    data-testid={`button-suspender-${e.id}`}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Suspender
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabFaturas({
  faturas,
  isLoading,
  empresas,
}: {
  faturas: AdminFatura[];
  isLoading: boolean;
  empresas: AdminEmpresa[];
}) {
  const { toast } = useToast();
  const [novaFaturaOpen, setNovaFaturaOpen] = useState(false);

  const marcarPago = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/admin/faturas/${id}`, {
        status: "pago",
        dataPagamento: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faturas"] });
      toast({ title: "Fatura marcada como paga" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const cancelar = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/admin/faturas/${id}`, { status: "cancelado" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faturas"] });
      toast({ title: "Fatura cancelada" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setNovaFaturaOpen(true)} data-testid="button-nova-fatura">
          <Plus className="h-4 w-4 mr-2" />
          Nova Fatura
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Carregando faturas...</div>
      ) : faturas.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Nenhuma fatura encontrada.</div>
      ) : (
        <div className="space-y-2">
          {faturas.map(f => (
            <div
              key={f.id}
              className="flex flex-wrap items-center gap-3 p-4 rounded-md border bg-card"
              data-testid={`row-fatura-${f.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{f.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {f.empresa?.nome ?? "Empresa desconhecida"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vencimento:{" "}
                  {format(new Date(f.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}
                  {f.dataPagamento && (
                    <> · Pago em {format(new Date(f.dataPagamento), "dd/MM/yyyy", { locale: ptBR })}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  R$ {parseFloat(f.valor).toFixed(2).replace(".", ",")}
                </span>
                {faturaStatusBadge(f.status)}
                {f.status === "pendente" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marcarPago.mutate(f.id)}
                      disabled={marcarPago.isPending}
                      data-testid={`button-pagar-${f.id}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Marcar como Pago
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelar.mutate(f.id)}
                      disabled={cancelar.isPending}
                      data-testid={`button-cancelar-fatura-${f.id}`}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <NovaFaturaDialog
        open={novaFaturaOpen}
        onClose={() => setNovaFaturaOpen(false)}
        empresas={empresas}
      />
    </div>
  );
}

function TabResumo({ empresas, faturas }: { empresas: AdminEmpresa[]; faturas: AdminFatura[] }) {
  const total = empresas.length;
  const emTrial = empresas.filter(e => e.planoStatus === "trial").length;
  const trialVencido = empresas.filter(e => e.planoStatus === "expirado").length;
  const ativos = empresas.filter(e => e.planoStatus === "ativo").length;
  const suspensos = empresas.filter(e => e.planoStatus === "suspenso").length;

  const totalFaturas = faturas.length;
  const pendentes = faturas.filter(f => f.status === "pendente").length;
  const pagos = faturas.filter(f => f.status === "pago").length;
  const receitaTotal = faturas
    .filter(f => f.status === "pago")
    .reduce((acc, f) => acc + parseFloat(f.valor), 0);

  const stats = [
    { label: "Empresas Cadastradas", value: total, icon: Users, color: "text-primary" },
    { label: "Em Trial", value: emTrial, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
    { label: "Trial Vencido", value: trialVencido, icon: AlertTriangle, color: "text-destructive" },
    { label: "Plano Ativo", value: ativos, icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
    { label: "Suspensas", value: suspensos, icon: XCircle, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Usuários
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label} data-testid={`card-stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
                <CardContent className="p-4">
                  <Icon className={`h-5 w-5 mb-2 ${s.color}`} />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Faturas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <FileText className="h-5 w-5 mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalFaturas}</p>
              <p className="text-xs text-muted-foreground">Total de Faturas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Clock className="h-5 w-5 mb-2 text-yellow-600 dark:text-yellow-400" />
              <p className="text-2xl font-bold">{pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <CheckCircle2 className="h-5 w-5 mb-2 text-green-600 dark:text-green-400" />
              <p className="text-2xl font-bold">{pagos}</p>
              <p className="text-xs text-muted-foreground">Pagas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <LayoutDashboard className="h-5 w-5 mb-2 text-primary" />
              <p className="text-2xl font-bold">
                R$ {receitaTotal.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground">Receita Total</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface ConfigIA {
  modeloPadrao: string;
  modeloRelatorios: string;
  modeloBusca: string;
}

const OPCOES_PADRAO = [
  { value: "gpt-4.1-mini",     label: "GPT-4.1 Mini",     desc: "Mais rápido · Econômico · Recomendado" },
  { value: "gpt-4o-mini",      label: "GPT-4o Mini",       desc: "Legado OpenAI" },
  { value: "gpt-4.1",          label: "GPT-4.1",           desc: "Alta qualidade" },
  { value: "gpt-4o",           label: "GPT-4o",            desc: "Alta qualidade · Legado" },
];

const OPCOES_RELATORIOS = [
  { value: "gpt-4.1",          label: "GPT-4.1",           desc: "Alta qualidade · Recomendado" },
  { value: "gpt-4o",           label: "GPT-4o",            desc: "Alta qualidade · Legado" },
  { value: "gpt-4.1-mini",     label: "GPT-4.1 Mini",      desc: "Rápido · Econômico" },
  { value: "gpt-4o-mini",      label: "GPT-4o Mini",       desc: "Econômico · Legado" },
];

const OPCOES_BUSCA = [
  { value: "gpt-4o-mini-search-preview", label: "GPT-4o Mini Search Preview", desc: "Web Search · Recomendado" },
  { value: "gpt-4o-search-preview",      label: "GPT-4o Search Preview",      desc: "Web Search · Mais poderoso" },
];

function ModelSelector({
  label,
  description,
  value,
  onChange,
  opcoes,
  testId,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  opcoes: { value: string; label: string; desc: string }[];
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger data-testid={testId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map(o => (
              <SelectItem key={o.value} value={o.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          <span>Modelo atual: <code className="font-mono bg-muted px-1 rounded">{value}</code></span>
        </div>
      </CardContent>
    </Card>
  );
}

function TabConfigIA() {
  const { toast } = useToast();
  const { data: config, isLoading } = useQuery<ConfigIA>({
    queryKey: ["/api/admin/config-ia"],
  });

  const [modeloPadrao,     setModeloPadrao]     = useState("gpt-4.1-mini");
  const [modeloRelatorios, setModeloRelatorios] = useState("gpt-4.1");
  const [modeloBusca,      setModeloBusca]      = useState("gpt-4o-mini-search-preview");

  useEffect(() => {
    if (config) {
      setModeloPadrao(config.modeloPadrao);
      setModeloRelatorios(config.modeloRelatorios);
      setModeloBusca(config.modeloBusca);
    }
  }, [config]);

  const salvar = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/admin/config-ia", { modeloPadrao, modeloRelatorios, modeloBusca }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config-ia"] });
      toast({ title: "Configuração salva", description: "Os modelos de IA foram atualizados com sucesso." });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-3 p-4 rounded-md border bg-muted/40">
        <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Modelos de Linguagem (LLM)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Escolha qual modelo OpenAI será usado em cada tipo de chamada. A mudança entra em vigor imediatamente e persiste entre reinicializações.
          </p>
        </div>
      </div>

      <ModelSelector
        label="Modelo Padrão — Jornada Estratégica"
        description="Usado nos ~25 passos da jornada guiada (diagnóstico, SWOT, OKRs, estratégias, metas, etc.)."
        value={modeloPadrao}
        onChange={setModeloPadrao}
        opcoes={OPCOES_PADRAO}
        testId="select-modelo-padrao"
      />

      <ModelSelector
        label="Modelo de Relatórios — Análises Complexas"
        description="Usado na geração de relatórios executivos, planos completos e sínteses estratégicas (~6 chamadas)."
        value={modeloRelatorios}
        onChange={setModeloRelatorios}
        opcoes={OPCOES_RELATORIOS}
        testId="select-modelo-relatorios"
      />

      <ModelSelector
        label="Modelo de Busca Web — Cenário Externo e Mercado"
        description="Usado nas etapas que consultam a internet para análise de mercado, concorrência e tendências."
        value={modeloBusca}
        onChange={setModeloBusca}
        opcoes={OPCOES_BUSCA}
        testId="select-modelo-busca"
      />

      <div className="flex justify-end">
        <Button
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending}
          data-testid="button-salvar-config-ia"
        >
          <Save className="h-4 w-4 mr-2" />
          {salvar.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">Acesso Negado</h1>
        <p className="text-muted-foreground text-center">
          Esta área é restrita a administradores do sistema.
        </p>
        <Button onClick={() => navigate("/")} data-testid="button-voltar-home">
          Voltar ao início
        </Button>
      </div>
    );
  }

  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery<AdminEmpresa[]>({
    queryKey: ["/api/admin/empresas"],
  });

  const { data: faturas = [], isLoading: loadingFaturas } = useQuery<AdminFatura[]>({
    queryKey: ["/api/admin/faturas"],
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-admin-titulo">Painel de Administração</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie empresas, faturas e acompanhe métricas do sistema.
        </p>
      </div>

      <Tabs defaultValue="resumo" data-testid="tabs-admin">
        <TabsList data-testid="tablist-admin">
          <TabsTrigger value="resumo" data-testid="tab-resumo">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="empresas" data-testid="tab-empresas">
            <Users className="h-4 w-4 mr-2" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="faturas" data-testid="tab-faturas">
            <FileText className="h-4 w-4 mr-2" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="config-ia" data-testid="tab-config-ia">
            <Brain className="h-4 w-4 mr-2" />
            Modelos IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <TabResumo empresas={empresas} faturas={faturas} />
        </TabsContent>

        <TabsContent value="empresas" className="mt-4">
          <TabEmpresas empresas={empresas} isLoading={loadingEmpresas} />
        </TabsContent>

        <TabsContent value="faturas" className="mt-4">
          <TabFaturas faturas={faturas} isLoading={loadingFaturas} empresas={empresas} />
        </TabsContent>

        <TabsContent value="config-ia" className="mt-4">
          <TabConfigIA />
        </TabsContent>
      </Tabs>
    </div>
  );
}

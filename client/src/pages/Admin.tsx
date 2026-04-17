import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
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
  DialogDescription,
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
  Trash2,
  RefreshCw,
  BookOpen,
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
  planoTipo: string | null;
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
type FiltroPlano = "todos" | "start" | "pro" | "enterprise";

const PLANO_PRECOS: Record<string, number> = { start: 187, pro: 490 };
const PLANO_LIMITE: Record<string, string> = { start: "1", pro: "∞", enterprise: "∞" };
const PLANO_LABELS: Record<string, string> = { start: "Start", pro: "Pro", enterprise: "Enterprise" };

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

const planoBadge = (planoTipo: string | null) => {
  if (!planoTipo) return null;
  const configs: Record<string, { label: string; className: string }> = {
    start: { label: "Start", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    pro: { label: "Pro", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
    enterprise: { label: "Enterprise", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  };
  const cfg = configs[planoTipo] ?? { label: planoTipo, className: "" };
  return <Badge variant="outline" className={cfg.className} data-testid={`badge-plano-${planoTipo}`}>{cfg.label}</Badge>;
};

const planoColunaBadge = (planoStatus: string, planoTipo: string | null, diasRestantes?: number | null) => {
  if (planoStatus === "ativo" && planoTipo) {
    return planoBadge(planoTipo);
  }
  const configs: Record<string, { label: string; className: string }> = {
    trial: {
      label: diasRestantes != null ? `Trial — ${diasRestantes}d` : "Trial",
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    },
    expirado: {
      label: "Expirado",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    },
    suspenso: {
      label: "Suspenso",
      className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    },
  };
  const cfg = configs[planoStatus] ?? { label: planoStatus, className: "" };
  return <Badge variant="outline" className={cfg.className} data-testid={`badge-plano-col-${planoStatus}`}>{cfg.label}</Badge>;
};

const PLANO_VALOR_DEFAULT: Record<string, string> = { start: "187.00", pro: "490.00", enterprise: "" };

function AtivarPlanoDialog({
  empresa,
  open,
  onClose,
}: {
  empresa: AdminEmpresa | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [planoTipo, setPlanoTipo] = useState<"start" | "pro" | "enterprise">("start");
  const [valorMensal, setValorMensal] = useState("187.00");
  const [dataVencimento, setDataVencimento] = useState("");

  const isAlteracao = empresa?.planoStatus === "ativo";

  useEffect(() => {
    if (open && empresa) {
      const tipo = (empresa.planoTipo as "start" | "pro" | "enterprise" | null) ?? "start";
      setPlanoTipo(tipo);
      setValorMensal(PLANO_VALOR_DEFAULT[tipo] ?? "");
      setDataVencimento("");
    }
  }, [open, empresa]);

  useEffect(() => {
    setValorMensal(PLANO_VALOR_DEFAULT[planoTipo] ?? "");
  }, [planoTipo]);

  const ativar = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/admin/empresas/${empresa!.id}/ativar-plano`, { planoTipo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/empresas"] });
      toast({ title: isAlteracao ? `Plano alterado para ${PLANO_LABELS[planoTipo]}` : `Plano ${PLANO_LABELS[planoTipo]} ativado` });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const descPlano: Record<string, string> = {
    start: "1 usuário · IA custo-benefício",
    pro: "Usuários ilimitados · IA premium",
    enterprise: "Infraestrutura dedicada · Segurança máxima",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAlteracao ? "Alterar Plano" : "Ativar Plano"} — {empresa?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de Plano</Label>
            <Select value={planoTipo} onValueChange={v => setPlanoTipo(v as typeof planoTipo)}>
              <SelectTrigger data-testid="select-tipo-plano">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Start — R$ 187/mês (1 usuário)</SelectItem>
                <SelectItem value="pro">Pro — R$ 490/mês (usuários ilimitados)</SelectItem>
                <SelectItem value="enterprise">Enterprise — Sob consulta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor Mensal (R$) — referência</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={planoTipo === "enterprise" ? "Sob consulta" : "0,00"}
              value={valorMensal}
              onChange={e => setValorMensal(e.target.value)}
              data-testid="input-valor-mensal-plano"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {descPlano[planoTipo]} · Emita uma Fatura para registrar a cobrança financeira
            </p>
          </div>
          <div>
            <Label>Data de Vencimento (opcional, referência)</Label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={e => setDataVencimento(e.target.value)}
              data-testid="input-vencimento-plano"
            />
            <p className="text-xs text-muted-foreground mt-1">Campo informativo — controle o vencimento via Faturas</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancelar-ativar-plano">Cancelar</Button>
          <Button
            onClick={() => ativar.mutate()}
            disabled={ativar.isPending}
            data-testid="button-confirmar-ativar-plano"
          >
            {ativar.isPending ? "Salvando..." : `${isAlteracao ? "Alterar para" : "Ativar"} ${PLANO_LABELS[planoTipo]}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  useEffect(() => {
    if (!empresaId) return;
    const emp = empresas.find(e => e.id === empresaId);
    if (emp?.planoStatus === "ativo" && emp.planoTipo) {
      const preco = PLANO_PRECOS[emp.planoTipo];
      if (preco) {
        setValor(preco.toFixed(2));
        const mesAno = format(new Date(), "MMMM/yyyy", { locale: ptBR });
        setDescricao(`Plano ${PLANO_LABELS[emp.planoTipo]} — ${mesAno}`);
      } else if (emp.planoTipo === "enterprise") {
        setDescricao(`Plano Enterprise — ${format(new Date(), "MMMM/yyyy", { locale: ptBR })}`);
      }
    }
  }, [empresaId, empresas]);

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

function ConfirmarDeleteEmpresaDialog({
  empresa,
  open,
  onClose,
}: {
  empresa: AdminEmpresa | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [confirmacaoNome, setConfirmacaoNome] = useState("");

  const deletar = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/empresas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/empresas"] });
      toast({ title: "Empresa excluída", description: "A empresa e todos os seus dados foram removidos permanentemente." });
      setConfirmacaoNome("");
      onClose();
    },
    onError: (error: Error) => toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setConfirmacaoNome("");
    onClose();
  };

  const nomeCorreto = confirmacaoNome.trim().toLowerCase() === empresa?.nome.trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent data-testid="dialog-confirmar-delete-empresa">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir empresa permanentemente
          </DialogTitle>
          <DialogDescription>
            Esta ação é <strong>irreversível</strong>. Todos os dados serão apagados definitivamente,
            incluindo usuários, análises PESTEL, SWOT, OKRs, KPIs, plano estratégico e todos os registros associados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <strong>Empresa:</strong> {empresa?.nome}
          </div>
          <div className="space-y-2">
            <Label htmlFor="input-confirmacao-nome">
              Para confirmar, digite o nome da empresa exatamente como aparece acima:
            </Label>
            <Input
              id="input-confirmacao-nome"
              data-testid="input-confirmacao-delete-empresa"
              value={confirmacaoNome}
              onChange={(e) => setConfirmacaoNome(e.target.value)}
              placeholder={empresa?.nome}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancelar-delete-empresa">
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!nomeCorreto || deletar.isPending}
            onClick={() => empresa && deletar.mutate(empresa.id)}
            data-testid="button-confirmar-delete-empresa"
          >
            {deletar.isPending ? (
              "Excluindo..."
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1.5" />
                Excluir permanentemente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TabEmpresas({ empresas, isLoading }: { empresas: AdminEmpresa[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [filtro, setFiltro] = useState<FiltroUsuario>("todos");
  const [filtroPlan, setFiltroPlan] = useState<FiltroPlano>("todos");
  const [empresaSelecionada, setEmpresaSelecionada] = useState<AdminEmpresa | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteEmpresa, setDeleteEmpresa] = useState<AdminEmpresa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const suspender = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/empresas/${id}/suspender`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/empresas"] });
      toast({ title: "Empresa suspensa" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const sincronizarMp = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/admin/empresas/${id}/sincronizar-mp`) as Promise<{
        success: boolean;
        mpStatus: string | null;
        planoStatus: string;
      }>,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/empresas"] });
      if (data.planoStatus === "ativo") {
        toast({ title: "Plano ativado", description: "A assinatura foi confirmada no Mercado Pago." });
      } else {
        toast({
          title: "Ainda pendente no Mercado Pago",
          description: `Status atual: ${data.mpStatus ?? "desconhecido"}. Tente novamente em alguns minutos.`,
        });
      }
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const filtradas = empresas.filter(e => {
    if (filtro !== "todos" && e.planoStatus !== filtro) return false;
    if (filtroPlan !== "todos" && e.planoTipo !== filtroPlan) return false;
    return true;
  });

  const filtrosStatus: { key: FiltroUsuario; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "trial", label: "Em Trial" },
    { key: "expirado", label: "Trial Vencido" },
    { key: "ativo", label: "Plano Ativo" },
    { key: "suspenso", label: "Suspenso" },
  ];

  const filtrosPlano: { key: FiltroPlano; label: string }[] = [
    { key: "todos", label: "Todos os Planos" },
    { key: "start", label: "Start" },
    { key: "pro", label: "Pro" },
    { key: "enterprise", label: "Enterprise" },
  ];

  const limiteUsuarios = (e: AdminEmpresa): string | null => {
    if (e.planoStatus === "trial") {
      return `${e.totalUsuarios}/1 (trial)`;
    }
    if (e.planoStatus === "ativo" && e.planoTipo) {
      const limite = PLANO_LIMITE[e.planoTipo];
      return limite ? `${e.totalUsuarios}/${limite}` : null;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2" data-testid="filtros-empresas-status">
          {filtrosStatus.map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filtro === f.key ? "default" : "outline"}
              onClick={() => setFiltro(f.key)}
              data-testid={`filtro-status-${f.key}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" data-testid="filtros-empresas-plano">
          {filtrosPlano.map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filtroPlan === f.key ? "default" : "outline"}
              onClick={() => setFiltroPlan(f.key)}
              data-testid={`filtro-plano-${f.key}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Carregando empresas...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Nenhuma empresa encontrada.</div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(e => {
            const limite = limiteUsuarios(e);
            return (
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
                    {limite
                      ? `${limite} usuário${e.totalUsuarios !== 1 ? "s" : ""}`
                      : `${e.totalUsuarios} usuário${e.totalUsuarios !== 1 ? "s" : ""}`}
                    <span className="mx-1.5 opacity-50">·</span>
                    Desde {format(new Date(e.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  {planoColunaBadge(e.planoStatus, e.planoTipo, e.diasRestantes)}
                  {e.planoStatus !== "ativo" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEmpresaSelecionada(e); setDialogOpen(true); }}
                      data-testid={`button-ativar-${e.id}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Ativar Plano
                    </Button>
                  )}
                  {e.planoStatus === "pendente_pagamento" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sincronizarMp.mutate(e.id)}
                      disabled={sincronizarMp.isPending}
                      data-testid={`button-sincronizar-mp-${e.id}`}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Sincronizar com Mercado Pago
                    </Button>
                  )}
                  {e.planoStatus === "ativo" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEmpresaSelecionada(e); setDialogOpen(true); }}
                      data-testid={`button-alterar-plano-${e.id}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Alterar Plano
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => { setDeleteEmpresa(e); setDeleteDialogOpen(true); }}
                    data-testid={`button-deletar-${e.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AtivarPlanoDialog
        empresa={empresaSelecionada}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEmpresaSelecionada(null); }}
      />

      <ConfirmarDeleteEmpresaDialog
        empresa={deleteEmpresa}
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setDeleteEmpresa(null); }}
      />
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
              <div className="flex items-center flex-wrap gap-2">
                {(() => {
                  const emp = empresas.find(e => e.id === f.empresaId);
                  return emp?.planoTipo ? planoBadge(emp.planoTipo) : null;
                })()}
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

  const ativosStart = empresas.filter(e => e.planoStatus === "ativo" && e.planoTipo === "start").length;
  const ativosPro = empresas.filter(e => e.planoStatus === "ativo" && e.planoTipo === "pro").length;
  const ativosEnterprise = empresas.filter(e => e.planoStatus === "ativo" && e.planoTipo === "enterprise").length;
  const mrrEstimado = ativosStart * 187 + ativosPro * 490;

  const formatBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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
          Empresas
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
          Receita Mensal Recorrente (MRR)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card data-testid="card-mrr-start">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Start</span>
                <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  {ativosStart} empresa{ativosStart !== 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="text-xl font-bold">{formatBRL(ativosStart * 187)}</p>
              <p className="text-xs text-muted-foreground">{ativosStart} × R$ 187/mês</p>
            </CardContent>
          </Card>
          <Card data-testid="card-mrr-pro">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Pro</span>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                  {ativosPro} empresa{ativosPro !== 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="text-xl font-bold">{formatBRL(ativosPro * 490)}</p>
              <p className="text-xs text-muted-foreground">{ativosPro} × R$ 490/mês</p>
            </CardContent>
          </Card>
          <Card data-testid="card-mrr-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Enterprise</span>
                <Badge variant="outline" className="text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                  {ativosEnterprise} empresa{ativosEnterprise !== 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="text-xl font-bold text-muted-foreground">Sob consulta</p>
              <p className="text-xs text-muted-foreground">{ativosEnterprise} contrato{ativosEnterprise !== 1 ? "s" : ""} ativo{ativosEnterprise !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-mrr-total">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-600 dark:text-green-400">MRR Total</span>
                <LayoutDashboard className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatBRL(mrrEstimado)}</p>
              <p className="text-xs text-muted-foreground">Start + Pro estimado</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 p-4 rounded-md border bg-card space-y-2" data-testid="distribuicao-planos">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distribuição</p>
          {[
            { label: "Trial", count: emTrial, color: "bg-yellow-400 dark:bg-yellow-600", mrr: null },
            { label: "Start", count: ativosStart, color: "bg-blue-500", mrr: ativosStart * 187 },
            { label: "Pro", count: ativosPro, color: "bg-indigo-500", mrr: ativosPro * 490 },
            { label: "Enterprise", count: ativosEnterprise, color: "bg-purple-500", mrr: null },
            { label: "Expirado", count: trialVencido, color: "bg-red-400", mrr: null },
            { label: "Suspenso", count: suspensos, color: "bg-muted-foreground/30", mrr: null },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 text-sm">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${row.color}`} />
              <span className="w-24 text-sm">{row.label}</span>
              <span className="text-muted-foreground text-xs">{row.count} empresa{row.count !== 1 ? "s" : ""}</span>
              {row.mrr != null && (
                <span className="ml-auto text-xs font-medium">{formatBRL(row.mrr)} MRR</span>
              )}
            </div>
          ))}
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
              <p className="text-xs text-muted-foreground">Receita Total (faturas)</p>
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
  const { data: aiStatus } = useQuery<{ webSearchAtivo: boolean }>({
    queryKey: ["/api/admin/ai-status"],
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

      {aiStatus && !aiStatus.webSearchAtivo && (
        <div
          className="flex items-start gap-3 p-4 rounded-md border border-yellow-500/30 bg-yellow-500/10"
          data-testid="alert-web-search-inativo"
        >
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              Busca na web indisponível — modo fallback ativo
            </p>
            <p className="text-xs text-yellow-700/80 dark:text-yellow-400/80">
              O modelo de busca selecionado requer a variável de ambiente <code className="font-mono bg-yellow-500/20 px-1 rounded">OPENAI_API_KEY</code> (OpenAI padrão, não Azure). Enquanto não estiver configurada, a pesquisa PESTEL, análise competitiva e geração do Contexto Macro usarão o modelo de relatórios sem acesso à internet.
            </p>
          </div>
        </div>
      )}

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

  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery<AdminEmpresa[]>({
    queryKey: ["/api/admin/empresas"],
    enabled: !!user?.isAdmin,
  });

  const { data: faturas = [], isLoading: loadingFaturas } = useQuery<AdminFatura[]>({
    queryKey: ["/api/admin/faturas"],
    enabled: !!user?.isAdmin,
  });

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4" data-testid="acesso-negado">
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-titulo">Painel de Administração</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie empresas, faturas e acompanhe métricas do sistema.
          </p>
        </div>
        <Link href="/admin/contexto-macro">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            data-testid="button-link-contexto-macro"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Motor de Contexto
          </Button>
        </Link>
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

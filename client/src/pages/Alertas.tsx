import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bell, TrendingDown, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import type { ConfiguracaoNotificacao } from "@shared/schema";

const alertTypes = [
  {
    tipo: "kpi_vermelho",
    icon: TrendingDown,
    label: "Indicador em Estado Crítico",
    desc: "Receba um alerta quando um indicador entrar em estado vermelho (abaixo do limite crítico).",
    color: "text-red-600",
  },
  {
    tipo: "kpi_amarelo",
    icon: AlertTriangle,
    label: "Indicador em Atenção",
    desc: "Receba um alerta quando um indicador entrar em estado amarelo (abaixo da meta).",
    color: "text-yellow-600",
  },
  {
    tipo: "iniciativa_atrasada",
    icon: Clock,
    label: "Iniciativa Atrasada",
    desc: "Receba um alerta quando uma iniciativa ultrapassar o prazo sem ser concluída.",
    color: "text-orange-600",
  },
  {
    tipo: "okr_sem_atualizacao",
    icon: CheckCircle,
    label: "Meta sem Atualização",
    desc: "Receba um lembrete quando uma meta não for atualizada há mais de 14 dias.",
    color: "text-blue-600",
  },
  {
    tipo: "resumo_semanal",
    icon: Bell,
    label: "Resumo Semanal",
    desc: "Receba um resumo semanal do estado do seu plano estratégico todo domingo.",
    color: "text-purple-600",
  },
];

export default function Alertas() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: configs = [] } = useQuery<ConfiguracaoNotificacao[]>({
    queryKey: ["/api/notificacoes/configuracoes"],
  });

  const upsertMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/notificacoes/configuracoes", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notificacoes/configuracoes"] });
    },
    onError: () => toast({ title: "Erro ao salvar preferência", variant: "destructive" }),
  });

  function getConfig(tipo: string) {
    return configs.find(c => c.tipoAlerta === tipo);
  }

  function toggleAlerta(tipo: string, currentAtivo: boolean) {
    upsertMut.mutate({ tipoAlerta: tipo, ativo: !currentAtivo, frequencia: getConfig(tipo)?.frequencia || "imediato" });
    toast({ title: !currentAtivo ? "Alerta ativado" : "Alerta desativado" });
  }

  function setFrequencia(tipo: string, frequencia: string) {
    const cfg = getConfig(tipo);
    upsertMut.mutate({ tipoAlerta: tipo, ativo: cfg?.ativo ?? true, frequencia });
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Alertas por E-mail"
        description={`Configure quais notificações você deseja receber no e-mail ${user?.email || ""}`}
      />

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-sm">
            <Bell className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-muted-foreground">
              Os alertas são enviados para <strong className="text-foreground">{user?.email}</strong>. 
              Ative ou desative cada tipo de alerta conforme sua preferência.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {alertTypes.map(({ tipo, icon: Icon, label, desc, color }) => {
          const cfg = getConfig(tipo);
          const ativo = cfg?.ativo ?? false;
          const frequencia = cfg?.frequencia ?? "imediato";

          return (
            <Card key={tipo} data-testid={`alerta-card-${tipo}`}>
              <CardHeader className="pb-2 flex flex-row items-start gap-4">
                <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{desc}</CardDescription>
                </div>
                <Switch
                  checked={ativo}
                  onCheckedChange={() => toggleAlerta(tipo, ativo)}
                  data-testid={`switch-alerta-${tipo}`}
                  className="flex-shrink-0 mt-0.5"
                />
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="flex items-center gap-3 ml-9 flex-wrap gap-y-2">
                  {ativo && tipo !== "resumo_semanal" && (
                    <>
                      <Label className="text-xs text-muted-foreground flex-shrink-0">Frequência:</Label>
                      <Select value={frequencia} onValueChange={v => setFrequencia(tipo, v)}>
                        <SelectTrigger className="h-7 text-xs w-40" data-testid={`select-freq-${tipo}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="imediato">Imediato</SelectItem>
                          <SelectItem value="diario">Diário (1x/dia)</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  <span
                    className="text-xs text-muted-foreground"
                    data-testid={`text-ultimo-envio-${tipo}`}
                  >
                    Último envio: {cfg?.ultimoEnvio ? new Date(cfg.ultimoEnvio).toLocaleString("pt-BR") : "nunca"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

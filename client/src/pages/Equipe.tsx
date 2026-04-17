import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlano } from "@/hooks/usePlano";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Trash2, ShieldCheck, User, Key, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation, Link } from "wouter";

interface Membro {
  id: string;
  nome: string;
  email: string;
  role: "admin" | "membro";
  isAdmin: boolean;
  createdAt: string;
}

function roleBadge(role: "admin" | "membro") {
  if (role === "admin") {
    return (
      <Badge variant="default" className="gap-1" data-testid="badge-role-admin">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1" data-testid="badge-role-membro">
      <User className="h-3 w-3" />
      Membro
    </Badge>
  );
}

function UpgradeStartDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const whatsappUrl = `https://wa.me/5511950377286?text=${encodeURIComponent("Olá! Gostaria de fazer upgrade para o plano Pro do BizGuideAI para adicionar membros à minha equipe.")}`;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Adicionar membros à equipe
          </DialogTitle>
          <DialogDescription>
            Seu plano Start inclui apenas 1 usuário. Faça upgrade para Pro para adicionar membros ilimitados e usar IA mais poderosa.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button className="w-full gap-2" data-testid="button-upgrade-whatsapp">
              <Zap className="h-4 w-4" />
              Upgrade para Pro via WhatsApp
            </Button>
          </a>
          <Link href="/assinar?plano=pro" onClick={onClose}>
            <Button variant="outline" className="w-full" data-testid="button-ver-planos">
              Ver todos os planos
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovoMembroDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"admin" | "membro">("membro");
  const [showSenha, setShowSenha] = useState(false);

  const senhaValida = senha.length >= 8 && /\d/.test(senha);

  const criar = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/empresa/usuarios", { nome, email, senha, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresa/usuarios"] });
      toast({ title: "Usuário criado com sucesso" });
      handleClose();
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setRole("membro");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="novo-nome">Nome completo</Label>
            <Input
              id="novo-nome"
              placeholder="Ex: João Silva"
              value={nome}
              onChange={e => setNome(e.target.value)}
              data-testid="input-novo-nome"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novo-email">E-mail</Label>
            <Input
              id="novo-email"
              type="email"
              placeholder="joao@empresa.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              data-testid="input-novo-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novo-senha">Senha temporária</Label>
            <div className="relative">
              <Input
                id="novo-senha"
                type={showSenha ? "text" : "password"}
                placeholder="Mínimo 8 caracteres e 1 número"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                data-testid="input-novo-senha"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowSenha(v => !v)}
                data-testid="button-toggle-senha"
              >
                <Key className="h-3.5 w-3.5" />
              </Button>
            </div>
            {senha && !senhaValida && (
              <p className="text-xs text-muted-foreground" data-testid="text-senha-hint">
                Mínimo 8 caracteres e pelo menos 1 número
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={role} onValueChange={v => setRole(v as "admin" | "membro")}>
              <SelectTrigger data-testid="select-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membro">Membro — acesso total aos dados</SelectItem>
                <SelectItem value="admin">Admin — gerencia usuários e perfil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancelar-novo">
            Cancelar
          </Button>
          <Button
            onClick={() => criar.mutate()}
            disabled={!nome || !email || !senhaValida || criar.isPending}
            data-testid="button-salvar-novo"
          >
            {criar.isPending ? "Criando..." : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Equipe() {
  const { user } = useAuth();
  const { canInviteUsers } = usePlano();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [novoOpen, setNovoOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [removerAlvo, setRemoverAlvo] = useState<Membro | null>(null);

  const isCompanyAdmin = user?.role === "admin" || user?.isAdmin;

  const { data: membros = [], isLoading } = useQuery<Membro[]>({
    queryKey: ["/api/empresa/usuarios"],
    enabled: isCompanyAdmin,
  });

  const remover = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/empresa/usuarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresa/usuarios"] });
      toast({ title: "Usuário removido" });
      setRemoverAlvo(null);
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" }),
  });

  const alterarRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "admin" | "membro" }) =>
      apiRequest("PATCH", `/api/empresa/usuarios/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresa/usuarios"] });
      toast({ title: "Papel atualizado" });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao alterar papel", description: error.message, variant: "destructive" }),
  });

  const initials = (nome: string) =>
    nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  if (!isCompanyAdmin) {
    navigate("/");
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Equipe
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os usuários que têm acesso ao perfil da sua empresa.
          </p>
        </div>
        <Button
          onClick={() => canInviteUsers ? setNovoOpen(true) : setUpgradeOpen(true)}
          data-testid="button-novo-usuario"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isLoading ? "Carregando..." : `${membros.length} usuário${membros.length !== 1 ? "s" : ""}`}
          </CardTitle>
          <CardDescription>
            Todos compartilham os mesmos dados estratégicos da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
              Carregando usuários...
            </div>
          ) : membros.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="divide-y">
              {membros.map(m => {
                const isSelf = m.id === user?.id;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center gap-3 px-6 py-4"
                    data-testid={`row-membro-${m.id}`}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs font-medium">
                        {initials(m.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-membro-nome-${m.id}`}>
                        {m.nome}
                        {isSelf && (
                          <span className="text-xs text-muted-foreground ml-1.5">(você)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde {format(new Date(m.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {roleBadge(m.role)}
                      {!isSelf && (
                        <Select
                          value={m.role}
                          onValueChange={v => alterarRole.mutate({ id: m.id, role: v as "admin" | "membro" })}
                        >
                          <SelectTrigger
                            className="h-8 text-xs w-28"
                            data-testid={`select-role-${m.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="membro">Membro</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setRemoverAlvo(m)}
                        data-testid={`button-remover-${m.id}`}
                        title={isSelf ? "Sair da empresa" : "Remover usuário"}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <NovoMembroDialog open={novoOpen} onClose={() => setNovoOpen(false)} />
      <UpgradeStartDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <AlertDialog open={!!removerAlvo} onOpenChange={() => setRemoverAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removerAlvo?.id === user?.id ? "Sair da empresa?" : "Remover usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removerAlvo?.id === user?.id ? (
                <>
                  Você perderá o acesso a esta empresa. Esta ação não pode ser desfeita.
                </>
              ) : (
                <>
                  <strong>{removerAlvo?.nome}</strong> ({removerAlvo?.email}) perderá o acesso à
                  empresa. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancelar-remover">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removerAlvo && remover.mutate(removerAlvo.id)}
              disabled={remover.isPending}
              data-testid="button-confirmar-remover"
            >
              {remover.isPending ? "Removendo..." : removerAlvo?.id === user?.id ? "Sair" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

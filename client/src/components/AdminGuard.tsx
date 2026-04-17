import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user?.isAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4"
        data-testid="acesso-negado"
      >
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

  return <>{children}</>;
}

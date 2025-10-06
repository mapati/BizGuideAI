import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold">Página não encontrada</h2>
        <p className="text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <Link href="/">
          <Button data-testid="button-home">
            <Home className="h-4 w-4 mr-2" />
            Voltar para o Início
          </Button>
        </Link>
      </div>
    </div>
  );
}

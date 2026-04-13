import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Target, Mail, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const ERROR_MESSAGES: Record<string, string> = {
  token_invalido: "Link de verificação inválido. Solicite um novo abaixo.",
  token_usado: "Este link já foi utilizado. Caso precise, solicite um novo.",
  token_expirado: "Link expirado (válido por 24 horas). Solicite um novo abaixo.",
  usuario_nao_encontrado: "Usuário não encontrado. Entre em contato com o suporte.",
  erro_interno: "Erro ao verificar e-mail. Tente novamente.",
};

export default function VerifyEmail() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const errorCode = params.get("error");
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] || "Erro desconhecido." : null;

  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    if (!email.trim()) {
      toast({ title: "Informe seu e-mail", description: "Digite o e-mail cadastrado para receber o link.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error || "Não foi possível enviar o e-mail.", variant: "destructive" });
      } else {
        setSent(true);
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar o e-mail.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-start mb-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" data-testid="link-back-home-verify">
            <Target className="h-3.5 w-3.5" />
            Voltar ao início
          </Link>
        </div>
        <div className="flex items-center justify-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="link-home-from-verify">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">BizGuideAI</span>
          </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-7 w-7 text-primary" />
              </div>
            </div>
            <CardTitle>Verifique seu e-mail</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para o seu e-mail. Clique nele para acessar a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive" data-testid="alert-error-verify">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {sent ? (
              <div className="flex items-start gap-2 rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400" data-testid="alert-sent-verify">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Se o e-mail estiver cadastrado, você receberá o link de verificação em breve.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Não recebeu o e-mail? Informe seu endereço abaixo para reenviar.
                </p>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email-resend"
                />
                <Button
                  className="w-full"
                  onClick={handleResend}
                  disabled={isSending}
                  data-testid="button-resend-verification"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isSending ? "Enviando..." : "Reenviar link de verificação"}
                </Button>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Já confirmou?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login-from-verify">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

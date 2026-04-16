import { useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Target, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Informe sua senha"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const verified = params.get("verified") === "1";
  const planoParam = params.get("plano");
  const plano = planoParam === "start" || planoParam === "pro" ? planoParam : null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", senha: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    const currentParams = new URLSearchParams(window.location.search);
    const currentPlano = currentParams.get("plano");
    const destino =
      currentPlano === "start" || currentPlano === "pro"
        ? `/assinar?plano=${currentPlano}`
        : "/";
    setIsSubmitting(true);
    setUnverifiedEmail(null);
    setLockedMessage(null);
    try {
      const loginResult = await login(values.email, values.senha);
      // Detect pendente_pagamento directly from login response to redirect immediately
      if (loginResult?.trialInfo?.planoStatus === "pendente_pagamento") {
        const planoTipo = loginResult.empresa?.planoTipo ?? "start";
        window.location.href = `/assinar?plano=${planoTipo}`;
        return;
      }
      window.location.href = destino;
    } catch (err: any) {
      if (err.code === "EMAIL_NAO_VERIFICADO") {
        setUnverifiedEmail(err.email || values.email);
      } else if (err.code === "CONTA_BLOQUEADA") {
        setLockedMessage(err.message);
      } else {
        toast({
          title: "Erro ao entrar",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error || "Não foi possível reenviar.", variant: "destructive" });
      } else {
        setResent(true);
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível reenviar.", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-start mb-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" data-testid="link-back-home-login">
            <Target className="h-3.5 w-3.5" />
            Voltar ao início
          </Link>
        </div>
        <div className="flex items-center justify-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="link-home-from-login">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">BizGuideAI</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Acesse sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verified && (
              <div className="flex items-start gap-2 rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400" data-testid="alert-email-verified">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  E-mail verificado com sucesso!{" "}
                  {plano
                    ? `Faça login para prosseguir com o pagamento do Plano ${plano === "start" ? "Start" : "Pro"}.`
                    : "Faça login para continuar."}
                </span>
              </div>
            )}

            {lockedMessage && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive" data-testid="alert-conta-bloqueada">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{lockedMessage}</span>
              </div>
            )}

            {unverifiedEmail && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 space-y-2" data-testid="alert-email-nao-verificado">
                <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.</span>
                </div>
                {resent ? (
                  <div className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Link reenviado. Verifique sua caixa de entrada.</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    data-testid="button-resend-from-login"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    {isResending ? "Reenviando..." : "Reenviar link de verificação"}
                  </Button>
                )}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          data-testid="input-senha"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-forgot-password">
                    Esqueci minha senha
                  </Link>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-login"
                >
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                Criar conta
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

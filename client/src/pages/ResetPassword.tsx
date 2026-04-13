import { useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Target, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const resetSchema = z
  .object({
    novaSenha: z
      .string()
      .min(8, "Senha deve ter ao menos 8 caracteres")
      .regex(/\d/, "A senha deve conter pelo menos um número"),
    confirmarSenha: z.string().min(1, "Confirme sua nova senha"),
  })
  .refine((d) => d.novaSenha === d.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { novaSenha: "", confirmarSenha: "" },
  });

  const onSubmit = async (values: ResetForm) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha: values.novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error || "Não foi possível redefinir a senha.", variant: "destructive" });
      } else {
        setDone(true);
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível redefinir a senha.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive" data-testid="alert-invalid-token">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Link de redefinição inválido. Solicite um novo pelo formulário de "Esqueci minha senha".</span>
              </div>
              <div className="mt-4 text-center">
                <Link href="/forgot-password" className="text-primary hover:underline text-sm" data-testid="link-forgot-from-reset">
                  Solicitar novo link
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-start mb-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" data-testid="link-back-login-reset">
            <Target className="h-3.5 w-3.5" />
            Voltar ao login
          </Link>
        </div>
        <div className="flex items-center justify-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="link-home-from-reset">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">BizGuideAI</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
            <CardDescription>Crie uma nova senha para sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-md bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-700 dark:text-green-400" data-testid="alert-reset-success">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Senha redefinida com sucesso! Agora você pode entrar com a nova senha.</span>
                </div>
                <Button className="w-full" onClick={() => navigate("/login")} data-testid="button-go-to-login">
                  Ir para o login
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="novaSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Mín. 8 caracteres e 1 número"
                            data-testid="input-nova-senha"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmarSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar nova senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-confirmar-senha"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                    data-testid="button-reset-submit"
                  >
                    {isSubmitting ? "Salvando..." : "Redefinir senha"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

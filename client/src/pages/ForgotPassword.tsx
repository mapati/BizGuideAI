import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Target, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const forgotSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotForm) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Erro", description: data.error || "Não foi possível enviar o e-mail.", variant: "destructive" });
      } else {
        setSent(true);
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar o e-mail.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-start mb-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" data-testid="link-back-login">
            <Target className="h-3.5 w-3.5" />
            Voltar ao login
          </Link>
        </div>
        <div className="flex items-center justify-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="link-home-from-forgot">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">BizGuideAI</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Esqueci minha senha</CardTitle>
            <CardDescription>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-md bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-700 dark:text-green-400" data-testid="alert-forgot-sent">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Se o e-mail estiver cadastrado, você receberá as instruções de redefinição de senha em breve. Verifique sua caixa de entrada.
                  </span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="text-primary hover:underline" data-testid="link-login-from-forgot">
                    Voltar ao login
                  </Link>
                </p>
              </div>
            ) : (
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
                            data-testid="input-email-forgot"
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
                    data-testid="button-forgot-submit"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar link de redefinição"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Lembrou da senha?{" "}
                    <Link href="/login" className="text-primary hover:underline" data-testid="link-login-from-forgot-form">
                      Entrar
                    </Link>
                  </p>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z
  .object({
    nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    senha: z
      .string()
      .min(8, "Senha deve ter ao menos 8 caracteres")
      .regex(/\d/, "A senha deve conter pelo menos um número"),
    confirmaSenha: z.string().min(1, "Confirme sua senha"),
    nomeEmpresa: z.string().min(1, "Nome da empresa é obrigatório"),
    setor: z.string().min(1, "Setor é obrigatório"),
    tamanho: z.string().min(1, "Tamanho é obrigatório"),
  })
  .refine((data) => data.senha === data.confirmaSenha, {
    message: "As senhas não conferem",
    path: ["confirmaSenha"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const setores = [
  "Tecnologia",
  "Saúde",
  "Educação",
  "Finanças",
  "Varejo",
  "Manufatura",
  "Serviços",
  "Alimentação",
  "Construção",
  "Logística",
  "Outro",
];

const tamanhos = [
  { value: "micro", label: "Microempresa (até 9 funcionários)" },
  { value: "pequena", label: "Pequena (10–49 funcionários)" },
  { value: "media", label: "Média (50–249 funcionários)" },
  { value: "grande", label: "Grande (250+ funcionários)" },
];

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nome: "",
      email: "",
      senha: "",
      confirmaSenha: "",
      nomeEmpresa: "",
      setor: "",
      tamanho: "",
    },
  });

  const onSubmit = async (values: RegisterForm) => {
    setIsSubmitting(true);
    try {
      await register({
        nome: values.nome,
        email: values.email,
        senha: values.senha,
        nomeEmpresa: values.nomeEmpresa,
        setor: values.setor,
        tamanho: values.tamanho,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao criar conta",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-start mb-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" data-testid="link-back-home-register">
            <Target className="h-3.5 w-3.5" />
            Voltar ao início
          </Link>
        </div>
        <div className="flex items-center justify-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="link-home-from-register">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">BizGuideAI</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Criar conta</CardTitle>
            <CardDescription>Preencha os dados abaixo para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Seus dados
                </div>
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="João Silva"
                          data-testid="input-nome"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <div className="grid grid-cols-2 gap-4">
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
                  <FormField
                    control={form.control}
                    name="confirmaSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-confirma-senha"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mt-2 mb-1">
                  Dados da empresa
                </div>
                <FormField
                  control={form.control}
                  name="nomeEmpresa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da empresa</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Minha Empresa Ltda"
                          data-testid="input-nome-empresa"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-setor">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {setores.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tamanho"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamanho</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tamanho">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tamanhos.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-register"
                >
                  {isSubmitting ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

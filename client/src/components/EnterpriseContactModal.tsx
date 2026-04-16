import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Phone, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  empresa: z.string().min(1, "Nome da empresa é obrigatório"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(8, "Telefone deve ter ao menos 8 caracteres"),
});

type FormData = z.infer<typeof schema>;

interface EnterpriseContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnterpriseContactModal({ open, onOpenChange }: EnterpriseContactModalProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", empresa: "", email: "", telefone: "" },
  });

  const onSubmit = async (values: FormData) => {
    try {
      const res = await fetch("/api/contact/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar solicitação.");
      }
      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSubmitted(false);
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-enterprise-contact">
        <DialogHeader>
          <DialogTitle>Falar com um especialista</DialogTitle>
          <DialogDescription>
            Preencha seus dados e nossa equipe entrará em contato em até 1 dia útil.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center" data-testid="enterprise-contact-success">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="font-semibold text-base">Solicitação enviada!</p>
              <p className="text-sm text-muted-foreground">
                Recebemos seu contato e um especialista entrará em breve.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              data-testid="button-enterprise-close-success"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" data-testid="input-enterprise-nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="empresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Minha Empresa S.A." data-testid="input-enterprise-empresa" {...field} />
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
                    <FormLabel>E-mail corporativo</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="voce@empresa.com" data-testid="input-enterprise-email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone / WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" data-testid="input-enterprise-telefone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={form.formState.isSubmitting}
                data-testid="button-enterprise-submit"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Solicitar Contato de um Especialista
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

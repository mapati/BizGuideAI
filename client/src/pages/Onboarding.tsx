import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/ProgressBar";
import { ExampleCard } from "@/components/ExampleCard";
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Lock, Globe, Sparkles, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Empresa } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

function isProfileComplete(empresa: Empresa | null | undefined): boolean {
  if (!empresa) return false;
  return !!(empresa.nome && empresa.setor && empresa.tamanho);
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    nome: "",
    setor: "",
    tamanho: "",
    descricao: "",
    website: "",
    cnpj: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  const [senhaData, setSenhaData] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });
  const [senhaErrors, setSenhaErrors] = useState<Record<string, string>>({});
  const [perfilErrors, setPerfilErrors] = useState<Record<string, string>>({});
  const [senhaAberta, setSenhaAberta] = useState(false);

  const { data: empresaExistente } = useQuery<Empresa | null>({
    queryKey: ["/api/empresa"],
  });

  const perfilCompleto = isProfileComplete(empresaExistente);

  useEffect(() => {
    if (empresaExistente) {
      setFormData({
        nome: empresaExistente.nome || "",
        setor: empresaExistente.setor || "",
        tamanho: empresaExistente.tamanho || "",
        descricao: empresaExistente.descricao || "",
        website: empresaExistente.website || "",
        cnpj: empresaExistente.cnpj || "",
        endereco: empresaExistente.endereco || "",
        cidade: empresaExistente.cidade || "",
        estado: empresaExistente.estado || "",
        cep: empresaExistente.cep || "",
      });
    }
  }, [empresaExistente]);

  const criarEmpresaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/empresa", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresa"] });
      toast({
        title: "Perfil criado com sucesso!",
        description: "Agora vamos começar a análise estratégica.",
      });
      setLocation("/pestel");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const atualizarEmpresaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("PATCH", "/api/empresa", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresa"] });
      toast({
        title: "Perfil atualizado com sucesso!",
        description: "As informações da sua empresa foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const gerarDescricaoMutation = useMutation({
    mutationFn: async (website: string) => {
      const data = await apiRequest("POST", "/api/ai/gerar-descricao-empresa", { website });
      return data as { descricao: string };
    },
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, descricao: data.descricao }));
      toast({
        title: "Descrição gerada com sucesso!",
        description: "Revise o texto gerado e ajuste se necessário.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Não foi possível gerar a descrição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const alterarSenhaMutation = useMutation({
    mutationFn: async (data: { senhaAtual: string; novaSenha: string }) => {
      return await apiRequest("PATCH", "/api/auth/senha", data);
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada com sucesso!",
        description: "Sua senha foi atualizada.",
      });
      setSenhaData({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
      setSenhaAberta(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      if (!formData.nome || !formData.setor || !formData.tamanho) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }
      if (formData.website && !validateWebsiteUrl(formData.website)) {
        toast({
          title: "Website inválido",
          description: "Informe um endereço de site válido, ex: https://www.empresa.com.br",
          variant: "destructive",
        });
        return;
      }
      if (empresaExistente) {
        atualizarEmpresaMutation.mutate(formData);
      } else {
        criarEmpresaMutation.mutate(formData);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  function validateCnpj(cnpj: string): boolean {
    const cleaned = cnpj.replace(/[^\d]/g, "");
    if (cleaned.length !== 14) return false;
    return true;
  }

  function validateWebsiteUrl(website: string): boolean {
    if (!website.trim()) return true;
    let url = website.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  const handleSalvarPerfil = () => {
    const errors: Record<string, string> = {};
    if (!formData.nome) errors.nome = "Nome da empresa é obrigatório";
    if (!formData.setor) errors.setor = "Setor de atuação é obrigatório";
    if (!formData.tamanho) errors.tamanho = "Selecione o tamanho da empresa";
    if (formData.cnpj && !validateCnpj(formData.cnpj)) {
      errors.cnpj = "CNPJ inválido. Informe os 14 dígitos (somente números ou no formato XX.XXX.XXX/XXXX-XX)";
    }
    if (formData.website && !validateWebsiteUrl(formData.website)) {
      errors.website = "Endereço de website inválido. Ex: https://www.empresa.com.br";
    }
    setPerfilErrors(errors);
    if (Object.keys(errors).length > 0) return;
    atualizarEmpresaMutation.mutate(formData);
  };

  const handleAlterarSenha = () => {
    const errors: Record<string, string> = {};
    if (!senhaData.senhaAtual) {
      errors.senhaAtual = "Senha atual é obrigatória";
    }
    if (!senhaData.novaSenha) {
      errors.novaSenha = "Nova senha é obrigatória";
    } else if (senhaData.novaSenha.length < 6) {
      errors.novaSenha = "A nova senha deve ter pelo menos 6 caracteres";
    }
    if (!senhaData.confirmarSenha) {
      errors.confirmarSenha = "Confirme a nova senha";
    } else if (senhaData.novaSenha !== senhaData.confirmarSenha) {
      errors.confirmarSenha = "As senhas não coincidem";
    }
    setSenhaErrors(errors);
    if (Object.keys(errors).length > 0) return;
    alterarSenhaMutation.mutate({ senhaAtual: senhaData.senhaAtual, novaSenha: senhaData.novaSenha });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={empresaExistente ? "Editar Perfil da Empresa" : "Perfil da Empresa"}
        description={
          empresaExistente
            ? "Revise e edite as informações da sua empresa."
            : "Conte-nos sobre seu negócio em linguagem simples. Não se preocupe com termos técnicos."
        }
        tooltip="Estas informações ajudarão a personalizar todas as análises e sugestões ao longo da jornada."
      />

      {perfilCompleto ? (
        <div className="space-y-6">
          <Card className="p-8">
            <h3 className="text-xl font-semibold mb-6">Informações da Empresa</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-nome">Nome da Empresa *</Label>
                  <Input
                    id="edit-nome"
                    placeholder="Ex: TechParts Indústria"
                    value={formData.nome}
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      if (perfilErrors.nome) setPerfilErrors({ ...perfilErrors, nome: "" });
                    }}
                    data-testid="input-nome-empresa"
                  />
                  {perfilErrors.nome && (
                    <p className="text-sm text-destructive mt-1" data-testid="error-nome">{perfilErrors.nome}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-setor">Setor de Atuação *</Label>
                  <Input
                    id="edit-setor"
                    placeholder="Ex: Indústria de autopeças"
                    value={formData.setor}
                    onChange={(e) => {
                      setFormData({ ...formData, setor: e.target.value });
                      if (perfilErrors.setor) setPerfilErrors({ ...perfilErrors, setor: "" });
                    }}
                    data-testid="input-setor"
                  />
                  {perfilErrors.setor && (
                    <p className="text-sm text-destructive mt-1" data-testid="error-setor">{perfilErrors.setor}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="edit-tamanho">Tamanho da Empresa *</Label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {[
                    { value: "micro", label: "Microempresa (até 19 func.)" },
                    { value: "pequena", label: "Pequena (20-99 func.)" },
                    { value: "media", label: "Média (100-499 func.)" },
                    { value: "grande", label: "Grande (500+ func.)" },
                  ].map((opcao) => (
                    <Card
                      key={opcao.value}
                      className={`p-3 cursor-pointer hover-elevate ${
                        formData.tamanho === opcao.value ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        setFormData({ ...formData, tamanho: opcao.value });
                        if (perfilErrors.tamanho) setPerfilErrors({ ...perfilErrors, tamanho: "" });
                      }}
                      data-testid={`card-tamanho-${opcao.value}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            formData.tamanho === opcao.value
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {formData.tamanho === opcao.value && (
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{opcao.label}</span>
                      </div>
                    </Card>
                  ))}
                </div>
                {perfilErrors.tamanho && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-tamanho">{perfilErrors.tamanho}</p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-website">Website da Empresa</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-website"
                      type="url"
                      placeholder="https://www.suaempresa.com.br"
                      value={formData.website}
                      onChange={(e) => {
                        setFormData({ ...formData, website: e.target.value });
                        if (perfilErrors.website) setPerfilErrors({ ...perfilErrors, website: "" });
                      }}
                      className="pl-9"
                      data-testid="input-website"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => gerarDescricaoMutation.mutate(formData.website)}
                    disabled={!formData.website.trim() || gerarDescricaoMutation.isPending}
                    data-testid="button-gerar-descricao"
                  >
                    {gerarDescricaoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Gerar com IA
                  </Button>
                </div>
                {perfilErrors.website ? (
                  <p className="text-sm text-destructive mt-1" data-testid="error-website">{perfilErrors.website}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nossa IA acessa o site e cria uma descrição profissional da empresa automaticamente.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-descricao">Descrição do Negócio</Label>
                <Textarea
                  id="edit-descricao"
                  placeholder="Ex: Fabricamos peças metálicas usinadas de alta precisão para montadoras automotivas."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="textarea-descricao"
                />
              </div>

              <div>
                <Label htmlFor="edit-cnpj">CNPJ</Label>
                <Input
                  id="edit-cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => {
                    setFormData({ ...formData, cnpj: e.target.value });
                    if (perfilErrors.cnpj) setPerfilErrors({ ...perfilErrors, cnpj: "" });
                  }}
                  data-testid="input-cnpj"
                />
                {perfilErrors.cnpj && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-cnpj">{perfilErrors.cnpj}</p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-endereco">Endereço</Label>
                <Input
                  id="edit-endereco"
                  placeholder="Ex: Rua das Indústrias, 1200"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  data-testid="input-endereco"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <Label htmlFor="edit-cidade">Cidade</Label>
                  <Input
                    id="edit-cidade"
                    placeholder="Ex: São Paulo"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    data-testid="input-cidade"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-estado">Estado</Label>
                  <Input
                    id="edit-estado"
                    placeholder="Ex: SP"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    data-testid="input-estado"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-cep">CEP</Label>
                  <Input
                    id="edit-cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    data-testid="input-cep"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button
                onClick={handleSalvarPerfil}
                disabled={atualizarEmpresaMutation.isPending}
                data-testid="button-salvar-perfil"
              >
                {atualizarEmpresaMutation.isPending ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-6 text-left hover-elevate"
              onClick={() => setSenhaAberta(!senhaAberta)}
              data-testid="button-toggle-alterar-senha"
            >
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-semibold">Alterar Senha</div>
                  <div className="text-sm text-muted-foreground">Atualize sua senha de acesso</div>
                </div>
              </div>
              {senhaAberta ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
            </button>

            {senhaAberta && (
              <div className="px-6 pb-6 border-t pt-6 space-y-4">
                <div>
                  <Label htmlFor="senha-atual">Senha Atual</Label>
                  <Input
                    id="senha-atual"
                    type="password"
                    placeholder="Digite sua senha atual"
                    value={senhaData.senhaAtual}
                    onChange={(e) => {
                      setSenhaData({ ...senhaData, senhaAtual: e.target.value });
                      if (senhaErrors.senhaAtual) setSenhaErrors({ ...senhaErrors, senhaAtual: "" });
                    }}
                    data-testid="input-senha-atual"
                  />
                  {senhaErrors.senhaAtual && (
                    <p className="text-sm text-destructive mt-1" data-testid="error-senha-atual">
                      {senhaErrors.senhaAtual}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="nova-senha">Nova Senha</Label>
                  <Input
                    id="nova-senha"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={senhaData.novaSenha}
                    onChange={(e) => {
                      setSenhaData({ ...senhaData, novaSenha: e.target.value });
                      if (senhaErrors.novaSenha) setSenhaErrors({ ...senhaErrors, novaSenha: "" });
                    }}
                    data-testid="input-nova-senha"
                  />
                  {senhaErrors.novaSenha && (
                    <p className="text-sm text-destructive mt-1" data-testid="error-nova-senha">
                      {senhaErrors.novaSenha}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmar-senha">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmar-senha"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={senhaData.confirmarSenha}
                    onChange={(e) => {
                      setSenhaData({ ...senhaData, confirmarSenha: e.target.value });
                      if (senhaErrors.confirmarSenha) setSenhaErrors({ ...senhaErrors, confirmarSenha: "" });
                    }}
                    data-testid="input-confirmar-senha"
                  />
                  {senhaErrors.confirmarSenha && (
                    <p className="text-sm text-destructive mt-1" data-testid="error-confirmar-senha">
                      {senhaErrors.confirmarSenha}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAlterarSenha}
                    disabled={alterarSenhaMutation.isPending}
                    data-testid="button-salvar-senha"
                  >
                    {alterarSenhaMutation.isPending ? "Salvando..." : "Alterar Senha"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <ProgressBar current={step} total={totalSteps} label="Etapa do perfil" />
          </div>

          <Card className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Informações Básicas</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Vamos começar conhecendo sua empresa.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome da Empresa *</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: TechParts Indústria"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      data-testid="input-nome-empresa"
                    />
                  </div>

                  <div>
                    <Label htmlFor="setor">Setor de Atuação *</Label>
                    <Input
                      id="setor"
                      placeholder="Ex: Indústria de autopeças"
                      value={formData.setor}
                      onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                      data-testid="input-setor"
                    />
                  </div>
                </div>

                <ExampleCard>
                  <strong>TechParts Indústria</strong> · Setor: Indústria de autopeças para linha leve
                </ExampleCard>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Tamanho da Empresa</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Isso nos ajuda a calibrar as análises e sugestões.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { value: "micro", label: "Microempresa (até 19 funcionários)" },
                    { value: "pequena", label: "Pequena empresa (20-99 funcionários)" },
                    { value: "media", label: "Média empresa (100-499 funcionários)" },
                    { value: "grande", label: "Grande empresa (500+ funcionários)" },
                  ].map((opcao) => (
                    <Card
                      key={opcao.value}
                      className={`p-4 cursor-pointer hover-elevate ${
                        formData.tamanho === opcao.value ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, tamanho: opcao.value })}
                      data-testid={`card-tamanho-${opcao.value}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            formData.tamanho === opcao.value
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {formData.tamanho === opcao.value && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="font-medium">{opcao.label}</span>
                      </div>
                    </Card>
                  ))}
                </div>

                <ExampleCard>
                  Exemplo: Uma fábrica com 180 funcionários seria classificada como <strong>Média empresa</strong>
                </ExampleCard>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Sobre o Negócio</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Informe o site da sua empresa para gerarmos uma descrição automaticamente com IA, ou preencha manualmente.
                  </p>
                </div>

                <div>
                  <Label htmlFor="website-wizard">Website da Empresa</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website-wizard"
                        type="url"
                        placeholder="https://www.suaempresa.com.br"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="pl-9"
                        data-testid="input-website"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => gerarDescricaoMutation.mutate(formData.website)}
                      disabled={!formData.website.trim() || gerarDescricaoMutation.isPending}
                      data-testid="button-gerar-descricao"
                    >
                      {gerarDescricaoMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Gerar com IA
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nossa IA acessa o site e cria uma descrição profissional da empresa automaticamente.
                  </p>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição do Negócio</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Ex: Fabricamos peças metálicas usinadas de alta precisão para montadoras automotivas. Nossos principais produtos são componentes de motor e transmissão."
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="min-h-[150px]"
                    data-testid="textarea-descricao"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Dica: Descreva o que você faz, para quem vende e quais são seus principais produtos ou serviços.
                  </p>
                </div>

                <ExampleCard>
                  <strong>Exemplo:</strong> Somos uma indústria de embalagens plásticas para o setor alimentício. Produzimos desde potes pequenos até tambores industriais. Atendemos desde pequenas empresas locais até grandes redes de supermercados.
                </ExampleCard>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
                data-testid="button-voltar"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleNext}
                disabled={criarEmpresaMutation.isPending || atualizarEmpresaMutation.isPending}
                data-testid="button-proximo"
              >
                {step === totalSteps ? "Finalizar" : "Próximo"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

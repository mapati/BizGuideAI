import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Target, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function TermosDeUso() {
  const { data: config } = useQuery<any>({ queryKey: ["/api/config-sistema"] });

  const empresaNome = config?.razaoSocial || "BizGuideAI";
  const empresaCnpj = config?.cnpj || "";
  const empresaEmail = config?.email || "contato@bizguideai.com.br";
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home-from-terms">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">BizGuideAI</span>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-muted-foreground text-sm">Termos de Uso</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          data-testid="link-back-from-terms"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao cadastro
        </Link>

        <h1 className="text-3xl font-bold mb-2" data-testid="title-termos-de-uso">Termos de Uso</h1>
        <p className="text-muted-foreground text-sm mb-8">Última atualização: {hoje}</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Identificação do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O BizGuideAI é um serviço de consultoria estratégica assistida por inteligência artificial, operado por{" "}
              <strong className="text-foreground">{empresaNome}</strong>
              {empresaCnpj && (
                <span>, CNPJ <strong className="text-foreground">{empresaCnpj}</strong></span>
              )}
              {empresaEmail && (
                <span>, com contato pelo e-mail <strong className="text-foreground">{empresaEmail}</strong></span>
              )}
              . O serviço é disponibilizado por meio de plataforma digital de acesso restrito mediante cadastro.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao criar uma conta no BizGuideAI, o usuário declara ter lido, compreendido e aceito integralmente
              estes Termos de Uso. A utilização contínua da plataforma implica aceitação de eventuais atualizações,
              que serão informadas previamente. Caso não concorde com alguma das condições, o usuário deve cessar o
              uso do serviço imediatamente.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Uso da Inteligência Artificial — Avisos Importantes</h2>
            <div className="space-y-4">
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  Natureza das análises geradas por IA
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                  As análises, diagnósticos, sugestões estratégicas e conteúdos gerados pela inteligência artificial
                  do BizGuideAI têm caráter <strong>exclusivamente orientativo e educacional</strong>. Não constituem
                  assessoria jurídica, contábil, fiscal ou financeira profissional regulamentada.
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                A IA pode cometer erros, apresentar informações desatualizadas ou gerar conteúdo inadequado ao
                contexto específico do negócio do usuário. O BizGuideAI <strong className="text-foreground">não se
                responsabiliza por decisões tomadas com base exclusiva nas análises geradas</strong>. Toda decisão
                estratégica relevante deve ser validada com profissionais habilitados.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Os dados inseridos na plataforma são utilizados para personalizar os resultados da IA. O usuário
                é inteiramente responsável pela veracidade e atualidade das informações fornecidas sobre sua empresa.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cadastro e Segurança da Conta</h2>
            <p className="text-muted-foreground leading-relaxed">
              O usuário é responsável por manter a confidencialidade de suas credenciais de acesso e por todas
              as atividades realizadas em sua conta. É vedado compartilhar credenciais com terceiros ou utilizar
              a conta para fins ilícitos. Suspeitas de acesso não autorizado devem ser comunicadas imediatamente
              pelo e-mail {empresaEmail}.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Dados da Empresa e Privacidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              As informações cadastradas pelo usuário (nome da empresa, setor, descrição, dados estratégicos)
              são armazenadas de forma segura e utilizadas exclusivamente para a prestação do serviço contratado.
              O BizGuideAI não comercializa dados de usuários com terceiros. O tratamento de dados segue as
              disposições da Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Planos e Pagamentos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O BizGuideAI oferece um período de avaliação gratuita (trial) e planos pagos mensais. Os valores,
              condições de renovação e cancelamento são os vigentes no momento da contratação, disponíveis na
              página de planos. Os pagamentos são processados por provedores terceiros certificados (MercadoPago)
              e o BizGuideAI não armazena dados de cartão de crédito.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma BizGuideAI, incluindo sua interface, marca, metodologia e código-fonte, é protegida por
              direitos autorais e de propriedade intelectual. O conteúdo gerado pela IA com base nos dados do usuário
              pode ser utilizado livremente pelo usuário para fins internos ao seu negócio. É vedada a reprodução
              ou comercialização da plataforma ou de seus componentes sem autorização expressa.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O BizGuideAI é fornecido "no estado em que se encontra". O provedor não garante disponibilidade
              ininterrupta nem a ausência de erros. Em nenhuma hipótese o BizGuideAI será responsável por danos
              indiretos, lucros cessantes ou perdas resultantes do uso ou da incapacidade de uso da plataforma,
              exceto nos casos previstos em lei.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Modificações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos podem ser atualizados periodicamente. Alterações relevantes serão comunicadas aos
              usuários por e-mail ou por aviso na plataforma com antecedência mínima de 15 (quinze) dias.
              O uso continuado após a vigência das novas condições implica aceitação das alterações.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Foro e Legislação Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca
              do domicílio do prestador do serviço para dirimir quaisquer controvérsias decorrentes deste instrumento,
              com renúncia de qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas, solicitações ou reclamações relacionadas a estes Termos, entre em contato pelo e-mail{" "}
              <a href={`mailto:${empresaEmail}`} className="text-primary hover:underline" data-testid="link-email-contact">
                {empresaEmail}
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            {empresaNome}
            {empresaCnpj && ` — CNPJ ${empresaCnpj}`}
          </p>
        </div>
      </main>
    </div>
  );
}

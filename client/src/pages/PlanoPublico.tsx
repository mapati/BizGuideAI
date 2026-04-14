import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import {
  Loader2,
  Building2,
  Globe2,
  Layers,
  Grid3x3,
  GitBranch,
  TrendingUp,
  Lightbulb,
  Briefcase,
  CloudLightning,
  MapPin,
  Globe,
  Users,
  Package,
  Star,
  Calendar,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const PESTEL_LABELS: Record<string, { label: string; color: string }> = {
  Político:     { label: "Político",     color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
  Econômico:    { label: "Econômico",    color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  Social:       { label: "Social",       color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  Tecnológico:  { label: "Tecnológico",  color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300" },
  Ambiental:    { label: "Ambiental",    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  Legal:        { label: "Legal",        color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" },
};

const IMPACTO_COLOR: Record<string, string> = {
  alto:  "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  médio: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300",
  baixo: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
};

const SWOT_CONFIG: Record<string, { label: string; bg: string; border: string; badge: string }> = {
  forca:      { label: "Forças",       bg: "bg-green-50 dark:bg-green-950/20",    border: "border-green-200 dark:border-green-800",    badge: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  fraqueza:   { label: "Fraquezas",    bg: "bg-red-50 dark:bg-red-950/20",        border: "border-red-200 dark:border-red-800",        badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  oportunidade: { label: "Oportunidades", bg: "bg-blue-50 dark:bg-blue-950/20",  border: "border-blue-200 dark:border-blue-800",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  ameaca:     { label: "Ameaças",      bg: "bg-orange-50 dark:bg-orange-950/20",  border: "border-orange-200 dark:border-orange-800",  badge: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" },
};

const INTENSIDADE_COLOR: Record<string, string> = {
  alta:  "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  média: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300",
  baixa: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
};

const CENARIO_CONFIG: Record<string, { label: string; bg: string; border: string; badge: string }> = {
  pessimista: { label: "Pessimista", bg: "bg-red-50 dark:bg-red-950/20",    border: "border-red-200 dark:border-red-800",    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  base:       { label: "Base",       bg: "bg-blue-50 dark:bg-blue-950/20",  border: "border-blue-200 dark:border-blue-800",  badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  otimista:   { label: "Otimista",   bg: "bg-green-50 dark:bg-green-950/20",border: "border-green-200 dark:border-green-800",badge: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
};

const BMC_ORDER = [
  "Parceiros-Chave",
  "Atividades-Chave",
  "Proposta de Valor",
  "Relacionamento com Clientes",
  "Segmentos de Clientes",
  "Recursos-Chave",
  "Canais",
  "Estrutura de Custos",
  "Fontes de Receita",
];

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function PlanoPublico() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/plano-publico", token],
    queryFn: async () => {
      const res = await fetch(`/api/plano-publico/${token}`);
      if (!res.ok) throw new Error("Link não encontrado ou expirado");
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">Link inválido ou expirado</p>
          <p className="text-muted-foreground text-sm">Este plano estratégico não está mais disponível.</p>
        </div>
      </div>
    );
  }

  const {
    empresa,
    fatoresPestel = [],
    cincoForcas = [],
    modeloNegocio = [],
    swot = [],
    estrategias = [],
    oportunidades = [],
    iniciativas = [],
    cenarios = [],
  } = data;

  // group data
  const pestelByTipo = fatoresPestel.reduce((acc: Record<string, any[]>, f: any) => {
    (acc[f.tipo] = acc[f.tipo] || []).push(f);
    return acc;
  }, {});

  const swotByTipo = swot.reduce((acc: Record<string, any[]>, s: any) => {
    (acc[s.tipo] = acc[s.tipo] || []).push(s);
    return acc;
  }, {});

  const bmcByBloco = modeloNegocio.reduce((acc: Record<string, any[]>, b: any) => {
    (acc[b.bloco] = acc[b.bloco] || []).push(b);
    return acc;
  }, {});

  const totalSections = [
    fatoresPestel.length,
    cincoForcas.length,
    modeloNegocio.length,
    swot.length,
    estrategias.length,
    oportunidades.length,
    iniciativas.length,
  ].filter((n) => n > 0).length;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero / Header ── */}
      <div className="border-b bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold">{empresa?.nome || "Plano Estratégico"}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {empresa?.setor && (
                  <Badge variant="secondary" className="text-sm no-default-hover-elevate no-default-active-elevate">
                    {empresa.setor}
                  </Badge>
                )}
                {empresa?.tamanho && (
                  <Badge variant="outline" className="text-sm no-default-hover-elevate no-default-active-elevate">
                    {empresa.tamanho}
                  </Badge>
                )}
                {(empresa?.cidade || empresa?.estado) && (
                  <Badge variant="outline" className="text-sm no-default-hover-elevate no-default-active-elevate">
                    <MapPin className="h-3 w-3 mr-1" />
                    {[empresa.cidade, empresa.estado].filter(Boolean).join(", ")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Book estratégico · Visualização somente leitura · BizGuideAI
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground hidden md:block">
              <p className="font-medium text-foreground">{totalSections} seções</p>
              <p>neste plano</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* ── 1. Perfil da Empresa ── */}
        <section data-testid="section-perfil">
          <SectionHeader icon={Building2} title="Perfil da Empresa" />
          <div className="space-y-5">

            {/* Descrição do negócio — largura total */}
            {empresa?.descricao && (
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sobre a empresa</p>
                  <p className="text-sm leading-relaxed">{empresa.descricao}</p>
                </CardContent>
              </Card>
            )}

            {/* Grid de atributos — sem coluna vazia */}
            {(() => {
              const fields = [
                empresa?.modeloNegocio      && { icon: Grid3x3,  label: "Tipo de Negócio",            value: empresa.modeloNegocio },
                empresa?.areaAtuacao        && { icon: Globe,     label: "Abrangência de Mercado",     value: empresa.areaAtuacao },
                empresa?.publicoAlvo        && { icon: Users,     label: "Clientes Atendidos",         value: empresa.publicoAlvo },
                empresa?.principaisProdutos && { icon: Package,   label: "Produtos e Serviços",        value: empresa.principaisProdutos },
                empresa?.diferenciaisCompetitivos && { icon: Star, label: "Vantagens Competitivas",   value: empresa.diferenciaisCompetitivos },
                empresa?.concorrentesConhecidos   && { icon: Building2, label: "Principais Concorrentes", value: empresa.concorrentesConhecidos },
                empresa?.anoFundacao        && { icon: Calendar,  label: "Fundada em",                 value: String(empresa.anoFundacao) },
                empresa?.cnpj               && { icon: Globe,     label: "CNPJ",                       value: empresa.cnpj },
              ].filter(Boolean) as { icon: LucideIcon; label: string; value: string }[];

              if (!fields.length) return null;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {fields.map(({ icon: Icon, label, value }) => (
                    <Card key={label}>
                      <CardContent className="p-4 flex gap-3 items-start">
                        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
                          <p className="text-sm leading-snug">{value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}

            {/* Website */}
            {empresa?.website && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                <a
                  href={empresa.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  {empresa.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ── 2. Modelo de Negócio (BMC) ── */}
        {modeloNegocio.length > 0 && (
          <section data-testid="section-bmc">
            <SectionHeader icon={Grid3x3} title="Modelo de Negócio" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BMC_ORDER.filter((bloco) => bmcByBloco[bloco]?.length).map((bloco) => (
                <Card key={bloco}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {bloco}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-1.5">
                    {bmcByBloco[bloco].map((b: any) => (
                      <p key={b.id} className="text-sm leading-snug">{b.descricao}</p>
                    ))}
                  </CardContent>
                </Card>
              ))}
              {/* blocos não mapeados no BMC_ORDER */}
              {Object.entries(bmcByBloco)
                .filter(([bloco]) => !BMC_ORDER.includes(bloco))
                .map(([bloco, items]) => (
                  <Card key={bloco}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {bloco}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 space-y-1.5">
                      {items.map((b: any) => (
                        <p key={b.id} className="text-sm leading-snug">{b.descricao}</p>
                      ))}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </section>
        )}

        {/* ── 3. Cenário Externo ── */}
        {fatoresPestel.length > 0 && (
          <section data-testid="section-pestel">
            <SectionHeader icon={Globe2} title="Cenário Externo" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(pestelByTipo).map(([tipo, fatores]) => {
                const cfg = PESTEL_LABELS[tipo] || { label: tipo, color: "bg-muted text-muted-foreground" };
                return (
                  <Card key={tipo}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      {(fatores as any[]).map((f: any) => (
                        <div key={f.id} className="space-y-1">
                          <p className="text-sm leading-snug">{f.descricao}</p>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${IMPACTO_COLOR[f.impacto?.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
                              Impacto {f.impacto}
                            </span>
                            {f.evidencia && (
                              <span className="text-xs text-muted-foreground italic">{f.evidencia}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 4. Mercado e Concorrência ── */}
        {cincoForcas.length > 0 && (
          <section data-testid="section-cinco-forcas">
            <SectionHeader icon={Layers} title="Mercado e Concorrência" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cincoForcas.map((f: any) => (
                <Card key={f.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{f.forca}</p>
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${INTENSIDADE_COLOR[f.intensidade?.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
                        {f.intensidade}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">{f.descricao}</p>
                    {f.impacto && (
                      <p className="text-xs text-muted-foreground border-t pt-2">{f.impacto}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── 5. Forças e Fraquezas ── */}
        {swot.length > 0 && (
          <section data-testid="section-swot">
            <SectionHeader icon={GitBranch} title="Forças e Fraquezas" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["forca", "oportunidade", "fraqueza", "ameaca"] as const).map((tipo) => {
                const items = swotByTipo[tipo] || [];
                if (!items.length) return null;
                const cfg = SWOT_CONFIG[tipo];
                return (
                  <Card key={tipo} className={`${cfg.bg} ${cfg.border}`}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 space-y-2">
                      {items.map((s: any) => (
                        <div key={s.id} className="flex gap-2 items-start">
                          <div className="h-1.5 w-1.5 rounded-full bg-current mt-1.5 flex-shrink-0 opacity-50" />
                          <p className="text-sm leading-snug">{s.descricao}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 6. Oportunidades de Crescimento ── */}
        {oportunidades.length > 0 && (
          <section data-testid="section-oportunidades">
            <SectionHeader icon={TrendingUp} title="Oportunidades de Crescimento" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {oportunidades.map((o: any) => (
                <Card key={o.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
                        {o.tipo}
                      </Badge>
                      <p className="text-sm font-medium">{o.titulo}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">{o.descricao}</p>
                    <div className="flex gap-2 flex-wrap pt-1">
                      {o.potencial && (
                        <span className="text-xs text-muted-foreground">Potencial: <span className="font-medium text-foreground">{o.potencial}</span></span>
                      )}
                      {o.risco && (
                        <span className="text-xs text-muted-foreground">Risco: <span className="font-medium text-foreground">{o.risco}</span></span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── 7. Estratégias ── */}
        {estrategias.length > 0 && (
          <section data-testid="section-estrategias">
            <SectionHeader icon={Lightbulb} title="Estratégias" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {estrategias.map((e: any) => (
                <Card key={e.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
                        {e.tipo}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs flex-shrink-0 no-default-hover-elevate no-default-active-elevate ${
                          e.prioridade === "alta" ? "text-red-700 bg-red-100 dark:bg-red-950/40 dark:text-red-300" :
                          e.prioridade === "média" ? "text-yellow-700 bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300" :
                          ""
                        }`}
                      >
                        {e.prioridade}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{e.titulo}</p>
                    {e.descricao && <p className="text-sm text-muted-foreground leading-snug">{e.descricao}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── 8. Iniciativas Prioritárias ── */}
        {iniciativas.length > 0 && (
          <section data-testid="section-iniciativas">
            <SectionHeader icon={Briefcase} title="Iniciativas Prioritárias" />
            <div className="space-y-2">
              {iniciativas.map((ini: any) => (
                <Card key={ini.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-medium">{ini.titulo}</p>
                        {ini.descricao && <p className="text-xs text-muted-foreground leading-snug">{ini.descricao}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 flex-wrap">
                        {ini.prioridade && (
                          <Badge
                            variant="secondary"
                            className={`text-xs no-default-hover-elevate no-default-active-elevate ${
                              ini.prioridade === "alta" ? "text-red-700 bg-red-100 dark:bg-red-950/40 dark:text-red-300" :
                              ini.prioridade === "média" ? "text-yellow-700 bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300" :
                              ""
                            }`}
                          >
                            {ini.prioridade}
                          </Badge>
                        )}
                        {ini.status && (
                          <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
                            {ini.status}
                          </Badge>
                        )}
                        {ini.prazo && (
                          <span className="text-xs text-muted-foreground self-center">{ini.prazo}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── 9. Cenários Estratégicos ── */}
        {cenarios.length > 0 && (
          <section data-testid="section-cenarios">
            <SectionHeader icon={CloudLightning} title="Cenários Estratégicos" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["pessimista", "base", "otimista"] as const).map((tipo) => {
                const c = cenarios.find((x: any) => x.tipo === tipo);
                if (!c) return null;
                const cfg = CENARIO_CONFIG[tipo];
                let premissas: string[] = [];
                try { premissas = JSON.parse(c.premissas || "[]"); } catch {}
                return (
                  <Card key={tipo} className={`${cfg.bg} ${cfg.border}`}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      {c.titulo && <CardTitle className="text-sm mt-1">{c.titulo}</CardTitle>}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      {c.descricao && <p className="text-sm leading-snug">{c.descricao}</p>}
                      {premissas.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Premissas</p>
                          <ul className="space-y-1">
                            {premissas.map((p: string, i: number) => (
                              <li key={i} className="flex gap-1.5 items-start text-xs text-muted-foreground">
                                <div className="h-1 w-1 rounded-full bg-current mt-1.5 flex-shrink-0 opacity-60" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {c.respostaEstrategica && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Como a empresa se adapta</p>
                          <p className="text-xs leading-snug">{c.respostaEstrategica}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* footer */}
        <div className="border-t pt-8 text-center space-y-1 pb-4">
          <p className="text-xs text-muted-foreground">
            Plano estratégico gerado com <span className="font-semibold text-foreground">BizGuideAI</span> · Visualização somente leitura
          </p>
          <p className="text-xs text-muted-foreground">bizguideai.org</p>
        </div>

      </div>
    </div>
  );
}

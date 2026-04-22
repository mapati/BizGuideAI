import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["target"],
      ["rel"],
    ],
  },
};

interface AssistantMarkdownProps {
  content: string;
  className?: string;
}

function isInternalHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (typeof window !== "undefined") {
    try {
      const url = new URL(href, window.location.origin);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return false;
}

function toInternalPath(href: string): string {
  if (href.startsWith("/")) return href;
  try {
    const url = new URL(href, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task #284 (Step 9) — Citações [tipo:id] viram Badges clicáveis
//
// O system prompt (server/routes.ts) instrui o LLM a marcar entidades do
// catálogo como `[tipo:id]` IMEDIATAMENTE depois do nome humano. Aqui
// transformamos esses marcadores em pequenos Badges que navegam para o item.
// Tipos suportados (espelham TIPO_ROTA_ABRIR em server/assistant-tools.ts):
//
//   indicador → /indicadores?editar=<id>
//   iniciativa → /iniciativas?editar=<id>
//   objetivo → /okrs?editar=<id>
//   kr → /okrs?editar=<id>&tipo=kr
//   risco → /riscos?editar=<id>
//   oportunidade → /oportunidades-crescimento?editar=<id>
//   estrategia → /estrategias?editar=<id>
//
// O regex é tolerante: aceita id no formato UUID (a-f0-9 + hifens) com
// pelo menos 4 caracteres, para suportar tanto UUID completo quanto
// abreviações que possam aparecer no streaming parcial. Não-matches viram
// texto cru (não quebramos a saída do LLM se ele errar a sintaxe).
// ─────────────────────────────────────────────────────────────────────────────
export type CitacaoTipo =
  | "indicador"
  | "iniciativa"
  | "objetivo"
  | "kr"
  | "risco"
  | "oportunidade"
  | "estrategia"
  | "bmc"
  | "cenario"
  | "bsc"
  | "swot"
  | "pestel"
  | "forca";

export const CITACAO_LABEL: Record<CitacaoTipo, string> = {
  indicador: "Indicador",
  iniciativa: "Iniciativa",
  objetivo: "Objetivo",
  kr: "Meta",
  risco: "Risco",
  oportunidade: "Oportunidade",
  estrategia: "Estratégia",
  bmc: "BMC",
  cenario: "Cenário",
  bsc: "Mapa BSC",
  swot: "SWOT",
  pestel: "PESTEL",
  forca: "Força",
};

export function citacaoToHref(tipo: CitacaoTipo, id: string): string {
  const usp = new URLSearchParams({ editar: id });
  switch (tipo) {
    case "indicador":
      return `/indicadores?${usp.toString()}`;
    case "iniciativa":
      return `/iniciativas?${usp.toString()}`;
    case "objetivo":
      return `/okrs?${usp.toString()}`;
    case "kr":
      usp.set("tipo", "kr");
      return `/okrs?${usp.toString()}`;
    case "risco":
      return `/riscos?${usp.toString()}`;
    case "oportunidade":
      return `/oportunidades-crescimento?${usp.toString()}`;
    case "estrategia":
      return `/estrategias?${usp.toString()}`;
    case "bmc":
      return `/modelo-negocio?${usp.toString()}`;
    case "cenario":
      return `/cenarios?${usp.toString()}`;
    case "bsc":
      // BSC é uma página única (não navega por id de relação).
      return `/mapa-bsc`;
    case "swot":
      return `/swot?${usp.toString()}`;
    case "pestel":
      return `/pestel?${usp.toString()}`;
    case "forca":
      return `/cinco-forcas?${usp.toString()}`;
  }
}

const TIPOS_CIT = "indicador|iniciativa|objetivo|kr|risco|oportunidade|estrategia|bmc|cenario|bsc|swot|pestel|forca";
// Aceita UUID-ish (4+ chars hex/hifen). Não engole o colchete final.
const CITACAO_REGEX = new RegExp(`\\[(${TIPOS_CIT}):([a-f0-9][a-f0-9-]{3,})\\]`, "gi");

export interface CitacaoParsed {
  tipo: CitacaoTipo;
  id: string;
  href: string;
  raw: string;
  index: number;
}

// Helper exportado para testes unitários — extrai todas as citações de um
// texto cru (mesma lógica usada pelo walker, mas sem React).
export function parseCitacoes(text: string): CitacaoParsed[] {
  const out: CitacaoParsed[] = [];
  const re = new RegExp(CITACAO_REGEX.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const tipo = m[1].toLowerCase() as CitacaoTipo;
    const id = m[2];
    out.push({ tipo, id, href: citacaoToHref(tipo, id), raw: m[0], index: m.index });
  }
  return out;
}

interface CitacaoBadgeProps {
  tipo: CitacaoTipo;
  id: string;
  onNavigate: (href: string) => void;
}

function CitacaoBadge({ tipo, id, onNavigate }: CitacaoBadgeProps) {
  const href = citacaoToHref(tipo, id);
  const label = CITACAO_LABEL[tipo];
  // Renderizamos como <span> (não <Badge>, que é <div>) porque o walker
  // injeta este componente dentro de <p>/<strong>/<em> — nesting de div
  // dentro desses inline elements quebra o HTML e pode disparar warnings
  // de hidratação. As classes abaixo replicam o visual do Badge secondary
  // de forma inline-segura.
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("biz-assistant:close"));
        }
        setTimeout(() => onNavigate(href), 200);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("biz-assistant:close"));
          }
          setTimeout(() => onNavigate(href), 200);
        }
      }}
      className={cn(
        "mx-0.5 inline-flex items-center align-baseline whitespace-nowrap",
        "rounded-md border border-transparent bg-secondary text-secondary-foreground",
        "px-1.5 py-0 text-[10px] font-semibold leading-4",
        "cursor-pointer hover-elevate active-elevate-2",
      )}
      title={`Abrir ${label.toLowerCase()}`}
      data-testid={`badge-citacao-${tipo}-${id}`}
    >
      {label}
    </span>
  );
}

// Quebra uma string em pedaços (texto + Badges) substituindo cada
// ocorrência de [tipo:id]. Retorna um array de ReactNodes para inserir
// em qualquer parágrafo/li/strong onde houver texto puro.
function renderCitacoes(text: string, onNavigate: (href: string) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  // Reset stateful regex (g flag).
  CITACAO_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITACAO_REGEX.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tipo = m[1].toLowerCase() as CitacaoTipo;
    const id = m[2];
    out.push(
      <CitacaoBadge key={`cit-${i}-${id}`} tipo={tipo} id={id} onNavigate={onNavigate} />,
    );
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Walker recursivo: aplica renderCitacoes em strings dentro da árvore React
// do markdown, preservando quaisquer outros nós (strong/em/code/links).
function transformChildren(
  children: ReactNode,
  onNavigate: (href: string) => void,
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      const parts = renderCitacoes(child, onNavigate);
      return parts.length === 1 ? parts[0] : parts;
    }
    if (isValidElement(child)) {
      // Não mexer em código (preserva sintaxe literal) nem em links já formatados.
      const tag = (child.type as { name?: string } | string);
      const tagName = typeof tag === "string" ? tag : "";
      if (tagName === "code" || tagName === "a") return child;
      const childProps = child.props as { children?: ReactNode };
      if (childProps?.children !== undefined) {
        return {
          ...child,
          props: { ...childProps, children: transformChildren(childProps.children, onNavigate) },
        };
      }
    }
    return child;
  });
}

export function AssistantMarkdown({ content, className }: AssistantMarkdownProps) {
  const [, setLocation] = useLocation();
  const navigate = (href: string) => setLocation(href);

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words",
        "prose-p:my-1.5 prose-p:leading-relaxed",
        "prose-ul:my-1.5 prose-ul:pl-5 prose-ol:my-1.5 prose-ol:pl-5",
        "prose-li:my-0.5",
        "prose-headings:my-2 prose-headings:font-semibold",
        "prose-h1:text-base prose-h2:text-base prose-h3:text-sm prose-h4:text-sm",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-em:italic",
        "prose-code:rounded prose-code:bg-muted-foreground/15 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none",
        "prose-a:text-primary prose-a:underline prose-a:underline-offset-2",
        "text-foreground",
        className,
      )}
      data-testid="markdown-content"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => {
            const { href, children, ...rest } = props;
            if (href && isInternalHref(href)) {
              const internalHref = toInternalPath(href);
              return (
                <a
                  {...rest}
                  href={internalHref}
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation(internalHref);
                  }}
                >
                  {children}
                </a>
              );
            }
            return (
              <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          // Aplicamos transformChildren em parágrafos, list items e
          // headings — onde tipicamente caem citações. Em <code> e <a>
          // o walker já preserva os filhos sem tocar.
          p: ({ children }) => <p>{transformChildren(children, navigate)}</p>,
          li: ({ children }) => <li>{transformChildren(children, navigate)}</li>,
          strong: ({ children }) => (
            <strong>{transformChildren(children, navigate)}</strong>
          ),
          em: ({ children }) => <em>{transformChildren(children, navigate)}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

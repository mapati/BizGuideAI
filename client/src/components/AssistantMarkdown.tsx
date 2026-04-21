import type { AnchorHTMLAttributes } from "react";
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

export function AssistantMarkdown({ content, className }: AssistantMarkdownProps) {
  const [, setLocation] = useLocation();

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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

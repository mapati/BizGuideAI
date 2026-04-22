import { Badge } from "@/components/ui/badge";
import { Link2, ArrowDown, ArrowUp, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export interface CascataItem {
  id: string;
  titulo: string;
  status?: string;
  href?: string;
  rotulo: string;
}

interface CascataBlockProps {
  upstream?: CascataItem | null;
  downstream: { rotulo: string; itens: CascataItem[] }[];
  orfao?: boolean;
  orfaoMensagem?: string;
}

export function CascataBlock({ upstream, downstream, orfao, orfaoMensagem }: CascataBlockProps) {
  const temAlgo = !!upstream || downstream.some(d => d.itens.length > 0);

  if (!temAlgo && !orfao) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2" data-testid="cascata-block">
      {orfao && (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 rounded px-2 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{orfaoMensagem || "Item não conectado à cascata estratégica."}</span>
        </div>
      )}
      {upstream && (
        <div className="flex items-start gap-2 text-xs flex-wrap min-w-0">
          <ArrowUp className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
          <span className="text-muted-foreground mt-0.5 shrink-0">Origem ({upstream.rotulo}):</span>
          {upstream.href ? (
            <Link href={upstream.href} className="min-w-0 max-w-full">
              <Badge variant="secondary" className="cursor-pointer max-w-full" data-testid={`cascata-upstream-${upstream.id}`}>
                <Link2 className="h-2.5 w-2.5 mr-1 shrink-0" />
                <span className="truncate">{upstream.titulo.length > 40 ? upstream.titulo.slice(0, 40) + "…" : upstream.titulo}</span>
              </Badge>
            </Link>
          ) : (
            <Badge variant="secondary" className="max-w-full" data-testid={`cascata-upstream-${upstream.id}`}>
              <Link2 className="h-2.5 w-2.5 mr-1 shrink-0" />
              <span className="truncate">{upstream.titulo.length > 40 ? upstream.titulo.slice(0, 40) + "…" : upstream.titulo}</span>
            </Badge>
          )}
        </div>
      )}
      {downstream.map((grupo, idx) =>
        grupo.itens.length > 0 ? (
          <div key={idx} className="flex items-start gap-2 text-xs flex-wrap">
            <ArrowDown className="h-3 w-3 text-muted-foreground mt-1" />
            <span className="text-muted-foreground mt-0.5">{grupo.rotulo}:</span>
            <div className="flex flex-wrap gap-1">
              {grupo.itens.slice(0, 4).map(item => (
                item.href ? (
                  <Link key={item.id} href={item.href}>
                    <Badge variant="secondary" className="cursor-pointer" data-testid={`cascata-down-${item.id}`}>
                      {item.titulo.length > 40 ? item.titulo.slice(0, 40) + "…" : item.titulo}
                    </Badge>
                  </Link>
                ) : (
                  <Badge key={item.id} variant="secondary" data-testid={`cascata-down-${item.id}`}>
                    {item.titulo.length > 40 ? item.titulo.slice(0, 40) + "…" : item.titulo}
                  </Badge>
                )
              ))}
              {grupo.itens.length > 4 && (
                <Badge variant="outline">+{grupo.itens.length - 4}</Badge>
              )}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

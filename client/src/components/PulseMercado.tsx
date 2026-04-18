import { useQuery } from "@tanstack/react-query";

interface PulseItem {
  texto: string;
  url?: string;
}

const DOT = (
  <span className="mx-6 text-border select-none" aria-hidden="true">·</span>
);

const STALE_MS = 10 * 60 * 1000; // 10 min — matches server-side cache TTL

export function PulseMercado() {
  const { data: manchetes = [] } = useQuery<PulseItem[]>({
    queryKey: ["/api/pulse-mercado"],
    staleTime: STALE_MS,
  });

  const { data: cotacoes = [] } = useQuery<string[]>({
    queryKey: ["/api/cotacoes"],
    staleTime: STALE_MS,
    refetchInterval: STALE_MS,
  });

  const cotacaoItems: PulseItem[] = cotacoes.map((texto) => ({ texto }));
  const items: PulseItem[] = [...cotacaoItems, ...manchetes];

  if (!items.length) return null;

  const tickerText = items.map((i) => i.texto).join(" · ");

  return (
    <div
      className="ticker-strip flex items-center h-9 border-y overflow-hidden bg-muted/20"
      data-testid="strip-pulse-mercado"
    >
      {/* Label fixo à esquerda */}
      <div className="flex items-center gap-2 px-3 flex-shrink-0 h-full">
        <span
          className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0"
          style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground select-none whitespace-nowrap">
          Pulse
        </span>
        <span className="text-border select-none ml-1" aria-hidden="true">|</span>
      </div>

      {/* Ticker rolante */}
      <div className="flex-1 overflow-hidden h-full flex items-center">
        <div
          className="ticker-track inline-flex items-center gap-0 whitespace-nowrap"
          data-testid="ticker-track"
          aria-label={tickerText}
        >
          {/* Copy 1 + separador inter-cópia + Copy 2 + separador final para loop */}
          <TickerContent items={items} />
          {DOT}
          <TickerContent items={items} aria-hidden />
          {DOT}
        </div>
      </div>
    </div>
  );
}

function TickerContent({
  items,
  "aria-hidden": ariaHidden,
}: {
  items: PulseItem[];
  "aria-hidden"?: true;
}) {
  return (
    <span className="inline-flex items-center" aria-hidden={ariaHidden}>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && DOT}
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-foreground hover:text-foreground/80 underline-offset-2 hover:underline transition-colors"
              data-testid={`link-manchete-${i}`}
            >
              {item.texto}
            </a>
          ) : (
            <span className="text-xs text-foreground">{item.texto}</span>
          )}
        </span>
      ))}
    </span>
  );
}

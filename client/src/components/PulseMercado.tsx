import { useQuery } from "@tanstack/react-query";

const DOT = (
  <span className="mx-6 text-border select-none" aria-hidden="true">·</span>
);

export function PulseMercado() {
  const { data: manchetes = [], isLoading } = useQuery<string[]>({
    queryKey: ["/api/pulse-mercado"],
  });

  if (isLoading) return null;
  if (!manchetes.length) return null;

  const tickerText = manchetes.join(" · ");

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
          <TickerContent manchetes={manchetes} />
          {DOT}
          <TickerContent manchetes={manchetes} aria-hidden />
          {DOT}
        </div>
      </div>
    </div>
  );
}

function TickerContent({
  manchetes,
  "aria-hidden": ariaHidden,
}: {
  manchetes: string[];
  "aria-hidden"?: true;
}) {
  return (
    <span className="inline-flex items-center" aria-hidden={ariaHidden}>
      {manchetes.map((texto, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && DOT}
          <span className="text-xs text-foreground">{texto}</span>
        </span>
      ))}
    </span>
  );
}

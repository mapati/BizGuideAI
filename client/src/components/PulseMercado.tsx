import { useQuery } from "@tanstack/react-query";

interface PulseItem {
  titulo: string;
  resumo: string;
  ultimaAtualizacao: string | null;
}

function truncar(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

const DOT = (
  <span className="mx-6 text-border select-none" aria-hidden="true">·</span>
);

export function PulseMercado() {
  const { data: items = [], isLoading } = useQuery<PulseItem[]>({
    queryKey: ["/api/pulse-mercado"],
  });

  if (isLoading) return null;
  if (!items.length) return null;

  const tickerText = items
    .map((item) => `${item.titulo} — ${truncar(item.resumo, 90)}`)
    .join("   ·   ");

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
          className="ticker-track flex items-center gap-0 whitespace-nowrap"
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
          <span className="text-xs">
            <span className="font-medium text-foreground">{item.titulo}</span>
            <span className="text-muted-foreground"> — {truncar(item.resumo, 90)}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

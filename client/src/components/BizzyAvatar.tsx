import { useId } from "react";
import { cn } from "@/lib/utils";

export type BizzyMode = "guia" | "assistente";

interface BizzyAvatarProps {
  size?: "xs" | "sm" | "md" | "lg";
  mode?: BizzyMode;
  className?: string;
  showModeBadge?: boolean;
}

const SIZE_CLASS: Record<NonNullable<BizzyAvatarProps["size"]>, string> = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

const BADGE_SIZE: Record<NonNullable<BizzyAvatarProps["size"]>, string> = {
  xs: "h-2 w-2 -bottom-0 -right-0",
  sm: "h-2.5 w-2.5 -bottom-0 -right-0",
  md: "h-3 w-3 -bottom-0.5 -right-0.5",
  lg: "h-3.5 w-3.5 -bottom-0.5 -right-0.5",
};

export function BizzyAvatar({
  size = "sm",
  mode = "assistente",
  className,
  showModeBadge = true,
}: BizzyAvatarProps) {
  const isGuia = mode === "guia";
  const reactId = useId();
  const gradientId = `bizzy-grad-${reactId}`;
  const eyeShineId = `bizzy-eye-${reactId}`;

  return (
    <span
      className={cn("relative inline-flex flex-shrink-0", SIZE_CLASS[size], className)}
      data-testid={`avatar-bizzy-${mode}`}
      aria-label={isGuia ? "Bizzy no modo Guia" : "Bizzy no modo Assistente"}
    >
      <svg
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-sm"
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {isGuia ? (
              <>
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Squircle background */}
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="11"
          ry="11"
          fill={`url(#${gradientId})`}
        />

        {/* Chess rook silhouette */}
        <g fill="hsl(var(--primary-foreground))">
          {/* Crenellated crown (3 battlements with 2 notches) */}
          <path d="M12.5 8 H 16 V 11 H 18.5 V 8 H 21.5 V 11 H 24 V 8 H 27.5 V 14 H 12.5 Z" />
          {/* Collar/ring under the crown */}
          <rect x="11.5" y="14.6" width="17" height="2.4" rx="0.6" />
          {/* Tapered body */}
          <path d="M14 17.6 H 26 L 27 26.4 H 13 Z" />
          {/* Round base disc */}
          <path d="M12 26.6 H 28 A 1.6 1.6 0 0 1 28 29.6 H 12 A 1.6 1.6 0 0 1 12 26.6 Z" />
          {/* Rectangular base plate */}
          <rect x="10.5" y="29.8" width="19" height="2.6" rx="0.5" />
        </g>
      </svg>

      {showModeBadge && (
        <span
          className={cn(
            "absolute rounded-full ring-2 ring-background",
            BADGE_SIZE[size],
            isGuia
              ? "bg-amber-400 dark:bg-amber-300"
              : "bg-emerald-500 dark:bg-emerald-400",
          )}
          title={isGuia ? "modo Guia" : "modo Assistente"}
          data-testid={`badge-bizzy-mode-${mode}`}
        />
      )}
    </span>
  );
}

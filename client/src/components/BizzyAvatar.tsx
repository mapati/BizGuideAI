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

        {/* Chess king silhouette */}
        <g fill="hsl(var(--primary-foreground))">
          {/* Cross on top */}
          <rect x="19.2" y="4" width="1.6" height="5.2" rx="0.3" />
          <rect x="17.4" y="5.6" width="5.2" height="1.6" rx="0.3" />
          {/* Crown bowl */}
          <path d="M14.5 11.2 C 14.5 9.8 16 9 20 9 C 24 9 25.5 9.8 25.5 11.2 L 25.5 16 C 25.5 17.4 23.6 18 20 18 C 16.4 18 14.5 17.4 14.5 16 Z" />
          {/* Collar (two rings) */}
          <rect x="13.4" y="18.2" width="13.2" height="1.6" rx="0.3" />
          <rect x="12.6" y="20.2" width="14.8" height="1.8" rx="0.4" />
          {/* Tapered body */}
          <path d="M14.6 22.4 H 25.4 L 26.6 28.2 H 13.4 Z" />
          {/* Round base bowl */}
          <path d="M11.8 28.4 H 28.2 A 2 2 0 0 1 28.2 31.6 H 11.8 A 2 2 0 0 1 11.8 28.4 Z" />
          {/* Rectangular base plate */}
          <rect x="10.5" y="31.8" width="19" height="2" rx="0.4" />
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

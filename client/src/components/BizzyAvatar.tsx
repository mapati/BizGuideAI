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
          <radialGradient id={eyeShineId} cx="0.35" cy="0.35" r="0.6">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0.85" />
          </radialGradient>
        </defs>

        {/* Squircle body */}
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="11"
          ry="11"
          fill={`url(#${gradientId})`}
        />

        {/* Antenna dot — gives it a friendly "agent" feel */}
        <circle cx="20" cy="5.5" r="1.6" fill="hsl(var(--primary))" opacity="0.55" />
        <line
          x1="20"
          y1="6.8"
          x2="20"
          y2="9"
          stroke="hsl(var(--primary-foreground))"
          strokeOpacity="0.55"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Eyes — friendly face */}
        <circle cx="14.5" cy="20" r="3" fill={`url(#${eyeShineId})`} />
        <circle cx="25.5" cy="20" r="3" fill={`url(#${eyeShineId})`} />
        <circle cx="14.8" cy="20.3" r="1.3" fill="hsl(var(--primary))" />
        <circle cx="25.8" cy="20.3" r="1.3" fill="hsl(var(--primary))" />

        {/* Smile */}
        <path
          d="M14 27 Q20 31 26 27"
          stroke="hsl(var(--primary-foreground))"
          strokeOpacity="0.85"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
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

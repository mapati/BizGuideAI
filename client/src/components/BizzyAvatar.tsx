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

        {/* Chess knight silhouette */}
        <g
          fill="hsl(var(--primary-foreground))"
          stroke="hsl(var(--primary-foreground))"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeWidth="0.6"
        >
          {/* Horse head + neck */}
          <path d="M22 9 C 25 10 27.5 12.5 28 16 C 28.4 19 28.6 22 28.8 25 L 29.4 28 L 13 28 C 12.6 25.5 13.4 23 15.4 21.4 C 14 21 13 19.6 13.2 18 C 13.4 16.2 14.6 15 16.2 14.6 L 15.4 12.6 L 17 13 L 18 11 L 19.4 13 C 20.4 12.4 21.2 11.4 21.6 10.2 Z" />
          {/* Base plate */}
          <rect x="11.5" y="28" width="17" height="2.2" rx="0.4" />
          <rect x="10.5" y="30.2" width="19" height="2.4" rx="0.5" />
          {/* Eye */}
          <circle cx="22" cy="15.6" r="0.95" fill="hsl(var(--primary))" stroke="none" />
          {/* Mouth/nostril notch */}
          <path d="M27.4 17.2 L 28.4 16.2" stroke="hsl(var(--primary))" strokeOpacity="0.6" strokeWidth="0.9" />
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

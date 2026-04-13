import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface PrerequisiteWarningProps {
  titulo: string;
  descricao: string;
  linkLabel: string;
  linkHref: string;
  variante?: "aviso" | "info";
}

export function PrerequisiteWarning({
  titulo,
  descricao,
  linkLabel,
  linkHref,
  variante = "aviso",
}: PrerequisiteWarningProps) {
  return (
    <Card
      className={`p-4 mb-6 flex items-start gap-3 ${
        variante === "aviso"
          ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20"
          : "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20"
      }`}
      data-testid="card-prerequisite-warning"
    >
      <AlertTriangle
        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
          variante === "aviso"
            ? "text-amber-600 dark:text-amber-400"
            : "text-blue-600 dark:text-blue-400"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            variante === "aviso"
              ? "text-amber-800 dark:text-amber-300"
              : "text-blue-800 dark:text-blue-300"
          }`}
        >
          {titulo}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            variante === "aviso"
              ? "text-amber-700/80 dark:text-amber-400/80"
              : "text-blue-700/80 dark:text-blue-400/80"
          }`}
        >
          {descricao}
        </p>
      </div>
      <Link href={linkHref}>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0"
          data-testid="button-prerequisite-link"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </Link>
    </Card>
  );
}

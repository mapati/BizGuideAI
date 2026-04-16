import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS } from "@shared/schema";

export function usePlano() {
  const { empresa, trialInfo, planoInfo } = useAuth();
  const planoTipo = (empresa?.planoTipo ?? "start") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[planoTipo] ?? PLAN_LIMITS.start;

  return {
    planoTipo,
    maxUsuarios: limits.maxUsuarios,
    aiTier: limits.aiTier,
    canInviteUsers: limits.maxUsuarios > 1,
    isPro: planoTipo === "pro" || planoTipo === "enterprise",
    isEnterprise: planoTipo === "enterprise",
    isTrial: trialInfo?.planoStatus === "trial" || empresa?.planoStatus === "trial",
    planoInfo,
  };
}

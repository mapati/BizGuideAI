// Task #248 — Helper compartilhado para separar diagnóstico inicial
// (perspectiva = "diagnostico") dos indicadores de acompanhamento (BSC).
//
// Use em qualquer widget/contador/alerta de monitoramento contínuo
// (Home, Assistente, Rastreabilidade, Exportação etc.). Os fluxos de
// diagnóstico inicial (Diagnóstico Atual, Diagnóstico Estratégico, geração
// de SWOT/estratégias/iniciativas) e a etapa "diagnostico" da jornada
// continuam usando a lista completa.
//
// O backend já tem o equivalente em `storage.getIndicadoresAcompanhamento`.

export const PERSPECTIVA_DIAGNOSTICO = "diagnostico";

export function isIndicadorAcompanhamento<T extends { perspectiva?: string | null }>(
  indicador: T
): boolean {
  return indicador.perspectiva !== PERSPECTIVA_DIAGNOSTICO;
}

export function filterAcompanhamento<T extends { perspectiva?: string | null }>(
  indicadores: T[]
): T[] {
  return indicadores.filter(isIndicadorAcompanhamento);
}

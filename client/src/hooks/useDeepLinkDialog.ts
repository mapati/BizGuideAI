import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

export interface DeepLinkDialogParams {
  novo: boolean;
  editar: string | null;
  params: Record<string, string>;
}

function parseSearch(search: string): DeepLinkDialogParams {
  const usp = new URLSearchParams(search);
  const novo = usp.get("novo") === "1" || usp.get("novo") === "true";
  const editar = usp.get("editar");
  const params: Record<string, string> = {};
  usp.forEach((v, k) => {
    if (k === "novo" || k === "editar") return;
    params[k] = v;
  });
  return { novo, editar, params };
}

/**
 * Reads ?novo=1 / ?editar=<id> + extra query params from the URL once and
 * invokes the handler. The handler should return true when the deep link was
 * fully consumed (e.g. the target entity was found and the dialog opened);
 * only then is the query string cleared. Returning false leaves the URL
 * untouched so a later render — once data is loaded — can retry.
 *
 * Pass a `ready` flag that becomes true only when all data needed to honor
 * the deep link is available (typically `!!empresa?.id && !isLoading`).
 */
export function useDeepLinkDialog(
  ready: boolean,
  handler: (params: DeepLinkDialogParams) => boolean | void,
): void {
  const [, setLocation] = useLocation();
  const consumedRef = useRef(false);

  useEffect(() => {
    if (!ready || consumedRef.current) return;
    if (typeof window === "undefined") return;
    const search = window.location.search;
    if (!search) return;
    const parsed = parseSearch(search);
    if (!parsed.novo && !parsed.editar) return;

    const ok = handler(parsed);
    if (ok === false) return;

    consumedRef.current = true;
    const path = window.location.pathname;
    setLocation(path, { replace: true });
  }, [ready, handler, setLocation]);
}

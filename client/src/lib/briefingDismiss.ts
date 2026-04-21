const STORAGE_KEY = "biz-guide-briefing-dispensado-em";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isBriefingDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === todayKey();
  } catch {
    return false;
  }
}

export function dismissBriefingForToday(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, todayKey());
    window.dispatchEvent(new CustomEvent("biz-guide:briefing-dispensado"));
  } catch {
    // ignore
  }
}

export function clearBriefingDismiss(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("biz-guide:briefing-dispensado"));
  } catch {
    // ignore
  }
}

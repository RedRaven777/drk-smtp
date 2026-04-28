export const ADMIN_UNLOCK_STORAGE_KEY = "admin_tab_unlock";
export const ADMIN_UNLOCK_TTL_MS = 5 * 60 * 1000;

export type AdminTabUnlockPayload = {
  unlockedAt: number;
};

export function writeAdminTabUnlock() {
  if (typeof window === "undefined") return;

  const payload: AdminTabUnlockPayload = {
    unlockedAt: Date.now(),
  };

  window.sessionStorage.setItem(
    ADMIN_UNLOCK_STORAGE_KEY,
    JSON.stringify(payload)
  );
}

export function clearAdminTabUnlock() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY);
}

export function hasValidAdminTabUnlock(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = window.sessionStorage.getItem(ADMIN_UNLOCK_STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as AdminTabUnlockPayload;

    if (!parsed || typeof parsed.unlockedAt !== "number") {
      return false;
    }

    const age = Date.now() - parsed.unlockedAt;
    return age >= 0 && age <= ADMIN_UNLOCK_TTL_MS;
  } catch {
    return false;
  }
}
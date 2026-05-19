import "server-only";

export function toCleanString(value: unknown) {
  return String(value ?? "").trim();
}

export function toCleanLowercaseString(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidTotpCode(value: string) {
  return /^\d{6}$/.test(value);
}

export function isValidPort(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}
import type { Settings } from "./types";

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Hora atual em Brasília, em minutos desde 00:00. */
export function nowMinutesBR(date = new Date()) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function isOpenNow(s: Pick<Settings, "openTime" | "closeTime" | "storeMode">, date = new Date()) {
  if (s.storeMode === "open") return true;
  if (s.storeMode === "closed") return false;
  const now = nowMinutesBR(date);
  const open = toMinutes(s.openTime);
  const close = toMinutes(s.closeTime);
  return open < close ? now >= open && now < close : now >= open || now < close;
}

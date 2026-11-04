import type { Settings } from "./types";

/**
 * Gera o "Pix copia e cola" (BR Code estático, padrão do Banco Central) com valor e identificador do pedido.
 * O pagamento é confirmado manualmente no painel até a integração com um provedor (fase 2).
 */

const f = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const ascii = (s: string, max: number) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();

export function normalizePixKey(key: string, type: Settings["pixKeyType"]) {
  const k = key.trim();
  if (type === "phone") {
    const d = k.replace(/\D/g, "").replace(/^55/, "");
    return `+55${d}`;
  }
  if (type === "cpf" || type === "cnpj") return k.replace(/\D/g, "");
  if (type === "email") return k.toLowerCase();
  return k;
}

export function buildPixPayload(opts: { key: string; type: Settings["pixKeyType"]; holder: string; city: string; amount: number; txid: string }) {
  const key = normalizePixKey(opts.key, opts.type);
  const merchant = f("00", "br.gov.bcb.pix") + f("01", key);
  const txid = opts.txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const body =
    f("00", "01") +
    f("01", "12") +
    f("26", merchant) +
    f("52", "0000") +
    f("53", "986") +
    f("54", opts.amount.toFixed(2)) +
    f("58", "BR") +
    f("59", ascii(opts.holder, 25) || "XBOM LANCHES") +
    f("60", ascii(opts.city, 15) || "BRASIL") +
    f("62", f("05", txid)) +
    "6304";
  return body + crc16(body);
}

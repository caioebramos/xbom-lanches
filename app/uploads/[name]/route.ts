import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/** Serve as fotos enviadas pelo painel (ficam em data/uploads, fora de /public). */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)) return new Response("Not found", { status: 404 });
  const file = path.join(DATA_DIR, "uploads", name);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(file), {
    headers: { "content-type": TYPES[path.extname(name)] ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" },
  });
}

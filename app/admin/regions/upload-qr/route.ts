import { NextResponse } from "next/server";
import { getMyAdminContext } from "../../../lib/admin/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

export async function POST(req: Request) {
  const ctx = await getMyAdminContext();
  if (!ctx.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!ctx.isSuper) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ message: "Bad form data" }, { status: 400 });

  const region_id = String(form.get("region_id") ?? "").trim();
  const file = form.get("file") as File | null;
  if (!region_id) return NextResponse.json({ message: "region_id required" }, { status: 400 });
  if (!file) return NextResponse.json({ message: "file required" }, { status: 400 });

  const maxMB = 2;
  if (file.size > maxMB * 1024 * 1024) {
    return NextResponse.json({ message: `QR too large. Max ${maxMB}MB.` }, { status: 400 });
  }

  const ext = extFromMime(file.type);
  const path = `regions/${region_id}.${ext}`;

  const buf = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from("region-qr")
    .upload(path, buf, { contentType: file.type, upsert: true });

  if (upErr) return NextResponse.json({ message: upErr.message }, { status: 500 });

  const { error: dbErr } = await supabase
    .from("regions")
    .update({ qr_path: path })
    .eq("id", region_id);

  if (dbErr) return NextResponse.json({ message: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}

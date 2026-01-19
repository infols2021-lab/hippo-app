import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { getMyAdminContext } from "../../../lib/admin/server";

export const runtime = "nodejs";

function extFromPath(path: string) {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "bin";
}

export async function POST(req: Request) {
  const ctx = await getMyAdminContext();
  if (!ctx.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!ctx.isSuper && ctx.regionIds.length === 0) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const region_id = body?.region_id ? String(body.region_id) : null;
  const ids: string[] = Array.isArray(body?.application_ids) ? body.application_ids.map(String) : [];

  const gasUrl = process.env.GAS_EXPORT_URL;
  const gasSecret = process.env.GAS_EXPORT_SECRET;
  if (!gasUrl || !gasSecret) {
    return NextResponse.json({ message: "GAS_EXPORT_URL / GAS_EXPORT_SECRET not set" }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();

  // 1) берём заявки в рамках доступа (RLS)
  let q = supabase
    .from("applications_with_candidate")
    .select("id,app_no,region_id,candidate_full_name");

  if (region_id && region_id !== "all") q = q.eq("region_id", region_id);
  if (ids.length) q = q.in("id", ids);

  const { data: apps, error: aErr } = await q.order("created_at", { ascending: false }).limit(500);
  if (aErr) return NextResponse.json({ message: aErr.message }, { status: 500 });
  if (!apps?.length) return NextResponse.json({ message: "No applications found" }, { status: 400 });

  const appIds = apps.map((a: any) => a.id);

  // 2) берём файлы заявок (RLS)
  const { data: files, error: fErr } = await supabase
    .from("application_files")
    .select("application_id,file_type,storage_path")
    .in("application_id", appIds);

  if (fErr) return NextResponse.json({ message: fErr.message }, { status: 500 });

  const appMeta = new Map<string, any>();
  for (const a of apps) appMeta.set(a.id, a);

  // 3) генерим signed URLs сервисным ключом
  const admin = createSupabaseAdminClient();

  const items: any[] = [];
  for (const f of files ?? []) {
    // only what GAS needs
    const a = appMeta.get(f.application_id);
    if (!a) continue;

    const { data: signed, error: sErr } = await admin.storage
      .from("documents")
      .createSignedUrl(f.storage_path, 300);

    if (sErr || !signed?.signedUrl) continue;

    items.push({
      signed_url: signed.signedUrl,
      region_id: a.region_id,
      file_type: f.file_type, // payment / candidate_doc / parent_doc
      app_no: a.app_no,
      candidate_name: a.candidate_full_name || "Кандидат",
      ext: extFromPath(f.storage_path),
    });
  }

  // 4) отправляем в GAS
  const resp = await fetch(`${gasUrl}?secret=${encodeURIComponent(gasSecret)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region_id: region_id ?? "all", items }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return NextResponse.json({ message: "GAS error", details: text }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: items.length, gas: text });
}

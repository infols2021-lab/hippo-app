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
  const region_id = body?.region_id ? String(body.region_id) : "all";
  const ids: string[] = Array.isArray(body?.application_ids) ? body.application_ids.map(String) : [];

  const gasUrl = process.env.GAS_EXPORT_URL;
  const gasSecret = process.env.GAS_EXPORT_SECRET;
  if (!gasUrl || !gasSecret) {
    return NextResponse.json({ message: "GAS_EXPORT_URL / GAS_EXPORT_SECRET not set" }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();

  // 1) Берём заявки в рамках прав (RLS)
  let q = supabase
    .from("applications_with_candidate")
    .select("id,app_no,region_id,candidate_full_name");

  if (ids.length) {
    q = q.in("id", ids);
  } else if (region_id !== "all") {
    q = q.eq("region_id", region_id);
  }

  const { data: apps, error: aErr } = await q.order("created_at", { ascending: false }).limit(800);
  if (aErr) return NextResponse.json({ message: aErr.message }, { status: 500 });
  if (!apps?.length) return NextResponse.json({ message: "No applications found" }, { status: 400 });

  const appIds = apps.map((a: any) => a.id);

  // 2) файлы заявок (RLS)
  const { data: files, error: fErr } = await supabase
    .from("application_files")
    .select("application_id,file_type,storage_path")
    .in("application_id", appIds);

  if (fErr) return NextResponse.json({ message: fErr.message }, { status: 500 });

  const appMeta = new Map<string, any>();
  for (const a of apps) appMeta.set(a.id, a);

  // 3) Signed URL (service role)
  const admin = createSupabaseAdminClient();

  const items: any[] = [];
  for (const f of files ?? []) {
    const a = appMeta.get(f.application_id);
    if (!a) continue;

    const { data: signed, error: sErr } = await admin.storage
      .from("documents")
      .createSignedUrl(f.storage_path, 300);

    if (sErr || !signed?.signedUrl) continue;

    items.push({
      application_id: f.application_id,
      signed_url: signed.signedUrl,
      region_id: a.region_id,
      file_type: f.file_type, // payment/candidate_doc/parent_doc
      app_no: a.app_no,
      candidate_name: a.candidate_full_name || "Кандидат",
      ext: extFromPath(f.storage_path),
    });
  }

  // 4) Отправляем в GAS
  const resp = await fetch(`${gasUrl}?secret=${encodeURIComponent(gasSecret)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region_id, items }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return NextResponse.json({ message: "GAS error", details: text }, { status: 500 });
  }

  // 5) Пишем статус “экспортировано” в applications (для удобства, можно экспортить повторно)
  const now = new Date().toISOString();
  const perAppCount = new Map<string, number>();
  for (const it of items) {
    perAppCount.set(it.application_id, (perAppCount.get(it.application_id) ?? 0) + 1);
  }

  // Одним апдейтом всем: время/кто/результат
  // count ставим позже отдельными апдейтами (простота > идеал)
  const { error: uErr } = await supabase
    .from("applications")
    .update({
      drive_exported_at: now,
      drive_exported_by: ctx.user.id,
      drive_exported_result: { raw: text },
      drive_exported_count: null,
    })
    .in("id", appIds);

  if (uErr) {
    // экспорт уже сделал, но метку не записали
    return NextResponse.json({ ok: true, sent: items.length, gas: text, warn: uErr.message });
  }

  // Запишем count по каждой заявке (не обязательно, но полезно)
  for (const [appId, cnt] of perAppCount.entries()) {
    await supabase.from("applications").update({ drive_exported_count: cnt }).eq("id", appId);
  }

  return NextResponse.json({ ok: true, sent: items.length, gas: text, apps: appIds.length });
}

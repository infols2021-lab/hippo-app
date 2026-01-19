import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_TYPES = new Set(["payment", "candidate_doc", "parent_doc"]);

function safeExtFromMime(mime: string | null) {
  if (!mime) return "bin";
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

function isLocked(app: any) {
  // жёсткая блокировка:
  if (app.verified_at) return true;
  const pay = app.payment_verified === true;
  const cand = app.candidate_doc_verified === true;
  const parentOk = app.parent_doc_verified === null || app.parent_doc_verified === true;
  return pay && cand && parentOk;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ message: "Bad form data" }, { status: 400 });

  const application_id = String(form.get("application_id") ?? "");
  const file_type = String(form.get("file_type") ?? "");
  const file = form.get("file") as File | null;

  if (!UUID_RE.test(application_id)) return NextResponse.json({ message: "application_id must be uuid" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file_type)) return NextResponse.json({ message: "Bad file_type" }, { status: 400 });
  if (!file) return NextResponse.json({ message: "file required" }, { status: 400 });

  const maxMB = 3;
  if (file.size > maxMB * 1024 * 1024) {
    return NextResponse.json({ message: `File too large. Max ${maxMB}MB.` }, { status: 400 });
  }

  const { data: app, error: aErr } = await supabase
    .from("applications")
    .select("id, owner_user_id, verified_at, payment_verified, candidate_doc_verified, parent_doc_verified")
    .eq("id", application_id)
    .single();

  if (aErr || !app) return NextResponse.json({ message: "Application not found" }, { status: 404 });
  if (app.owner_user_id !== u.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  if (isLocked(app)) return NextResponse.json({ message: "Заявка подтверждена. Изменение документов запрещено." }, { status: 403 });

  const ext = safeExtFromMime(file.type);
  const path = `users/${u.user.id}/applications/${application_id}/${file_type}.${ext}`;

  const buf = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage.from("documents").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (upErr) return NextResponse.json({ message: upErr.message }, { status: 500 });

  const { error: dbErr } = await supabase
    .from("application_files")
    .upsert(
      {
        application_id,
        file_type,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        source_type: "manual",
        source_id: null,
      },
      { onConflict: "application_id,file_type" }
    );

  if (dbErr) return NextResponse.json({ message: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}

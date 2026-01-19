import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

function extFromMime(mime: string) {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ message: "Bad form" }, { status: 400 });

  const candidate_id = String(form.get("candidate_id") ?? "");
  const file = form.get("file") as File | null;

  if (!candidate_id) return NextResponse.json({ message: "candidate_id required" }, { status: 400 });
  if (!file) return NextResponse.json({ message: "file required" }, { status: 400 });

  const { data: cand, error: cErr } = await supabase
    .from("candidates")
    .select("id,owner_user_id")
    .eq("id", candidate_id)
    .single();

  if (cErr || !cand) return NextResponse.json({ message: "Candidate not found" }, { status: 404 });
  if (cand.owner_user_id !== u.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const maxMB = 5;
  if (file.size > maxMB * 1024 * 1024) return NextResponse.json({ message: `Max ${maxMB}MB` }, { status: 400 });

  const docId = crypto.randomUUID();
  const ext = extFromMime(file.type);
  const path = `users/${u.user.id}/candidate-docs/${candidate_id}/${docId}.${ext}`;

  const buf = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage.from("documents").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ message: upErr.message }, { status: 500 });

  const { error: dbErr } = await supabase.from("candidate_documents").insert({
    candidate_id,
    owner_user_id: u.user.id,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
  });

  if (dbErr) return NextResponse.json({ message: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}

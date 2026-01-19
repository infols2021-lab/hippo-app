import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

  // Находим документ (RLS гарантирует, что чужой не прочитаешь)
  const { data: doc, error: dErr } = await supabase
    .from("parent_documents")
    .select("id,owner_user_id,storage_path")
    .eq("id", id)
    .single();

  if (dErr || !doc) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (doc.owner_user_id !== u.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  // ВАЖНО: если этот документ уже использовался в заявках (snapshot), лучше НЕ удалять файл из storage,
  // иначе старые заявки потеряют просмотр. Поэтому:
  // - удаляем только запись из parent_documents
  // - файл в storage оставляем (можно потом чистить вручную/скриптом).
  const { error: delErr } = await supabase.from("parent_documents").delete().eq("id", id);
  if (delErr) return NextResponse.json({ message: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

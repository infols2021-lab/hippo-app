import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ageFromBirthdate(b: string) {
  const d = new Date(b);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const candidate_kind = body?.candidate_kind ? String(body.candidate_kind) : null;
  const candidate_ref = body?.candidate_ref ? String(body.candidate_ref) : null;
  const parent_doc_id = body?.parent_doc_id ? String(body.parent_doc_id) : null;

  if (candidate_kind !== "profile" && candidate_kind !== "extra") {
    return NextResponse.json({ message: "candidate_kind must be profile|extra" }, { status: 400 });
  }
  if (!candidate_ref || !UUID_RE.test(candidate_ref)) {
    return NextResponse.json({ message: "candidate_ref must be uuid" }, { status: 400 });
  }
  if (parent_doc_id && !UUID_RE.test(parent_doc_id)) {
    return NextResponse.json({ message: "parent_doc_id must be uuid" }, { status: 400 });
  }

  // region_id всегда берём из выбранного кандидата
  let region_id: string | null = null;
  let birthdate: string | null = null;

  if (candidate_kind === "profile") {
    if (candidate_ref !== u.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("region_id, full_name, birthdate")
      .eq("user_id", u.user.id)
      .single();

    if (pErr || !p?.region_id) return NextResponse.json({ message: "В профиле не выбран регион." }, { status: 400 });
    if (!p.full_name || !p.birthdate) return NextResponse.json({ message: "Заполни в профиле ФИО и дату рождения." }, { status: 400 });

    region_id = p.region_id;
    birthdate = String(p.birthdate);
  } else {
    const { data: c, error: cErr } = await supabase
      .from("candidates")
      .select("id, owner_user_id, region_id, birthdate")
      .eq("id", candidate_ref)
      .single();

    if (cErr || !c) return NextResponse.json({ message: "Кандидат не найден." }, { status: 404 });
    if (c.owner_user_id !== u.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    region_id = c.region_id;
    birthdate = String(c.birthdate);
  }

  if (!region_id) return NextResponse.json({ message: "region missing" }, { status: 400 });

  const needParent = birthdate ? ageFromBirthdate(birthdate) < 14 : false;

  // создаём заявку
  const { data: inserted, error: insErr } = await supabase
    .from("applications")
    .insert({
      owner_user_id: u.user.id,
      region_id,
      candidate_kind,
      candidate_ref,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) return NextResponse.json({ message: insErr?.message ?? "Insert failed" }, { status: 500 });

  const appId = inserted.id;

  // auto attach candidate_doc (если есть)
  if (candidate_kind === "profile") {
    const { data: doc } = await supabase
      .from("profile_candidate_documents")
      .select("id,storage_path,mime_type,size_bytes")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (doc?.storage_path) {
      await supabase.from("application_files").upsert(
        {
          application_id: appId,
          file_type: "candidate_doc",
          storage_path: doc.storage_path,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
          source_type: "profile_candidate",
          source_id: doc.id,
        },
        { onConflict: "application_id,file_type" }
      );
    }
  } else {
    const { data: doc } = await supabase
      .from("candidate_documents")
      .select("id,storage_path,mime_type,size_bytes")
      .eq("candidate_id", candidate_ref)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (doc?.storage_path) {
      await supabase.from("application_files").upsert(
        {
          application_id: appId,
          file_type: "candidate_doc",
          storage_path: doc.storage_path,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
          source_type: "candidate",
          source_id: doc.id,
        },
        { onConflict: "application_id,file_type" }
      );
    }
  }

  // parent doc attach if needed and provided
  if (needParent && parent_doc_id) {
    const { data: pdoc, error: pErr } = await supabase
      .from("parent_documents")
      .select("id,owner_user_id,storage_path,mime_type,size_bytes")
      .eq("id", parent_doc_id)
      .single();

    if (!pErr && pdoc && pdoc.owner_user_id === u.user.id) {
      await supabase.from("application_files").upsert(
        {
          application_id: appId,
          file_type: "parent_doc",
          storage_path: pdoc.storage_path,
          mime_type: pdoc.mime_type,
          size_bytes: pdoc.size_bytes,
          source_type: "parent_profile",
          source_id: pdoc.id,
        },
        { onConflict: "application_id,file_type" }
      );
    }
  }

  return NextResponse.json({ id: appId });
}

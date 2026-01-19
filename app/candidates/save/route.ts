import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_REGIONS = new Set(["bel", "vor", "kur", "tam", "nnov", "lip"]);

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Bad JSON" }, { status: 400 });

  const id = body.id ? String(body.id) : null;
  const full_name = String(body.full_name ?? "").trim();
  const birthdate = String(body.birthdate ?? "").trim();
  const region_id = String(body.region_id ?? "").trim();

  if (!full_name) return NextResponse.json({ message: "ФИО обязательно." }, { status: 400 });
  if (!birthdate) return NextResponse.json({ message: "Дата рождения обязательна." }, { status: 400 });
  if (!ALLOWED_REGIONS.has(region_id)) return NextResponse.json({ message: "Некорректный регион." }, { status: 400 });

  const payload = {
    owner_user_id: userRes.user.id,
    full_name,
    birthdate,
    phone: body.phone ? String(body.phone).trim() : null,
    school: body.school ? String(body.school).trim() : null,
    city: body.city ? String(body.city).trim() : null,
    region_id,
  };

  if (id) {
    const { error } = await supabase.from("candidates").update(payload).eq("id", id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } else {
    const { error } = await supabase.from("candidates").insert(payload);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
}

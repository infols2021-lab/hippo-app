import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

const ALLOWED_REGIONS = new Set(["bel", "vor", "kur", "tam", "nnov", "lip"]);

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes.user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Bad JSON" }, { status: 400 });
  }

  const full_name = String(body.full_name ?? "").trim();
  const phone = body.phone ? String(body.phone).trim() : null;
  const school = body.school ? String(body.school).trim() : null;
  const city = body.city ? String(body.city).trim() : null;
  const birthdate = body.birthdate ? String(body.birthdate) : null;
  const region_id = String(body.region_id ?? "").trim();

  if (!full_name) {
    return NextResponse.json({ message: "ФИО обязательно." }, { status: 400 });
  }
  if (!ALLOWED_REGIONS.has(region_id)) {
    return NextResponse.json({ message: "Некорректный регион." }, { status: 400 });
  }

  // Важно: is_admin НЕ даём менять через фронт вообще.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone,
      school,
      city,
      birthdate,
      region_id,
    })
    .eq("user_id", userRes.user.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

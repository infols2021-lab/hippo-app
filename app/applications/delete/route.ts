import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

  // Проверяем владельца и подтверждение
  const { data: app, error: aErr } = await supabase
    .from("applications")
    .select("id,owner_user_id,verified_at")
    .eq("id", id)
    .single();

  if (aErr || !app) return NextResponse.json({ message: "Application not found" }, { status: 404 });
  if (app.owner_user_id !== u.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  if (app.verified_at) return NextResponse.json({ message: "Заявка подтверждена. Удаление запрещено." }, { status: 403 });

  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

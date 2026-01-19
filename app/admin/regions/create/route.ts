import { NextResponse } from "next/server";
import { getMyAdminContext } from "../../../lib/admin/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await getMyAdminContext();
  if (!ctx.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!ctx.isSuper) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!id || !name) return NextResponse.json({ message: "id and name required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("regions").insert({
    id,
    name,
    is_active: true,
    payment_note: "HIPPO 2026",
  });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

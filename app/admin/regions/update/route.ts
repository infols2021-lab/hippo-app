import { NextResponse } from "next/server";
import { getMyAdminContext } from "../../../lib/admin/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await getMyAdminContext();
  if (!ctx.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!ctx.isSuper) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ message: "id required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("regions")
    .update({
      name: body.name ?? null,
      is_active: body.is_active ?? true,
      payment_receiver: body.payment_receiver ?? null,
      payment_note: body.payment_note ?? null,
      qr_path: body.qr_path ?? null,
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

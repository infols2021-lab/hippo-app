import { NextResponse } from "next/server";
import { getMyAdminContext } from "../../../lib/admin/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await getMyAdminContext();
  if (!ctx.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!ctx.isSuper) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("regions")
    .select("id,name,is_active,payment_receiver,payment_note,qr_path")
    .order("name");

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ regions: data ?? [] });
}

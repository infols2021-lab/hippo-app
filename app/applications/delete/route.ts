import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id ? String(body.id) : null;
  if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

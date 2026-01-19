import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL(req.url);

  // 303 заставляет браузер сделать GET на /login (а не повторить POST)
  return NextResponse.redirect(new URL("/login", url.origin), { status: 303 });
}

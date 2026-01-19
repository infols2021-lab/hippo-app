import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL(req.url);
  return NextResponse.redirect(new URL("/login", url.origin));
}

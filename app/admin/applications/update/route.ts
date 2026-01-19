import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getMyAdminContext } from "../../../lib/admin/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await getMyAdminContext();
  if (!ctx.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  if (!ctx.isSuper && ctx.regionIds.length === 0) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // обновляем галочки
  const payment_verified = body.payment_verified === true;
  const candidate_doc_verified = body.candidate_doc_verified === true;

  // parent_doc_verified может быть null если не требуется
  const parent_doc_verified =
    body.parent_doc_verified === null ? null : body.parent_doc_verified === true;

  // Ставим verified_at только если всё подтверждено (если parent null — он не нужен)
  // Для простоты: если parent_doc_verified === null => считаем “не требуется”
  const isFully =
    payment_verified && candidate_doc_verified && (parent_doc_verified === null ? true : parent_doc_verified === true);

  const update: any = {
    payment_verified,
    candidate_doc_verified,
    parent_doc_verified,
    verified_by: isFully ? ctx.user.id : null,
    verified_at: isFully ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from("applications").update(update).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";

export const runtime = "nodejs";

// GET /files/view?bucket=documents&path=...&application_id=... (optional)
// If application_id provided: allow owner OR admin-by-region (через application_files policies)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket") || "documents";
  const path = url.searchParams.get("path");
  const applicationId = url.searchParams.get("application_id");

  if (!path) {
    return NextResponse.json({ message: "path required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  // Проверка доступа:
  // 1) если это файл заявки — проверяем что он существует в application_files и доступен текущему юзеру/админу через RLS
  if (applicationId) {
    const { data: row, error } = await supabase
      .from("application_files")
      .select("id,application_id,storage_path")
      .eq("application_id", applicationId)
      .eq("storage_path", path)
      .limit(1)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  } else {
    // 2) если это "профильный/кандидатский" документ — разрешаем только владельцу (по пути users/<uid>/...)
    if (!path.startsWith(`users/${u.user.id}/`)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  // Генерируем signed URL сервисным ключом (обходит storage RLS)
  const admin = createSupabaseAdminClient();
  const { data, error: sErr } = await admin.storage.from(bucket).createSignedUrl(path, 60);

  if (sErr || !data?.signedUrl) {
    return NextResponse.json({ message: sErr?.message || "Cannot sign url" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl, 302);
}

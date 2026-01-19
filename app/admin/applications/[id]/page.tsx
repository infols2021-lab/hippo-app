import { redirect } from "next/navigation";
import { Page } from "../../../ui/Layout";
import { getMyAdminContext } from "../../../lib/admin/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import AdminApplicationClient from "./view-client";

export const dynamic = "force-dynamic";

export default async function AdminApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await getMyAdminContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.isSuper && ctx.regionIds.length === 0) redirect("/admin");

  const supabase = await createSupabaseServerClient();

  const { data: app, error } = await supabase
    .from("applications_with_candidate")
    .select("id,owner_user_id,region_id,created_at,payment_verified,candidate_doc_verified,parent_doc_verified,verified_at,verified_by,candidate_full_name,candidate_birthdate")
    .eq("id", id)
    .single();

  if (error || !app) {
    return (
      <Page title="Заявка (админ)" subtitle="Ошибка загрузки" right={<a className="btn" href="/admin/applications">← Назад</a>}>
        <div className="alert alertErr">{error?.message ?? "Не найдена"}</div>
      </Page>
    );
  }

  const { data: files } = await supabase
    .from("application_files")
    .select("file_type,storage_path,created_at")
    .eq("application_id", id);

  return (
    <Page title="Заявка (админ)" subtitle="Проверка документов" right={<a className="btn" href="/admin/applications">← Назад</a>}>
      <AdminApplicationClient app={app} files={files ?? []} />
    </Page>
  );
}

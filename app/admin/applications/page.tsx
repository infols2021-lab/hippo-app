import { redirect } from "next/navigation";
import { Page } from "../../ui/Layout";
import { getMyAdminContext } from "../../lib/admin/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import AdminApplicationsClient from "./view-client";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const ctx = await getMyAdminContext();
  if (!ctx.user) redirect("/login");

  if (!ctx.isSuper && ctx.regionIds.length === 0) redirect("/admin");

  const supabase = await createSupabaseServerClient();

  const { data: regions } = await supabase
    .from("regions")
    .select("id,name,is_active")
    .order("name");

  // Берём заявки: super видит все, регион-админ — только свои (через RLS)
  const { data: apps, error } = await supabase
    .from("applications_with_candidate")
    .select("id,region_id,created_at,payment_verified,candidate_doc_verified,parent_doc_verified,verified_at,candidate_full_name,candidate_birthdate")
    .order("created_at", { ascending: false })
    .limit(200);

  // файлы по заявкам (для статуса “загружено/нет”)
  const ids = (apps ?? []).map((a: any) => a.id);
  let files: any[] = [];
  if (ids.length) {
    const { data: f } = await supabase
      .from("application_files")
      .select("application_id,file_type,storage_path")
      .in("application_id", ids);
    files = f ?? [];
  }

  return (
    <Page
      title="Заявки (админ)"
      subtitle={ctx.isSuper ? "Все регионы" : "Ваш(и) регион(ы)"}
      right={
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn" href="/admin">← Админка</a>
        </div>
      }
    >
      {error && <div className="alert alertErr">{error.message}</div>}
      <AdminApplicationsClient
        isSuper={ctx.isSuper}
        regions={regions ?? []}
        apps={apps ?? []}
        files={files}
      />
    </Page>
  );
}

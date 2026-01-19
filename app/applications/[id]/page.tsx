import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { Page } from "../../ui/Layout";
import ApplicationClient from "./view-client";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  // 1) заявка + кандидат
  const { data: app, error } = await supabase
    .from("applications_with_candidate")
    .select("id,created_at,region_id,payment_verified,candidate_doc_verified,parent_doc_verified,candidate_full_name,candidate_birthdate")
    .eq("id", id)
    .single();

  if (error || !app) {
    return (
      <Page title="Заявка" subtitle="Ошибка загрузки" right={<a className="btn" href="/applications">← Список</a>}>
        <div className="alert alertErr">{error?.message ?? "Не найдена заявка"}</div>
      </Page>
    );
  }

  // 2) регион (отдельно, безопасно)
  const { data: region } = await supabase
    .from("regions")
    .select("id,name,payment_receiver,payment_note,qr_path")
    .eq("id", app.region_id)
    .single();

  // 3) файлы
  const { data: files, error: fErr } = await supabase
    .from("application_files")
    .select("file_type,storage_path,mime_type,size_bytes,created_at")
    .eq("application_id", id);

  const merged = { ...app, region };

  return (
    <Page title="Заявка" subtitle="Загрузи документы и следи за статусом" right={<a className="btn" href="/applications">← Список</a>}>
      {fErr && <div className="alert alertErr">{fErr.message}</div>}
      <ApplicationClient app={merged} files={files ?? []} />
    </Page>
  );
}

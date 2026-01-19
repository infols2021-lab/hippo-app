import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { Page } from "../../ui/Layout";
import CandidateForm from "../candidate-form";
import CandidateDocs from "../candidate-docs";

export const dynamic = "force-dynamic";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("region_id")
    .eq("user_id", data.user.id)
    .single();

  const defaultRegionId = profile?.region_id ?? "bel";

  const { data: candidate, error } = await supabase
    .from("candidates")
    .select("id,full_name,birthdate,phone,school,city,region_id")
    .eq("id", id)
    .single();

  if (error || !candidate) {
    return (
      <Page title="Кандидат" subtitle="Ошибка загрузки" right={<a className="btn" href="/candidates">← Назад</a>}>
        <div className="alert alertErr">{error?.message ?? "Не найден кандидат"}</div>
      </Page>
    );
  }

  const { data: doc } = await supabase
    .from("candidate_documents")
    .select("id,storage_path,created_at")
    .eq("candidate_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  return (
    <Page title="Кандидат" subtitle="Можно редактировать, загрузить документ, или удалить" right={<a className="btn" href="/candidates">← Назад</a>}>
      <CandidateForm initial={candidate} defaultRegionId={defaultRegionId} />
      <div style={{ height: 12 }} />
      <CandidateDocs candidateId={id} latestDoc={doc?.[0] ?? null} />
    </Page>
  );
}

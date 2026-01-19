import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { Page } from "../../ui/Layout";
import CandidateForm from "../candidate-form";

export const dynamic = "force-dynamic";

export default async function NewCandidatePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("region_id")
    .eq("user_id", data.user.id)
    .single();

  if (error || !profile?.region_id) {
    return (
      <Page title="Новый кандидат" subtitle="Сначала заполни регион в профиле" right={<a className="btn" href="/candidates">← Назад</a>}>
        <div className="alert alertErr">{error?.message ?? "В профиле не выбран регион"}</div>
      </Page>
    );
  }

  return (
    <Page title="Новый кандидат" subtitle="Заполни данные участника" right={<a className="btn" href="/candidates">← Назад</a>}>
      <CandidateForm initial={null} defaultRegionId={profile.region_id} />
    </Page>
  );
}

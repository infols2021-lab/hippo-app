import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { Page } from "../../ui/Layout";
import NewApplicationForm from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewApplicationPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: candidates, error: cErr } = await supabase
    .from("all_candidates")
    .select("ref_id,kind,full_name,birthdate,is_primary,is_ready,region_id")
    .order("is_primary", { ascending: false })
    .order("full_name", { ascending: true });

  const { data: parents } = await supabase
    .from("parent_documents")
    .select("id,label,created_at")
    .order("created_at", { ascending: false });

  return (
    <Page title="Новая заявка" subtitle="Выбери кандидата и (если нужно) документ родителя" right={<a className="btn" href="/applications">← Назад</a>}>
      {cErr && <div className="alert alertErr">{cErr.message}</div>}
      <NewApplicationForm candidates={candidates ?? []} parentDocs={parents ?? []} />
    </Page>
  );
}

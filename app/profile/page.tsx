import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { Page } from "../ui/Layout";
import ProfileForm from "./profile-form";
import ProfileDocs from "./profile-docs";
import { getMyAdminContext } from "../lib/admin/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const adminCtx = await getMyAdminContext();
  const isAdmin = !!adminCtx.user && (adminCtx.isSuper || adminCtx.regionIds.length > 0);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id,email,full_name,phone,school,city,birthdate,region_id,is_admin")
    .eq("user_id", userRes.user.id)
    .single();

  if (error || !profile) {
    return (
      <Page title="Профиль" subtitle="Ошибка загрузки данных">
        <div className="alert alertErr">{error?.message ?? "Не найден профиль"}</div>
      </Page>
    );
  }

  const { data: profileCandDoc } = await supabase
    .from("profile_candidate_documents")
    .select("id,storage_path,created_at")
    .eq("user_id", userRes.user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: parentDocs } = await supabase
    .from("parent_documents")
    .select("id,label,storage_path,created_at")
    .eq("owner_user_id", userRes.user.id)
    .order("created_at", { ascending: false });

  return (
    <Page
      title="Профиль"
      subtitle="Данные + документы"
      right={
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a className="btn" href="/candidates">Кандидаты</a>
          <a className="btn" href="/applications">Заявки</a>
          {isAdmin && <a className="btn btnPrimary" href="/admin">Админка</a>}
          <form action="/auth/logout" method="post">
            <button className="btn" type="submit">Выйти</button>
          </form>
        </div>
      }
    >
      <div style={{ marginBottom: 10 }}>
        <span className="pill">Email: <b>{profile.email}</b></span>
      </div>

      <ProfileForm initial={profile as any} />

      <div style={{ height: 16 }} />

      <ProfileDocs
        profileCandidateDoc={profileCandDoc?.[0] ?? null}
        parentDocs={parentDocs ?? []}
      />
    </Page>
  );
}

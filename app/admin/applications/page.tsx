import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { Page } from "../ui/Layout";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const { data: apps, error } = await supabase
    .from("applications_with_candidate")
    .select("id,app_no,created_at,region_id,verified_at,candidate_full_name,candidate_birthdate")
    .order("created_at", { ascending: false });

  return (
    <Page
      title="Заявки"
      subtitle="Создавай и загружай документы"
      right={
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn" href="/profile">Профиль</a>
          <a className="btn btnPrimary" href="/applications/new">Новая заявка</a>
        </div>
      }
    >
      {error && <div className="alert alertErr">{error.message}</div>}

      {!apps?.length ? (
        <div className="alert">Пока заявок нет. Создай первую.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {apps.map((a: any) => (
            <a key={a.id} className="card" style={{ padding: 14, textDecoration: "none" }} href={`/applications/${a.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>
                    №{a.app_no} · {a.candidate_full_name ?? "—"} {a.verified_at ? "✅" : ""}
                  </div>
                  <div className="sub">
                    Регион: <b>{a.region_id}</b> · Создана: <b>{new Date(a.created_at).toLocaleString()}</b>
                  </div>
                  <div className="sub">
                    Статус: <b>{a.verified_at ? "Подтверждена" : "Не подтверждена"}</b>
                  </div>
                </div>
                <span className="pill">Открыть →</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </Page>
  );
}

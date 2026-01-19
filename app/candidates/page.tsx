import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { Page } from "../ui/Layout";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: items, error } = await supabase
    .from("all_candidates")
    .select("ref_id,kind,full_name,birthdate,city,school,is_primary,is_ready")
    .order("is_primary", { ascending: false })
    .order("full_name", { ascending: true });

  const primary = (items ?? []).find((x: any) => x.kind === "profile");
  const extras = (items ?? []).filter((x: any) => x.kind === "extra");

  return (
    <Page
      title="Кандидаты"
      subtitle="Основной профиль тоже кандидат. Остальных добавляй ниже."
      right={
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn" href="/profile">← Профиль</a>
          <a className="btn" href="/candidates/new">+ Добавить</a>
        </div>
      }
    >
      {error && <div className="alert alertErr">{error.message}</div>}

      {primary && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>⭐ {primary.full_name}</div>
              <div className="sub">
                {primary.birthdate ? <>ДР: <b>{primary.birthdate}</b></> : <>Нет даты рождения</>}
                {" · "}
                {primary.city ?? "—"}
                {" · "}
                {primary.school ?? "—"}
              </div>
              {!primary.is_ready && (
                <div className="sub" style={{ marginTop: 6, color: "rgba(255,77,109,.95)" }}>
                  Заполни в профиле ФИО и дату рождения, чтобы можно было создавать заявки.
                </div>
              )}
            </div>
            <a className="btn" href="/profile">Редактировать</a>
          </div>
        </div>
      )}

      {!extras.length ? (
        <div className="alert">
          Дополнительных кандидатов пока нет. Нажми <b>“Добавить”</b>.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {extras.map((c: any) => (
            <a
              key={c.ref_id}
              href={`/candidates/${c.ref_id}`}
              className="card"
              style={{ padding: 14, textDecoration: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{c.full_name}</div>
                  <div className="sub">
                    ДР: <b>{c.birthdate}</b> · {c.city ?? "—"} · {c.school ?? "—"}
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

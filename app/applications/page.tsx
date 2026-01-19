import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { Page } from "../ui/Layout";

export const dynamic = "force-dynamic";

function calcAge(birthdate: string) {
  const d = new Date(birthdate);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function statusText(row: {
  birthdate: string | null;
  has_payment: boolean;
  has_candidate_doc: boolean;
  has_parent_doc: boolean;
  payment_verified: boolean;
  candidate_doc_verified: boolean;
  parent_doc_verified: boolean | null;
}) {
  const needParent = row.birthdate ? calcAge(row.birthdate) < 14 : false;

  const isVerified =
    row.payment_verified &&
    row.candidate_doc_verified &&
    (needParent ? row.parent_doc_verified === true : true);

  if (isVerified) return "✅ Подтверждена";

  const missing: string[] = [];
  if (!row.has_payment) missing.push("оплата");
  if (!row.has_candidate_doc) missing.push("документ кандидата");
  if (needParent && !row.has_parent_doc) missing.push("документ родителя");

  if (missing.length === 0) return "⏳ На проверке";
  return `⚠ Не загружено: ${missing.join(", ")}`;
}

export default async function ApplicationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  // 1) Берём заявки с кандидатом через VIEW
  const { data: apps, error } = await supabase
    .from("applications_with_candidate")
    .select(
      "id,app_no,created_at,region_id,drive_exported_at,payment_verified,candidate_doc_verified,parent_doc_verified,candidate_full_name,candidate_birthdate"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Page
        title="Заявки"
        subtitle="Ошибка загрузки"
        right={
          <div style={{ display: "flex", gap: 10 }}>
            <a className="btn" href="/profile">Профиль</a>
            <a className="btn btnPrimary" href="/applications/new">+ Новая заявка</a>
          </div>
        }
      >
        <div className="alert alertErr">{error.message}</div>
      </Page>
    );
  }

  const ids = (apps ?? []).map((a: any) => a.id);

  // 2) Берём типы файлов для этих заявок одним запросом
  let fileRows: any[] = [];
  if (ids.length) {
    const { data: f } = await supabase
      .from("application_files")
      .select("application_id,file_type")
      .in("application_id", ids);
    fileRows = f ?? [];
  }

  const fileMap = new Map<string, Set<string>>();
  for (const r of fileRows) {
    if (!fileMap.has(r.application_id)) fileMap.set(r.application_id, new Set());
    fileMap.get(r.application_id)!.add(r.file_type);
  }

  const rows =
    (apps ?? []).map((a: any) => {
      const types = fileMap.get(a.id) ?? new Set<string>();
      return {
        id: a.id,
        app_no: a.app_no ?? null,
        region_id: a.region_id ?? null,
        created_at: a.created_at,
        full_name: a.candidate_full_name ?? "—",
        birthdate: a.candidate_birthdate ? String(a.candidate_birthdate) : null,

        drive_exported_at: a.drive_exported_at ? String(a.drive_exported_at) : null,

        has_payment: types.has("payment"),
        has_candidate_doc: types.has("candidate_doc"),
        has_parent_doc: types.has("parent_doc"),

        payment_verified: a.payment_verified === true,
        candidate_doc_verified: a.candidate_doc_verified === true,
        parent_doc_verified: a.parent_doc_verified,
      };
    }) ?? [];

  return (
    <Page
      title="Заявки"
      subtitle="Создавай заявки, загружай документы, отслеживай статус"
      right={
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn" href="/profile">Профиль</a>
          <a className="btn btnPrimary" href="/applications/new">+ Новая заявка</a>
        </div>
      }
    >
      {!rows.length ? (
        <div className="alert">Заявок пока нет. Нажми <b>“Новая заявка”</b>.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <a
              key={r.id}
              href={`/applications/${r.id}`}
              className="card"
              style={{ padding: 14, textDecoration: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {r.app_no ? `№${r.app_no} · ` : ""}{r.full_name}
                  </div>

                  <div className="sub">
                    Создана: <b>{new Date(r.created_at).toLocaleString()}</b>
                    {r.region_id ? <> · Регион: <b>{r.region_id}</b></> : null}
                  </div>

                  <div className="sub">{statusText(r)}</div>

                  {r.drive_exported_at && (
                    <div className="sub">
                      Drive: ✅ отправлялась <b>{new Date(r.drive_exported_at).toLocaleString()}</b>
                    </div>
                  )}
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

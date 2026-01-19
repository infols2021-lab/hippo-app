import { redirect } from "next/navigation";
import { Page } from "../ui/Layout";
import { getMyAdminContext } from "../lib/admin/server";
import { createSupabaseServerClient } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const ctx = await getMyAdminContext();
  if (!ctx.user) redirect("/login");

  if (!ctx.isSuper && ctx.regionIds.length === 0) {
    return (
      <Page title="Админка" subtitle="Доступ запрещён" right={<a className="btn" href="/profile">Профиль</a>}>
        <div className="alert alertErr">Вы не администратор.</div>
      </Page>
    );
  }

  const supabase = await createSupabaseServerClient();

  const q = supabase.from("regions").select("id,name,is_active,qr_path").order("name");
  const { data: regions, error } = ctx.isSuper ? await q : await q.in("id", ctx.regionIds);

  return (
    <Page
      title="Админка"
      subtitle={ctx.isSuper ? "Super admin: все регионы" : "Регион-админ: ваши регионы"}
      right={
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn" href="/profile">Профиль</a>
          {ctx.isSuper && <a className="btn btnPrimary" href="/admin/regions">Регионы + QR</a>}
        </div>
      }
    >
      {error && <div className="alert alertErr">{error.message}</div>}

      <div className="alert">
        Доступ есть ✅ Следующий шаг: админка заявок и подтверждения.
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {(regions ?? []).map((r: any) => (
          <div key={r.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900 }}>{r.name} ({r.id})</div>
                <div className="sub">{r.is_active ? "Активен" : "Выключен"} · QR: {r.qr_path ? "✅" : "—"}</div>
              </div>
              <span className="pill">скоро заявки →</span>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

import { redirect } from "next/navigation";
import { Page } from "../../ui/Layout";
import { getMyAdminContext } from "../../lib/admin/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import RegionsClient from "./regions-client";

export const dynamic = "force-dynamic";

export default async function RegionsAdminPage() {
  const ctx = await getMyAdminContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.isSuper) redirect("/admin");

  const supabase = await createSupabaseServerClient();
  const { data: regions, error } = await supabase
    .from("regions")
    .select("id,name,is_active,payment_receiver,payment_note,qr_path")
    .order("name");

  return (
    <Page
      title="Регионы и QR"
      subtitle="Super admin: добавление/редактирование регионов"
      right={<a className="btn" href="/admin">← Админка</a>}
    >
      {error && <div className="alert alertErr">{error.message}</div>}
      <RegionsClient initial={regions ?? []} />
    </Page>
  );
}

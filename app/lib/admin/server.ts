import { createSupabaseServerClient } from "../supabase/server";

export async function getMyAdminContext() {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { user: null, isSuper: false, regionIds: [] as string[] };

  // Берём роли пользователя
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role, region_id")
    .eq("user_id", u.user.id);

  if (error) {
    return { user: u.user, isSuper: false, regionIds: [] as string[] };
  }

  const isSuper = (roles ?? []).some((r: any) => r.role === "super_admin");
  const regionIds = (roles ?? [])
    .filter((r: any) => r.role === "region_admin" && r.region_id)
    .map((r: any) => r.region_id);

  return { user: u.user, isSuper, regionIds };
}

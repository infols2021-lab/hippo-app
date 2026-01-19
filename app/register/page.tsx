"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

const REGIONS = [
  { id: "bel", name: "Белгородская" },
  { id: "vor", name: "Воронежская" },
  { id: "kur", name: "Курская" },
  { id: "tam", name: "Тамбовская" },
  { id: "nnov", name: "Нижегородская" },
  { id: "lip", name: "Липецкая" },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regionId, setRegionId] = useState("bel");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      return setErr(error.message);
    }

    // Профиль уже создастся триггером.
    // Но region мы проставим сразу:
    const userId = data.user?.id;
    if (userId) {
      const { error: e2 } = await supabase
        .from("profiles")
        .update({ region_id: regionId })
        .eq("user_id", userId);

      if (e2) {
        setLoading(false);
        return setErr(e2.message);
      }
    }

    setLoading(false);
    router.push("/profile");

  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Регистрация</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <label>
          Регион
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>

        <button disabled={loading} type="submit">
          {loading ? "Создаём..." : "Создать аккаунт"}
        </button>

        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </form>

      <p style={{ marginTop: 12 }}>
        Уже есть аккаунт? <a href="/login">Вход</a>
      </p>
    </main>
  );
}

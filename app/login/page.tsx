"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<"user" | "admin" | null>(null);

  async function signIn(redirectTo: "/profile" | "/admin") {
    setErr(null);
    setLoading(redirectTo === "/admin" ? "admin" : "user");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(null);
      return setErr(error.message);
    }

    // ВАЖНО: ждём, чтобы сессия точно записалась
    await supabase.auth.getSession();

    // Жёсткий переход без router.push — чтобы сервер сразу видел cookie
    window.location.href = redirectTo;
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ marginBottom: 10 }}>
          <div className="pill">HIPPO</div>
        </div>

        <h1 className="h1" style={{ marginBottom: 6 }}>Вход</h1>
        <p className="sub" style={{ marginTop: 0 }}>
          Войдите в личный кабинет или админку
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label className="label">
            <span>Email</span>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="label">
            <span>Пароль</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button
            className="btn btnPrimary"
            disabled={loading !== null}
            onClick={() => signIn("/profile")}
            type="button"
          >
            {loading === "user" ? "Входим..." : "Войти в кабинет"}
          </button>

          <button
            className="btn"
            disabled={loading !== null}
            onClick={() => signIn("/admin")}
            type="button"
          >
            {loading === "admin" ? "Входим..." : "Войти в админку"}
          </button>

          {err && <div className="alert alertErr">{err}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <a className="btn" href="/register">Регистрация</a>
        </div>
      </div>
    </main>
  );
}

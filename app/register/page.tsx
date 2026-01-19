"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export default function RegisterPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onRegister() {
    setErr(null);
    setOk(null);

    if (!email.trim()) return setErr("Введите email.");
    if (password.length < 6) return setErr("Пароль минимум 6 символов.");
    if (password !== password2) return setErr("Пароли не совпадают.");

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) return setErr(error.message);

    setOk("Аккаунт создан ✅ Теперь войди на странице входа.");
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 440, margin: "0 auto" }}>
        <div style={{ marginBottom: 10 }}>
          <div className="pill">HIPPO</div>
        </div>

        <h1 className="h1" style={{ marginBottom: 6 }}>Регистрация</h1>
        <p className="sub" style={{ marginTop: 0 }}>
          Создай аккаунт, потом заполни профиль и загружай документы
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label className="label">
            <span>Email</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>

          <label className="label">
            <span>Пароль</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>

          <label className="label">
            <span>Повтор пароля</span>
            <input className="input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
          </label>

          <button className="btn btnPrimary" type="button" disabled={loading} onClick={onRegister}>
            {loading ? "Создаю..." : "Создать аккаунт"}
          </button>

          {err && <div className="alert alertErr">{err}</div>}
          {ok && <div className="alert">{ok}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <a className="btn" href="/login">Вход</a>
          <a className="btn" href="/forgot-password">Забыли пароль?</a>
        </div>
      </div>
    </main>
  );
}

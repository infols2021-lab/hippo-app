"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSend() {
    setErr(null);
    setOk(null);

    if (!email.trim()) return setErr("Введите email.");

    setLoading(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (error) return setErr(error.message);

    setOk("Письмо отправлено ✅ Проверь почту (и папку Спам).");
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 440, margin: "0 auto" }}>
        <div style={{ marginBottom: 10 }}>
          <div className="pill">HIPPO</div>
        </div>

        <h1 className="h1" style={{ marginBottom: 6 }}>Восстановление пароля</h1>
        <p className="sub" style={{ marginTop: 0 }}>
          Мы отправим письмо со ссылкой для смены пароля
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label className="label">
            <span>Email</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>

          <button className="btn btnPrimary" type="button" disabled={loading} onClick={onSend}>
            {loading ? "Отправляю..." : "Отправить письмо"}
          </button>

          {err && <div className="alert alertErr">{err}</div>}
          {ok && <div className="alert">{ok}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <a className="btn" href="/login">← Назад</a>
        </div>
      </div>
    </main>
  );
}

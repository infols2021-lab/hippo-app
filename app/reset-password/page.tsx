"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export default function ResetPasswordPage() {
  const supabase = createSupabaseBrowserClient();

  const [stage, setStage] = useState<"loading" | "ready" | "done" | "error">("loading");
  const [err, setErr] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [saving, setSaving] = useState(false);

  // В новых ссылках Supabase может быть ?code=...
  useEffect(() => {
    (async () => {
      try {
        setErr(null);

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStage("error");
            setErr(error.message);
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setStage("error");
          setErr("Сессия не найдена. Открой ссылку из письма ещё раз.");
          return;
        }

        setStage("ready");
      } catch (e: any) {
        setStage("error");
        setErr(String(e));
      }
    })();
  }, [supabase]);

  async function onSave() {
    setErr(null);

    if (password.length < 6) return setErr("Пароль минимум 6 символов.");
    if (password !== password2) return setErr("Пароли не совпадают.");

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) return setErr(error.message);

    setStage("done");
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 440, margin: "0 auto" }}>
        <div style={{ marginBottom: 10 }}>
          <div className="pill">HIPPO</div>
        </div>

        <h1 className="h1" style={{ marginBottom: 6 }}>Смена пароля</h1>

        {stage === "loading" && <div className="alert">Проверяем ссылку…</div>}

        {stage === "error" && (
          <>
            <div className="alert alertErr">{err ?? "Ошибка"}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <a className="btn" href="/forgot-password">Отправить письмо ещё раз</a>
              <a className="btn" href="/login">Вход</a>
            </div>
          </>
        )}

        {stage === "ready" && (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <label className="label">
              <span>Новый пароль</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>

            <label className="label">
              <span>Повтор пароля</span>
              <input className="input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </label>

            <button className="btn btnPrimary" type="button" disabled={saving} onClick={onSave}>
              {saving ? "Сохраняю..." : "Сохранить пароль"}
            </button>

            {err && <div className="alert alertErr">{err}</div>}
          </div>
        )}

        {stage === "done" && (
          <>
            <div className="alert">Пароль изменён ✅</div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <a className="btn btnPrimary" href="/login">Войти</a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

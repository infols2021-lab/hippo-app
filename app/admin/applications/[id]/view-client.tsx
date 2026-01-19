"use client";

import { useMemo, useState } from "react";
import { Alert, Button } from "../../../ui/Form";

function calcAge(birthdate: string) {
  const d = new Date(birthdate);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function AdminApplicationClient({
  app,
  files,
}: {
  app: any;
  files: { file_type: string; storage_path: string; created_at: string }[];
}) {
  const birthdate = app.candidate_birthdate ? String(app.candidate_birthdate) : null;
  const needParent = birthdate ? calcAge(birthdate) < 14 : false;

  const fileByType = useMemo(() => {
    const m = new Map<string, any>();
    for (const f of files) m.set(f.file_type, f);
    return m;
  }, [files]);

  const [paymentVerified, setPaymentVerified] = useState<boolean>(app.payment_verified === true);
  const [candVerified, setCandVerified] = useState<boolean>(app.candidate_doc_verified === true);
  const [parentVerified, setParentVerified] = useState<boolean>(app.parent_doc_verified === true);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function view(path: string) {
    // application_id добавляем, чтобы route проверил доступ через application_files RLS
    window.open(`/files/view?bucket=documents&path=${encodeURIComponent(path)}&application_id=${app.id}`, "_blank");
  }

  async function save() {
    setErr(null);
    setOk(null);
    setSaving(true);

    const res = await fetch("/admin/applications/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: app.id,
        payment_verified: paymentVerified,
        candidate_doc_verified: candVerified,
        parent_doc_verified: needParent ? parentVerified : null,
      }),
    });

    setSaving(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось сохранить.");

    setOk("Сохранено ✅");
    window.location.reload();
  }

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{app.candidate_full_name ?? "—"}</div>
        <div className="sub">Регион: <b>{app.region_id}</b></div>
        <div className="sub">Создана: <b>{new Date(app.created_at).toLocaleString()}</b></div>
        <div className="sub">
          Статус: {app.verified_at ? <b>✅ подтверждена</b> : <b>⏳ не подтверждена</b>}
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Файлы</div>

        <DocRow title="Оплата" file={fileByType.get("payment")} onView={view} />
        <DocRow title="Документ кандидата" file={fileByType.get("candidate_doc")} onView={view} />
        {needParent && <DocRow title="Документ родителя" file={fileByType.get("parent_doc")} onView={view} />}

        <div style={{ height: 14 }} />

        <div style={{ fontWeight: 900, marginBottom: 8 }}>Подтверждения</div>

        <label className="sub" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={paymentVerified} onChange={(e) => setPaymentVerified(e.target.checked)} />
          Оплата подтверждена
        </label>

        <label className="sub" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={candVerified} onChange={(e) => setCandVerified(e.target.checked)} />
          Документ кандидата подтверждён
        </label>

        {needParent && (
          <label className="sub" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={parentVerified} onChange={(e) => setParentVerified(e.target.checked)} />
            Документ родителя подтверждён
          </label>
        )}

        <div className="row">
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Сохраняю..." : "Сохранить"}
          </Button>
        </div>
      </div>

      {err && <Alert type="error">{err}</Alert>}
      {ok && <Alert type="ok">{ok}</Alert>}
    </>
  );
}

function DocRow({
  title,
  file,
  onView,
}: {
  title: string;
  file: any;
  onView: (path: string) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <div>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div className="sub">{file ? `Загружен: ${new Date(file.created_at).toLocaleString()}` : "Не загружен"}</div>
      </div>
      {file ? (
        <button className="btn" onClick={() => onView(file.storage_path)} type="button">
          Просмотреть
        </button>
      ) : (
        <span className="pill">—</span>
      )}
    </div>
  );
}

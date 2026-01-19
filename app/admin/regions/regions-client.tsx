"use client";

import { useState } from "react";
import { Alert, Button, Field, Input } from "../../ui/Form";

type Region = {
  id: string;
  name: string;
  is_active: boolean;
  payment_receiver: string | null;
  payment_note: string | null;
  qr_path: string | null;
};

function qrPublicUrl(qr_path: string | null) {
  if (!qr_path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/region-qr/${qr_path}`;
}

export default function RegionsClient({ initial }: { initial: Region[] }) {
  const [regions, setRegions] = useState<Region[]>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  async function refresh() {
    const res = await fetch("/admin/regions/list");
    const data = await res.json();
    setRegions(data.regions ?? []);
  }

  async function createRegion() {
    setErr(null);
    setOk(null);

    const id = newId.trim();
    const name = newName.trim();
    if (!id || !name) return setErr("Нужны id и name.");

    const res = await fetch("/admin/regions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось создать регион.");

    setNewId("");
    setNewName("");
    await refresh();
    setOk("Регион создан ✅");
  }

  async function saveRegion(r: Region) {
    setErr(null);
    setOk(null);

    const res = await fetch("/admin/regions/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось сохранить.");

    await refresh();
    setOk("Сохранено ✅");
  }

  async function uploadQr(regionId: string, file: File) {
    setErr(null);
    setOk(null);

    const form = new FormData();
    form.append("region_id", regionId);
    form.append("file", file);

    const res = await fetch("/admin/regions/upload-qr", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось загрузить QR.");

    await refresh();
    setOk("QR загружен ✅");
  }

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Добавить регион</div>
        <div className="grid">
          <Field label="ID (например: spb)">
            <Input value={newId} onChange={(e) => setNewId(e.target.value)} />
          </Field>
          <Field label="Название">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </Field>
        </div>
        <div className="row">
          <Button variant="primary" onClick={createRegion}>Создать</Button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {regions.map((r) => {
          const url = qrPublicUrl(r.qr_path);
          return (
            <div key={r.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{r.name} ({r.id})</div>
                  <div className="sub">
                    {r.is_active ? "Активен" : "Выключен"} · QR: {r.qr_path ? "✅" : "—"}
                  </div>
                  {url && (
                    <div className="sub" style={{ marginTop: 6 }}>
                      <a href={url} target="_blank">Открыть QR</a>
                    </div>
                  )}
                </div>

                <label className="btn">
                  Загрузить QR
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadQr(r.id, f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="grid" style={{ marginTop: 12 }}>
                <Field label="Получатель">
                  <Input
                    value={r.payment_receiver ?? ""}
                    onChange={(e) =>
                      setRegions((prev) => prev.map(x => x.id === r.id ? { ...x, payment_receiver: e.target.value } : x))
                    }
                  />
                </Field>

                <Field label="Шаблон назначения платежа (без ФИО)">
                  <Input
                    value={r.payment_note ?? ""}
                    onChange={(e) =>
                      setRegions((prev) => prev.map(x => x.id === r.id ? { ...x, payment_note: e.target.value } : x))
                    }
                    placeholder="например: HIPPO 2026"
                  />
                </Field>
              </div>

              <div className="row">
                <Button onClick={() => saveRegion(r)}>Сохранить</Button>
                <Button className="btn" onClick={() => saveRegion({ ...r, is_active: !r.is_active })}>
                  {r.is_active ? "Выключить" : "Включить"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {err && <Alert type="error">{err}</Alert>}
      {ok && <Alert type="ok">{ok}</Alert>}
    </>
  );
}

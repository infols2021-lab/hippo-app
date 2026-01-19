"use client";

import { useState } from "react";
import { Alert, Button, Field, Input } from "../ui/Form";

export default function ProfileDocs({
  profileCandidateDoc,
  parentDocs,
}: {
  profileCandidateDoc: { storage_path: string; created_at: string } | null;
  parentDocs: { id: string; label: string | null; storage_path: string; created_at: string }[];
}) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const [uploading, setUploading] = useState<null | "profile_candidate" | "parent">(null);

  async function uploadProfileCandidate(file: File) {
    setErr(null); setOk(null);
    setUploading("profile_candidate");

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/docs/upload/profile-candidate", { method: "POST", body: form });

    setUploading(null);

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось загрузить.");
    setOk("Документ кандидата (профиль) загружен ✅");
    window.location.reload();
  }

  async function uploadParent(file: File) {
    setErr(null); setOk(null);
    setUploading("parent");

    const form = new FormData();
    form.append("label", label);
    form.append("file", file);

    const res = await fetch("/docs/upload/parent", { method: "POST", body: form });

    setUploading(null);

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось загрузить.");
    setOk("Документ родителя загружен ✅");
    setLabel("");
    window.location.reload();
  }

  function viewDoc(path: string) {
    window.open(`/files/view?bucket=documents&path=${encodeURIComponent(path)}`, "_blank");
  }

  const showProgress = uploading !== null;

  return (
    <>
      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Документы (профиль)</div>

        {showProgress && (
          <>
            <div className="sub">Загрузка файла…</div>
            <div className="progressWrap">
              <div className="progressBar" />
            </div>
            <div style={{ height: 10 }} />
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Документ кандидата (если основной профиль участвует)</div>
            <div className="sub">
              {profileCandidateDoc ? `Загружен: ${new Date(profileCandidateDoc.created_at).toLocaleString()}` : "Не загружен"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {profileCandidateDoc && <Button onClick={() => viewDoc(profileCandidateDoc.storage_path)}>Просмотреть</Button>}

            <label className="btn" style={{ opacity: uploading ? 0.7 : 1 }}>
              {uploading === "profile_candidate" ? "Загрузка..." : "Загрузить/обновить"}
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ display: "none" }}
                disabled={uploading !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadProfileCandidate(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ fontWeight: 800, marginBottom: 6 }}>Документы родителя/представителя</div>

        <div className="grid" style={{ marginBottom: 10 }}>
          <Field label="Подпись (необязательно)">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="например: Паспорт мама" />
          </Field>

          <div style={{ display: "grid", gap: 6 }}>
            <span className="label">Загрузка</span>
            <label className="btn" style={{ opacity: uploading ? 0.7 : 1 }}>
              {uploading === "parent" ? "Загрузка..." : "Загрузить документ родителя"}
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ display: "none" }}
                disabled={uploading !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadParent(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {!parentDocs.length ? (
          <div className="alert">Пока нет документов родителя.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {parentDocs.map((d) => (
              <div key={d.id} className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{d.label ?? "Документ родителя"}</div>
                    <div className="sub">{new Date(d.created_at).toLocaleString()}</div>
                  </div>
                  <Button onClick={() => viewDoc(d.storage_path)}>Просмотреть</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {err && <Alert type="error">{err}</Alert>}
      {ok && <Alert type="ok">{ok}</Alert>}
    </>
  );
}

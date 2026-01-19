"use client";

import { useState } from "react";
import { Alert, Button } from "../ui/Form";

export default function CandidateDocs({
  candidateId,
  latestDoc,
}: {
  candidateId: string;
  latestDoc: { storage_path: string; created_at: string } | null;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function upload(file: File) {
    setErr(null); setOk(null);
    const form = new FormData();
    form.append("candidate_id", candidateId);
    form.append("file", file);

    const res = await fetch("/docs/upload/candidate", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось загрузить.");
    setOk("Документ кандидата загружен ✅");
    window.location.reload();
  }

  function viewDoc(path: string) {
    window.open(`/files/view?bucket=documents&path=${encodeURIComponent(path)}`, "_blank");
  }

  return (
    <>
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Документ кандидата</div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div className="sub">
              {latestDoc ? `Загружен: ${new Date(latestDoc.created_at).toLocaleString()}` : "Не загружен"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {latestDoc && <Button onClick={() => viewDoc(latestDoc.storage_path)}>Просмотреть</Button>}
            <label className="btn">
              Загрузить/обновить
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="sub" style={{ marginTop: 10 }}>
          Заявки будут подтягивать последний загруженный документ автоматически (и хранить старый в старых заявках).
        </div>
      </div>

      {err && <Alert type="error">{err}</Alert>}
      {ok && <Alert type="ok">{ok}</Alert>}
    </>
  );
}

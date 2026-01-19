"use client";

import { useMemo, useState } from "react";
import { Alert, Button } from "../../ui/Form";
import PayModal from "./pay-modal";

type AppFile = {
  file_type: "payment" | "candidate_doc" | "parent_doc";
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function calcAge(birthdate: string) {
  const d = new Date(birthdate);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function ApplicationClient({ app, files }: { app: any; files: AppFile[] }) {
  const birthdate = app.candidate_birthdate ? String(app.candidate_birthdate) : null;
  const age = birthdate ? calcAge(birthdate) : null;
  const needParent = age !== null ? age < 14 : false;

  const fileMap = useMemo(() => {
    const m = new Map<string, AppFile>();
    for (const f of files) m.set(f.file_type, f);
    return m;
  }, [files]);

  const hasPayment = fileMap.has("payment");
  const hasCand = fileMap.has("candidate_doc");
  const hasParent = fileMap.has("parent_doc");

  const isVerified =
    app.payment_verified === true &&
    app.candidate_doc_verified === true &&
    (needParent ? app.parent_doc_verified === true : true);

  const statusText = useMemo(() => {
    if (isVerified) return "✅ Ваша заявка подтверждена администратором.";
    const miss: string[] = [];
    if (!hasPayment) miss.push("оплата");
    if (!hasCand) miss.push("документ кандидата");
    if (needParent && !hasParent) miss.push("документ родителя");
    if (miss.length === 0) return "⏳ Все документы загружены. Статус: на проверке.";
    return `⚠ Не загружено: ${miss.join(", ")}.`;
  }, [isVerified, hasPayment, hasCand, hasParent, needParent]);

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [uploading, setUploading] = useState<null | string>(null);
  const [payOpen, setPayOpen] = useState(false);

  async function upload(fileType: "payment" | "candidate_doc" | "parent_doc", file: File) {
    setErr(null);
    setOk(null);

    const maxMB = 3;
    if (file.size > maxMB * 1024 * 1024) {
      setErr(`Файл слишком большой. Максимум ${maxMB}MB.`);
      return;
    }

    const form = new FormData();
    form.append("application_id", app.id);
    form.append("file_type", fileType);
    form.append("file", file);

    setUploading(fileType);
    const res = await fetch("/applications/upload", { method: "POST", body: form });
    setUploading(null);

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось загрузить файл.");

    setOk("Файл загружен ✅");
    window.location.reload();
  }

  async function onDelete() {
    if (!confirm("Удалить заявку?")) return;
    const res = await fetch("/applications/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: app.id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось удалить.");
    window.location.href = "/applications";
  }

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{app.candidate_full_name ?? "—"}</div>
            <div className="sub">
              Дата рождения: <b>{birthdate ?? "—"}</b>
              {age !== null ? <> · Возраст: <b>{age}</b></> : null}
            </div>
            <div className="sub">Создана: <b>{new Date(app.created_at).toLocaleString()}</b></div>
            <div className="sub">Регион: <b>{app.region?.name ?? app.region_id}</b></div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button onClick={() => setPayOpen(true)}>Оплатить</Button>
            <Button onClick={onDelete} className="btn" style={{ borderColor: "rgba(255,77,109,.35)" }}>
              Удалить
            </Button>
          </div>
        </div>

        <div className="alert" style={{ marginTop: 12 }}>
          {statusText}
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Документы</div>

        <UploadBlock
          title="Скан оплаты"
          hint="JPG/PDF/PNG (лучше JPG). До 3MB."
          done={hasPayment}
          uploading={uploading === "payment"}
          onSelect={(f) => upload("payment", f)}
        />

        <UploadBlock
          title="Документ кандидата"
          hint="JPG/PDF. До 3MB."
          done={hasCand}
          uploading={uploading === "candidate_doc"}
          onSelect={(f) => upload("candidate_doc", f)}
        />

        {needParent && (
          <UploadBlock
            title="Документ родителя/представителя"
            hint="JPG/PDF. До 3MB."
            done={hasParent}
            uploading={uploading === "parent_doc"}
            onSelect={(f) => upload("parent_doc", f)}
          />
        )}
      </div>

      {err && <Alert type="error">{err}</Alert>}
      {ok && <Alert type="ok">{ok}</Alert>}

      <PayModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        region={app.region ?? null}
        candidateName={app.candidate_full_name ?? "—"}
      />
    </>
  );
}

function UploadBlock({
  title,
  hint,
  done,
  uploading,
  onSelect,
}: {
  title: string;
  hint: string;
  done: boolean;
  uploading: boolean;
  onSelect: (file: File) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div>
        <div style={{ fontWeight: 800 }}>{done ? "✅ " : ""}{title}</div>
        <div className="sub">{hint}</div>
      </div>

      <label className="btn" style={{ whiteSpace: "nowrap" }}>
        {uploading ? "Загрузка..." : done ? "Заменить" : "Загрузить"}
        <input
          type="file"
          accept="image/*,application/pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSelect(f);
            e.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}

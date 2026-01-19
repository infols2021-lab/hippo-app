"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Field, Select } from "../../ui/Form";

type Candidate = {
  ref_id: string;
  kind: "profile" | "extra";
  full_name: string;
  birthdate: string | null;
  is_primary: boolean;
  is_ready: boolean;
  region_id: string | null;
};

type ParentDoc = { id: string; label: string | null; created_at: string };

function calcAge(birthdate: string) {
  const d = new Date(birthdate);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function NewApplicationForm({
  candidates,
  parentDocs,
}: {
  candidates: Candidate[];
  parentDocs: ParentDoc[];
}) {
  const first = candidates[0];
  const [selectedKey, setSelectedKey] = useState(first ? `${first.kind}:${first.ref_id}` : "");
  const [parentDocId, setParentDocId] = useState<string>(""); // optional
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(() => {
    const [kind, ref] = selectedKey.split(":");
    return candidates.find((c) => c.kind === kind && c.ref_id === ref) ?? null;
  }, [selectedKey, candidates]);

  const needParent = useMemo(() => {
    if (!selected?.birthdate) return false;
    return calcAge(selected.birthdate) < 14;
  }, [selected]);

  const canCreate = useMemo(() => {
    if (!selected) return false;
    if (!selected.is_ready) return false;
    if (needParent && !parentDocId) return false; // требуем выбрать док родителя
    return true;
  }, [selected, needParent, parentDocId]);

  async function onCreate() {
    setErr(null);
    if (!selected) return setErr("Выбери кандидата.");
    if (!selected.is_ready) return setErr("Заполни профиль кандидата (ФИО/дата/регион).");
    if (needParent && !parentDocId) return setErr("Выбери документ родителя (в профиле) или сначала загрузи его.");

    setLoading(true);
    const res = await fetch("/applications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_kind: selected.kind,
        candidate_ref: selected.ref_id,
        parent_doc_id: needParent ? parentDocId : null,
      }),
    });
    setLoading(false);

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось создать заявку.");

    window.location.href = `/applications/${data.id}`;
  }

  return (
    <>
      <div className="grid">
        <Field label="Кандидат">
          <Select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
            {candidates.map((c) => (
              <option key={`${c.kind}:${c.ref_id}`} value={`${c.kind}:${c.ref_id}`}>
                {c.is_primary ? "⭐ " : ""}
                {c.full_name}
                {c.birthdate ? ` (${c.birthdate})` : " (нет даты рождения)"}
              </option>
            ))}
          </Select>
        </Field>

        {needParent && (
          <Field label="Документ родителя/представителя (из профиля) *">
            <Select value={parentDocId} onChange={(e) => setParentDocId(e.target.value)}>
              <option value="">— выбрать —</option>
              {parentDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label ? `${d.label} — ` : ""}{new Date(d.created_at).toLocaleString()}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {needParent && parentDocs.length === 0 && (
        <Alert type="error">
          Для кандидата младше 14 лет нужен документ родителя. Сначала загрузите его в профиле (раздел “Документы родителя”).
        </Alert>
      )}

      <div className="row">
        <Button variant="primary" onClick={onCreate} disabled={loading || !canCreate}>
          {loading ? "Создаю..." : "Создать заявку"}
        </Button>
      </div>

      {err && <Alert type="error">{err}</Alert>}
    </>
  );
}

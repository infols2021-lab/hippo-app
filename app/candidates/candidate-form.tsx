"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, Button, Field, Input, Select } from "../ui/Form";

const REGIONS = [
  { id: "bel", name: "Белгородская" },
  { id: "vor", name: "Воронежская" },
  { id: "kur", name: "Курская" },
  { id: "tam", name: "Тамбовская" },
  { id: "nnov", name: "Нижегородская" },
  { id: "lip", name: "Липецкая" },
];

type Candidate = {
  id: string;
  full_name: string;
  birthdate: string;
  phone: string | null;
  school: string | null;
  city: string | null;
  region_id: string; // <-- важно
} | null;

export default function CandidateForm({
  initial,
  defaultRegionId,
}: {
  initial: Candidate;
  defaultRegionId: string;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [birthdate, setBirthdate] = useState(initial?.birthdate ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [school, setSchool] = useState(initial?.school ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [regionId, setRegionId] = useState(initial?.region_id ?? defaultRegionId);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return fullName.trim().length > 0 && birthdate.length > 0 && regionId.length > 0;
  }, [fullName, birthdate, regionId]);

  async function onSave() {
    setErr(null);

    if (!canSave) {
      setErr("Заполни ФИО, дату рождения и регион.");
      return;
    }

    setSaving(true);
    const res = await fetch("/candidates/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: initial?.id ?? null,
        full_name: fullName.trim(),
        birthdate,
        phone: phone.trim() || null,
        school: school.trim() || null,
        city: city.trim() || null,
        region_id: regionId,
      }),
    });
    setSaving(false);

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось сохранить.");

    router.push("/candidates");
    router.refresh();
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (!confirm("Удалить кандидата?")) return;

    setSaving(true);
    const res = await fetch("/candidates/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: initial.id }),
    });
    setSaving(false);

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Не удалось удалить.");

    router.push("/candidates");
    router.refresh();
  }

  return (
    <>
      <div className="grid">
        <Field label="ФИО *">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>

        <Field label="Дата рождения *">
          <Input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
        </Field>

        <Field label="Регион кандидата *">
          <Select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Телефон">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>

        <Field label="Город">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>

        <Field label="Школа">
          <Input value={school} onChange={(e) => setSchool(e.target.value)} />
        </Field>
      </div>

      <div className="row">
        {initial?.id && (
          <Button onClick={onDelete} disabled={saving} className="btn" style={{ borderColor: "rgba(255,77,109,.35)" }}>
            Удалить
          </Button>
        )}
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Сохраняю..." : "Сохранить"}
        </Button>
      </div>

      {err && <Alert type="error">{err}</Alert>}
    </>
  );
}

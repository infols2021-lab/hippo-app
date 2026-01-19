"use client";

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

type Profile = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  school: string | null;
  city: string | null;
  birthdate: string | null;
  region_id: string | null;
  is_admin: boolean;
  updated_at?: string | null;
};

export default function ProfileForm({ initial }: { initial: Profile }) {
  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [school, setSchool] = useState(initial.school ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [birthdate, setBirthdate] = useState(initial.birthdate ?? "");
  const [regionId, setRegionId] = useState(initial.region_id ?? "bel");

  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isValid = useMemo(() => {
    if (!fullName.trim()) return false;
    return true;
  }, [fullName]);

  async function onSave() {
    setOk(null);
    setErr(null);

    if (!isValid) {
      setErr("Заполни ФИО.");
      return;
    }

    setSaving(true);
    const res = await fetch("/profile/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        school: school.trim() || null,
        city: city.trim() || null,
        birthdate: birthdate || null,
        region_id: regionId,
      }),
    });
    setSaving(false);

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(data?.message || "Не удалось сохранить.");
      return;
    }

    setOk("Сохранено ✅");
  }

  return (
    <>
      <div className="grid">
        <Field label="ФИО *">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
        </Field>

        <Field label="Регион *">
          <Select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Телефон">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 ..." />
        </Field>

        <Field label="Город">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" />
        </Field>

        <Field label="Школа">
          <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Школа" />
        </Field>

        <Field label="Дата рождения">
          <Input type="date" value={birthdate ?? ""} onChange={(e) => setBirthdate(e.target.value)} />
        </Field>
      </div>

      <div className="row">
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Сохраняю..." : "Сохранить"}
        </Button>
      </div>

      {err && <Alert type="error">{err}</Alert>}
      {ok && <Alert type="ok">{ok}</Alert>}
    </>
  );
}

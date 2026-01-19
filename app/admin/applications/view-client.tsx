"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Select } from "../../ui/Form";

function calcAge(birthdate: string) {
  const d = new Date(birthdate);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default function AdminApplicationsClient({
  isSuper,
  regions,
  apps,
  files,
}: {
  isSuper: boolean;
  regions: { id: string; name: string }[];
  apps: any[];
  files: { application_id: string; file_type: string; storage_path: string }[];
}) {
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fileMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const f of files) {
      if (!m.has(f.application_id)) m.set(f.application_id, new Set());
      m.get(f.application_id)!.add(f.file_type);
    }
    return m;
  }, [files]);

  const filtered = useMemo(() => {
    if (regionFilter === "all") return apps;
    return apps.filter((a) => a.region_id === regionFilter);
  }, [apps, regionFilter]);

  function statusRow(a: any) {
    const birthdate = a.candidate_birthdate ? String(a.candidate_birthdate) : null;
    const needParent = birthdate ? calcAge(birthdate) < 14 : false;

    const types = fileMap.get(a.id) ?? new Set<string>();
    const hasPay = types.has("payment");
    const hasCand = types.has("candidate_doc");
    const hasPar = types.has("parent_doc");

    const verified =
      a.payment_verified === true &&
      a.candidate_doc_verified === true &&
      (needParent ? a.parent_doc_verified === true : true);

    const miss: string[] = [];
    if (!hasPay) miss.push("оплата");
    if (!hasCand) miss.push("кандидат");
    if (needParent && !hasPar) miss.push("родитель");

    return { needParent, hasPay, hasCand, hasPar, verified, miss };
  }

  async function exportToDrive() {
    setErr(null);
    setOk(null);
    setExporting(true);

    const res = await fetch("/admin/export/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region_id: regionFilter,
        application_ids: [], // экспортируем все отфильтрованные
      }),
    });

    setExporting(false);

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Export failed");

    setOk(`Отправлено в Drive: ${data.sent} файлов ✅`);
  }

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>Фильтр региона</div>
            <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} disabled={!isSuper}>
              <option value="all">Все регионы</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </Select>
            {!isSuper && <span className="pill">регион фиксирован</span>}
          </div>

          <Button variant="primary" onClick={exportToDrive} disabled={exporting}>
            {exporting ? "Экспорт..." : "Экспорт в Google Drive"}
          </Button>
        </div>

        <div className="sub" style={{ marginTop: 8 }}>
          Экспортирует файлы заявок (оплата/кандидат/родитель) в папки региона с именем: <b>№Номер_ФИО_тип.ext</b>
        </div>
      </div>

      {!filtered.length ? (
        <div className="alert">Заявок нет.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((a) => {
            const s = statusRow(a);
            return (
              <a
                key={a.id}
                href={`/admin/applications/${a.id}`}
                className="card"
                style={{ padding: 14, textDecoration: "none" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      №{a.app_no} · {a.candidate_full_name ?? "—"} {s.verified ? "✅" : ""}
                    </div>
                    <div className="sub">
                      Регион: <b>{a.region_id}</b> · Создана: <b>{new Date(a.created_at).toLocaleString()}</b>
                    </div>
                    <div className="sub">
                      Файлы: {s.hasPay ? "💳" : "—"} {s.hasCand ? "🪪" : "—"} {s.needParent ? (s.hasPar ? "👤" : "—") : "👤(не нужно)"}
                      {" · "}
                      {s.verified ? "Подтверждена" : s.miss.length ? `Не загружено: ${s.miss.join(", ")}` : "На проверке"}
                    </div>
                  </div>
                  <span className="pill">Открыть →</span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {err && <Alert type="error">{err}</Alert>}
      {ok && <Alert type="ok">{ok}</Alert>}
    </>
  );
}

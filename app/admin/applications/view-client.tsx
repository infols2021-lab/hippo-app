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

  return (
    <>
      {isSuper && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Фильтр</div>
          <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="all">Все регионы</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
          </Select>
        </div>
      )}

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
                      {a.candidate_full_name ?? "—"} {s.verified ? "✅" : ""}
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
    </>
  );
}

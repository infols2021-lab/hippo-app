"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Select, Input } from "../../ui/Form";

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
  const [onlyPending, setOnlyPending] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
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

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return apps
      .filter((a) => (regionFilter === "all" ? true : a.region_id === regionFilter))
      .filter((a) => (onlyPending ? !a.verified_at : true))
      .filter((a) => (qq ? String(a.candidate_full_name ?? "").toLowerCase().includes(qq) : true));
  }, [apps, regionFilter, onlyPending, q]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    for (const a of filtered) next[a.id] = checked;
    setSelected(next);
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
        application_ids: selectedIds, // если пусто — экспорт по фильтру (в route так и сделано)
      }),
    });

    setExporting(false);

    const data = await res.json().catch(() => null);
    if (!res.ok) return setErr(data?.message || "Export failed");

    setOk(`Экспорт OK: файлов отправлено ${data.sent}, заявок ${data.apps ?? "?"} ✅`);
    setSelected({});
    window.location.reload();
  }

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>Фильтры</div>

            <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} disabled={!isSuper}>
              <option value="all">Все регионы</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </Select>

            <label className="sub" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
              Только непроверенные
            </label>

            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по ФИО" />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => toggleAll(true)}>Выбрать все</button>
            <button className="btn" type="button" onClick={() => toggleAll(false)}>Снять</button>

            <Button variant="primary" onClick={exportToDrive} disabled={exporting}>
              {exporting ? "Экспорт..." : selectedIds.length ? `Экспорт выбранных (${selectedIds.length})` : "Экспорт по фильтру"}
            </Button>
          </div>
        </div>

        <div className="sub" style={{ marginTop: 8 }}>
          Имя файлов в Drive: <b>№Номер_ФИО_тип.ext</b>. Экспорт можно повторять сколько угодно.
        </div>
      </div>

      {!filtered.length ? (
        <div className="alert">Заявок нет.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((a) => {
            const s = statusRow(a);
            const exported = a.drive_exported_at ? new Date(a.drive_exported_at).toLocaleString() : null;

            return (
              <div key={a.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <label style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!selected[a.id]}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                    />
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
                      <div className="sub">
                        Drive: {exported ? `✅ отправлялась ${exported}${a.drive_exported_count ? ` · файлов ${a.drive_exported_count}` : ""}` : "— не отправлялась"}
                      </div>
                    </div>
                  </label>

                  <a className="btn" href={`/admin/applications/${a.id}`}>Открыть</a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {err && <Alert type="error">{err}</Alert>}
      {ok && <Alert type="ok">{ok}</Alert>}
    </>
  );
}

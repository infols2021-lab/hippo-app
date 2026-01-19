"use client";

import { Button } from "../../ui/Form";

function qrPublicUrl(qr_path: string | null) {
  if (!qr_path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/region-qr/${qr_path}`;
}

export default function PayModal({
  open,
  onClose,
  region,
  candidateName,
}: {
  open: boolean;
  onClose: () => void;
  region: any | null;
  candidateName: string;
}) {
  if (!open) return null;

  const url = qrPublicUrl(region?.qr_path ?? null);

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Оплата участия</h3>
        <p className="sub" style={{ marginTop: 0 }}>{region?.name ?? region?.id ?? "Регион"}</p>

        {url ? (
          <div style={{ display: "grid", placeItems: "center", margin: "14px 0" }}>
            <img
              src={url}
              alt="QR"
              width={230}
              height={230}
              style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.10)" }}
            />
          </div>
        ) : (
          <div className="alert alertErr">QR для оплаты не настроен для этого региона.</div>
        )}

        <div className="alert">
          <b>Назначение платежа:</b>
          <br />
          {(region?.payment_note ?? "HIPPO 2026") + ", " + candidateName}
        </div>

        {region?.payment_receiver && (
          <div className="sub" style={{ marginTop: 10 }}>
            Получатель: <b>{region.payment_receiver}</b>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" onClick={onClose}>Понятно</Button>
        </div>
      </div>
    </div>
  );
}

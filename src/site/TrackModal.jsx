import React, { useState } from "react";
import { api } from "../api.js";
import { money } from "../utils.js";
import { Overlay, Msg } from "./parts.jsx";

export default function TrackModal({ open, onClose }) {
  const [o, setO] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setMsg(null); setO(null);
    try { setO(await api("/orders/track", { method: "POST", body: d })); }
    catch (er) { setMsg({ ok: false, text: er.message }); }
    finally { setBusy(false); }
  }
  return (
    <Overlay open={open} onClose={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} role="dialog" aria-modal="true" aria-label="Track order">
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <form className="form" style={{ border: 0 }} onSubmit={submit}>
          <h3>Track your order</h3>
          <p style={{ color: "var(--steel)" }}>Enter the Order ID you received and the mobile number used for the order.</p>
          <div className="fgrid">
            <div className="f"><label>Order ID</label><input name="orderNo" placeholder="ELK-1001" required /></div>
            <div className="f"><label>Mobile number</label><input name="phone" required inputMode="tel" /></div>
          </div>
          <button className="btn btn-dark" style={{ marginTop: 14 }} disabled={busy}>{busy ? "Checking…" : "Check Status"}</button>
          <Msg msg={msg} />
          {o && (
            <div style={{ marginTop: 18, padding: 16, border: "1px solid var(--line)", borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 20 }}>{o.orderNo}</b><span className={`status ${o.status}`}>{o.status}</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 14.5 }}>{o.items.map((i, k) => <div key={k}>{i.product_name} – {i.variant} × {i.qty}</div>)}</div>
              {o.finalAmount != null && o.status !== "New" && <p style={{ marginTop: 8 }}><b>Confirmed amount: {money(o.finalAmount)}</b></p>}
              {o.publicNote && <p style={{ marginTop: 6, color: "var(--steel)" }}>{o.publicNote}</p>}
              <div className="timeline">
                {o.history.map((h, k) => <div key={k}><b>{h.status}</b><small>{new Date(h.created_at).toLocaleString("en-IN")}{h.note ? ` · ${h.note}` : ""}</small></div>)}
              </div>
            </div>
          )}
        </form>
      </div>
    </Overlay>
  );
}

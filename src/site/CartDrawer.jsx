import React, { useEffect, useState } from "react";
import { SITE } from "../config.js";
import { api } from "../api.js";
import { money, wa } from "../utils.js";
import { Msg } from "./parts.jsx";

const STEP = 10;

export default function CartDrawer({ open, onClose, cart, setCart }) {
  const [view, setView] = useState("cart"); // cart | details | done
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => { if (open && view === "done" && cart.length) setView("cart"); }, [open]); // eslint-disable-line
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);

  const total = cart.reduce((s, c) => s + c.rate * c.qty, 0);
  const setQty = (i, n) => setCart(cart.map((c, j) => (j === i ? { ...c, qty: Math.max(c.moq || STEP, Math.floor(Number(n) || 0)) } : c)));

  async function place(e) {
    e.preventDefault();
    const f = e.currentTarget;
    if (!f.reportValidity()) return;
    const customer = Object.fromEntries(new FormData(f));
    setBusy(true); setMsg(null);
    try {
      const r = await api("/orders", { method: "POST", body: { customer, items: cart.map((c) => ({ productId: c.productId, variant: c.variant, qty: c.qty })) } });
      setDone({ ...r, name: customer.name });
      setCart([]); setView("done");
    } catch (er) {
      setMsg({ ok: false, text: `Could not send order: ${er.message}` });
    } finally { setBusy(false); }
  }

  const title = { cart: "Your Order", details: "Your Details", done: "Order Received" }[view];
  return (
    <>
      <div className={`overlay ${open ? "on" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "on" : ""}`} aria-label="Your order" aria-hidden={!open}>
        <div className="dhead">
          <h3>{title}</h3>
          <button className="x" style={{ position: "static", width: 38, height: 38, borderRadius: "50%", background: "var(--paper)", fontSize: 20 }} onClick={onClose} aria-label="Close">×</button>
        </div>

        {view === "cart" && (
          <>
            <div className="dbody">
              {!cart.length ? (
                <div className="empty" style={{ marginTop: 20 }}>No products added yet.<br /><br />
                  <a className="btn btn-dark btn-sm" href="#products" onClick={onClose}>Browse products</a></div>
              ) : cart.map((c, i) => (
                <div className="ditem" key={c.productId + c.variant}>
                  <div><b>{c.name}</b><br /><small>{c.variant}{SITE.showPrices && c.rate ? ` · ${money(c.rate)} / pc` : ""}</small></div>
                  <div style={{ textAlign: "right" }}>{SITE.showPrices && c.rate ? <b>{money(c.rate * c.qty)}</b> : null}</div>
                  <div className="qty" style={{ margin: 0 }}>
                    <button className="pm" onClick={() => setQty(i, c.qty - STEP)} aria-label="Less">−</button>
                    <input type="number" value={c.qty} style={{ width: 100 }} onChange={(e) => setCart(cart.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} onBlur={(e) => setQty(i, e.target.value)} aria-label="Quantity" />
                    <button className="pm" onClick={() => setQty(i, c.qty + STEP)} aria-label="More">+</button>
                  </div>
                  <div style={{ textAlign: "right" }}><button className="rm" onClick={() => setCart(cart.filter((_, j) => j !== i))}>Remove</button></div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="dfoot">
                {SITE.showPrices && <><div className="total"><span>Estimated value</span><span>{money(total)}</span></div><p className="note" style={{ margin: "0 0 12px" }}>Final rate &amp; freight confirmed by our team.</p></>}
                <button className="btn btn-volt" style={{ width: "100%", justifyContent: "center" }} onClick={() => setView("details")}>Continue to place order →</button>
              </div>
            )}
          </>
        )}

        {view === "details" && (
          <form onSubmit={place} style={{ display: "contents" }}>
            <div className="dbody">
              <div className="fgrid" style={{ gridTemplateColumns: "1fr", marginTop: 0 }}>
                <div className="f"><label>Your name *</label><input name="name" required maxLength={120} /></div>
                <div className="f"><label>Firm / shop name *</label><input name="firm" required maxLength={160} /></div>
                <div className="f"><label>Mobile number *</label><input name="phone" required inputMode="tel" pattern="[0-9+ ]{10,15}" title="10 digit mobile number" /></div>
                <div className="f"><label>Email</label><input name="email" type="email" maxLength={160} /></div>
                <div className="f"><label>GSTIN (optional)</label><input name="gst" maxLength={15} style={{ textTransform: "uppercase" }} /></div>
                <div className="f"><label>City *</label><input name="city" required maxLength={80} /></div>
                <div className="f"><label>State *</label><input name="state" required maxLength={80} /></div>
                <div className="f"><label>Delivery address / transporter</label><textarea name="address" maxLength={600} /></div>
                <div className="f"><label>Notes for our team</label><textarea name="notes" maxLength={1000} placeholder="Custom length, packing, dispatch date…" /></div>
              </div>
              <Msg msg={msg} />
            </div>
            <div className="dfoot">
              {SITE.showPrices && <div className="total"><span>{cart.length} item(s)</span><span>{money(total)}</span></div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn btn-line" onClick={() => setView("cart")}>← Back</button>
                <button className="btn btn-volt" style={{ flex: 1, justifyContent: "center" }} disabled={busy}>{busy ? "Sending…" : "Place Order"}</button>
              </div>
            </div>
          </form>
        )}

        {view === "done" && done && (
          <>
            <div className="dbody">
              <div style={{ textAlign: "center", padding: "30px 4px" }}>
                <div style={{ fontSize: 54 }}>✅</div>
                <h3 style={{ fontSize: 30, margin: "8px 0" }}>Thank you, {done.name}!</h3>
                <p>Your Order ID is</p>
                <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 42, fontWeight: 800, color: "var(--navy)" }}>{done.orderNo}</p>
                <p style={{ color: "var(--steel)" }}>Status: <span className="status">New</span><br />Our team will check your order and confirm the final rate and dispatch date by call / WhatsApp. Keep this Order ID to track status.</p>
              </div>
            </div>
            <div className="dfoot">
              <a className="btn btn-wa" style={{ width: "100%", justifyContent: "center" }} target="_blank" rel="noopener noreferrer" href={wa(`Hello ELECKTOR, I placed order ${done.orderNo} on your website.`)}>Share Order ID on WhatsApp</a>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

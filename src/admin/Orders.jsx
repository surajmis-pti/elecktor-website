import React, { useEffect, useState } from "react";
import { money, dt, waCustomer, csvCell, downloadText } from "../utils.js";
import { Modal, StatusPill } from "./Admin.jsx";

const FILTERS = ["New", "Confirmed", "Dispatched", "Completed", "Rejected", "All"];
const NEXT = {
  New: [["Confirmed", "✓ Accept & Confirm", "b-green"], ["Rejected", "Reject", "b-red"]],
  Confirmed: [["Dispatched", "Mark Dispatched", "b-dark"], ["Rejected", "Cancel order", "b-red"]],
  Dispatched: [["Completed", "Mark Completed", "b-dark"]],
  Completed: [],
  Rejected: [["New", "Re-open", "b-line"]],
};

export function OrderTable({ list, onOpen }) {
  if (!list.length) return <p className="muted" style={{ padding: 18 }}>No orders here.</p>;
  return (
    <div className="scroll"><table><thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>City</th><th>Items</th><th>Value</th><th>Status</th></tr></thead>
      <tbody>{list.map((o) => (
        <tr key={o.id} className="click" onClick={() => onOpen(o.order_no)}>
          <td><b>{o.order_no}</b></td><td>{dt(o.created_at)}</td>
          <td>{o.cust_firm || o.cust_name}<div className="muted">{o.cust_name} · {o.cust_phone}</div></td>
          <td>{o.cust_city}</td><td>{o.item_count} item(s)<div className="muted">{o.total_qty} pcs</div></td>
          <td>{money(o.final_amount ?? o.est_total)}</td><td><StatusPill s={o.status} /></td>
        </tr>))}
      </tbody></table></div>
  );
}

export function Orders({ call, toast, refreshCount }) {
  const [filter, setFilter] = useState("New");
  const [search, setSearch] = useState("");
  const [list, setList] = useState(null);
  const [all, setAll] = useState([]);
  const [openNo, setOpenNo] = useState(null);
  const load = () => call("/admin/orders").then((rows) => setAll(rows)).catch((e) => toast("Error: " + e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => {
    const s = search.toLowerCase();
    setList(all.filter((o) => (filter === "All" || o.status === filter) &&
      (!s || `${o.order_no} ${o.cust_name} ${o.cust_firm} ${o.cust_phone} ${o.cust_city}`.toLowerCase().includes(s))));
  }, [all, filter, search]);

  async function exportCsv() {
    try {
      const rows = [["Order ID", "Date", "Status", "Name", "Firm", "Phone", "Email", "GSTIN", "City", "State", "Product", "Length", "Qty", "Rate", "Amount", "Est Total", "Final Amount"]];
      for (const o of all) {
        const d = await call(`/admin/orders/${o.order_no}`);
        d.items.forEach((i) => rows.push([d.order_no, d.created_at, d.status, d.cust_name, d.cust_firm, d.cust_phone, d.cust_email, d.cust_gst, d.cust_city, d.cust_state, i.product_name, i.variant, i.qty, i.rate, i.amount, d.est_total, d.final_amount ?? ""]));
      }
      downloadText("elecktor-orders.csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"));
      toast("Orders CSV downloaded");
    } catch (e) { toast("Error: " + e.message); }
  }

  return (
    <>
      <div className="top"><h2>Orders</h2><button className="btn b-line" onClick={exportCsv} disabled={!all.length}>Export CSV</button></div>
      <div className="filters">
        {FILTERS.map((s) => <button key={s} className={`chip ${s === filter ? "on" : ""}`} onClick={() => setFilter(s)}>{s} ({s === "All" ? all.length : all.filter((o) => o.status === s).length})</button>)}
        <input className="searchbox" placeholder="Search name, phone, ID, city" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="panel">{list ? <OrderTable list={list} onOpen={setOpenNo} /> : <p className="muted" style={{ padding: 18 }}>Loading…</p>}</div>
      {openNo && <OrderModal no={openNo} call={call} toast={toast} onClose={() => setOpenNo(null)} onChanged={() => { load(); refreshCount(); }} />}
    </>
  );
}

export function OrderModal({ no, call, toast, onClose, onChanged }) {
  const [o, setO] = useState(null);
  const [amt, setAmt] = useState(""); const [pub, setPub] = useState(""); const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    call(`/admin/orders/${no}`).then((d) => { setO(d); setAmt(d.final_amount ?? ""); setPub(d.public_note); setNote(d.admin_note); })
      .catch((e) => { toast("Error: " + e.message); onClose(); });
  }, [no]); // eslint-disable-line
  if (!o) return null;

  async function save(status) {
    setBusy(true);
    try {
      const body = { finalAmount: amt === "" ? null : amt, publicNote: pub, adminNote: note };
      if (status) body.status = status;
      const d = await call(`/admin/orders/${no}`, { method: "PATCH", body });
      setO(d); setAmt(d.final_amount ?? "");
      toast(status ? `${no} → ${status}` : "Saved");
      onChanged();
      if (status) onClose();
    } catch (e) { toast("Error: " + e.message); } finally { setBusy(false); }
  }
  const msg = o.status === "New"
    ? `Namaste ${o.cust_name}, ELECKTOR INDUSTRIES ko aapka order ${o.order_no} mil gaya hai. Hum rate aur dispatch confirm karke jaldi batate hain.`
    : `Namaste ${o.cust_name}, aapke order ${o.order_no} ka status: ${o.status}.${o.final_amount != null ? " Amount: " + money(o.final_amount) + "." : ""}${o.public_note ? " " + o.public_note : ""} – ELECKTOR INDUSTRIES`;

  return (
    <Modal onClose={onClose} title={<>{o.order_no} <span style={{ fontFamily: "Barlow", fontSize: 13, verticalAlign: "middle" }}><StatusPill s={o.status} /></span></>}
      footer={<>
        <a className="btn b-wa" target="_blank" rel="noopener noreferrer" href={waCustomer(o.cust_phone, msg)}>WhatsApp customer</a>
        <button className="btn b-line" onClick={() => save(null)} disabled={busy}>Save notes</button>
        {(NEXT[o.status] || []).map(([s, label, cls]) => <button key={s} className={`btn ${cls}`} onClick={() => save(s)} disabled={busy}>{label}</button>)}
      </>}>
      <div className="g2">
        <div><h3 style={{ fontSize: 19, marginBottom: 8 }}>Customer</h3><div className="kv">
          <span>Name</span><b>{o.cust_name}</b><span>Firm</span><b>{o.cust_firm}</b><span>Mobile</span><b>{o.cust_phone}</b>
          <span>Email</span><b>{o.cust_email || "–"}</b><span>GSTIN</span><b>{o.cust_gst || "–"}</b><span>City / State</span><b>{o.cust_city}, {o.cust_state}</b>
          <span>Address</span><b>{o.cust_address || "–"}</b><span>Notes</span><b>{o.cust_notes || "–"}</b><span>Placed</span><b>{dt(o.created_at)}</b>
        </div></div>
        <div><h3 style={{ fontSize: 19, marginBottom: 8 }}>History</h3><div className="tl">
          {o.history.map((h) => <div key={h.id}><b>{h.status}</b> <span className="muted">{dt(h.created_at)}{h.by_admin ? ` · ${h.by_admin}` : ""}</span>{h.note ? <div className="muted">{h.note}</div> : null}</div>)}
        </div></div>
      </div>
      <table style={{ marginTop: 18, border: "1px solid var(--line)" }}><thead><tr><th>Product</th><th>Length</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>{o.items.map((i) => <tr key={i.id}><td>{i.product_name}</td><td>{i.variant}</td><td>{i.qty}</td><td>{money(i.rate)}</td><td>{money(i.amount)}</td></tr>)}
          <tr><td colSpan="4" style={{ textAlign: "right" }}><b>Estimated total (incl. GST)</b></td><td><b>{money(o.est_total)}</b></td></tr></tbody></table>
      <div className="g2" style={{ marginTop: 16 }}>
        <div className="f"><label>Final confirmed amount (₹)</label><input type="number" step="0.01" value={amt} placeholder={String(o.est_total)} onChange={(e) => setAmt(e.target.value)} /></div>
        <div className="f"><label>Message shown to customer (Track Order)</label><input value={pub} maxLength={500} placeholder="e.g. Dispatch on 25 Nov via XYZ transport" onChange={(e) => setPub(e.target.value)} /></div>
        <div className="f full"><label>Internal note (customer ko nahi dikhega)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

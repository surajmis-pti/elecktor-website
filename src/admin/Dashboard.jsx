import React, { useEffect, useState } from "react";
import { money } from "../utils.js";
import { OrderTable, OrderModal } from "./Orders.jsx";
import { EnquiryTable } from "./Enquiries.jsx";

export function Dashboard({ call, toast, refreshCount }) {
  const [d, setD] = useState(null);
  const [orders, setOrders] = useState([]);
  const [enq, setEnq] = useState([]);
  const [openNo, setOpenNo] = useState(null);
  const load = () => Promise.all([call("/admin/dashboard"), call("/admin/orders?status=New"), call("/admin/enquiries")])
    .then(([a, b, c]) => { setD(a); setOrders(b); setEnq(c.slice(0, 5)); }).catch((e) => toast("Error: " + e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const o = d?.orders || {};
  return (
    <>
      <div className="top"><h2>Dashboard</h2><span className="muted">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span></div>
      <div className="cards">
        <div className="kpi"><b style={{ color: "var(--amber)" }}>{o.New || 0}</b><span>New orders – action needed</span></div>
        <div className="kpi"><b style={{ color: "var(--green)" }}>{o.Confirmed || 0}</b><span>Confirmed, to dispatch</span></div>
        <div className="kpi"><b>{o.Dispatched || 0}</b><span>Dispatched</span></div>
        <div className="kpi"><b>{d ? money(d.confirmedValue).replace(/\.\d+$/, "") : "–"}</b><span>Confirmed order value</span></div>
        <div className="kpi"><b>{d?.products.live ?? "–"}<small className="muted" style={{ fontSize: 16 }}> / {d?.products.total ?? "–"}</small></b><span>Live products</span></div>
      </div>
      <div className="panel"><h3>Orders waiting for acceptance</h3><OrderTable list={orders} onOpen={setOpenNo} /></div>
      <div className="panel" style={{ marginTop: 18 }}><h3>Latest enquiries {d?.enquiries.new ? <span className="st New" style={{ fontFamily: "Barlow", fontSize: 12 }}>{d.enquiries.new} new</span> : null}</h3><EnquiryTable list={enq} /></div>
      {openNo && <OrderModal no={openNo} call={call} toast={toast} onClose={() => setOpenNo(null)} onChanged={() => { load(); refreshCount(); }} />}
    </>
  );
}

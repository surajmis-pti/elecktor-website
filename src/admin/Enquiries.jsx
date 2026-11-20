import React, { useEffect, useState } from "react";
import { dt, waCustomer } from "../utils.js";

export function EnquiryTable({ list, onStatus }) {
  if (!list.length) return <p className="muted" style={{ padding: 18 }}>No enquiries yet.</p>;
  return (
    <div className="scroll"><table><thead><tr><th>Date</th><th>Name</th><th>Type</th><th>Phone</th><th>City</th><th>Requirement</th>{onStatus && <th>Status</th>}<th></th></tr></thead>
      <tbody>{list.map((q) => (
        <tr key={q.id}>
          <td>{dt(q.created_at)}</td><td><b>{q.name}</b><div className="muted">{q.firm}</div></td><td>{q.type}</td>
          <td>{q.phone}<div className="muted">{q.email}</div></td><td>{q.city}</td><td style={{ maxWidth: 320 }}>{q.message}</td>
          {onStatus && <td><select value={q.status} onChange={(e) => onStatus(q, e.target.value)} style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: 6 }}><option>New</option><option>Contacted</option><option>Closed</option></select></td>}
          <td><a className="btn b-wa" target="_blank" rel="noopener noreferrer" href={waCustomer(q.phone, `Namaste ${q.name}, ELECKTOR INDUSTRIES se baat kar rahe hain – aapki enquiry ke baare mein.`)}>WhatsApp</a></td>
        </tr>))}
      </tbody></table></div>
  );
}

export function Enquiries({ call, toast }) {
  const [list, setList] = useState(null);
  const load = () => call("/admin/enquiries").then(setList).catch((e) => toast("Error: " + e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const setStatus = async (q, status) => {
    try { await call(`/admin/enquiries/${q.id}`, { method: "PATCH", body: { status } }); toast("Updated"); load(); } catch (e) { toast("Error: " + e.message); }
  };
  return (
    <>
      <div className="top"><h2>Enquiries</h2></div>
      <div className="panel">{list ? <EnquiryTable list={list} onStatus={setStatus} /> : <p className="muted" style={{ padding: 18 }}>Loading…</p>}</div>
    </>
  );
}

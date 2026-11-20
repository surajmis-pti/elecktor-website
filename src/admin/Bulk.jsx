import React, { useState } from "react";
import { parseCSV, downloadText } from "../utils.js";
import { COLS } from "./Products.jsx";

const ALIAS = { product_name: "name", product: "name", price: "variants", lengths: "variants", image: "image_url", photo: "image_url", color: "colour", min_order: "moq", code: "id", product_code: "id" };
const TEMPLATE = [COLS.join(","),
  `EL-3P-PVC,3 Pin PVC Power Cord,PVC Power Cords,3 core · 6A · White PVC sheath,ELECKTOR 3 pin PVC power cord for household and office appliances.,3,6A,23/38 (L 23 + N 23 + E 10),PVC,White,Household & office appliances,"Single pouch per piece · 10 pcs per pouch · 400 pcs per sack",400,pcs,3,2 m:71.26 | 2.5 yard:80.17 | 3 m:92.54,,TRUE,1`,
  `,4 Pin Heavy Duty Cord (example),PVC Power Cords,4 core · 10A,Example row – change or delete,4,10A,24/38,PVC,Black,Coolers & motors,"10 pcs per pouch, 300 per sack",300,pcs,3,2 m:110 | 3 m:140,,FALSE,4`].join("\n");

function loadXLSX() {
  return window.XLSX ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = res; s.onerror = () => rej(new Error("Excel reader load nahi hua – file CSV mein save karke upload karo"));
    document.head.appendChild(s);
  });
}

export function Bulk({ call, toast, go }) {
  const [rows, setRows] = useState([]);
  const [fname, setFname] = useState("");
  const [mode, setMode] = useState("upsert");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);
  const [existing, setExisting] = useState(new Set());

  async function read(file) {
    try {
      let table;
      if (/\.xlsx?$/i.test(file.name)) {
        await loadXLSX();
        const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
        table = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
      } else table = parseCSV(await file.text());
      if (table.length < 2) throw new Error("File mein header ke baad koi row nahi mili");
      const h = table[0].map((x) => String(x).trim().toLowerCase().replace(/\s+/g, "_"));
      const objs = table.slice(1).map((r) => {
        const o = {};
        h.forEach((k, i) => { const key = ALIAS[k] || k; if (COLS.includes(key)) o[key] = String(r[i] ?? "").trim(); });
        const errs = [];
        if (!o.name) errs.push("name missing");
        if (o.variants && o.variants.split("|").some((s) => !/:\s*\d/.test(s))) errs.push("price missing in variants");
        return { ...o, _err: errs.join(", ") };
      }).filter((o) => Object.keys(o).length > 1);
      const prods = await call("/admin/products");
      setExisting(new Set(prods.map((p) => p.id)));
      setRows(objs); setFname(file.name); setSure(false);
    } catch (e) { toast(e.message); }
  }

  async function doImport() {
    if (mode === "replace" && !sure) { setSure(true); return; }
    setBusy(true);
    try {
      const products = rows.filter((r) => !r._err).map(({ _err, ...r }) => r);
      const out = await call("/admin/products/bulk", { method: "POST", body: { products, mode } });
      toast(`Imported: ${out.added} new, ${out.updated} updated`); setRows([]); go("products");
    } catch (e) { toast("Error: " + e.message); setBusy(false); }
  }
  const bad = rows.filter((r) => r._err).length;

  return (
    <>
      <div className="top"><h2>Bulk Upload</h2></div>
      <div className="panel" style={{ padding: 18 }}>
        <p style={{ marginBottom: 10 }}>Excel (.xlsx) ya CSV file upload karo. Pehli row mein column names hone chahiye. <b>name</b> zaroori hai; <b>variants</b> is format mein: <code>2 m:71.26 | 2.5 yard:80.17 | 3 m:92.54</code>. Jis row ka <b>id</b> pehle se hai woh update hoga (khaali cell = purana value rahega), naya / khaali id = naya product.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button className="btn b-line" onClick={() => downloadText("elecktor-products-template.csv", TEMPLATE)}>Download template (CSV)</button>
          <button className="btn b-line" onClick={async () => { try { await navigator.clipboard.writeText(TEMPLATE); toast("Template copied – Excel mein paste karo"); } catch { toast("Copy blocked"); } }}>Copy template</button>
        </div>
        <div className={`drop ${hover ? "hover" : ""}`} onDragOver={(e) => { e.preventDefault(); setHover(true); }} onDragLeave={() => setHover(false)}
          onDrop={(e) => { e.preventDefault(); setHover(false); if (e.dataTransfer.files[0]) read(e.dataTransfer.files[0]); }}>
          <b>Drop file here</b> or <label className="btn b-dark" style={{ marginLeft: 6 }}>Choose file<input type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => e.target.files[0] && read(e.target.files[0])} /></label>
          <p className="muted" style={{ marginTop: 8 }}>Supported: .csv, .xlsx</p>
        </div>
        {rows.length > 0 && (
          <>
            <h3 style={{ fontSize: 21, margin: "18px 0 8px" }}>Preview – {fname}: {rows.length} rows {bad ? <span style={{ color: "var(--red)" }}>({bad} with errors – skipped)</span> : null}</h3>
            <div className="scroll" style={{ border: "1px solid var(--line)", borderRadius: 10, maxHeight: 380 }}><table>
              <thead><tr><th>#</th><th>Action</th><th>Name</th><th>Category</th><th>Variants</th><th>MOQ</th><th>Live</th><th>Check</th></tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={i} className={r._err ? "bad" : ""}><td>{i + 1}</td><td>{r.id && existing.has(r.id) ? "Update" : "New"}</td><td>{r.name}</td><td>{r.category}</td><td>{r.variants}</td><td>{r.moq}</td><td>{r.active || "TRUE"}</td>
                  <td>{r._err ? <span style={{ color: "var(--red)" }}>{r._err}</span> : "✓"}</td></tr>))}
              </tbody></table></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
              <select value={mode} onChange={(e) => { setMode(e.target.value); setSure(false); }} style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: 9 }}>
                <option value="upsert">Add new + update existing</option><option value="replace">Replace ALL products with this file</option>
              </select>
              <button className={`btn ${sure ? "b-red" : "b-dark"}`} onClick={doImport} disabled={busy || rows.length === bad}>{sure ? "Sure? Click again to replace all" : `Import ${rows.length - bad} products`}</button>
              <button className="btn b-line" onClick={() => setRows([])}>Clear</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

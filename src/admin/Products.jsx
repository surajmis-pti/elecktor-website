import React, { useEffect, useState } from "react";
import { money, resizeImage, csvCell, downloadText, variantsToText } from "../utils.js";
import { Modal } from "./Admin.jsx";

export const COLS = ["id", "name", "category", "short", "description", "cores", "rating", "conductor", "sheath", "colour", "application", "packing", "moq", "unit", "pins", "variants", "image_url", "active", "sort"];

export function Products({ call, toast }) {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);     // product object or {} for new
  const [del, setDel] = useState(null);
  const load = () => call("/admin/products").then(setList).catch((e) => toast("Error: " + e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function toggle(p) {
    try { await call(`/admin/products/${encodeURIComponent(p.id)}/active`, { method: "PATCH", body: { active: !p.active } }); toast(p.active ? "Hidden from website" : "Live on website"); load(); }
    catch (e) { toast("Error: " + e.message); }
  }
  function exportCsv() {
    downloadText("elecktor-products.csv", [COLS.join(",")].concat(list.map((p) => COLS.map((k) => csvCell(k === "variants" ? variantsToText(p.variants) : k === "image_url" && String(p.image_url).startsWith("data:") ? "" : p[k])).join(","))).join("\n"));
    toast("Products CSV downloaded");
  }
  return (
    <>
      <div className="top"><h2>Products</h2><div style={{ display: "flex", gap: 8 }}>
        <button className="btn b-line" onClick={exportCsv} disabled={!list?.length}>Export CSV</button>
        <button className="btn b-volt" onClick={() => setEdit({})}>+ Add product</button></div></div>
      <div className="panel"><div className="scroll"><table>
        <thead><tr><th></th><th>Product</th><th>Category</th><th>Lengths &amp; price / pc</th><th>MOQ</th><th>Live</th><th></th></tr></thead>
        <tbody>
          {!list ? <tr><td colSpan="7" className="muted" style={{ padding: 18 }}>Loading…</td></tr>
            : !list.length ? <tr><td colSpan="7" className="muted" style={{ padding: 18 }}>No products yet.</td></tr>
            : list.map((p) => (
              <tr key={p.id}>
                <td>{p.image_url ? <img className="thumb" src={p.image_url} alt="" /> : <span className="thumb" />}</td>
                <td><b>{p.name}</b><div className="muted">{p.id} · {p.short}</div></td>
                <td>{p.category}</td>
                <td>{p.variants.map((v) => <div key={v.label}>{v.label}: <b>{money(v.price)}</b></div>)}</td>
                <td>{p.moq || ""} {p.unit}</td>
                <td><button className={`toggle ${p.active ? "on" : ""}`} onClick={() => toggle(p)} title="Show on website" aria-label="Toggle live" /></td>
                <td style={{ whiteSpace: "nowrap" }}><button className="btn b-line" onClick={() => setEdit(p)}>Edit</button> <button className="btn b-red" onClick={() => setDel(p)}>Delete</button></td>
              </tr>
            ))}
        </tbody></table></div></div>
      {edit && <ProductForm product={edit} call={call} toast={toast} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {del && (
        <Modal title="Delete product?" onClose={() => setDel(null)} footer={<>
          <button className="btn b-line" onClick={() => setDel(null)}>Cancel</button>
          <button className="btn b-red" onClick={async () => { try { await call(`/admin/products/${encodeURIComponent(del.id)}`, { method: "DELETE" }); toast("Deleted"); setDel(null); load(); } catch (e) { toast("Error: " + e.message); } }}>Delete</button></>}>
          <b>{del.name}</b> website aur list se hat jayega. Sirf chhupana ho to "Live" toggle band karo.
        </Modal>
      )}
    </>
  );
}

function ProductForm({ product, call, toast, onClose, onSaved }) {
  const isNew = !product.id;
  const [p, setP] = useState({ name: "", category: "", short: "", description: "", cores: "", rating: "", conductor: "", sheath: "", colour: "", application: "", packing: "", moq: "", unit: "pcs", pins: "3", image_url: "", active: true, sort: "", ...product, id: product.id || "" });
  const [vars, setVars] = useState(product.variants?.length ? product.variants : [{ label: "2 m", price: "" }, { label: "2.5 yard", price: "" }, { label: "3 m", price: "" }]);
  const [busy, setBusy] = useState(false);
  const f = (k) => ({ value: p[k] ?? "", onChange: (e) => setP({ ...p, [k]: e.target.value }) });

  async function save() {
    if (!String(p.name).trim()) { toast("Product name zaroori hai"); return; }
    setBusy(true);
    try {
      let image_url = p.image_url;
      if (image_url && image_url.startsWith("data:")) image_url = (await call("/admin/upload", { method: "POST", body: { dataUrl: image_url, name: p.name } })).url;
      const body = { ...p, image_url, active: p.active === true || p.active === "true", variants: vars.filter((v) => String(v.label).trim() && String(v.price).trim() !== "").map((v) => ({ label: v.label, price: Number(v.price) || 0 })) };
      if (isNew) await call("/admin/products", { method: "POST", body });
      else await call(`/admin/products/${encodeURIComponent(product.id)}`, { method: "PUT", body });
      toast("Product saved"); onSaved();
    } catch (e) { toast("Error: " + e.message); setBusy(false); }
  }

  return (
    <Modal title={isNew ? "Add product" : "Edit product"} onClose={onClose} footer={<>
      <button className="btn b-line" onClick={onClose}>Cancel</button>
      <button className="btn b-dark" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save product"}</button></>}>
      <div className="g2">
        <div className="f full"><label>Product name *</label><input {...f("name")} maxLength={200} /></div>
        <div className="f"><label>Category (e.g. PVC Power Cords)</label><input {...f("category")} /></div>
        <div className="f"><label>Short line (card par dikhega)</label><input {...f("short")} /></div>
        <div className="f full"><label>Description</label><textarea {...f("description")} /></div>
      </div>
      <div className="g3" style={{ marginTop: 12 }}>
        <div className="f"><label>Cores</label><input {...f("cores")} /></div>
        <div className="f"><label>Rating (e.g. 6A)</label><input {...f("rating")} /></div>
        <div className="f"><label>Conductor</label><input {...f("conductor")} /></div>
        <div className="f"><label>Sheath / outer</label><input {...f("sheath")} /></div>
        <div className="f"><label>Colour</label><input {...f("colour")} /></div>
        <div className="f"><label>Application</label><input {...f("application")} /></div>
        <div className="f"><label>MOQ</label><input type="number" min="0" {...f("moq")} /></div>
        <div className="f"><label>Unit</label><input {...f("unit")} /></div>
        <div className="f"><label>Plug</label><select {...f("pins")}><option value="3">3 pin</option><option value="2">2 pin</option><option value="0">Other</option></select></div>
        <div className="f full"><label>Packing</label><input {...f("packing")} /></div>
        <div className="f"><label>Display order</label><input type="number" {...f("sort")} /></div>
        <div className="f"><label>Product code {isNew ? "(auto if blank)" : ""}</label><input {...f("id")} /></div>
        <div className="f"><label>Show on website</label><select value={String(p.active)} onChange={(e) => setP({ ...p, active: e.target.value === "true" })}><option value="true">Yes – live</option><option value="false">No – hidden</option></select></div>
      </div>
      <h3 style={{ fontSize: 19, margin: "18px 0 8px" }}>Lengths &amp; price per piece (incl. GST)</h3>
      {vars.map((v, i) => (
        <div className="vrow" key={i}>
          <input style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: 9 }} placeholder="Length e.g. 2 m" value={v.label} onChange={(e) => setVars(vars.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input type="number" step="0.01" style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: 9 }} placeholder="₹ / pc" value={v.price} onChange={(e) => setVars(vars.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
          <button type="button" className="x" onClick={() => setVars(vars.filter((_, j) => j !== i))} aria-label="Remove length">×</button>
        </div>
      ))}
      <button type="button" className="btn b-line" onClick={() => setVars([...vars, { label: "", price: "" }])}>+ Add length</button>
      <h3 style={{ fontSize: 19, margin: "18px 0 8px" }}>Photo</h3>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        {p.image_url ? <img className="thumb" style={{ width: 120, height: 90 }} src={p.image_url} alt="" /> : <span className="thumb" style={{ width: 120, height: 90 }} />}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const file = e.target.files[0]; if (file) setP({ ...p, image_url: await resizeImage(file) }); }} />
        {p.image_url && <button type="button" className="btn b-red" onClick={() => setP({ ...p, image_url: "" })}>Remove photo</button>}
      </div>
    </Modal>
  );
}

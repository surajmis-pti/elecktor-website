import React, { useState } from "react";
import { SITE } from "../config.js";
import { money, wa } from "../utils.js";
import { Overlay, ProductPic } from "./parts.jsx";

const STEP = 10; // 10 pcs per pouch

export default function ProductModal({ product: p, onClose, onAdd }) {
  const min = p?.moq || STEP;
  const [vi, setVi] = useState(0);
  const [qty, setQty] = useState(min);
  if (!p) return null;
  const v = p.variants[vi];
  const rows = [["Cores", p.cores], ["Current rating", p.rating], ["Conductor", p.conductor], ["Sheath / outer", p.sheath], ["Colour", p.colour], ["Application", p.application], ["Packing", p.packing], ["MOQ", p.moq ? `${p.moq} ${p.unit || "pcs"}` : ""]].filter((r) => r[1]);
  const add = () => {
    const n = Math.max(min, Math.floor(Number(qty) || 0));
    onAdd({ productId: p.id, name: p.name, variant: v ? v.label : "Standard", rate: v ? v.price : 0, qty: n, moq: min });
  };
  return (
    <Overlay open onClose={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={p.name}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <div className="pd">
          <div className="pic"><ProductPic p={p} /></div>
          <div className="info">
            <span className="eyebrow">{p.category}</span>
            <h3>{p.name}</h3>
            <p style={{ color: "var(--steel)" }}>{p.description}</p>
            <table className="spec-t"><tbody>{rows.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td></tr>)}</tbody></table>
            <b>Choose length</b>
            <div className="vars">
              {p.variants.length ? p.variants.map((x, i) => (
                <button key={x.label} className={`var ${i === vi ? "on" : ""}`} onClick={() => setVi(i)}>
                  <b>{x.label}</b>{SITE.showPrices && x.price ? <small>{money(x.price)} / pc</small> : null}
                </button>
              )) : <small>Length on request</small>}
            </div>
            <b>Quantity (pieces)</b>
            <div className="qty">
              <button className="pm" onClick={() => setQty((q) => Math.max(min, (Number(q) || 0) - STEP))} aria-label="Less">−</button>
              <input type="number" min={min} step={STEP} value={qty} onChange={(e) => setQty(e.target.value)} onBlur={() => setQty((q) => Math.max(min, Number(q) || 0))} aria-label="Quantity" />
              <button className="pm" onClick={() => setQty((q) => (Number(q) || 0) + STEP)} aria-label="More">+</button>
              <small style={{ color: "var(--steel)" }}>Min {min} · in multiples of {STEP}</small>
            </div>
            {SITE.showPrices && v?.price ? <div style={{ fontWeight: 700, marginBottom: 14 }}>Estimated value: {money(v.price * (Number(qty) || 0))} ({qty} pcs × {money(v.price)})</div> : null}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-volt" onClick={add}>Add to Order</button>
              <a className="btn btn-wa" target="_blank" rel="noopener noreferrer" href={wa(`Hello ELECKTOR, I want a quote for ${p.name}`)}>Ask on WhatsApp</a>
            </div>
            {SITE.showPrices ? <p className="note">* {SITE.priceNote}</p> : null}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

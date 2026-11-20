import React, { useEffect, useMemo, useState } from "react";
import "../site.css";
import { SITE } from "../config.js";
import { api } from "../api.js";
import { money, minPrice, wa } from "../utils.js";
import { Logo, WhatsAppIcon, CartIcon, ProductPic, Overlay, Msg, useReveal } from "./parts.jsx";
import ProductModal from "./ProductModal.jsx";
import CartDrawer from "./CartDrawer.jsx";
import TrackModal from "./TrackModal.jsx";

const GALLERY = [
  ["extrusion-line", "PVC extrusion line", "big"], ["payoff-rack", "Copper pay-off rack", "tall"], ["buncher", "Copper bunching"],
  ["moulding", "Plug moulding machines"], ["assembly-2", "Assembly & testing floor", "big"], ["copper-bobbins", "Copper strands"],
  ["line-overview", "Production hall"], ["control-panel-front", "Extruder control panel"], ["coiler", "Coiling station"],
];
const STEPS = [
  ["Copper pay-off", "Fine copper strands are fed from bobbin racks with controlled tension."],
  ["Bunching", "Strands are bunched into flexible conductors for each core."],
  ["PVC extrusion", "Insulation and outer sheath are extruded on dual-extruder lines."],
  ["Coiling & cutting", "Cable is coiled and cut to 2 m, 2.5 yard or 3 m lengths."],
  ["Plug moulding", "2 pin and 3 pin plugs are moulded directly onto the cord."],
  ["Testing & packing", "Cords are checked and packed one per branded pouch, then into sacks."],
];
const WHY = [
  ["🏭", "Direct from manufacturer", "No middle layer. You buy from the plant that makes the cord."],
  ["📦", "Retail-ready packing", "Each cord comes in its own ELECKTOR pouch, ready for the shop counter."],
  ["📏", "Three standard lengths", "2 m, 2.5 yard and 3 m in every product, so you stock what sells."],
  ["🔁", "Consistent batches", "In-house bunching, extrusion and moulding keep every lot the same."],
  ["🤝", "OEM & bulk supply", "Regular schedules and bulk rates for appliance makers and distributors."],
  ["🚚", "Pan-India dispatch", "Dispatch through your preferred transporter, anywhere in India."],
];
const HOW = [["Place order", "Add products and send your order from this website."], ["We confirm", "Our team confirms the final rate, quantity and dispatch date."], ["Advance payment", "Pay 100% advance against our proforma invoice."], ["Dispatch", "Goods ship to your transporter. Track status with your Order ID."]];
const FAQ = [
  ["What is the minimum order quantity?", "MOQ is one sack per product: 400 pieces for 3 pin cords and 600 pieces for 2 pin cords. Quantities go up in pouches of 10 pieces."],
  ["Are the prices on the website final?", "Website prices include 18% GST and are a guide. Power cord rates move with copper, so our team confirms the final rate when we accept your order."],
  ["What are the payment and freight terms?", "Payment is 100% advance against our proforma invoice. Freight is on the buyer's account; we dispatch through your preferred transporter."],
  ["Do you make custom lengths or OEM cords?", "Yes. For custom lengths, colours or OEM packing, send an enquiry with your quantity and we will share a quote."],
  ["How do I track my order?", 'After you place an order you get an Order ID (for example ELK-1001). Use "Track Order" with that ID and your mobile number to see the latest status.'],
];

function loadCart() { try { return JSON.parse(sessionStorage.getItem("elk_cart") || "[]"); } catch { return []; } }

export default function Site() {
  const [products, setProducts] = useState(null);
  const [loadErr, setLoadErr] = useState(false);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);         // product in modal
  const [cart, setCartState] = useState(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const setCart = (c) => { setCartState(c); try { sessionStorage.setItem("elk_cart", JSON.stringify(c)); } catch { /* ignore */ } };

  useEffect(() => {
    api("/products").then(setProducts).catch(() => setLoadErr(true));
  }, []);
  useReveal([products]);

  const cats = useMemo(() => ["All", ...new Set((products || []).map((p) => p.category).filter(Boolean))], [products]);
  const list = (products || []).filter((p) => (cat === "All" || p.category === cat) &&
    (!search || `${p.name} ${p.short} ${p.category} ${p.description}`.toLowerCase().includes(search.toLowerCase())));

  const addToCart = (line) => {
    const ex = cart.find((c) => c.productId === line.productId && c.variant === line.variant);
    setCart(ex ? cart.map((c) => (c === ex ? { ...c, qty: c.qty + line.qty } : c)) : [...cart, line]);
    setOpen(null); setCartOpen(true);
  };
  const waHello = wa("Hello ELECKTOR INDUSTRIES, I want rates for your power cords.");

  return (
    <>
      <div className="topbar"><div className="wrap">
        <span>📞 <b>{SITE.phone}</b> &nbsp;·&nbsp; ✉️ <b>{SITE.email}</b></span>
        <span className="hide-m">🕘 {SITE.hours}</span>
      </div></div>

      <header className="nav"><div className="wrap">
        <a href="#home" aria-label="ELECKTOR INDUSTRIES home"><Logo /></a>
        <nav className={`menu ${menu ? "open" : ""}`} onClick={() => setMenu(false)}>
          <a href="#products">Products</a><a href="#factory">Factory</a><a href="#process">Process</a>
          <a href="#about">About</a><a href="#faq">FAQ</a><a href="#contact">Contact</a>
          <a href="#track" onClick={(e) => { e.preventDefault(); setTrackOpen(true); }}>Track Order</a>
        </nav>
        <div className="nav-actions">
          <a className="btn btn-volt btn-sm btn-quote" href="#contact">Get a Quote</a>
          <button className="btn btn-dark btn-sm cart-btn" onClick={() => setCartOpen(true)} aria-label="Open order list">
            <CartIcon /> <span className="lbl">Order</span> <span className="cart-count">{cart.length}</span>
          </button>
          <button className="burger" onClick={() => setMenu(!menu)} aria-label="Menu">☰</button>
        </div>
      </div></header>

      <section className="hero" id="home" style={{ padding: 0 }}>
        <div className="hero-bg" />
        <svg className="spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="#ffc61a" /></svg>
        <div className="wrap">
          <div>
            <span className="eyebrow">Power Cord Manufacturer · Sonipat, Haryana</span>
            <h1>Power cords that <em>plug the future</em></h1>
            <p className="lead">2 pin and 3 pin PVC power cords and cotton braided iron/heater cords — drawn, extruded, moulded, tested and pouch-packed in our own plant. Built for dealers, distributors, OEMs and electrical shops across India.</p>
            <div className="ctas">
              <a className="btn btn-volt" href="#products">View Products →</a>
              <a className="btn btn-ghost" href={waHello} target="_blank" rel="noopener noreferrer">WhatsApp for Rates</a>
            </div>
          </div>
          <div className="hero-card">
            <div className="stats">
              <div className="stat"><b>{SITE.plantSize}</b><span>Manufacturing plant</span></div>
              <div className="stat"><b>{SITE.customers}</b><span>Customers served</span></div>
              <div className="stat"><b>In-house</b><span>Bunching · extrusion · moulding</span></div>
              <div className="stat"><b>6A</b><span>2 core &amp; 3 core cords</span></div>
            </div>
            <div className="pin">📍 <span>Factory: <b>{SITE.location}</b></span></div>
          </div>
        </div>
      </section>

      <div className="serve"><div className="wrap">
        {["Dealers", "Distributors", "OEM Supply", "Electrical Shops", "Pan-India Dispatch"].map((s) => <span key={s}>⚡ {s}</span>)}
      </div></div>

      <section id="products">
        <div className="wrap">
          <div className="sec-head reveal">
            <div><span className="eyebrow">Our Range</span><h2>Products</h2></div>
            <p>Choose a product, pick the length and quantity, and send your order. Our team confirms rate and dispatch date before you pay.</p>
          </div>
          <div className="chips">
            {cats.map((c) => <button key={c} className={`chip ${c === cat ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
            <label className="search">🔎<input placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" /></label>
          </div>
          <div className="grid">
            {loadErr ? <div className="empty">Products could not load right now. Please call {SITE.phone}.</div>
              : !products ? <div className="empty">Loading products…</div>
              : !list.length ? <div className="empty">No products found.</div>
              : list.map((p) => {
                const mp = minPrice(p);
                return (
                  <article className="card" key={p.id}>
                    <div className="thumb"><ProductPic p={p} /><span className="badge">{p.category || "Power Cord"}</span></div>
                    <div className="body">
                      <h3>{p.name}</h3>
                      <div className="spec">{p.short}</div>
                      <div className="spec">Lengths: {p.variants.map((v) => v.label).join(" · ") || "On request"}</div>
                      <div className="row">
                        <div className="price">{SITE.showPrices && mp ? <><small>Starting from</small><b>{money(mp)}</b> <small style={{ display: "inline" }}>/ pc*</small></> : <b style={{ fontSize: 20 }}>Price on request</b>}</div>
                        <div className="moq">{p.moq ? <>MOQ<br /><b>{p.moq} {p.unit || "pcs"}</b></> : null}</div>
                      </div>
                      <button className="btn btn-dark" style={{ justifyContent: "center", marginTop: 10 }} onClick={() => setOpen(p)}>View &amp; Order</button>
                    </div>
                  </article>
                );
              })}
          </div>
          {SITE.showPrices && <p className="note">* {SITE.priceNote}</p>}
        </div>
      </section>

      <section id="factory">
        <div className="wrap">
          <div className="sec-head reveal">
            <div><span className="eyebrow">Inside the plant</span><h2>Our Factory</h2></div>
            <p>A {SITE.plantSize} plant in Sonipat with copper bunching, PVC extrusion lines, plug moulding machines and a dedicated assembly and testing floor.</p>
          </div>
          <div className="gallery reveal">
            {GALLERY.map(([f, cap, cls]) => (
              <figure key={f} className={cls || ""} onClick={() => setLightbox(`/img/${f}.jpg`)}>
                <img src={`/img/${f}.jpg`} alt={cap} loading="lazy" /><figcaption>{cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="process">
        <div className="wrap">
          <div className="sec-head reveal">
            <div><span className="eyebrow" style={{ color: "var(--volt)" }}>How a cord is made</span><h2>From copper to carton</h2></div>
            <p>Every stage runs under one roof, so quality, length and packing stay consistent from batch to batch.</p>
          </div>
          <div className="steps reveal">{STEPS.map(([h, t]) => <div className="step" key={h}><h4>{h}</h4><p>{t}</p></div>)}</div>
        </div>
      </section>

      <section id="why">
        <div className="wrap">
          <div className="sec-head reveal">
            <div><span className="eyebrow">Why ELECKTOR</span><h2>Built for the trade</h2></div>
            <p>We work with the people who sell cords every day, so our packing, MOQ and pricing are set up for resale.</p>
          </div>
          <div className="why reveal">{WHY.map(([ic, h, t]) => <div key={h}><span className="ic">{ic}</span><h3>{h}</h3><p>{t}</p></div>)}</div>
          <div className="how reveal">{HOW.map(([h, t], i) => <div key={h}><b>Step {i + 1}</b><h4>{h}</h4><p>{t}</p></div>)}</div>
        </div>
      </section>

      <section id="about">
        <div className="wrap about">
          <div className="pic reveal"><img src="/img/assembly-2.jpg" alt="ELECKTOR assembly and testing floor" loading="lazy" /><span className="tag">Made in Sonipat</span></div>
          <div className="reveal">
            <span className="eyebrow">About ELECKTOR</span>
            <h2>A focused power cord plant</h2>
            <p>ELECKTOR INDUSTRIES makes power cords and nothing else. Our {SITE.plantSize} plant in Sonipat, Haryana runs copper bunching, PVC extrusion, plug moulding, assembly and testing under one roof.</p>
            <p>Every cord leaves the plant in its own ELECKTOR-branded pouch, ready for the shop counter. We supply dealers, distributors, OEMs and electrical shops across India, and serve {SITE.customers} customers today.</p>
            <ul className="ticks">{["In-house extrusion & moulding", "Three standard lengths", "Retail-ready pouch packing", "GST invoice with every order", "Bulk & OEM schedules", "Pan-India dispatch"].map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </div>
      </section>

      <section id="faq" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="sec-head reveal"><div><span className="eyebrow">Buyer questions</span><h2>FAQ</h2></div><p>Quick answers for dealers and OEM buyers. Anything else, WhatsApp us.</p></div>
          <div className="faq">{FAQ.map(([qq, a]) => <details key={qq}><summary>{qq}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>

      <section id="contact">
        <div className="wrap">
          <div className="sec-head reveal">
            <div><span className="eyebrow">Talk to sales</span><h2>Contact Us</h2></div>
            <p>Send an enquiry for rates, bulk discounts, OEM or custom lengths. We reply on the same working day.</p>
          </div>
          <div className="contact reveal">
            <div className="cbox">
              <h3>ELECKTOR INDUSTRIES</h3>
              <div className="cline">📍<div><small>Factory location</small><b>{SITE.location}</b></div></div>
              <div className="cline">📞<div><small>Phone / WhatsApp</small><a href={`tel:+${SITE.phoneRaw}`}><b>{SITE.phone}</b></a></div></div>
              <div className="cline">✉️<div><small>Email</small><a href={`mailto:${SITE.email}`}><b>{SITE.email}</b></a></div></div>
              <div className="cline" style={{ border: 0 }}>🕘<div><small>Working hours</small><b>{SITE.hours}</b></div></div>
              <a className="btn btn-wa" href={waHello} target="_blank" rel="noopener noreferrer" style={{ marginTop: 14 }}>Chat on WhatsApp</a>
            </div>
            <EnquiryForm />
          </div>
        </div>
      </section>

      <footer><div className="wrap">
        <div className="foot">
          <div><div style={{ marginBottom: 14 }}><Logo light /></div><p>Manufacturer of 2 pin and 3 pin PVC power cords and cotton braided power cords. {SITE.location}.</p></div>
          <div><h4>Products</h4><ul>{(products || []).slice(0, 5).map((p) => <li key={p.id}><a href="#products">{p.name}</a></li>)}</ul></div>
          <div><h4>Company</h4><ul><li><a href="#about">About</a></li><li><a href="#factory">Factory</a></li><li><a href="#faq">FAQ</a></li><li><a href="#track" onClick={(e) => { e.preventDefault(); setTrackOpen(true); }}>Track Order</a></li></ul></div>
          <div><h4>Contact</h4><ul><li>{SITE.phone}</li><li>{SITE.email}</li><li>{SITE.hours}</li></ul></div>
        </div>
        <div className="copy"><span>© {new Date().getFullYear()} ELECKTOR INDUSTRIES. All rights reserved.</span><span>{SITE.location} · <a className="staff" href="/admin">Staff login</a></span></div>
      </div></footer>

      <a className="wa-float" href={waHello} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon /></a>

      {open && <ProductModal key={open.id} product={open} onClose={() => setOpen(null)} onAdd={addToCart} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setCart={setCart} />
      <TrackModal open={trackOpen} onClose={() => setTrackOpen(false)} />
      <Overlay open={!!lightbox} onClose={() => setLightbox(null)} className="lightbox">
        <img src={lightbox || ""} alt="" onClick={() => setLightbox(null)} />
      </Overlay>
    </>
  );
}

function EnquiryForm() {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    setBusy(true); setMsg(null);
    try {
      await api("/enquiries", { method: "POST", body: Object.fromEntries(new FormData(f)) });
      setMsg({ ok: true, text: "Thank you! Our sales team will contact you soon." }); f.reset();
    } catch (er) { setMsg({ ok: false, text: `${er.message} You can also call ${SITE.phone}.` }); }
    finally { setBusy(false); }
  }
  return (
    <form className="form" onSubmit={submit}>
      <h3>Send an enquiry</h3>
      <p style={{ color: "var(--steel)" }}>Fields marked * are required.</p>
      <div className="fgrid">
        <div className="f"><label>Your name *</label><input name="name" required maxLength={120} /></div>
        <div className="f"><label>Firm / shop name</label><input name="firm" maxLength={160} /></div>
        <div className="f"><label>Mobile number *</label><input name="phone" required inputMode="tel" pattern="[0-9+ ]{10,15}" title="10 digit mobile number" /></div>
        <div className="f"><label>Email</label><input name="email" type="email" maxLength={160} /></div>
        <div className="f"><label>City</label><input name="city" maxLength={80} /></div>
        <div className="f"><label>You are a</label><select name="type"><option>Dealer</option><option>Distributor</option><option>OEM / Manufacturer</option><option>Electrical shop</option><option>Other</option></select></div>
        <div className="f full"><label>Requirement *</label><textarea name="message" required maxLength={2000} placeholder="Product, length, quantity…" /></div>
      </div>
      <button className="btn btn-dark" style={{ marginTop: 16 }} disabled={busy}>{busy ? "Sending…" : "Send Enquiry"}</button>
      <Msg msg={msg} />
    </form>
  );
}

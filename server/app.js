// =====================================================================
// ELECKTOR INDUSTRIES – Node.js (Express) API
// Public:  /api/products, /api/orders, /api/orders/track, /api/enquiries
// Admin:   /api/admin/*  (JWT login, orders accept/confirm, products, bulk, photos, enquiries)
// =====================================================================
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { q, tx } from "./db.js";
import { uploadImage, httpError } from "./storage.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4mb" }));

const STATUSES = ["New", "Confirmed", "Rejected", "Dispatched", "Completed"];
const NEXT = { New: ["Confirmed", "Rejected"], Confirmed: ["Dispatched", "Rejected"], Dispatched: ["Completed"], Completed: [], Rejected: ["New"] };
const P_FIELDS = ["name", "category", "short", "description", "cores", "rating", "conductor", "sheath", "colour", "application", "packing", "unit", "pins", "image_url"];

// ---------- helpers ----------
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const str = (v, max = 2000) => String(v ?? "").trim().slice(0, max);
const phone10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const bool = (v) => !(v === false || v === 0 || /^(false|no|0|n|off)$/i.test(String(v ?? "").trim()));

function parseVariants(v) {
  if (Array.isArray(v)) return v.map((x, i) => ({ label: str(x.label, 60), price: round2(x.price || 0), sort: i + 1 })).filter((x) => x.label);
  return String(v || "").split("|").map((s) => s.trim()).filter(Boolean).map((s, i) => {
    const k = s.lastIndexOf(":");
    return k < 0 ? { label: s.slice(0, 60), price: 0, sort: i + 1 } : { label: s.slice(0, k).trim().slice(0, 60), price: round2(s.slice(k + 1)), sort: i + 1 };
  }).filter((x) => x.label);
}
function makeId(name) {
  return "EL-" + String(name).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) + "-" + Math.floor(100 + Math.random() * 900);
}

async function productsWithVariants(where = "") {
  const { rows } = await q(`
    select p.*, coalesce(json_agg(json_build_object('label', v.label, 'price', v.price) order by v.sort, v.id)
             filter (where v.id is not null), '[]') as variants
    from products p left join product_variants v on v.product_id = p.id
    ${where}
    group by p.id order by p.sort, p.created_at`);
  return rows.map((p) => ({ ...p, variants: p.variants.map((v) => ({ label: v.label, price: Number(v.price) })) }));
}

// ---------- auth ----------
function secret() {
  const s = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!s || s.length < 24) throw httpError(500, "JWT_SECRET is not configured");
  return s;
}
function auth(req, _res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    req.admin = jwt.verify(token, secret());
    next();
  } catch (e) {
    next(e.status ? e : httpError(401, "Please login again"));
  }
}
const sign = (a) => jwt.sign({ id: a.id, email: a.email, name: a.name }, secret(), { expiresIn: "12h" });

// ======================= PUBLIC =======================
app.get("/api/health", wrap(async (_req, res) => {
  await q("select 1");
  res.json({ ok: true });
}));

app.get("/api/products", wrap(async (_req, res) => {
  res.set("Cache-Control", "no-store");
  const list = await productsWithVariants("where p.active = true");
  res.json(list.map(({ created_at, updated_at, ...p }) => p));
}));

app.post("/api/orders", wrap(async (req, res) => {
  const c = req.body?.customer || {};
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  if (!str(c.name) || !str(c.firm) || !str(c.city) || !str(c.state)) throw httpError(400, "Name, firm, city and state are required");
  if (phone10(c.phone).length !== 10) throw httpError(400, "Please enter a valid 10 digit mobile number");
  if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) throw httpError(400, "Please enter a valid email");
  if (!items.length) throw httpError(400, "Add at least one product");

  // rate hamesha database se – browser se aaya rate kabhi use nahi hota
  const ids = [...new Set(items.map((i) => str(i.productId, 60)))];
  const { rows: pr } = await q(
    `select p.id, p.name, p.moq, json_agg(json_build_object('label', v.label, 'price', v.price)) as variants
       from products p join product_variants v on v.product_id = p.id
      where p.active = true and p.id = any($1::text[]) group by p.id`, [ids]);
  const byId = Object.fromEntries(pr.map((p) => [p.id, p]));
  const lines = items.map((i) => {
    const p = byId[str(i.productId, 60)];
    if (!p) throw httpError(400, "A product in your order is no longer available");
    const v = p.variants.find((x) => x.label === i.variant);
    if (!v) throw httpError(400, `Length "${str(i.variant, 30)}" is not available for ${p.name}`);
    const qty = Math.floor(Number(i.qty) || 0);
    if (qty < 1 || qty > 1_000_000) throw httpError(400, "Invalid quantity");
    if (p.moq && qty < p.moq) throw httpError(400, `Minimum order for ${p.name} is ${p.moq} pcs`);
    const rate = Number(v.price);
    return { product_id: p.id, product_name: p.name, variant: v.label, rate, qty, amount: round2(rate * qty) };
  });
  const est = round2(lines.reduce((s, l) => s + l.amount, 0));

  const orderNo = await tx(async (cl) => {
    const { rows } = await cl.query(
      `insert into orders (cust_name, cust_firm, cust_phone, cust_email, cust_gst, cust_city, cust_state, cust_address, cust_notes, est_total)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id, order_no`,
      [str(c.name, 120), str(c.firm, 160), str(c.phone, 20), str(c.email, 160), str(c.gst, 15).toUpperCase(), str(c.city, 80), str(c.state, 80), str(c.address, 600), str(c.notes, 1000), est]);
    const o = rows[0];
    for (const l of lines) {
      await cl.query(`insert into order_items (order_id, product_id, product_name, variant, rate, qty, amount) values ($1,$2,$3,$4,$5,$6,$7)`,
        [o.id, l.product_id, l.product_name, l.variant, l.rate, l.qty, l.amount]);
    }
    await cl.query(`insert into order_status_history (order_id, status, note) values ($1,'New','Order placed on website')`, [o.id]);
    return o.order_no;
  });
  res.status(201).json({ orderNo, estTotal: est });
}));

app.post("/api/orders/track", wrap(async (req, res) => {
  const no = str(req.body?.orderNo, 20).toUpperCase();
  const ph = phone10(req.body?.phone);
  const { rows } = await q(`select * from orders where upper(order_no) = $1`, [no]);
  const o = rows[0];
  if (!o || phone10(o.cust_phone) !== ph) throw httpError(404, "Order not found. Check Order ID and mobile number.");
  const [{ rows: items }, { rows: hist }] = await Promise.all([
    q(`select product_name, variant, qty from order_items where order_id = $1 order by id`, [o.id]),
    q(`select status, note, created_at from order_status_history where order_id = $1 order by created_at`, [o.id]),
  ]);
  res.json({ orderNo: o.order_no, status: o.status, createdAt: o.created_at, finalAmount: o.final_amount, publicNote: o.public_note, items, history: hist });
}));

app.post("/api/enquiries", wrap(async (req, res) => {
  const e = req.body || {};
  if (!str(e.name) || phone10(e.phone).length !== 10 || !str(e.message)) throw httpError(400, "Name, valid mobile and requirement are required");
  await q(`insert into enquiries (name, firm, phone, email, city, type, message) values ($1,$2,$3,$4,$5,$6,$7)`,
    [str(e.name, 120), str(e.firm, 160), str(e.phone, 20), str(e.email, 160), str(e.city, 80), str(e.type, 40), str(e.message, 2000)]);
  res.status(201).json({ ok: true });
}));

// ======================= ADMIN =======================
app.get("/api/admin/setup-status", wrap(async (_req, res) => {
  const { rows } = await q(`select count(*)::int as n from admins`);
  res.json({ needsSetup: rows[0].n === 0 });
}));

// pehla admin banane ke liye (sirf jab koi admin na ho) – SETUP_KEY Vercel env mein hota hai
app.post("/api/admin/setup", wrap(async (req, res) => {
  const { setupKey, email, name, password } = req.body || {};
  if (!process.env.SETUP_KEY || setupKey !== process.env.SETUP_KEY) throw httpError(403, "Wrong setup key");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || "")) throw httpError(400, "Valid email required");
  if (String(password || "").length < 8) throw httpError(400, "Password must be at least 8 characters");
  const admin = await tx(async (cl) => {
    const { rows } = await cl.query(`select count(*)::int as n from admins`);
    if (rows[0].n > 0) throw httpError(409, "Admin already exists. Please login.");
    const hash = await bcrypt.hash(password, 10);
    const r = await cl.query(`insert into admins (email, name, password_hash) values ($1,$2,$3) returning id, email, name`, [str(email, 160).toLowerCase(), str(name, 80), hash]);
    return r.rows[0];
  });
  res.status(201).json({ token: sign(admin), admin });
}));

app.post("/api/admin/login", wrap(async (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase(), password = String(req.body?.password || "");
  const { rows: att } = await q(`select count(*)::int as n from login_attempts where email = $1 and ok = false and created_at > now() - interval '15 minutes'`, [email]);
  if (att[0].n >= 8) throw httpError(429, "Too many wrong attempts. Try again after 15 minutes.");
  const { rows } = await q(`select * from admins where email = $1`, [email]);
  const a = rows[0];
  const ok = !!a && (await bcrypt.compare(password, a.password_hash));
  await q(`insert into login_attempts (email, ok) values ($1,$2)`, [email, ok]);
  if (!ok) throw httpError(401, "Wrong email or password");
  res.json({ token: sign(a), admin: { id: a.id, email: a.email, name: a.name } });
}));

app.use("/api/admin", (req, res, next) => (["/setup-status", "/setup", "/login"].includes(req.path) ? next() : auth(req, res, next)));

app.get("/api/admin/me", (req, res) => res.json(req.admin));

app.post("/api/admin/password", wrap(async (req, res) => {
  const { current, next: nw } = req.body || {};
  if (String(nw || "").length < 8) throw httpError(400, "New password must be at least 8 characters");
  const { rows } = await q(`select * from admins where id = $1`, [req.admin.id]);
  if (!rows[0] || !(await bcrypt.compare(String(current || ""), rows[0].password_hash))) throw httpError(400, "Current password is wrong");
  await q(`update admins set password_hash = $1 where id = $2`, [await bcrypt.hash(nw, 10), req.admin.id]);
  res.json({ ok: true });
}));

app.get("/api/admin/dashboard", wrap(async (_req, res) => {
  const [{ rows: st }, { rows: pr }, { rows: en }, { rows: val }] = await Promise.all([
    q(`select status, count(*)::int as n from orders group by status`),
    q(`select count(*)::int as total, count(*) filter (where active)::int as live from products`),
    q(`select count(*) filter (where status = 'New')::int as new, count(*)::int as total from enquiries`),
    q(`select coalesce(sum(coalesce(final_amount, est_total)), 0) as v from orders where status in ('Confirmed','Dispatched','Completed')`),
  ]);
  res.json({ orders: Object.fromEntries(st.map((r) => [r.status, r.n])), products: pr[0], enquiries: en[0], confirmedValue: Number(val[0].v) });
}));

// ----- orders -----
app.get("/api/admin/orders", wrap(async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const search = str(req.query.q, 80);
  const params = [];
  let where = "where 1=1";
  if (status) { params.push(status); where += ` and o.status = $${params.length}`; }
  if (search) { params.push(`%${search}%`); where += ` and (o.order_no ilike $${params.length} or o.cust_name ilike $${params.length} or o.cust_firm ilike $${params.length} or o.cust_phone ilike $${params.length} or o.cust_city ilike $${params.length})`; }
  const { rows } = await q(`
    select o.*, (select count(*)::int from order_items i where i.order_id = o.id) as item_count,
           (select coalesce(sum(qty),0)::int from order_items i where i.order_id = o.id) as total_qty
      from orders o ${where} order by o.created_at desc limit 500`, params);
  res.json(rows);
}));

async function orderDetail(no) {
  const { rows } = await q(`select * from orders where order_no = $1`, [no]);
  if (!rows[0]) throw httpError(404, "Order not found");
  const o = rows[0];
  const [{ rows: items }, { rows: history }] = await Promise.all([
    q(`select * from order_items where order_id = $1 order by id`, [o.id]),
    q(`select * from order_status_history where order_id = $1 order by created_at`, [o.id]),
  ]);
  return { ...o, items, history };
}
app.get("/api/admin/orders/:no", wrap(async (req, res) => res.json(await orderDetail(req.params.no))));

app.patch("/api/admin/orders/:no", wrap(async (req, res) => {
  const b = req.body || {};
  await tx(async (cl) => {
    const { rows } = await cl.query(`select * from orders where order_no = $1 for update`, [req.params.no]);
    const o = rows[0];
    if (!o) throw httpError(404, "Order not found");
    const sets = [], vals = [];
    const set = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    if (b.status && !(NEXT[o.status] || []).includes(b.status)) throw httpError(400, `Cannot move order from ${o.status} to ${b.status}`);
    const noAmount = b.finalAmount === undefined || b.finalAmount === null || b.finalAmount === "";
    if (b.status === "Confirmed" && noAmount) set("final_amount", o.final_amount ?? o.est_total); // amount na bhara ho to estimate hi final
    else if (b.finalAmount !== undefined) set("final_amount", noAmount ? null : round2(b.finalAmount));
    if (b.publicNote !== undefined) set("public_note", str(b.publicNote, 500));
    if (b.adminNote !== undefined) set("admin_note", str(b.adminNote, 2000));
    if (b.status) {
      set("status", b.status);
      await cl.query(`insert into order_status_history (order_id, status, note, by_admin) values ($1,$2,$3,$4)`, [o.id, b.status, str(b.publicNote, 500), req.admin.email]);
    }
    if (!sets.length) return;
    vals.push(o.id);
    await cl.query(`update orders set ${sets.join(", ")}, updated_at = now() where id = $${vals.length}`, vals);
  });
  res.json(await orderDetail(req.params.no));
}));

// ----- products -----
app.get("/api/admin/products", wrap(async (_req, res) => res.json(await productsWithVariants())));

async function upsertProduct(cl, p, originalId, partial = false) {
  const name = str(p.name, 200);
  if (!name) throw httpError(400, "Product name is required");
  const id = str(p.id, 60) || originalId || makeId(name);
  // partial (bulk upload): khaali cell = purana value rakho. Form se edit: khaali = khaali kar do.
  const has = (f) => p[f] !== undefined && p[f] !== null && (!(partial || ["moq", "sort", "active"].includes(f)) || !(typeof p[f] === "string" && p[f].trim() === ""));
  const fieldVal = (f) => str(p[f], f === "description" ? 4000 : f === "image_url" ? 2_000_000 : 300);
  const target = originalId || id;
  const { rows } = await cl.query(`select id from products where id = $1`, [target]);
  if (rows[0]) {
    // update: sirf wahi columns badlo jo bheje gaye hain (bulk file mein khaali column = purana value rahega)
    const sets = ["id = $1"], vals = [id];
    const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    for (const f of P_FIELDS) if (f === "name" || has(f)) add(f, f === "name" ? name : fieldVal(f));
    if (has("moq")) add("moq", Math.max(0, Math.floor(Number(p.moq) || 0)));
    if (has("sort")) add("sort", Math.floor(Number(p.sort) || 0));
    if (has("active")) add("active", bool(p.active));
    vals.push(target);
    await cl.query(`update products set ${sets.join(", ")}, updated_at = now() where id = $${vals.length}`, vals);
  } else {
    const vals = P_FIELDS.map((f) => (f === "name" ? name : has(f) ? fieldVal(f) : f === "unit" ? "pcs" : f === "pins" ? "3" : ""));
    let sort = Math.floor(Number(p.sort) || 0);
    if (!has("sort")) sort = (await cl.query(`select coalesce(max(sort),0)+1 as s from products`)).rows[0].s;
    await cl.query(
      `insert into products (id, ${P_FIELDS.join(", ")}, moq, sort, active) values ($1, ${P_FIELDS.map((_, i) => `$${i + 2}`).join(", ")}, $${P_FIELDS.length + 2}, $${P_FIELDS.length + 3}, $${P_FIELDS.length + 4})`,
      [id, ...vals, Math.max(0, Math.floor(Number(p.moq) || 0)), sort, has("active") ? bool(p.active) : true]);
  }
  if (p.variants !== undefined) {
    await cl.query(`delete from product_variants where product_id = $1`, [id]);
    for (const v of parseVariants(p.variants)) {
      await cl.query(`insert into product_variants (product_id, label, price, sort) values ($1,$2,$3,$4)`, [id, v.label, v.price, v.sort]);
    }
  }
  return { id, created: !rows[0] };
}

app.post("/api/admin/products", wrap(async (req, res) => {
  const r = await tx((cl) => upsertProduct(cl, req.body || {}, null));
  res.status(201).json(r);
}));
app.put("/api/admin/products/:id", wrap(async (req, res) => {
  const r = await tx((cl) => upsertProduct(cl, req.body || {}, req.params.id));
  res.json(r);
}));
app.patch("/api/admin/products/:id/active", wrap(async (req, res) => {
  const { rowCount } = await q(`update products set active = $1, updated_at = now() where id = $2`, [bool(req.body?.active), req.params.id]);
  if (!rowCount) throw httpError(404, "Product not found");
  res.json({ ok: true });
}));
app.delete("/api/admin/products/:id", wrap(async (req, res) => {
  await q(`delete from products where id = $1`, [req.params.id]);
  res.json({ ok: true });
}));
app.post("/api/admin/products/bulk", wrap(async (req, res) => {
  const list = Array.isArray(req.body?.products) ? req.body.products : [];
  if (!list.length) throw httpError(400, "No products in file");
  if (list.length > 2000) throw httpError(400, "Max 2000 products per upload");
  const out = await tx(async (cl) => {
    if (req.body.mode === "replace") await cl.query(`delete from products`);
    let added = 0, updated = 0;
    for (const p of list) {
      const r = await upsertProduct(cl, p, str(p.id, 60) || null, true);
      r.created ? added++ : updated++;
    }
    return { added, updated };
  });
  res.json(out);
}));
app.post("/api/admin/upload", wrap(async (req, res) => {
  res.json({ url: await uploadImage(req.body?.dataUrl, req.body?.name) });
}));

// ----- enquiries -----
app.get("/api/admin/enquiries", wrap(async (_req, res) => {
  const { rows } = await q(`select * from enquiries order by created_at desc limit 500`);
  res.json(rows);
}));
app.patch("/api/admin/enquiries/:id", wrap(async (req, res) => {
  const s = ["New", "Contacted", "Closed"].includes(req.body?.status) ? req.body.status : null;
  if (!s) throw httpError(400, "Bad status");
  await q(`update enquiries set status = $1 where id = $2`, [s, req.params.id]);
  res.json({ ok: true });
}));

// ---------- errors ----------
app.use("/api", (_req, _res, next) => next(httpError(404, "Not found")));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === "entity.too.large" ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? "Server error, please try again" : err.message });
});

export default app;

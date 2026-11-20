/**
 * ELECKTOR INDUSTRIES – website backend (Google Apps Script + Google Sheet)
 * ----------------------------------------------------------------------
 * Standalone script: setup() khud "ELECKTOR Website Data" Google Sheet banata hai (ID Script property SHEET_ID mein)
 * Sheet tabs (auto-create hote hain): Products, Orders, Enquiries
 * Script Properties (Project Settings > Script properties):
 *   ADMIN_PASSWORD  = admin console ka password (zaroori)
 *   NOTIFY_EMAIL    = naye order / enquiry ka mail kahan jaye (e.g. sales@elecktor.in)
 * Deploy: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 */

const PRODUCT_COLS = ["id","name","category","short","description","cores","rating","conductor","sheath","colour","application","packing","moq","unit","pins","variants","image","active","sort","braided"];
const ORDER_COLS = ["id","createdAt","updatedAt","status","name","firm","phone","email","gst","city","state","address","notes","itemsText","estTotal","finalAmount","publicNote","adminNote","itemsJson","historyJson"];
const ENQ_COLS = ["id","at","name","firm","phone","email","city","type","message"];
const PHOTO_FOLDER = "ELECKTOR Website Product Photos";

/* ---------- one-time setup: run this once from the editor ---------- */
function setup() {
  Logger.log("Google Sheet: " + ss_().getUrl());
  sheet_("Products", PRODUCT_COLS); sheet_("Orders", ORDER_COLS); sheet_("Enquiries", ENQ_COLS);
  const sh = sheet_("Products", PRODUCT_COLS);
  if (sh.getLastRow() < 2) {
    [
      ["EL-3P-PVC","3 Pin PVC Power Cord","PVC Power Cords","3 core · 6A · White PVC sheath","ELECKTOR 3 pin PVC power cord for household and office appliances. 3 core, 6A rated, white PVC sheath. Each cord is individually pouch-packed with ELECKTOR branding, ready for retail counters.","3","6A","23/38 (L 23 + N 23 + E 10)","PVC","White","Household & office appliances","Single pouch per piece · 10 pcs per pouch · 400 pcs per sack",400,"pcs","3","2 m:71.26 | 2.5 yard:80.17 | 3 m:92.54","",true,1,false],
      ["EL-2P-PVC","2 Pin PVC Power Cord","PVC Power Cords","2 core flat · 6A · White","ELECKTOR 2 pin flat PVC power cord, 2 core, 6A rated, white. Suitable for small appliances and electrical shop retail. Each piece pouch-packed with ELECKTOR branding.","2","6A","14/38 Flat","PVC, flat","White","Small appliances, retail counters","Single pouch per piece · 10 pcs per pouch · 600 pcs per sack",600,"pcs","2","2 m:39.70 | 2.5 yard:44.17 | 3 m:50.37","",true,2,false],
      ["EL-3P-BRAID","3 Pin Cotton Braided Power Cord (Iron / Heater)","Cotton Braided Cords","3 core · 6A · Ring terminals","ELECKTOR 3 pin cotton braided power cord with ring terminals, made for electric irons and heaters. 3 core, 6A rated, heat-friendly cotton braided outer.","3","6A","16/36 (16 + 16 + 8)","Cotton braided","Braided","Electric iron, room heater","Single pouch per piece · 10 pcs per pouch · 400 pcs per sack",400,"pcs","3","2 m:76.44 | 2.5 yard:85.81 | 3 m:98.82","",true,3,true]
    ].forEach(r => sh.appendRow(r));
  }
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("NOTIFY_EMAIL")) props.setProperty("NOTIFY_EMAIL", Session.getEffectiveUser().getEmail());
  if (!props.getProperty("ADMIN_PASSWORD")) props.setProperty("ADMIN_PASSWORD", "CHANGE-ME-" + Math.floor(Math.random() * 1e6));
  Logger.log("Setup done. Admin password (Script properties > ADMIN_PASSWORD): " + props.getProperty("ADMIN_PASSWORD"));
}

/* ---------- web entry points ---------- */
function doGet() { return json_({ ok: true, data: "ELECKTOR API running" }); }

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    const pub = { products: apiProducts_, placeOrder: apiPlaceOrder_, trackOrder: apiTrack_, enquiry: apiEnquiry_ };
    const adm = { login: () => ({ ok: true }), adminData: apiAdminData_, saveProduct: apiSaveProduct_, deleteProduct: apiDeleteProduct_, bulkProducts: apiBulk_, updateOrder: apiUpdateOrder_, uploadImage: apiUploadImage_ };
    if (pub[d.action]) return json_({ ok: true, data: pub[d.action](d) });
    if (adm[d.action]) { checkAdmin_(d.pw); return json_({ ok: true, data: adm[d.action](d) }); }
    throw new Error("Unknown action");
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

/* ---------- public ---------- */
function apiProducts_() {
  return rows_("Products", PRODUCT_COLS).filter(p => truthy_(p.active)).sort((a, b) => (+a.sort || 0) - (+b.sort || 0));
}

function apiPlaceOrder_(d) {
  const o = d.order || {}, c = o.customer || {};
  if (!c.name || !c.phone || !(o.items || []).length) throw new Error("Name, phone and at least one item are required");
  if (String(c.phone).replace(/\D/g, "").length < 10) throw new Error("Invalid mobile number");
  // re-price from the sheet so nobody can change rates in the browser
  const prods = {}; rows_("Products", PRODUCT_COLS).forEach(p => prods[p.id] = p);
  const items = o.items.slice(0, 50).map(i => {
    const p = prods[i.productId]; if (!p) throw new Error("Product not available: " + i.name);
    const v = parseVariants_(p.variants).find(x => x.label === i.variant) || { label: i.variant, price: 0 };
    const qty = Math.max(1, Math.floor(Number(i.qty) || 0));
    return { productId: p.id, name: p.name, variant: v.label, rate: v.price, qty: qty, amount: round2_(v.price * qty) };
  });
  const est = round2_(items.reduce((s, i) => s + i.amount, 0));
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const props = PropertiesService.getScriptProperties();
    const seq = Number(props.getProperty("ORDER_SEQ") || 1000) + 1; props.setProperty("ORDER_SEQ", String(seq));
    const id = "ELK-" + seq, now = new Date().toISOString();
    const rec = { id: id, createdAt: now, updatedAt: now, status: "New", name: clean_(c.name), firm: clean_(c.firm), phone: clean_(c.phone), email: clean_(c.email), gst: clean_(c.gst).toUpperCase(), city: clean_(c.city), state: clean_(c.state), address: clean_(c.address), notes: clean_(c.notes),
      itemsText: items.map(i => i.name + " – " + i.variant + " × " + i.qty).join("\n"), estTotal: est, finalAmount: "", publicNote: "", adminNote: "",
      itemsJson: JSON.stringify(items), historyJson: JSON.stringify([{ at: now, status: "New", note: "Order placed on website" }]) };
    sheet_("Orders", ORDER_COLS).appendRow(ORDER_COLS.map(k => rec[k]));
    notify_("New website order " + id + " – " + (rec.firm || rec.name),
      "Order: " + id + "\nCustomer: " + rec.name + " (" + rec.firm + ")\nPhone: " + rec.phone + "\nCity: " + rec.city + ", " + rec.state + "\n\n" + rec.itemsText + "\n\nEstimated value: Rs " + est + "\n\nAccept karne ke liye admin console kholo.");
    return { id: id };
  } finally { lock.releaseLock(); }
}

function apiTrack_(d) {
  const id = String(d.id || "").trim().toUpperCase(), ph = String(d.phone || "").replace(/\D/g, "").slice(-10);
  const o = orders_().find(x => x.id.toUpperCase() === id);
  if (!o || String(o.customer.phone).replace(/\D/g, "").slice(-10) !== ph) throw new Error("Order not found. Check Order ID and phone number.");
  return { id: o.id, status: o.status, createdAt: o.createdAt, items: o.items, finalAmount: o.finalAmount, adminNote: o.publicNote, history: o.history };
}

function apiEnquiry_(d) {
  const q = d.enquiry || {};
  if (!q.name || !q.phone) throw new Error("Name and phone required");
  const sh = sheet_("Enquiries", ENQ_COLS), now = new Date().toISOString();
  const rec = { id: "ENQ-" + sh.getLastRow(), at: now };
  ENQ_COLS.slice(2).forEach(k => rec[k] = clean_(q[k]));
  sh.appendRow(ENQ_COLS.map(k => rec[k]));
  notify_("New website enquiry – " + rec.name, ENQ_COLS.map(k => k + ": " + rec[k]).join("\n"));
  return { ok: true };
}

/* ---------- admin ---------- */
function checkAdmin_(pw) {
  const cache = CacheService.getScriptCache(), fails = Number(cache.get("fails") || 0);
  if (fails >= 8) throw new Error("Too many wrong attempts. Try after 10 minutes.");
  const real = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD");
  if (!real || pw !== real) { cache.put("fails", String(fails + 1), 600); throw new Error("Wrong password"); }
}

function apiAdminData_() {
  const enq = rows_("Enquiries", ENQ_COLS).reverse();
  return { products: rows_("Products", PRODUCT_COLS).sort((a, b) => (+a.sort || 0) - (+b.sort || 0)), orders: orders_().reverse(), enquiries: enq };
}

function apiSaveProduct_(d) { const p = upsertProducts_([d.product], false); return p.last; }

function apiDeleteProduct_(d) {
  const sh = sheet_("Products", PRODUCT_COLS), ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => String(r[0]));
  const i = ids.indexOf(String(d.id)); if (i >= 0) sh.deleteRow(i + 2);
  return { ok: true };
}

function apiBulk_(d) {
  if (!Array.isArray(d.products) || !d.products.length) throw new Error("No products in file");
  if (d.products.length > 1000) throw new Error("Max 1000 products per upload");
  if (d.mode === "replace") { const sh = sheet_("Products", PRODUCT_COLS); if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1); }
  const r = upsertProducts_(d.products, true);
  return { added: r.added, updated: r.updated };
}

function apiUpdateOrder_(d) {
  const sh = sheet_("Orders", ORDER_COLS), vals = sh.getDataRange().getValues();
  const i = vals.findIndex((r, n) => n > 0 && String(r[0]) === String(d.id)); if (i < 0) throw new Error("Order not found");
  const rec = {}; ORDER_COLS.forEach((k, n) => rec[k] = vals[i][n]);
  const now = new Date().toISOString(), allowed = ["New","Confirmed","Rejected","Dispatched","Completed"];
  ["finalAmount","publicNote","adminNote"].forEach(k => { if (d[k] !== undefined) rec[k] = clean_(d[k]); });
  if (d.status) {
    if (allowed.indexOf(d.status) < 0) throw new Error("Bad status");
    rec.status = d.status;
    const h = JSON.parse(rec.historyJson || "[]"); h.push({ at: now, status: d.status, note: clean_(d.publicNote) }); rec.historyJson = JSON.stringify(h);
    if (rec.email && /@/.test(rec.email) && ["Confirmed","Dispatched","Rejected"].indexOf(d.status) >= 0) {
      try {
        MailApp.sendEmail({ to: rec.email, name: "ELECKTOR INDUSTRIES", replyTo: notifyEmail_() || undefined,
          subject: "Your order " + rec.id + " is " + d.status + " – ELECKTOR INDUSTRIES",
          body: "Dear " + rec.name + ",\n\nYour order " + rec.id + " is now: " + d.status + ".\n" + (rec.finalAmount ? "Confirmed amount: Rs " + rec.finalAmount + "\n" : "") + (rec.publicNote ? rec.publicNote + "\n" : "") + "\n" + rec.itemsText + "\n\nFor any query call +91 96505 22446.\n\nELECKTOR INDUSTRIES\nSonipat, Haryana" });
      } catch (err) { /* email failure should not block the update */ }
    }
  }
  rec.updatedAt = now;
  sh.getRange(i + 1, 1, 1, ORDER_COLS.length).setValues([ORDER_COLS.map(k => rec[k])]);
  return { ok: true };
}

function apiUploadImage_(d) {
  const m = String(d.dataUrl || "").match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) throw new Error("Bad image");
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER), folder = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], (d.name || "product").replace(/[^\w-]+/g, "_") + "_" + Date.now() + ".jpg");
  const f = folder.createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: "https://drive.google.com/thumbnail?id=" + f.getId() + "&sz=w1000" };
}

/* ---------- helpers ---------- */
function upsertProducts_(list, bulk) {
  const sh = sheet_("Products", PRODUCT_COLS), last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  let added = 0, updated = 0, lastRec = null;
  const append = [];
  list.forEach(p => {
    if (!p || !String(p.name || "").trim()) return;
    const rec = {};
    PRODUCT_COLS.forEach(k => rec[k] = p[k] === undefined || p[k] === null ? "" : p[k]);
    if (Array.isArray(rec.variants)) rec.variants = rec.variants.map(v => v.label + ":" + v.price).join(" | ");
    rec.id = String(rec.id || "").trim() || ("EL-" + String(p.name).toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 16) + "-" + Math.floor(Math.random() * 900 + 100));
    rec.active = rec.active === "" ? true : truthy_(rec.active);
    ["name","category","short","description","packing","application"].forEach(k => rec[k] = clean_(rec[k]));
    const row = PRODUCT_COLS.map(k => rec[k]), i = ids.indexOf(rec.id);
    if (i >= 0) { sh.getRange(i + 2, 1, 1, row.length).setValues([row]); updated++; }
    else { append.push(row); ids.push(rec.id); added++; }
    lastRec = rec;
  });
  if (append.length) sh.getRange(sh.getLastRow() + 1, 1, append.length, PRODUCT_COLS.length).setValues(append);
  return { added: added, updated: updated, last: lastRec };
}

function orders_() {
  return rows_("Orders", ORDER_COLS).map(r => ({
    id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt, status: r.status, estTotal: Number(r.estTotal) || 0, finalAmount: r.finalAmount, publicNote: r.publicNote, adminNote: r.adminNote,
    customer: { name: r.name, firm: r.firm, phone: String(r.phone), email: r.email, gst: r.gst, city: r.city, state: r.state, address: r.address, notes: r.notes },
    items: safeJson_(r.itemsJson, []), history: safeJson_(r.historyJson, [])
  }));
}

function ss_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("SHEET_ID");
  if (!id) {
    const bound = SpreadsheetApp.getActive && SpreadsheetApp.getActive();
    id = bound ? bound.getId() : SpreadsheetApp.create("ELECKTOR Website Data").getId();
    props.setProperty("SHEET_ID", id);
  }
  return SpreadsheetApp.openById(id);
}
function sheet_(name, cols) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold"); sh.setFrozenRows(1); }
  return sh;
}
function rows_(name, cols) {
  const sh = sheet_(name, cols), v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0].map(String);
  return v.slice(1).filter(r => r.some(c => c !== "")).map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i] instanceof Date ? r[i].toISOString() : r[i]); return o; });
}
function parseVariants_(s) {
  return String(s || "").split("|").map(x => x.trim()).filter(String).map(x => { const i = x.lastIndexOf(":"); return i < 0 ? { label: x, price: 0 } : { label: x.slice(0, i).trim(), price: Number(x.slice(i + 1)) || 0 }; });
}
function truthy_(v) { return !(v === false || v === 0 || /^(false|no|0|n)$/i.test(String(v).trim())); }
function clean_(v) { v = String(v == null ? "" : v).trim().slice(0, 2000); return /^[=+\-@]/.test(v) ? "'" + v : v; } // block sheet formula injection
function round2_(n) { return Math.round(n * 100) / 100; }
function safeJson_(s, d) { try { return JSON.parse(s); } catch (e) { return d; } }
function notifyEmail_() { return PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL"); }
function notify_(subject, body) { const to = notifyEmail_(); if (to) try { MailApp.sendEmail(to, subject, body); } catch (e) {} }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

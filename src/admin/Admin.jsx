import React, { useCallback, useEffect, useState } from "react";
import "../admin.css";
import { api, token } from "../api.js";
import { Login, Setup } from "./Auth.jsx";
import { Dashboard } from "./Dashboard.jsx";
import { Orders } from "./Orders.jsx";
import { Products } from "./Products.jsx";
import { Bulk } from "./Bulk.jsx";
import { Enquiries } from "./Enquiries.jsx";
import { Settings } from "./Settings.jsx";

const VIEWS = [["dash", "Dashboard"], ["orders", "Orders"], ["products", "Products"], ["bulk", "Bulk Upload"], ["enq", "Enquiries"], ["settings", "Settings"]];

export default function Admin() {
  const [me, setMe] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(null);
  const [view, setView] = useState("dash");
  const [toastMsg, setToastMsg] = useState("");
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    document.title = "ELECKTOR Admin Console";
    const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex,nofollow"; document.head.appendChild(m);
    api("/admin/setup-status").then((r) => setNeedsSetup(r.needsSetup)).catch(() => setNeedsSetup(false));
    if (token.get()) api("/admin/me", { auth: true }).then(setMe).catch(() => token.set(""));
    return () => m.remove();
  }, []);

  const toast = useCallback((t) => { setToastMsg(t); clearTimeout(toast._t); toast._t = setTimeout(() => setToastMsg(""), 2800); }, []);
  const logout = () => { token.set(""); setMe(null); };
  // har admin call: token expire ho to login par wapas
  const call = useCallback(async (path, opts = {}) => {
    try { return await api(path, { ...opts, auth: true }); }
    catch (e) { if (e.status === 401) { token.set(""); setMe(null); } throw e; }
  }, []);
  const refreshCount = useCallback(() => call("/admin/dashboard").then((d) => setNewCount(d.orders.New || 0)).catch(() => {}), [call]);
  useEffect(() => { if (me) refreshCount(); }, [me, view, refreshCount]);

  let body;
  if (!me) {
    body = needsSetup === null ? <div className="login"><div className="lbox">Loading…</div></div>
      : needsSetup ? <Setup onDone={(a) => { setMe(a); setNeedsSetup(false); }} />
      : <Login onDone={setMe} />;
  } else {
    const props = { call, toast, go: setView, refreshCount };
    body = (
      <div className="app">
        <aside>
          <div className="brand">ELECKTOR<small>ADMIN CONSOLE</small></div>
          <nav>
            {VIEWS.map(([k, label]) => (
              <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
                {label}{k === "orders" && newCount > 0 ? <span className="pill">{newCount}</span> : null}
              </button>
            ))}
          </nav>
          <div className="bottom">
            <a href="/" target="_blank" rel="noopener" className="btn b-line" style={{ color: "var(--ink)", justifyContent: "center" }}>View website ↗</a>
            <div style={{ textAlign: "center", color: "#9fb0cd" }}>{me.email}</div>
            <button className="btn" style={{ color: "#c9d3e6", justifyContent: "center" }} onClick={logout}>Logout</button>
          </div>
        </aside>
        <main>
          {view === "dash" && <Dashboard {...props} />}
          {view === "orders" && <Orders {...props} />}
          {view === "products" && <Products {...props} />}
          {view === "bulk" && <Bulk {...props} />}
          {view === "enq" && <Enquiries {...props} />}
          {view === "settings" && <Settings {...props} me={me} />}
        </main>
      </div>
    );
  }
  return (
    <div className="adm">
      {body}
      <div className={`toast ${toastMsg ? "on" : ""}`} role="status">{toastMsg}</div>
    </div>
  );
}

// ---------- shared admin bits ----------
export function Modal({ title, onClose, children, footer, width }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="ov on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={width ? { width } : undefined} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Dialog"}>
        <div className="mh"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}
export const StatusPill = ({ s }) => <span className={`st ${s}`}>{s}</span>;

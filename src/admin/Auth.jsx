import React, { useState } from "react";
import { api, token } from "../api.js";

export function Login({ onDone }) {
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await api("/admin/login", { method: "POST", body: Object.fromEntries(new FormData(e.currentTarget)) });
      token.set(r.token); onDone(r.admin);
    } catch (er) { setErr(er.message); } finally { setBusy(false); }
  }
  return (
    <div className="login">
      <form className="lbox" onSubmit={submit}>
        <h1>ELECKTOR</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Admin Console – orders &amp; products</p>
        <div className="f"><label>Email</label><input name="email" type="email" required autoComplete="username" defaultValue="admin@elecktor.in" /></div>
        <div className="f" style={{ marginTop: 10 }}><label>Password</label><input name="password" type="password" required autoComplete="current-password" /></div>
        <button className="btn b-dark" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} disabled={busy}>{busy ? "Checking…" : "Login"}</button>
        <div className="err">{err}</div>
        <a href="/" className="muted" style={{ display: "block", textAlign: "center", marginTop: 12 }}>← Back to website</a>
      </form>
    </div>
  );
}

// pehli baar: admin account banana (SETUP_KEY Vercel ke Environment Variables mein hai)
export function Setup({ onDone }) {
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr("");
    const d = Object.fromEntries(new FormData(e.currentTarget));
    if (d.password !== d.password2) { setErr("Passwords do not match"); return; }
    setBusy(true);
    try {
      const r = await api("/admin/setup", { method: "POST", body: d });
      token.set(r.token); onDone(r.admin);
    } catch (er) { setErr(er.message); } finally { setBusy(false); }
  }
  return (
    <div className="login">
      <form className="lbox" onSubmit={submit}>
        <h1>ELECKTOR</h1>
        <p className="muted" style={{ marginBottom: 18 }}>First-time setup – create the admin account</p>
        <div className="f"><label>Setup key</label><input name="setupKey" required autoComplete="off" /></div>
        <div className="f" style={{ marginTop: 10 }}><label>Your name</label><input name="name" required defaultValue="Suraj" /></div>
        <div className="f" style={{ marginTop: 10 }}><label>Email</label><input name="email" type="email" required defaultValue="admin@elecktor.in" autoComplete="username" /></div>
        <div className="f" style={{ marginTop: 10 }}><label>Password (min 8)</label><input name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
        <div className="f" style={{ marginTop: 10 }}><label>Repeat password</label><input name="password2" type="password" required minLength={8} autoComplete="new-password" /></div>
        <button className="btn b-dark" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} disabled={busy}>{busy ? "Creating…" : "Create admin"}</button>
        <div className="err">{err}</div>
      </form>
    </div>
  );
}

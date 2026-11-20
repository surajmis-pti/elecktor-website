import React, { useState } from "react";

export function Settings({ call, toast, me }) {
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget, d = Object.fromEntries(new FormData(f));
    if (d.next !== d.next2) { toast("New passwords do not match"); return; }
    setBusy(true);
    try { await call("/admin/password", { method: "POST", body: { current: d.current, next: d.next } }); toast("Password changed"); f.reset(); }
    catch (er) { toast("Error: " + er.message); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="top"><h2>Settings</h2></div>
      <div className="panel" style={{ padding: 18, maxWidth: 520 }}>
        <p style={{ marginBottom: 14 }}>Logged in as <b>{me.email}</b></p>
        <form onSubmit={submit}>
          <div className="f"><label>Current password</label><input name="current" type="password" required autoComplete="current-password" /></div>
          <div className="f" style={{ marginTop: 10 }}><label>New password (min 8)</label><input name="next" type="password" required minLength={8} autoComplete="new-password" /></div>
          <div className="f" style={{ marginTop: 10 }}><label>Repeat new password</label><input name="next2" type="password" required minLength={8} autoComplete="new-password" /></div>
          <button className="btn b-dark" style={{ marginTop: 14 }} disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
        </form>
      </div>
    </>
  );
}

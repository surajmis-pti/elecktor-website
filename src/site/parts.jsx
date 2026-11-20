import React, { useEffect, useRef } from "react";

export const Bolt = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="#ffc61a" /></svg>
);

export function Logo({ light = false }) {
  return (
    <span className="logo">
      <span className="logo-mark"><Bolt /></span>
      <span className="logo-text"><b style={light ? { color: "#fff" } : undefined}>ELECKTOR</b><small>INDUSTRIES</small></span>
    </span>
  );
}

export const WhatsAppIcon = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" /></svg>
);

export const CartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" /><circle cx="10" cy="20.5" r="1.3" /><circle cx="18" cy="20.5" r="1.3" /></svg>
);

// photo na ho to product ki drawing
export function ProductArt({ p }) {
  const braided = /braid/i.test(`${p.sheath} ${p.name}`);
  const pins = String(p.pins || (/2\s*pin/i.test(p.name) ? 2 : 3));
  const cord = braided ? "#8b6b4a" : "#f4f5f7", edge = braided ? "#5e4630" : "#c9ced8";
  const gid = "g" + String(p.id).replace(/[^a-z0-9]/gi, "");
  const path = "M70 230c-30-40 10-90 60-80s70 70 120 60 40-60 10-80";
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label={p.name}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef1f6" /><stop offset="1" stopColor="#d9e0ea" /></linearGradient></defs>
      <rect width="400" height="300" fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={edge} strokeWidth="15" strokeLinecap="round" />
      <path d={path} fill="none" stroke={cord} strokeWidth="11" strokeLinecap="round" strokeDasharray={braided ? "3 3" : undefined} />
      <rect x="270" y="150" width="76" height="70" rx="14" fill={braided ? "#1f2937" : "#fafafa"} stroke={edge} strokeWidth="3" />
      <rect x="285" y="138" width="46" height="18" rx="5" fill={braided ? "#111827" : "#eceff4"} stroke={edge} strokeWidth="2" />
      {pins === "2" ? (
        <><rect x="292" y="112" width="8" height="40" rx="3" fill="#c8a046" /><rect x="316" y="112" width="8" height="40" rx="3" fill="#c8a046" /></>
      ) : (
        <><rect x="292" y="120" width="8" height="34" rx="3" fill="#c8a046" /><rect x="320" y="120" width="8" height="34" rx="3" fill="#c8a046" /><rect x="304" y="96" width="12" height="40" rx="3" fill="#c8a046" /></>
      )}
      <text x="308" y="194" fontFamily="Barlow Condensed,Arial" fontWeight="800" fontSize="15" textAnchor="middle" fill={braided ? "#ffc61a" : "#0f2347"}>ELECKTOR</text>
      <text x="24" y="40" fontFamily="Barlow Condensed,Arial" fontWeight="700" fontSize="20" fill="#0f2347" opacity=".55">{pins} PIN · {p.rating}</text>
    </svg>
  );
}
export const ProductPic = ({ p }) => (p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" /> : <ProductArt p={p} />);

// overlay/modal wrapper – Esc ya bahar click se band
export function Overlay({ open, onClose, children, className = "" }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return <div className={`overlay on ${className}`} onClick={(e) => e.target === e.currentTarget && onClose()}>{children}</div>;
}

// scroll par halka animation
export function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function Msg({ msg }) {
  const ref = useRef(null);
  if (!msg) return null;
  return <div ref={ref} className={`msg ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>;
}

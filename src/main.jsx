import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Site from "./site/Site.jsx";

const Admin = lazy(() => import("./admin/Admin.jsx"));
// admin.elecktor.in par poora page admin console hai
const isAdminHost = window.location.hostname.startsWith("admin.");
const adminEl = <Suspense fallback={<div style={{ padding: 40 }}>Loading admin…</div>}><Admin /></Suspense>;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={adminEl} />
        <Route path="*" element={isAdminHost ? adminEl : <Site />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

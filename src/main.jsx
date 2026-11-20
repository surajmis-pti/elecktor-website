import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Site from "./site/Site.jsx";

const Admin = lazy(() => import("./admin/Admin.jsx"));

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<div style={{ padding: 40 }}>Loading admin…</div>}><Admin /></Suspense>} />
        <Route path="*" element={<Site />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

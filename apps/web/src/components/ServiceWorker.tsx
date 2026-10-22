"use client";
import { useEffect } from "react";

/** Registers /sw.js in production only (dev HMR and SWs don't mix). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

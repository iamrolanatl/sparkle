"use client";
import dynamic from "next/dynamic";

// Perf (#27): the chat widget is interaction-only, so keep it out of the landing
// page's initial JS. Hydration work was delaying LCP render on mobile.
export const LazyChatWidget = dynamic(() => import("./ChatWidget").then((m) => m.ChatWidget), { ssr: false });

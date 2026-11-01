"use client";
import dynamic from "next/dynamic";
const Battle = dynamic(() => import("./Battle"), { ssr: false });
export default Battle;

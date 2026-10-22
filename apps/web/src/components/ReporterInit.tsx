"use client";
import { useEffect } from "react";
import { installReporter } from "@/lib/report";

export function ReporterInit() {
  useEffect(() => installReporter(), []);
  return null;
}

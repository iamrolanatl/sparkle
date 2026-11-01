"use client";
import { useState } from "react";

export type Report = { first: string; rank: string; xp: number; streak: number; done: number };

/** Mission Report card drawn client-side. Only first name + rank + effort stats; no grades, no school. */
export default function ShareCard(r: Report) {
  const [msg, setMsg] = useState("");
  const draw = () => {
    const c = document.createElement("canvas");
    c.width = 1080;
    c.height = 1080;
    const x = c.getContext("2d")!;
    x.fillStyle = "#050605";
    x.fillRect(0, 0, 1080, 1080);
    for (let i = 0; i < 220; i++) {
      x.fillStyle = `rgba(243,234,216,${Math.random() * 0.8})`;
      x.fillRect(Math.random() * 1080, Math.random() * 1080, 2, 2);
    }
    x.strokeStyle = "#5dffa5";
    x.lineWidth = 4;
    x.strokeRect(40, 40, 1000, 1000);
    x.fillStyle = "#ffb547";
    x.font = "bold 34px ui-monospace, Menlo, monospace";
    x.fillText("SPARKLE // MISSION REPORT", 80, 120);
    x.fillStyle = "#e6efe9";
    x.font = "bold 92px system-ui, sans-serif";
    x.fillText(`${r.rank} ${r.first}`.slice(0, 22), 80, 280);
    const stat = (y: number, l: string, v: string) => {
      x.fillStyle = "#9fb0a7";
      x.font = "36px ui-monospace, Menlo, monospace";
      x.fillText(l, 80, y);
      x.fillStyle = "#5dffa5";
      x.font = "bold 80px system-ui, sans-serif";
      x.fillText(v, 80, y + 90);
    };
    stat(420, "FUEL (STUDY STREAK)", `${r.streak} day${r.streak === 1 ? "" : "s"}`);
    stat(600, "MISSIONS COMPLETE (60 DAYS)", String(r.done));
    stat(780, "XP", String(r.xp));
    x.fillStyle = "#9fb0a7";
    x.font = "30px ui-monospace, Menlo, monospace";
    x.fillText("Mission control for school · sparkle", 80, 990);
    return c;
  };
  const share = async () => {
    const c = draw();
    const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/png"));
    if (!blob) return setMsg("Couldn't make the image.");
    const file = new File([blob], "sparkle-mission-report.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mission report" });
        return setMsg("Shared.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setMsg("Downloaded the image.");
  };
  return (
    <div className="sh-share">
      <button type="button" className="pill" onClick={share} data-testid="share-report">
        Share mission report
      </button>
      <small>First name, rank and effort only. No grades or school. {msg}</small>
    </div>
  );
}

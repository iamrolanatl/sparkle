"use client";
import { Applet, CursorGlow, MagneticButton, NeonWindow, TiltCard, VideoBackground } from "@sparkle/ui";
import { crashDemo, homeworkTimer, weatherPreview } from "@/applets/registry";

/** Living style guide for CR-0008 components; also the Playwright visual-test target. */
export function DesignShowcase() {
  return (
    <main className="relative mx-auto max-w-5xl space-y-8 p-6">
      <section className="relative isolate h-56 overflow-hidden rounded-2xl" data-testid="video-hero">
        <VideoBackground
          av1Src="/media/nebula-av1.mp4"
          h264Src="/media/nebula-h264.mp4"
          poster="/media/nebula-poster.jpg"
        />
        <h1 className="relative p-6 text-3xl font-semibold text-white drop-shadow">Sparkle design system</h1>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <NeonWindow title="Neon glass window">
          <p>Frosted glass with a soft animated border glow.</p>
        </NeonWindow>
        <CursorGlow className="spk-glass rounded-2xl p-5">
          <p>Move your cursor here — the glow follows (mouse only).</p>
        </CursorGlow>
        <TiltCard className="spk-glass rounded-2xl p-5">
          <p>Gentle tilt card</p>
        </TiltCard>
        <div className="spk-glass flex items-center rounded-2xl p-5">
          <MagneticButton className="rounded-full border px-5 py-2">Magnetic button</MagneticButton>
        </div>
      </div>
      <h2 className="text-xl font-semibold">Applets</h2>
      <div className="grid gap-6 md:grid-cols-3">
        <NeonWindow title="Homework timer">
          <Applet def={homeworkTimer} props={{ minutes: 25 }} />
        </NeonWindow>
        <NeonWindow title="Weather">
          <Applet def={weatherPreview} />
        </NeonWindow>
        <Applet def={crashDemo} />
      </div>
    </main>
  );
}

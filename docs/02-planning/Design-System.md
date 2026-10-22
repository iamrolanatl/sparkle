# Design System — Glass, Neon & Motion

| Field | Value |
|---|---|
| Document ID | SPK-PLN-024 |
| Project | Sparkle — Student Success Platform |
| Version | 1.0 |
| Status | Baselined under CR-0008 (design direction from Rolan Chowdhury, 2026-10-21) |
| Document Owner | Rolan Chowdhury |
| Author | Grok Bot (for Rolan Chowdhury) |
| Last Updated | 2026-10-21 |

## 1. Tooling decision (DEC-52)
Tailwind CSS 4 stays. Effects come only from **CSS**, **Framer Motion** and **Rive**. No other animation or effect libraries.

## 2. Components (`packages/ui`)
| Component | Purpose | Behaviour & safeguards |
|---|---|---|
| `GlassPanel` / `NeonWindow` | Subtle glowing neon glass "window" | Backdrop blur + soft animated conic border glow (CSS `@property` angle). Under `prefers-reduced-motion` the glow is static. |
| `useCursorGlow` / `CursorGlow` | Glow that follows the pointer inside a surface | Pointer events only (`pointerType === "mouse"`); disabled on touch and reduced motion; updates via CSS custom properties in `requestAnimationFrame`. |
| `MagneticButton` | Button drifts slightly toward the cursor | Max 6 px, Framer Motion spring; off for touch and reduced motion; keyboard focus ring unaffected. |
| `TiltCard` | Gentle 3-D card tilt on hover | ≤ 4°; off for touch and reduced motion. |
| `VideoBackground` | Seamless looping background video | Two `<video>` elements crossfade ~0.8 s before the end, hiding the rewind; `muted`, `playsInline`, `preload="none"` until visible; AV1 (`video/mp4; codecs=av01`) then H.264 sources; pauses when off-screen (IntersectionObserver) and when the tab is hidden; poster image only when Save-Data, reduced motion, low battery (< 20 % and not charging) or measured FPS < 30. |
| `Applet` framework | Self-contained widgets (weather, homework timer, scan…) | `defineApplet()` registry; each applet is `React.lazy`-loaded inside `<Suspense>` with a skeleton and wrapped in its own `ErrorBoundary` that shows a small "this widget is resting" card and reports the error — one failing applet never crashes the page. |
| `ErrorBoundary` | Shared boundary | Reports via the crash reporter; reset button. |

## 3. Performance budget (NFR-47, NFR-48)
- Lighthouse mobile ≥ 90 (performance, accessibility, best practices) on `/` — checked in CI.
- Animation target 60 fps. `fps.ts` monitor: if sustained < 30 fps, effects degrade (aurora/video → static, glow → static, tilt off).
- Background video ≤ 2 MB per loop, ≤ 1080p, poster ≤ 60 KB.

## 4. Accessibility
Contrast AA in both themes; all motion respects `prefers-reduced-motion`; hover effects are decorative only (no information conveyed only on hover); everything works by keyboard and touch.

## 5. Tests
Unit (Vitest + Testing Library) for reduced-motion/touch fallbacks, crossfade timing logic and applet isolation; Playwright E2E + visual screenshots (`apps/web/e2e`) for landing and the `/design` showcase.

## Revision History
| Version | Date | Author | CR | Description |
|---|---|---|---|---|
| 1.0 | 2026-10-21 | Grok Bot (for Rolan Chowdhury) | CR-0008 | Initial design-system spec from Rolan's direction. |

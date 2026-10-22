"use client";
import {
  lazy,
  Suspense,
  useSyncExternalStore,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { ErrorBoundary } from "./ErrorBoundary";

/** An Applet is a self-contained interactive widget (weather, homework timer, scan…). CR-0008. */
export interface AppletDefinition<P = Record<string, unknown>> {
  id: string;
  title: string;
  /** Dynamic import of the widget — keeps each applet out of the main bundle. */
  load: () => Promise<{ default: ComponentType<P> }>;
  /** Optional skeleton height in px while loading (avoids CLS). */
  minHeight?: number;
}

const registry = new Map<string, AppletDefinition<never>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLazy = LazyExoticComponent<ComponentType<any>>;

export interface DefinedApplet<P> extends AppletDefinition<P> {
  /** Lazy component, created once at definition time. */
  Component: AnyLazy;
}

export function defineApplet<P>(def: AppletDefinition<P>): DefinedApplet<P> {
  if (registry.has(def.id)) throw new Error(`applet id "${def.id}" already defined`);
  registry.set(def.id, def as unknown as AppletDefinition<never>);
  return { ...def, Component: lazy(def.load) as AnyLazy };
}

export function listApplets(): { id: string; title: string }[] {
  return [...registry.values()].map(({ id, title }) => ({ id, title }));
}

/** Test helper. */
export function __resetApplets() {
  registry.clear();
}

const noopSubscribe = () => () => {};

export function AppletSkeleton({ title, minHeight = 160 }: { title: string; minHeight?: number }) {
  return (
    <div className="spk-glass spk-skeleton" style={{ minHeight }} role="status" aria-label={`Loading ${title}`}>
      <span className="spk-sr-only">Loading {title}…</span>
    </div>
  );
}

function AppletFallback({ title, reset }: { title: string; reset: () => void }) {
  return (
    <div className="spk-glass" role="status" style={{ padding: "1rem" }}>
      <p>{title} is resting right now.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

/** Renders one applet in its own error boundary + Suspense skeleton; a failure stays inside this card. */
export function Applet<P>({ def, props, fallback }: { def: DefinedApplet<P>; props?: P; fallback?: ReactNode }) {
  const Lazy = def.Component;
  // Applets render client-only: SSR shows the skeleton, so a failing applet can never break the server render.
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return (
    <section className="spk-applet" aria-label={def.title} data-applet={def.id}>
      <ErrorBoundary
        name={`applet:${def.id}`}
        fallback={(reset) => fallback ?? <AppletFallback title={def.title} reset={reset} />}
      >
        <Suspense fallback={<AppletSkeleton title={def.title} minHeight={def.minHeight} />}>
          {isClient ? <Lazy {...(props ?? {})} /> : <AppletSkeleton title={def.title} minHeight={def.minHeight} />}
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}

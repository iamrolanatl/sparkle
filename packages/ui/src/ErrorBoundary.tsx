"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "./report";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of the children after an error. Receives a reset callback. */
  fallback?: ReactNode | ((reset: () => void) => ReactNode);
  /** Tag included in crash reports (e.g. applet id). */
  name?: string;
}

/** Contains render errors so one failing part never blanks the page (NFR-41). */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportError(error, { boundary: this.props.name ?? "unnamed", componentStack: info.componentStack });
  }
  reset = () => this.setState({ failed: false });
  render() {
    if (!this.state.failed) return this.props.children;
    const { fallback } = this.props;
    if (typeof fallback === "function") return fallback(this.reset);
    return (
      fallback ?? (
        <div role="status" className="spk-glass" style={{ padding: "1rem" }}>
          Something went wrong here.{" "}
          <button type="button" onClick={this.reset}>
            Try again
          </button>
        </div>
      )
    );
  }
}

/** Streamed instantly while the page's data loads: a calm skeleton in the same shell. */
export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      <section className="hero sk-hero">
        <div className="sk sk-line" style={{ width: 120 }} />
        <div className="sk sk-line" style={{ width: "46%", height: 30, marginTop: 12 }} />
        <div className="sk sk-line" style={{ width: "62%", marginTop: 12 }} />
      </section>
      <div className="sk-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel sk-card">
            <div className="sk sk-line" style={{ width: "50%" }} />
            <div className="sk sk-line" style={{ width: "30%", height: 22, marginTop: 10 }} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

"use client";
import { useActionState, useState } from "react";
import type { ClassView } from "@/lib/classes/load";
import { COBB_LINKS, practiceLinks } from "@/lib/classes/resources";
import { shortDate } from "@/lib/classes/due";
import { addMaterialLink, deleteMaterial, uploadMaterial, type MatResult } from "./actions";

const ini = (s: string) =>
  s
    .split(/\s/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function L({ name, desc, color, href }: { name: string; desc: string; color: string; href: string | null }) {
  const inner = (
    <>
      <span className="ic" style={{ background: `${color}22`, color }}>
        {ini(name)}
      </span>
      <span>
        {name}
        <small>{desc}</small>
      </span>
    </>
  );
  return href ? (
    <a className="lnk" href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <span className="lnk off" aria-disabled="true">
      {inner}
    </span>
  );
}

function Materials({ studentId, c, fileUrls }: { studentId: string; c: ClassView; fileUrls: Record<string, string> }) {
  const [upState, upAction, upPending] = useActionState<MatResult | null, FormData>(uploadMaterial, null);
  const [lkState, lkAction, lkPending] = useActionState<MatResult | null, FormData>(addMaterialLink, null);
  const [showLink, setShowLink] = useState(false);
  const unitNo = c.unit?.title.match(/unit\s*(\d+)/i)?.[1];
  const hidden = (
    <>
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="class_id" value={c.id} />
      <input type="hidden" name="unit_id" value={c.unit?.id ?? ""} />
    </>
  );
  const err = (upState && !upState.ok && upState.error) || (lkState && !lkState.ok && lkState.error);
  return (
    <div className="blk">
      <h4>
        My materials<span>{unitNo ? `Unit ${unitNo}` : ""}</span>
      </h4>
      <div className="drop">
        Add handouts, notes, photos or links for this unit
        <br />
        <form action={upAction} style={{ display: "inline" }}>
          {hidden}
          <label className="up" style={{ marginRight: 6 }}>
            {upPending ? "Uploading…" : "⇪ Upload"}
            <input
              type="file"
              name="file"
              hidden
              aria-label={`Upload material for ${c.name}`}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.docx,.pptx"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
          </label>
        </form>
        <button type="button" className="up ghost" onClick={() => setShowLink((v) => !v)}>
          ＋ Add link
        </button>
        {showLink && (
          <form
            action={lkAction}
            style={{ display: "flex", gap: 6, marginTop: 10 }}
            onSubmit={() => setShowLink(false)}
          >
            {hidden}
            <input name="url" className="inp" placeholder="https://…" aria-label="Link URL" required maxLength={2000} />
            <input name="name" className="inp" placeholder="Name (optional)" aria-label="Link name" maxLength={200} />
            <button className="up" style={{ marginTop: 0 }} disabled={lkPending}>
              Save
            </button>
          </form>
        )}
        {err ? (
          <p role="alert" style={{ color: "var(--bad)", marginTop: 8 }}>
            {err}
          </p>
        ) : null}
      </div>
      {c.materials.length ? (
        <div className="files">
          {c.materials.map((m) => {
            const href = m.kind === "link" ? m.url : m.storage_path ? fileUrls[m.storage_path] : null;
            return (
              <span key={m.id}>
                <a href={href ?? undefined} target="_blank" rel="noopener noreferrer">
                  {m.kind === "file" ? "▤" : "↗"} {m.name}
                </a>
                <form action={deleteMaterial} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={m.id} />
                  <button aria-label={`Remove ${m.name}`}>✕</button>
                </form>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ClassList({
  studentId,
  classes,
  openId,
  fileUrls,
}: {
  studentId: string;
  classes: ClassView[];
  openId: string | null;
  fileUrls: Record<string, string>;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(openId ? [openId] : []));
  const flip = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <div>
      {classes.map((c) => {
        const isOpen = open.has(c.id);
        const meta = [c.teacher, [c.room, c.period].filter(Boolean).join(" · "), `${c.upcoming.length} upcoming`]
          .filter(Boolean)
          .join(" · ");
        const PRACTICE = /blooket|quizlet|khan|wayground|deltamath|desmos|gimkit|ixl|quizizz/;
        const fromTeacher = c.resources.filter((r) => PRACTICE.test(r.provider ?? "")).slice(0, 6);
        const otherLinks = c.resources.filter((r) => !PRACTICE.test(r.provider ?? "") && r.kind === "link").slice(0, 6);
        const practice = [
          ...fromTeacher.map((r) => ({
            name: r.title.slice(0, 48),
            desc: `From your teacher · ${r.provider}`,
            color: "#7dd3fc",
            href: r.url,
          })),
          ...practiceLinks(c.name, c.unit?.topics ?? [], c.unit?.title ?? null),
        ];
        return (
          <div className={`panel cls ${isOpen ? "open" : ""}`} key={c.id} id={`c-${c.id}`}>
            <button className="ch" onClick={() => flip(c.id)} aria-expanded={isOpen}>
              <span className="c" style={{ background: c.color }} />
              <div>
                <div className="n">{c.name}</div>
                <div className="t">{meta}</div>
              </div>
              <div className="bw">
                <div className="bar">
                  <i style={{ width: `${Math.min(c.pct ?? 0, 100)}%`, background: c.color }} />
                </div>
              </div>
              <div className="pct">
                {c.pct != null ? `${c.pct.toFixed(1)}%` : "—"}
                <small>{c.letter ?? "No grade"}</small>
              </div>
              <span className="car">›</span>
            </button>
            {isOpen && (
              <div className="body">
                <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                  <div className="blk">
                    <h4>
                      Current unit<span>{c.unit?.week_label ?? ""}</span>
                    </h4>
                    {c.unit ? (
                      <>
                        <div style={{ fontWeight: 500 }}>{c.unit.title}</div>
                        {c.unit.topics.length ? (
                          <div className="topics">
                            {c.unit.topics.map((t) => (
                              <span key={t}>{t}</span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div style={{ color: "var(--mut)", fontSize: 13 }}>
                        No unit info yet. It appears when CTLS sync runs.
                      </div>
                    )}
                  </div>
                  <div className="blk">
                    <h4>
                      Upcoming assignments<span>{c.upcoming.length}</span>
                    </h4>
                    {c.upcoming.length ? (
                      c.upcoming.map((a) => (
                        <div className="li" key={a.id}>
                          <span className="dot" style={{ background: c.color }} />
                          {a.title}
                          {a.category ? (
                            <span className="chip" style={{ marginLeft: "auto" }}>
                              {a.category}
                            </span>
                          ) : (
                            <span style={{ marginLeft: "auto" }} />
                          )}
                          <span style={{ color: "var(--mut)", fontSize: 12, width: 48, textAlign: "right" }}>
                            {shortDate(a.due_at)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--mut)", fontSize: 13 }}>Nothing upcoming.</div>
                    )}
                  </div>
                  {c.missing.length ? (
                    <div className="blk">
                      <h4>
                        Missing<span style={{ color: "var(--warn)" }}>{c.missing.length}</span>
                      </h4>
                      {c.missing.map((a) => (
                        <div className="li" key={a.id}>
                          <span className="dot" style={{ background: "var(--warn)" }} />
                          {a.title}
                          <span style={{ marginLeft: "auto", color: "var(--mut)", fontSize: 12 }}>
                            {shortDate(a.due_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="blk">
                    <h4>
                      Category weights<span>Graded</span>
                    </h4>
                    {c.categories.length ? (
                      c.categories.map((w) => (
                        <div className="li" key={w.name}>
                          <span style={{ width: 110 }}>{w.name}</span>
                          <span className="chip">{w.weight}%</span>
                          <div className="bar">
                            <i style={{ width: `${Math.min(w.score ?? 0, 100)}%`, background: c.color }} />
                          </div>
                          <span style={{ width: 44, textAlign: "right" }}>
                            {w.score != null ? w.score.toFixed(1) : "—"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--mut)", fontSize: 13 }}>
                        No category weights yet. They come from the gradebook sync.
                      </div>
                    )}
                  </div>
                  <Materials studentId={studentId} c={c} fileUrls={fileUrls} />
                </div>
                <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                  <div className="blk">
                    <h4>Course</h4>
                    <div className="lk">
                      <L
                        name="Syllabus"
                        desc={c.syllabus_url ? "Open syllabus" : "Not added yet"}
                        color="#e8edf3"
                        href={c.syllabus_url}
                      />
                      <L
                        name="eBook"
                        desc={c.ebook_url ? "Digital textbook" : "Not added yet"}
                        color="#e8edf3"
                        href={c.ebook_url}
                      />
                    </div>
                  </div>
                  <div className="blk">
                    <h4>
                      From your teachers<span>Posts & emails</span>
                    </h4>
                    {c.feed.length ? (
                      c.feed.map((f) => (
                        <div className="li" key={f.id} style={{ alignItems: "flex-start" }}>
                          <span className="chip">{f.kind === "email" ? "Email" : "Post"}</span>
                          <span style={{ minWidth: 0 }}>
                            {f.url ? (
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: "underline" }}
                              >
                                {f.title}
                              </a>
                            ) : (
                              f.title
                            )}
                            <small style={{ display: "block", color: "var(--dim)", fontSize: 12 }}>
                              {[f.who, shortDate(f.at)].filter(Boolean).join(" · ")}
                              {f.body ? ` — ${f.body.slice(0, 110)}${f.body.length > 110 ? "…" : ""}` : ""}
                            </small>
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--mut)", fontSize: 13 }}>No class posts or emails yet.</div>
                    )}
                  </div>
                  {otherLinks.length ? (
                    <div className="blk">
                      <h4>
                        Class links<span>CTLS Learn</span>
                      </h4>
                      <div className="lk">
                        {otherLinks.map((r) => (
                          <L
                            key={r.id}
                            name={r.title.slice(0, 48)}
                            desc={r.provider ?? "Link"}
                            color="#e8edf3"
                            href={r.url}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="blk">
                    <h4>Cobb County resources</h4>
                    <div className="lk">
                      {COBB_LINKS.map((r) => (
                        <L key={r.name} name={r.name} desc={r.desc} color={r.color} href={r.href} />
                      ))}
                    </div>
                  </div>
                  <div className="blk">
                    <h4>
                      Practice for this unit<span>Matched to topics</span>
                    </h4>
                    {practice.length ? (
                      <div className="lk">
                        {practice.map((r) => (
                          <L key={r.name + r.href} name={r.name} desc={r.desc} color={r.color} href={r.href} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "var(--mut)", fontSize: 13 }}>
                        Practice links appear once the unit's topics are known.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

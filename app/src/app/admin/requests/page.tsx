import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Notice, PermitPill, waLink } from "@/components/ui";
import { STAGES, type AssessmentRequest, type Stage } from "@/lib/types";
import { fmtDate } from "@/lib/time";
import { invitePerson, saveRequestNotes, setRequestStage } from "../actions";

export const metadata: Metadata = { title: "Assessment requests" };

export default async function Requests({ searchParams }: { searchParams: Promise<{ stage?: string; open?: string; ok?: string; error?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const stage = (STAGES.some((x) => x.value === sp.stage) ? sp.stage : "new") as Stage;

  const [{ data }, counts] = await Promise.all([
    supabase.from("assessment_requests").select("*").eq("stage", stage)
      .order("permit_expiry", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    Promise.all(STAGES.map((x) => supabase.from("assessment_requests").select("*", { count: "exact", head: true }).eq("stage", x.value))),
  ]);
  const rows = (data ?? []) as AssessmentRequest[];

  return (
    <>
      <header className="stack" style={{ gap: 6 }}>
        <h1>Assessment requests</h1>
        <p>Requests from the website form. Sorted by permit expiry: the most urgent first.</p>
      </header>
      <Notice ok={sp.ok} error={sp.error} />
      <nav className="tabs" aria-label="Stages">
        {STAGES.map((x, i) => (
          <Link key={x.value} href={`/admin/requests?stage=${x.value}`} aria-current={x.value === stage ? "page" : undefined}>
            {x.label} ({counts[i].count ?? 0})
          </Link>
        ))}
      </nav>

      {rows.length === 0 && <p className="empty card">No request in “{STAGES.find((x) => x.value === stage)?.label}”.</p>}

      <section className="stack">
        {rows.map((r) => (
          <details key={r.id} className="box" open={sp.open === r.id}>
            <summary>
              <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                {r.full_name} <PermitPill date={r.permit_expiry} />
                <span className="muted" style={{ fontWeight: 500 }}>{r.city} · {r.french_level ?? "level ?"} · {fmtDate(r.created_at.slice(0, 10))}</span>
              </span>
            </summary>
            <div className="grid g2">
              <div className="stack" style={{ gap: 6 }}>
                <p><strong>Email:</strong> {r.email}</p>
                <p><strong>Phone / WhatsApp:</strong> {r.phone}</p>
                <p><strong>Status:</strong> {r.immigration_status ?? "—"} · <strong>Permit:</strong> {fmtDate(r.permit_expiry, { month: "long", year: "numeric" })}</p>
                <p><strong>French today:</strong> {r.french_level ?? "—"} · <strong>Wants:</strong> {r.preferred_format ?? "—"}</p>
                <p><strong>Available:</strong> {r.availability?.join(", ") || "—"} · <strong>Heard via:</strong> {r.source ?? "—"}</p>
                <div className="inline-form" style={{ marginTop: 8 }}>
                  <a className="btn btn--wa btn--sm" href={waLink(r.phone, `Bonjour ${r.full_name.split(" ")[0]}! This is French4PR about your free French assessment.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  <form action={setRequestStage} className="inline-form">
                    <input type="hidden" name="id" value={r.id} />
                    <label className="muted" htmlFor={`stage-${r.id}`}>Move to</label>
                    <select id={`stage-${r.id}`} name="stage" defaultValue={r.stage}>
                      {STAGES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                    </select>
                    <button className="btn btn--ghost btn--sm" type="submit">Update</button>
                  </form>
                </div>
              </div>
              <div className="stack">
                <form action={saveRequestNotes} className="form">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="f">Notes from the call / assessment
                    <textarea name="admin_notes" defaultValue={r.admin_notes ?? ""} placeholder="Level heard, goals, preferred schedule…" />
                  </label>
                  <div><button className="btn btn--ghost btn--sm" type="submit">Save notes</button></div>
                </form>
                {r.student_id ? (
                  <Link className="btn btn--ghost btn--sm" href={`/admin/students/${r.student_id}`}>Open student profile</Link>
                ) : (
                  <form action={invitePerson}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <button className="btn btn--red btn--sm" type="submit">Enroll: create account &amp; send invitation</button>
                    <p className="muted" style={{ marginTop: 6 }}>Sends {r.email} a link to their student space and copies these details into their profile.</p>
                  </form>
                )}
              </div>
            </div>
          </details>
        ))}
      </section>
    </>
  );
}

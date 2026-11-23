import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { loadGroups } from "@/lib/admin-data";
import { Ladder, Notice, PermitPill, waLink } from "@/components/ui";
import { LEVEL_NAMES, NCLC_TARGET, PLAN_LABELS, PLAN_PRICES, SKILLS, type MockExam, type Profile } from "@/lib/types";
import { fmtDate, todayInTz } from "@/lib/time";
import { addMockExam, addNote, addToGroup, removeFromGroup, updateStudentAdmin } from "../../actions";

export const metadata: Metadata = { title: "Student" };

export default async function StudentDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile: me } = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const isAdmin = me.role === "admin";

  const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!p) notFound();

  const [exams, notes, memberships, attendance, groups] = await Promise.all([
    supabase.from("mock_exams").select("*").eq("student_id", id).order("taken_on", { ascending: false }),
    supabase.from("teacher_notes").select("id, body, created_at, profiles:author_id(full_name, email)").eq("student_id", id).order("created_at", { ascending: false }),
    supabase.from("group_members").select("group_id, joined_on, groups(name, level)").eq("student_id", id),
    supabase.from("attendance").select("present").eq("student_id", id),
    isAdmin ? loadGroups(supabase, true) : Promise.resolve([]),
  ]);
  const examRows = (exams.data ?? []) as MockExam[];
  const noteRows = (notes.data ?? []) as unknown as { id: string; body: string; created_at: string; profiles: { full_name: string | null; email: string | null } | null }[];
  const members = (memberships.data ?? []) as unknown as { group_id: string; joined_on: string; groups: { name: string; level: string } | null }[];
  const att = (attendance.data ?? []) as { present: boolean }[];
  const present = att.filter((a) => a.present).length;
  const here = `/admin/students/${id}`;
  const initials = (p.full_name || p.email || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const availableGroups = groups.filter((g) => !members.some((m) => m.group_id === g.id));

  return (
    <>
      <Link href="/admin/students" className="muted">← All students</Link>
      <header className="row">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 19 }}>{initials}</span>
          <div>
            <h1>{p.full_name || p.email}</h1>
            <p className="muted">{[p.city, p.email, p.role !== "student" ? p.role : null].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        {p.phone && <a className="btn btn--wa" href={waLink(p.phone, `Bonjour ${(p.full_name ?? "").split(" ")[0]}!`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
      </header>
      <Notice ok={sp.ok} error={sp.error} />

      <section className="grid g4">
        <div className="card"><p className="eyebrow">Status</p><p style={{ fontWeight: 800, color: "var(--navy)", marginTop: 6 }}>{p.immigration_status ?? "—"}</p></div>
        <div className="card"><p className="eyebrow">Permit expires</p><p style={{ marginTop: 8 }}><PermitPill date={p.permit_expiry} /></p></div>
        <div className="card"><p className="eyebrow">Test</p><p style={{ fontWeight: 800, color: "var(--navy)", marginTop: 6 }}>{p.test_type ? `${p.test_type} Canada · ${fmtDate(p.test_date)}` : "Not booked"}</p></div>
        <div className="card"><p className="eyebrow">Attendance</p><p style={{ fontWeight: 800, color: "var(--navy)", marginTop: 6 }}>{att.length ? `${Math.round((present / att.length) * 100)}% · ${present}/${att.length}` : "—"}</p></div>
      </section>

      <section className="card stack">
        <div className="row"><h2>Level</h2><span className="muted">{p.level ? `${p.level} – ${LEVEL_NAMES[p.level]}${p.level_started_on ? `, since ${fmtDate(p.level_started_on)}` : ""}` : "Not set"}</span></div>
        <Ladder level={p.level} />
      </section>

      <section className="grid g2">
        <div className="card stack">
          <h2>Mock exams</h2>
          {examRows.length === 0 ? <p className="empty">No result yet.</p> : (
            <div className="table-box"><table className="tbl">
              <thead><tr><th>Date</th><th>Test</th>{SKILLS.map((s) => <th key={s} style={{ textTransform: "capitalize" }}>{s.slice(0, 6)}.</th>)}</tr></thead>
              <tbody>{examRows.map((e) => (
                <tr key={e.id}><td>{fmtDate(e.taken_on)}</td><td>{e.test_type}</td>
                  {SKILLS.map((s) => <td key={s} className={e[s] !== null && e[s]! < NCLC_TARGET ? "below" : ""}>{e[s] ?? "—"}</td>)}</tr>
              ))}</tbody>
            </table></div>
          )}
          <details>
            <summary className="btn btn--ghost btn--sm">+ Add a result</summary>
            <form action={addMockExam} className="form" style={{ marginTop: 12 }}>
              <input type="hidden" name="student_id" value={id} />
              <div className="fields">
                <label className="f">Date<input type="date" name="taken_on" defaultValue={todayInTz()} required /></label>
                <label className="f">Format<select name="test_type" defaultValue={p.test_type ?? "TCF"}><option value="TCF">TCF</option><option value="TEF">TEF</option></select></label>
              </div>
              <div className="fields">
                {SKILLS.map((s) => <label key={s} className="f" style={{ textTransform: "capitalize" }}>{s} (NCLC)<input type="number" name={s} min={0} max={12} inputMode="numeric" /></label>)}
              </div>
              <div><button className="btn btn--red btn--sm" type="submit">Save result</button></div>
            </form>
          </details>
        </div>

        <div className="card stack">
          <h2>Teacher notes <span className="muted" style={{ fontWeight: 500 }}>(never shown to the student)</span></h2>
          <form action={addNote} className="form">
            <input type="hidden" name="student_id" value={id} />
            <label className="f">Add a note<textarea name="body" required placeholder="What did you notice in class today?" /></label>
            <div><button className="btn btn--ghost btn--sm" type="submit">Add note</button></div>
          </form>
          {noteRows.map((n) => (
            <div key={n.id} className="notice notice--info"><strong>{fmtDate(n.created_at.slice(0, 10))} · {n.profiles?.full_name || n.profiles?.email || "Team"}</strong><br />{n.body}</div>
          ))}
        </div>
      </section>

      <section className="grid g2">
        <div className="card stack">
          <h2>Groups</h2>
          {members.length === 0 && <p className="empty">Not in a group yet.</p>}
          {members.map((m) => (
            <div key={m.group_id} className="row">
              <Link href={`/admin/groups/${m.group_id}`}><strong>{m.groups?.name}</strong></Link>
              {isAdmin && (
                <form action={removeFromGroup}>
                  <input type="hidden" name="group_id" value={m.group_id} /><input type="hidden" name="student_id" value={id} /><input type="hidden" name="from" value={here} />
                  <button className="btn btn--ghost btn--sm" type="submit">Remove</button>
                </form>
              )}
            </div>
          ))}
          {isAdmin && availableGroups.length > 0 && (
            <form action={addToGroup} className="inline-form">
              <input type="hidden" name="student_id" value={id} /><input type="hidden" name="from" value={here} />
              <label htmlFor="grp" className="muted">Add to</label>
              <select id="grp" name="group_id" required>
                {availableGroups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.member_count}/{g.capacity})</option>)}
              </select>
              <button className="btn btn--ghost btn--sm" type="submit">Add</button>
            </form>
          )}
        </div>

        {isAdmin ? (
          <form action={updateStudentAdmin} className="card form">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="level_started_on" value={p.level_started_on ?? ""} />
            <h2>Program &amp; payment</h2>
            <div className="fields">
              <label className="f">Level
                <select name="level" defaultValue={p.level ?? ""}><option value="">Not set</option>{(["zero", "A1", "A2", "B1", "B2"] as const).map((l) => <option key={l} value={l}>{l === "zero" ? "Zero" : l}</option>)}</select>
              </label>
              <label className="f">Plan
                <select name="plan" defaultValue={p.plan ?? ""}><option value="">None</option>{(Object.keys(PLAN_LABELS) as (keyof typeof PLAN_LABELS)[]).map((k) => <option key={k} value={k}>{PLAN_LABELS[k]} (${PLAN_PRICES[k]})</option>)}</select>
              </label>
              <label className="f">Price / month <span className="opt">(empty = plan price)</span><input type="number" name="plan_price_cad" min={0} defaultValue={p.plan_price_cad ?? ""} /></label>
              <label className="f">Payment
                <select name="payment_status" defaultValue={p.payment_status ?? ""}><option value="">—</option><option value="paid">Paid</option><option value="due">Due</option><option value="late">Late</option></select>
              </label>
              <label className="f">Next payment<input type="date" name="next_payment_date" defaultValue={p.next_payment_date ?? ""} /></label>
              <label className="f">Permit expiry<input type="date" name="permit_expiry" defaultValue={p.permit_expiry ?? ""} /></label>
              <label className="f">Test
                <select name="test_type" defaultValue={p.test_type ?? ""}><option value="">—</option><option value="TCF">TCF Canada</option><option value="TEF">TEF Canada</option></select>
              </label>
              <label className="f">Test date<input type="date" name="test_date" defaultValue={p.test_date ?? ""} /></label>
              <label className="f">Phone<input name="phone" defaultValue={p.phone ?? ""} /></label>
              <label className="f">City<input name="city" defaultValue={p.city ?? ""} /></label>
            </div>
            <div><button className="btn btn--red" type="submit">Save</button></div>
          </form>
        ) : (
          <div className="card stack">
            <h2>Program</h2>
            <p><strong>Plan:</strong> {p.plan ? PLAN_LABELS[p.plan] : "—"}</p>
          </div>
        )}
      </section>
    </>
  );
}

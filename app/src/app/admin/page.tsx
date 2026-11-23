import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { loadGroups, loadSessionsBetween, personName } from "@/lib/admin-data";
import { PermitPill, waLink } from "@/components/ui";
import type { AssessmentRequest, Profile } from "@/lib/types";
import { addDays, fmtDate, fmtTime, todayInTz, zonedToUtc } from "@/lib/time";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const { supabase, profile } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const today = todayInTz();
  const [groups, todays, students, requests] = await Promise.all([
    loadGroups(supabase, true),
    loadSessionsBetween(supabase, zonedToUtc(today, "00:00").toISOString(), zonedToUtc(addDays(today, 1), "00:00").toISOString(), isAdmin ? undefined : profile.id),
    supabase.from("profiles").select("id, full_name, email, payment_status, next_payment_date, test_date, test_type").eq("role", "student"),
    isAdmin
      ? supabase.from("assessment_requests").select("*").eq("stage", "new").order("permit_expiry", { ascending: true, nullsFirst: false }).limit(6)
      : Promise.resolve({ data: [] }),
  ]);
  const studentRows = (students.data ?? []) as Pick<Profile, "id" | "full_name" | "email" | "payment_status" | "next_payment_date" | "test_date" | "test_type">[];
  const myGroups = isAdmin ? groups : groups.filter((g) => g.teacher_id === profile.id);
  const openSeats = myGroups.filter((g) => !g.is_private).reduce((t, g) => t + Math.max(0, g.capacity - g.member_count), 0);
  const late = studentRows.filter((s) => s.payment_status === "late");
  const in30 = addDays(today, 30);
  const testsSoon = studentRows.filter((s) => s.test_date && s.test_date >= today && s.test_date <= in30);
  const reqs = (requests.data ?? []) as AssessmentRequest[];
  const newCount = isAdmin ? (await supabase.from("assessment_requests").select("*", { count: "exact", head: true }).eq("stage", "new")).count ?? 0 : 0;

  return (
    <>
      <header className="row">
        <h1>{isAdmin ? "Dashboard" : `Bonjour ${(profile.full_name ?? "").split(" ")[0]}`}</h1>
        <span className="muted">{fmtDate(today, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
      </header>

      <section className="grid g4">
        <div className="card"><p className="eyebrow">Students</p><p className="kpi">{studentRows.length}</p><p className="muted">with an account</p></div>
        <div className="card"><p className="eyebrow">Open seats</p><p className="kpi">{openSeats}</p><p className="muted">in {myGroups.filter((g) => !g.is_private).length} groups</p></div>
        {isAdmin && <div className={`card ${newCount ? "card--hl" : ""}`}><p className="eyebrow">New requests</p><p className={`kpi ${newCount ? "kpi--red" : ""}`}>{newCount}</p><p className="muted"><Link href="/admin/requests">Open the list →</Link></p></div>}
        {isAdmin && <div className="card"><p className="eyebrow">Payments late</p><p className="kpi">{late.length}</p><p className="muted">marked “late”</p></div>}
        {!isAdmin && <div className="card"><p className="eyebrow">Classes today</p><p className="kpi">{todays.length}</p></div>}
      </section>

      {isAdmin && (
        <section className="card stack">
          <div className="row">
            <div><h2>New assessment requests</h2><p className="muted">Most urgent permit first.</p></div>
            <Link className="btn btn--ghost btn--sm" href="/admin/requests">All requests</Link>
          </div>
          {reqs.length === 0 ? <p className="empty">No new requests. They arrive here from the website form.</p> : (
            <div className="table-box"><table className="tbl" style={{ minWidth: 700 }}>
              <thead><tr><th>Name</th><th>City</th><th>Status</th><th>Permit expires</th><th>French</th><th></th></tr></thead>
              <tbody>{reqs.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.full_name}</strong><br /><span className="muted">{r.source ?? "website"} · {fmtDate(r.created_at.slice(0, 10))}</span></td>
                  <td>{r.city}</td><td>{r.immigration_status ?? "—"}</td><td><PermitPill date={r.permit_expiry} /></td><td>{r.french_level ?? "—"}</td>
                  <td><a href={waLink(r.phone, `Bonjour ${r.full_name.split(" ")[0]}! This is French4PR about your free French assessment.`)} target="_blank" rel="noopener noreferrer"><strong>WhatsApp</strong></a></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      )}

      <section className="grid g2">
        <div className="card stack">
          <h2>Today&apos;s classes</h2>
          {todays.length === 0 && <p className="empty">No class today.</p>}
          {todays.map((s) => (
            <div key={s.id} className="row" style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px" }}>
              <div><strong>{s.groups?.name}</strong>{s.cancelled && <span className="pill pill--bad" style={{ marginLeft: 8 }}>Cancelled</span>}<br /><span className="muted">{fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}{s.topic ? ` · ${s.topic}` : ""}</span></div>
              <div className="inline-form">
                <Link className="btn btn--ghost btn--sm" href={`/admin/groups/${s.group_id}#s-${s.id}`}>Attendance</Link>
                {(s.teams_url || s.groups?.teams_url) && <a className="btn btn--ghost btn--sm" href={(s.teams_url || s.groups?.teams_url)!} target="_blank" rel="noopener noreferrer">Teams</a>}
              </div>
            </div>
          ))}
        </div>
        <div className="card stack">
          <h2>Needs attention</h2>
          {isAdmin && late.length > 0 && <p className="notice notice--bad"><strong style={{ color: "inherit" }}>{late.length} payment{late.length > 1 ? "s" : ""} late:</strong> {late.map((s) => personName(s)).join(", ")}</p>}
          {testsSoon.length > 0 && <p className="notice" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}><strong style={{ color: "inherit" }}>{testsSoon.length} student{testsSoon.length > 1 ? "s" : ""}</strong> take their test in the next 30 days: {testsSoon.map((s) => `${personName(s)} (${s.test_type ?? "test"} ${fmtDate(s.test_date)})`).join(", ")}</p>}
          {myGroups.filter((g) => !g.is_private && g.member_count < g.capacity).map((g) => (
            <p key={g.id} className="notice notice--info"><Link href={`/admin/groups/${g.id}`}><strong>{g.name}</strong></Link> has {g.capacity - g.member_count} open seat{g.capacity - g.member_count > 1 ? "s" : ""}.</p>
          ))}
          {late.length === 0 && testsSoon.length === 0 && myGroups.every((g) => g.is_private || g.member_count >= g.capacity) && <p className="empty">All clear.</p>}
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Notice, PermitPill } from "@/components/ui";
import { PLAN_LABELS, type Profile } from "@/lib/types";
import { invitePerson } from "../actions";

export const metadata: Metadata = { title: "Students" };

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string; error?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";
  const q = (sp.q ?? "").trim();

  let query = supabase.from("profiles").select("*, group_members(groups(name))").order("full_name");
  if (q) query = query.or(`full_name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%,city.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const people = (data ?? []) as (Profile & { group_members: { groups: { name: string } | null }[] })[];
  const students = people.filter((p) => p.role === "student");
  const staff = people.filter((p) => p.role !== "student");

  return (
    <>
      <header className="row"><h1>{isAdmin ? "Students & teachers" : "Students"}</h1></header>
      <Notice ok={sp.ok} error={sp.error} />

      <form className="inline-form" role="search">
        <label htmlFor="q" className="muted">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="Name, email or city" style={{ minWidth: 240 }} />
        <button className="btn btn--ghost btn--sm" type="submit">Search</button>
      </form>

      <section className="card">
        <div className="table-box">
          <table className="tbl" style={{ minWidth: 760 }}>
            <thead><tr><th>Name</th><th>Level</th><th>Group</th><th>Plan</th><th>Payment</th><th>Permit</th></tr></thead>
            <tbody>
              {students.length === 0 && <tr><td colSpan={6}><p className="empty">No students yet. Enroll them from the assessment requests, or invite them below.</p></td></tr>}
              {students.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/students/${p.id}`}><strong>{p.full_name || p.email}</strong></Link><br /><span className="muted">{p.city ?? ""}</span></td>
                  <td>{p.level ? <span className={`pill ${p.level === "B2" ? "pill--red" : "pill--navy"}`}>{p.level}</span> : "—"}</td>
                  <td>{p.group_members.map((m) => m.groups?.name).filter(Boolean).join(", ") || <span className="muted">No group</span>}</td>
                  <td>{p.plan ? PLAN_LABELS[p.plan] : "—"}</td>
                  <td>{p.payment_status === "late" ? <span className="pill pill--bad">Late</span> : p.payment_status === "due" ? <span className="pill pill--warn">Due</span> : p.payment_status === "paid" ? <span className="pill pill--ok">Paid</span> : "—"}</td>
                  <td><PermitPill date={p.permit_expiry} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <section className="grid g2">
          <div className="card stack">
            <h2>Team</h2>
            {staff.map((p) => (
              <p key={p.id} className="row"><span><strong>{p.full_name || p.email}</strong><br /><span className="muted">{p.email}</span></span><span className="pill pill--line">{p.role === "admin" ? "Admin" : "Teacher"}</span></p>
            ))}
          </div>
          <form action={invitePerson} className="card form">
            <h2>Invite someone</h2>
            <p className="muted">They receive an email with a link to their space. To enroll someone who filled in the website form, use the assessment requests instead.</p>
            <div className="fields">
              <label className="f">Full name<input name="full_name" required /></label>
              <label className="f">Email<input name="email" type="email" required /></label>
              <label className="f">Role
                <select name="role" defaultValue="student"><option value="student">Student</option><option value="teacher">Teacher</option></select>
              </label>
            </div>
            <div><button className="btn btn--ghost" type="submit">Send invitation</button></div>
          </form>
        </section>
      )}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { loadGroups, loadStaff, personName } from "@/lib/admin-data";
import { Notice } from "@/components/ui";
import { LEVELS } from "@/lib/types";
import { saveGroup } from "../actions";

export const metadata: Metadata = { title: "Groups" };

export default async function Groups({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; all?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";
  const [groups, staff] = await Promise.all([loadGroups(supabase, !sp.all), loadStaff(supabase)]);
  const visible = isAdmin ? groups : groups.filter((g) => g.teacher_id === profile.id);
  const staffById = new Map(staff.map((s) => [s.id, s]));

  return (
    <>
      <header className="row">
        <h1>Groups</h1>
        <Link className="muted" href={sp.all ? "/admin/groups" : "/admin/groups?all=1"}>{sp.all ? "Hide archived groups" : "Show archived groups"}</Link>
      </header>
      <Notice ok={sp.ok} error={sp.error} />

      <section className="grid g3">
        {visible.length === 0 && <p className="empty card">No group yet.{isAdmin ? " Create the first one below." : ""}</p>}
        {visible.map((g) => {
          const pct = Math.round((g.member_count / g.capacity) * 100);
          const open = g.capacity - g.member_count;
          return (
            <Link key={g.id} href={`/admin/groups/${g.id}`} className="card stack" style={{ textDecoration: "none", color: "inherit", opacity: g.active ? 1 : 0.6 }}>
              <div className="row">
                <span className={`pill ${g.level === "B2" || g.level === "B1" ? "pill--red" : "pill--navy"}`}>{g.level}{g.is_private ? " · private" : ""}</span>
                <span className="muted" style={{ fontWeight: 600, color: open > 0 && !g.is_private ? "var(--warn)" : undefined }}>
                  {g.member_count} / {g.capacity}{open > 0 && !g.is_private ? ` · ${open} open` : ""}
                </span>
              </div>
              <h2>{g.name}</h2>
              <p className="muted">{g.schedule_label ?? "No schedule label"} · {personName(staffById.get(g.teacher_id ?? ""))}</p>
              <div className="track"><i style={{ width: `${pct}%` }} /></div>
              <p className="muted">{g.teams_url ? "Teams link ✓" : "No Teams link yet"}{g.active ? "" : " · archived"}</p>
            </Link>
          );
        })}
      </section>

      {isAdmin && (
        <form action={saveGroup} className="card form">
          <h2>New group</h2>
          <div className="fields">
            <label className="f">Name<input name="name" placeholder="B1 Evening" required /></label>
            <label className="f">Level<select name="level" defaultValue="A1">{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
            <label className="f">Teacher
              <select name="teacher_id" defaultValue={staff.find((s) => s.role === "teacher")?.id ?? ""}>
                <option value="">Not assigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{personName(s)}</option>)}
              </select>
            </label>
            <label className="f">Seats<input type="number" name="capacity" min={1} max={12} defaultValue={8} /></label>
            <label className="f">Schedule label <span className="opt">(shown on cards)</span><input name="schedule_label" placeholder="Mon–Fri · 7–8 pm ET" /></label>
            <label className="f">Teams meeting link <span className="opt">(recurring meeting)</span><input name="teams_url" type="url" placeholder="https://teams.microsoft.com/l/meetup-join/…" /></label>
          </div>
          <label className="checks"><label><input type="checkbox" name="is_private" /> Private class (1:1)</label></label>
          <div><button className="btn btn--red" type="submit">Create group</button></div>
        </form>
      )}
    </>
  );
}

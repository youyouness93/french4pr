import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { loadStaff, personName } from "@/lib/admin-data";
import { Notice } from "@/components/ui";
import { LEVELS, type Group, type Homework, type Profile, type Session } from "@/lib/types";
import { addDays, fmtDate, fmtDay, fmtTime, todayInTz, zonedToUtc } from "@/lib/time";
import { addHomework, addToGroup, generateSessions, removeFromGroup, saveAttendance, saveGroup, saveHomeworkStatus, updateSession } from "../../actions";

export const metadata: Metadata = { title: "Group" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function GroupDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile: me } = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const isAdmin = me.role === "admin";
  const here = `/admin/groups/${id}`;

  const { data: g } = await supabase.from("groups").select("*").eq("id", id).maybeSingle<Group>();
  if (!g) notFound();
  const canTeach = isAdmin || g.teacher_id === me.id;

  const today = todayInTz();
  const pastFrom = zonedToUtc(addDays(today, -14), "00:00").toISOString();
  const [members, sessions, homework, staff, students] = await Promise.all([
    supabase.from("group_members").select("student_id, profiles(id, full_name, email, level)").eq("group_id", id),
    supabase.from("sessions").select("*").eq("group_id", id).gte("starts_at", pastFrom).order("starts_at").limit(60),
    supabase.from("homework").select("*").eq("group_id", id).order("due_on", { ascending: false }).limit(10),
    loadStaff(supabase),
    isAdmin ? supabase.from("profiles").select("id, full_name, email").eq("role", "student").order("full_name") : Promise.resolve({ data: [] }),
  ]);
  const roster = ((members.data ?? []) as unknown as { student_id: string; profiles: Pick<Profile, "id" | "full_name" | "email" | "level"> | null }[])
    .map((m) => m.profiles).filter((p): p is Pick<Profile, "id" | "full_name" | "email" | "level"> => !!p)
    .sort((a, b) => personName(a).localeCompare(personName(b)));
  const all = (sessions.data ?? []) as Session[];
  const nowIso = new Date().toISOString();
  const past = all.filter((s) => s.starts_at <= nowIso).reverse();
  const upcoming = all.filter((s) => s.starts_at > nowIso).slice(0, 12);
  const sessionIds = all.map((x) => x.id);
  const homeworkIds = ((homework.data ?? []) as Homework[]).map((h) => h.id);
  const [attendance, hwStatus] = await Promise.all([
    sessionIds.length ? supabase.from("attendance").select("session_id, student_id, present").in("session_id", sessionIds) : Promise.resolve({ data: [] }),
    homeworkIds.length ? supabase.from("homework_status").select("homework_id, student_id, status, grade").in("homework_id", homeworkIds) : Promise.resolve({ data: [] }),
  ]);
  const att = new Map((attendance.data ?? []).map((a) => [`${a.session_id}:${a.student_id}`, a.present as boolean]));
  const hw = (homework.data ?? []) as Homework[];
  const hws = new Map((hwStatus.data ?? []).map((h) => [`${h.homework_id}:${h.student_id}`, h as { status: string; grade: string | null }]));
  const candidates = ((students.data ?? []) as Pick<Profile, "id" | "full_name" | "email">[]).filter((s) => !roster.some((r) => r.id === s.id));
  const full = roster.length >= g.capacity;

  return (
    <>
      <Link href="/admin/groups" className="muted">← All groups</Link>
      <header className="row">
        <div>
          <h1>{g.name}</h1>
          <p className="muted">{g.level}{g.is_private ? " · private" : ""} · {roster.length}/{g.capacity} students · {personName(staff.find((s) => s.id === g.teacher_id))}{g.schedule_label ? ` · ${g.schedule_label}` : ""}</p>
        </div>
        {g.teams_url ? <a className="btn btn--ghost" href={g.teams_url} target="_blank" rel="noopener noreferrer">Open Teams meeting</a> : <span className="pill pill--warn">No Teams link</span>}
      </header>
      <Notice ok={sp.ok} error={sp.error} />

      <section className="grid g2">
        <div className="card stack">
          <h2>Students</h2>
          {roster.length === 0 && <p className="empty">No student in this group yet.</p>}
          {roster.map((r) => (
            <div key={r.id} className="row">
              <Link href={`/admin/students/${r.id}`}><strong>{personName(r)}</strong></Link>
              {isAdmin && (
                <form action={removeFromGroup}>
                  <input type="hidden" name="group_id" value={id} /><input type="hidden" name="student_id" value={r.id} /><input type="hidden" name="from" value={here} />
                  <button className="btn btn--ghost btn--sm" type="submit">Remove</button>
                </form>
              )}
            </div>
          ))}
          {isAdmin && !full && candidates.length > 0 && (
            <form action={addToGroup} className="inline-form">
              <input type="hidden" name="group_id" value={id} /><input type="hidden" name="from" value={here} />
              <label htmlFor="add-st" className="muted">Add</label>
              <select id="add-st" name="student_id" required>{candidates.map((c) => <option key={c.id} value={c.id}>{personName(c)}</option>)}</select>
              <button className="btn btn--ghost btn--sm" type="submit">Add student</button>
            </form>
          )}
          {full && <p className="muted">This group is full.</p>}
        </div>

        {canTeach && (
          <form action={generateSessions} className="card form">
            <input type="hidden" name="group_id" value={id} />
            <h2>Add classes to the calendar</h2>
            <p className="muted">Creates one class per chosen weekday, every week. Times are Toronto time.</p>
            <div className="fields">
              <label className="f">First day<input type="date" name="start_date" defaultValue={today} required /></label>
              <label className="f">Start time<input type="time" name="start_time" defaultValue="19:00" required /></label>
              <label className="f">Length (min)<input type="number" name="duration" min={15} max={240} step={15} defaultValue={60} /></label>
              <label className="f">Weeks<input type="number" name="weeks" min={1} max={26} defaultValue={10} /></label>
            </div>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="muted" style={{ marginBottom: 6 }}>Weekdays</legend>
              <div className="checks">{WEEKDAYS.map((d, i) => <label key={d}><input type="checkbox" name="weekdays" value={i + 1} defaultChecked={!g.is_private && i < 5} /> {d}</label>)}</div>
            </fieldset>
            <div><button className="btn btn--ghost" type="submit">Add classes</button></div>
          </form>
        )}
      </section>

      <section className="card stack">
        <h2>Attendance <span className="muted" style={{ fontWeight: 500 }}>(last 14 days)</span></h2>
        {past.length === 0 && <p className="empty">No past class in the last 14 days.</p>}
        {roster.length > 0 && past.map((s) => (
          <form key={s.id} id={`s-${s.id}`} action={saveAttendance} className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <input type="hidden" name="session_id" value={s.id} /><input type="hidden" name="from" value={here} />
            <strong style={{ minWidth: 170 }}>{fmtDay(s.starts_at)} · {fmtTime(s.starts_at)}{s.cancelled ? " (cancelled)" : ""}</strong>
            <div className="checks" style={{ flex: 1 }}>
              {roster.map((r) => (
                <label key={r.id}>
                  <input type="hidden" name="student_ids" value={r.id} />
                  <input type="checkbox" name="present" value={r.id} defaultChecked={att.get(`${s.id}:${r.id}`) ?? false} disabled={!canTeach} />
                  {personName(r).split(" ")[0]}{att.has(`${s.id}:${r.id}`) ? "" : " ·"}
                </label>
              ))}
            </div>
            {canTeach && <button className="btn btn--ghost btn--sm" type="submit">Save</button>}
          </form>
        ))}
        <p className="muted">Tick who was present. A dot means attendance was not recorded yet.</p>
      </section>

      <section className="card stack">
        <h2>Upcoming classes</h2>
        {upcoming.length === 0 && <p className="empty">No upcoming class. Add them with the form above.</p>}
        {upcoming.map((s) => (
          <form key={s.id} action={updateSession} className="inline-form" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <input type="hidden" name="id" value={s.id} /><input type="hidden" name="from" value={here} />
            <strong style={{ minWidth: 170 }}>{fmtDay(s.starts_at)} · {fmtTime(s.starts_at)}</strong>
            <input name="topic" aria-label="Topic" placeholder="Topic" defaultValue={s.topic ?? ""} disabled={!canTeach} />
            <input name="teams_url" aria-label="Teams link for this class only" type="url" placeholder="Other Teams link (optional)" defaultValue={s.teams_url ?? ""} disabled={!canTeach} />
            <label className="muted"><input type="checkbox" name="cancelled" defaultChecked={s.cancelled} disabled={!canTeach} style={{ width: "auto", minHeight: 0 }} /> Cancelled</label>
            {canTeach && <button className="btn btn--ghost btn--sm" type="submit">Save</button>}
          </form>
        ))}
      </section>

      <section className="grid g2">
        <div className="card stack">
          <h2>Homework</h2>
          {hw.length === 0 && <p className="empty">No homework yet.</p>}
          {hw.map((h) => (
            <details key={h.id} className="notice notice--info">
              <summary><strong>{h.title}</strong> <span className="muted">· {h.skill ?? "homework"} · due {fmtDate(h.due_on)}</span></summary>
              <form action={saveHomeworkStatus} className="form" style={{ marginTop: 10 }}>
                <input type="hidden" name="homework_id" value={h.id} /><input type="hidden" name="from" value={here} />
                {roster.map((r) => {
                  const st = hws.get(`${h.id}:${r.id}`);
                  return (
                    <div key={r.id} className="inline-form">
                      <input type="hidden" name="student_ids" value={r.id} />
                      <span style={{ minWidth: 130 }}>{personName(r)}</span>
                      <select name={`status_${r.id}`} aria-label={`Status for ${personName(r)}`} defaultValue={st?.status ?? "todo"}><option value="todo">To do</option><option value="done">Done</option><option value="corrected">Corrected</option></select>
                      <input name={`grade_${r.id}`} aria-label={`Grade for ${personName(r)}`} placeholder="Grade" defaultValue={st?.grade ?? ""} style={{ width: 90 }} />
                    </div>
                  );
                })}
                {canTeach && <div><button className="btn btn--ghost btn--sm" type="submit">Save statuses</button></div>}
              </form>
            </details>
          ))}
        </div>
        {canTeach && (
          <form action={addHomework} className="card form">
            <input type="hidden" name="group_id" value={id} />
            <h2>New homework</h2>
            <div className="fields">
              <label className="f">Title<input name="title" required placeholder="Opinion text, 180 words" /></label>
              <label className="f">Skill<select name="skill" defaultValue="writing">{["listening", "reading", "writing", "speaking", "grammar", "vocabulary"].map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}</select></label>
              <label className="f">Due<input type="date" name="due_on" defaultValue={addDays(today, 3)} /></label>
            </div>
            <label className="f">Instructions <span className="opt">(optional)</span><textarea name="details" /></label>
            <div><button className="btn btn--ghost" type="submit">Add homework</button></div>
          </form>
        )}
      </section>

      {isAdmin && (
        <details className="box">
          <summary>Group settings</summary>
          <form action={saveGroup} className="form">
            <input type="hidden" name="id" value={id} />
            <div className="fields">
              <label className="f">Name<input name="name" defaultValue={g.name} required /></label>
              <label className="f">Level<select name="level" defaultValue={g.level}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
              <label className="f">Teacher
                <select name="teacher_id" defaultValue={g.teacher_id ?? ""}><option value="">Not assigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{personName(s)}</option>)}</select>
              </label>
              <label className="f">Seats<input type="number" name="capacity" min={1} max={12} defaultValue={g.capacity} /></label>
              <label className="f">Schedule label<input name="schedule_label" defaultValue={g.schedule_label ?? ""} /></label>
              <label className="f">Teams meeting link<input name="teams_url" type="url" defaultValue={g.teams_url ?? ""} /></label>
            </div>
            <div className="checks">
              <label><input type="checkbox" name="is_private" defaultChecked={g.is_private} /> Private class</label>
              <label><input type="checkbox" name="active" defaultChecked={g.active} /> Active (uncheck to archive)</label>
            </div>
            <div><button className="btn btn--ghost" type="submit">Save group</button></div>
          </form>
        </details>
      )}
    </>
  );
}

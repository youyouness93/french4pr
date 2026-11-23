import type { Metadata } from "next";
import { requireStudent } from "@/lib/auth";
import { loadStudentData } from "@/lib/student";
import { Ladder, SkillBars } from "@/components/ui";
import { NCLC_TARGET, SKILLS } from "@/lib/types";
import { fmtDate } from "@/lib/time";

export const metadata: Metadata = { title: "Progress" };

export default async function Progress() {
  const { supabase, profile } = await requireStudent();
  const { exams, homework } = await loadStudentData(supabase, profile.id);
  return (
    <>
      <h1>Progress &amp; mock exams</h1>
      <section className="card stack"><h2>Your level</h2><Ladder level={profile.level} /></section>
      <section className="grid g2">
        <div className="card stack">
          <h2>Latest result</h2>
          {exams[0] ? <SkillBars exam={exams[0]} /> : <p className="empty">No mock exam yet.</p>}
        </div>
        <div className="card stack">
          <h2>All mock exams</h2>
          {exams.length === 0 ? <p className="empty">Your results will appear here after each mock exam.</p> : (
            <div className="table-box">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Test</th>{SKILLS.map((s) => <th key={s} style={{ textTransform: "capitalize" }}>{s.slice(0, 6)}.</th>)}</tr></thead>
                <tbody>{exams.map((e) => (
                  <tr key={e.id}><td>{fmtDate(e.taken_on)}</td><td>{e.test_type}</td>
                    {SKILLS.map((s) => <td key={s} className={e[s] !== null && e[s]! < NCLC_TARGET ? "below" : ""}>{e[s] ?? "—"}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <p className="muted">NCLC levels. Red = below the NCLC 7 target.</p>
        </div>
      </section>
      <section className="card stack">
        <h2>Homework</h2>
        {homework.length === 0 ? <p className="empty">No homework yet.</p> : (
          <div className="table-box"><table className="tbl">
            <thead><tr><th>Homework</th><th>Skill</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{homework.map((h) => (
              <tr key={h.id}><td><strong>{h.title}</strong>{h.details && <><br /><span className="muted">{h.details}</span></>}</td>
                <td style={{ textTransform: "capitalize" }}>{h.skill ?? "—"}</td><td>{fmtDate(h.due_on)}</td>
                <td>{h.status === "corrected" ? <span className="pill pill--ok">{h.grade ?? "Corrected"}</span> : h.status === "done" ? <span className="pill pill--ok">Done</span> : <span className="pill pill--warn">To do</span>}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

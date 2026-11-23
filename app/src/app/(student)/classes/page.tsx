import type { Metadata } from "next";
import { requireStudent } from "@/lib/auth";
import { loadStudentData, teamsUrlOf } from "@/lib/student";
import { TeamsIcon } from "@/components/ui";
import { fmtDay, fmtTime } from "@/lib/time";

export const metadata: Metadata = { title: "My classes" };

export default async function Classes() {
  const { supabase, profile } = await requireStudent();
  const { upcoming } = await loadStudentData(supabase, profile.id);
  return (
    <>
      <h1>My classes</h1>
      <p>All times are Eastern Time (Toronto). Classes take place on Microsoft Teams.</p>
      <section className="card">
        {upcoming.length === 0 ? <p className="empty">No upcoming classes yet.</p> : (
          <div className="table-box">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Time</th><th>Class</th><th>Topic</th><th></th></tr></thead>
              <tbody>
                {upcoming.map((s, i) => (
                  <tr key={s.id}>
                    <td><strong>{fmtDay(s.starts_at)}</strong></td>
                    <td>{fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}</td>
                    <td>{s.groups?.name}</td>
                    <td>{s.topic ?? "—"}</td>
                    <td>{teamsUrlOf(s) && (
                      <a className={`btn btn--sm ${i === 0 ? "btn--red" : "btn--ghost"}`} href={teamsUrlOf(s)!} target="_blank" rel="noopener noreferrer"><TeamsIcon /> Join</a>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

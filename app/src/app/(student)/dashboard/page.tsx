import type { Metadata } from "next";
import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { loadStudentData, teamsUrlOf } from "@/lib/student";
import { Ladder, SkillBars, TeamsIcon } from "@/components/ui";
import { LEVELS, PLAN_LABELS } from "@/lib/types";
import { fmtDate, fmtDay, fmtTime, relativeFromNow, todayInTz } from "@/lib/time";

export const metadata: Metadata = { title: "Dashboard" };
const LEVEL_WEEKS = 10; // typical level length (8–12 weeks), used for the progress bar

export default async function Dashboard() {
  const { supabase, profile } = await requireStudent();
  const { upcoming, exams, attendance, homework } = await loadStudentData(supabase, profile.id);
  const next = upcoming[0];
  const lastExam = exams[0];
  const firstName = (profile.full_name ?? "").split(" ")[0] || "there";
  const step = profile.level && profile.level !== "zero" ? LEVELS.indexOf(profile.level) + 1 : 0;
  const progress = profile.level_started_on
    ? (Date.now() - new Date(profile.level_started_on).getTime()) / (LEVEL_WEEKS * 7 * 86400000)
    : undefined;
  const today = todayInTz();
  const todo = homework.filter((h) => h.status === "todo");

  return (
    <>
      <header className="row">
        <div>
          <p style={{ fontWeight: 600 }}>Bonjour {firstName}!</p>
          <h1>{step ? `You're on step ${step} of 4. Allez!` : "Welcome to French4PR. Allez!"}</h1>
        </div>
        <div className="tabs">
          {profile.test_type && profile.test_date && <span className="pill pill--line">{profile.test_type} Canada · {fmtDate(profile.test_date)}</span>}
          <span className="pill pill--goal">Goal: NCLC 7</span>
        </div>
      </header>

      <section className="grid g3">
        <div className="card card--navy" style={{ gridColumn: "span 2", display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "space-between", alignItems: "center" }}>
          {next ? (
            <>
              <div>
                <p className="eyebrow" style={{ color: "#C5CCDA" }}>Next class · {relativeFromNow(next.starts_at)}</p>
                <h2 style={{ fontSize: 23, margin: "6px 0 4px" }}>{next.groups?.name ?? "Class"}</h2>
                <p>{fmtDay(next.starts_at)}, {fmtTime(next.starts_at)} – {fmtTime(next.ends_at)} ET{next.topic ? ` · ${next.topic}` : ""}</p>
              </div>
              {teamsUrlOf(next) ? (
                <a className="btn btn--red" href={teamsUrlOf(next)!} target="_blank" rel="noopener noreferrer"><TeamsIcon /> Join on Teams</a>
              ) : (
                <span className="muted">Teams link coming soon</span>
              )}
            </>
          ) : (
            <div>
              <h2>No class scheduled yet</h2>
              <p>Your teacher will add you to a group soon. Questions? Message us on WhatsApp.</p>
            </div>
          )}
        </div>
        <div className="card">
          <p className="eyebrow">Attendance</p>
          <p className="kpi">{attendance.total ? `${Math.round((attendance.present / attendance.total) * 100)}%` : "—"}</p>
          <p className="muted">{attendance.total ? `${attendance.present} of ${attendance.total} classes` : "No classes recorded yet"}</p>
        </div>
      </section>

      <section className="card stack">
        <div className="row">
          <h2>Your path to NCLC 7</h2>
          {profile.level_started_on && <span className="muted">{profile.level} started {fmtDate(profile.level_started_on)}</span>}
        </div>
        <Ladder level={profile.level} progress={progress} />
      </section>

      <section className="grid g2">
        <div className="card stack">
          <div className="row"><h2>Last mock exam</h2>{lastExam && <span className="muted">{lastExam.test_type} format · {fmtDate(lastExam.taken_on)}</span>}</div>
          {lastExam ? <SkillBars exam={lastExam} /> : <p className="empty">Your first mock exam results will appear here.</p>}
          {lastExam && <Link className="muted" href="/progress">See all results →</Link>}
        </div>
        <div className="card stack">
          <h2>Homework</h2>
          {todo.length === 0 && <p className="empty">Nothing to do right now. Bravo!</p>}
          {todo.slice(0, 4).map((h) => (
            <div key={h.id} className="row" style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px" }}>
              <div><strong>{h.title}</strong><br /><span className="muted" style={{ textTransform: "capitalize" }}>{h.skill ?? "Homework"}{h.due_on ? ` · due ${fmtDate(h.due_on, { weekday: "short", month: "short", day: "numeric" })}` : ""}</span></div>
              <span className={`pill ${h.due_on && h.due_on < today ? "pill--bad" : "pill--warn"}`}>{h.due_on && h.due_on < today ? "Late" : "To do"}</span>
            </div>
          ))}
          {profile.plan && (
            <p className="notice notice--info" style={{ marginTop: "auto" }}>
              <strong>My plan:</strong> {PLAN_LABELS[profile.plan]}{profile.plan_price_cad ? ` · $${profile.plan_price_cad}/month` : ""}{profile.next_payment_date ? ` · next payment ${fmtDate(profile.next_payment_date)}` : ""}
            </p>
          )}
        </div>
      </section>
    </>
  );
}

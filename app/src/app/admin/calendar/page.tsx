import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { loadSessionsBetween } from "@/lib/admin-data";
import { addDays, dateInTz, fmtDate, fmtTime, mondayOf, todayInTz, zonedToUtc } from "@/lib/time";

export const metadata: Metadata = { title: "Calendar" };

export default async function Calendar({ searchParams }: { searchParams: Promise<{ week?: string; mine?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";
  const start = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : todayInTz());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const onlyMine = !isAdmin || sp.mine === "1";
  const sessions = await loadSessionsBetween(
    supabase, zonedToUtc(start, "00:00").toISOString(), zonedToUtc(addDays(start, 7), "00:00").toISOString(), onlyMine ? profile.id : undefined,
  );
  const today = todayInTz();
  const q = (w: string) => `/admin/calendar?week=${w}${sp.mine === "1" ? "&mine=1" : ""}`;

  return (
    <>
      <header className="row">
        <h1>Week of {fmtDate(start, { month: "long", day: "numeric" })}</h1>
        <div className="inline-form">
          <Link className="btn btn--ghost btn--sm" href={q(addDays(start, -7))} aria-label="Previous week">‹ Previous</Link>
          <Link className="btn btn--ghost btn--sm" href={q(mondayOf(today))}>This week</Link>
          <Link className="btn btn--ghost btn--sm" href={q(addDays(start, 7))} aria-label="Next week">Next ›</Link>
          {isAdmin && <Link className="muted" href={sp.mine === "1" ? `/admin/calendar?week=${start}` : `/admin/calendar?week=${start}&mine=1`}>{sp.mine === "1" ? "Show all teachers" : "Only my classes"}</Link>}
        </div>
      </header>
      <section className="card">
        <div className="table-box">
          <div className="week">
            {days.map((d) => (
              <div key={d} className="day">
                <h3 style={d === today ? { color: "var(--red)" } : undefined}>{fmtDate(d, { weekday: "short", day: "numeric" })}</h3>
                {sessions.filter((s) => dateInTz(s.starts_at) === d).map((s) => {
                  const cls = ["slot", s.groups?.is_private ? "slot--private" : `slot--${(s.groups?.level ?? "").toLowerCase()}`, s.cancelled ? "slot--cancelled" : ""].join(" ");
                  return (
                    <Link key={s.id} className={cls} href={`/admin/groups/${s.group_id}#s-${s.id}`}>
                      <b>{s.groups?.name}</b>{fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}{s.topic ? <><br />{s.topic}</> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>Toronto time. Click a class to record attendance or change its topic. Dashed = private class.</p>
      </section>
    </>
  );
}

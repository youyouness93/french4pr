import Link from "next/link";
import type { Level, MockExam } from "@/lib/types";
import { LEVELS, NCLC_TARGET, SKILLS } from "@/lib/types";
import { monthsUntil, fmtDate } from "@/lib/time";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="French4PR home">
      <svg width="34" height="16" viewBox="0 0 34 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M14 8h18M26 8v5M30 8v4" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="8" cy="8" r="2.2" fill="#C8102E" />
      </svg>
      <span>French<b>4</b>PR</span>
    </Link>
  );
}

/** The brand's A1 → B2 ladder. `progress` is 0–1 within the current level. */
export function Ladder({ level, progress }: { level: Level | null; progress?: number }) {
  const current = level && level !== "zero" ? LEVELS.indexOf(level) : -1;
  return (
    <div className="ladder" role="img" aria-label={current >= 0 ? `Current level ${level}, step ${current + 1} of 4` : "Not started yet"}>
      {LEVELS.map((l, i) => {
        const cls = i < current ? "bar done" : i === current ? "bar now" : "bar";
        return (
          <div key={l} className={cls}>
            {l}
            <small>{i < current ? "done" : i === current ? "you are here" : l === "B2" ? "+ test prep" : ""}</small>
            {i === current && progress !== undefined && (
              <span className="prog"><i style={{ width: `${Math.round(Math.min(1, Math.max(0.04, progress)) * 100)}%` }} /></span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SkillBars({ exam }: { exam: MockExam }) {
  return (
    <div className="stack">
      {SKILLS.map((s) => {
        const v = exam[s];
        const below = v !== null && v < NCLC_TARGET;
        return (
          <div className="skill" key={s}>
            <div className="lbl">
              <span style={{ textTransform: "capitalize" }}>{s}</span>
              <span className={below ? "below" : ""}>
                {v === null ? "—" : below ? `NCLC ${v} · ${NCLC_TARGET - v} to go` : `NCLC ${v} ✓`}
              </span>
            </div>
            <div className="track"><i className={below ? "below" : ""} style={{ width: `${((v ?? 0) / 10) * 100}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

/** Colour-coded permit expiry: < 6 months urgent, < 12 months soon. */
export function PermitPill({ date }: { date: string | null }) {
  if (!date) return <span className="muted">Not given</span>;
  const m = monthsUntil(date);
  const label = fmtDate(date, { month: "short", year: "numeric" });
  if (m < 6) return <span className="pill pill--bad">{label} · urgent</span>;
  if (m < 12) return <span className="pill pill--warn">{label}</span>;
  return <span className="pill pill--ok">{label}</span>;
}

export function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p className="notice notice--bad" role="alert">{error}</p>;
  if (ok) return <p className="notice notice--ok" role="status">{ok}</p>;
  return null;
}

export function waLink(phone: string | null, text = "Bonjour! This is French4PR.") {
  const digits = (phone ?? "").replace(/\D/g, "");
  const full = digits.length === 10 ? `1${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export const TeamsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" />
  </svg>
);

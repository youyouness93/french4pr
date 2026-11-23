import type { Metadata } from "next";
import { requireStudent } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { LEVEL_NAMES, PLAN_LABELS } from "@/lib/types";
import { fmtDate } from "@/lib/time";
import { updateMyProfile } from "./actions";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { profile: p } = await requireStudent();
  const { saved, error } = await searchParams;
  return (
    <>
      <h1>My profile</h1>
      <Notice ok={saved ? "Saved. Merci!" : undefined} error={error ? "We couldn't save your changes. Please check the fields." : undefined} />
      <section className="grid g2">
        <form action={updateMyProfile} className="card form">
          <h2>About you</h2>
          <div className="fields">
            <label className="f">Full name<input name="full_name" defaultValue={p.full_name ?? ""} autoComplete="name" required /></label>
            <label className="f">Phone / WhatsApp<input name="phone" type="tel" defaultValue={p.phone ?? ""} autoComplete="tel" /></label>
            <label className="f">City<input name="city" defaultValue={p.city ?? ""} /></label>
            <label className="f">Current status
              <select name="immigration_status" defaultValue={p.immigration_status ?? ""}>
                <option value="">Choose…</option><option>Work permit</option><option>PGWP</option><option>Study permit</option><option>Other</option>
              </select>
            </label>
            <label className="f">Permit expiry <span className="opt">(helps us plan your path)</span><input name="permit_expiry" type="date" defaultValue={p.permit_expiry ?? ""} /></label>
          </div>
          <h2 style={{ marginTop: 8 }}>Your test</h2>
          <div className="fields">
            <label className="f">Test
              <select name="test_type" defaultValue={p.test_type ?? ""}>
                <option value="">Not decided yet</option><option value="TCF">TCF Canada</option><option value="TEF">TEF Canada</option>
              </select>
            </label>
            <label className="f">Test date <span className="opt">(if booked)</span><input name="test_date" type="date" defaultValue={p.test_date ?? ""} /></label>
          </div>
          <div><button className="btn btn--red" type="submit">Save</button></div>
        </form>
        <div className="card stack">
          <h2>Your program</h2>
          <p><strong>Email:</strong> {p.email}</p>
          <p><strong>Level:</strong> {p.level ? `${p.level} – ${LEVEL_NAMES[p.level]}` : "To be assessed"}</p>
          <p><strong>Plan:</strong> {p.plan ? `${PLAN_LABELS[p.plan]}${p.plan_price_cad ? ` · $${p.plan_price_cad}/month` : ""}` : "—"}</p>
          <p><strong>Next payment:</strong> {fmtDate(p.next_payment_date)}</p>
          <p className="muted">To change your level, plan or email, message us on WhatsApp.</p>
        </div>
      </section>
    </>
  );
}

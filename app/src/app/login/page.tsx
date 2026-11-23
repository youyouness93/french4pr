import type { Metadata } from "next";
import { Brand, Notice } from "@/components/ui";
import { sendMagicLink } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  email: "Please enter a valid email address.",
  link: "This sign-in link has expired or was already used. Ask for a new one below.",
  profile: "Your account is not set up yet. Contact us on WhatsApp.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand href="/login" />
        <h1>Sign in to your space</h1>
        {sent ? (
          <Notice ok="Check your inbox. If this email has a French4PR account, a sign-in link is on its way. It works once and expires after one hour." />
        ) : (
          <p>Enter the email you used with French4PR. We&apos;ll send you a secure sign-in link, no password needed.</p>
        )}
        <Notice error={error ? ERRORS[error] ?? "Something went wrong. Please try again." : undefined} />
        <form action={sendMagicLink} className="form">
          <label className="f">Email
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <button className="btn btn--red" type="submit">Send my sign-in link</button>
        </form>
        <p className="muted">New student? Your account is created after your free assessment. <a href="https://french4pr.com/free-assessment/">Book it here</a>.</p>
      </div>
    </div>
  );
}

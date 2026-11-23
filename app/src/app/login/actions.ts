"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/login?error=email");
  const supabase = await createClient();
  // Only invited people have an account: never create one from the login page.
  await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm` },
  });
  // Same message whether or not the account exists, so the form can't be used to probe emails.
  redirect("/login?sent=1");
}

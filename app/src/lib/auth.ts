import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/** Signed-in user + profile, or a redirect to /login. Optionally restricts to some roles. */
export async function requireProfile(roles?: Role[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login?error=profile");
  if (roles && !roles.includes(profile.role)) redirect(profile.role === "student" ? "/dashboard" : "/admin");
  return { supabase, user, profile };
}

export const requireStaff = () => requireProfile(["admin", "teacher"]);
export const requireAdmin = () => requireProfile(["admin"]);
export const requireStudent = () => requireProfile(["student"]);

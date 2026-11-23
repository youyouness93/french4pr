import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Group, Profile, Session } from "@/lib/types";

export type GroupWithCount = Group & { member_count: number };

export async function loadGroups(supabase: SupabaseClient, onlyActive = false): Promise<GroupWithCount[]> {
  let q = supabase.from("groups").select("*, group_members(count)").order("level").order("name");
  if (onlyActive) q = q.eq("active", true);
  const { data } = await q;
  return (data ?? []).map((g: Group & { group_members: { count: number }[] }) => ({ ...g, member_count: g.group_members?.[0]?.count ?? 0 }));
}

export async function loadStaff(supabase: SupabaseClient): Promise<Pick<Profile, "id" | "full_name" | "email" | "role">[]> {
  const { data } = await supabase.from("profiles").select("id, full_name, email, role").in("role", ["admin", "teacher"]).order("full_name");
  return data ?? [];
}

export type SessionRow = Session & { groups: Pick<Group, "name" | "level" | "is_private" | "teams_url" | "teacher_id"> | null };

export async function loadSessionsBetween(supabase: SupabaseClient, fromIso: string, toIso: string, teacherId?: string): Promise<SessionRow[]> {
  const { data } = await supabase.from("sessions")
    .select("*, groups!inner(name, level, is_private, teams_url, teacher_id)")
    .gte("starts_at", fromIso).lt("starts_at", toIso).order("starts_at");
  const rows = (data ?? []) as SessionRow[];
  return teacherId ? rows.filter((r) => r.groups?.teacher_id === teacherId) : rows;
}

export const personName = (p: { full_name: string | null; email: string | null } | null | undefined) =>
  p?.full_name || p?.email || "—";

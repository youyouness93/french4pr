import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Group, Homework, MockExam, Session } from "@/lib/types";

export type SessionWithGroup = Session & { groups: Pick<Group, "name" | "teams_url" | "level" | "is_private"> | null };

/** Everything the student pages need. RLS already limits every query to this student. */
export async function loadStudentData(supabase: SupabaseClient, studentId: string) {
  const { data: memberships } = await supabase.from("group_members").select("group_id").eq("student_id", studentId);
  const groupIds = (memberships ?? []).map((m) => m.group_id as string);
  const nowIso = new Date().toISOString();

  const [upcoming, exams, attendance, homework, hwStatus] = await Promise.all([
    groupIds.length
      ? supabase.from("sessions").select("*, groups(name, teams_url, level, is_private)").in("group_id", groupIds)
          .gt("ends_at", nowIso).eq("cancelled", false).order("starts_at").limit(20)
      : Promise.resolve({ data: [] }),
    supabase.from("mock_exams").select("*").eq("student_id", studentId).order("taken_on", { ascending: false }),
    supabase.from("attendance").select("present").eq("student_id", studentId),
    groupIds.length
      ? supabase.from("homework").select("*").in("group_id", groupIds).order("due_on", { ascending: true, nullsFirst: false }).limit(20)
      : Promise.resolve({ data: [] }),
    supabase.from("homework_status").select("homework_id, status, grade").eq("student_id", studentId),
  ]);

  const att = (attendance.data ?? []) as { present: boolean }[];
  const statusById = new Map((hwStatus.data ?? []).map((s) => [s.homework_id as string, s as { status: string; grade: string | null }]));
  return {
    upcoming: (upcoming.data ?? []) as SessionWithGroup[],
    exams: (exams.data ?? []) as MockExam[],
    attendance: { present: att.filter((a) => a.present).length, total: att.length },
    homework: ((homework.data ?? []) as Homework[]).map((h) => ({ ...h, status: statusById.get(h.id)?.status ?? "todo", grade: statusById.get(h.id)?.grade ?? null })),
  };
}

export const teamsUrlOf = (s: SessionWithGroup) => s.teams_url || s.groups?.teams_url || null;

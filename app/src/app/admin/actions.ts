"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, isoWeekday, zonedToUtc } from "@/lib/time";
import type { Level, Plan, Stage } from "@/lib/types";
import { PLAN_PRICES } from "@/lib/types";

// ───────────────────────────────────────────── helpers ──
const s = (fd: FormData, k: string, max = 200) => {
  const v = String(fd.get(k) ?? "").trim().slice(0, max);
  return v || null;
};
const n = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" || Number.isNaN(Number(v)) ? null : Number(v);
};
const back = (path: string, msg: string, kind: "ok" | "error" = "ok"): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
const LEVELS: Level[] = ["zero", "A1", "A2", "B1", "B2"];
const asLevel = (v: string | null): Level | null => (v && (LEVELS as string[]).includes(v) ? (v as Level) : null);
const isHttps = (v: string | null) => !v || /^https:\/\/\S+$/.test(v);

// ─────────────────────────────────────── assessment requests ──
export async function setRequestStage(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = s(fd, "id", 40)!;
  const stage = s(fd, "stage", 20) as Stage;
  await supabase.from("assessment_requests").update({ stage }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function saveRequestNotes(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("assessment_requests").update({ admin_notes: s(fd, "admin_notes", 4000) }).eq("id", s(fd, "id", 40)!);
  revalidatePath("/admin/requests");
  back(`/admin/requests?open=${s(fd, "id", 40)}`, "Notes saved.");
}

/**
 * Creates the person's account and emails them an invitation to the member area.
 * From a request (request_id) or from scratch (email + full_name). Admin only.
 */
export async function invitePerson(fd: FormData) {
  const { supabase } = await requireAdmin();
  const requestId = s(fd, "request_id", 40);
  const role = s(fd, "role", 10) === "teacher" ? "teacher" : "student";
  const returnTo = requestId ? "/admin/requests" : "/admin/students";

  let email = s(fd, "email", 254)?.toLowerCase() ?? null;
  let details: Record<string, unknown> = { full_name: s(fd, "full_name") };
  if (requestId) {
    const { data: r } = await supabase.from("assessment_requests").select("*").eq("id", requestId).single();
    if (!r) back(returnTo, "Request not found.", "error");
    email = r.email.toLowerCase();
    details = {
      full_name: r.full_name, phone: r.phone, city: r.city, immigration_status: r.immigration_status,
      permit_expiry: r.permit_expiry, level: asLevel(r.french_level),
    };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back(returnTo, "A valid email is needed to invite someone.", "error");

  const admin = createAdminClient();
  let userId: string | null = null;
  const invite = await admin.auth.admin.inviteUserByEmail(email!, {
    data: { full_name: details.full_name ?? "" },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
  });
  if (invite.data?.user) {
    userId = invite.data.user.id;
  } else {
    // Already has an account: link to the existing profile instead.
    const { data: existing } = await admin.from("profiles").select("id").eq("email", email!).maybeSingle();
    if (!existing) back(returnTo, `Invitation failed: ${invite.error?.message ?? "unknown error"}`, "error");
    userId = existing!.id;
  }

  const clean = Object.fromEntries(Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== ""));
  await admin.from("profiles").update({ ...clean, role }).eq("id", userId!);
  if (requestId) {
    await admin.from("assessment_requests").update({ stage: "enrolled", student_id: userId }).eq("id", requestId);
  }
  revalidatePath("/admin", "layout");
  if (requestId) redirect(`/admin/students/${userId}?ok=${encodeURIComponent("Invitation sent. Set their level, plan and group below.")}`);
  back(returnTo, `Invitation sent to ${email}.`);
}

// ─────────────────────────────────────────────── students ──
export async function updateStudentAdmin(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = s(fd, "id", 40)!;
  const plan = s(fd, "plan", 20) as Plan | null;
  const level = asLevel(s(fd, "level", 5));
  const price = n(fd, "plan_price_cad");
  const pay = s(fd, "payment_status", 10);
  const { data: before } = await supabase.from("profiles").select("level").eq("id", id).single();
  const { error } = await supabase.from("profiles").update({
    level,
    level_started_on: level !== before?.level ? new Date().toISOString().slice(0, 10) : s(fd, "level_started_on", 10),
    plan,
    plan_price_cad: price ?? (plan ? PLAN_PRICES[plan] : null),
    next_payment_date: s(fd, "next_payment_date", 10),
    payment_status: pay === "paid" || pay === "due" || pay === "late" ? pay : null,
    permit_expiry: s(fd, "permit_expiry", 10),
    test_type: s(fd, "test_type", 3),
    test_date: s(fd, "test_date", 10),
    phone: s(fd, "phone", 40),
    city: s(fd, "city", 100),
  }).eq("id", id);
  revalidatePath(`/admin/students/${id}`);
  back(`/admin/students/${id}`, error ? "Could not save: check the fields." : "Saved.", error ? "error" : "ok");
}

export async function addMockExam(fd: FormData) {
  const { supabase } = await requireStaff();
  const id = s(fd, "student_id", 40)!;
  const score = (k: string) => { const v = n(fd, k); return v === null ? null : Math.max(0, Math.min(12, Math.round(v))); };
  const { error } = await supabase.from("mock_exams").insert({
    student_id: id, taken_on: s(fd, "taken_on", 10) ?? undefined, test_type: s(fd, "test_type", 3) === "TEF" ? "TEF" : "TCF",
    listening: score("listening"), reading: score("reading"), writing: score("writing"), speaking: score("speaking"),
  });
  revalidatePath(`/admin/students/${id}`);
  back(`/admin/students/${id}`, error ? "Could not add the result." : "Mock exam added.", error ? "error" : "ok");
}

export async function addNote(fd: FormData) {
  const { supabase } = await requireStaff();
  const id = s(fd, "student_id", 40)!;
  const body = s(fd, "body", 4000);
  if (body) await supabase.from("teacher_notes").insert({ student_id: id, body });
  revalidatePath(`/admin/students/${id}`);
  back(`/admin/students/${id}`, "Note added.");
}

export async function addToGroup(fd: FormData) {
  const { supabase } = await requireAdmin();
  const student = s(fd, "student_id", 40)!;
  const group = s(fd, "group_id", 40)!;
  const from = s(fd, "from", 200) ?? `/admin/students/${student}`;
  const { data: g } = await supabase.from("groups").select("capacity").eq("id", group).single();
  const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", group);
  if (g && (count ?? 0) >= g.capacity) back(from, "This group is full.", "error");
  const { error } = await supabase.from("group_members").insert({ group_id: group, student_id: student });
  revalidatePath("/admin", "layout");
  back(from, error ? "Already in this group." : "Added to the group.", error ? "error" : "ok");
}

export async function removeFromGroup(fd: FormData) {
  const { supabase } = await requireAdmin();
  const from = s(fd, "from", 200)!;
  await supabase.from("group_members").delete().eq("group_id", s(fd, "group_id", 40)!).eq("student_id", s(fd, "student_id", 40)!);
  revalidatePath("/admin", "layout");
  back(from, "Removed from the group.");
}

// ───────────────────────────────────────────────── groups ──
export async function saveGroup(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = s(fd, "id", 40);
  const teams = s(fd, "teams_url", 1000);
  const level = asLevel(s(fd, "level", 5));
  if (!level || level === "zero") back(id ? `/admin/groups/${id}` : "/admin/groups", "Choose a level from A1 to B2.", "error");
  if (!isHttps(teams)) back(id ? `/admin/groups/${id}` : "/admin/groups", "The Teams link must start with https://", "error");
  const row = {
    name: s(fd, "name", 80) ?? "New group", level, is_private: fd.get("is_private") === "on",
    teacher_id: s(fd, "teacher_id", 40), schedule_label: s(fd, "schedule_label", 120),
    capacity: Math.max(1, Math.min(12, n(fd, "capacity") ?? 8)), teams_url: teams,
    active: id ? fd.get("active") === "on" : true,
  };
  if (id) {
    const { error } = await supabase.from("groups").update(row).eq("id", id);
    revalidatePath("/admin", "layout");
    back(`/admin/groups/${id}`, error ? "Could not save the group." : "Group saved.", error ? "error" : "ok");
  }
  const { data, error } = await supabase.from("groups").insert(row).select("id").single();
  revalidatePath("/admin", "layout");
  if (error || !data) back("/admin/groups", "Could not create the group.", "error");
  redirect(`/admin/groups/${data!.id}?ok=${encodeURIComponent("Group created. Now add its class schedule.")}`);
}

/** Creates recurring classes: chosen weekdays × N weeks, at a Toronto time. */
export async function generateSessions(fd: FormData) {
  const { supabase } = await requireStaff();
  const groupId = s(fd, "group_id", 40)!;
  const path = `/admin/groups/${groupId}`;
  const start = s(fd, "start_date", 10);
  const time = s(fd, "start_time", 5);
  const minutes = Math.max(15, Math.min(240, n(fd, "duration") ?? 60));
  const weeks = Math.max(1, Math.min(26, n(fd, "weeks") ?? 10));
  const days = fd.getAll("weekdays").map(Number).filter((d) => d >= 1 && d <= 7);
  if (!start || !time || days.length === 0) back(path, "Pick a start date, a time and at least one weekday.", "error");

  const rows: { group_id: string; starts_at: string; ends_at: string; topic: string | null }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(start!, i);
    if (!days.includes(isoWeekday(date))) continue;
    const begins = zonedToUtc(date, time!);
    rows.push({ group_id: groupId, starts_at: begins.toISOString(), ends_at: new Date(begins.getTime() + minutes * 60000).toISOString(), topic: null });
  }
  const { error } = await supabase.from("sessions").insert(rows);
  revalidatePath("/admin", "layout");
  back(path, error ? "Could not create the classes." : `${rows.length} classes added to the calendar.`, error ? "error" : "ok");
}

export async function updateSession(fd: FormData) {
  const { supabase } = await requireStaff();
  const id = s(fd, "id", 40)!;
  const from = s(fd, "from", 200)!;
  const teams = s(fd, "teams_url", 1000);
  if (!isHttps(teams)) back(from, "The Teams link must start with https://", "error");
  await supabase.from("sessions").update({ topic: s(fd, "topic", 160), teams_url: teams, cancelled: fd.get("cancelled") === "on" }).eq("id", id);
  revalidatePath("/admin", "layout");
  back(from, "Class updated.");
}

export async function saveAttendance(fd: FormData) {
  const { supabase } = await requireStaff();
  const sessionId = s(fd, "session_id", 40)!;
  const from = s(fd, "from", 200)!;
  const present = new Set(fd.getAll("present").map(String));
  const rows = fd.getAll("student_ids").map(String).map((student_id) => ({ session_id: sessionId, student_id, present: present.has(student_id) }));
  const { error } = await supabase.from("attendance").upsert(rows);
  revalidatePath("/admin", "layout");
  back(from, error ? "Could not save attendance." : "Attendance saved.", error ? "error" : "ok");
}

// ─────────────────────────────────────────────── homework ──
export async function addHomework(fd: FormData) {
  const { supabase } = await requireStaff();
  const groupId = s(fd, "group_id", 40)!;
  const { error } = await supabase.from("homework").insert({
    group_id: groupId, title: s(fd, "title", 160) ?? "Homework", skill: s(fd, "skill", 20), due_on: s(fd, "due_on", 10), details: s(fd, "details", 4000),
  });
  revalidatePath("/admin", "layout");
  back(`/admin/groups/${groupId}`, error ? "Could not add homework." : "Homework added.", error ? "error" : "ok");
}

export async function saveHomeworkStatus(fd: FormData) {
  const { supabase } = await requireStaff();
  const homeworkId = s(fd, "homework_id", 40)!;
  const from = s(fd, "from", 200)!;
  const rows = fd.getAll("student_ids").map(String).map((student_id) => {
    const status = s(fd, `status_${student_id}`, 10);
    return { homework_id: homeworkId, student_id, status: status === "done" || status === "corrected" ? status : "todo", grade: s(fd, `grade_${student_id}`, 20) };
  });
  const { error } = await supabase.from("homework_status").upsert(rows);
  revalidatePath("/admin", "layout");
  back(from, error ? "Could not save." : "Homework status saved.", error ? "error" : "ok");
}

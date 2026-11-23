export type Role = "admin" | "teacher" | "student";
export type Level = "zero" | "A1" | "A2" | "B1" | "B2";
export type Stage = "new" | "contacted" | "booked" | "assessed" | "enrolled" | "lost";
export type Plan = "group" | "private" | "fast_track";
export type TestType = "TEF" | "TCF";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  immigration_status: string | null;
  permit_expiry: string | null;
  level: Level | null;
  level_started_on: string | null;
  test_type: TestType | null;
  test_date: string | null;
  plan: Plan | null;
  plan_price_cad: number | null;
  next_payment_date: string | null;
  payment_status: "paid" | "due" | "late" | null;
  created_at: string;
}

export interface AssessmentRequest {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  immigration_status: string | null;
  permit_expiry: string | null;
  french_level: string | null;
  preferred_format: string | null;
  availability: string[] | null;
  source: string | null;
  stage: Stage;
  admin_notes: string | null;
  student_id: string | null;
}

export interface Group {
  id: string;
  name: string;
  level: Level;
  is_private: boolean;
  teacher_id: string | null;
  schedule_label: string | null;
  capacity: number;
  teams_url: string | null;
  active: boolean;
}

export interface Session {
  id: string;
  group_id: string;
  starts_at: string;
  ends_at: string;
  topic: string | null;
  teams_url: string | null;
  cancelled: boolean;
}

export interface MockExam {
  id: string;
  student_id: string;
  taken_on: string;
  test_type: TestType;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
}

export interface Homework {
  id: string;
  group_id: string;
  title: string;
  skill: string | null;
  due_on: string | null;
  details: string | null;
}

export const LEVELS: Exclude<Level, "zero">[] = ["A1", "A2", "B1", "B2"];
export const LEVEL_NAMES: Record<Level, string> = {
  zero: "Zero", A1: "Beginner", A2: "Elementary", B1: "Intermediate", B2: "Upper-Intermediate",
};
export const PLAN_LABELS: Record<Plan, string> = {
  group: "Group classes", private: "Private classes", fast_track: "Private fast-track",
};
export const PLAN_PRICES: Record<Plan, number> = { group: 239, private: 359, fast_track: 539 };
export const STAGES: { value: Stage; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "booked", label: "Booked" },
  { value: "assessed", label: "Assessed" },
  { value: "enrolled", label: "Enrolled" },
  { value: "lost", label: "Lost" },
];
export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export const NCLC_TARGET = 7;

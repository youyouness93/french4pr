import { Shell } from "@/components/Shell";
import { requireStaff } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const { count } = isAdmin
    ? await supabase.from("assessment_requests").select("*", { count: "exact", head: true }).eq("stage", "new")
    : { count: 0 };
  const nav = [
    { href: "/admin", label: "Dashboard" },
    ...(isAdmin ? [{ href: "/admin/requests", label: "Assessment requests", count: count ?? 0 }] : []),
    { href: "/admin/students", label: isAdmin ? "Students & teachers" : "Students" },
    { href: "/admin/groups", label: "Groups" },
    { href: "/admin/calendar", label: "Calendar" },
  ];
  return (
    <Shell variant="admin" nav={nav} roleLabel={isAdmin ? "Admin" : "Teacher"} footer={<p style={{ marginBottom: 8 }}>{profile.full_name || profile.email}</p>}>
      {children}
    </Shell>
  );
}

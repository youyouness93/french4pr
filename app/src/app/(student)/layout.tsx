import { Shell } from "@/components/Shell";
import { requireStudent } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireStudent();
  return (
    <Shell
      variant="student"
      nav={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/classes", label: "My classes" },
        { href: "/progress", label: "Progress & mock exams" },
        { href: "/profile", label: "Profile" },
      ]}
      footer={<p style={{ marginBottom: 8 }}>Need help? <strong>WhatsApp us</strong><br />Mon–Sat, 9 am–8 pm ET</p>}
    >
      {children}
    </Shell>
  );
}

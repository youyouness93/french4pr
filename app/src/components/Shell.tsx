import { Brand } from "@/components/ui";
import { NavLinks, type NavItem } from "@/components/NavLinks";

/** Sidebar + content area, shared by the student and admin layouts. */
export function Shell({ variant, nav, roleLabel, footer, children }: {
  variant: "student" | "admin";
  nav: NavItem[];
  roleLabel?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const root = variant === "admin" ? "/admin" : "/dashboard";
  return (
    <div className="shell">
      <aside className={variant === "admin" ? "side side--admin" : "side"}>
        <Brand href={root} />
        {roleLabel && <span className="role-chip">{roleLabel}</span>}
        <NavLinks items={nav} root={root} />
        <div className="side-foot">
          {footer}
          <form action="/auth/signout" method="post"><button type="submit">Sign out</button></form>
        </div>
      </aside>
      <main className="main" id="main">{children}</main>
    </div>
  );
}

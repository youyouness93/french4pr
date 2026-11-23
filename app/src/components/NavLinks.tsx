"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem { href: string; label: string; count?: number }

export function NavLinks({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || (href !== root && path.startsWith(href + "/")) || (href !== root && path === href);
  return (
    <nav className="nav" aria-label="Main">
      {items.map((n) => (
        <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}>
          {n.label}
          {n.count ? <span className="count">{n.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

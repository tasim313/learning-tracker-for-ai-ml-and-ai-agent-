"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavGroup = { label: string; links: { href: string; label: string }[]; collapsible?: boolean };

export function AppNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Main navigation" className="space-y-5 p-4">
      {groups.map((group) => (
        <div key={group.label}>
          {group.collapsible ? (
            <details open={group.links.some((link) => isActive(link.href))}>
              <summary className="cursor-pointer list-none rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 focus-visible:outline-2 focus-visible:outline-blue-700">{group.label}</summary>
              <ul className="mt-1 space-y-0.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} aria-current={isActive(link.href) ? "page" : undefined}
                      className={`block rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 ${isActive(link.href) ? "bg-blue-50 font-semibold text-blue-900" : "text-slate-700"}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : <>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.label}</p>
          <ul className="mt-1 space-y-0.5">
            {group.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} aria-current={isActive(link.href) ? "page" : undefined}
                  className={`block rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 ${isActive(link.href) ? "bg-blue-50 font-semibold text-blue-900" : "text-slate-700"}`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          </>}
        </div>
      ))}
    </nav>
  );
}

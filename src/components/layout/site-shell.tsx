"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const routes = [
  { href: "/", label: "Onboarding" },
  { href: "/vault", label: "Vault" },
  { href: "/key-generation", label: "Keys" },
  { href: "/cli", label: "CLI" },
  { href: "/docs", label: "Docs" },
  { href: "/security", label: "Security" },
  { href: "/github", label: "GitHub" },
];

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-page-texture text-foreground">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-8 md:py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Platanist Nest</p>
            <p className="text-lg font-semibold">Ciphertext Vault</p>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-black/10 bg-background/90 text-foreground transition-colors hover:bg-accent md:hidden"
            aria-expanded={menuOpen}
            aria-controls="site-mobile-nav"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <nav className="hidden items-center gap-2 rounded-full border border-black/10 bg-background/80 p-1 md:flex">
            {routes.map((route) => {
              const isActive = pathname === route.href;

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {route.label}
                </Link>
              );
            })}
          </nav>

          {menuOpen && (
            <nav
              id="site-mobile-nav"
              className="grid w-full gap-1 rounded-xl border border-black/10 bg-background/95 p-2 animate-rise md:hidden"
            >
              {routes.map((route) => {
                const isActive = pathname === route.href;

                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    {route.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl animate-fade-up px-3 pb-14 pt-6 sm:px-4 sm:pt-7 md:px-8 md:pb-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}
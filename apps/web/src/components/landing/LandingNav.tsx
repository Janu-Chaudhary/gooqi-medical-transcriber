"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-iris-border/40 bg-deep-iris/95 backdrop-blur-md supports-[backdrop-filter]:bg-deep-iris/85 transition-all">
      {/* Main nav bar */}
      <div className="mx-auto flex h-16 sm:h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-cloud-white hover:opacity-95 transition-opacity shrink-0">
          <span className="flex size-8 sm:size-9 items-center justify-center rounded-[7px] bg-iris-glow text-mint-vital shadow-[0_0_15px_rgba(64,60,213,0.3)]">
            <Activity className="size-4 sm:size-5 stroke-[2.5]" />
          </span>
          <span className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.54px] text-cloud-white">Gooqi Scribe</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[15px] lg:text-[17px] font-medium text-cloud-white/80 hover:text-cloud-white transition-colors relative py-2 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-clinical-cyan after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:gap-4 md:flex">
          <ThemeToggle />
          <Link 
            href="/login" 
            className="text-[15px] lg:text-[17px] font-medium text-cloud-white/85 hover:text-cloud-white transition-colors flex items-center gap-1 group"
          >
            Log in <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Button 
            className="rounded-buttons bg-iris-pulse hover:bg-iris-pulse/90 text-cloud-white text-[15px] lg:text-[17px] font-medium px-4 lg:px-6 py-2 lg:py-2.5 h-auto shadow-[0_0_20px_rgba(60,57,185,0.4)] border border-iris-veil/20 transition-all hover:scale-[1.02]" 
            asChild
          >
            <Link href="/login">Get started free</Link>
          </Button>
        </div>

        {/* Mobile right side: theme toggle + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            className="inline-flex size-9 items-center justify-center rounded-full border border-iris-border/50 text-cloud-white bg-iris-shadow hover:bg-iris-glow transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={cn(
          "border-t border-iris-border/40 bg-deep-iris/98 md:hidden overflow-hidden transition-all duration-300 shadow-2xl",
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-[16px] font-medium text-cloud-white/80 hover:bg-iris-shadow hover:text-cloud-white transition-all"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2.5 pt-4 border-t border-iris-border/20">
            <Link 
              href="/login" 
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-buttons border border-iris-border/80 text-cloud-white text-[16px] font-medium py-3 hover:bg-iris-shadow transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/login" 
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-buttons bg-iris-pulse text-cloud-white text-[16px] font-medium py-3 shadow-[0_0_20px_rgba(60,57,185,0.4)] hover:bg-iris-pulse/90 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

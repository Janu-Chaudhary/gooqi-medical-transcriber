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
    <header className="sticky top-0 z-40 h-20 border-b border-iris-border/40 bg-deep-iris/90 backdrop-blur-md supports-[backdrop-filter]:bg-deep-iris/80 transition-all">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-cloud-white hover:opacity-95 transition-opacity">
          <span className="flex size-9 items-center justify-center rounded-[7px] bg-iris-glow text-mint-vital shadow-[0_0_15px_rgba(64,60,213,0.3)]">
            <Activity className="size-5 stroke-[2.5]" />
          </span>
          <span className="text-[20px] font-semibold tracking-[-0.54px] text-cloud-white">Gooqi Scribe</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[17px] font-medium text-cloud-white/80 hover:text-cloud-white transition-colors relative py-2 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-clinical-cyan after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <ThemeToggle />
          <Link 
            href="/login" 
            className="text-[17px] font-medium text-cloud-white/85 hover:text-cloud-white transition-colors flex items-center gap-1 group"
          >
            Log in <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Button 
            className="rounded-buttons bg-iris-pulse hover:bg-iris-pulse/90 text-cloud-white text-[17px] font-medium px-6 py-2.5 h-auto shadow-[0_0_20px_rgba(60,57,185,0.4)] border border-iris-veil/20 transition-all hover:scale-[1.02]" 
            asChild
          >
            <Link href="/login">Get started free</Link>
          </Button>
        </div>

        <button
          className="inline-flex size-10 items-center justify-center rounded-full border border-iris-border/50 text-cloud-white bg-iris-shadow md:hidden hover:bg-iris-glow transition-colors"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "border-t border-iris-border/40 bg-deep-iris md:hidden transition-all duration-300 shadow-2xl",
          open ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-[17px] font-medium text-cloud-white/80 hover:bg-iris-shadow hover:text-cloud-white transition-all"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-iris-border/20">
            <Link 
              href="/login" 
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-buttons border border-iris-border/80 text-cloud-white text-[17px] font-medium py-3 hover:bg-iris-shadow transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/login" 
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-buttons bg-iris-pulse text-cloud-white text-[17px] font-medium py-3 shadow-[0_0_20px_rgba(60,57,185,0.4)] hover:bg-iris-pulse/90 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

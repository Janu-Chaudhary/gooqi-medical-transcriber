"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-9 rounded-md">
        <Sun className="size-4" />
      </Button>
    );
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="size-4 text-amber-500" />;
      case "dark":
        return <Moon className="size-4 text-indigo-400" />;
      case "blue":
      default:
        return <Palette className="size-4 text-sky-400" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-md border border-border/50 hover:bg-muted text-foreground">
          {getThemeIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border text-foreground w-32 shadow-2xl">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center justify-between text-xs cursor-pointer focus:bg-muted"
        >
          <span className="flex items-center gap-2">
            <Sun className="size-3.5 text-amber-500" />
            Light
          </span>
          {theme === "light" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center justify-between text-xs cursor-pointer focus:bg-muted"
        >
          <span className="flex items-center gap-2">
            <Moon className="size-3.5 text-indigo-400" />
            Dark
          </span>
          {theme === "dark" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("blue")}
          className="flex items-center justify-between text-xs cursor-pointer focus:bg-muted"
        >
          <span className="flex items-center gap-2">
            <Palette className="size-3.5 text-sky-400" />
            Blue
          </span>
          {theme === "blue" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

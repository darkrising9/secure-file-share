// File Path: components/theme-toggle.tsx

"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes" // The hook that controls the theme

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  // The useTheme hook gives us the current theme and a function to set it
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      // The onClick handler toggles between 'dark' and 'light'
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme" // For accessibility
    >
      {/* Sun icon: Shown in light mode, hidden in dark mode */}
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />

      {/* Moon icon: Hidden in light mode, shown in dark mode */}
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />

      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
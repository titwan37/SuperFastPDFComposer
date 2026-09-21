
"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const hour = new Date().getHours();
      // Set dark theme from 6 PM to 8 AM
      const isNight = hour < 8 || hour >= 18;
      setTheme(isNight ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    if (theme) {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const handleThemeChange = (isChecked: boolean) => {
    setTheme(isChecked ? "dark" : "light");
  };

  // Render nothing on the server or initial client render to avoid hydration mismatch
  if (theme === null) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-5 w-5" />
      <Switch
        id="theme-switch"
        checked={theme === "dark"}
        onCheckedChange={handleThemeChange}
        aria-label="Toggle theme"
      />
      <Moon className="h-5 w-5" />
    </div>
  );
}

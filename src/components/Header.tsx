import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  History,
  BarChart3,
  DownloadCloud,
  PenLine,
  Flame,
  Sun,
  Moon,
  Monitor,
  Cloud,
} from "lucide-react";

interface HeaderProps {
  activeTab: "studio" | "history" | "insights";
  setActiveTab: (tab: "studio" | "history" | "insights") => void;
  streak: number;
  totalEntries: number;
  onOpenExportImport: () => void;
  onNewReflection: () => void;
  onOpenCloudSync: () => void;
  isCloudConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  streak,
  totalEntries,
  onOpenExportImport,
  onNewReflection,
  onOpenCloudSync,
  isCloudConnected,
}) => {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("reflect_theme_preference") as any) || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "dark") {
      applyTheme(true);
      localStorage.setItem("reflect_theme_preference", "dark");
    } else if (theme === "light") {
      applyTheme(false);
      localStorage.setItem("reflect_theme_preference", "light");
    } else {
      // System mode
      localStorage.setItem("reflect_theme_preference", "system");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(systemDark);

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [theme]);

  const cycleTheme = () => {
    if (theme === "system") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("system");
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => {
            setActiveTab("studio");
            onNewReflection();
          }}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-black dark:text-white">
                Reflect
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-medium border border-neutral-300 dark:border-neutral-700 hidden xs:flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Coach
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block">
              Empathetic, grounded reflection companion
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <button
            id="nav-studio-btn"
            type="button"
            onClick={() => {
              setActiveTab("studio");
              if (activeTab !== "studio") onNewReflection();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-none cursor-pointer bg-black text-white border border-black ${
              activeTab === "studio"
                ? "ring-2 ring-neutral-400 font-semibold"
                : "opacity-85"
            }`}
          >
            <PenLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span className="hidden sm:inline">Reflection</span> Studio
          </button>

          <button
            id="nav-history-btn"
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-none cursor-pointer bg-black text-white border border-black ${
              activeTab === "history"
                ? "ring-2 ring-neutral-400 font-semibold"
                : "opacity-85"
            }`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>History</span>
            {totalEntries > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-neutral-800 text-white border border-neutral-700">
                {totalEntries}
              </span>
            )}
          </button>

          <button
            id="nav-insights-btn"
            type="button"
            onClick={() => setActiveTab("insights")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-none cursor-pointer bg-black text-white border border-black ${
              activeTab === "insights"
                ? "ring-2 ring-neutral-400 font-semibold"
                : "opacity-85"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span className="hidden sm:inline">Trends &</span> Insights
          </button>
        </nav>

        {/* Right Tools & Stats */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {streak > 0 && (
            <div
              title={`${streak} day journaling streak`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black text-white border border-black text-xs font-semibold"
            >
              <Flame className="w-3.5 h-3.5 text-white" />
              <span>{streak}d</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={cycleTheme}
            title={`Current theme: ${theme} (Click to toggle)`}
            className="p-2 bg-black text-white rounded-lg transition-none cursor-pointer border border-black"
          >
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-white" />
            ) : theme === "light" ? (
              <Sun className="w-4 h-4 text-white" />
            ) : (
              <Monitor className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Cloud Firestore Status / Account */}
          <button
            id="cloud-sync-btn"
            type="button"
            onClick={onOpenCloudSync}
            title={isCloudConnected ? "Cloud Firestore Sync Active" : "Local Storage Mode (Click to Sign In with Google)"}
            className="p-2 bg-black text-white rounded-lg transition-none cursor-pointer border border-black flex items-center gap-1.5"
          >
            <Cloud className="w-4 h-4 text-white" />
            <span className={`w-2 h-2 rounded-full ${isCloudConnected ? "bg-emerald-400" : "bg-neutral-400"}`}></span>
          </button>

          {/* Export / Backup modal toggle */}
          <button
            id="export-import-btn"
            type="button"
            onClick={onOpenExportImport}
            title="Backup & Export Archive"
            className="p-2 bg-black text-white rounded-lg transition-none cursor-pointer border border-black"
          >
            <DownloadCloud className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};

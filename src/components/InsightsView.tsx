import React, { useMemo } from "react";
import {
  BarChart2,
  Flame,
  Sparkles,
  Tag,
  Lightbulb,
  Compass,
  HeartHandshake,
  CheckCircle2,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import { JournalEntry } from "../types";
import {
  computeMoodStats,
  calculateJournalStreak,
  getActivityHeatmapData,
} from "../utils/storage";

interface InsightsViewProps {
  entries: JournalEntry[];
  onStartNew: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ entries, onStartNew }) => {
  const streak = useMemo(() => calculateJournalStreak(entries), [entries]);
  const moodStats = useMemo(() => computeMoodStats(entries), [entries]);
  const heatmapData = useMemo(() => getActivityHeatmapData(entries, 14), [entries]);

  // Aggregate top tags
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      e.metadata?.tags?.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [entries]);

  // Total words journaled & average words
  const { totalWords, avgWords, totalFollowUps } = useMemo(() => {
    let words = 0;
    let followUps = 0;
    entries.forEach((e) => {
      const w = e.userPrompt?.trim() ? e.userPrompt.trim().split(/\s+/).length : 0;
      words += w;
      followUps += e.thread?.length || 0;
    });
    const avg = entries.length > 0 ? Math.round(words / entries.length) : 0;
    return { totalWords: words, avgWords: avg, totalFollowUps: followUps };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xs animate-fadeIn">
        <Compass className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          No Trend Data Yet
        </h3>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6">
          Complete a few reflections in the Studio to unlock emotional distribution and thematic pattern insights.
        </p>
        <button
          type="button"
          onClick={onStartNew}
          className="px-4 py-2 bg-black text-white border border-black rounded-xl text-xs sm:text-sm font-medium transition-none inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-white">Write a Reflection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reflections</span>
            <BarChart2 className="w-4 h-4 text-neutral-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
            {entries.length}
          </p>
          <span className="text-[11px] text-neutral-400">Total sessions logged</span>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Streak</span>
            <Flame className="w-4 h-4 text-black dark:text-white" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
            {streak} {streak === 1 ? "day" : "days"}
          </p>
          <span className="text-[11px] text-neutral-400">Consistent introspection</span>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Words Unpacked</span>
            <HeartHandshake className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
            {totalWords.toLocaleString()}
          </p>
          <span className="text-[11px] text-neutral-400">~{avgWords} words / session</span>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Top State</span>
            <Sparkles className="w-4 h-4 text-black dark:text-white" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {moodStats[0]?.mood || "Reflective"}
          </p>
          <span className="text-[11px] text-neutral-400">
            {moodStats[0]?.percentage || 0}% of sessions
          </span>
        </div>
      </div>

      {/* 14-Day Consistency & Habit Heatmap */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-serif text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              <span>14-Day Journaling Consistency</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Visualizing your daily reflection presence over the past two weeks.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700" />
              <span>Rest day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-black dark:bg-white" />
              <span>Reflected</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
          {heatmapData.map((d) => (
            <div
              key={d.dateKey}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                d.hasEntry
                  ? "bg-neutral-100 dark:bg-neutral-800 border-black dark:border-white shadow-2xs"
                  : "bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-850 opacity-70"
              } ${d.isToday ? "ring-2 ring-black dark:ring-white" : ""}`}
            >
              <span className="text-[10px] text-neutral-400 font-medium">{d.dayName}</span>
              <span
                className={`text-xs font-bold my-1 ${
                  d.hasEntry
                    ? "text-black dark:text-white"
                    : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {d.dayNumber}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  d.hasEntry ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotional Distribution */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs">
          <h3 className="font-serif text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            Emotional Landscape Distribution
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
            Breakdown of primary dominant moods detected across your journaling sessions.
          </p>

          <div className="space-y-3.5">
            {moodStats.map((item) => {
              return (
                <div key={item.mood} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {item.mood}
                    </span>
                    <span className="text-neutral-500">
                      {item.count} {item.count === 1 ? "entry" : "entries"} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-black dark:bg-white"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thematic Tags & Recurring Patterns */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Thematic Patterns & Focus Areas
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
              Core themes recognized by the reflection coach during your sessions.
            </p>

            {topTags.length === 0 ? (
              <p className="text-xs text-neutral-400">No themes detected yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topTags.map(([tag, count]) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200"
                  >
                    <Tag className="w-3 h-3 text-neutral-400" />
                    <span>{tag}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>{totalFollowUps} deeper dialogue notes recorded</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-900 dark:text-neutral-100 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Analysis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Key Realizations Showcase */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs">
        <h3 className="font-serif text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          Recent Realizations & Core Takeaways
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Synthesized breakthroughs distilled from your latest sessions.
        </p>

        <div className="space-y-3">
          {entries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-start gap-3"
            >
              <Lightbulb className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {entry.metadata?.sessionTitle}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    • {new Date(entry.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {entry.metadata?.briefSummary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
